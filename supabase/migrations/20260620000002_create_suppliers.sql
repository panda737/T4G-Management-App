/*
  # Suppliers — suppliers, supplier_items, stock_receipts.supplier_id

  ## Purpose
  Introduces real supplier records (replacing the free-text stock_receipts.supplier
  string) and the catalogue of stock items each supplier provides:

    - suppliers       — one supplier record (clients-style core + supply terms)
    - supplier_items  — links an existing stock_item to a supplier + unit price
                        (a price-list line; never creates/edits the stock master)

  Also adds stock_receipts.supplier_id so a receipt can reference the real
  supplier record (the denormalised `supplier` text column is kept as-is).

  ## Security (admin-only writes, broad internal reads)
  The whole Commercial area is admin-only in the UI, and suppliers are managed
  there, so ALL supplier writes are admin-only:
    - SELECT: authenticated internal users only — NOT public.is_customer().
              (Kept broad so the Stock receive form — used by stock_controller —
               can list suppliers in its picker. Reads do NOT imply writes.)
    - INSERT/UPDATE/DELETE: public.is_admin() only — on BOTH tables.
    - anon / PUBLIC: no access (no policy + table grants revoked).

  Reuses existing helpers: public.is_admin() (20260607000006),
  public.is_customer() (20260613140000), public.update_updated_at() (trigger fn).

  Additive and transaction-safe. Apply manually (see project apply path); the
  Supabase migration ledger is drifted, so this is not auto-pushed.
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- suppliers
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code text DEFAULT '',
  supplier_name text NOT NULL,
  contact_person text DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  address_line_1 text DEFAULT '',
  address_line_2 text DEFAULT '',
  address_line_3 text DEFAULT '',
  postal_code text DEFAULT '',
  website text DEFAULT '',
  notes text DEFAULT '',
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('prospect', 'active', 'inactive')),
  payment_terms text DEFAULT '',
  lead_time_days integer,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Code uniqueness that still allows multiple blanks (only real codes are unique).
CREATE UNIQUE INDEX IF NOT EXISTS ux_suppliers_code
  ON public.suppliers (supplier_code) WHERE supplier_code <> '';
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers (supplier_name);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read suppliers (internal)"
  ON public.suppliers FOR SELECT TO authenticated
  USING (NOT public.is_customer());

CREATE POLICY "Admin can insert suppliers"
  ON public.suppliers FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update suppliers"
  ON public.suppliers FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete suppliers"
  ON public.suppliers FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- supplier_items (links an existing stock_item to a supplier + price)
-- Deleting a supplier_items row never touches stock_items; deleting a stock
-- master item just removes its supplier links (ON DELETE CASCADE both sides).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.supplier_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  stock_item_id uuid NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  unit_price numeric NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  supplier_sku text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (supplier_id, stock_item_id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_items_supplier   ON public.supplier_items (supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_items_stock_item ON public.supplier_items (stock_item_id);

ALTER TABLE public.supplier_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read supplier_items (internal)"
  ON public.supplier_items FOR SELECT TO authenticated
  USING (NOT public.is_customer());

CREATE POLICY "Admin can insert supplier_items"
  ON public.supplier_items FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update supplier_items"
  ON public.supplier_items FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete supplier_items"
  ON public.supplier_items FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE TRIGGER supplier_items_updated_at
  BEFORE UPDATE ON public.supplier_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- stock_receipts.supplier_id (link receipts to the real supplier record)
-- Keeps the existing `supplier` text column as the denormalised name.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.stock_receipts
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stock_receipts_supplier_id ON public.stock_receipts (supplier_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Privilege hardening — new public tables are granted to anon by Supabase
-- default privileges, so strip anon/PUBLIC SELECT (RLS already denies it) and
-- keep authenticated grants. RLS still gates writes to admins. Mirrors
-- 20260617000000.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  EXECUTE 'REVOKE SELECT ON public.suppliers FROM PUBLIC';
  EXECUTE 'REVOKE SELECT ON public.supplier_items FROM PUBLIC';
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE SELECT ON public.suppliers FROM anon';
    EXECUTE 'REVOKE SELECT ON public.supplier_items FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_items TO authenticated';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
