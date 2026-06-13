/*
  # Rename 'Averda' destination to 'Averda City Deep'

  The imported City Deep lift & weight data was loaded under destination 'Averda'.
  Rename it so the two Averda sites are clearly separated:
    - 'Averda'           -> 'Averda City Deep'
    - 'Averda Klerksdorp' (unchanged)

  Legacy A-Thermal and Holfontein records are intentionally left untouched.
  Re-runnable.
*/

UPDATE treatment_waste_transfers
SET destination = 'Averda City Deep'
WHERE destination = 'Averda';
