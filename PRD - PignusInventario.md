# PignusInventario — PRD

---

## 1. Overview

**Product Name:** PignusInventario

### Ecosystem Context

The inventory system exists as a focused operational service within the PignusLabs platform — not a monolithic ERP.

| Service | Role in ecosystem |
|---|---|
| PignusPortal | Authentication, dashboarding, cross-service metrics, admin visibility |
| PignusFacturacion | Invoicing, ERP-related workflows, potential future sales ingestion |
| PignusInversiones | Financial tracking |

---

## 2. Product Requirements

### Core MVP Requirements

- Mobile-first PWA
- Barcode-assisted filament inventory workflows
- Bulk receiving support
- Integer-only unopened spool tracking
- Low-stock alerts per filament family
- Search and filtering capabilities
- Historical inventory movement tracking
- Multi-user support
- Shared authentication inherited from PignusPortal
- Editable inventory movements with edit timestamps
- Dashboard visibility inside app and Portal
- Support for future forecasting and procurement recommendation systems

### Core Technical Constraints

- Must operate within Cloudflare ecosystem (free-tier preferred)
- **Cloudflare D1** as authoritative persistence layer
- Subdomain: `inventario.pignuslabs.com.ar`
- No native mobile apps — no Play Store / App Store dependency
- Always-online operational assumption
- PignusPortal owns authentication and role management

---

## 3. Product Goals

**Primary Goal:** Prevent operational filament stockouts while minimizing operator friction.

**Secondary Goals:**
- Improve inventory discoverability
- Reduce emergency purchases
- Provide low-stock visibility
- Build a reliable historical inventory movement dataset
- Enable future forecasting and procurement recommendations

### Explicit Non-Goals (MVP)

- Manufacturing execution system (MES)
- Printer telemetry
- Exact filament quantity tracking
- Cost accounting
- Warehouse-grade traceability
- Production analytics
- Operator performance tracking
- BOM-driven consumption
- Marketplace inventory synchronization
- Procurement automation

---

## 4. Operational Philosophy

| Optimizes for | Does NOT optimize for |
|---|---|
| Low operational friction | Perfect inventory precision |
| High user adoption | Strict transactional rigor |
| Approximate-but-useful accuracy | Enterprise manufacturing workflows |
| Stockout prevention | Detailed spool lifecycle management |
| Fast mobile interactions | |
| Recoverability through manual adjustment | |

---

## 5. Business Context

### Business Characteristics

- ~5 employees
- Primary sales channel: MercadoLibre
- Secondary channels: Tienda Nube, WhatsApp/manual sales, occasional custom fabrication
- Inventory uncertainty is most painful at **filament level**
- Finished goods shortages are tolerable (fast manufacturing turnaround), but still undesirable

### Inventory Reality

Current inventory is spatially distributed and operationally informal. The primary operational question is:

> **"Do we already have this filament somewhere?"**
> — not — "Exactly how many grams remain?"

---

## 6. Inventory Domains

MVP scope covers **filament inventory only**. The architecture should keep future domains separable:

| Domain | MVP | Future |
|---|---|---|
| Filament | ✓ | — |
| Consumables | — | ✓ |
| Packaging | — | ✓ |
| Finished goods | — | ✓ |

---

## 7. Filament Inventory Model

### Core Concept

- Tracks **unopened/unused spools only**
- Once a spool is opened/used, it exits authoritative inventory
- Does NOT track: remaining grams, active/opened spools, printer assignment, partial spool availability

This is a deliberate operational simplification.

### Filament Family

A filament family is uniquely identified by **Brand + Material + Brand Color Name**.

Example: `eSUN PLA Matte Black`

Different brands are treated as different inventory families even if colors appear visually similar.

### Filament Family Fields

**Required:**

| Field | Notes |
|---|---|
| `id` | |
| `brand` | |
| `material` | |
| `brand_color_name` | |
| `normalized_visual_color` | See below |
| `reorder_threshold` | |
| `active` | boolean |
| `created_at` / `updated_at` | |

**Optional:** `photo`, `notes`

### Normalized Visual Color

Used for visual discovery and grouping visually similar materials — does **not** affect inventory logic or alerts.

Examples: `BLACK`, `WHITE`, `RED`, `BLUE`, `GRAY`, `TRANSLUCENT`, `MULTICOLOR`

### Barcode Mapping

- One barcode → one filament family
- One filament family → multiple barcodes allowed (supports packaging revisions, supplier changes, wholesale variants)
- Barcodes identify **families**, not individual spools

---

## 8. Inventory Semantics

### Authoritative Inventory

- Unopened spools only
- Integer quantities — no decimals

### Inventory Movements

**MVP movement types:** `RECEIVE_STOCK` · `CONSUME_OPEN` · `MANUAL_ADJUSTMENT`

All movements are editable and include edit timestamp metadata.

| Field | Notes |
|---|---|
| `id` | |
| `filament_family_id` | |
| `movement_type` | |
| `quantity_delta` | |
| `created_at` / `created_by` | |
| `updated_at` / `updated_by` | |
| `notes` | optional |

### Inventory State Model

The system maintains two layers:

**A. Movement History** — Historical ledger. Required for forecasting, analytics, auditing, trend analysis.

**B. Current Inventory Projection** — Materialized current state. May be calculated dynamically or cached/materialized. Implementation decision deferred.

### Low Stock Logic

Alert triggers when: `current_stock <= reorder_threshold` (evaluated per filament family).

### Alternative Availability Context

Low stock alerts display visually similar alternatives — **informational only**, no effect on inventory logic.

```
LOW STOCK: eSUN PLA Matte Black
ALTERNATIVES AVAILABLE:
  Printalot PLA Black    (5)
  Grilon3 PLA Black      (2)
```

Alternative criteria: same `material` + same `normalized_visual_color`, different `brand` allowed.

---

## 9. Reordering & Procurement

### Reordering Philosophy

The business intentionally overstocks and cannot tolerate surprise shortages. The system should:
- Favor conservative low-stock detection
- Prioritize visibility over optimization

### Procurement Model

- Wholesale purchases for common materials
- MercadoLibre for exotic materials
- Behavior: "buy a lot when low"
- Wholesale pricing favors fixed carton quantities (~12–20 spools)

Future forecasting/reorder systems should support **recommended purchase batch sizes**, not merely replenishment deltas.

---

## 10. Mobile Application

- **Type:** Progressive Web App (PWA)
- Mobile-first responsive UI
- Installable to phone home screen
- No app store dependency
- Accessible via URL or PignusPortal

---

## 11. Authentication & Authorization

- Authentication inherited from PignusPortal
- Role management owned by Portal — inventory module consumes authenticated user identity and role context
- Concurrent multi-user usage supported
- Lightweight concurrency handling acceptable (small co-located team, occasional conflicts resolvable manually)

---

## 12. UX Principles

**Goals:** Minimal friction · Minimal typing · Fast repeatable workflows · Camera-assisted interaction

**Interaction model:** Action-first (select action → scan → confirm), not camera-first.

---

## 13. Core MVP Workflows

### Receive Inventory
1. Select "Receive Inventory"
2. Scan barcode → resolves to filament family
3. Enter quantity
4. Confirm

Supports bulk receiving (single scan + quantity entry).

### Consume / Open Spool
1. Select "Consume/Open"
2. Scan barcode
3. Quantity defaults to 1
4. Confirm

Removes one unopened spool from authoritative inventory.

### Manual Adjustment
1. Search/select filament family
2. Enter adjustment quantity + optional note
3. Confirm

### Barcode Registration

| Scenario | Behavior |
|---|---|
| Known barcode | Auto-resolve to filament family |
| Unknown barcode | Prompt: map to existing family OR create new family |

### Create Filament Family

Required: brand, material, supplier color name, normalized visual color, reorder threshold. Optional: photo.

### Search & Discovery

- Text search
- Filter by brand, material, visual color
- Visual discovery is operationally important

---

## 14. Dashboards

### App Dashboard
- Low stock alerts
- Current stock levels
- Recently consumed / received filament families
- Recent inventory activity
- Stock over time per filament family

### Portal Dashboard
- Cross-service metrics
- Inventory alert visibility
- Audit/admin visibility

---

## 15. Notifications

**MVP:** In-app alerts + dashboard visibility.

**Email:** Feasible within free-tier limits. Candidate providers: Resend, Mailgun, Brevo.

- No realtime spam-style notifications
- Preferred model: persistent dashboard alerts + periodic email digest
- Mailing base: ~5 users

---

## 16. Reporting & Analytics

### MVP
- Current inventory visibility
- Low stock visibility
- Movement history
- Consumption trends

### Deferred
- Costing, procurement optimization, production metrics, inventory valuation, ERP reconciliation

---

## 17. Forecasting (Immediate Post-MVP)

Forecasting is Phase 1 immediately after MVP. The MVP data model must support it from day one.

### Required MVP Data Foundation
- Historical movement analysis
- Rolling consumption averages
- Seasonal analysis
- Reorder recommendations

### Expected Outputs
- Monthly filament usage forecast
- Monthly reorder recommendations

### Procurement Recommendation Philosophy

Forecasting and procurement recommendation are **separate concerns**:

> Forecasted need: 10 PLA Black
> Procurement recommendation: 10 PLA Black + 10 PLA White *(carton/shipping economics)*

The future procurement engine should support:
- Carton completion heuristics
- Conservative safety stock behavior
- High-turnover substitution recommendations
- Seasonal stocking buffers

### Inputs
- Inventory movement history
- Seasonality
- MercadoLibre sales velocity
- Historical consumption

> Forecasting visualization and analytics UX are deferred to PignusPortal. The inventory module is responsible for preserving clean operational history data for later analytical consumption.
