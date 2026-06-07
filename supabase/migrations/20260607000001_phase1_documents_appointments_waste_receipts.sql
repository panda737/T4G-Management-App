/*
  # Phase 1: Documents, Legal Appointments, Waste Receipts

  Creates three new tables:
  - documents          : SOPs, licences, permits, policies stored in Supabase Storage
  - legal_appointments : Legally required role appointments per employee
  - waste_receipts     : Inbound waste records (feeds the Waste on Floor balance)
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- documents
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.documents (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text        NOT NULL,
  category         text        NOT NULL CHECK (category IN ('SOP','License','Permit','Policy','Certificate','Other')),
  description      text        NOT NULL DEFAULT '',
  file_path        text        NOT NULL,
  file_name        text        NOT NULL,
  file_size_bytes  bigint      NOT NULL DEFAULT 0,
  expiry_date      date,
  is_active        boolean     NOT NULL DEFAULT true,
  uploaded_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read documents"
  ON public.documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Non-viewer can insert documents"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can update documents"
  ON public.documents FOR UPDATE TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can delete documents"
  ON public.documents FOR DELETE TO authenticated
  USING (public.can_write());

CREATE INDEX IF NOT EXISTS documents_category_idx  ON public.documents (category);
CREATE INDEX IF NOT EXISTS documents_expiry_idx    ON public.documents (expiry_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- legal_appointments
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.legal_appointments (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id         uuid        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  appointment_type    text        NOT NULL CHECK (appointment_type IN (
                        'First Aider',
                        'Fire Fighter',
                        'Emergency Coordinator',
                        'Safety Representative',
                        '16.1 Appointee',
                        '16.2 Appointee',
                        'Risk Assessor',
                        'Incident Investigator',
                        'Other'
                      )),
  appointment_date    date        NOT NULL,
  expiry_date         date,
  appointed_by        text        NOT NULL DEFAULT '',
  document_reference  text        NOT NULL DEFAULT '',
  notes               text        NOT NULL DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read legal_appointments"
  ON public.legal_appointments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Non-viewer can insert legal_appointments"
  ON public.legal_appointments FOR INSERT TO authenticated
  WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can update legal_appointments"
  ON public.legal_appointments FOR UPDATE TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can delete legal_appointments"
  ON public.legal_appointments FOR DELETE TO authenticated
  USING (public.can_write());

CREATE INDEX IF NOT EXISTS legal_appointments_employee_idx ON public.legal_appointments (employee_id);
CREATE INDEX IF NOT EXISTS legal_appointments_type_idx     ON public.legal_appointments (appointment_type);
CREATE INDEX IF NOT EXISTS legal_appointments_expiry_idx   ON public.legal_appointments (expiry_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- waste_receipts
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.waste_receipts (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number       text        NOT NULL UNIQUE,
  date                 date        NOT NULL,
  client_name          text        NOT NULL DEFAULT '',
  waste_type           text        NOT NULL CHECK (waste_type IN ('Medical','Sharps','Pharmaceutical','Anatomical','Other')),
  quantity_kg          numeric     NOT NULL DEFAULT 0 CHECK (quantity_kg >= 0),
  manifest_number      text        NOT NULL DEFAULT '',
  vehicle_registration text        NOT NULL DEFAULT '',
  received_by          uuid        REFERENCES public.employees(id) ON DELETE SET NULL,
  notes                text        NOT NULL DEFAULT '',
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.waste_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read waste_receipts"
  ON public.waste_receipts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Non-viewer can insert waste_receipts"
  ON public.waste_receipts FOR INSERT TO authenticated
  WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can update waste_receipts"
  ON public.waste_receipts FOR UPDATE TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

CREATE POLICY "Non-viewer can delete waste_receipts"
  ON public.waste_receipts FOR DELETE TO authenticated
  USING (public.can_write());

CREATE INDEX IF NOT EXISTS waste_receipts_date_idx   ON public.waste_receipts (date);
CREATE INDEX IF NOT EXISTS waste_receipts_client_idx ON public.waste_receipts (client_name);

-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at trigger (reuse existing function)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER legal_appointments_updated_at
  BEFORE UPDATE ON public.legal_appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER waste_receipts_updated_at
  BEFORE UPDATE ON public.waste_receipts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
