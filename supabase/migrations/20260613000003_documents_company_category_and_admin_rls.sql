/*
  # Documents: admin-only "Company" category

  Adds a "Company" category for confidential company/compliance documents
  (BEE certificates, company registration, tax clearance, etc.) and restricts
  SELECT on those documents to admins at the database level.

  1. Extend the category CHECK constraint to include 'Company'.
  2. Replace the open SELECT policy so non-admins cannot read 'Company' docs.
     (Write policies remain gated by can_write().)
*/

-- 1. Extend the category check constraint (current set from 20260607000004)
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_category_check;
ALTER TABLE public.documents
  ADD CONSTRAINT documents_category_check
  CHECK (category IN ('SOP', 'Policy', 'Risk Assessment', 'Licence & Permit', 'Template', 'Company'));

-- 2. Gate SELECT for the admin-only category.
--    The original read policy was "Authenticated users can read documents" (USING true).
DROP POLICY IF EXISTS "Authenticated users can read documents" ON public.documents;
DROP POLICY IF EXISTS "Read documents (admin-only categories gated)" ON public.documents;

CREATE POLICY "Read documents (admin-only categories gated)"
  ON public.documents FOR SELECT TO authenticated
  USING (category <> 'Company' OR public.is_admin());
