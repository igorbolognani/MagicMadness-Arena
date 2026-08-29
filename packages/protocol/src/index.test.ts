import { describe, expect, it } from "vitest";
import { parseClientInputMessage } from "./index";

describe("authoritative input contract", () => {
  it("accepts bounded command envelopes", () => {
    expect(parseClientInputMessage({
      type: "input",
      protocolVersion: "protocol-0.1.0",
      sequence: 4,
      tick: 12,
      move: { x: 1, y: 0 },
      aim: { x: 0, y: -1 },
      releaseSkill: 2,
    }).releaseSkill).toBe(2);
  });

  it("rejects unknown fields and invalid skill indexes", () => {
    expect(() => parseClientInputMessage({
      type: "input",
      protocolVersion: "protocol-0.1.0",
      sequence: 4,
      tick: 12,
      move: { x: 1, y: 0 },
      aim: { x: 0, y: -1 },
      releaseSkill: 7,
    })).toThrow();
    expect(() => parseClientInputMessage({
      type: "input",
      protocolVersion: "protocol-0.1.0",
      sequence: 4,
      tick: 12,
      move: { x: 1, y: 0 },
      aim: { x: 0, y: -1 },
      clientPosition: { x: 99, y: 99 },
    })).toThrow();
  });
});
