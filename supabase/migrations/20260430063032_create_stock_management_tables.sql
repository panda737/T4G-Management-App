/*
  # Stock Management App - Initial Schema

  ## Tables Created
  1. stock_categories - Category/section master list
  2. stock_items - Stock item master list with quantities and levels
  3. stock_movements - All stock movement transactions
  4. stock_take_sessions - Stock take session headers
  5. stock_take_line_items - Individual counted lines per session

  ## Security
  - RLS enabled on all tables
  - Public read/write access policies for single-user app (no auth required)
  
  ## Notes
  - Quantities default to 0
  - stock_movements drives quantity changes via trigger
  - Variance = counted_quantity - system_quantity
*/

-- ============================================================
-- TABLE 1: stock_categories
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name text NOT NULL,
  display_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stock_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to stock_categories"
  ON stock_categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert to stock_categories"
  ON stock_categories FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update to stock_categories"
  ON stock_categories FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete to stock_categories"
  ON stock_categories FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============================================================
-- TABLE 2: stock_items
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_code text DEFAULT '',
  stock_item text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  description text DEFAULT '',
  unit_of_measure text DEFAULT 'Each',
  current_quantity numeric DEFAULT 0,
  minimum_stock_level numeric DEFAULT 0,
  maximum_stock_level numeric DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on stock_items"
  ON stock_items FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert on stock_items"
  ON stock_items FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update on stock_items"
  ON stock_items FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete on stock_items"
  ON stock_items FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============================================================
-- TABLE 3: stock_movements
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_date timestamptz DEFAULT now(),
  stock_item_id uuid REFERENCES stock_items(id) ON DELETE SET NULL,
  stock_code text DEFAULT '',
  movement_type text NOT NULL,
  quantity numeric NOT NULL,
  reference_number text DEFAULT '',
  supplier_client_department text DEFAULT '',
  captured_by text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on stock_movements"
  ON stock_movements FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert on stock_movements"
  ON stock_movements FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update on stock_movements"
  ON stock_movements FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete on stock_movements"
  ON stock_movements FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============================================================
-- TABLE 4: stock_take_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_take_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_take_name text NOT NULL,
  stock_take_date timestamptz DEFAULT now(),
  conducted_by text DEFAULT '',
  status text DEFAULT 'Draft',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  approved_by text DEFAULT '',
  approved_at timestamptz
);

ALTER TABLE stock_take_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on stock_take_sessions"
  ON stock_take_sessions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert on stock_take_sessions"
  ON stock_take_sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update on stock_take_sessions"
  ON stock_take_sessions FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete on stock_take_sessions"
  ON stock_take_sessions FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============================================================
-- TABLE 5: stock_take_line_items
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_take_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_take_session_id uuid REFERENCES stock_take_sessions(id) ON DELETE CASCADE,
  stock_item_id uuid REFERENCES stock_items(id) ON DELETE SET NULL,
  stock_code text DEFAULT '',
  stock_item text DEFAULT '',
  category text DEFAULT '',
  description text DEFAULT '',
  system_quantity numeric DEFAULT 0,
  counted_quantity numeric,
  variance numeric GENERATED ALWAYS AS (COALESCE(counted_quantity, 0) - system_quantity) STORED,
  comment text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE stock_take_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select on stock_take_line_items"
  ON stock_take_line_items FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert on stock_take_line_items"
  ON stock_take_line_items FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update on stock_take_line_items"
  ON stock_take_line_items FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete on stock_take_line_items"
  ON stock_take_line_items FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============================================================
-- SEED: stock_categories
-- ============================================================
INSERT INTO stock_categories (category_name, display_order, active) VALUES
  ('Liners', 1, true),
  ('Sharps', 2, true),
  ('External Customer Containers', 3, true),
  ('Anatomical (Specibins)', 4, true),
  ('Pharmaceutical', 5, true),
  ('Box Sets', 6, true),
  ('Other', 7, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: stock_items
-- ============================================================
INSERT INTO stock_items (stock_code, stock_item, category, description, unit_of_measure, current_quantity, minimum_stock_level, maximum_stock_level, active) VALUES
  ('TW025LR', 'Liners', 'Liners', '2,5L Liner Bag (Red)', 'Each', 0, 0, 0, true),
  ('TW030LR', 'Liners', 'Liners', '30L Liner Bag (Red) (60 micron)', 'Each', 0, 0, 0, true),
  ('TW030LC', 'Liners', 'Liners', '30L Liner Bag (Smokey) (30 micron)', 'Each', 0, 0, 0, true),
  ('TW050L', 'Liners', 'Liners', '50L Liner Bag (Red) (60 micron)', 'Each', 0, 0, 0, true),
  ('TW090LR', 'Liners', 'Liners', '90L Liner Bag (Red) (60 micron)', 'Each', 0, 0, 0, true),
  ('TW090LY', 'Liners', 'Liners', '90L Liner Bag (Yellow) (60 micron)', 'Each', 0, 0, 0, true),
  ('TW090LB', 'Liners', 'Liners', '90L Liner Bag (Black/Smokey) (25 micron)', 'Each', 0, 0, 0, true),
  ('TW125L', 'Liners', 'Liners', '125L Liner Bag (Red) (60 micron)', 'Each', 0, 0, 0, true),
  ('TW142L', 'Liners', 'Liners', '142L Liner Bag (Red) (60 micron)', 'Each', 0, 0, 0, true),
  ('TW240L.', 'Liners', 'Liners', '240L Liners (60 micron)', 'Each', 0, 0, 0, true),
  ('TW010BML', 'Liners', 'Liners', 'Bed Mattress Liner (60 micron)', 'Each', 0, 0, 0, true),
  ('TW015S', 'Sharps', 'Sharps', '1,5 L Sharps Container', 'Each', 0, 0, 0, true),
  ('TW076S', 'Sharps', 'Sharps', '7,6L Sharps Container (Pailpac)', 'Each', 0, 0, 0, true),
  ('TW076SL', 'Sharps - Lid Only', 'Sharps', '7,6L Sharps Container Lid Only', 'Each', 0, 0, 0, true),
  ('TW10S', 'Sharps', 'Sharps', '10L Sharps Container', 'Each', 0, 0, 0, true),
  ('TW20S', 'Sharps', 'Sharps', '20L Sharps Container (Pailpac)', 'Each', 0, 0, 0, true),
  ('TW20S', 'Sharps', 'Sharps', '20L Sharps Container (Mediwaste / Dynamic Plastics)', 'Each', 0, 0, 0, true),
  ('TW020SL', 'Sharps - Lid Only', 'Sharps', '20L Sharps Container Lid Only', 'Each', 0, 0, 0, true),
  ('TW25S', 'Sharps', 'Sharps', '25L Sharps Container (Pailpac)', 'Each', 0, 0, 0, true),
  ('TW25SL', 'Sharps', 'Sharps', '25L Sharps Container Lid Only', 'Each', 0, 0, 0, true),
  ('TW76L002', 'Sharps', 'External Customer Containers', '7,6L Sharps Container - Umndeni Waste', 'Each', 0, 0, 0, true),
  ('TW20L002', 'Organic', 'External Customer Containers', '20L Black Container - T4G Organic Matters', 'Each', 0, 0, 0, true),
  ('TW20L003', 'Pharmaceutical', 'External Customer Containers', '20L Green Container - T4G Safeline', 'Each', 0, 0, 0, true),
  ('TW025SP', 'Speci', 'Anatomical (Specibins)', '2,5L Anatomical Container Specibins (Pailpac)', 'Each', 0, 0, 0, true),
  ('', 'Speci - Lid Only', 'Anatomical (Specibins)', '2,5L Anatomical Container Specibin Lid Only', 'Each', 0, 0, 0, true),
  ('TW005SP', 'Speci', 'Anatomical (Specibins)', '5L Anatomical Container Specibin (Mediwaste)', 'Each', 0, 0, 0, true),
  ('', 'Speci - Lid Only', 'Anatomical (Specibins)', '5L Anatomical Container Specibin Lid Only', 'Each', 0, 0, 0, true),
  ('TW20SP', 'Speci', 'Anatomical (Specibins)', '20L Anatomical Container Specibin (Pailpac)', 'Each', 0, 0, 0, true),
  ('', 'Speci - Lid Only', 'Anatomical (Specibins)', '20L Anatomical Container Specibin Lid Only', 'Each', 0, 0, 0, true),
  ('TW20SP', 'Speci', 'Anatomical (Specibins)', '20L Anatomical Container Specibin (Mediwaste)', 'Each', 0, 0, 0, true),
  ('', 'Speci', 'Anatomical (Specibins)', '20L Anatomical Container Specibin Lid Only', 'Each', 0, 0, 0, true),
  ('TW25SP', 'Speci', 'Anatomical (Specibins)', '25L Anatomical Container Specibin (Pailpac)', 'Each', 0, 0, 0, true),
  ('', 'Speci - Lid Only', 'Anatomical (Specibins)', '25L Anatomical Container Specibin Lid Only', 'Each', 0, 0, 0, true),
  ('TW5PH', 'Pharma', 'Pharmaceutical', '5L Pharmaceutical Container (Mediwaste)', 'Each', 0, 0, 0, true),
  ('', 'Pharma - Lid Only', 'Pharmaceutical', '5L Pharmaceutical Container - Lid Only', 'Each', 0, 0, 0, true),
  ('TW20PH', 'Pharma', 'Pharmaceutical', '20L Pharmaceutical Container (Mediwaste)', 'Each', 0, 0, 0, true),
  ('', 'Pharma - Lid Only', 'Pharmaceutical', '20L Pharmaceutical Container - Lid Only', 'Each', 0, 0, 0, true),
  ('TW050B', 'Box Sets', 'Box Sets', '50L Box Set', 'Each', 0, 0, 0, true),
  ('TW050BL', '50L Box - Lid Only', 'Box Sets', '50L Box Set - Lid Only', 'Each', 0, 0, 0, true),
  ('TW142B', 'Box Sets', 'Box Sets', '142L Box Set', 'Each', 0, 0, 0, true),
  ('TW142BL', '142L Box - Lid Only', 'Box Sets', '142L Box Set - Lid Only', 'Each', 0, 0, 0, true),
  ('TWFTB', 'Box Sets', 'Box Sets', 'Fetus Box Set', 'Each', 0, 0, 0, true),
  ('TW01CT', 'Other', 'Other', 'Cable Ties (Packet of 100)', 'Packet', 0, 0, 0, true),
  ('TW01BT', 'Other', 'Other', 'Biohazard Tape (48mm x 50m Roll)', 'Roll', 0, 0, 0, true),
  ('TW02CT', 'Other', 'Other', 'Pharma Cable Tie', 'Each', 0, 0, 0, true),
  ('TW76BR', 'Other', 'Other', 'Brackets 4-8 Litre (Plastics) (Wall Bracket)', 'Each', 0, 0, 0, true),
  ('TW76BS', 'Other', 'Other', 'Stainless Steel Brackets 7.6 (Wall Bracket) (Plastic)', 'Each', 0, 0, 0, true),
  ('TW76BSS', 'Other', 'Other', 'Stainless Steel Brackets 7.6 (Trolley Bracket)', 'Each', 0, 0, 0, true),
  ('TW15BSS', 'Other', 'Other', 'Stainless Steel Brackets 1.5 (Trolley Bracket)', 'Each', 0, 0, 0, true),
  ('TWPB25L', 'Other', 'Other', 'Stainless Steel Pedal Bin 30L', 'Each', 0, 0, 0, true),
  ('TWPBP50L', 'Other', 'Other', 'Red Plastic Pedal Bin 50L', 'Each', 0, 0, 0, true),
  ('TW10BS', 'Other', 'Other', 'Biohazard Sign', 'Each', 0, 0, 0, true),
  ('TW11BS', 'Other', 'Other', 'Biohazard Sticker (100mm x 100mm)', 'Each', 0, 0, 0, true),
  ('TWCTS', 'Other', 'Other', 'Cytotoxic Sticker', 'Each', 0, 0, 0, true),
  ('ST/CGU', 'Other', 'Other', 'Sticker for Ultane', 'Each', 0, 0, 0, true),
  ('ST/CG', 'Other', 'Other', 'Sticker for Clinical Glass', 'Each', 0, 0, 0, true),
  ('SSK/01', 'Other', 'Other', 'Bag Spill Kit PVC Bag Infectious', 'Each', 0, 0, 0, true),
  ('25SP/02', 'Other', 'Other', '25LT Spill Kit', 'Each', 0, 0, 0, true),
  ('240SP/03', 'Other', 'Other', '240LT Spill Kit', 'Each', 0, 0, 0, true),
  ('ANAR/01', 'Other', 'Other', 'Human Tissue Register', 'Each', 0, 0, 0, true),
  ('TROL/01', 'Other', 'Other', 'HCRW 500kg Trolley', 'Each', 0, 0, 0, true),
  ('', 'Other', 'Other', '90L RUC Containers Red', 'Each', 0, 0, 0, true),
  ('', 'Other', 'Other', '60L Long Sharps Container Yellow', 'Each', 0, 0, 0, true),
  ('', 'Other', 'Other', '60L Anatomical Bin Red', 'Each', 0, 0, 0, true);
