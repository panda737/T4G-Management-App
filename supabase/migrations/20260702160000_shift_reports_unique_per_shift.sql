/*
  # One shift report per (shift_date, shift)

  ## Problem
  treatment_shift_reports had no uniqueness on (shift_date, shift), and the
  operator submit flow upserts the daily log with onConflict: 'date' — so two
  submissions for the same shift created two report rows and the second silently
  overwrote the first's numbers in treatment_daily_log (last-write-wins, no
  warning). Prod already contains such duplicates (6 slots, 2–7 copies each).

  ## Fix
  1. Dedupe: keep the most recent submission per (shift_date, shift) — matching
     the state the daily log currently reflects — and delete the older copies.
     Child rows (team members, downtimes) follow via ON DELETE CASCADE.
  2. Add UNIQUE (shift_date, shift) so a duplicate submission now fails loudly;
     the UI catches 23505 and tells the operator the shift was already recorded.
*/

DELETE FROM public.treatment_shift_reports t
USING public.treatment_shift_reports newer
WHERE t.shift_date = newer.shift_date
  AND t.shift = newer.shift
  AND (newer.created_at > t.created_at
       OR (newer.created_at = t.created_at AND newer.id > t.id));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'treatment_shift_reports_shift_date_shift_key'
      AND conrelid = 'public.treatment_shift_reports'::regclass
  ) THEN
    ALTER TABLE public.treatment_shift_reports
      ADD CONSTRAINT treatment_shift_reports_shift_date_shift_key
      UNIQUE (shift_date, shift);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
