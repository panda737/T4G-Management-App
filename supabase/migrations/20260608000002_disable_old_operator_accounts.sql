-- Disable the old operator login accounts (short usernames with suffix).
-- The operators now use the new accounts without the suffix (e.g. rudi@ instead of rudim@).
UPDATE public.user_profiles
SET is_active = false
WHERE auth_user_id IN (
  SELECT id FROM auth.users
  WHERE email IN (
    'kobetsim@tech4green.co.za',
    'billyr@tech4green.co.za',
    'rudim@tech4green.co.za',
    'guiltys@tech4green.co.za',
    'alfredm@tech4green.co.za',
    'freedomm@tech4green.co.za'
  )
);
