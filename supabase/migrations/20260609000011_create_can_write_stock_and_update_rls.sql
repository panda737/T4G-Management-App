/*
  # Stock module: can_write_stock() helper + tighten RLS

  ## Problem
  The existing can_write() function allows any non-viewer, active user to write
  to ALL application tables. Roles such as 'operator' and 'production' should
  have no access to stock data — their domain is the Treatment Plant module.
  Only 'admin', 'management', and 'stock_controller' should be able to write
  stock records.

  ## Fix
  1. Create can_write_stock() — a stricter version of can_write() scoped to the
     stock module.
  2. Replace the existing "Non-viewer can ..." write policies on all five stock
     tables with "Stock writer can ..." policies that call can_write_stock().
  3. SELECT (read) policies are unchanged — all authenticated users can read.

  ## Tables affected
  - stock_categories
  - stock_items
  - stock_movements
  - stock_take_sessions
  - stock_take_line_items
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper function
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.can_write_stock()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY INVOKER
  SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'management', 'stock_controller')
      AND is_active = true
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_write_stock() FROM anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- stock_categories
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Non-viewer can insert stock_categories" ON public.stock_categories;
DROP POLICY IF EXISTS "Non-viewer can update stock_categories" ON public.stock_categories;
DROP POLICY IF EXISTS "Non-viewer can delete stock_categories" ON public.stock_categories;

CREATE POLICY "Stock writer can insert stock_categories"
  ON public.stock_categories FOR INSERT TO authenticated
  WITH CHECK (public.can_write_stock());

CREATE POLICY "Stock writer can update stock_categories"
  ON public.stock_categories FOR UPDATE TO authenticated
  USING (public.can_write_stock()) WITH CHECK (public.can_write_stock());

CREATE POLICY "Stock writer can delete stock_categories"
  ON public.stock_categories FOR DELETE TO authenticated
  USING (public.can_write_stock());

-- ─────────────────────────────────────────────────────────────────────────────
-- stock_items
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Non-viewer can insert stock_items" ON public.stock_items;
DROP POLICY IF EXISTS "Non-viewer can update stock_items" ON public.stock_items;
DROP POLICY IF EXISTS "Non-viewer can delete stock_items" ON public.stock_items;

CREATE POLICY "Stock writer can insert stock_items"
  ON public.stock_items FOR INSERT TO authenticated
  WITH CHECK (public.can_write_stock());

CREATE POLICY "Stock writer can update stock_items"
  ON public.stock_items FOR UPDATE TO authenticated
  USING (public.can_write_stock()) WITH CHECK (public.can_write_stock());

CREATE POLICY "Stock writer can delete stock_items"
  ON public.stock_items FOR DELETE TO authenticated
  USING (public.can_write_stock());

-- ─────────────────────────────────────────────────────────────────────────────
-- stock_movements
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Non-viewer can insert stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Non-viewer can update stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Non-viewer can delete stock_movements" ON public.stock_movements;

CREATE POLICY "Stock writer can insert stock_movements"
  ON public.stock_movements FOR INSERT TO authenticated
  WITH CHECK (public.can_write_stock());

CREATE POLICY "Stock writer can update stock_movements"
  ON public.stock_movements FOR UPDATE TO authenticated
  USING (public.can_write_stock()) WITH CHECK (public.can_write_stock());

CREATE POLICY "Stock writer can delete stock_movements"
  ON public.stock_movements FOR DELETE TO authenticated
  USING (public.can_write_stock());

-- ─────────────────────────────────────────────────────────────────────────────
-- stock_take_sessions
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Non-viewer can insert stock_take_sessions" ON public.stock_take_sessions;
DROP POLICY IF EXISTS "Non-viewer can update stock_take_sessions" ON public.stock_take_sessions;
DROP POLICY IF EXISTS "Non-viewer can delete stock_take_sessions" ON public.stock_take_sessions;

CREATE POLICY "Stock writer can insert stock_take_sessions"
  ON public.stock_take_sessions FOR INSERT TO authenticated
  WITH CHECK (public.can_write_stock());

CREATE POLICY "Stock writer can update stock_take_sessions"
  ON public.stock_take_sessions FOR UPDATE TO authenticated
  USING (public.can_write_stock()) WITH CHECK (public.can_write_stock());

CREATE POLICY "Stock writer can delete stock_take_sessions"
  ON public.stock_take_sessions FOR DELETE TO authenticated
  USING (public.can_write_stock());

-- ─────────────────────────────────────────────────────────────────────────────
-- stock_take_line_items
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Non-viewer can insert stock_take_line_items" ON public.stock_take_line_items;
DROP POLICY IF EXISTS "Non-viewer can update stock_take_line_items" ON public.stock_take_line_items;
DROP POLICY IF EXISTS "Non-viewer can delete stock_take_line_items" ON public.stock_take_line_items;

CREATE POLICY "Stock writer can insert stock_take_line_items"
  ON public.stock_take_line_items FOR INSERT TO authenticated
  WITH CHECK (public.can_write_stock());

CREATE POLICY "Stock writer can update stock_take_line_items"
  ON public.stock_take_line_items FOR UPDATE TO authenticated
  USING (public.can_write_stock()) WITH CHECK (public.can_write_stock());

CREATE POLICY "Stock writer can delete stock_take_line_items"
  ON public.stock_take_line_items FOR DELETE TO authenticated
  USING (public.can_write_stock());
