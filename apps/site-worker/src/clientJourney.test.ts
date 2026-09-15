import { describe, expect, it, vi } from "vitest";
import worker from "./index.js";
import type { D1Database } from "./matchReceipt.js";

describe("client account writes", () => {
  function fixture() {
    const run = vi.fn(async () => ({ success: true }));
    const statement = { bind: (..._values: unknown[]) => statement, first: async () => ({ level: 1 }), run };
    const db = { prepare: vi.fn(() => statement), batch: vi.fn() } as unknown as D1Database;
    return { run, db, env: { DB: db, ASSETS: { fetch: async () => new Response() } } };
  }
  it("requires authenticated identity for reading the saved journey", async () => {
    const { env, db } = fixture();
    const response = await worker.fetch(new Request("https://game.example/api/account/journey"), env);
    expect(response.status).toBe(401); expect(db.prepare).not.toHaveBeenCalled();
  });
  it("ignores a claimed client level and rejects a locked build before writing", async () => {
    const { env, run } = fixture();
    const response = await worker.fetch(new Request("https://game.example/api/account/journey", {
      method: "PATCH", headers: { "content-type": "application/json", "oai-authenticated-user-id": "u1" },
      body: JSON.stringify({ accountLevel: 30, talents: ["attack-30-pressure"], runes: [] }),
    }), env);
    expect(response.status).toBe(422); expect(run).not.toHaveBeenCalled();
  });
  it("rejects an out-of-range tutorial step", async () => {
    const { env, run } = fixture();
    const response = await worker.fetch(new Request("https://game.example/api/account/journey", {
      method: "PATCH", headers: { "content-type": "application/json", "oai-authenticated-user-id": "u1" },
      body: JSON.stringify({ tutorialStep: 99 }),
    }), env);
    expect(response.status).toBe(422); expect(run).not.toHaveBeenCalled();
  });
});
