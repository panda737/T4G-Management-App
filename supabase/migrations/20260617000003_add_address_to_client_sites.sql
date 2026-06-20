-- Add a postal address to generator sites so delivery notes and the site/account
-- screens can show where goods actually go. Mirrors the clients address pattern
-- (3 address lines + postal code); `province` already exists on client_sites.
-- Additive only — existing rows default to empty strings; no RLS change needed
-- (the existing can_write_commercial() UPDATE policy already covers new columns).

ALTER TABLE public.client_sites
  ADD COLUMN IF NOT EXISTS address_line_1 text DEFAULT '',
  ADD COLUMN IF NOT EXISTS address_line_2 text DEFAULT '',
  ADD COLUMN IF NOT EXISTS address_line_3 text DEFAULT '',
  ADD COLUMN IF NOT EXISTS postal_code    text DEFAULT '';

-- Refresh the PostgREST schema cache so the new columns are immediately usable.
NOTIFY pgrst, 'reload schema';
