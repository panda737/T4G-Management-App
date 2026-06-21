/*
  # Spillage ⇄ Incident delete sync (the reverse direction)

  A spillage and its auto-created incident are one thing, so deleting either
  must remove both.

  - spillage → incident  : already handled by safety_incidents.source_spillage_id
                           ON DELETE CASCADE (migration 20260621140000).
  - incident → spillage  : THIS migration. An AFTER DELETE trigger on
                           safety_incidents deletes the linked spillage.

  No infinite loop: by the time each side's reciprocal delete runs, the other
  row is already gone, so the reciprocal DELETE simply matches 0 rows.

  SECURITY DEFINER so the spillage is always removed with its incident,
  regardless of which role deleted the incident (the delete is bounded — it
  only ever removes the one spillage referenced by the deleted incident).
*/

CREATE OR REPLACE FUNCTION public.incident_deletes_spillage()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  IF OLD.source_spillage_id IS NOT NULL THEN
    DELETE FROM public.spillages WHERE id = OLD.source_spillage_id;
  END IF;
  RETURN OLD;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.incident_deletes_spillage() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.incident_deletes_spillage() FROM anon;

DROP TRIGGER IF EXISTS incident_deletes_spillage ON public.safety_incidents;

CREATE TRIGGER incident_deletes_spillage
  AFTER DELETE ON public.safety_incidents
  FOR EACH ROW EXECUTE FUNCTION public.incident_deletes_spillage();

NOTIFY pgrst, 'reload schema';
