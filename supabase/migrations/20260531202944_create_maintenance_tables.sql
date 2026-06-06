/*
  # Create Maintenance Module Tables

  ## Summary
  Creates the full maintenance module schema with 5 tables supporting
  sections, assets, spare parts, work orders, and preventive schedules.

  ## New Tables

  ### 1. maintenance_sections
  Physical zones/sections of the plant (e.g. "Sterilizing Tank", "Shredder Area").
  - id, name, description, location_notes, status, created_at, updated_at

  ### 2. maintenance_assets
  Individual pieces of equipment/machinery linked to a section.
  - id, asset_code (AST-001), name, section_id (FK), category, serial_number,
    model, manufacturer, install_date, notes, status, created_at, updated_at

  ### 3. maintenance_parts
  Spare parts catalogue, optionally linked to a section and/or specific asset.
  - id, part_code (PRT-001), part_name, description, section_id (FK, nullable),
    asset_id (FK, nullable), unit_of_measure, quantity_on_hand, minimum_stock_level,
    notes, status, created_at, updated_at

  ### 4. maintenance_work_orders
  Maintenance jobs (preventive, reactive, emergency).
  - id, order_number (WO-001), title, description, section_id (FK, nullable),
    asset_id (FK, nullable), type, priority, assigned_to_id (FK employees),
    reported_by_id (FK employees), reported_date, due_date, completed_date,
    status, notes, created_at, updated_at

  ### 5. maintenance_schedule
  Recurring preventive maintenance tasks.
  - id, title, section_id (FK, nullable), asset_id (FK, nullable), frequency,
    last_completed_date, next_due_date, assigned_to_id (FK employees),
    description, status, created_at, updated_at

  ## Security
  - RLS enabled on all 5 tables
  - Authenticated users can read all records
  - Authenticated users can insert, update records
  - No delete allowed via RLS (soft-delete via status field)

  ## Notes
  - asset_code uses a sequence-based trigger for auto-numbering AST-001..999
  - part_code uses a sequence-based trigger for PRT-001..999
  - order_number uses a sequence-based trigger for WO-001..9999
  - All FK references use ON DELETE SET NULL to avoid cascading deletes
*/

-- ─────────────────────────────────────────────
-- 1. maintenance_sections
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maintenance_sections (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  description  text NOT NULL DEFAULT '',
  location_notes text NOT NULL DEFAULT '',
  status       text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive')),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE maintenance_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read maintenance_sections"
  ON maintenance_sections FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert maintenance_sections"
  ON maintenance_sections FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update maintenance_sections"
  ON maintenance_sections FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────
-- 2. maintenance_assets
-- ─────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS maintenance_asset_seq START 1;

CREATE TABLE IF NOT EXISTS maintenance_assets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code      text UNIQUE NOT NULL DEFAULT 'AST-' || lpad(nextval('maintenance_asset_seq')::text, 3, '0'),
  name            text NOT NULL,
  section_id      uuid REFERENCES maintenance_sections(id) ON DELETE SET NULL,
  category        text NOT NULL DEFAULT 'Mechanical'
                    CHECK (category IN ('Mechanical','Electrical','Hydraulic','Pneumatic','Structural','Other')),
  serial_number   text NOT NULL DEFAULT '',
  model           text NOT NULL DEFAULT '',
  manufacturer    text NOT NULL DEFAULT '',
  install_date    date,
  notes           text NOT NULL DEFAULT '',
  status          text NOT NULL DEFAULT 'Active'
                    CHECK (status IN ('Active','Inactive','Decommissioned')),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE maintenance_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read maintenance_assets"
  ON maintenance_assets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert maintenance_assets"
  ON maintenance_assets FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update maintenance_assets"
  ON maintenance_assets FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────
-- 3. maintenance_parts
-- ─────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS maintenance_part_seq START 1;

CREATE TABLE IF NOT EXISTS maintenance_parts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_code           text UNIQUE NOT NULL DEFAULT 'PRT-' || lpad(nextval('maintenance_part_seq')::text, 3, '0'),
  part_name           text NOT NULL,
  description         text NOT NULL DEFAULT '',
  section_id          uuid REFERENCES maintenance_sections(id) ON DELETE SET NULL,
  asset_id            uuid REFERENCES maintenance_assets(id) ON DELETE SET NULL,
  unit_of_measure     text NOT NULL DEFAULT 'Each',
  quantity_on_hand    numeric(10,2) NOT NULL DEFAULT 0,
  minimum_stock_level numeric(10,2) NOT NULL DEFAULT 0,
  notes               text NOT NULL DEFAULT '',
  status              text NOT NULL DEFAULT 'Active'
                        CHECK (status IN ('Active','Inactive')),
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE maintenance_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read maintenance_parts"
  ON maintenance_parts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert maintenance_parts"
  ON maintenance_parts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update maintenance_parts"
  ON maintenance_parts FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────
-- 4. maintenance_work_orders
-- ─────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS maintenance_wo_seq START 1;

CREATE TABLE IF NOT EXISTS maintenance_work_orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number     text UNIQUE NOT NULL DEFAULT 'WO-' || lpad(nextval('maintenance_wo_seq')::text, 4, '0'),
  title            text NOT NULL,
  description      text NOT NULL DEFAULT '',
  section_id       uuid REFERENCES maintenance_sections(id) ON DELETE SET NULL,
  asset_id         uuid REFERENCES maintenance_assets(id) ON DELETE SET NULL,
  type             text NOT NULL DEFAULT 'Reactive'
                     CHECK (type IN ('Preventive','Reactive','Emergency','Inspection')),
  priority         text NOT NULL DEFAULT 'Medium'
                     CHECK (priority IN ('Low','Medium','High','Critical')),
  assigned_to_id   uuid REFERENCES employees(id) ON DELETE SET NULL,
  reported_by_id   uuid REFERENCES employees(id) ON DELETE SET NULL,
  reported_date    date NOT NULL DEFAULT CURRENT_DATE,
  due_date         date,
  completed_date   date,
  status           text NOT NULL DEFAULT 'Open'
                     CHECK (status IN ('Open','In Progress','Completed','Cancelled')),
  notes            text NOT NULL DEFAULT '',
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE maintenance_work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read maintenance_work_orders"
  ON maintenance_work_orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert maintenance_work_orders"
  ON maintenance_work_orders FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update maintenance_work_orders"
  ON maintenance_work_orders FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────
-- 5. maintenance_schedule
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maintenance_schedule (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                text NOT NULL,
  description          text NOT NULL DEFAULT '',
  section_id           uuid REFERENCES maintenance_sections(id) ON DELETE SET NULL,
  asset_id             uuid REFERENCES maintenance_assets(id) ON DELETE SET NULL,
  frequency            text NOT NULL DEFAULT 'Monthly'
                         CHECK (frequency IN ('Daily','Weekly','Monthly','Quarterly','Annually')),
  last_completed_date  date,
  next_due_date        date,
  assigned_to_id       uuid REFERENCES employees(id) ON DELETE SET NULL,
  status               text NOT NULL DEFAULT 'Active'
                         CHECK (status IN ('Active','Inactive')),
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

ALTER TABLE maintenance_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read maintenance_schedule"
  ON maintenance_schedule FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert maintenance_schedule"
  ON maintenance_schedule FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update maintenance_schedule"
  ON maintenance_schedule FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────
-- Indexes for common query patterns
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_maintenance_assets_section_id ON maintenance_assets(section_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_parts_section_id ON maintenance_parts(section_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_parts_asset_id ON maintenance_parts(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_work_orders_section_id ON maintenance_work_orders(section_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_work_orders_status ON maintenance_work_orders(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_work_orders_due_date ON maintenance_work_orders(due_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedule_next_due_date ON maintenance_schedule(next_due_date);
