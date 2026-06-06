/*
  # Fix user_profiles RLS circular dependency

  ## Problem
  The "Admins can read all profiles" policy contains a subquery that reads from
  user_profiles itself. When Postgres evaluates SELECT policies on user_profiles,
  the subquery triggers RLS again on the same table, causing infinite recursion.
  This silently prevents the admin user from reading their own profile, which means
  the UserContext never loads the role, and the admin section stays hidden.

  ## Fix
  - Drop the circular "Admins can read all profiles" SELECT policy.
  - The existing "Users can read own profile" policy (auth.uid() = auth_user_id)
    is sufficient for the UserContext fetch (it only ever reads the logged-in user's profile).
  - For AdminUsers page (which lists all profiles), use a security-definer function
    that bypasses RLS, called via the Edge Function (service_role) — this is already
    the pattern. The AdminUsers page fetches all profiles using the anon client which
    now gets all rows via the "Users can read own profile" policy... actually we need
    admins to list all users.
  - Solution: create a security-definer helper function to check admin status without
    causing recursion, then use it in all the admin write policies.

  ## Changes
  1. Create security-definer function is_admin() that checks user_profiles bypassing RLS
  2. Recreate all policies using is_admin() instead of inline subqueries
  3. Add a policy allowing admins to SELECT all profiles using is_admin()
*/

-- Step 1: Create a security-definer function that checks admin status
-- This runs as the table owner (bypasses RLS) so there is no recursion
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE auth_user_id = auth.uid()
      AND role = 'admin'
      AND is_active = true
  );
$$;

-- Step 2: Drop all existing policies and recreate them using is_admin()
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;

-- Users can always read their own profile (no subquery, no recursion)
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

-- Admins can read ALL profiles (uses is_admin() security definer -- no recursion)
CREATE POLICY "Admins can read all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (is_admin());

-- Admins can insert new profiles
CREATE POLICY "Admins can insert profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Admins can update profiles
CREATE POLICY "Admins can update profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admins can delete profiles (but not their own)
CREATE POLICY "Admins can delete profiles"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (auth_user_id != auth.uid() AND is_admin());
