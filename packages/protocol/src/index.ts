export const PROTOCOL_VERSION = "protocol-0.1.0";

export type ClientInputMessage = {
  type: "input";
  protocolVersion: string;
  sequence: number;
  tick: number;
  move: { x: number; y: number };
  aim: { x: number; y: number };
  releaseSkill?: number;
  dash?: boolean;
  healthPotion?: boolean;
  manaPotion?: boolean;
};

export type ServerMessage =
  | { type: "snapshot"; protocolVersion: string; tick: number; payload: unknown }
  | { type: "event"; protocolVersion: string; tick: number; payload: unknown }
  | { type: "result"; protocolVersion: string; payload: unknown }
  | { type: "error"; protocolVersion: string; code: string; message: string };

export function assertProtocolVersion(version: string): void {
  if (version !== PROTOCOL_VERSION) {
    throw new Error("Protocol mismatch: expected " + PROTOCOL_VERSION + ", received " + version);
  }
}
