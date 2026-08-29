# ChatGPT Sites Deployment Boundary

The web package is a standard Vite build with a static entry point in
apps/web/dist. It is suitable for a public homepage, authenticated-style app
shell and local bot gameplay in a Sites-compatible frontend deployment.

The future production topology must keep:

- Vite/PixiJS web client in the Site/frontend surface;
- game-server as a separate authoritative WebSocket deployment;
- API and persistence as separate services;
- VITE_GAME_SERVER_URL and VITE_API_URL configured at deployment time.

The browser/local bot path is intentionally not presented as authoritative
online multiplayer. Online authority remains server-owned.
