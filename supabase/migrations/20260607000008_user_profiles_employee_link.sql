-- Link user_profiles to employees so operator shift reports carry employee metadata.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_employee ON public.user_profiles(employee_id);

-- Auto-link operators whose display_name first word matches an employee first_name.
UPDATE public.user_profiles up
SET employee_id = e.id
FROM public.employees e
WHERE up.role = 'operator'
  AND up.employee_id IS NULL
  AND lower(split_part(up.display_name, ' ', 1)) = lower(e.first_name)
  AND e.status = 'active';
