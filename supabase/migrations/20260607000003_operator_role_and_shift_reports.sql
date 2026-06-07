-- ─────────────────────────────────────────────────────────────────────────────
-- Part 1a: Add "operator" to the user_profiles role CHECK constraint
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check,
  ADD CONSTRAINT user_profiles_role_check
    CHECK (role IN ('admin', 'management', 'stock_controller', 'production', 'operator', 'viewer'));


-- ─────────────────────────────────────────────────────────────────────────────
-- Part 1b: Add per-shift wash columns to treatment_daily_log
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.treatment_daily_log
  ADD COLUMN IF NOT EXISTS day_shift_ruc_washed        integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS day_shift_lids_washed        integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS day_shift_wheelie_bins       integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS afternoon_shift_ruc_washed   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS afternoon_shift_lids_washed  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS afternoon_shift_wheelie_bins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS night_shift_ruc_washed       integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS night_shift_lids_washed      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS night_shift_wheelie_bins     integer NOT NULL DEFAULT 0;


-- ─────────────────────────────────────────────────────────────────────────────
-- Part 1c: treatment_shift_reports — one row per operator shift submission
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.treatment_shift_reports (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_date       date        NOT NULL,
  shift            text        NOT NULL CHECK (shift IN ('Day', 'Afternoon', 'Night')),
  supervisor_id    uuid        REFERENCES public.employees(id) ON DELETE SET NULL,
  submitted_by     uuid        NOT NULL REFERENCES auth.users(id),
  cycles           integer     NOT NULL DEFAULT 0,
  treated_kg       numeric     NOT NULL DEFAULT 0,
  ruc_washed       integer     NOT NULL DEFAULT 0,
  lids_washed      integer     NOT NULL DEFAULT 0,
  wheelie_bins     integer     NOT NULL DEFAULT 0,
  has_downtime     boolean     NOT NULL DEFAULT false,
  downtime_reason  text        NOT NULL DEFAULT '',
  downtime_minutes integer     NOT NULL DEFAULT 0,
  notes            text        NOT NULL DEFAULT '',
  signature_data   text,
  signed_at        timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shift_reports_submitted_by ON public.treatment_shift_reports(submitted_by);
CREATE INDEX IF NOT EXISTS idx_shift_reports_shift_date   ON public.treatment_shift_reports(shift_date);


-- ─────────────────────────────────────────────────────────────────────────────
-- Part 1d: treatment_shift_team_members — relational join for crew per report
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.treatment_shift_team_members (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_report_id uuid        NOT NULL REFERENCES public.treatment_shift_reports(id) ON DELETE CASCADE,
  employee_id     uuid        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shift_report_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_shift_team_report ON public.treatment_shift_team_members(shift_report_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- Part 1e: RLS — treatment_shift_reports
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.treatment_shift_reports ENABLE ROW LEVEL SECURITY;

-- Operators (only) may insert their own records
CREATE POLICY "Operators can insert shift reports"
  ON public.treatment_shift_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE auth_user_id = auth.uid()
        AND role        = 'operator'
        AND is_active   = true
    )
  );

-- Operators see only their own; admins/management see all via can_write()
CREATE POLICY "Users can read accessible shift reports"
  ON public.treatment_shift_reports
  FOR SELECT
  TO authenticated
  USING (
    submitted_by = auth.uid()
    OR public.can_write()
  );

-- No UPDATE or DELETE policies — operators cannot modify submitted records


-- ─────────────────────────────────────────────────────────────────────────────
-- Part 1e: RLS — treatment_shift_team_members
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.treatment_shift_team_members ENABLE ROW LEVEL SECURITY;

-- Operators can add team members to their own reports
CREATE POLICY "Operators can insert team members for own reports"
  ON public.treatment_shift_team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.treatment_shift_reports
      WHERE id           = shift_report_id
        AND submitted_by = auth.uid()
    )
  );

-- Same visibility as the parent report
CREATE POLICY "Users can read team members for accessible reports"
  ON public.treatment_shift_team_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.treatment_shift_reports
      WHERE id = shift_report_id
        AND (submitted_by = auth.uid() OR public.can_write())
    )
  );
