/*
  # Link stock-take sessions to their correction movement group

  ## Purpose
  Stock Take "Apply Corrections" posts a movement group (movement_type
  'Stock Take Correction'), but nothing on the session recorded which group it
  produced. This adds that link so a 'Stock Take Correction' movement can deep-link
  back to the session that created it.

  ## Backfill
  Past sessions are matched best-effort by the group label the app writes:
  'Stock Take Correction <middot> <session name>'. The middle dot is written with
  chr(183) (U+00B7) so the comparison is independent of how the SQL file is
  encoded/transcoded by tooling. Sessions whose name can't be matched stay NULL and
  fall back to the inline movement view. Duplicate session names may link more than
  one session to the same group — harmless; the UI opens the first match. Nullable +
  additive; no RLS change (stock_take_sessions policies already govern the table).
*/

ALTER TABLE public.stock_take_sessions
  ADD COLUMN IF NOT EXISTS correction_movement_group_id uuid;

UPDATE public.stock_take_sessions s
SET correction_movement_group_id = m.movement_group_id
FROM public.stock_movements m
WHERE s.correction_movement_group_id IS NULL
  AND m.movement_type = 'Stock Take Correction'
  AND m.movement_group_id IS NOT NULL
  AND m.movement_group_label = 'Stock Take Correction ' || chr(183) || ' ' || s.stock_take_name;
