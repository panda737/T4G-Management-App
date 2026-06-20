# Tech4Green Management App — Claude guide

Internal management platform + customer **Portal** for Tech4Green (waste
treatment). Single-page app; everything is gated by Supabase Row-Level Security.

**Stack:** React 18 + TypeScript + Vite 5 (SPA) · Supabase (Postgres + Auth + RLS +
Storage) · Tailwind 3 · react-router 6.

## Commands
| Command | What | Notes |
|---|---|---|
| `npm run dev` | Local dev server | |
| `npm run typecheck` | `tsc --noEmit` | **Must be 0.** The build does NOT typecheck — run this separately before every commit. |
| `npm run build` | `vite build` | Bundles only; strips types (no typecheck). |
| `npm run lint` | eslint | Has a known backlog (advisory in CI, not a gate yet). |

CI (`.github/workflows/ci.yml`) runs typecheck + build on every push/PR. Keep them green.

## Critical rules (high blast radius — read before touching these)

### Database / migrations
- Project ref: `xauihttwovxdcmbxsmmf`. Schema changes = plain SQL files in
  `supabase/migrations/` named `YYYYMMDDHHMMSS_name.sql`.
- **Do NOT use the Supabase CLI / `supabase db push`.** The CLI is blocked on this
  machine and the migration ledger is drifted, so push tries to re-apply old
  migrations and errors.
- **Apply a migration with:** `node _dbrun.cjs --file supabase/migrations/<file>.sql`
  (local, gitignored runner; connection string lives in `%TEMP%`, never in the repo).
  It runs each file as one transaction. Alternative: the Supabase Management API.
- Migrations must be **additive & transaction-safe**, enable RLS on new tables, mirror
  the anon/PUBLIC `REVOKE` + authenticated `GRANT` hardening, and end with
  `NOTIFY pgrst, 'reload schema';`.
- **Production DB changes are shown for approval first**, then applied via the runner —
  never silently.

### Secrets
- `.env` holds **only** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- The Supabase **service_role** key must NEVER go in `.env`, client code, or the repo
  (it bypasses RLS).

### Git
- Work on a branch; merge to `main` via fast-forward. **Push only when the user asks.**
- Before merging: `npm run typecheck` (0) and `npm run build` (clean).

## Permission model (enforce in BOTH the DB and the UI)
RLS helper functions (defined in migrations) — these are the source of truth for writes:
- `is_admin()` — role `admin`, active.
- `can_write_stock()` — `admin` / `management` / `stock_controller` (Stock module writes
  + the `record_stock_receipt` RPC).
- `can_write_commercial()` — `admin` / `management` (Commercial CRM writes).
- `can_write()` — any non-`viewer`, active user.
- `is_customer()` — a Portal customer. Internal reads are gated `USING (NOT is_customer())`.

UI side mirrors this via `useUser()` → `{ isAdmin, canWrite('<module>'), role, profile }`.
**Gate every write button on the same role the RLS policy requires.** Example: the
**Suppliers** module is admin-only end-to-end — writes use `is_admin()` (NOT
`can_write_commercial()`), reads stay broad so `stock_controller` can pick a supplier when
receiving stock.

## Module map (sidebar group → route prefix → main tables)
- **Dashboard** — `/` — stock KPIs.
- **Treatment Plant** — `/treatment/*` — plant ops (daily log, transfers, waste-on-floor).
- **Commercial** — `/commercial/*` — `src/pages/Commercial/`: Clients (page/tabs stay
  "Accounts"), Suppliers, Dashboard/Reports, Imports (received-waste), ESG engine, Portal
  audit. Tables: `clients`, `suppliers`/`supplier_items`, `received_waste_records`, `esg_*`.
- **Stock Management** — `/stock/*` — `stock_items`, `stock_movements`, `stock_orders`,
  `stock_receipts` (+ `supplier_id`). Stock numbers via `src/lib/numberGenerator.ts`.
- **Health & Safety** — `/safety/*` · **Training** — `/training/*` · **Maintenance** —
  `/maintenance*`.
- **Portal** — `/portal/*` — customer-facing, read-only ESG/waste views.

## Conventions
- **Reuse the CRM primitives** in `src/components/crm/` (`ListView`, `RecordHeader`,
  `RecordTabs`, `DetailFields`, `RelatedList`). Canonical example to mirror for any
  list+detail feature: `Commercial/ClientManagement.tsx` + `ClientView.tsx` (and the
  Suppliers module, which copies that pattern).
- Section sub-tabs: `src/components/SectionTabs.tsx` + the `*_TABS` arrays in
  `src/pages/Commercial/commercialTabs.ts`.
- Shared types live in `src/lib/supabase.ts`; add new table row types there.

## Verify a change before committing
1. `npm run typecheck` → 0, `npm run build` → clean.
2. For DB changes: read-only `information_schema` / `pg_policies` checks via `_dbrun.cjs`.
3. Confirm role gating: an admin can write; a non-admin's buttons are hidden AND RLS
   rejects a direct write.
