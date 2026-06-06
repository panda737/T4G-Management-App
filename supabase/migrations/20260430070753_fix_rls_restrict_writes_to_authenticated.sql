/*
  # Fix RLS Policies - Restrict Write Operations to Authenticated Users

  ## Problem
  All INSERT, UPDATE, and DELETE policies currently allow both `anon` and `authenticated` roles
  with USING/WITH CHECK clauses set to `true`, which grants unrestricted access to anonymous users.

  ## Changes
  - DROP all existing write (INSERT, UPDATE, DELETE) policies on all 5 tables
  - Recreate them restricted to `authenticated` role only
  - SELECT policies remain open to both `anon` and `authenticated` (read-only public access is fine)

  ## Tables Affected
  - stock_categories
  - stock_items
  - stock_movements
  - stock_take_sessions
  - stock_take_line_items

  ## Security Notes
  - Anonymous users can still read all data (required for the app to load without login)
  - Only authenticated sessions can insert, update, or delete records
  - This removes the "always true" vulnerability while keeping the app functional
*/

-- ============================================================
-- stock_categories
-- ============================================================
DROP POLICY IF EXISTS "Allow insert to stock_categories" ON stock_categories;
DROP POLICY IF EXISTS "Allow update to stock_categories" ON stock_categories;
DROP POLICY IF EXISTS "Allow delete to stock_categories" ON stock_categories;

CREATE POLICY "Authenticated users can insert stock_categories"
  ON stock_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update stock_categories"
  ON stock_categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete stock_categories"
  ON stock_categories FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- stock_items
-- ============================================================
DROP POLICY IF EXISTS "Allow insert on stock_items" ON stock_items;
DROP POLICY IF EXISTS "Allow update on stock_items" ON stock_items;
DROP POLICY IF EXISTS "Allow delete on stock_items" ON stock_items;

CREATE POLICY "Authenticated users can insert stock_items"
  ON stock_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update stock_items"
  ON stock_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete stock_items"
  ON stock_items FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- stock_movements
-- ============================================================
DROP POLICY IF EXISTS "Allow insert on stock_movements" ON stock_movements;
DROP POLICY IF EXISTS "Allow update on stock_movements" ON stock_movements;
DROP POLICY IF EXISTS "Allow delete on stock_movements" ON stock_movements;

CREATE POLICY "Authenticated users can insert stock_movements"
  ON stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update stock_movements"
  ON stock_movements FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete stock_movements"
  ON stock_movements FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- stock_take_sessions
-- ============================================================
DROP POLICY IF EXISTS "Allow insert on stock_take_sessions" ON stock_take_sessions;
DROP POLICY IF EXISTS "Allow update on stock_take_sessions" ON stock_take_sessions;
DROP POLICY IF EXISTS "Allow delete on stock_take_sessions" ON stock_take_sessions;

CREATE POLICY "Authenticated users can insert stock_take_sessions"
  ON stock_take_sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update stock_take_sessions"
  ON stock_take_sessions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete stock_take_sessions"
  ON stock_take_sessions FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- stock_take_line_items
-- ============================================================
DROP POLICY IF EXISTS "Allow insert on stock_take_line_items" ON stock_take_line_items;
DROP POLICY IF EXISTS "Allow update on stock_take_line_items" ON stock_take_line_items;
DROP POLICY IF EXISTS "Allow delete on stock_take_line_items" ON stock_take_line_items;

CREATE POLICY "Authenticated users can insert stock_take_line_items"
  ON stock_take_line_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update stock_take_line_items"
  ON stock_take_line_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete stock_take_line_items"
  ON stock_take_line_items FOR DELETE
  TO authenticated
  USING (true);
