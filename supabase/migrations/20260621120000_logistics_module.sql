/*
  # Logistics module — role, write helper, and two registers

  ## Purpose
  Stands up the Logistics module so the Logistics Manager (Siyanda) can run the
  fleet inside the app. The business does route planning / live tracking in
  Ctrack, so this owns only the compliance/admin layer Ctrack doesn't:

    - logistics_vehicles            — the fleet register + vehicle paper expiries
    - logistics_driver_compliance   — per-driver licence / PrDP / medical expiries

  ## Access — new single-module role `logistics_manager`
  Mirrors `stock_controller` exactly. A new write helper can_write_logistics()
  returns true for active admin / management / logistics_manager. Reads stay
  broad-but-internal (NOT is_customer()) so the rest of the internal app can see
  the fleet; writes are gated to the helper.

  Reuses existing helpers: public.is_customer() (20260613140000),
  public.update_updated_at() (trigger fn). Additive & transaction-safe; apply
  via the project's _dbrun.cjs (the migration ledger is drifted — not auto-pushed).
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Allow the new role on user_profiles (extend the existing CHECK)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check,
  ADD CONSTRAINT user_profiles_role_check
    CHECK (role IN ('admin','management','stock_controller','production','operator','viewer','customer','logistics_manager'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. can_write_logistics() — scoped write helper (copy of can_write_stock())
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.can_write_logistics()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY INVOKER
  SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'management', 'logistics_manager')
      AND is_active = true
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_write_logistics() FROM anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. logistics_vehicles — the fleet register
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.logistics_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration text NOT NULL,
  fleet_number text DEFAULT '',
  make_model text DEFAULT '',
  vehicle_type text DEFAULT '',
  capacity_kg numeric CHECK (capacity_kg IS NULL OR capacity_kg >= 0),
  assigned_driver_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Active'
    CHECK (status IN ('Active', 'In for Repair', 'Decommissioned')),
  licence_disc_expiry date,
  roadworthy_expiry date,
  transport_permit_expiry date,
  insurance_expiry date,
  notes text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_logistics_vehicles_registration
  ON public.logistics_vehicles (registration) WHERE registration <> '';
CREATE INDEX IF NOT EXISTS idx_logistics_vehicles_driver
  ON public.logistics_vehicles (assigned_driver_id);

ALTER TABLE public.logistics_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read logistics_vehicles (internal)"
  ON public.logistics_vehicles FOR SELECT TO authenticated
  USING (NOT public.is_customer());

CREATE POLICY "Logistics writer can insert logistics_vehicles"
  ON public.logistics_vehicles FOR INSERT TO authenticated
  WITH CHECK (public.can_write_logistics());

CREATE POLICY "Logistics writer can update logistics_vehicles"
  ON public.logistics_vehicles FOR UPDATE TO authenticated
  USING (public.can_write_logistics()) WITH CHECK (public.can_write_logistics());

CREATE POLICY "Logistics writer can delete logistics_vehicles"
  ON public.logistics_vehicles FOR DELETE TO authenticated
  USING (public.can_write_logistics());

CREATE TRIGGER logistics_vehicles_updated_at
  BEFORE UPDATE ON public.logistics_vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. logistics_driver_compliance — one row per driver
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.logistics_driver_compliance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  licence_code text DEFAULT '',
  licence_expiry date,
  prdp_categories text DEFAULT '',
  prdp_expiry date,
  medical_expiry date,
  dg_training_expiry date,
  induction_date date,
  notes text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (employee_id)
);

CREATE INDEX IF NOT EXISTS idx_logistics_driver_compliance_employee
  ON public.logistics_driver_compliance (employee_id);

ALTER TABLE public.logistics_driver_compliance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read logistics_driver_compliance (internal)"
  ON public.logistics_driver_compliance FOR SELECT TO authenticated
  USING (NOT public.is_customer());

CREATE POLICY "Logistics writer can insert logistics_driver_compliance"
  ON public.logistics_driver_compliance FOR INSERT TO authenticated
  WITH CHECK (public.can_write_logistics());

CREATE POLICY "Logistics writer can update logistics_driver_compliance"
  ON public.logistics_driver_compliance FOR UPDATE TO authenticated
  USING (public.can_write_logistics()) WITH CHECK (public.can_write_logistics());

CREATE POLICY "Logistics writer can delete logistics_driver_compliance"
  ON public.logistics_driver_compliance FOR DELETE TO authenticated
  USING (public.can_write_logistics());

CREATE TRIGGER logistics_driver_compliance_updated_at
  BEFORE UPDATE ON public.logistics_driver_compliance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Privilege hardening — strip anon/PUBLIC, keep authenticated (RLS still
--    gates writes). Mirrors 20260620000002.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  EXECUTE 'REVOKE SELECT ON public.logistics_vehicles FROM PUBLIC';
  EXECUTE 'REVOKE SELECT ON public.logistics_driver_compliance FROM PUBLIC';
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE SELECT ON public.logistics_vehicles FROM anon';
    EXECUTE 'REVOKE SELECT ON public.logistics_driver_compliance FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.logistics_vehicles TO authenticated';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.logistics_driver_compliance TO authenticated';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
