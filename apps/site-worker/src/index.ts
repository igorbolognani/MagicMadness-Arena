import { validBuild } from "@mma/balance";
import { readJourney, advanceJourney, validTutorialStep, saveBuild } from "./clientJourney.js";
import { accountFromRow, isStarterHeroId } from "./account.js";
import { ReceiptValidationError, consumeVerifiedReceipt, verifyMatchResultReceipt, type D1Database, type D1Result, type D1Statement } from "./matchReceipt.js";
import { issueMatchSessionTicket } from "./matchSession.js";

type WorkerEnv = { DB: D1Database; ASSETS: { fetch: (request: Request) => Promise<Response> }; MATCH_RECEIPT_SECRET?: string; MATCH_SERVER_AUTH_SECRET?: string; MATCH_SERVER_WS_URL?: string };

const jsonHeaders = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: jsonHeaders });
}

function displayNameFrom(request: Request): string {
  const email = request.headers.get("oai-authenticated-user-email");
  const encodedName = request.headers.get("oai-authenticated-user-full-name");
  const encoding = request.headers.get("oai-authenticated-user-full-name-encoding");
  if (encodedName && encoding === "percent-encoded-utf-8") {
    try { return decodeURIComponent(encodedName).trim() || email?.split("@")[0] || "Elemental Mage"; }
    catch { /* Fall through to the documented email fallback. */ }
  }
  return email?.split("@")[0] || "Elemental Mage";
}

function identityFrom(request: Request): { id: string; name: string; email: string | null } | null {
  const id = request.headers.get("oai-authenticated-user-id");
  if (!id) return null;
  return {
    id,
    name: displayNameFrom(request),
    email: request.headers.get("oai-authenticated-user-email"),
  };
}

async function getOrCreateAccount(request: Request, env: WorkerEnv): Promise<Response> {
  const identity = identityFrom(request);
  if (!identity) return json({ error: "authentication_required" }, 401);
  const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO accounts (account_id, display_name, email, level, experience, selected_hero_id, created_at, updated_at)
    VALUES (?, ?, ?, 1, 0, 'fire-ember', ?, ?)
    ON CONFLICT(account_id) DO UPDATE SET display_name = excluded.display_name, email = excluded.email, updated_at = excluded.updated_at`)
    .bind(identity.id, identity.name, identity.email, now, now).run();
  const row = await env.DB.prepare("SELECT * FROM accounts WHERE account_id = ?").bind(identity.id).first();
  return row ? json({ account: accountFromRow(row as Record<string, unknown>) }) : json({ error: "account_unavailable" }, 500);
}

async function updateHero(request: Request, env: WorkerEnv): Promise<Response> {
  const identity = identityFrom(request);
  if (!identity) return json({ error: "authentication_required" }, 401);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const heroId = (body as { heroId?: unknown } | null)?.heroId;
  if (!isStarterHeroId(heroId)) return json({ error: "invalid_starter_hero" }, 422);
  const updated = await env.DB.prepare("UPDATE accounts SET selected_hero_id = ?, updated_at = ? WHERE account_id = ?")
    .bind(heroId, new Date().toISOString(), identity.id).run();
  return updated.success ? json({ selectedHeroId: heroId }) : json({ error: "account_update_failed" }, 500);
}

async function consumeMatchResult(request: Request, env: WorkerEnv): Promise<Response> {
  const identity = identityFrom(request);
  if (!identity) return json({ error: "authentication_required" }, 401);
  if (!env.MATCH_RECEIPT_SECRET) return json({ error: "receipt_verifier_unavailable" }, 503);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "invalid_json" }, 400); }
  try {
    const receipt = await verifyMatchResultReceipt((body as { receipt?: unknown } | null)?.receipt, identity.id, env.MATCH_RECEIPT_SECRET);
    const consumed = await consumeVerifiedReceipt(env.DB, receipt);
    return json({ result: { ...consumed, previousExperience: Math.max(0, consumed.experience - receipt.rewards.xp), xpGained: receipt.rewards.xp, rewards: receipt.rewards }, practice: receipt.mode === "practice", progressionGranted: receipt.mode !== "practice" && receipt.rewards.xp > 0 });
  } catch (error) {
    if (error instanceof ReceiptValidationError) {
      const status = error.code === "account_mismatch" ? 403 : error.code === "receipt_verifier_unavailable" ? 503 : 422;
      return json({ error: error.code }, status);
    }
    return json({ error: "receipt_transaction_failed" }, 500);
  }
}

async function createVerifiedMatchSession(request: Request, env: WorkerEnv): Promise<Response> {
  const identity = identityFrom(request);
  if (!identity) return json({ error: "authentication_required" }, 401);
  if (!env.MATCH_SERVER_AUTH_SECRET || !env.MATCH_SERVER_WS_URL) return json({ error: "verified_mode_unavailable", dependency: "authoritative_game_server" }, 503);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const heroId = (body as { heroId?: unknown } | null)?.heroId;
  if (!isStarterHeroId(heroId)) return json({ error: "invalid_starter_hero" }, 422);
  const account = await env.DB.prepare("SELECT level FROM accounts WHERE account_id = ?").bind(identity.id).first();
  if (!account) return json({ error: "account_not_found" }, 404);
  const journey = await readJourney(env.DB, identity.id);
  const build = { accountLevel: Number(account.level), talents: journey.talents, runes: journey.runes };
  if (!validBuild(build)) return json({ error: "invalid_saved_build" }, 422);
  const ticket = await issueMatchSessionTicket(identity.id, heroId, env.MATCH_SERVER_AUTH_SECRET, new Date(), build);
  return json({ ticket, webSocketUrl: env.MATCH_SERVER_WS_URL });
}

async function serveClient(request: Request, env: WorkerEnv): Promise<Response> {
  const response = await env.ASSETS.fetch(request);
  if (response.status !== 404 || request.method !== "GET") return response;
  const url = new URL(request.url);
  url.pathname = "/index.html";
  return env.ASSETS.fetch(new Request(url, request));
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/account/journey") {
      const identity = identityFrom(request);
      if (!identity) return json({ error: "authentication_required" }, 401);
      try {
        if (request.method === "PATCH") {
          const body = await request.json() as { tutorialStep?: unknown; talents?: unknown; runes?: unknown };
          if (body?.tutorialStep !== undefined) {
            if (!validTutorialStep(body.tutorialStep)) return json({ error: "invalid_tutorial_step" }, 422);
            await advanceJourney(env.DB, identity.id, body.tutorialStep);
          } else {
            const account = await env.DB.prepare("SELECT level FROM accounts WHERE account_id = ?").bind(identity.id).first();
            if (!account) return json({ error: "account_not_found" }, 404);
            if (!Array.isArray(body?.talents) || !Array.isArray(body?.runes) || !body.talents.every(value => typeof value === "string") || !body.runes.every(value => typeof value === "string")) return json({ error: "invalid_build" }, 422);
            if (!validBuild({ accountLevel: Number(account.level), talents: body.talents, runes: body.runes })) return json({ error: "build_locked_or_invalid" }, 422);
            await saveBuild(env.DB, identity.id, body.talents, body.runes);
          }
        } else if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405);
        return json(await readJourney(env.DB, identity.id));
      } catch { return json({ error: "journey_unavailable" }, 503); }
    }
    if (url.pathname === "/api/health") return json({ ok: true, service: "magicmadness-site-worker", persistence: "d1" });
    if (url.pathname === "/api/account" && request.method === "GET") return getOrCreateAccount(request, env);
    if (url.pathname === "/api/account/hero" && request.method === "PATCH") return updateHero(request, env);
    if (url.pathname === "/api/matches/availability" && request.method === "GET") return json({ available: Boolean(env.MATCH_SERVER_AUTH_SECRET && env.MATCH_SERVER_WS_URL), mode: "verified-vs-bots" });
    if (url.pathname === "/api/matches/session" && request.method === "POST") return createVerifiedMatchSession(request, env);
    if (url.pathname === "/api/matches/results" && request.method === "POST") return consumeMatchResult(request, env);
    if (url.pathname.startsWith("/api/")) return json({ error: "not_found" }, 404);
    return serveClient(request, env);
  },
};
