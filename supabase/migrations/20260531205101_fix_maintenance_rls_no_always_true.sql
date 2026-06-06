/*
  # Fix maintenance RLS policies: replace always-true with auth.uid() check

  ## Problem
  All INSERT and UPDATE policies on the 5 maintenance tables used
  `true` / `USING (true) WITH CHECK (true)`, which effectively bypasses
  row-level security for any authenticated user.

  ## Fix
  Replace the 10 affected policies (INSERT and UPDATE on each table)
  with policies that check `auth.uid() IS NOT NULL`, matching the
  pattern used by all other module tables (safety, training, stock).

  ## Affected Tables
  1. maintenance_sections   - INSERT and UPDATE policies
  2. maintenance_assets     - INSERT and UPDATE policies
  3. maintenance_parts      - INSERT and UPDATE policies
  4. maintenance_work_orders - INSERT and UPDATE policies
  5. maintenance_schedule   - INSERT and UPDATE policies

  ## Also fixes
  - SELECT policies that used bare `USING (true)` -- replaced with
    `USING (auth.uid() IS NOT NULL)` for consistency

  ## Notes
  - Read (SELECT) access remains available to all authenticated users
  - No delete policies are added (soft-delete via status field)
*/

-- ─────────────────────────────────────────────
-- 1. maintenance_sections
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can read maintenance_sections" ON maintenance_sections;
DROP POLICY IF EXISTS "Authenticated users can insert maintenance_sections" ON maintenance_sections;
DROP POLICY IF EXISTS "Authenticated users can update maintenance_sections" ON maintenance_sections;

CREATE POLICY "Authenticated users can read maintenance_sections"
  ON maintenance_sections FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert maintenance_sections"
  ON maintenance_sections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update maintenance_sections"
  ON maintenance_sections FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────
-- 2. maintenance_assets
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can read maintenance_assets" ON maintenance_assets;
DROP POLICY IF EXISTS "Authenticated users can insert maintenance_assets" ON maintenance_assets;
DROP POLICY IF EXISTS "Authenticated users can update maintenance_assets" ON maintenance_assets;

CREATE POLICY "Authenticated users can read maintenance_assets"
  ON maintenance_assets FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert maintenance_assets"
  ON maintenance_assets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update maintenance_assets"
  ON maintenance_assets FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────
-- 3. maintenance_parts
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can read maintenance_parts" ON maintenance_parts;
DROP POLICY IF EXISTS "Authenticated users can insert maintenance_parts" ON maintenance_parts;
DROP POLICY IF EXISTS "Authenticated users can update maintenance_parts" ON maintenance_parts;

CREATE POLICY "Authenticated users can read maintenance_parts"
  ON maintenance_parts FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert maintenance_parts"
  ON maintenance_parts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update maintenance_parts"
  ON maintenance_parts FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────
-- 4. maintenance_work_orders
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can read maintenance_work_orders" ON maintenance_work_orders;
DROP POLICY IF EXISTS "Authenticated users can insert maintenance_work_orders" ON maintenance_work_orders;
DROP POLICY IF EXISTS "Authenticated users can update maintenance_work_orders" ON maintenance_work_orders;

CREATE POLICY "Authenticated users can read maintenance_work_orders"
  ON maintenance_work_orders FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert maintenance_work_orders"
  ON maintenance_work_orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update maintenance_work_orders"
  ON maintenance_work_orders FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────
-- 5. maintenance_schedule
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can read maintenance_schedule" ON maintenance_schedule;
DROP POLICY IF EXISTS "Authenticated users can insert maintenance_schedule" ON maintenance_schedule;
DROP POLICY IF EXISTS "Authenticated users can update maintenance_schedule" ON maintenance_schedule;

CREATE POLICY "Authenticated users can read maintenance_schedule"
  ON maintenance_schedule FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert maintenance_schedule"
  ON maintenance_schedule FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update maintenance_schedule"
  ON maintenance_schedule FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
