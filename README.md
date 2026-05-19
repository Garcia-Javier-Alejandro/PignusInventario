# PignusInventario

Filament inventory PWA for the PignusLabs print shop. Mobile-first: open it on
a phone, point the camera at a spool's barcode, choose `Ingresar` or
`Consumir`, confirm. That's the loop.

**Live:** https://inventario.pignuslabs.com.ar — Google login via Cloudflare
Access required.

## What it solves

The shop runs through a few dozen filament spools across multiple brands,
materials, and colors. Each has its own restock threshold, and without a
system the team forgets what's low until something breaks mid-print. This
app:

- Records every spool that comes in (`Ingreso`) and every spool that gets
  opened/used (`Consumo`).
- Surfaces low-stock items in the Dashboard before they bite.
- Identifies spools by their supplier barcode, so the operator never has to
  type brand/material/color by hand at the point of use.
- Keeps current stock current without anyone counting it.

It is not an ERP, not an invoicing system, and intentionally not a financial
tool — invoicing lives in PignusFacturación, portfolios in PignusInversiones.

## How you use it

The app has four screens, tied together by a bottom nav with a single scan
FAB in the middle:

```
[ Dashboard ]   [ SCAN ]   [ Inventario ]
```

### 1. Scan (the daily entry point)

Tap the centre `SCAN` button. The camera opens, with an
`Ingresar / Consumir` toggle at the top of the screen that tells the app
what to do with the next barcode it sees.

- **Ingresar** — the spool just arrived from the supplier. After scanning,
  confirm the quantity in kg; the system records a `Ingreso` movement.
- **Consumir** — you just opened or used a spool. The system records a
  `Consumo` movement.

You can also paste/type the barcode if the camera struggles in low light.

If the barcode is new, the app offers to register it: pick or create a
filament family (brand × material × supplier color name × visual color ×
restock threshold), and the barcode is permanently mapped to that family.
Subsequent scans go straight to confirm.

### 2. Inventario

Card list of every filament family the shop stocks. Each card shows:

- A coloured ball matching the spool's visual colour.
- Brand · material · supplier colour name.
- A progress bar (current stock vs. 2× restock threshold).
- The current stock, big, in kg.
- `de N min` — the family's restock threshold.

Top controls: sort by Marca / Material / Color, plus a red `Stock bajo`
pill that filters to only families at or below threshold.

Tap any card to open Detalle.

### 3. Detalle del filamento

Per-family view. Lets you:

- See the current stock and apply small `+ / −` corrections without leaving
  the page.
- Adjust the restock threshold inline (`Umbral`).
- Toggle the family active or inactive.
- Edit brand/material/colour metadata.
- Delete the family (only if it has no movement history).

Edits are **staged** — quick `+ / −` tweaks, threshold changes, and active
toggles never commit on tap. A `Cambios sin guardar` bar appears above the
bottom nav listing the pending changes; you hit `Guardar` once you're sure.
This way casual testing doesn't pollute KPIs.

### 4. Dashboard

The home screen. From top to bottom:

- **Insumos con stock bajo** — hero card with a count of low-stock items vs.
  total active families.
- **Consumo / mes** and **Ingresos / mes** — kg consumed and kg received so
  far in the current calendar month. Bulk-import `Ingreso` rows (tagged as
  `Importación inicial`) are excluded from the monthly Ingresos KPI so the
  initial seeding doesn't inflate it.
- **Stock total** — 30-day line chart of total kg in inventory, with the
  current total in the corner.
- **Stock por filamento** — 30-day line chart for one filament family at a
  time, selectable via dropdown.
- **Movimientos recientes** — last 6 movements with brand · material ·
  colour and direction.

Tap `Ver todos` to open the full movement history page.

## Access and accounts

Authentication is handled by **Cloudflare Access** with Google as the
identity provider. There's no in-app login screen — opening the app while
signed into Google with an allowed address grants access immediately.

Allowed groups are `Admin` and `Senior`, managed centrally in Cloudflare
Zero Trust. See the PignusPortal repo (`cloudflare-access.md`) for the full
membership lists and how to add/revoke users. The change is one click —
no app-side configuration needed.

## Roadmap

**Already shipped**

- Daily scan loop (Ingresar / Consumir / register new barcode on first sight).
- Inventario card list with sort and low-stock filter.
- Family detail with staged edits.
- Dashboard with low-stock alerts, monthly KPIs, stock-over-time line charts
  (total and per filament, with 30/90/365 d range picker), and a 6-month
  consumed-vs-received bar chart.
- Movement history page.
- Bulk CSV import for initial inventory seeding.
- KV caching on the dashboard endpoint.
- PWA install + offline shell (service worker auto-updates on deploy).

**Planned / in progress**

- **Monthly low-stock email digest** (via Resend) — blocked on DNS setup
  for the sending domain.
- **Portal integration** — cross-app metrics surfaced in the PignusPortal
  admin dashboard.
- **CSV export** of movement history for offline analysis.
- **Backfill of past-dated movements** once real historical data needs to
  land (today only `today`-stamped writes are supported in the UI).

## Operator tools (Aux Debug Tools)

The Dashboard has a collapsible **Aux Debug Tools** section at the bottom
(inside a `<details>` element). It surfaces actions that don't belong in
the regular UI:

| Button | What it does |
|---|---|
| `Importar inventario inicial` | Paste 7-col CSV (`Marca · Material · Color · Color visual · Cantidad · Umbral · Activo`) to bulk-seed the catalog. Idempotent — re-running updates threshold/active and restocks zero-stock entries via a baseline movement. |
| `Forzar actualización` | Unregister the service worker, clear caches, reload. Recovery path for a stuck PWA install. |
| `Limpiar caché KV` | Force-clear the dashboard cache without waiting for TTL. |
| `Borrar movimientos` | Wipe `inventory_movements` while preserving each family's current stock via a single `Importación inicial` baseline movement. Catalog and barcodes are kept. Type-to-confirm `BORRAR`. |
| `Borrar todo el inventario` | Full nuke: movements, barcodes, projections, families. Type-to-confirm `BORRAR`. |

A `Build <sha · timestamp>` line is rendered just above the section,
outside any styled container, so the running build hash stays readable
even if a nested layout breaks.

---

## Engineering

The remainder of this README is for developers maintaining the app — stack,
local dev, deploy, and operational notes.

### Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript, Vite, vite-plugin-pwa |
| API | Hono running on Cloudflare Pages Functions (`frontend/functions/`) |
| Database | Cloudflare D1 (SQLite) |
| Cache | Cloudflare KV |
| Auth | Cloudflare Access (Google) |
| Styles | PignusUI CDN |

The whole application — static frontend and API — is a **single Cloudflare
Pages project**. There is no separate Worker. Everything ships from one
`git push` to `main`.

### Repository layout

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

### Local development

```bash
npm install

# Terminal 1 — run Pages Functions (with bindings) locally
cd frontend && npx wrangler pages dev . --d1 DB=pignus-inventario-db --kv CACHE
# Serves on http://localhost:8788

# Terminal 2 — Vite dev server (proxies /api to :8788)
npm run dev
```

Cloudflare Access does **not** run locally. `CF-Access-Jwt-Assertion`
headers are absent during local dev, so `authMiddleware` will return 401.
For local end-to-end testing, comment out
`app.use('/api/*', authMiddleware)` in
`frontend/functions/api/[[catchall]].ts` temporarily.

### Database

D1 migrations live in `/migrations`. Apply them with wrangler from anywhere
in the repo (no separate workspace any more):

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

### Deployment

Push to `main`. Cloudflare Pages builds and deploys both the frontend and
the Functions in one shot. No separate `wrangler deploy` is needed.

Build settings (configured in the CF Pages dashboard):

- Root directory: `frontend`
- Build command: `npm run build`
- Build output directory: `dist`

The build also ships `frontend/public/_routes.json`, which explicitly tells
Pages to route `/api/*` to the Function and let everything else fall through
to the React SPA shell.

### Caching

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

The 30-day stock-over-time history endpoints (`/api/inventory/history/*`)
are currently **uncached** — every dashboard mount hits D1. Fine at current
volumes; worth caching with short TTL when the catalog grows.

### Debugging the live API

Stream Function logs in real time:

```bash
# Get the active deployment ID
npx wrangler pages deployment list --project-name pignusinventario

# Tail it
npx wrangler pages deployment tail <DEPLOYMENT_ID> --project-name pignusinventario --format pretty
```

`console.log` inside Functions appears in this stream. Note that **only
requests to `pignusinventario.pages.dev` show up** here — requests to the
custom domain `inventario.pignuslabs.com.ar` are visible too but normalized
to the pages.dev hostname in the log output.

### ⚠️ Cloudflare Workers on this account: don't add routes that overlap `/api/*`

A standalone Cloudflare Worker can have a custom route that captures
`inventario.pignuslabs.com.ar/api/*` (or any subset of it). That route takes
priority over Pages Functions and **silently steals all traffic** for
matching paths — Pages metrics will look like the Function is fine while
every API call returns whatever the Worker's default handler says.

If `/api/*` starts returning unexpected responses on the custom domain,
first check:

```bash
# List every Worker in this account
npx wrangler deployments list --name <worker-name>
```

Any Worker bound to a route on `inventario.pignuslabs.com.ar` must be either
deleted (`npx wrangler delete --name <name>`) or have its route removed in
the Cloudflare dashboard. There should be **exactly one** thing serving
traffic on this domain: the `pignusinventario` Pages project.

## Backlog

Engineering polish — not blocking, but worth picking up when the relevant
screen is being touched anyway.

- **Prettier filament selector on the Dashboard "Stock por filamento"
  chart.** The native `<select>` can't render a color swatch per row
  because `<option>` is plain-text-only. Path forward: swap to a headless
  library (`@headlessui/react` `Listbox`, +10–20 KB gz) and render a
  `<ColorDot>` next to each row label. Upgrade to `Combobox` with a text
  filter once the catalog grows past ~30 families.

## Docs

- [PRD](PRD%20-%20PignusInventario.md) — product requirements
- [TDD](TDD%20-%20PignusInventario.md) — technical implementation reference
