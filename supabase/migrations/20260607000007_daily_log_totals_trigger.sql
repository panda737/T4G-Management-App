-- Automatically recalculate total_cycles, total_treated_kg, and chemical_litres
-- whenever per-shift values are inserted or updated.
-- This keeps the daily log consistent whether the row is created by an operator
-- shift report UPSERT or by management via the form.

CREATE OR REPLACE FUNCTION public.recalc_daily_log_totals()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = ''
AS $$
BEGIN
  NEW.total_cycles :=
    COALESCE(NEW.day_shift_cycles,       0) +
    COALESCE(NEW.afternoon_shift_cycles, 0) +
    COALESCE(NEW.night_shift_cycles,     0);

  NEW.total_treated_kg :=
    COALESCE(NEW.day_shift_treated_kg,       0) +
    COALESCE(NEW.afternoon_shift_treated_kg, 0) +
    COALESCE(NEW.night_shift_treated_kg,     0);

  NEW.chemical_litres := NEW.total_cycles * 27;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recalc_daily_log_totals
  BEFORE INSERT OR UPDATE ON public.treatment_daily_log
  FOR EACH ROW
  EXECUTE FUNCTION public.recalc_daily_log_totals();
