/*
  # Create Training Courses, Records, Certificates & Schedule Tables

  This migration was missing from the original export. It creates the four
  training management tables required before seed data can be inserted.

  1. New Tables
    - `training_courses` - formal training course register
    - `training_records` - individual completion records
    - `training_certificates` - certificate registry with expiry tracking
    - `training_schedule` - scheduled training sessions

  2. Security
    - RLS enabled on all tables
    - Authenticated users can read
    - Authenticated users can insert/update/delete
*/

-- ============================================================
-- TRAINING COURSES
-- ============================================================
CREATE TABLE IF NOT EXISTS training_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code text NOT NULL UNIQUE,
  course_name text NOT NULL,
  category text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  duration_hours numeric NOT NULL DEFAULT 0,
  validity_months integer NOT NULL DEFAULT 12,
  provider text NOT NULL DEFAULT '',
  is_mandatory boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE training_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read training_courses"
  ON training_courses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert training_courses"
  ON training_courses FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update training_courses"
  ON training_courses FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete training_courses"
  ON training_courses FOR DELETE TO authenticated USING (true);

-- ============================================================
-- TRAINING RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS training_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  course_id uuid REFERENCES training_courses(id) ON DELETE SET NULL,
  employee_name text NOT NULL DEFAULT '',
  course_name text NOT NULL DEFAULT '',
  completion_date date,
  expiry_date date,
  score numeric,
  result text NOT NULL DEFAULT '',
  instructor text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Completed',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read training_records"
  ON training_records FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert training_records"
  ON training_records FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update training_records"
  ON training_records FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete training_records"
  ON training_records FOR DELETE TO authenticated USING (true);

-- ============================================================
-- TRAINING CERTIFICATES
-- ============================================================
CREATE TABLE IF NOT EXISTS training_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  course_id uuid REFERENCES training_courses(id) ON DELETE SET NULL,
  employee_name text NOT NULL DEFAULT '',
  course_name text NOT NULL DEFAULT '',
  certificate_number text NOT NULL DEFAULT '',
  issue_date date NOT NULL,
  expiry_date date,
  issuing_body text NOT NULL DEFAULT '',
  document_reference text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Valid',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE training_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read training_certificates"
  ON training_certificates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert training_certificates"
  ON training_certificates FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update training_certificates"
  ON training_certificates FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete training_certificates"
  ON training_certificates FOR DELETE TO authenticated USING (true);

-- ============================================================
-- TRAINING SCHEDULE
-- ============================================================
CREATE TABLE IF NOT EXISTS training_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES training_courses(id) ON DELETE SET NULL,
  course_name text NOT NULL DEFAULT '',
  scheduled_date date NOT NULL,
  scheduled_time time,
  location text NOT NULL DEFAULT '',
  instructor text NOT NULL DEFAULT '',
  instructor_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  capacity integer NOT NULL DEFAULT 0,
  enrolled_count integer NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Scheduled',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE training_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read training_schedule"
  ON training_schedule FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert training_schedule"
  ON training_schedule FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update training_schedule"
  ON training_schedule FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete training_schedule"
  ON training_schedule FOR DELETE TO authenticated USING (true);
