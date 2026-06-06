/*
  # Fix Employee UUIDs

  The employee seed ran with auto-generated UUIDs. Training records,
  certificates, and safety seeds reference specific UUIDs from the
  original database. This migration sets each employee's ID to the
  correct value so cross-table references work.

  No foreign keys point to employees yet at the time this runs,
  so primary key updates are safe.
*/

UPDATE employees SET id = '73ff46b1-f671-40c0-9a68-f37615263bc0' WHERE employee_number = 'MAR001';
UPDATE employees SET id = 'e5fa92cb-ba1b-4099-8888-fcefb9ec597c' WHERE employee_number = 'MAC001';
UPDATE employees SET id = 'eed68390-0030-4d05-964d-884d91e5353d' WHERE employee_number = 'JIY001';
UPDATE employees SET id = 'e3451997-8751-4408-be3d-b1aa65932219' WHERE employee_number = 'MUD001';
UPDATE employees SET id = '86962ace-9d4f-4140-9d59-a708a43dc654' WHERE employee_number = 'TAL001';
UPDATE employees SET id = '4db4338a-0b20-4a5f-b756-fc2ad5918042' WHERE employee_number = 'SHA001';
UPDATE employees SET id = 'c2d3e4f5-a6b7-8902-cd03-012345678902' WHERE employee_number = 'SKH001';
UPDATE employees SET id = 'd3e4f5a6-b7c8-9013-de04-123456789013' WHERE employee_number = 'RAM001';
UPDATE employees SET id = 'e4f5a6b7-c8d9-0124-ef05-234567890124' WHERE employee_number = 'MAT001';
UPDATE employees SET id = '5168c866-7b7f-4e50-82b5-a9754b2402b1' WHERE employee_number = 'MAH001';
UPDATE employees SET id = '4dd5b1d5-ec1e-4b57-a6db-1eda258016ed' WHERE employee_number = 'MAS001';
UPDATE employees SET id = 'f5a6b7c8-d9e0-1235-f006-345678901235' WHERE employee_number = 'RAP001';
UPDATE employees SET id = 'a6b7c8d9-e0f1-2346-a117-456789012346' WHERE employee_number = 'MPH001';
UPDATE employees SET id = '7b4b988e-a41e-49af-b8e0-8e65da9cbe32' WHERE employee_number = 'MAC002';
UPDATE employees SET id = 'fd2f9cdf-8b3a-4a16-8ac5-d30f407ca6ea' WHERE employee_number = 'BAN001';
UPDATE employees SET id = '4d8cd1e3-00ca-4f0d-ae74-9a0154315c8b' WHERE employee_number = 'SEO001';
UPDATE employees SET id = 'e964eeb3-9f65-4c9b-a80a-a352c85694b0' WHERE employee_number = 'MBA001';
UPDATE employees SET id = 'a7e2b7c5-00ea-4be9-b2a3-b56871ef5b23' WHERE employee_number = 'MAK001';
UPDATE employees SET id = 'b7c8d9e0-f1a2-3457-b228-567890123457' WHERE employee_number = 'SHO001';
UPDATE employees SET id = 'c8d9e0f1-a2b3-4568-c339-678901234568' WHERE employee_number = 'SIT001';
UPDATE employees SET id = 'd9e0f1a2-b3c4-5679-d44a-789012345679' WHERE employee_number = 'MAM001';
UPDATE employees SET id = 'e0f1a2b3-c4d5-678a-e55b-890123456789' WHERE employee_number = 'MAR002';
UPDATE employees SET id = 'f1a2b3c4-d5e6-789b-f66c-901234567890' WHERE employee_number = 'MAJ001';
UPDATE employees SET id = '2961b45c-3572-43e7-94fc-a17427fe164b' WHERE employee_number = 'COM001';
UPDATE employees SET id = 'b059ec2c-7c6c-45bd-9fe0-ee1b8aec834d' WHERE employee_number = 'LET001';
UPDATE employees SET id = '88882a16-5f7d-4c69-9fce-ff6d5fbadb7c' WHERE employee_number = 'SAL001';
UPDATE employees SET id = '2cf90d04-c2c4-466b-9f2e-ebff45607a2a' WHERE employee_number = 'DLA001';
UPDATE employees SET id = '2feebfa1-8608-4e9c-b5e6-8783b431a66c' WHERE employee_number = 'CLA001';
UPDATE employees SET id = '2d01fc00-46f5-499a-a19e-a063bb66b2b3' WHERE employee_number = 'RAS001';
UPDATE employees SET id = '68d3a50f-876b-45a0-8d11-092f3ae2dfba' WHERE employee_number = 'LET002';
UPDATE employees SET id = 'fbf6d99e-7cc5-4e15-be65-789a1b490566' WHERE employee_number = 'CHA001';
UPDATE employees SET id = 'a2b3c4d5-e6f7-890c-a77d-012345678901' WHERE employee_number = 'MAL001';
UPDATE employees SET id = '3adb4bbf-7410-4a97-a26e-bd96a5e63f46' WHERE employee_number = 'MAH002';
UPDATE employees SET id = 'b3c4d5e6-f7a8-901d-b88e-123456789012' WHERE employee_number = 'NXA001';
UPDATE employees SET id = '1e06a959-87e5-48d5-b6d6-1a34d02c4b1e' WHERE employee_number = 'RAT001';
UPDATE employees SET id = 'd135d8d4-9691-4000-899e-53de67712ad9' WHERE employee_number = 'NGO001';
UPDATE employees SET id = '7e1cbffb-3db3-4906-82a6-e34eda163424' WHERE employee_number = 'MAH003';
UPDATE employees SET id = 'c4d5e6f7-a8b9-012e-c99f-234567890123' WHERE employee_number = 'MOL001';
UPDATE employees SET id = 'c38fd662-6eb3-418f-9619-f3601d8ca059' WHERE employee_number = 'MAH004';
