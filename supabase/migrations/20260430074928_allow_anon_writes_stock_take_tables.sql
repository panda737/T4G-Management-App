/*
  # Allow anon role full access to stock_take_sessions and stock_take_line_items

  Internal tool — no auth. Extends all write policies to anon role.
*/

-- stock_take_sessions
ALTER TABLE stock_take_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select on stock_take_sessions" ON stock_take_sessions;
CREATE POLICY "Allow select on stock_take_sessions"
  ON stock_take_sessions FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow insert on stock_take_sessions" ON stock_take_sessions;
CREATE POLICY "Allow insert on stock_take_sessions"
  ON stock_take_sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update on stock_take_sessions" ON stock_take_sessions;
CREATE POLICY "Allow update on stock_take_sessions"
  ON stock_take_sessions FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete on stock_take_sessions" ON stock_take_sessions;
CREATE POLICY "Allow delete on stock_take_sessions"
  ON stock_take_sessions FOR DELETE
  TO anon, authenticated
  USING (true);

-- stock_take_line_items
ALTER TABLE stock_take_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select on stock_take_line_items" ON stock_take_line_items;
CREATE POLICY "Allow select on stock_take_line_items"
  ON stock_take_line_items FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow insert on stock_take_line_items" ON stock_take_line_items;
CREATE POLICY "Allow insert on stock_take_line_items"
  ON stock_take_line_items FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update on stock_take_line_items" ON stock_take_line_items;
CREATE POLICY "Allow update on stock_take_line_items"
  ON stock_take_line_items FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete on stock_take_line_items" ON stock_take_line_items;
CREATE POLICY "Allow delete on stock_take_line_items"
  ON stock_take_line_items FOR DELETE
  TO anon, authenticated
  USING (true);
