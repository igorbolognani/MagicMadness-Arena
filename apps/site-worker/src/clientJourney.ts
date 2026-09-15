import type { D1Database } from "./matchReceipt.js";

export function validTutorialStep(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 4;
}

export async function readJourney(db: D1Database, accountId: string) {
  const row = await db.prepare("SELECT tutorial_step, talents_json, runes_json FROM client_journey WHERE account_id = ?").bind(accountId).first();
  const matches = await db.prepare("SELECT json_group_array(json_object('matchId', match_id, 'placement', placement, 'xp', json_extract(result_json, '$.rewards.xp'), 'playedAt', played_at)) AS items FROM (SELECT match_id, placement, result_json, played_at FROM match_history WHERE account_id = ? ORDER BY played_at DESC LIMIT 10)").bind(accountId).first();
  return { talents: JSON.parse(String(row?.talents_json ?? "[]")) as string[], runes: JSON.parse(String(row?.runes_json ?? "[]")) as string[], tutorialStep: Number(row?.tutorial_step ?? 0), matches: JSON.parse(String(matches?.items ?? "[]")) };
}

export async function advanceJourney(db: D1Database, accountId: string, step: number) {
  // Monotonic and account scoped: simultaneous tabs cannot roll onboarding back.
  await db.prepare(`INSERT INTO client_journey (account_id, tutorial_step, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(account_id) DO UPDATE SET tutorial_step = MAX(client_journey.tutorial_step, excluded.tutorial_step), updated_at = excluded.updated_at`)
    .bind(accountId, step, new Date().toISOString()).run();
}

export async function saveBuild(db: D1Database, accountId: string, talents: string[], runes: string[]) {
  await db.prepare(`INSERT INTO client_journey (account_id, talents_json, runes_json, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(account_id) DO UPDATE SET talents_json = excluded.talents_json, runes_json = excluded.runes_json, updated_at = excluded.updated_at`)
    .bind(accountId, JSON.stringify(talents), JSON.stringify(runes), new Date().toISOString()).run();
}
