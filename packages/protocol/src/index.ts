import { z } from "zod";

export const PROTOCOL_VERSION = "protocol-0.1.0";

const VectorSchema = z.object({ x: z.number().finite(), y: z.number().finite() }).strict();

export const ClientInputMessageSchema = z.object({
  type: z.literal("input"),
  protocolVersion: z.string().min(1),
  sequence: z.number().int().nonnegative(),
  tick: z.number().int().nonnegative(),
  move: VectorSchema,
  aim: VectorSchema,
  releaseSkill: z.number().int().min(0).max(3).optional(),
  dash: z.boolean().optional(),
  healthPotion: z.boolean().optional(),
  manaPotion: z.boolean().optional(),
}).strict();

export type ClientInputMessage = z.infer<typeof ClientInputMessageSchema>;

export function parseClientInputMessage(input: unknown): ClientInputMessage {
  return ClientInputMessageSchema.parse(input);
}

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
