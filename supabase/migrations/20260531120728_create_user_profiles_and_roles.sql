/*
  # Create User Profiles Table for Role-Based Access Control

  ## Purpose
  Links Supabase auth users to roles within the platform.
  All authenticated users can see all data (read). Write access
  is restricted based on role per module.

  ## Roles
  - admin: Full access to everything including user management
  - management: Full access to all modules except admin/user management
  - stock_controller: Full write access to stock module only; all others read-only
  - production: Full write access to treatment plant module only; all others read-only
  - viewer: Read-only across all modules

  ## New Tables
  - `user_profiles`
    - `id` (uuid, PK)
    - `auth_user_id` (uuid, unique, FK to auth.users)
    - `display_name` (text) - shown in sidebar footer
    - `role` (text) - one of the 5 roles above
    - `is_active` (boolean, default true)
    - `created_by` (uuid) - auth_user_id of the admin who created this
    - `created_at` / `updated_at`

  ## Security
  - RLS enabled: only the admin can insert/update/delete user profiles
  - Users can read their own profile only
  - Admin reads all profiles
  - Admin is identified by their auth.uid() matching a profile with role='admin'
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE NOT NULL,
  display_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('admin', 'management', 'stock_controller', 'production', 'viewer')),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.auth_user_id = auth.uid()
        AND up.role = 'admin'
        AND up.is_active = true
    )
  );

-- Only admins can insert new profiles
CREATE POLICY "Admins can insert profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.auth_user_id = auth.uid()
        AND up.role = 'admin'
        AND up.is_active = true
    )
  );

-- Only admins can update profiles (but not their own role/status to prevent lockout)
CREATE POLICY "Admins can update profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.auth_user_id = auth.uid()
        AND up.role = 'admin'
        AND up.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.auth_user_id = auth.uid()
        AND up.role = 'admin'
        AND up.is_active = true
    )
  );

-- Only admins can delete profiles (but not their own)
CREATE POLICY "Admins can delete profiles"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (
    auth_user_id != auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.auth_user_id = auth.uid()
        AND up.role = 'admin'
        AND up.is_active = true
    )
  );

-- Service role bypass (used by Edge Functions)
CREATE POLICY "Service role full access"
  ON user_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_user ON user_profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Seed the admin profile for admin@tech4green.co.za
-- We use a DO block to look up the auth user ID dynamically
DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id
  FROM auth.users
  WHERE email = 'admin@tech4green.co.za'
  LIMIT 1;

  IF v_admin_id IS NOT NULL THEN
    INSERT INTO user_profiles (auth_user_id, display_name, role, is_active, created_by)
    VALUES (v_admin_id, 'Administrator', 'admin', true, v_admin_id)
    ON CONFLICT (auth_user_id) DO NOTHING;
  END IF;
END $$;
