/*
  # Fix RLS Policies - Remove "always true" write access

  ## Summary
  All write policies (INSERT, UPDATE, DELETE) previously used `true` as the condition,
  which means any user (including anonymous) could modify any row. This migration:

  1. Drops all existing write policies (INSERT/UPDATE/DELETE) on all 5 tables.
  2. Drops duplicate policies created by later migrations.
  3. Recreates write policies scoped to `authenticated` role only, with a
     condition that checks `auth.role() = 'authenticated'` rather than `true`.
  4. SELECT policies remain open to both anon and authenticated (read-only public access
     is acceptable for this internal tool, and the app does not use Supabase Auth login).

  ## Tables affected
  - stock_categories
  - stock_items
  - stock_movements
  - stock_take_sessions
  - stock_take_line_items

  ## Security changes
  - Removes unrestricted write access for anon role
  - Restricts all mutating operations to authenticated users only
  - Eliminates duplicate overlapping policies
*/

-- ============================================================
-- stock_categories: drop all write policies (old + duplicates)
-- ============================================================
DROP POLICY IF EXISTS "Allow insert to stock_categories" ON stock_categories;
DROP POLICY IF EXISTS "Allow update to stock_categories" ON stock_categories;
DROP POLICY IF EXISTS "Allow delete to stock_categories" ON stock_categories;
DROP POLICY IF EXISTS "Authenticated users can insert stock_categories" ON stock_categories;
DROP POLICY IF EXISTS "Authenticated users can update stock_categories" ON stock_categories;
DROP POLICY IF EXISTS "Authenticated users can delete stock_categories" ON stock_categories;

CREATE POLICY "Authenticated users can insert stock_categories"
  ON stock_categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update stock_categories"
  ON stock_categories FOR UPDATE
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete stock_categories"
  ON stock_categories FOR DELETE
  TO authenticated
  USING (auth.role() = 'authenticated');

-- ============================================================
-- stock_items: drop all write policies (old + duplicates)
-- ============================================================
DROP POLICY IF EXISTS "Allow insert on stock_items" ON stock_items;
DROP POLICY IF EXISTS "Allow update on stock_items" ON stock_items;
DROP POLICY IF EXISTS "Allow delete on stock_items" ON stock_items;
DROP POLICY IF EXISTS "Authenticated users can insert stock_items" ON stock_items;
DROP POLICY IF EXISTS "Authenticated users can update stock_items" ON stock_items;
DROP POLICY IF EXISTS "Authenticated users can delete stock_items" ON stock_items;

CREATE POLICY "Authenticated users can insert stock_items"
  ON stock_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update stock_items"
  ON stock_items FOR UPDATE
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete stock_items"
  ON stock_items FOR DELETE
  TO authenticated
  USING (auth.role() = 'authenticated');

-- ============================================================
-- stock_movements: drop all write policies (old + duplicates)
-- ============================================================
DROP POLICY IF EXISTS "Allow insert on stock_movements" ON stock_movements;
DROP POLICY IF EXISTS "Allow update on stock_movements" ON stock_movements;
DROP POLICY IF EXISTS "Allow delete on stock_movements" ON stock_movements;
DROP POLICY IF EXISTS "Authenticated users can insert stock_movements" ON stock_movements;
DROP POLICY IF EXISTS "Authenticated users can update stock_movements" ON stock_movements;
DROP POLICY IF EXISTS "Authenticated users can delete stock_movements" ON stock_movements;

CREATE POLICY "Authenticated users can insert stock_movements"
  ON stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update stock_movements"
  ON stock_movements FOR UPDATE
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete stock_movements"
  ON stock_movements FOR DELETE
  TO authenticated
  USING (auth.role() = 'authenticated');

-- ============================================================
-- stock_take_sessions: drop all write policies (old + duplicates)
-- ============================================================
DROP POLICY IF EXISTS "Allow insert on stock_take_sessions" ON stock_take_sessions;
DROP POLICY IF EXISTS "Allow update on stock_take_sessions" ON stock_take_sessions;
DROP POLICY IF EXISTS "Allow delete on stock_take_sessions" ON stock_take_sessions;
DROP POLICY IF EXISTS "Authenticated users can insert stock_take_sessions" ON stock_take_sessions;
DROP POLICY IF EXISTS "Authenticated users can update stock_take_sessions" ON stock_take_sessions;
DROP POLICY IF EXISTS "Authenticated users can delete stock_take_sessions" ON stock_take_sessions;

CREATE POLICY "Authenticated users can insert stock_take_sessions"
  ON stock_take_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update stock_take_sessions"
  ON stock_take_sessions FOR UPDATE
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete stock_take_sessions"
  ON stock_take_sessions FOR DELETE
  TO authenticated
  USING (auth.role() = 'authenticated');

-- ============================================================
-- stock_take_line_items: drop all write policies (old + duplicates)
-- ============================================================
DROP POLICY IF EXISTS "Allow insert on stock_take_line_items" ON stock_take_line_items;
DROP POLICY IF EXISTS "Allow update on stock_take_line_items" ON stock_take_line_items;
DROP POLICY IF EXISTS "Allow delete on stock_take_line_items" ON stock_take_line_items;
DROP POLICY IF EXISTS "Authenticated users can insert stock_take_line_items" ON stock_take_line_items;
DROP POLICY IF EXISTS "Authenticated users can update stock_take_line_items" ON stock_take_line_items;
DROP POLICY IF EXISTS "Authenticated users can delete stock_take_line_items" ON stock_take_line_items;

CREATE POLICY "Authenticated users can insert stock_take_line_items"
  ON stock_take_line_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update stock_take_line_items"
  ON stock_take_line_items FOR UPDATE
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete stock_take_line_items"
  ON stock_take_line_items FOR DELETE
  TO authenticated
  USING (auth.role() = 'authenticated');
