/*
  # Add per-shift supervisor columns to treatment_daily_log

  ## Changes
  - Adds `day_shift_supervisor_id` (uuid, FK to employees) — supervisor for the day shift
  - Adds `afternoon_shift_supervisor_id` (uuid, FK to employees) — supervisor for the afternoon shift
  - Adds `night_shift_supervisor_id` (uuid, FK to employees) — supervisor for the night shift
  - Existing `supervisor_id` column is left intact for backwards compatibility

  These new columns allow a different supervisor to be recorded per shift rather than just once per day.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'treatment_daily_log' AND column_name = 'day_shift_supervisor_id'
  ) THEN
    ALTER TABLE treatment_daily_log ADD COLUMN day_shift_supervisor_id uuid REFERENCES employees(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'treatment_daily_log' AND column_name = 'afternoon_shift_supervisor_id'
  ) THEN
    ALTER TABLE treatment_daily_log ADD COLUMN afternoon_shift_supervisor_id uuid REFERENCES employees(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'treatment_daily_log' AND column_name = 'night_shift_supervisor_id'
  ) THEN
    ALTER TABLE treatment_daily_log ADD COLUMN night_shift_supervisor_id uuid REFERENCES employees(id);
  END IF;
END $$;
