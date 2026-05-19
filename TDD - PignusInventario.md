# TDD — PignusInventario

**Status:** Active  
**Last updated:** 2026-05-18  
**Companion document:** `PRD - PignusInventario.md`

---

## 1. Purpose & Scope

This document is the authoritative technical implementation reference for the PignusInventario MVP.

It provides:
- Concrete schema, API contracts, and component structure
- Resolved architectural decisions (not open-ended options)
- Implementation boundaries aligned with the PRD

It does **not** redefine product requirements — defer to the PRD for "what" and "why". This document answers "how."

Intentionally deferred items are listed in [Section 16](#16-open-questions).

---

## 2. System Overview

**Type:** Internal operational inventory service (PWA + Cloudflare Pages Functions + D1)  
**Primary responsibility:** Track unopened filament inventory through low-friction barcode-assisted workflows  
**URL:** `inventario.pignuslabs.com.ar`  
**Auth:** Cloudflare Access (Google, same as other PignusLabs apps)

### Ecosystem Position

```
PignusPortal  <-- dashboards, analytics, admin visibility
     |
     +-- auth layer (Cloudflare Access / Google)
           |
           v
   PignusInventario (Pages project: pignusinventario)
           |
           +-- D1 (authoritative inventory data)
```

**Important:** PignusPortal should consume inventory data via APIs or derived analytical views — **not** direct D1 table reads. This boundary must be maintained. Track deviations as technical debt.

---

## 3. Technical Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + TypeScript | Vite build, PWA |
| Backend | Cloudflare Pages Functions + Hono | API runs as a Pages Function at `frontend/functions/api/[[catchall]].ts` — no standalone Worker |
| Database | Cloudflare D1 | SQLite; sole authoritative store |
| Cache | Cloudflare KV | Dashboard/projection cache only — never authoritative |
| Email | Resend | Daily digests only (requires a separate Worker for cron — see §13) |
| Barcode scanning | Native `BarcodeDetector` API, with `@zxing/library` canvas fallback | Implemented in `src/hooks/useScanner.ts` |
| Server state | TanStack Query (React Query) | No Redux or Zustand |
| Frontend routing | React Router v6 | |
| Styling | PignusUI (`pignus.css`) + thin `app.css` | Via CDN `<link>` tag |

### Repo Structure

```
PignusInventario/
  frontend/
    functions/
      api/
        [[catchall]].ts   <- CF Pages Function: API entry point (handles /api/*)
        _lib/             <- per-resource Hono routers + helpers
          auth.ts, db.ts, families.ts, barcode.ts,
          movements.ts, dashboard.ts, types.ts
    src/                  <- React app
    public/
      _routes.json        <- explicit include for /api/* (see README)
    index.html
    vite.config.ts
    package.json          <- hono lives here
  shared/
    types.ts              <- TypeScript types shared with the frontend
  migrations/
    0001_initial_schema.sql
  package.json            <- workspace root (npm workspaces: ["frontend"])
```

There is **no** `worker/` directory and no separate Worker workspace. The same `frontend/functions/` code serves both production (deployed by Pages on push) and local development (via `wrangler pages dev`).

### PignusUI — Shared Design System

PignusInventario **must** use PignusUI for all visual styling. This is non-negotiable — it ensures visual consistency across the platform.

**CDN link tag (load in `index.html` before `app.css`):**
```html
<link rel="stylesheet" href="https://ui.pignuslabs.com.ar/pignus.css">
<link rel="stylesheet" href="/app.css">
```

**Rules:**
- Use PignusUI CSS classes via React `className` prop — same classes as in HTML apps
- Do **not** use Tailwind, CSS-in-JS, or CSS Modules
- Always use CSS custom properties (`--cream`, `--blue`, `--ink`, etc.) — never hardcoded hex values
- App-specific styles go in `frontend/src/app.css` only when PignusUI has no equivalent
- If a new pattern is needed across future apps, add it to PignusUI, not here

**Available tokens:**

| Token group | Custom properties |
|---|---|
| Colors | `--cream`, `--cream-hover`, `--card`, `--border`, `--border-mid`, `--ink`, `--ink-2`, `--ink-3`, `--blue`, `--ok`, `--err`, `--gold` |
| Typography | `--font-sans`, `--font-serif`, `--text-xs` through `--text-2xl`, `--weight-normal/semi/bold`, `--tracking-*`, `--leading-*` |
| Spacing | `--space-1` through `--space-16` |
| Radius | `--radius-xs` through `--radius-2xl`, `--radius-pill` |

**Available components (use these classes — do not reinvent them):**

| Component | Key classes | Notes |
|---|---|---|
| Header | `.header`, `.header__brand`, `.header__wordmark`, `.header__end`, `.header__user`, `.header__avatar` | Top app bar |
| Layout | `.main`, `.toolbar`, `.toolbar-left/.toolbar-right`, `.app-shell`, `.mod-nav`, `.mod-nav__item`, `.mod-nav__item--active` | Page shell and nav |
| Buttons | `.btn`, `.btn--primary`, `.btn--secondary`, `.btn--ghost`, `.btn--danger`, `.btn--xs`, `.btn--expand` | All button variants |
| Icon buttons | `.iconbtn`, `.iconbtn--danger` | 28px square action buttons |
| Table | `.table-wrap`, `.orders-table`, `.th--sortable`, `.th--sort-asc/.th--sort-desc`, `.row-actions`, `.edit-row`, `.cell-truncate`, `.iconbtn` | Full data table with sort, hover actions, inline edit row |
| KPI cards | `.kpi-strip`, `.kpi-card`, `.kpi-card__eyebrow`, `.kpi-card__value`, `.kpi-card__meta`, `.kpi-delta`, `.kpi-delta--up/.down/.flat` | Dashboard metric cards |
| Status & pills | `.pill`, `.pill--ok`, `.pill--pending`, `.pill--gold`, `.status`, `.status--ok/.status--err`, `.progress-bar`, `.progress-bar__fill` | Badges and status indicators |
| Forms | `input[type="text/number/search"]` (styled globally), `.manual-input`, `.manual-input.num` | Inputs inherit PignusUI styles automatically |
| Spinner | `.spinner` | Loading indicator |
| Footer | `.footer` | Bottom bar |

**Inventory-specific PignusUI mapping:**
- Low stock badge → `.pill.pill--pending` (amber) or a new `.pill--err` (red) if stock is critically low
- Normal stock → `.pill.pill--ok` (green)
- Inventory table → `.table-wrap` + `.orders-table` with `.edit-row` for inline editing
- Dashboard KPIs (total families, low stock count) → `.kpi-strip` + `.kpi-card`
- Action buttons (Receive, Consume) → `.btn.btn--primary`
- Bottom nav → custom in `app.css` (no existing PignusUI pattern for mobile bottom nav)

### Resolved Stack Decisions

**Functions routing:** Hono mounted in `frontend/functions/api/[[catchall]].ts` and re-exported via `handle(app)` from `hono/cloudflare-pages`. Per-resource sub-routers live in `_lib/`. Auth middleware runs on every `/api/*` route via `app.use`.

**Frontend state management:** TanStack Query for all server state (inventory, families, movements). Local React state only for ephemeral UI state (modal open, scanner active). No global state manager needed at this scope.

**Projection strategy:** Materialized `inventory_projection` table, updated transactionally alongside each movement insert. Do not compute dynamically on read.

**PWA scope:** Service worker for installability and home screen addition only. No offline mode — always-online assumption from PRD.

---

## 4. Architectural Principles

1. **Low friction first** — Every extra tap or keystroke is a defect.
2. **Barcode-first interaction** — Scanner is the primary input, not forms.
3. **Integer-only inventory** — No decimal quantities anywhere in the stack.
4. **Append-only movements** — Never mutate quantity by directly editing projections; always go through movement semantics. Edits update movement records and recompute the projection.
5. **Historical integrity** — Movement history must remain complete and queryable. Never delete movements.
6. **Forecasting-ready schema** — Design tables now so future analytics require no migrations.
7. **Operational simplicity over precision** — Approximate-but-useful accuracy is acceptable; enterprise rigor is not the goal.

---

## 5. Authentication & Authorization

### How It Works

Authentication is handled entirely by Cloudflare Access — the same setup used by Inversiones and Facturación. `inventario.pignuslabs.com.ar` is registered as an Access Application (see `PignusPortal/cloudflare-access.md`). Unauthenticated requests are blocked at the edge and redirected to Google login before they ever reach the Worker or the frontend. The app itself implements no auth logic.

```
User -> Google login -> Cloudflare Access (edge)
     -> authenticated request forwarded to Pages Function
     -> Cf-Access-Authenticated-User-Email header injected by CF
```

### User Identity in the Function

For audit fields (`created_by`, `updated_by`), the Function reads the email CF Access injects on every forwarded request (see `functions/api/_lib/auth.ts` → `getUserEmail`):

```typescript
const userEmail = c.req.header("Cf-Access-Authenticated-User-Email") ?? "unknown";
```

No JWT parsing or signature verification needed — CF Access has already authenticated the user at the edge.

### Cloudflare Access Configuration

✓ Done. PignusInventario is registered as an Access Application in Cloudflare One:

- **URL:** `inventario.pignuslabs.com.ar`
- **Identity provider:** Google only
- **Policy:** Allow Admin + Senior + Junior (all groups — same as Facturación)

### Authorization Model

Role management stays in CF Access groups. No role-based feature gating inside the app in MVP — all authenticated users see all features.

---

## 6. Domain Model & D1 Schema

### Schema Overview

```
filament_families
barcode_mappings
inventory_movements
inventory_projection
```

### 6.1 `filament_families`

```sql
CREATE TABLE filament_families (
  id                      TEXT PRIMARY KEY,           -- UUID v4
  brand                   TEXT NOT NULL,
  material                TEXT NOT NULL,
  brand_color_name        TEXT NOT NULL,
  normalized_visual_color TEXT NOT NULL,              -- BLACK | WHITE | RED | BLUE | GRAY | TRANSLUCENT | MULTICOLOR
  reorder_threshold       INTEGER NOT NULL DEFAULT 3,
  photo_url               TEXT,
  notes                   TEXT,
  active                  INTEGER NOT NULL DEFAULT 1, -- 0 = inactive (D1 has no BOOLEAN)
  created_at              TEXT NOT NULL,              -- ISO 8601
  updated_at              TEXT NOT NULL,

  UNIQUE (brand, material, brand_color_name)          -- canonical identity constraint
);

CREATE INDEX idx_families_active ON filament_families(active);
CREATE INDEX idx_families_material ON filament_families(material);
CREATE INDEX idx_families_visual_color ON filament_families(normalized_visual_color);
```

### 6.2 `barcode_mappings`

```sql
CREATE TABLE barcode_mappings (
  barcode            TEXT PRIMARY KEY,
  filament_family_id TEXT NOT NULL REFERENCES filament_families(id),
  created_at         TEXT NOT NULL
);

CREATE INDEX idx_barcodes_family ON barcode_mappings(filament_family_id);
```

One barcode → one family. One family → many barcodes.

### 6.3 `inventory_movements`

```sql
CREATE TABLE inventory_movements (
  id                 TEXT PRIMARY KEY,           -- UUID v4
  filament_family_id TEXT NOT NULL REFERENCES filament_families(id),
  movement_type      TEXT NOT NULL,              -- RECEIVE_STOCK | CONSUME_OPEN | MANUAL_ADJUSTMENT
  quantity_delta     INTEGER NOT NULL,           -- positive or negative; never 0
  notes              TEXT,
  created_by         TEXT NOT NULL,              -- user email from CF JWT
  created_at         TEXT NOT NULL,              -- ISO 8601; never mutated after creation
  updated_by         TEXT,
  updated_at         TEXT
);

CREATE INDEX idx_movements_family ON inventory_movements(filament_family_id);
CREATE INDEX idx_movements_created_at ON inventory_movements(created_at);
CREATE INDEX idx_movements_type ON inventory_movements(movement_type);
```

**Edit semantics:**
- `created_at` and `created_by` are immutable after insert.
- Edits update `quantity_delta`, `notes`, `updated_by`, `updated_at`.
- After any edit, the inventory projection for that `filament_family_id` must be recomputed (see §6.4).

### 6.4 `inventory_projection`

```sql
CREATE TABLE inventory_projection (
  filament_family_id TEXT PRIMARY KEY REFERENCES filament_families(id),
  current_quantity   INTEGER NOT NULL DEFAULT 0,
  updated_at         TEXT NOT NULL
);
```

**Update strategy:** Recompute by summing `quantity_delta` from `inventory_movements` for the affected family. Execute as a single D1 transaction with the triggering movement write.

```sql
-- Recompute projection for a family (run inside transaction alongside movement insert)
INSERT INTO inventory_projection (filament_family_id, current_quantity, updated_at)
VALUES (?, (SELECT COALESCE(SUM(quantity_delta), 0) FROM inventory_movements WHERE filament_family_id = ?), ?)
ON CONFLICT(filament_family_id) DO UPDATE SET
  current_quantity = excluded.current_quantity,
  updated_at = excluded.updated_at;
```

---

## 7. API Design

**Style:** REST, JSON  
**Base path:** `/api/inventory`  
**Auth:** All endpoints require valid CF Access JWT. The Function's auth middleware rejects requests missing `CF-Access-Jwt-Assertion`.

### Standard Error Response

```json
{
  "error": "BARCODE_NOT_FOUND",
  "message": "Human-readable description"
}
```

**Error codes:** `BARCODE_NOT_FOUND` · `BARCODE_CONFLICT` · `FAMILY_NOT_FOUND` · `INSUFFICIENT_STOCK` · `INVALID_QUANTITY` · `FAMILY_INACTIVE` · `DUPLICATE_FAMILY` · `AUTH_REQUIRED` · `MOVEMENT_NOT_FOUND`

---

### 7.1 Filament Families

#### `GET /api/inventory/families`

Returns filament families joined with current stock.

**Query params:**

| Param | Type | Default | Notes |
|---|---|---|---|
| `search` | string | — | LIKE match on brand, material, brand_color_name |
| `material` | string | — | Exact match |
| `visual_color` | string | — | Exact match on normalized_visual_color |
| `low_stock_only` | boolean | false | Filter to families at or below threshold |
| `include_inactive` | boolean | false | Include inactive families |

**Default sort:** Low stock urgency first (see §8.2).

**Response:**
```json
{
  "families": [
    {
      "id": "uuid",
      "brand": "eSUN",
      "material": "PLA",
      "brand_color_name": "Matte Black",
      "normalized_visual_color": "BLACK",
      "reorder_threshold": 5,
      "current_quantity": 2,
      "is_low_stock": true,
      "photo_url": null,
      "notes": null,
      "active": true,
      "created_at": "2026-05-17T12:00:00Z",
      "updated_at": "2026-05-17T12:00:00Z"
    }
  ]
}
```

#### `POST /api/inventory/families`

**Body:**
```json
{
  "brand": "eSUN",
  "material": "PLA",
  "brand_color_name": "Matte Black",
  "normalized_visual_color": "BLACK",
  "reorder_threshold": 5,
  "photo_url": null,
  "notes": null
}
```

Returns created family object. Errors: `DUPLICATE_FAMILY`.

#### `PATCH /api/inventory/families/:id`

Editable fields only: `reorder_threshold`, `active`, `notes`, `photo_url`. All optional; only provided fields are updated.

```json
{ "reorder_threshold": 8, "active": false }
```

Returns updated family object. Errors: `FAMILY_NOT_FOUND`.

---

### 7.2 Barcode Lookup & Registration

#### `GET /api/inventory/barcode/:barcode`

Resolves a barcode to a filament family. Called by scanner before committing any action.

**Response (found):**
```json
{
  "found": true,
  "filament_family": { /* full family object including current_quantity and is_low_stock */ }
}
```

**Response (not found):**
```json
{ "found": false }
```

Never returns a 4xx for unknown barcodes — always `found: false` so the frontend can trigger the registration flow cleanly.

#### `POST /api/inventory/barcode/register`

```json
{
  "barcode": "1234567890",
  "filament_family_id": "uuid"
}
```

Errors: `BARCODE_CONFLICT` (already mapped), `FAMILY_NOT_FOUND`.

---

### 7.3 Movements

#### `POST /api/inventory/movements/receive`

```json
{
  "barcode": "1234567890",
  "quantity": 12,
  "notes": null
}
```

- Resolves barcode → family
- Validates family is active
- Inserts `RECEIVE_STOCK` movement with positive `quantity_delta`
- Updates projection transactionally

**Response:**
```json
{
  "movement": { /* movement object */ },
  "updated_quantity": 14
}
```

Errors: `BARCODE_NOT_FOUND`, `FAMILY_INACTIVE`, `INVALID_QUANTITY` (quantity < 1).

#### `POST /api/inventory/movements/consume`

```json
{
  "barcode": "1234567890",
  "quantity": 1,
  "notes": null
}
```

- Validates `current_quantity >= quantity` before inserting
- Inserts `CONSUME_OPEN` movement with negative `quantity_delta`

**Response:** Same shape as receive. Errors: `BARCODE_NOT_FOUND`, `FAMILY_INACTIVE`, `INSUFFICIENT_STOCK`, `INVALID_QUANTITY`.

#### `POST /api/inventory/movements/adjust`

```json
{
  "filament_family_id": "uuid",
  "quantity_delta": -2,
  "notes": "Found 2 damaged spools"
}
```

`quantity_delta` may be positive or negative. `notes` is required for adjustments. Errors: `FAMILY_NOT_FOUND`, `INVALID_QUANTITY` (delta = 0), `INSUFFICIENT_STOCK` (result would go negative).

#### `PATCH /api/inventory/movements/:id`

Editable fields: `quantity_delta`, `notes`. Preserve `created_at`, `created_by`. Recompute projection after update.

```json
{ "quantity_delta": 10, "notes": "Corrected entry count" }
```

Errors: `MOVEMENT_NOT_FOUND`, `INVALID_QUANTITY`, `INSUFFICIENT_STOCK`.

#### `GET /api/inventory/movements`

**Query params:** `filament_family_id`, `movement_type`, `limit` (default 50), `offset` (default 0).

**Response:**
```json
{
  "movements": [ /* movement objects with family brand+material+color_name included */ ],
  "total": 120
}
```

---

### 7.4 Dashboard

#### `GET /api/inventory/dashboard`

```json
{
  "low_stock": [ /* family objects where is_low_stock = true, sorted by urgency */ ],
  "recent_movements": [ /* last 10 movements with family name */ ],
  "recently_consumed": [ /* last 5 distinct families with CONSUME_OPEN */ ],
  "recently_received": [ /* last 5 distinct families with RECEIVE_STOCK */ ],
  "total_families": 42,
  "low_stock_count": 3
}
```

---

## 8. Business Logic Specifications

### 8.1 Low Stock Rule

```
is_low_stock = (current_quantity <= reorder_threshold)
```

Evaluated on every read from `inventory_projection`. Returned as a computed boolean in API responses — not persisted in D1.

### 8.2 Default Inventory Sort Order

**Decision: Low stock urgency first.**

Rationale: This is an operational tool, not a catalog browser. The most critical items must surface without scrolling.

SQL `ORDER BY` clause for all family list queries:

```sql
ORDER BY
  CASE WHEN p.current_quantity <= f.reorder_threshold THEN 0 ELSE 1 END ASC,
  (p.current_quantity - f.reorder_threshold) ASC,
  f.brand ASC,
  f.material ASC,
  f.brand_color_name ASC
```

This produces: low-stock families first (most critical at top), then normal-stock families alphabetically.

### 8.3 Alternative Availability Query

When a family is low stock, derive alternatives at query time. No mapping table needed.

```sql
SELECT f.*, p.current_quantity
FROM filament_families f
JOIN inventory_projection p ON p.filament_family_id = f.id
WHERE f.material = ?                    -- same material
  AND f.normalized_visual_color = ?    -- same visual color
  AND f.id != ?                        -- different family
  AND f.active = 1
  AND p.current_quantity > 0
ORDER BY p.current_quantity DESC;
```

### 8.4 Validation Rules

| Rule | Where enforced |
|---|---|
| Quantities are integers only | Function validation + D1 INTEGER type |
| Inventory may not go negative | Pre-insert check on projection before consume/adjust |
| Inactive families cannot receive stock | Check `active = 1` before RECEIVE_STOCK |
| Inactive families hidden by default | `include_inactive = false` default |
| Barcode globally unique | D1 PRIMARY KEY on `barcode_mappings.barcode` |
| Family identity unique | UNIQUE constraint on `(brand, material, brand_color_name)` |
| Movement delta may not be 0 | Function validation |
| Adjustment `notes` required | Function validation |

---

## 9. Frontend Architecture

### 9.1 Route Structure

| Route | Page | Notes |
|---|---|---|
| `/` | Dashboard | Low stock alerts, recent activity |
| `/receive` | ReceiveFlow | Scanner → quantity → confirm |
| `/consume` | ConsumeFlow | Scanner → confirm (qty defaults to 1) |
| `/families` | FamilyList | Searchable inventory table |
| `/families/new` | FamilyCreate | Create form |
| `/families/:id` | FamilyDetail | Detail + inline edit + movement history |
| `/movements` | MovementHistory | Full movement log with filters |
| `/admin` | AdminTools | Barcode remapping, corrections |

### 9.2 Directory Structure

```
src/
  components/
    Scanner/          # Camera barcode scanner modal
    FamilyTable/      # Inventory table with inline editing
    MovementList/     # Movement history display
    LowStockBadge/    # Urgency indicator chip
    AlternativesList/ # Low stock alternatives display
  pages/
    Dashboard/
    ReceiveFlow/
    ConsumeFlow/
    FamilyList/
    FamilyDetail/
    MovementHistory/
    AdminTools/
  hooks/
    useFamilies.ts
    useMovements.ts
    useDashboard.ts
    useScanner.ts     # Camera/barcode scanning state
  api/
    client.ts         # Fetch wrapper with error handling
    families.ts
    movements.ts
    barcode.ts
    dashboard.ts
  types/
    index.ts          # Shared TypeScript types matching API response shapes
```

### 9.3 Mobile Navigation

Fixed bottom navigation bar:

```
[ Dashboard ]  [ Receive ]  [ Consume ]  [ Search ]  [ Admin ]
```

### 9.4 Scanner Integration

Use the native `BarcodeDetector` API where supported (Android Chrome/Edge), with a `@zxing/library` canvas-RAF fallback for browsers that don't expose it (iOS Safari, Firefox). Camera opens in a full-screen modal overlay. Always show a manual barcode text input as fallback below the camera view.

**Scanner lifecycle:**
1. User taps action → Scanner modal opens
2. Barcode detected → `GET /api/inventory/barcode/:barcode`
3a. `found: true` → proceed to quantity/confirm step
3b. `found: false` → show "Register barcode" prompt (map to existing family or create new)
4. Barcode resolved → resume original workflow from 3a

---

## 10. UX Interaction Specifications

### 10.1 Receive Flow

Optimized for bulk warehouse receiving.

```
Tap "Receive" → Scanner opens → Barcode scanned
  → Show: family name, current stock
  → Quantity input (auto-focused, numeric keyboard)
  → Tap "Confirm" → success toast → scanner reopens for next item
```

Do not navigate away after confirm. Reopen scanner immediately.

### 10.2 Consume Flow

Optimized for rapid single-spool logging.

```
Tap "Consume" → Scanner opens → Barcode scanned
  → Show: family name, current stock
  → Quantity pre-filled to 1 (editable)
  → Tap "Confirm" → success toast → scanner reopens
```

### 10.3 Inventory Table Inline Editing

Operational fields editable directly in the table row — no modal required:

- `reorder_threshold` — tap cell to edit in place
- `active` — toggle switch
- `notes` — tap cell to edit

Quantity changes **always** go through movement endpoints. Never allow direct projection edits.

### 10.4 Optimistic Updates

Apply optimistic UI for receive and consume flows using TanStack Query `useMutation` with `onMutate`/`onError`. Roll back and show error toast on API failure.

---

## 11. Infrastructure & Deployment

### Cloudflare Resources

| Resource | Name | Purpose |
|---|---|---|
| Pages project | `pignusinventario` | Frontend PWA + API (via CF Pages Functions) |
| D1 database | `pignus-inventario-db` | Authoritative data |
| KV namespace | `INVENTARIO_CACHE` | Dashboard/projection cache |

### Deployment model

The API runs as a CF Pages Function (`frontend/functions/api/[[catchall]].ts`), not as a separately deployed Worker. This keeps the API and frontend on the same domain with no CORS complexity.

```
inventario.pignuslabs.com.ar/api/*  →  CF Pages Function (Hono app)
inventario.pignuslabs.com.ar/*      →  CF Pages static assets (React SPA)
```

`frontend/public/_routes.json` explicitly includes `/api/*` so Pages always routes API requests to the Function instead of the SPA fallback.

⚠️ **Standalone Workers can silently hijack `/api/*` traffic on the custom domain.** A Worker with a route pattern matching `inventario.pignuslabs.com.ar/api/*` takes priority over Pages Functions and intercepts all requests for matching paths. See the README for the diagnostic checklist if `/api/*` starts returning unexpected responses.

**Production deployment:** push to `main` — CF Pages builds both the Vite frontend and the Functions automatically.

**Local development:** run Pages Functions with bindings via `npx wrangler pages dev .` from the `frontend/` directory (binds D1 and KV); run Vite with `npm run dev` and proxy `/api` to the wrangler dev port via `vite.config.ts`. CF Access does not run locally — comment out the auth middleware temporarily or supply a stub JWT header.

### D1 and KV bindings

Bindings for the CF Pages Function (production) are configured in the **CF Pages dashboard → Settings → Bindings**. There is no `wrangler.toml` checked in; local dev bindings are passed as `wrangler pages dev` flags.

| Binding | Type | Name/ID |
|---|---|---|
| `DB` | D1 | `pignus-inventario-db` |
| `CACHE` | KV | `INVENTARIO_CACHE` |

### Schema changes

```
npx wrangler d1 migrations apply pignus-inventario-db --remote
```

Never apply DDL directly. Migration files live in `migrations/` at the repo root.

### D1 Migration Files

```
migrations/
  0001_initial_schema.sql
```

---

## 12. Caching Strategy

KV is advisory only — never authoritative for inventory state.

| Cached item | TTL | Key |
|---|---|---|
| Dashboard summary | 5 min | `dashboard:summary` |
| Low stock list | 2 min | `low_stock:list` |

Invalidate affected keys on every movement write.

---

## 13. Email Notifications

- **Provider:** Resend
- **Model:** Daily digest only — no per-event emails
- **Trigger:** scheduled cron at `0 8 * * *` (8am daily)
- **Content:** Low stock families with quantities and available alternatives
- **Recipients:** Hardcoded in the cron handler's environment variables (5 users)

**Implementation note:** CF Pages Functions do not support cron triggers. A separate, minimal Cloudflare Worker will need to be added for this trigger (must NOT bind a route on `inventario.pignuslabs.com.ar`). Decide at Phase 3 entry whether to add a `worker/` workspace then. The Worker only needs `DB` binding (read-only) and Resend API access.

---

## 14. Implementation Phases

### Phase 0 — Infrastructure ✓ DONE
- ~~Worker scaffold + Wrangler config~~ → Pages Functions scaffold at `frontend/functions/`
- D1 creation + `0001_initial_schema.sql` ✓
- CF Access JWT validation middleware ✓
- Cloudflare Pages + React/Vite scaffold ✓
- PignusUI CSS via `<link>` CDN tag ✓

### Phase 1 — Core Inventory ✓ DONE
- `filament_families` CRUD ✓
- `barcode_mappings` endpoints ✓
- `inventory_movements` endpoints (receive, consume, adjust) ✓
- `inventory_projection` materialized table + transactional updates ✓
- Scanner component ✓
- Receive flow end-to-end ✓
- Consume flow end-to-end ✓

### Phase 2 — Discovery & Dashboard ✓ DONE
- `GET /families` with search, filter, sort ✓
- Family list with inline editing ✓
- Low stock logic + alternatives query ✓
- Dashboard endpoint + page ✓
- Movement history page ✓
- ~~Manual adjustment flow~~ — dropped from MVP per product decision (frontend
  modal removed; the `/api/inventory/movements/adjust` endpoint and
  `MANUAL_ADJUSTMENT` movement type remain in the backend so historical
  movements stay readable, but no UI surfaces it)

### Phase 3 — Operations & Notifications
- Movement edit flow ✓
- Admin tools (barcode remapping, family deactivation, inventory correction) ✓
- Resend email integration + cron Worker (requires adding a separate `worker/` workspace — see §13)
- KV caching layer ✓ — dashboard cached with 5-minute TTL, `low_stock:list` key reserved for future use; invalidated on every write that affects stock, low-stock state, or active filament counts; `Limpiar caché KV` debug button forces immediate clear

### Phase 4 — Forecasting Foundation
- Historical aggregation endpoints
- Monthly consumption calculation queries
- Movement export API for future Portal analytics

---

## 15. AI Agent Constraints

### Do NOT
- Implement offline mode or background sync
- Track partial spool quantities or grams
- Use decimal quantities anywhere in the stack
- Build generic inventory abstractions (`InventoryItem`, `StockUnit`)
- Add role-based access gating in MVP
- Use document blobs or JSON columns in D1 — normalized relational tables only
- Allow KV to be authoritative for inventory state
- Allow Portal to read D1 tables directly — use API endpoints

### Prioritize
- Operational simplicity over architectural elegance
- Mobile speed — minimize API round trips in scanner flows
- Clean movement history — never delete, never mutate `created_at`
- Type safety end-to-end — define types in `src/types/index.ts` and `shared/types.ts`, share across Functions and frontend

---

## 16. Open Questions

### Resolved

| Question | Decision |
|---|---|
| Projection strategy | Materialized table, updated transactionally on every movement write |
| Frontend state management | TanStack Query; no global state manager |
| Default sort order | Low stock urgency first (§8.2) |
| PWA offline mode | None — installability only |
| Movement edit permissions | All authenticated users in MVP |
| Email provider | Resend |
| Barcode library | Native `BarcodeDetector` + `@zxing/library` canvas fallback |
| Backend deployment shape | Single Pages project with Functions — no separate Worker for the API |

### Still Open

| Question | Notes |
|---|---|
| Portal dashboard integration | How Portal will consume inventory data — defer until Portal dashboard is built |
| Forecasting service boundary | Inside this Pages project or a separate Portal analytics subsystem — defer to post-MVP |
| Resend domain configuration | DNS setup for email sending domain needed before Phase 3 |
| Cron Worker workspace | Phase 3 needs a separate Worker for daily digest; decide name + repo layout at Phase 3 entry (§13) |
