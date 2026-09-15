import { describe, expect, it } from "vitest";
import { canonicalMatchSessionTicket } from "@mma/protocol";
import { issueMatchSessionTicket } from "./matchSession";

describe("verified match session tickets", () => {
  it("issues a short-lived account and hero bound ticket", async () => {
    const now = new Date("2026-09-02T12:00:00.000Z");
    const ticket = await issueMatchSessionTicket("account-1", "water-tide", "s".repeat(48), now);
    expect(ticket.accountId).toBe("account-1");
    expect(ticket.heroId).toBe("water-tide");
    expect(Date.parse(ticket.expiresAt) - now.getTime()).toBe(120_000);
    expect(canonicalMatchSessionTicket(ticket)).not.toContain(ticket.signature);
  });

  it("refuses an undersized runtime secret", async () => {
    await expect(issueMatchSessionTicket("account-1", "fire-ember", "short")).rejects.toThrow("32 characters");
  });
});
