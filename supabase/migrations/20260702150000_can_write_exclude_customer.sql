/*
  # Security fix: can_write() must exclude the 'customer' role

  ## Problem
  can_write() was defined (20260606000002, re-affirmed 20260607000006) as
  `role != 'viewer' AND is_active` — BEFORE the 'customer' role existed
  (introduced 20260613140000 for the Portal). An active portal customer therefore
  passes can_write(), and every write policy that uses bare can_write() accepts
  INSERT/UPDATE/DELETE from customers: treatment_daily_log,
  treatment_waste_transfers, treatment_monthly_summary, all safety_* registers,
  all training_* tables, employees, equipment/parts/maintenance_history and their
  junction tables.

  Reads were already hardened against customers (20260615000001); writes were not.
  Stock/logistics/commercial/spillages/biological-indicator policies already use
  role lists or `AND NOT is_customer()` and are unaffected.

  ## Fix
  Redefine can_write() to exclude BOTH 'viewer' and 'customer'. One function,
  closes the gap across every bare-can_write() policy at once. Signature,
  volatility, SECURITY DEFINER and search_path hardening kept identical, so all
  existing policies and grants are preserved by CREATE OR REPLACE.
*/

CREATE OR REPLACE FUNCTION public.can_write()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE auth_user_id = auth.uid()
      AND role NOT IN ('viewer', 'customer')
      AND is_active = true
  );
$$;

NOTIFY pgrst, 'reload schema';
