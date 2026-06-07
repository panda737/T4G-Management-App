-- Set role = 'operator' for the 6 shift operator accounts.
-- Uses a DO block so missing emails are silently skipped.
DO $$
DECLARE
  v_emails text[] := ARRAY[
    'freedom@tech4green.co.za',
    'guilty@tech4green.co.za',
    'alfred@tech4green.co.za',
    'rudi@tech4green.co.za',
    'billy@tech4green.co.za',
    'kobetsi@tech4green.co.za'
  ];
  v_email text;
  v_uid   uuid;
BEGIN
  FOREACH v_email IN ARRAY v_emails LOOP
    SELECT id INTO v_uid FROM auth.users WHERE email = v_email LIMIT 1;
    IF v_uid IS NOT NULL THEN
      UPDATE public.user_profiles
        SET role = 'operator', updated_at = now()
        WHERE auth_user_id = v_uid;
    END IF;
  END LOOP;
END $$;
