/*
  # Replace maintenance schema with equipment / parts / maintenance_history

  ## Summary
  Drops the previous 5-table maintenance schema and replaces it with
  a simpler 3-table schema as specified:

  1. `equipment`             – plant machinery / assets
  2. `parts`                 – spare parts linked to a piece of equipment
  3. `maintenance_history`   – service records linked to equipment

  The old tables (maintenance_sections, maintenance_assets, maintenance_parts,
  maintenance_work_orders, maintenance_schedule) are dropped.
  Their sequences and policies are dropped first to avoid conflicts.

  ## New Tables

  ### equipment
  - id, name, category, manufacturer, model, serial_number,
    location, status (Operational/Under Maintenance/Faulty/Decommissioned),
    notes, created_at, updated_at

  ### parts
  - id, equipment_id (FK → equipment), name, part_number, supplier,
    qty_on_hand, qty_required, unit_cost, notes, created_at, updated_at

  ### maintenance_history
  - id, equipment_id (FK → equipment), service_date, type
    (Scheduled/Corrective/Preventive/Emergency), technician,
    description, next_service_date, created_at

  ## Security
  - RLS enabled on all 3 tables
  - Authenticated users: SELECT, INSERT, UPDATE (checked with auth.uid() IS NOT NULL)
  - No delete via RLS (soft-decommission equipment via status)

  ## Notes
  - update_updated_at() trigger function is created idempotently
  - Old maintenance_* tables are dropped in dependency order
*/

-- ─── Drop old tables (dependency order: schedules/work orders first, then assets/parts/sections) ───
DROP TABLE IF EXISTS maintenance_schedule        CASCADE;
DROP TABLE IF EXISTS maintenance_work_orders     CASCADE;
DROP TABLE IF EXISTS maintenance_parts           CASCADE;
DROP TABLE IF EXISTS maintenance_assets          CASCADE;
DROP TABLE IF EXISTS maintenance_sections        CASCADE;

-- Drop old sequences
DROP SEQUENCE IF EXISTS maintenance_asset_seq CASCADE;
DROP SEQUENCE IF EXISTS maintenance_part_seq  CASCADE;
DROP SEQUENCE IF EXISTS maintenance_wo_seq    CASCADE;

-- ─── 1. equipment ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipment (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text    NOT NULL,
  category      text,
  manufacturer  text,
  model         text,
  serial_number text,
  location      text,
  status        text    NOT NULL DEFAULT 'Operational'
                  CHECK (status IN ('Operational','Under Maintenance','Faulty','Decommissioned')),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read equipment"
  ON equipment FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert equipment"
  ON equipment FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update equipment"
  ON equipment FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── 2. parts ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parts (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id  uuid    NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  name          text    NOT NULL,
  part_number   text,
  supplier      text,
  qty_on_hand   integer NOT NULL DEFAULT 0,
  qty_required  integer NOT NULL DEFAULT 1,
  unit_cost     numeric(12,2),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read parts"
  ON parts FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert parts"
  ON parts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update parts"
  ON parts FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── 3. maintenance_history ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maintenance_history (
  id                uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id      uuid  NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  service_date      date  NOT NULL,
  type              text  NOT NULL DEFAULT 'Scheduled'
                      CHECK (type IN ('Scheduled','Corrective','Preventive','Emergency')),
  technician        text,
  description       text  NOT NULL,
  next_service_date date,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE maintenance_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read maintenance_history"
  ON maintenance_history FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert maintenance_history"
  ON maintenance_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update maintenance_history"
  ON maintenance_history FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS parts_equipment_id_idx           ON parts(equipment_id);
CREATE INDEX IF NOT EXISTS maintenance_equipment_id_idx     ON maintenance_history(equipment_id);
CREATE INDEX IF NOT EXISTS maintenance_service_date_idx     ON maintenance_history(service_date DESC);

-- ─── Auto-update updated_at trigger ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER equipment_updated_at
  BEFORE UPDATE ON equipment
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

CREATE OR REPLACE TRIGGER parts_updated_at
  BEFORE UPDATE ON parts
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
