-- Fix recursive RLS: both functions query user_profiles as SECURITY INVOKER,
-- which re-triggers the "Admins can read all profiles" policy, which calls
-- is_admin() again → stack depth limit exceeded.
-- SECURITY DEFINER makes the function run as its owner, bypassing RLS on
-- user_profiles and breaking the recursion. SET search_path = '' prevents
-- search_path manipulation attacks.

CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE auth_user_id = auth.uid()
      AND role = 'admin'
      AND is_active = true
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_write()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE auth_user_id = auth.uid()
      AND role        != 'viewer'
      AND is_active    = true
  );
$function$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_write() FROM anon;
