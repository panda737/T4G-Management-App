-- Update documents.category to new set of values

-- 1. Migrate existing rows to new category values
UPDATE public.documents SET category = 'Licence & Permit' WHERE category IN ('License', 'Permit');
UPDATE public.documents SET category = 'Template'         WHERE category = 'Certificate';
UPDATE public.documents SET category = 'SOP'              WHERE category = 'Other';

-- 2. Drop the old check constraint
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_category_check;

-- 3. Add the new check constraint
ALTER TABLE public.documents
  ADD CONSTRAINT documents_category_check
  CHECK (category IN ('SOP', 'Policy', 'Risk Assessment', 'Licence & Permit', 'Template'));
