-- Upsert user_profiles for all 6 real operator accounts.
-- Uses INSERT ... ON CONFLICT DO UPDATE so the row is created if it doesn't exist
-- and corrected if it does (handles the case where earlier UPDATE-only migrations were no-ops).
-- Display name is pulled from the employees table (first_name) where possible.

DO $$
DECLARE
  v_uid     uuid;
  v_emp_id  uuid;
  v_name    text;
  v_admin   uuid;
BEGIN
  -- Resolve admin user for created_by
  SELECT id INTO v_admin FROM auth.users WHERE email = 'admin@tech4green.co.za' LIMIT 1;

  -- ── billyr → Raseala ──────────────────────────────────────────────────────
  SELECT id INTO v_uid FROM auth.users WHERE email = 'billyr@tech4green.co.za' LIMIT 1;
  SELECT id, first_name INTO v_emp_id, v_name FROM public.employees WHERE lower(surname) LIKE '%raseala%' AND status = 'active' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    INSERT INTO public.user_profiles (auth_user_id, display_name, role, is_active, employee_id, created_by, created_at, updated_at)
    VALUES (v_uid, COALESCE(v_name, 'Billy'), 'operator', true, v_emp_id, v_admin, now(), now())
    ON CONFLICT (auth_user_id) DO UPDATE SET
      role        = 'operator',
      is_active   = true,
      employee_id = EXCLUDED.employee_id,
      display_name = CASE WHEN user_profiles.display_name = '' THEN EXCLUDED.display_name ELSE user_profiles.display_name END,
      updated_at  = now();
  END IF;

  -- ── guiltys → Salane ──────────────────────────────────────────────────────
  SELECT id INTO v_uid FROM auth.users WHERE email = 'guiltys@tech4green.co.za' LIMIT 1;
  SELECT id, first_name INTO v_emp_id, v_name FROM public.employees WHERE lower(surname) LIKE '%salane%' AND status = 'active' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    INSERT INTO public.user_profiles (auth_user_id, display_name, role, is_active, employee_id, created_by, created_at, updated_at)
    VALUES (v_uid, COALESCE(v_name, 'Guilty'), 'operator', true, v_emp_id, v_admin, now(), now())
    ON CONFLICT (auth_user_id) DO UPDATE SET
      role        = 'operator',
      is_active   = true,
      employee_id = EXCLUDED.employee_id,
      display_name = CASE WHEN user_profiles.display_name = '' THEN EXCLUDED.display_name ELSE user_profiles.display_name END,
      updated_at  = now();
  END IF;

  -- ── rudim → Letsoalo ──────────────────────────────────────────────────────
  SELECT id INTO v_uid FROM auth.users WHERE email = 'rudim@tech4green.co.za' LIMIT 1;
  SELECT id, first_name INTO v_emp_id, v_name FROM public.employees WHERE lower(surname) LIKE '%letsoalo%' AND status = 'active' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    INSERT INTO public.user_profiles (auth_user_id, display_name, role, is_active, employee_id, created_by, created_at, updated_at)
    VALUES (v_uid, COALESCE(v_name, 'Rudi'), 'operator', true, v_emp_id, v_admin, now(), now())
    ON CONFLICT (auth_user_id) DO UPDATE SET
      role        = 'operator',
      is_active   = true,
      employee_id = EXCLUDED.employee_id,
      display_name = CASE WHEN user_profiles.display_name = '' THEN EXCLUDED.display_name ELSE user_profiles.display_name END,
      updated_at  = now();
  END IF;

  -- ── kobetsim → Makgopa ────────────────────────────────────────────────────
  SELECT id INTO v_uid FROM auth.users WHERE email = 'kobetsim@tech4green.co.za' LIMIT 1;
  SELECT id, first_name INTO v_emp_id, v_name FROM public.employees WHERE lower(surname) LIKE '%makgopa%' AND status = 'active' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    INSERT INTO public.user_profiles (auth_user_id, display_name, role, is_active, employee_id, created_by, created_at, updated_at)
    VALUES (v_uid, COALESCE(v_name, 'Kobetsi'), 'operator', true, v_emp_id, v_admin, now(), now())
    ON CONFLICT (auth_user_id) DO UPDATE SET
      role        = 'operator',
      is_active   = true,
      employee_id = EXCLUDED.employee_id,
      display_name = CASE WHEN user_profiles.display_name = '' THEN EXCLUDED.display_name ELSE user_profiles.display_name END,
      updated_at  = now();
  END IF;

  -- ── alfredm → Macheke (handles both techgreen.co.za and tech4green.co.za) ─
  SELECT id INTO v_uid FROM auth.users WHERE email IN ('alfredm@techgreen.co.za', 'alfredm@tech4green.co.za') LIMIT 1;
  SELECT id, first_name INTO v_emp_id, v_name FROM public.employees WHERE lower(surname) LIKE '%macheke%' AND status = 'active' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    INSERT INTO public.user_profiles (auth_user_id, display_name, role, is_active, employee_id, created_by, created_at, updated_at)
    VALUES (v_uid, COALESCE(v_name, 'Alfred'), 'operator', true, v_emp_id, v_admin, now(), now())
    ON CONFLICT (auth_user_id) DO UPDATE SET
      role        = 'operator',
      is_active   = true,
      employee_id = EXCLUDED.employee_id,
      display_name = CASE WHEN user_profiles.display_name = '' THEN EXCLUDED.display_name ELSE user_profiles.display_name END,
      updated_at  = now();
  END IF;

  -- ── freedomm → Mbavala ────────────────────────────────────────────────────
  SELECT id INTO v_uid FROM auth.users WHERE email = 'freedomm@tech4green.co.za' LIMIT 1;
  SELECT id, first_name INTO v_emp_id, v_name FROM public.employees WHERE lower(surname) LIKE '%mbavala%' AND status = 'active' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    INSERT INTO public.user_profiles (auth_user_id, display_name, role, is_active, employee_id, created_by, created_at, updated_at)
    VALUES (v_uid, COALESCE(v_name, 'Freedom'), 'operator', true, v_emp_id, v_admin, now(), now())
    ON CONFLICT (auth_user_id) DO UPDATE SET
      role        = 'operator',
      is_active   = true,
      employee_id = EXCLUDED.employee_id,
      display_name = CASE WHEN user_profiles.display_name = '' THEN EXCLUDED.display_name ELSE user_profiles.display_name END,
      updated_at  = now();
  END IF;

END $$;
