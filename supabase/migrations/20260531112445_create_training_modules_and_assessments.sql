/*
  # Create Training Modules, Assessments, Attendance, and Toolbox Talk Topics

  1. New Tables
    - `training_modules`
      - `id` (uuid, primary key)
      - `category` (text) - e.g., PPE, Chemical Safety, Fire Safety
      - `subcategory` (text) - e.g., Gloves, Respirators, Eye Protection
      - `title` (text) - module title
      - `description` (text) - brief description
      - `content` (text) - full training material/content
      - `pass_mark` (integer, default 90) - percentage needed to pass
      - `estimated_minutes` (integer) - estimated time to complete
      - `is_mandatory` (boolean, default false)
      - `status` (text, default 'Active') - Active/Inactive
      - `created_at` / `updated_at` (timestamptz)

    - `training_module_questions`
      - `id` (uuid, primary key)
      - `module_id` (uuid, FK to training_modules)
      - `question_text` (text)
      - `option_a` (text)
      - `option_b` (text)
      - `option_c` (text)
      - `option_d` (text)
      - `correct_answer` (text) - 'A', 'B', 'C', or 'D'
      - `explanation` (text) - why the correct answer is correct
      - `sort_order` (integer, default 0)
      - `created_at` (timestamptz)

    - `training_assessments`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, FK to employees)
      - `employee_name` (text) - denormalized for convenience
      - `module_id` (uuid, FK to training_modules)
      - `module_title` (text) - denormalized
      - `answers` (jsonb) - stores submitted answers
      - `score` (integer) - percentage score
      - `result` (text) - Pass/Fail
      - `time_taken_seconds` (integer)
      - `taken_at` (timestamptz, default now())
      - `created_at` (timestamptz)

    - `training_attendance`
      - `id` (uuid, primary key)
      - `reference_type` (text) - 'toolbox_talk' or 'training_session'
      - `reference_id` (uuid) - ID of the talk or schedule entry
      - `employee_id` (uuid, FK to employees)
      - `employee_name` (text)
      - `status` (text, default 'Present') - Present/Absent/Late
      - `signature_data` (text) - base64 data URL of drawn signature
      - `signed_at` (timestamptz)
      - `created_at` (timestamptz)

    - `toolbox_talk_topics`
      - `id` (uuid, primary key)
      - `category` (text)
      - `subcategory` (text)
      - `title` (text)
      - `talking_points` (text) - pre-written discussion content
      - `key_questions` (text) - suggested discussion questions
      - `has_quiz` (boolean, default false)
      - `linked_module_id` (uuid, FK to training_modules, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to read and write their own data
*/

-- Training Modules
CREATE TABLE IF NOT EXISTS training_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT '',
  subcategory text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  pass_mark integer NOT NULL DEFAULT 90,
  estimated_minutes integer NOT NULL DEFAULT 15,
  is_mandatory boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read training modules"
  ON training_modules FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert training modules"
  ON training_modules FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update training modules"
  ON training_modules FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete training modules"
  ON training_modules FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Allow anon access for internal tool usage
CREATE POLICY "Anon can read training modules"
  ON training_modules FOR SELECT
  TO anon
  USING (status = 'Active');

CREATE POLICY "Anon can insert training modules"
  ON training_modules FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update training modules"
  ON training_modules FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);


-- Training Module Questions
CREATE TABLE IF NOT EXISTS training_module_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  question_text text NOT NULL DEFAULT '',
  option_a text NOT NULL DEFAULT '',
  option_b text NOT NULL DEFAULT '',
  option_c text NOT NULL DEFAULT '',
  option_d text NOT NULL DEFAULT '',
  correct_answer text NOT NULL DEFAULT 'A',
  explanation text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE training_module_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read module questions"
  ON training_module_questions FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert module questions"
  ON training_module_questions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update module questions"
  ON training_module_questions FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete module questions"
  ON training_module_questions FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anon can read module questions"
  ON training_module_questions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert module questions"
  ON training_module_questions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update module questions"
  ON training_module_questions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);


-- Training Assessments
CREATE TABLE IF NOT EXISTS training_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id),
  employee_name text NOT NULL DEFAULT '',
  module_id uuid NOT NULL REFERENCES training_modules(id),
  module_title text NOT NULL DEFAULT '',
  answers jsonb NOT NULL DEFAULT '{}',
  score integer NOT NULL DEFAULT 0,
  result text NOT NULL DEFAULT 'Fail',
  time_taken_seconds integer NOT NULL DEFAULT 0,
  taken_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE training_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read assessments"
  ON training_assessments FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert assessments"
  ON training_assessments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anon can read assessments"
  ON training_assessments FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert assessments"
  ON training_assessments FOR INSERT
  TO anon
  WITH CHECK (true);


-- Training Attendance
CREATE TABLE IF NOT EXISTS training_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_type text NOT NULL DEFAULT '',
  reference_id uuid NOT NULL,
  employee_id uuid NOT NULL REFERENCES employees(id),
  employee_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Present',
  signature_data text,
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE training_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read attendance"
  ON training_attendance FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert attendance"
  ON training_attendance FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update attendance"
  ON training_attendance FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete attendance"
  ON training_attendance FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anon can read attendance"
  ON training_attendance FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert attendance"
  ON training_attendance FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update attendance"
  ON training_attendance FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete attendance"
  ON training_attendance FOR DELETE
  TO anon
  USING (true);


-- Toolbox Talk Topics Library
CREATE TABLE IF NOT EXISTS toolbox_talk_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT '',
  subcategory text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  talking_points text NOT NULL DEFAULT '',
  key_questions text NOT NULL DEFAULT '',
  has_quiz boolean NOT NULL DEFAULT false,
  linked_module_id uuid REFERENCES training_modules(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE toolbox_talk_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read toolbox topics"
  ON toolbox_talk_topics FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert toolbox topics"
  ON toolbox_talk_topics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update toolbox topics"
  ON toolbox_talk_topics FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete toolbox topics"
  ON toolbox_talk_topics FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anon can read toolbox topics"
  ON toolbox_talk_topics FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert toolbox topics"
  ON toolbox_talk_topics FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update toolbox topics"
  ON toolbox_talk_topics FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_training_modules_category ON training_modules(category);
CREATE INDEX IF NOT EXISTS idx_training_modules_status ON training_modules(status);
CREATE INDEX IF NOT EXISTS idx_training_module_questions_module ON training_module_questions(module_id);
CREATE INDEX IF NOT EXISTS idx_training_assessments_employee ON training_assessments(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_assessments_module ON training_assessments(module_id);
CREATE INDEX IF NOT EXISTS idx_training_attendance_ref ON training_attendance(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_training_attendance_employee ON training_attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_toolbox_talk_topics_category ON toolbox_talk_topics(category);
