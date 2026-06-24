/*
  # Add the `receiving_officer` login role

  ## Purpose
  A new single-purpose role for receiving officers. For now they are scoped to the
  **Spillage register only** — they land on /safety/spillages and can report spills.

  Spillage RLS already permits any internal non-viewer (`can_write() AND NOT
  is_customer()`), and the app's `resolveCanWrite` only grants this role the
  'spillage' module, so this migration just needs to allow the new value on
  `user_profiles.role`. Additive; mirrors the `logistics_manager` addition
  (20260621120000). No RLS/policy changes required.

  Apply via _dbrun.cjs (the migration ledger is drifted — not auto-pushed).
*/

ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
    CHECK (role IN (
      'admin', 'management', 'stock_controller', 'production', 'operator',
      'viewer', 'customer', 'logistics_manager', 'receiving_officer'
    ));

NOTIFY pgrst, 'reload schema';
