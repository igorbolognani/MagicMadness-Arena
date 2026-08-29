import Fastify from "fastify";
import { BALANCE_VERSION } from "@mma/balance";
import { CONTENT_VERSION, bossDefinitions, currencyDefinitions, expandedElementDefinitions, heroDefinitions, historyChapters, runeDefinitions, skillDefinitions, talentNodes } from "@mma/content";

const api = Fastify({ logger: true });

api.get("/health", async () => ({ ok: true, service: "magicmadness-api" }));

api.get("/v1/content/versions", async () => ({
  contentVersion: CONTENT_VERSION,
  balanceVersion: BALANCE_VERSION,
}));

api.get("/v1/content/starters", async () => ({
  heroes: heroDefinitions,
  skills: skillDefinitions,
}));

api.get("/v1/content/progression", async () => ({
  chapters: historyChapters,
  bosses: bossDefinitions,
  expandedElements: expandedElementDefinitions,
  talents: talentNodes,
  runes: runeDefinitions,
  currencies: currencyDefinitions,
}));

api.get("/v1/account/dev", async () => ({
  id: "dev-account-001",
  displayName: "Arena Tester",
  accountLevel: 12,
  progressionBand: "10-20",
}));

api.listen({ port: Number(process.env.PORT ?? 8788), host: "0.0.0.0" }).catch((error) => {
  api.log.error(error);
  process.exit(1);
});
