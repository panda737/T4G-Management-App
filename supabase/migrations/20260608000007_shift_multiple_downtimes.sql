-- Replace single-downtime columns with a child table supporting multiple downtimes per shift.
-- Each row in treatment_shift_downtimes represents one downtime incident.

CREATE TABLE public.treatment_shift_downtimes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_report_id uuid        NOT NULL REFERENCES public.treatment_shift_reports(id) ON DELETE CASCADE,
  reason          text        NOT NULL DEFAULT '',
  minutes         integer     NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_shift_downtimes_report ON public.treatment_shift_downtimes(shift_report_id);

ALTER TABLE public.treatment_shift_downtimes ENABLE ROW LEVEL SECURITY;

-- Operators can insert rows for shift reports they submitted
CREATE POLICY "operators_insert_own_downtimes" ON public.treatment_shift_downtimes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.treatment_shift_reports r
      WHERE r.id = shift_report_id
        AND r.submitted_by = auth.uid()
    )
  );

-- Operators see downtimes for their own reports; admins/management see all
CREATE POLICY "users_read_accessible_downtimes" ON public.treatment_shift_downtimes
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.treatment_shift_reports r
      WHERE r.id = shift_report_id
        AND (r.submitted_by = auth.uid() OR public.can_write())
    )
  );

-- Drop old scalar columns from shift reports (no data to migrate — sample data was cleared)
ALTER TABLE public.treatment_shift_reports
  DROP COLUMN IF EXISTS downtime_reason,
  DROP COLUMN IF EXISTS downtime_minutes;
