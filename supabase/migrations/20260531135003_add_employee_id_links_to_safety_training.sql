/*
  # Link employees to safety and training records

  ## Overview
  Adds nullable employee_id foreign key columns alongside all existing text person-reference
  columns in safety and training tables. The text columns are kept for backwards compatibility
  and for cases where a person is not in the employees table. When an employee is selected from
  the dropdown the text field is auto-populated with their full name and employee_id is set.

  ## New columns added

  ### Safety tables
  - safety_incidents: reported_by_id, injured_person_id
  - safety_inspections: inspector_id
  - safety_risk_assessments: responsible_person_id, assessed_by_id
  - safety_corrective_actions: assigned_to_id
  - safety_toolbox_talks: presented_by_id
  - safety_emergency_drills: coordinator_id

  ### Training tables
  - training_schedule: instructor_id
  (training_records and training_certificates already have employee_id)

  ## Security
  All new columns follow existing RLS policies -- no new policies needed since columns are
  added to already-secured tables.
*/

-- safety_incidents
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'safety_incidents' AND column_name = 'reported_by_id'
  ) THEN
    ALTER TABLE public.safety_incidents
      ADD COLUMN reported_by_id uuid REFERENCES public.employees(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'safety_incidents' AND column_name = 'injured_person_id'
  ) THEN
    ALTER TABLE public.safety_incidents
      ADD COLUMN injured_person_id uuid REFERENCES public.employees(id) ON DELETE SET NULL;
  END IF;
END $$;

-- safety_inspections
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'safety_inspections' AND column_name = 'inspector_id'
  ) THEN
    ALTER TABLE public.safety_inspections
      ADD COLUMN inspector_id uuid REFERENCES public.employees(id) ON DELETE SET NULL;
  END IF;
END $$;

-- safety_risk_assessments
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'safety_risk_assessments' AND column_name = 'responsible_person_id'
  ) THEN
    ALTER TABLE public.safety_risk_assessments
      ADD COLUMN responsible_person_id uuid REFERENCES public.employees(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'safety_risk_assessments' AND column_name = 'assessed_by_id'
  ) THEN
    ALTER TABLE public.safety_risk_assessments
      ADD COLUMN assessed_by_id uuid REFERENCES public.employees(id) ON DELETE SET NULL;
  END IF;
END $$;

-- safety_corrective_actions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'safety_corrective_actions' AND column_name = 'assigned_to_id'
  ) THEN
    ALTER TABLE public.safety_corrective_actions
      ADD COLUMN assigned_to_id uuid REFERENCES public.employees(id) ON DELETE SET NULL;
  END IF;
END $$;

-- safety_toolbox_talks
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'safety_toolbox_talks' AND column_name = 'presented_by_id'
  ) THEN
    ALTER TABLE public.safety_toolbox_talks
      ADD COLUMN presented_by_id uuid REFERENCES public.employees(id) ON DELETE SET NULL;
  END IF;
END $$;

-- safety_emergency_drills
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'safety_emergency_drills' AND column_name = 'coordinator_id'
  ) THEN
    ALTER TABLE public.safety_emergency_drills
      ADD COLUMN coordinator_id uuid REFERENCES public.employees(id) ON DELETE SET NULL;
  END IF;
END $$;

-- training_schedule: instructor_id (two schedule-related tables exist)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_schedule' AND column_name = 'instructor_id'
  ) THEN
    ALTER TABLE public.training_schedule
      ADD COLUMN instructor_id uuid REFERENCES public.employees(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes for efficient lookups by employee
CREATE INDEX IF NOT EXISTS idx_safety_incidents_reported_by_id ON public.safety_incidents(reported_by_id);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_injured_person_id ON public.safety_incidents(injured_person_id);
CREATE INDEX IF NOT EXISTS idx_safety_inspections_inspector_id ON public.safety_inspections(inspector_id);
CREATE INDEX IF NOT EXISTS idx_safety_risk_assessments_responsible_person_id ON public.safety_risk_assessments(responsible_person_id);
CREATE INDEX IF NOT EXISTS idx_safety_risk_assessments_assessed_by_id ON public.safety_risk_assessments(assessed_by_id);
CREATE INDEX IF NOT EXISTS idx_safety_corrective_actions_assigned_to_id ON public.safety_corrective_actions(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_safety_toolbox_talks_presented_by_id ON public.safety_toolbox_talks(presented_by_id);
CREATE INDEX IF NOT EXISTS idx_safety_emergency_drills_coordinator_id ON public.safety_emergency_drills(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_training_schedule_instructor_id ON public.training_schedule(instructor_id);
