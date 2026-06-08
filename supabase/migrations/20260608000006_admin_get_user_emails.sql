-- Admin-only function to read login emails from auth.users.
-- SECURITY DEFINER runs as the function owner (postgres) so it can access auth.users.
-- Returns all rows only if the calling user is an active admin; otherwise returns nothing.
CREATE OR REPLACE FUNCTION public.get_auth_user_emails()
RETURNS TABLE(auth_user_id uuid, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT u.id, u.email
  FROM auth.users u
  WHERE EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
      AND p.is_active = true
  );
$$;
