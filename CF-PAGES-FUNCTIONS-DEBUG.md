# CF Pages Functions 404 — Debug Log

## The problem

Every call to any `/api/*` endpoint returns `404 Not found` (plain text). The static React PWA loads fine. The API has never worked in production.

---

## Environment

| Setting | Value |
|---|---|
| CF Pages project | `pignusinventario` |
| Custom domain | `inventario.pignuslabs.com.ar` |
| Root directory | `frontend` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Build system version | Version 3 |
| D1 binding | `DB` → `pignus-inventario-db` ✓ |
| KV binding | `CACHE` → `INVENTARIO_CACHE` ✓ |

---

## What is confirmed working

- Static React PWA loads at `inventario.pignuslabs.com.ar` ✓
- CF Access authentication (Google login) works ✓
- D1 and KV bindings are configured in CF Pages dashboard ✓
- D1 remote migration was applied (`0001_initial_schema.sql`) ✓
- PWA installs on Android Chrome ✓
- Barcode scanner opens camera ✓
- CF Pages routing: `/api/*` invokes the function (confirmed — see Test 5 below) ✓

---

## What is confirmed broken

~~Every request to `/api/*` returns~~  
~~`HTTP/1.1 404 Not Found`~~  
~~`body: "404 Not found"   ← plain text, CF Pages static-asset 404`~~

**Update after routing fix (see "Actions taken" below):** CF Pages routing is no longer the issue. Functions ARE being invoked. Barcode scanning still fails with "Error al buscar el código. Intentá de nuevo." — root cause unknown.

---

## Tests run

### Test 1 — DevTools console fetch
From within the live page on desktop Chrome:
```javascript
fetch('/api/ping').then(r => r.text()).then(console.log)
```
Result:
```
GET https://inventario.pignuslabs.com.ar/api/ping 404 (Not Found)
404 Not found
```
This rules out the service worker as the cause: the 404 is a real network response, not a cached response. Workbox (vite-plugin-pwa default) does not cache non-precached URLs.

### Test 2 — Minimal no-import function
Added `functions/healthz.ts` (then `frontend/functions/healthz.ts`):
```typescript
export const onRequest = () => new Response('ok')
```
- Navigating to `/healthz` in browser → React app shown (service worker intercepts all navigations and serves cached `index.html` — expected SPA behavior, not an error)
- `fetch('/healthz').then(r=>r.text()).then(console.log)` was not tested separately

### Test 3 — No-auth API endpoint
Added to `functions/api/[[catchall]].ts`:
```typescript
app.get('/api/ping', (c) => c.json({ ok: true }))
```
(Before the auth middleware, so no JWT required)

Result: still 404 Not found.

### Test 4 — Build log review
Latest deployment log shows:
```
Using v2 root directory strategy
...
Found Functions directory at /functions. Uploading.
⛅️ wrangler 3.101.0
-------------------
✨ Compiled Worker successfully
Validating asset output directory
Deploying your site to Cloudflare's global network...
Uploading... (11/11)
✨ Success! Uploaded 0 files (11 already uploaded) (0.36 sec)
✨ Upload complete!
Success: Assets published!
Success: Your site was deployed!
```

The Worker IS compiled. There are no compilation errors. Yet the API returns 404.

### Test 5 — PowerShell verification after routing fix (session 2)
After moving functions to `frontend/functions/` and adding `_routes.json` with `include: ["/api/*"]`, four PowerShell tests were run:

```
/api/ping              → 200  {"ok":true}         ← function invoked, no auth required
/healthz               → 200  ok                  ← function invoked
/families              → 200  HTML                ← SPA (expected, no function for this path)
/api/inventory/families → 401 {"error":"AUTH_REQUIRED","message":"Authentication required"}
```

User confirmation: "Test A returned OK."

**Conclusion:** CF Pages routing is fixed. Functions are being invoked for `/api/*`. The 401 on the last test is from Hono's auth middleware (correct behavior — the test ran without a CF Access JWT).

### Test 6 — Phone browser direct navigation (session 3)
User opened `https://pignusinventario.pages.dev/api/inventory/families` directly in the phone browser.

**User response:** "I got error auth required."

**Conclusion:** Functions ARE being invoked from the phone as well. CF Access injects the JWT for page navigations; direct browser navigation to an API URL lacks a JWT, so auth middleware returns 401. Routing is confirmed working on the production domain from a mobile device.

### Test 7 — Phone app scanning behavior (session 3)
User scanned a barcode with the phone app.

**User response:** "I got the same 'Error al buscar el código. Intentá de nuevo'. Since you removed the code messages."

**Conclusion:** The app's catch block is being triggered during `lookupBarcode()`. The specific HTTP status and response body are unknown because the debug error-display code was removed in the cleanup commit (see "Actions taken" below).

### Test 8 — `wrangler pages deployment tail` while user scans (session 4)
A live tail of the latest production deployment (`8d719e7c`, commit `b1211ef`) was started:
```
npx wrangler pages deployment tail 8d719e7c-d4fe-4af2-a456-f89401c7856b --project-name pignusinventario
```

While the tail was streaming, the user scanned multiple barcodes on the phone PWA. **Zero function invocations appeared in the tail.** A subsequent control request from the developer's machine (`Invoke-WebRequest https://pignusinventario.pages.dev/api/inventory/barcode/tail-test-123`) immediately appeared as `GET ... - Ok @ 5/17/2026, 10:38:20 PM`, proving the tail itself works.

**Conclusion:** Scans from the PWA are not reaching the Cloudflare Pages function at all. The request is being terminated before it reaches the origin. Candidates: (a) CF Access blocking the API call at the edge (e.g., expired/missing JWT cookie), (b) the registered service worker (vite-plugin-pwa Workbox) intercepting the fetch and returning a cached/synthetic response, or (c) a network-level failure causing fetch to reject.

### Test 9 — Browser tab scan on the production custom domain (session 4)
User opened `https://inventario.pignuslabs.com.ar/` in a regular browser tab (not the installed PWA), authenticated through CF Access, and triggered a scan via the receive flow.

**User response:** "The scan still fails in the browser tab."

**Conclusion:** The failure is not specific to the installed PWA — it reproduces in a fresh browser tab on the same authenticated custom domain. This narrows the cause: a registered service worker is still a candidate (the SW from any prior visit persists across both browser tabs and the installed PWA on the same origin), but a PWA-install-specific bug (e.g., stale manifest, different scope) is ruled out. The CF Access JWT cookie should be present in this scenario because the user was actively logged in.

---

## What has been tried (chronological)

### 1. Original `_routes.json` — WRONG, was the first bug
`frontend/public/_routes.json` contained:
```json
{ "version": 1, "include": ["/*"], "exclude": ["/api/*"] }
```
This explicitly told CF Pages: **do not invoke functions for `/api/*`**.  
Fix: deleted the file entirely.  
Result: still 404. (Deleting it was correct but not sufficient.)

### 2. Moving functions from `frontend/functions/` → `functions/` (repo root)
Hypothesis: "v2 root directory strategy" means CF Pages looks for functions at the repo root, not the configured root (`frontend/`).  
Commit: `c79e487`  
Result: still 404.

### 3. Moving functions back: `functions/` → `frontend/functions/`
Hypothesis: build log path `/functions` is relative to the configured root (`frontend/`), so `frontend/functions/` is correct.  
Commit: `928b6fb`  
Result: still 404.

### 4. Moving functions to repo root again
Added `hono` to root `package.json` to ensure the dependency is resolvable when compiling from repo root.  
Commit: `3550e6b`  
Result: still 404.

### 5. Routing fix — functions at `frontend/functions/` + explicit `_routes.json` (session 2)
Two changes made together:
- Moved all functions back to `frontend/functions/` (canonical location when CF Pages root = `frontend`)
- Added `frontend/public/_routes.json`:
  ```json
  { "version": 1, "include": ["/api/*", "/healthz"], "exclude": [] }
  ```

Result: routing fixed. Test 5 confirmed all four verification tests passed.

### 6. Cleanup commit — removed debug scaffolding (session 3, this session)
After routing fix was confirmed, the following were removed in a single commit (`b1211ef`):
- `/api/ping` debug endpoint from `frontend/functions/api/[[catchall]].ts`
- `frontend/functions/healthz.ts`
- `/healthz` from `_routes.json` (now only `["/api/*"]` in include)
- Debug error display in `frontend/src/api/client.ts` (reverted to clean JSON parsing)
- Debug-mode toast CSS in `frontend/src/app.css` (reverted to centered/nowrap)
- Verbose error toasts in `ReceiveFlow` and `ConsumeFlow` (reverted to "Error al buscar el código. Intentá de nuevo.")

**Effect:** The app no longer displays the raw HTTP status code and response body when an API call fails. The specific nature of errors during scanning is now hidden from the user. This was done before confirming end-to-end scanning worked on the phone.

---

## What has been ruled out

| Hypothesis | Ruled out by |
|---|---|
| DB/KV bindings not configured | Screenshot confirmed both are set |
| Service worker caching the 404 | DevTools console fetch returns a real network 404 (not from SW cache) |
| TypeScript errors preventing compilation | `tsc --noEmit` passes locally; build log shows no errors |
| Function not compiled | Build log: "✨ Compiled Worker successfully" |
| Auth middleware blocking the request | `/api/ping` route added before auth middleware; still 404 (session 1); 401 from auth middleware confirmed in session 2 tests |
| `_routes.json` excluding `/api/*` | Fixed — correct `_routes.json` added |
| CF Pages not routing `/api/*` to function | Test 5 + Test 6 confirm routing works from both desktop and phone |

---

## Current repository state

```
frontend/
  functions/
    api/
      [[catchall]].ts     ← Hono app, routes /api/*
      _lib/
        auth.ts, barcode.ts, dashboard.ts,
        db.ts, families.ts, movements.ts,
        types.ts
  public/
    _routes.json          ← { "version":1, "include":["/api/*"], "exclude":[] }
  src/                    ← React app
  package.json            ← hono ^4.6.0

package.json (repo root)  ← workspaces: [frontend, worker]
```

Latest deployed commit: `b1211ef` (cleanup)

---

## Current unknown

Routing is confirmed working. The app's fetch to `/api/inventory/barcode/{code}` triggers the catch block ("Error al buscar el código. Intentá de nuevo."). The actual HTTP status and response body from that specific call are unknown because the debug error display was removed.
