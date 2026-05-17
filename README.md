# PignusInventario

Filament inventory management PWA for the PignusLabs platform.

**Live:** https://inventario.pignuslabs.com.ar (Cloudflare Access — Google login required)

## Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript, Vite, vite-plugin-pwa |
| API | Hono (CF Pages Functions) |
| Database | Cloudflare D1 (SQLite) |
| Cache | Cloudflare KV |
| Auth | Cloudflare Access (Google) |
| Styles | PignusUI CDN |

## Local development

```bash
# Install dependencies
npm install

# Start the Worker (API) on localhost:8787
npm run dev:worker

# In a second terminal, start the frontend (proxies /api to :8787)
npm run dev:frontend
```

## Database

```bash
# Apply migrations locally
cd worker && npm run migrate

# Apply to production
cd worker && npm run migrate:remote
```

## Deployment

Push to `main`. Cloudflare Pages builds and deploys automatically.

The API runs as a CF Pages Function — no separate `wrangler deploy` needed for production.

## Docs

- [PRD](PRD%20-%20PignusInventario.md) — product requirements
- [TDD](TDD%20-%20PignusInventario.md) — technical implementation reference
