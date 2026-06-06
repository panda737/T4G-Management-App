/*
  # Fix Treatment Daily Log UUIDs

  The treatment daily log seed ran with auto-generated UUIDs. The waste
  transfer seed files reference specific UUIDs by date from the original
  database. This migration sets each daily log entry's ID to the expected
  value so the waste transfer FK references work.

  The 4 preliminary waste transfers inserted by the daily log seed are
  deleted first (they will be replaced by the comprehensive waste transfer
  seed migrations that follow).
*/

DELETE FROM treatment_waste_transfers;

UPDATE treatment_daily_log SET id = '5e65f426-daf0-4d16-96dc-2d6accbff0ce' WHERE date = '2026-01-05';
UPDATE treatment_daily_log SET id = '07cb9222-9614-464e-b403-4bc150773c2a' WHERE date = '2026-01-09';
UPDATE treatment_daily_log SET id = '487039db-234e-4567-b5ce-6315c8db5fba' WHERE date = '2026-01-19';
UPDATE treatment_daily_log SET id = 'b43ef38f-b280-4e10-9e7f-953ba5c4a02f' WHERE date = '2026-01-20';
UPDATE treatment_daily_log SET id = '1bb94505-9ef5-4b81-a3e4-8061c5677b4e' WHERE date = '2026-01-24';
UPDATE treatment_daily_log SET id = '5e57304f-4d9c-4c1d-bfde-4aa4122e680b' WHERE date = '2026-01-26';
UPDATE treatment_daily_log SET id = '18825171-9bfe-487e-95e2-6b0aefa1f85f' WHERE date = '2026-02-03';
UPDATE treatment_daily_log SET id = '53a908ff-3c5c-4fc3-b7bb-2c332551160d' WHERE date = '2026-02-04';
UPDATE treatment_daily_log SET id = '8b494898-d35e-4a9e-8690-63d7bc83ebb4' WHERE date = '2026-02-11';
UPDATE treatment_daily_log SET id = '4e138b72-bc03-43e1-8dcf-38c7bcc6e164' WHERE date = '2026-02-13';
UPDATE treatment_daily_log SET id = '63351c34-e1da-4612-bcc7-408b6316dad3' WHERE date = '2026-02-17';
UPDATE treatment_daily_log SET id = '4d9786da-5948-47e0-9099-d3484da1b0c3' WHERE date = '2026-02-21';
UPDATE treatment_daily_log SET id = 'edfb48ef-302e-457f-bade-53cb0da41a59' WHERE date = '2026-02-26';
UPDATE treatment_daily_log SET id = '85f96879-109b-4fbf-91bc-252679ca6078' WHERE date = '2026-02-27';
UPDATE treatment_daily_log SET id = '3c986fc0-51db-4318-aa28-92457b438e50' WHERE date = '2026-03-06';
UPDATE treatment_daily_log SET id = '77992adc-1243-4a8d-880c-dc1278e5370a' WHERE date = '2026-03-09';
UPDATE treatment_daily_log SET id = '9d54ee3f-5ec2-4f9f-bdfb-5edca0dff2c7' WHERE date = '2026-03-11';
UPDATE treatment_daily_log SET id = '7a1d02a2-532e-4cc4-934e-0788658d0da5' WHERE date = '2026-03-12';
UPDATE treatment_daily_log SET id = '8bcab6dd-9a4a-4b89-98c6-f8b77a33ffc8' WHERE date = '2026-03-17';
UPDATE treatment_daily_log SET id = '5b5fcef5-a6a7-4a81-b7a4-6f714d78e98f' WHERE date = '2026-03-19';
UPDATE treatment_daily_log SET id = 'c48733f6-8b48-4f44-b3f6-91b19b45b377' WHERE date = '2026-03-20';
UPDATE treatment_daily_log SET id = '27bb5ff5-6642-4916-8438-5e03928ff172' WHERE date = '2026-03-28';
UPDATE treatment_daily_log SET id = 'c82c7040-d09d-49f0-81cc-af369e6b1ab8' WHERE date = '2026-03-31';
UPDATE treatment_daily_log SET id = '26e51467-18ad-48aa-a5d1-5633a6748f28' WHERE date = '2026-04-02';
UPDATE treatment_daily_log SET id = '765d2c4a-05bf-453d-b95a-74c334063689' WHERE date = '2026-04-07';
UPDATE treatment_daily_log SET id = '66111511-0d44-4f8c-b873-31b213202cb8' WHERE date = '2026-04-10';
UPDATE treatment_daily_log SET id = '9691b8d8-e1bb-4ffa-b37c-6edda4001ddc' WHERE date = '2026-04-17';
UPDATE treatment_daily_log SET id = '7c28ee60-a945-409c-ac0e-f6ec3f3fb8e6' WHERE date = '2026-04-24';
UPDATE treatment_daily_log SET id = '71038313-a367-4fd8-8e42-436842e3a545' WHERE date = '2026-05-09';
UPDATE treatment_daily_log SET id = 'ed1999d2-4d49-48e8-abd1-bc5c915c5bc7' WHERE date = '2026-05-13';
UPDATE treatment_daily_log SET id = 'f8229413-40c7-4247-a98a-e540076d6c63' WHERE date = '2026-05-14';
UPDATE treatment_daily_log SET id = '221f5ce1-0609-4241-981b-f4e3cfbf2a61' WHERE date = '2026-05-19';
UPDATE treatment_daily_log SET id = 'e35aa444-78c2-437a-b987-6bbc0e68e1ea' WHERE date = '2026-05-22';
UPDATE treatment_daily_log SET id = '7c314b1b-c584-46a6-a130-01e02c1c0afb' WHERE date = '2026-05-29';
