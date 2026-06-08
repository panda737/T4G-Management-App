-- Re-enable the real operator accounts (suffix usernames) and set correct role + employee links.
-- Previous migrations targeted wrong clean emails (rudi@, billy@, etc.) which were no-ops.
-- Migration 20260608000002 accidentally disabled these real accounts — this reverses that.
DO $$
DECLARE
  v_uid    uuid;
  v_emp_id uuid;
BEGIN
  -- billyr → Raseala
  SELECT id INTO v_uid FROM auth.users WHERE email = 'billyr@tech4green.co.za' LIMIT 1;
  SELECT id INTO v_emp_id FROM public.employees WHERE lower(surname) LIKE '%raseala%' AND status = 'active' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    UPDATE public.user_profiles SET is_active = true, role = 'operator', employee_id = v_emp_id, updated_at = now() WHERE auth_user_id = v_uid;
  END IF;

  -- guiltys → Salane
  SELECT id INTO v_uid FROM auth.users WHERE email = 'guiltys@tech4green.co.za' LIMIT 1;
  SELECT id INTO v_emp_id FROM public.employees WHERE lower(surname) LIKE '%salane%' AND status = 'active' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    UPDATE public.user_profiles SET is_active = true, role = 'operator', employee_id = v_emp_id, updated_at = now() WHERE auth_user_id = v_uid;
  END IF;

  -- rudim → Letsoalo
  SELECT id INTO v_uid FROM auth.users WHERE email = 'rudim@tech4green.co.za' LIMIT 1;
  SELECT id INTO v_emp_id FROM public.employees WHERE lower(surname) LIKE '%letsoalo%' AND status = 'active' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    UPDATE public.user_profiles SET is_active = true, role = 'operator', employee_id = v_emp_id, updated_at = now() WHERE auth_user_id = v_uid;
  END IF;

  -- kobetsim → Makgopa
  SELECT id INTO v_uid FROM auth.users WHERE email = 'kobetsim@tech4green.co.za' LIMIT 1;
  SELECT id INTO v_emp_id FROM public.employees WHERE lower(surname) LIKE '%makgopa%' AND status = 'active' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    UPDATE public.user_profiles SET is_active = true, role = 'operator', employee_id = v_emp_id, updated_at = now() WHERE auth_user_id = v_uid;
  END IF;

  -- alfredm → Macheke (handle both domain variants: techgreen.co.za and tech4green.co.za)
  SELECT id INTO v_uid FROM auth.users WHERE email IN ('alfredm@techgreen.co.za', 'alfredm@tech4green.co.za') LIMIT 1;
  SELECT id INTO v_emp_id FROM public.employees WHERE lower(surname) LIKE '%macheke%' AND status = 'active' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    UPDATE public.user_profiles SET is_active = true, role = 'operator', employee_id = v_emp_id, updated_at = now() WHERE auth_user_id = v_uid;
  END IF;

  -- freedomm → Mbavala
  SELECT id INTO v_uid FROM auth.users WHERE email = 'freedomm@tech4green.co.za' LIMIT 1;
  SELECT id INTO v_emp_id FROM public.employees WHERE lower(surname) LIKE '%mbavala%' AND status = 'active' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    UPDATE public.user_profiles SET is_active = true, role = 'operator', employee_id = v_emp_id, updated_at = now() WHERE auth_user_id = v_uid;
  END IF;
END $$;
