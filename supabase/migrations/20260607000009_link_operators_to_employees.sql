-- Explicitly link each operator login to their employee record by email + full name.
-- Overwrites any partial auto-link from the previous migration.
DO $$
DECLARE
  v_uid    uuid;
  v_emp_id uuid;
BEGIN
  -- Rudi → Rudolph Lersoalo
  SELECT id INTO v_uid    FROM auth.users         WHERE email      = 'rudi@tech4green.co.za'                                          LIMIT 1;
  SELECT id INTO v_emp_id FROM public.employees   WHERE lower(first_name) = 'rudolph' AND lower(surname) = 'lersoalo' AND status = 'active' LIMIT 1;
  IF v_uid IS NOT NULL AND v_emp_id IS NOT NULL THEN
    UPDATE public.user_profiles SET employee_id = v_emp_id WHERE auth_user_id = v_uid;
  END IF;

  -- Freedom → Freedom Mbavala
  SELECT id INTO v_uid    FROM auth.users         WHERE email      = 'freedom@tech4green.co.za'                                        LIMIT 1;
  SELECT id INTO v_emp_id FROM public.employees   WHERE lower(first_name) = 'freedom' AND lower(surname) = 'mbavala' AND status = 'active' LIMIT 1;
  IF v_uid IS NOT NULL AND v_emp_id IS NOT NULL THEN
    UPDATE public.user_profiles SET employee_id = v_emp_id WHERE auth_user_id = v_uid;
  END IF;

  -- Billy → Billy Raseala
  SELECT id INTO v_uid    FROM auth.users         WHERE email      = 'billy@tech4green.co.za'                                          LIMIT 1;
  SELECT id INTO v_emp_id FROM public.employees   WHERE lower(first_name) = 'billy'   AND lower(surname) = 'raseala' AND status = 'active' LIMIT 1;
  IF v_uid IS NOT NULL AND v_emp_id IS NOT NULL THEN
    UPDATE public.user_profiles SET employee_id = v_emp_id WHERE auth_user_id = v_uid;
  END IF;

  -- Guilty → Guilty Salane
  SELECT id INTO v_uid    FROM auth.users         WHERE email      = 'guilty@tech4green.co.za'                                         LIMIT 1;
  SELECT id INTO v_emp_id FROM public.employees   WHERE lower(first_name) = 'guilty'  AND lower(surname) = 'salane'  AND status = 'active' LIMIT 1;
  IF v_uid IS NOT NULL AND v_emp_id IS NOT NULL THEN
    UPDATE public.user_profiles SET employee_id = v_emp_id WHERE auth_user_id = v_uid;
  END IF;

  -- Kobetsi → Kobetsi Makgopa
  SELECT id INTO v_uid    FROM auth.users         WHERE email      = 'kobetsi@tech4green.co.za'                                        LIMIT 1;
  SELECT id INTO v_emp_id FROM public.employees   WHERE lower(first_name) = 'kobetsi' AND lower(surname) = 'makgopa' AND status = 'active' LIMIT 1;
  IF v_uid IS NOT NULL AND v_emp_id IS NOT NULL THEN
    UPDATE public.user_profiles SET employee_id = v_emp_id WHERE auth_user_id = v_uid;
  END IF;

  -- Alfred → Alfred Macheke
  SELECT id INTO v_uid    FROM auth.users         WHERE email      = 'alfred@tech4green.co.za'                                         LIMIT 1;
  SELECT id INTO v_emp_id FROM public.employees   WHERE lower(first_name) = 'alfred'  AND lower(surname) = 'macheke' AND status = 'active' LIMIT 1;
  IF v_uid IS NOT NULL AND v_emp_id IS NOT NULL THEN
    UPDATE public.user_profiles SET employee_id = v_emp_id WHERE auth_user_id = v_uid;
  END IF;
END $$;
