import { sql } from "drizzle-orm";
import { check, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Legacy accounts/receipt tables are owned by immutable migrations 0000–0001.
// This non-exported reference does not re-create them when generating deltas.
const accounts = sqliteTable("accounts", { accountId: text("account_id").primaryKey() });
export const clientJourney = sqliteTable("client_journey", {
  accountId: text("account_id").primaryKey().notNull().references(() => accounts.accountId),
  tutorialStep: integer("tutorial_step").notNull().default(0),
  talentsJson: text("talents_json").notNull().default("[]"),
  runesJson: text("runes_json").notNull().default("[]"),
  updatedAt: text("updated_at").notNull(),
}, table => [check("client_journey_step_range", sql`${table.tutorialStep} BETWEEN 0 AND 4`)]);
