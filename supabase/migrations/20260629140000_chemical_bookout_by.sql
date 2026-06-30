/*
  # Chemical book-out — record the logged-in user as "booked out by"

  The book-out is attributed to the logged-in account (not a picked employee).
  Store their display name as a text snapshot (booked_out_by_employee_id stays for
  linkage when the account is tied to an employee). Additive.

  Cost is no longer tracked on the treatment side; unit_cost / total_cost remain on
  the table (default 0, unused) — left in place to keep this migration additive.
*/

ALTER TABLE public.treatment_chemical_bookouts
  ADD COLUMN IF NOT EXISTS booked_out_by text NOT NULL DEFAULT '';

NOTIFY pgrst, 'reload schema';
