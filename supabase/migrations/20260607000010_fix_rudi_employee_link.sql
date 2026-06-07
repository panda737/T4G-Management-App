-- Re-link all 6 operators to their employee records using surname LIKE matching,
-- which tolerates compound first names and minor spelling differences in migration 009.
DO $$
DECLARE
  v_uid    uuid;
  v_emp_id uuid;
BEGIN
  -- Rudi → Letsoalo (migration 009 had wrong spelling "Lersoalo")
  SELECT id INTO v_uid    FROM auth.users       WHERE email = 'rudi@tech4green.co.za'    LIMIT 1;
  SELECT id INTO v_emp_id FROM public.employees WHERE lower(surname) LIKE '%letsoalo%'   AND status = 'active' LIMIT 1;
  IF v_uid IS NOT NULL AND v_emp_id IS NOT NULL THEN
    UPDATE public.user_profiles SET employee_id = v_emp_id WHERE auth_user_id = v_uid;
  END IF;

  -- Freedom → Mbavala
  SELECT id INTO v_uid    FROM auth.users       WHERE email = 'freedom@tech4green.co.za' LIMIT 1;
  SELECT id INTO v_emp_id FROM public.employees WHERE lower(surname) LIKE '%mbavala%'    AND status = 'active' LIMIT 1;
  IF v_uid IS NOT NULL AND v_emp_id IS NOT NULL THEN
    UPDATE public.user_profiles SET employee_id = v_emp_id WHERE auth_user_id = v_uid;
  END IF;

  -- Billy → Raseala
  SELECT id INTO v_uid    FROM auth.users       WHERE email = 'billy@tech4green.co.za'   LIMIT 1;
  SELECT id INTO v_emp_id FROM public.employees WHERE lower(surname) LIKE '%raseala%'    AND status = 'active' LIMIT 1;
  IF v_uid IS NOT NULL AND v_emp_id IS NOT NULL THEN
    UPDATE public.user_profiles SET employee_id = v_emp_id WHERE auth_user_id = v_uid;
  END IF;

  -- Guilty → Salane
  SELECT id INTO v_uid    FROM auth.users       WHERE email = 'guilty@tech4green.co.za'  LIMIT 1;
  SELECT id INTO v_emp_id FROM public.employees WHERE lower(surname) LIKE '%salane%'     AND status = 'active' LIMIT 1;
  IF v_uid IS NOT NULL AND v_emp_id IS NOT NULL THEN
    UPDATE public.user_profiles SET employee_id = v_emp_id WHERE auth_user_id = v_uid;
  END IF;

  -- Kobetsi → Makgopa
  SELECT id INTO v_uid    FROM auth.users       WHERE email = 'kobetsi@tech4green.co.za' LIMIT 1;
  SELECT id INTO v_emp_id FROM public.employees WHERE lower(surname) LIKE '%makgopa%'    AND status = 'active' LIMIT 1;
  IF v_uid IS NOT NULL AND v_emp_id IS NOT NULL THEN
    UPDATE public.user_profiles SET employee_id = v_emp_id WHERE auth_user_id = v_uid;
  END IF;

  -- Alfred → Macheke
  SELECT id INTO v_uid    FROM auth.users       WHERE email = 'alfred@tech4green.co.za'  LIMIT 1;
  SELECT id INTO v_emp_id FROM public.employees WHERE lower(surname) LIKE '%macheke%'    AND status = 'active' LIMIT 1;
  IF v_uid IS NOT NULL AND v_emp_id IS NOT NULL THEN
    UPDATE public.user_profiles SET employee_id = v_emp_id WHERE auth_user_id = v_uid;
  END IF;
END $$;
