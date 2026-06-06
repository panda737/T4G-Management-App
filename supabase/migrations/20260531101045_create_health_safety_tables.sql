/*
  # Create Health & Safety (SHEQ) Tables

  1. New Tables
    - `safety_incidents`
      - `id` (uuid, primary key)
      - `incident_number` (text, unique) - auto-formatted INC-YYYY-NNNN
      - `incident_date` (date) - when the incident occurred
      - `incident_time` (time) - time of incident
      - `incident_type` (text) - Injury, Near Miss, Property Damage, Environmental, Unsafe Act, Unsafe Condition
      - `severity` (text) - Minor, Moderate, Serious, Critical
      - `location` (text) - where on site
      - `description` (text) - what happened
      - `immediate_action` (text) - action taken immediately
      - `reported_by` (text) - person reporting
      - `injured_person` (text) - if applicable
      - `injury_type` (text) - if applicable
      - `body_part` (text) - if applicable
      - `witnesses` (text) - witness names
      - `root_cause` (text) - investigation finding
      - `status` (text) - Open, Under Investigation, Corrective Action, Closed
      - `closed_date` (date) - when closed
      - `created_at`, `updated_at` (timestamptz)

    - `safety_inspections`
      - `id` (uuid, primary key)
      - `inspection_number` (text, unique) - INS-YYYY-NNNN
      - `inspection_date` (date)
      - `inspection_type` (text) - Site Walk, PPE Check, Equipment, Fire Safety, Housekeeping, Vehicle
      - `area` (text) - area inspected
      - `inspector` (text)
      - `findings` (text) - what was found
      - `items_checked` (integer) - number of items on checklist
      - `items_passed` (integer) - number that passed
      - `score_percentage` (numeric) - calculated compliance score
      - `status` (text) - Scheduled, Completed, Requires Action
      - `next_inspection_date` (date)
      - `created_at`, `updated_at` (timestamptz)

    - `safety_risk_assessments`
      - `id` (uuid, primary key)
      - `assessment_number` (text, unique) - RA-YYYY-NNNN
      - `assessment_date` (date)
      - `area` (text)
      - `activity` (text) - work activity being assessed
      - `hazard` (text) - identified hazard
      - `risk_description` (text) - what could go wrong
      - `likelihood` (integer 1-5)
      - `consequence` (integer 1-5)
      - `risk_rating` (integer) - likelihood x consequence
      - `risk_level` (text) - Low, Medium, High, Extreme
      - `existing_controls` (text)
      - `additional_controls` (text)
      - `responsible_person` (text)
      - `review_date` (date)
      - `status` (text) - Draft, Active, Under Review, Archived
      - `assessed_by` (text)
      - `created_at`, `updated_at` (timestamptz)

    - `safety_corrective_actions`
      - `id` (uuid, primary key)
      - `action_number` (text, unique) - CA-YYYY-NNNN
      - `source_type` (text) - Incident, Inspection, Risk Assessment, Audit, Toolbox Talk
      - `source_reference` (text) - reference number of source
      - `description` (text) - what needs to be done
      - `assigned_to` (text)
      - `priority` (text) - Low, Medium, High, Critical
      - `due_date` (date)
      - `completed_date` (date)
      - `evidence` (text) - proof of completion
      - `status` (text) - Open, In Progress, Completed, Overdue, Verified
      - `created_at`, `updated_at` (timestamptz)

    - `safety_toolbox_talks`
      - `id` (uuid, primary key)
      - `talk_number` (text, unique) - TBT-YYYY-NNNN
      - `talk_date` (date)
      - `topic` (text)
      - `description` (text) - content/summary
      - `presented_by` (text)
      - `duration_minutes` (integer)
      - `attendee_count` (integer)
      - `attendees` (text) - comma-separated or list
      - `location` (text)
      - `follow_up_required` (boolean)
      - `follow_up_notes` (text)
      - `created_at`, `updated_at` (timestamptz)

    - `safety_emergency_drills`
      - `id` (uuid, primary key)
      - `drill_number` (text, unique) - DRL-YYYY-NNNN
      - `drill_date` (date)
      - `drill_type` (text) - Fire Evacuation, Chemical Spill, Medical Emergency, Lockdown, Other
      - `location` (text)
      - `coordinator` (text)
      - `participants_count` (integer)
      - `evacuation_time_seconds` (integer) - if applicable
      - `target_time_seconds` (integer) - benchmark time
      - `passed` (boolean) - met target
      - `observations` (text) - what was noted
      - `improvements` (text) - suggested improvements
      - `next_drill_date` (date)
      - `status` (text) - Scheduled, Completed, Cancelled
      - `created_at`, `updated_at` (timestamptz)

  2. Security
    - RLS enabled on all tables
    - Authenticated users can read, insert, update, delete their data
*/

-- ============================================================
-- INCIDENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS safety_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number text UNIQUE NOT NULL,
  incident_date date NOT NULL DEFAULT CURRENT_DATE,
  incident_time time,
  incident_type text NOT NULL DEFAULT 'Near Miss',
  severity text NOT NULL DEFAULT 'Minor',
  location text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  immediate_action text NOT NULL DEFAULT '',
  reported_by text NOT NULL DEFAULT '',
  injured_person text NOT NULL DEFAULT '',
  injury_type text NOT NULL DEFAULT '',
  body_part text NOT NULL DEFAULT '',
  witnesses text NOT NULL DEFAULT '',
  root_cause text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Open',
  closed_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE safety_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read incidents"
  ON safety_incidents FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert incidents"
  ON safety_incidents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update incidents"
  ON safety_incidents FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete incidents"
  ON safety_incidents FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- INSPECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS safety_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_number text UNIQUE NOT NULL,
  inspection_date date NOT NULL DEFAULT CURRENT_DATE,
  inspection_type text NOT NULL DEFAULT 'Site Walk',
  area text NOT NULL DEFAULT '',
  inspector text NOT NULL DEFAULT '',
  findings text NOT NULL DEFAULT '',
  items_checked integer NOT NULL DEFAULT 0,
  items_passed integer NOT NULL DEFAULT 0,
  score_percentage numeric(5,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Scheduled',
  next_inspection_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE safety_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read inspections"
  ON safety_inspections FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert inspections"
  ON safety_inspections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update inspections"
  ON safety_inspections FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete inspections"
  ON safety_inspections FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- RISK ASSESSMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS safety_risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_number text UNIQUE NOT NULL,
  assessment_date date NOT NULL DEFAULT CURRENT_DATE,
  area text NOT NULL DEFAULT '',
  activity text NOT NULL DEFAULT '',
  hazard text NOT NULL DEFAULT '',
  risk_description text NOT NULL DEFAULT '',
  likelihood integer NOT NULL DEFAULT 1,
  consequence integer NOT NULL DEFAULT 1,
  risk_rating integer NOT NULL DEFAULT 1,
  risk_level text NOT NULL DEFAULT 'Low',
  existing_controls text NOT NULL DEFAULT '',
  additional_controls text NOT NULL DEFAULT '',
  responsible_person text NOT NULL DEFAULT '',
  review_date date,
  status text NOT NULL DEFAULT 'Draft',
  assessed_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE safety_risk_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read risk assessments"
  ON safety_risk_assessments FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert risk assessments"
  ON safety_risk_assessments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update risk assessments"
  ON safety_risk_assessments FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete risk assessments"
  ON safety_risk_assessments FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- CORRECTIVE ACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS safety_corrective_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_number text UNIQUE NOT NULL,
  source_type text NOT NULL DEFAULT 'Incident',
  source_reference text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  assigned_to text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'Medium',
  due_date date,
  completed_date date,
  evidence text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE safety_corrective_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read corrective actions"
  ON safety_corrective_actions FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert corrective actions"
  ON safety_corrective_actions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update corrective actions"
  ON safety_corrective_actions FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete corrective actions"
  ON safety_corrective_actions FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- TOOLBOX TALKS
-- ============================================================
CREATE TABLE IF NOT EXISTS safety_toolbox_talks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  talk_number text UNIQUE NOT NULL,
  talk_date date NOT NULL DEFAULT CURRENT_DATE,
  topic text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  presented_by text NOT NULL DEFAULT '',
  duration_minutes integer NOT NULL DEFAULT 0,
  attendee_count integer NOT NULL DEFAULT 0,
  attendees text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  follow_up_required boolean NOT NULL DEFAULT false,
  follow_up_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE safety_toolbox_talks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read toolbox talks"
  ON safety_toolbox_talks FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert toolbox talks"
  ON safety_toolbox_talks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update toolbox talks"
  ON safety_toolbox_talks FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete toolbox talks"
  ON safety_toolbox_talks FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- EMERGENCY DRILLS
-- ============================================================
CREATE TABLE IF NOT EXISTS safety_emergency_drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_number text UNIQUE NOT NULL,
  drill_date date NOT NULL DEFAULT CURRENT_DATE,
  drill_type text NOT NULL DEFAULT 'Fire Evacuation',
  location text NOT NULL DEFAULT '',
  coordinator text NOT NULL DEFAULT '',
  participants_count integer NOT NULL DEFAULT 0,
  evacuation_time_seconds integer NOT NULL DEFAULT 0,
  target_time_seconds integer NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  observations text NOT NULL DEFAULT '',
  improvements text NOT NULL DEFAULT '',
  next_drill_date date,
  status text NOT NULL DEFAULT 'Scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE safety_emergency_drills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read emergency drills"
  ON safety_emergency_drills FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert emergency drills"
  ON safety_emergency_drills FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update emergency drills"
  ON safety_emergency_drills FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete emergency drills"
  ON safety_emergency_drills FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- INDEXES for common queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_incidents_date ON safety_incidents(incident_date);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON safety_incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON safety_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON safety_inspections(inspection_date);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON safety_inspections(status);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_status ON safety_risk_assessments(status);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_level ON safety_risk_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_status ON safety_corrective_actions(status);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_due ON safety_corrective_actions(due_date);
CREATE INDEX IF NOT EXISTS idx_toolbox_talks_date ON safety_toolbox_talks(talk_date);
CREATE INDEX IF NOT EXISTS idx_emergency_drills_date ON safety_emergency_drills(drill_date);
CREATE INDEX IF NOT EXISTS idx_emergency_drills_status ON safety_emergency_drills(status);
