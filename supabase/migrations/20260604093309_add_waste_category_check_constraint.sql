/*
  # Add waste_category CHECK constraint

  ## Summary
  Adds a CHECK constraint to the `treatment_waste_transfers` table to enforce
  that `waste_category` is one of the allowed values.

  ## Changes
  - `treatment_waste_transfers`: adds constraint `valid_waste_category` allowing:
    Infectious, Sharps, Anatomical, Pharmaceutical, Cytotoxic, Clinical Glass, PVC, Other
*/

ALTER TABLE treatment_waste_transfers
  ADD CONSTRAINT valid_waste_category
  CHECK (waste_category IN (
    'Infectious',
    'Sharps',
    'Anatomical',
    'Pharmaceutical',
    'Cytotoxic',
    'Clinical Glass',
    'PVC',
    'Other'
  ));
