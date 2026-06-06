/*
  # Fix mutable search_path on update_updated_at function

  1. Security Fix
    - Recreates `public.update_updated_at()` with an explicit
      `SET search_path = ''` to prevent search-path hijacking.
    - Uses fully-qualified `pg_catalog.now()` since the search_path
      is now empty.

  2. Important Notes
    - This is a non-destructive change: the function body and
      return type remain identical.
    - All existing triggers that reference this function continue
      to work without modification.
*/

CREATE OR REPLACE FUNCTION public.update_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$function$;
