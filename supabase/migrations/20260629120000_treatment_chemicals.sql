/*
  # Treatment Plant — chemical tracking (on-site stock vs system usage vs book-outs)

  Lets the plant compare three things and investigate gaps:
    1. On site   — chemical stock on hand, in IBC units (shown in litres).
    2. System use — what the PLC/cycles imply was used = treatment_daily_log.chemical_litres
                    (already cycles × 27 L). Read-only; never moves stock.
    3. Booked out — what people physically took from stock, logged per event below.
                    This is the ONLY thing (besides receipts) that moves on-hand.

  Stock & replenishment stay on stock_items.current_quantity (in IBC "Each" units,
  incremented by record_stock_receipt when received from Chempower). A book-out posts
  a 'Stock Issued' movement via record_stock_movement_group to decrement it. litres =
  units × litres_per_unit (container size). Cost comes from the supplier price list
  (supplier_items.unit_price, per IBC).

  Writes are gated to stock writers (admin/management/stock_controller) via the
  existing can_write_stock(); reads are internal-only. Additive, RLS-on, anon hardened.
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. treatment_chemicals — the tracked chemical(s)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.treatment_chemicals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id uuid NOT NULL REFERENCES public.stock_items(id) ON DELETE RESTRICT,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT '',
  litres_per_unit numeric NOT NULL DEFAULT 1000 CHECK (litres_per_unit > 0),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (stock_item_id)
);

CREATE INDEX IF NOT EXISTS idx_treatment_chemicals_supplier
  ON public.treatment_chemicals (supplier_id);

ALTER TABLE public.treatment_chemicals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read treatment_chemicals (internal)"
  ON public.treatment_chemicals FOR SELECT TO authenticated
  USING (NOT public.is_customer());

CREATE POLICY "Stock writer can insert treatment_chemicals"
  ON public.treatment_chemicals FOR INSERT TO authenticated
  WITH CHECK (public.can_write_stock());

CREATE POLICY "Stock writer can update treatment_chemicals"
  ON public.treatment_chemicals FOR UPDATE TO authenticated
  USING (public.can_write_stock()) WITH CHECK (public.can_write_stock());

CREATE POLICY "Stock writer can delete treatment_chemicals"
  ON public.treatment_chemicals FOR DELETE TO authenticated
  USING (public.can_write_stock());

CREATE TRIGGER treatment_chemicals_updated_at
  BEFORE UPDATE ON public.treatment_chemicals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. treatment_chemical_bookouts — each physical book-out (deducts stock)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.treatment_chemical_bookouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chemical_id uuid NOT NULL REFERENCES public.treatment_chemicals(id) ON DELETE CASCADE,
  bookout_date date NOT NULL DEFAULT CURRENT_DATE,
  units numeric NOT NULL CHECK (units > 0),          -- IBCs booked out
  litres numeric NOT NULL DEFAULT 0,                 -- snapshot: units × litres_per_unit
  unit_cost numeric NOT NULL DEFAULT 0,              -- snapshot: price per IBC
  total_cost numeric GENERATED ALWAYS AS (units * unit_cost) STORED,
  booked_out_by_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  movement_group_id uuid,
  notes text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chem_bookouts_chemical ON public.treatment_chemical_bookouts (chemical_id);
CREATE INDEX IF NOT EXISTS idx_chem_bookouts_date     ON public.treatment_chemical_bookouts (bookout_date);

ALTER TABLE public.treatment_chemical_bookouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read treatment_chemical_bookouts (internal)"
  ON public.treatment_chemical_bookouts FOR SELECT TO authenticated
  USING (NOT public.is_customer());

CREATE POLICY "Stock writer can insert treatment_chemical_bookouts"
  ON public.treatment_chemical_bookouts FOR INSERT TO authenticated
  WITH CHECK (public.can_write_stock());

CREATE POLICY "Stock writer can update treatment_chemical_bookouts"
  ON public.treatment_chemical_bookouts FOR UPDATE TO authenticated
  USING (public.can_write_stock()) WITH CHECK (public.can_write_stock());

CREATE POLICY "Stock writer can delete treatment_chemical_bookouts"
  ON public.treatment_chemical_bookouts FOR DELETE TO authenticated
  USING (public.can_write_stock());

CREATE TRIGGER treatment_chemical_bookouts_updated_at
  BEFORE UPDATE ON public.treatment_chemical_bookouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Privilege hardening — strip anon/PUBLIC, keep authenticated (RLS gates writes)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  EXECUTE 'REVOKE SELECT ON public.treatment_chemicals FROM PUBLIC';
  EXECUTE 'REVOKE SELECT ON public.treatment_chemical_bookouts FROM PUBLIC';
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE SELECT ON public.treatment_chemicals FROM anon';
    EXECUTE 'REVOKE SELECT ON public.treatment_chemical_bookouts FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.treatment_chemicals TO authenticated';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.treatment_chemical_bookouts TO authenticated';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
