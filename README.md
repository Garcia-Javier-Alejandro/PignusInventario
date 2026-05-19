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

## Aux Debug Tools

The Dashboard has a collapsible **Aux Debug Tools** section at the bottom
(inside `<details>`). It surfaces operator/admin actions that don't belong
in the regular UI:

| Button | What it does |
|---|---|
| `Importar inventario inicial` | Paste 7-col CSV (`Marca · Material · Color · Color visual · Cantidad · Umbral · Activo`) to bulk-seed the catalog. Idempotent: re-importing updates threshold/active and restocks zero-stock duplicates via a baseline movement. |
| `Forzar actualización` | Unregister the service worker, clear caches, reload. Recovery path for a stuck PWA install. |
| `Limpiar caché KV` | Force-clear the dashboard cache without waiting for TTL. |
| `Borrar movimientos` | Wipe `inventory_movements` while preserving each family's current stock via a single `Importación inicial` baseline movement. Catalog and barcodes are kept. Type-to-confirm `BORRAR`. |
| `Borrar todo el inventario` | Full nuke: movements, barcodes, projections, families. Type-to-confirm `BORRAR`. |

A `Build <sha · timestamp>` line is rendered just above the Aux Debug Tools
section, outside any styled container, so the running build hash stays
readable even if a nested layout breaks.

## Caching

`functions/api/_lib/cache.ts` ships a small KV read-through helper used by
the dashboard endpoint. Two keys defined:

| Key | TTL |
|---|---|
| `dashboard:summary` | 5 minutes |
| `low_stock:list` | 2 minutes (reserved, not wired yet) |

`invalidateInventoryCache(env)` is awaited at the end of every write that
affects stock, low-stock state, or active filament counts — receive,
consume, adjust, movement-patch, family-post/patch/delete, import (when
something was actually created/updated), admin-wipe, admin-wipe-movements.
The `Limpiar caché KV` debug button forces an immediate clear when needed.

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
