/*
  # Employee medical records (vaccinations, medical exams)

  Sensitive employee health data. Unlike most tables (where all authenticated
  users can read), access to medical records is restricted to admin + management
  for ALL operations, including SELECT.

  1. can_access_medical() — true for active admin/management users.
  2. employee_medical_records table (child of employees) with file attachment.
  3. RLS: every operation gated by can_access_medical().
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper function: admin or management only
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.can_access_medical()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'management')
      AND is_active = true
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_access_medical() FROM anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- Table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employee_medical_records (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id      uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  record_type      text NOT NULL DEFAULT 'Vaccination'
                     CHECK (record_type IN ('Vaccination', 'Medical Exam', 'Fitness Certificate', 'Other')),
  name             text NOT NULL DEFAULT '',
  date_administered date,
  expiry_date      date,
  provider         text NOT NULL DEFAULT '',
  notes            text NOT NULL DEFAULT '',
  file_path        text NOT NULL DEFAULT '',
  file_name        text NOT NULL DEFAULT '',
  file_size_bytes  bigint NOT NULL DEFAULT 0,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS employee_medical_records_employee_idx ON public.employee_medical_records (employee_id);
CREATE INDEX IF NOT EXISTS employee_medical_records_expiry_idx   ON public.employee_medical_records (expiry_date);

CREATE OR REPLACE TRIGGER employee_medical_records_updated_at
  BEFORE UPDATE ON public.employee_medical_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS — admin/management only for every operation
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.employee_medical_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medical access can read employee_medical_records"
  ON public.employee_medical_records FOR SELECT TO authenticated
  USING (public.can_access_medical());

CREATE POLICY "Medical access can insert employee_medical_records"
  ON public.employee_medical_records FOR INSERT TO authenticated
  WITH CHECK (public.can_access_medical());

CREATE POLICY "Medical access can update employee_medical_records"
  ON public.employee_medical_records FOR UPDATE TO authenticated
  USING (public.can_access_medical()) WITH CHECK (public.can_access_medical());

CREATE POLICY "Medical access can delete employee_medical_records"
  ON public.employee_medical_records FOR DELETE TO authenticated
  USING (public.can_access_medical());
