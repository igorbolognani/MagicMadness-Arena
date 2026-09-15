export const STARTER_HERO_IDS = ["fire-ember", "water-tide", "earth-bastion", "air-gale"] as const;
export type StarterHeroId = (typeof STARTER_HERO_IDS)[number];

export type AccountRecord = {
  accountId: string;
  displayName: string;
  email: string | null;
  level: number;
  experience: number;
  selectedHeroId: StarterHeroId;
  createdAt: string;
  updatedAt: string;
};

export function isStarterHeroId(value: unknown): value is StarterHeroId {
  return typeof value === "string" && STARTER_HERO_IDS.includes(value as StarterHeroId);
}

export function accountFromRow(row: Record<string, unknown>): AccountRecord {
  return {
    accountId: String(row.account_id),
    displayName: String(row.display_name),
    email: row.email === null || row.email === undefined ? null : String(row.email),
    level: Number(row.level),
    experience: Number(row.experience),
    selectedHeroId: isStarterHeroId(row.selected_hero_id) ? row.selected_hero_id : "fire-ember",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
