import { ECONOMY_BASELINE } from "@mma/balance";
import { z } from "zod";

export const ECONOMY_CONTRACT_VERSION = "economy-contract-0.1.0";

export const WalletSchema = z.object({
  accountId: z.string().min(1),
  balances: z.record(z.string(), z.number().int().nonnegative()),
});
export type Wallet = z.infer<typeof WalletSchema>;

export const LedgerEntrySchema = z.object({
  id: z.string().min(1),
  accountId: z.string().min(1),
  currencyId: z.string().min(1),
  delta: z.number().int(),
  reason: z.string().min(1),
  sourceId: z.string().min(1),
  createdAt: z.string().min(1),
});
export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;

export type PityState = {
  bannerId: string;
  pulls: number;
  pityPulls: number;
  target?: string;
};

export type PullResult =
  | { kind: "new-hero"; heroId: string }
  | { kind: "duplicate"; heroId: string; directCombatPower: 0 }
  | { kind: "rune-material"; amount: number }
  | { kind: "cosmetic"; cosmeticId: string };
export type DuplicatePullResult = Extract<PullResult, { kind: "duplicate" }>;

export function applyLedgerEntry(wallet: Wallet, entry: LedgerEntry): Wallet {
  WalletSchema.parse(wallet);
  LedgerEntrySchema.parse(entry);
  if (wallet.accountId !== entry.accountId) throw new Error("Ledger account mismatch");
  const current = wallet.balances[entry.currencyId] ?? 0;
  const nextValue = current + entry.delta;
  if (nextValue < 0) throw new Error("Ledger would make wallet negative");
  return {
    ...wallet,
    balances: { ...wallet.balances, [entry.currencyId]: nextValue },
  };
}

export function createPityState(bannerId: string, target?: string): PityState {
  return { bannerId, pulls: 0, pityPulls: ECONOMY_BASELINE.pityPulls, ...(target ? { target } : {}) };
}

export function recordPull(state: PityState, result: PullResult): PityState {
  const nextPulls = result.kind === "new-hero" ? 0 : state.pulls + 1;
  return { ...state, pulls: Math.min(state.pityPulls, nextPulls) };
}

export function duplicateConversion(heroId: string): DuplicatePullResult {
  return { kind: "duplicate", heroId, directCombatPower: 0 };
}

export function validateEconomyContracts(wallet: Wallet, entry?: LedgerEntry): void {
  WalletSchema.parse(wallet);
  if (entry) LedgerEntrySchema.parse(entry);
  if (ECONOMY_BASELINE.duplicateCombatPower !== 0) {
    throw new Error("Duplicate combat power must remain zero");
  }
}
