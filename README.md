# PignusInventario

Filament inventory management PWA for the PignusLabs platform.

**Live:** https://inventario.pignuslabs.com.ar (Cloudflare Access — Google login required)

## Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript, Vite, vite-plugin-pwa |
| API | Hono running on Cloudflare Pages Functions (`frontend/functions/`) |
| Database | Cloudflare D1 (SQLite) |
| Cache | Cloudflare KV |
| Auth | Cloudflare Access (Google) |
| Styles | PignusUI CDN |

The whole application — static frontend and API — is a **single Cloudflare Pages project**. There is no separate Worker. Everything ships from one `git push` to `main`.

## Repository layout

```
frontend/
  src/             React app
  functions/api/   Pages Functions — Hono app for /api/*
    [[catchall]].ts    routes registration
    _lib/              per-resource handlers (families, barcode, movements, ...)
  public/
    _routes.json   explicit include for /api/* so Functions are guaranteed to run
migrations/        D1 SQL migrations (applied via wrangler)
shared/            types shared between frontend and functions
```

## Local development

```bash
npm install

# Terminal 1 — run Pages Functions (with bindings) locally
cd frontend && npx wrangler pages dev . --d1 DB=pignus-inventario-db --kv CACHE
# Serves on http://localhost:8788

# Terminal 2 — Vite dev server (proxies /api to :8788)
npm run dev
```

Note: Cloudflare Access does **not** run locally. `CF-Access-Jwt-Assertion` headers are absent during local dev, so `authMiddleware` will return 401. For local end-to-end testing, comment out `app.use('/api/*', authMiddleware)` in `frontend/functions/api/[[catchall]].ts` temporarily.

## Database

D1 migrations live in `/migrations`. Apply them with wrangler from anywhere in the repo (no separate workspace any more):

```bash
# Local dev DB
npx wrangler d1 migrations apply pignus-inventario-db

# Production D1
npx wrangler d1 migrations apply pignus-inventario-db --remote
```

Ad-hoc queries against the production D1:

```bash
npx wrangler d1 execute pignus-inventario-db --remote --command "SELECT COUNT(*) FROM filament_families;"
```

## Deployment

Push to `main`. Cloudflare Pages builds and deploys both the frontend and the Functions in one shot. No separate `wrangler deploy` is needed.

Build settings (configured in the CF Pages dashboard):
- Root directory: `frontend`
- Build command: `npm run build`
- Build output directory: `dist`

The build also ships `frontend/public/_routes.json`, which explicitly tells Pages to route `/api/*` to the Function and let everything else fall through to the React SPA shell.

## Debugging the live API

Stream Function logs in real time:

```bash
# Get the active deployment ID
npx wrangler pages deployment list --project-name pignusinventario

# Tail it
npx wrangler pages deployment tail <DEPLOYMENT_ID> --project-name pignusinventario --format pretty
```

`console.log` inside Functions appears in this stream. Note that **only requests to `pignusinventario.pages.dev` show up** here — requests to the custom domain `inventario.pignuslabs.com.ar` are visible too but normalized to the pages.dev hostname in the log output.

## ⚠️ Cloudflare Workers on this account: don't add routes that overlap `/api/*`

A standalone Cloudflare Worker can have a custom route that captures `inventario.pignuslabs.com.ar/api/*` (or any subset of it). That route takes priority over Pages Functions and **silently steals all traffic** for matching paths — Pages metrics will look like the Function is fine while every API call returns whatever the Worker's default handler says.

If `/api/*` starts returning unexpected responses on the custom domain, first check:

```bash
# List every Worker in this account
npx wrangler deployments list --name <worker-name>
```

Any Worker bound to a route on `inventario.pignuslabs.com.ar` must be either deleted (`npx wrangler delete --name <name>`) or have its route removed in the Cloudflare dashboard. There should be **exactly one** thing serving traffic on this domain: the `pignusinventario` Pages project.

## Docs

- [PRD](PRD%20-%20PignusInventario.md) — product requirements
- [TDD](TDD%20-%20PignusInventario.md) — technical implementation reference
