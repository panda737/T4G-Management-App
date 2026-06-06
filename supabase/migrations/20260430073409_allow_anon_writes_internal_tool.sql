/*
  # Allow anon role to write stock data

  This is an internal stock management tool with no public-facing auth.
  Extends INSERT, UPDATE, DELETE policies on stock_movements and stock_items
  to also allow the anon role (unauthenticated app users).
*/

-- stock_movements: extend insert to anon
DROP POLICY IF EXISTS "Authenticated users can insert stock_movements" ON stock_movements;
CREATE POLICY "Authenticated users can insert stock_movements"
  ON stock_movements FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- stock_movements: extend update to anon
DROP POLICY IF EXISTS "Authenticated users can update stock_movements" ON stock_movements;
CREATE POLICY "Authenticated users can update stock_movements"
  ON stock_movements FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- stock_movements: extend delete to anon
DROP POLICY IF EXISTS "Authenticated users can delete stock_movements" ON stock_movements;
CREATE POLICY "Authenticated users can delete stock_movements"
  ON stock_movements FOR DELETE
  TO anon, authenticated
  USING (true);

-- stock_items: extend insert to anon
DROP POLICY IF EXISTS "Authenticated users can insert stock_items" ON stock_items;
CREATE POLICY "Authenticated users can insert stock_items"
  ON stock_items FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- stock_items: extend update to anon
DROP POLICY IF EXISTS "Authenticated users can update stock_items" ON stock_items;
CREATE POLICY "Authenticated users can update stock_items"
  ON stock_items FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- stock_items: extend delete to anon
DROP POLICY IF EXISTS "Authenticated users can delete stock_items" ON stock_items;
CREATE POLICY "Authenticated users can delete stock_items"
  ON stock_items FOR DELETE
  TO anon, authenticated
  USING (true);
