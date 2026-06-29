/*
  # Treatment Plant — chemical tracking

  Tech4Green doses a fixed amount of treatment chemical per cycle. This adds a
  small catalog of treatment chemicals (each linked to a Stock item + a supplier
  whose price list gives the unit cost) and a per-month usage reconciliation
  (expected vs actual, variance, cost).

  Design notes
  - Stock-on-hand & replenishment are NOT duplicated here: they live on
    `stock_items.current_quantity`, already incremented by `record_stock_receipt`
    when chemical is received (e.g. from Chempower). The app reads that column.
  - Recording actual usage posts a 'Stock Issued' movement via
    `record_stock_movement_group` to decrement on-hand; `movement_group_id` is
    stored here so edits/deletes can post compensating movements.
  - Unit cost is read live from `supplier_items.unit_price` for the chemical's
    (supplier, stock_item) pair and snapshotted into `unit_cost` on each usage row.

  Writes on both tables are gated to admin/management via
  `can_write_treatment_chemicals()`; reads are internal-only (NOT a customer).
  Additive, transaction-safe, RLS-on, anon hardened. Mirrors the house style.
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Write helper — admin / management (mirrors can_write_commercial)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.can_write_treatment_chemicals()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY INVOKER
  SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'management')
      AND is_active = true
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_write_treatment_chemicals() FROM anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. treatment_chemicals — the catalog (one row per tracked chemical)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.treatment_chemicals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id uuid NOT NULL REFERENCES public.stock_items(id) ON DELETE RESTRICT,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT '',
  litres_per_cycle numeric NOT NULL DEFAULT 27 CHECK (litres_per_cycle >= 0),
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

CREATE POLICY "Manager can insert treatment_chemicals"
  ON public.treatment_chemicals FOR INSERT TO authenticated
  WITH CHECK (public.can_write_treatment_chemicals());

CREATE POLICY "Manager can update treatment_chemicals"
  ON public.treatment_chemicals FOR UPDATE TO authenticated
  USING (public.can_write_treatment_chemicals())
  WITH CHECK (public.can_write_treatment_chemicals());

CREATE POLICY "Manager can delete treatment_chemicals"
  ON public.treatment_chemicals FOR DELETE TO authenticated
  USING (public.can_write_treatment_chemicals());

CREATE TRIGGER treatment_chemicals_updated_at
  BEFORE UPDATE ON public.treatment_chemicals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. treatment_chemical_usage — monthly actual-usage reconciliation
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.treatment_chemical_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chemical_id uuid NOT NULL REFERENCES public.treatment_chemicals(id) ON DELETE CASCADE,
  month date NOT NULL,
  expected_litres numeric NOT NULL DEFAULT 0,
  actual_litres numeric NOT NULL DEFAULT 0 CHECK (actual_litres >= 0),
  variance_litres numeric GENERATED ALWAYS AS (actual_litres - expected_litres) STORED,
  unit_cost numeric NOT NULL DEFAULT 0,
  total_cost numeric GENERATED ALWAYS AS (actual_litres * unit_cost) STORED,
  movement_group_id uuid,
  notes text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (chemical_id, month)
);

CREATE INDEX IF NOT EXISTS idx_treatment_chemical_usage_chemical
  ON public.treatment_chemical_usage (chemical_id);

ALTER TABLE public.treatment_chemical_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read treatment_chemical_usage (internal)"
  ON public.treatment_chemical_usage FOR SELECT TO authenticated
  USING (NOT public.is_customer());

CREATE POLICY "Manager can insert treatment_chemical_usage"
  ON public.treatment_chemical_usage FOR INSERT TO authenticated
  WITH CHECK (public.can_write_treatment_chemicals());

CREATE POLICY "Manager can update treatment_chemical_usage"
  ON public.treatment_chemical_usage FOR UPDATE TO authenticated
  USING (public.can_write_treatment_chemicals())
  WITH CHECK (public.can_write_treatment_chemicals());

CREATE POLICY "Manager can delete treatment_chemical_usage"
  ON public.treatment_chemical_usage FOR DELETE TO authenticated
  USING (public.can_write_treatment_chemicals());

CREATE TRIGGER treatment_chemical_usage_updated_at
  BEFORE UPDATE ON public.treatment_chemical_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Privilege hardening — strip anon/PUBLIC, keep authenticated (RLS gates writes)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  EXECUTE 'REVOKE SELECT ON public.treatment_chemicals FROM PUBLIC';
  EXECUTE 'REVOKE SELECT ON public.treatment_chemical_usage FROM PUBLIC';
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE SELECT ON public.treatment_chemicals FROM anon';
    EXECUTE 'REVOKE SELECT ON public.treatment_chemical_usage FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.treatment_chemicals TO authenticated';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.treatment_chemical_usage TO authenticated';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
