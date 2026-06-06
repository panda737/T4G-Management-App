/*
  # Fix security issues: RLS policies and function

  1. Function changes
    - `public.is_admin()`: Set immutable search_path to prevent path manipulation
    - `public.is_admin()`: Switch from SECURITY DEFINER to SECURITY INVOKER (safe because it only reads user_profiles which authenticated users can already SELECT)
    - `public.is_admin()`: Revoke EXECUTE from `anon` role (anonymous users are never admins)

  2. RLS policy removals (10 policies)
    - Drop all "Anon can ..." write policies that use `true` / unrestricted access
    - These tables already have proper `authenticated` policies; anon write access was only needed for seed migrations which have already run
    - Affected tables: toolbox_talk_topics, training_assessments, training_attendance, training_module_questions, training_modules

  3. Security impact
    - Anonymous users can no longer insert, update, or delete data in training/toolbox tables
    - Anonymous users can no longer call is_admin() via the REST API
    - The is_admin() function is no longer vulnerable to search_path manipulation
    - All authenticated user policies remain unchanged
*/

-- 1. Fix is_admin() function: set search_path, switch to SECURITY INVOKER, keep STABLE
CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY INVOKER
  SET search_path = ''
AS $function$
SELECT EXISTS (
  SELECT 1 FROM public.user_profiles
  WHERE auth_user_id = auth.uid()
    AND role = 'admin'
    AND is_active = true
);
$function$;

-- Revoke EXECUTE from anon (anonymous users are never admins)
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;

-- 2. Drop insecure anon write policies

-- toolbox_talk_topics: drop anon INSERT and UPDATE
DROP POLICY IF EXISTS "Anon can insert toolbox topics" ON public.toolbox_talk_topics;
DROP POLICY IF EXISTS "Anon can update toolbox topics" ON public.toolbox_talk_topics;

-- training_assessments: drop anon INSERT
DROP POLICY IF EXISTS "Anon can insert assessments" ON public.training_assessments;

-- training_attendance: drop anon INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "Anon can insert attendance" ON public.training_attendance;
DROP POLICY IF EXISTS "Anon can update attendance" ON public.training_attendance;
DROP POLICY IF EXISTS "Anon can delete attendance" ON public.training_attendance;

-- training_module_questions: drop anon INSERT and UPDATE
DROP POLICY IF EXISTS "Anon can insert module questions" ON public.training_module_questions;
DROP POLICY IF EXISTS "Anon can update module questions" ON public.training_module_questions;

-- training_modules: drop anon INSERT and UPDATE
DROP POLICY IF EXISTS "Anon can insert training modules" ON public.training_modules;
DROP POLICY IF EXISTS "Anon can update training modules" ON public.training_modules;
