/*
  # Toolbox talk — presenter signature + lock edits after recording

  1. Add signature_data / signed_at to safety_toolbox_talks. Every talk is signed
     off by the presenter (the logged-in person) when it is recorded.

  2. A recorded & signed talk must be immutable to operators. Recording (INSERT)
     stays open to any non-viewer so operators can still record talks, but
     UPDATE and DELETE are restricted to admin / management via a new
     can_manage_safety() helper.

  Additive & transaction-safe; apply via _dbrun.cjs (the migration ledger is
  drifted — not auto-pushed).
*/

ALTER TABLE public.safety_toolbox_talks
  ADD COLUMN IF NOT EXISTS signature_data text,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz;

-- admin / management write gate for H&S records (reusable).
CREATE OR REPLACE FUNCTION public.can_manage_safety()
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

REVOKE EXECUTE ON FUNCTION public.can_manage_safety() FROM anon;

-- Operators can record (INSERT stays as-is) but cannot edit/remove a signed talk.
DROP POLICY IF EXISTS "Non-viewer can update toolbox talks" ON public.safety_toolbox_talks;
CREATE POLICY "Manager can update toolbox talks"
  ON public.safety_toolbox_talks FOR UPDATE TO authenticated
  USING (public.can_manage_safety()) WITH CHECK (public.can_manage_safety());

DROP POLICY IF EXISTS "Non-viewer can delete toolbox talks" ON public.safety_toolbox_talks;
CREATE POLICY "Manager can delete toolbox talks"
  ON public.safety_toolbox_talks FOR DELETE TO authenticated
  USING (public.can_manage_safety());

NOTIFY pgrst, 'reload schema';
