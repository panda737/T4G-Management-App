/*
  # Employee Management Module: hs_role column + junction tables

  ## Summary
  Extends employee management with H&S-specific roles and proper many-to-many
  junction tables so employee profiles can display a full unified activity history
  across all linked modules.

  ## Changes

  ### 1. New column on employees table
  - `hs_role` (text, default 'employee'): H&S-specific role with values
    'employee', 'supervisor', or 'hs_staff'. Separate from the existing
    `position` field so filtering for H&S contexts works correctly.

  ### 2. New junction table: toolbox_attendees
  - Links employees to toolbox talks they attended (many-to-many)
  - Replaces the denormalized `attendees` text column for structured lookups
  - Unique constraint prevents duplicate attendance records

  ### 3. New junction table: training_session_attendees
  - Links employees to training schedule sessions they attended (many-to-many)
  - Enables bidirectional profile queries for training attendance

  ### 4. New junction table: inspection_inspectors
  - Links employees to inspections they conducted (many-to-many)
  - Supports cases where multiple inspectors participate in one inspection

  ## Security
  - RLS enabled on all new tables
  - Authenticated users can read all records
  - Only authenticated users can insert/update/delete their own records or any
    records (for admin use case — matched to existing app pattern)
*/

-- 1. Add hs_role column to employees table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'hs_role'
  ) THEN
    ALTER TABLE employees ADD COLUMN hs_role text NOT NULL DEFAULT 'employee'
      CHECK (hs_role IN ('employee', 'supervisor', 'hs_staff'));
  END IF;
END $$;

-- Backfill hs_role based on existing position values
UPDATE employees
SET hs_role = CASE
  WHEN position IN ('Supervisor') THEN 'supervisor'
  WHEN position IN ('Health & Safety Officer') THEN 'hs_staff'
  ELSE 'employee'
END
WHERE hs_role = 'employee';

-- Index for role-based filtering
CREATE INDEX IF NOT EXISTS idx_employees_hs_role ON employees(hs_role);

-- 2. Junction table: toolbox_attendees
CREATE TABLE IF NOT EXISTS toolbox_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  toolbox_id uuid NOT NULL REFERENCES safety_toolbox_talks(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(toolbox_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_toolbox_attendees_toolbox ON toolbox_attendees(toolbox_id);
CREATE INDEX IF NOT EXISTS idx_toolbox_attendees_employee ON toolbox_attendees(employee_id);

ALTER TABLE toolbox_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read toolbox attendees"
  ON toolbox_attendees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert toolbox attendees"
  ON toolbox_attendees FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete toolbox attendees"
  ON toolbox_attendees FOR DELETE
  TO authenticated
  USING (true);

-- 3. Junction table: training_session_attendees
CREATE TABLE IF NOT EXISTS training_session_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES training_schedule(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(session_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_training_session_attendees_session ON training_session_attendees(session_id);
CREATE INDEX IF NOT EXISTS idx_training_session_attendees_employee ON training_session_attendees(employee_id);

ALTER TABLE training_session_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read training session attendees"
  ON training_session_attendees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert training session attendees"
  ON training_session_attendees FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete training session attendees"
  ON training_session_attendees FOR DELETE
  TO authenticated
  USING (true);

-- 4. Junction table: inspection_inspectors
CREATE TABLE IF NOT EXISTS inspection_inspectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES safety_inspections(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(inspection_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_inspection_inspectors_inspection ON inspection_inspectors(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_inspectors_employee ON inspection_inspectors(employee_id);

ALTER TABLE inspection_inspectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read inspection inspectors"
  ON inspection_inspectors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert inspection inspectors"
  ON inspection_inspectors FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete inspection inspectors"
  ON inspection_inspectors FOR DELETE
  TO authenticated
  USING (true);
