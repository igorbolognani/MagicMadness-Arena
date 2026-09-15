import { createAuthoritativeGameServer } from "./serverRuntime.js";

const server = createAuthoritativeGameServer({
  authSecret: process.env.MATCH_SERVER_AUTH_SECRET ?? "",
  receiptSecret: process.env.MATCH_RECEIPT_SECRET ?? "",
});

const port = Number(process.env.PORT ?? 8787);
await server.listen(port);
console.log(`MagicMadness Verified Vs Bots server listening on ${port}`);
