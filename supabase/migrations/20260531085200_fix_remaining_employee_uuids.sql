/*
  # Fix remaining employee UUIDs

  Two employees (SHA001, MUD001) had placeholder UUIDs assigned in the
  previous fix. This corrects them to the values the training seed expects.
*/

UPDATE employees SET id = 'e3451997-8751-4408-be3d-b1aa65932219' WHERE employee_number = 'MUD001';
UPDATE employees SET id = '4db4338a-0b20-4a5f-b756-fc2ad5918042' WHERE employee_number = 'SHA001';
