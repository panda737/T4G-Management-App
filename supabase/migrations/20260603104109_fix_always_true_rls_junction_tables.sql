/*
  # Fix always-true RLS policies on junction tables

  ## Problem
  Three junction tables have INSERT and DELETE policies with USING/WITH CHECK clauses
  that evaluate to literal `true`, effectively disabling row-level security for
  authenticated users.

  ## Tables affected
  - `inspection_inspectors` — links inspections to inspector employees
  - `toolbox_attendees`     — links toolbox talks to attendee employees
  - `training_session_attendees` — links training sessions to attendee employees

  ## Fix
  Replace the always-true policies with restrictive ones that verify the referenced
  parent row actually exists. This ensures:
  - INSERT: the parent record (inspection / toolbox talk / training session) must exist
  - DELETE: same existence check on the parent before a row can be removed

  All policies remain scoped to `authenticated` users only.
*/

-- ============================================================
-- inspection_inspectors
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert inspection inspectors" ON inspection_inspectors;
DROP POLICY IF EXISTS "Authenticated users can delete inspection inspectors" ON inspection_inspectors;

CREATE POLICY "Authenticated users can insert inspection inspectors"
  ON inspection_inspectors
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM safety_inspections
      WHERE safety_inspections.id = inspection_inspectors.inspection_id
    )
  );

CREATE POLICY "Authenticated users can delete inspection inspectors"
  ON inspection_inspectors
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM safety_inspections
      WHERE safety_inspections.id = inspection_inspectors.inspection_id
    )
  );

-- ============================================================
-- toolbox_attendees
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert toolbox attendees" ON toolbox_attendees;
DROP POLICY IF EXISTS "Authenticated users can delete toolbox attendees" ON toolbox_attendees;

CREATE POLICY "Authenticated users can insert toolbox attendees"
  ON toolbox_attendees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM safety_toolbox_talks
      WHERE safety_toolbox_talks.id = toolbox_attendees.toolbox_id
    )
  );

CREATE POLICY "Authenticated users can delete toolbox attendees"
  ON toolbox_attendees
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM safety_toolbox_talks
      WHERE safety_toolbox_talks.id = toolbox_attendees.toolbox_id
    )
  );

-- ============================================================
-- training_session_attendees
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert training session attendees" ON training_session_attendees;
DROP POLICY IF EXISTS "Authenticated users can delete training session attendees" ON training_session_attendees;

CREATE POLICY "Authenticated users can insert training session attendees"
  ON training_session_attendees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM training_schedule
      WHERE training_schedule.id = training_session_attendees.session_id
    )
  );

CREATE POLICY "Authenticated users can delete training session attendees"
  ON training_session_attendees
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM training_schedule
      WHERE training_schedule.id = training_session_attendees.session_id
    )
  );
