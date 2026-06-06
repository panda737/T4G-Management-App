/*
  # RLS: Restrict all writes to non-viewer roles

  ## Problem
  Every write policy (INSERT / UPDATE / DELETE) on all application tables
  currently allows any authenticated user to mutate data. Users with the
  `viewer` role are supposed to be read-only across every module, but the
  database does not enforce that — only the frontend does.

  ## Fix
  1. Add a helper function `can_write()` that returns TRUE when the caller
     is an authenticated, active, non-viewer user.
  2. Replace every existing authenticated write policy with an equivalent
     policy whose USING / WITH CHECK condition calls `can_write()`.

  ## Tables affected (21 tables + 3 junction tables)
  Stock       : stock_categories, stock_items, stock_movements,
                stock_take_sessions, stock_take_line_items
  Treatment   : treatment_daily_log, treatment_waste_transfers,
                treatment_monthly_summary
  Safety      : safety_incidents, safety_inspections,
                safety_risk_assessments, safety_corrective_actions,
                safety_toolbox_talks, safety_emergency_drills
  Training    : training_courses, training_records, training_certificates,
                training_schedule, training_modules, training_module_questions,
                training_assessments, training_attendance
  Employees   : employees
  Maintenance : equipment, parts, maintenance_history
  Junction    : inspection_inspectors, toolbox_attendees,
                training_session_attendees

  ## Not changed
  - user_profiles: write access is already admin-only.
  - SELECT policies: read access remains open to all authenticated users.
  - toolbox_talk_topics: read-only reference library; no app writes.
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper function
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.can_write()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY INVOKER
  SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE auth_user_id  = auth.uid()
      AND role         != 'viewer'
      AND is_active     = true
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_write() FROM anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- STOCK MODULE
-- ─────────────────────────────────────────────────────────────────────────────

-- stock_categories
DROP POLICY IF EXISTS "Authenticated users can insert stock_categories"  ON stock_categories;
DROP POLICY IF EXISTS "Authenticated users can update stock_categories"  ON stock_categories;
DROP POLICY IF EXISTS "Authenticated users can delete stock_categories"  ON stock_categories;

CREATE POLICY "Non-viewer can insert stock_categories"
  ON stock_categories FOR INSERT TO authenticated
  WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can update stock_categories"
  ON stock_categories FOR UPDATE TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can delete stock_categories"
  ON stock_categories FOR DELETE TO authenticated
  USING (public.can_write());

-- stock_items
DROP POLICY IF EXISTS "Authenticated users can insert stock_items"  ON stock_items;
DROP POLICY IF EXISTS "Authenticated users can update stock_items"  ON stock_items;
DROP POLICY IF EXISTS "Authenticated users can delete stock_items"  ON stock_items;

CREATE POLICY "Non-viewer can insert stock_items"
  ON stock_items FOR INSERT TO authenticated
  WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can update stock_items"
  ON stock_items FOR UPDATE TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can delete stock_items"
  ON stock_items FOR DELETE TO authenticated
  USING (public.can_write());

-- stock_movements
DROP POLICY IF EXISTS "Authenticated users can insert stock_movements"  ON stock_movements;
DROP POLICY IF EXISTS "Authenticated users can update stock_movements"  ON stock_movements;
DROP POLICY IF EXISTS "Authenticated users can delete stock_movements"  ON stock_movements;

CREATE POLICY "Non-viewer can insert stock_movements"
  ON stock_movements FOR INSERT TO authenticated
  WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can update stock_movements"
  ON stock_movements FOR UPDATE TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can delete stock_movements"
  ON stock_movements FOR DELETE TO authenticated
  USING (public.can_write());

-- stock_take_sessions
DROP POLICY IF EXISTS "Authenticated users can insert stock_take_sessions"  ON stock_take_sessions;
DROP POLICY IF EXISTS "Authenticated users can update stock_take_sessions"  ON stock_take_sessions;
DROP POLICY IF EXISTS "Authenticated users can delete stock_take_sessions"  ON stock_take_sessions;

CREATE POLICY "Non-viewer can insert stock_take_sessions"
  ON stock_take_sessions FOR INSERT TO authenticated
  WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can update stock_take_sessions"
  ON stock_take_sessions FOR UPDATE TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can delete stock_take_sessions"
  ON stock_take_sessions FOR DELETE TO authenticated
  USING (public.can_write());

-- stock_take_line_items
DROP POLICY IF EXISTS "Authenticated users can insert stock_take_line_items"  ON stock_take_line_items;
DROP POLICY IF EXISTS "Authenticated users can update stock_take_line_items"  ON stock_take_line_items;
DROP POLICY IF EXISTS "Authenticated users can delete stock_take_line_items"  ON stock_take_line_items;

CREATE POLICY "Non-viewer can insert stock_take_line_items"
  ON stock_take_line_items FOR INSERT TO authenticated
  WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can update stock_take_line_items"
  ON stock_take_line_items FOR UPDATE TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can delete stock_take_line_items"
  ON stock_take_line_items FOR DELETE TO authenticated
  USING (public.can_write());

-- ─────────────────────────────────────────────────────────────────────────────
-- TREATMENT MODULE
-- ─────────────────────────────────────────────────────────────────────────────

-- treatment_daily_log
DROP POLICY IF EXISTS "Authenticated users can insert treatment logs"  ON treatment_daily_log;
DROP POLICY IF EXISTS "Authenticated users can update treatment logs"  ON treatment_daily_log;
DROP POLICY IF EXISTS "Authenticated users can delete treatment logs"  ON treatment_daily_log;

CREATE POLICY "Non-viewer can insert treatment logs"
  ON treatment_daily_log FOR INSERT TO authenticated
  WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can update treatment logs"
  ON treatment_daily_log FOR UPDATE TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can delete treatment logs"
  ON treatment_daily_log FOR DELETE TO authenticated
  USING (public.can_write());

-- treatment_waste_transfers
DROP POLICY IF EXISTS "Authenticated users can insert waste transfers"  ON treatment_waste_transfers;
DROP POLICY IF EXISTS "Authenticated users can update waste transfers"  ON treatment_waste_transfers;
DROP POLICY IF EXISTS "Authenticated users can delete waste transfers"  ON treatment_waste_transfers;

CREATE POLICY "Non-viewer can insert waste transfers"
  ON treatment_waste_transfers FOR INSERT TO authenticated
  WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can update waste transfers"
  ON treatment_waste_transfers FOR UPDATE TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can delete waste transfers"
  ON treatment_waste_transfers FOR DELETE TO authenticated
  USING (public.can_write());

-- treatment_monthly_summary
DROP POLICY IF EXISTS "Authenticated users can insert monthly summaries"  ON treatment_monthly_summary;
DROP POLICY IF EXISTS "Authenticated users can update monthly summaries"  ON treatment_monthly_summary;
DROP POLICY IF EXISTS "Authenticated users can delete monthly summaries"  ON treatment_monthly_summary;

CREATE POLICY "Non-viewer can insert monthly summaries"
  ON treatment_monthly_summary FOR INSERT TO authenticated
  WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can update monthly summaries"
  ON treatment_monthly_summary FOR UPDATE TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can delete monthly summaries"
  ON treatment_monthly_summary FOR DELETE TO authenticated
  USING (public.can_write());

-- ─────────────────────────────────────────────────────────────────────────────
-- HEALTH & SAFETY MODULE
-- ─────────────────────────────────────────────────────────────────────────────

-- safety_incidents
DROP POLICY IF EXISTS "Authenticated users can insert incidents"  ON safety_incidents;
DROP POLICY IF EXISTS "Authenticated users can update incidents"  ON safety_incidents;
DROP POLICY IF EXISTS "Authenticated users can delete incidents"  ON safety_incidents;

CREATE POLICY "Non-viewer can insert incidents"
  ON safety_incidents FOR INSERT TO authenticated
  WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can update incidents"
  ON safety_incidents FOR UPDATE TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can delete incidents"
  ON safety_incidents FOR DELETE TO authenticated
  USING (public.can_write());

-- safety_inspections
DROP POLICY IF EXISTS "Authenticated users can insert inspections"  ON safety_inspections;
DROP POLICY IF EXISTS "Authenticated users can update inspections"  ON safety_inspections;
DROP POLICY IF EXISTS "Authenticated users can delete inspections"  ON safety_inspections;

CREATE POLICY "Non-viewer can insert inspections"
  ON safety_inspections FOR INSERT TO authenticated
  WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can update inspections"
  ON safety_inspections FOR UPDATE TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can delete inspections"
  ON safety_inspections FOR DELETE TO authenticated
  USING (public.can_write());

-- safety_risk_assessments
DROP POLICY IF EXISTS "Authenticated users can insert risk assessments"  ON safety_risk_assessments;
DROP POLICY IF EXISTS "Authenticated users can update risk assessments"  ON safety_risk_assessments;
DROP POLICY IF EXISTS "Authenticated users can delete risk assessments"  ON safety_risk_assessments;

CREATE POLICY "Non-viewer can insert risk assessments"
  ON safety_risk_assessments FOR INSERT TO authenticated
  WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can update risk assessments"
  ON safety_risk_assessments FOR UPDATE TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can delete risk assessments"
  ON safety_risk_assessments FOR DELETE TO authenticated
  USING (public.can_write());

-- safety_corrective_actions
DROP POLICY IF EXISTS "Authenticated users can insert corrective actions"  ON safety_corrective_actions;
DROP POLICY IF EXISTS "Authenticated users can update corrective actions"  ON safety_corrective_actions;
DROP POLICY IF EXISTS "Authenticated users can delete corrective actions"  ON safety_corrective_actions;

CREATE POLICY "Non-viewer can insert corrective actions"
  ON safety_corrective_actions FOR INSERT TO authenticated
  WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can update corrective actions"
  ON safety_corrective_actions FOR UPDATE TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can delete corrective actions"
  ON safety_corrective_actions FOR DELETE TO authenticated
  USING (public.can_write());

-- safety_toolbox_talks
DROP POLICY IF EXISTS "Authenticated users can insert toolbox talks"  ON safety_toolbox_talks;
DROP POLICY IF EXISTS "Authenticated users can update toolbox talks"  ON safety_toolbox_talks;
DROP POLICY IF EXISTS "Authenticated users can delete toolbox talks"  ON safety_toolbox_talks;

CREATE POLICY "Non-viewer can insert toolbox talks"
  ON safety_toolbox_talks FOR INSERT TO authenticated
  WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can update toolbox talks"
  ON safety_toolbox_talks FOR UPDATE TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can delete toolbox talks"
  ON safety_toolbox_talks FOR DELETE TO authenticated
  USING (public.can_write());

-- safety_emergency_drills
DROP POLICY IF EXISTS "Authenticated users can insert emergency drills"  ON safety_emergency_drills;
DROP POLICY IF EXISTS "Authenticated users can update emergency drills"  ON safety_emergency_drills;
DROP POLICY IF EXISTS "Authenticated users can delete emergency drills"  ON safety_emergency_drills;

CREATE POLICY "Non-viewer can insert emergency drills"
  ON safety_emergency_drills FOR INSERT TO authenticated
  WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can update emergency drills"
  ON safety_emergency_drills FOR UPDATE TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can delete emergency drills"
  ON safety_emergency_drills FOR DELETE TO authenticated
  USING (public.can_write());

-- ─────────────────────────────────────────────────────────────────────────────
-- TRAINING MODULE
-- ─────────────────────────────────────────────────────────────────────────────

-- training_courses
DROP POLICY IF EXISTS "Authenticated users can insert training_courses"  ON training_courses;
DROP POLICY IF EXISTS "Authenticated users can update training_courses"  ON training_courses;
DROP POLICY IF EXISTS "Authenticated users can delete training_courses"  ON training_courses;

CREATE POLICY "Non-viewer can insert training_courses"
  ON training_courses FOR INSERT TO authenticated
  WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can update training_courses"
  ON training_courses FOR UPDATE TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can delete training_courses"
  ON training_courses FOR DELETE TO authenticated
  USING (public.can_write());

-- training_records
DROP POLICY IF EXISTS "Authenticated users can insert training_records"  ON training_records;
DROP POLICY IF EXISTS "Authenticated users can update training_records"  ON training_records;
DROP POLICY IF EXISTS "Authenticated users can delete training_records"  ON training_records;

CREATE POLICY "Non-viewer can insert training_records"
  ON training_records FOR INSERT TO authenticated
  WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can update training_records"
  ON training_records FOR UPDATE TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can delete training_records"
  ON training_records FOR DELETE TO authenticated
  USING (public.can_write());

-- training_certificates
DROP POLICY IF EXISTS "Authenticated users can insert training_certificates"  ON training_certificates;
DROP POLICY IF EXISTS "Authenticated users can update training_certificates"  ON training_certificates;
DROP POLICY IF EXISTS "Authenticated users can delete training_certificates"  ON training_certificates;

CREATE POLICY "Non-viewer can insert training_certificates"
  ON training_certificates FOR INSERT TO authenticated
  WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can update training_certificates"
  ON training_certificates FOR UPDATE TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can delete training_certificates"
  ON training_certificates FOR DELETE TO authenticated
  USING (public.can_write());

-- training_schedule
DROP POLICY IF EXISTS "Authenticated users can insert training_schedule"  ON training_schedule;
DROP POLICY IF EXISTS "Authenticated users can update training_schedule"  ON training_schedule;
DROP POLICY IF EXISTS "Authenticated users can delete training_schedule"  ON training_schedule;

CREATE POLICY "Non-viewer can insert training_schedule"
  ON training_schedule FOR INSERT TO authenticated
  WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can update training_schedule"
  ON training_schedule FOR UPDATE TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can delete training_schedule"
  ON training_schedule FOR DELETE TO authenticated
  USING (public.can_write());

-- training_modules
DROP POLICY IF EXISTS "Authenticated users can insert training modules"  ON training_modules;
DROP POLICY IF EXISTS "Authenticated users can update training modules"  ON training_modules;
DROP POLICY IF EXISTS "Authenticated users can delete training modules"  ON training_modules;

CREATE POLICY "Non-viewer can insert training modules"
  ON training_modules FOR INSERT TO authenticated
  WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can update training modules"
  ON training_modules FOR UPDATE TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can delete training modules"
  ON training_modules FOR DELETE TO authenticated
  USING (public.can_write());

-- training_module_questions
DROP POLICY IF EXISTS "Authenticated users can insert module questions"  ON training_module_questions;
DROP POLICY IF EXISTS "Authenticated users can update module questions"  ON training_module_questions;
DROP POLICY IF EXISTS "Authenticated users can delete module questions"  ON training_module_questions;

CREATE POLICY "Non-viewer can insert module questions"
  ON training_module_questions FOR INSERT TO authenticated
  WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can update module questions"
  ON training_module_questions FOR UPDATE TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can delete module questions"
  ON training_module_questions FOR DELETE TO authenticated
  USING (public.can_write());

-- training_assessments (INSERT only — no UPDATE/DELETE policy was ever created)
DROP POLICY IF EXISTS "Authenticated users can insert assessments"  ON training_assessments;

CREATE POLICY "Non-viewer can insert assessments"
  ON training_assessments FOR INSERT TO authenticated
  WITH CHECK (public.can_write());

-- training_attendance
DROP POLICY IF EXISTS "Authenticated users can insert attendance"  ON training_attendance;
DROP POLICY IF EXISTS "Authenticated users can update attendance"  ON training_attendance;
DROP POLICY IF EXISTS "Authenticated users can delete attendance"  ON training_attendance;

CREATE POLICY "Non-viewer can insert attendance"
  ON training_attendance FOR INSERT TO authenticated
  WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can update attendance"
  ON training_attendance FOR UPDATE TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can delete attendance"
  ON training_attendance FOR DELETE TO authenticated
  USING (public.can_write());

-- ─────────────────────────────────────────────────────────────────────────────
-- EMPLOYEE MODULE
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated users can insert employees"  ON employees;
DROP POLICY IF EXISTS "Authenticated users can update employees"  ON employees;
DROP POLICY IF EXISTS "Authenticated users can delete employees"  ON employees;

CREATE POLICY "Non-viewer can insert employees"
  ON employees FOR INSERT TO authenticated
  WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can update employees"
  ON employees FOR UPDATE TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can delete employees"
  ON employees FOR DELETE TO authenticated
  USING (public.can_write());

-- ─────────────────────────────────────────────────────────────────────────────
-- MAINTENANCE MODULE  (no DELETE by design — soft-decommission via status)
-- ─────────────────────────────────────────────────────────────────────────────

-- equipment
DROP POLICY IF EXISTS "Authenticated users can insert equipment"  ON equipment;
DROP POLICY IF EXISTS "Authenticated users can update equipment"  ON equipment;

CREATE POLICY "Non-viewer can insert equipment"
  ON equipment FOR INSERT TO authenticated
  WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can update equipment"
  ON equipment FOR UPDATE TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

-- parts
DROP POLICY IF EXISTS "Authenticated users can insert parts"  ON parts;
DROP POLICY IF EXISTS "Authenticated users can update parts"  ON parts;

CREATE POLICY "Non-viewer can insert parts"
  ON parts FOR INSERT TO authenticated
  WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can update parts"
  ON parts FOR UPDATE TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

-- maintenance_history
DROP POLICY IF EXISTS "Authenticated users can insert maintenance_history"  ON maintenance_history;
DROP POLICY IF EXISTS "Authenticated users can update maintenance_history"  ON maintenance_history;

CREATE POLICY "Non-viewer can insert maintenance_history"
  ON maintenance_history FOR INSERT TO authenticated
  WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can update maintenance_history"
  ON maintenance_history FOR UPDATE TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

-- ─────────────────────────────────────────────────────────────────────────────
-- JUNCTION TABLES  (preserve parent-exists check; add can_write())
-- ─────────────────────────────────────────────────────────────────────────────

-- inspection_inspectors
DROP POLICY IF EXISTS "Authenticated users can insert inspection inspectors"  ON inspection_inspectors;
DROP POLICY IF EXISTS "Authenticated users can delete inspection inspectors"  ON inspection_inspectors;

CREATE POLICY "Non-viewer can insert inspection inspectors"
  ON inspection_inspectors FOR INSERT TO authenticated
  WITH CHECK (
    public.can_write() AND
    EXISTS (SELECT 1 FROM safety_inspections WHERE safety_inspections.id = inspection_inspectors.inspection_id)
  );

CREATE POLICY "Non-viewer can delete inspection inspectors"
  ON inspection_inspectors FOR DELETE TO authenticated
  USING (
    public.can_write() AND
    EXISTS (SELECT 1 FROM safety_inspections WHERE safety_inspections.id = inspection_inspectors.inspection_id)
  );

-- toolbox_attendees
DROP POLICY IF EXISTS "Authenticated users can insert toolbox attendees"  ON toolbox_attendees;
DROP POLICY IF EXISTS "Authenticated users can delete toolbox attendees"  ON toolbox_attendees;

CREATE POLICY "Non-viewer can insert toolbox attendees"
  ON toolbox_attendees FOR INSERT TO authenticated
  WITH CHECK (
    public.can_write() AND
    EXISTS (SELECT 1 FROM safety_toolbox_talks WHERE safety_toolbox_talks.id = toolbox_attendees.toolbox_id)
  );

CREATE POLICY "Non-viewer can delete toolbox attendees"
  ON toolbox_attendees FOR DELETE TO authenticated
  USING (
    public.can_write() AND
    EXISTS (SELECT 1 FROM safety_toolbox_talks WHERE safety_toolbox_talks.id = toolbox_attendees.toolbox_id)
  );

-- training_session_attendees
DROP POLICY IF EXISTS "Authenticated users can insert training session attendees"  ON training_session_attendees;
DROP POLICY IF EXISTS "Authenticated users can delete training session attendees"  ON training_session_attendees;

CREATE POLICY "Non-viewer can insert training session attendees"
  ON training_session_attendees FOR INSERT TO authenticated
  WITH CHECK (
    public.can_write() AND
    EXISTS (SELECT 1 FROM training_schedule WHERE training_schedule.id = training_session_attendees.session_id)
  );

CREATE POLICY "Non-viewer can delete training session attendees"
  ON training_session_attendees FOR DELETE TO authenticated
  USING (
    public.can_write() AND
    EXISTS (SELECT 1 FROM training_schedule WHERE training_schedule.id = training_session_attendees.session_id)
  );
