-- Per-shift downtime on the treatment daily log.
-- Previously the daily log had a single day-level downtime (downtime_minutes/
-- downtime_reason). Operators already log per-shift downtimes against their shift
-- reports; this brings the daily log in line by storing downtime per shift, with
-- support for multiple entries each. Entry shape: { "minutes": <int>, "reason": "<text>" }.
-- The day-level downtime_minutes/downtime_reason columns are kept and maintained
-- by the app as a roll-up so existing dashboards keep working.

ALTER TABLE public.treatment_daily_log
  ADD COLUMN IF NOT EXISTS day_shift_downtimes       jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS afternoon_shift_downtimes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS night_shift_downtimes     jsonb NOT NULL DEFAULT '[]'::jsonb;

NOTIFY pgrst, 'reload schema';
