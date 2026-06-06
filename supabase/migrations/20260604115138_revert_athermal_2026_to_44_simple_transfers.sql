/*
  # Revert A-Thermal 2026 Waste Transfers to 44 Simple Records

  ## Summary
  Removes the 198 individual container-level records and restores the original
  44 summarised A-Thermal waste transfer records for January through May 2026.

  ## Changes
  1. DELETE all existing rows in treatment_waste_transfers where destination = 'A-Thermal'
  2. INSERT 44 summarised records matching athermal_2026_simple_transfers_with_trf.csv

  ## Notes
  - All records linked to existing treatment_daily_log entries via daily_log_id
  - transfer_type remains 'Outbound' for all records
  - Quantities are aggregated totals per manifest/waste-stream/date
*/

-- Remove all current A-Thermal records
DELETE FROM treatment_waste_transfers WHERE destination = 'A-Thermal';

-- Re-insert the 44 simple/summarised records
INSERT INTO treatment_waste_transfers
  (daily_log_id, transfer_type, waste_category, quantity_kg, destination, manifest_number)
VALUES
  -- 2026-01-05
  ('5e65f426-daf0-4d16-96dc-2d6accbff0ce', 'Outbound', 'PVC',            187.5,  'A-Thermal', 'A-0031966'),
  ('5e65f426-daf0-4d16-96dc-2d6accbff0ce', 'Outbound', 'PVC',            136,    'A-Thermal', 'A-0032332'),
  ('5e65f426-daf0-4d16-96dc-2d6accbff0ce', 'Outbound', 'PVC',            62,     'A-Thermal', 'A-0033231'),
  -- 2026-01-09
  ('07cb9222-9614-464e-b403-4bc150773c2a', 'Outbound', 'Anatomical',     1082,   'A-Thermal', 'A-0033567'),
  -- 2026-01-19
  ('487039db-234e-4567-b5ce-6315c8db5fba', 'Outbound', 'Pharmaceutical', 5.4,    'A-Thermal', 'A-0034095'),
  -- 2026-01-20
  ('b43ef38f-b280-4e10-9e7f-953ba5c4a02f', 'Outbound', 'Anatomical',     4168,   'A-Thermal', 'A-0034101'),
  ('b43ef38f-b280-4e10-9e7f-953ba5c4a02f', 'Outbound', 'PVC',            203.8,  'A-Thermal', 'A-0034310'),
  -- 2026-01-24
  ('1bb94505-9ef5-4b81-a3e4-8061c5677b4e', 'Outbound', 'Clinical Glass', 2917,   'A-Thermal', 'A-0034464'),
  -- 2026-01-26
  ('5e57304f-4d9c-4c1d-bfde-4aa4122e680b', 'Outbound', 'Anatomical',     3688,   'A-Thermal', 'A-0034337'),
  -- 2026-02-03
  ('18825171-9bfe-487e-95e2-6b0aefa1f85f', 'Outbound', 'PVC',            176.2,  'A-Thermal', 'A-0035498'),
  -- 2026-02-04
  ('53a908ff-3c5c-4fc3-b7bb-2c332551160d', 'Outbound', 'Anatomical',     2705,   'A-Thermal', 'A-0033704'),
  -- 2026-02-11
  ('8b494898-d35e-4a9e-8690-63d7bc83ebb4', 'Outbound', 'Clinical Glass', 1605,   'A-Thermal', 'A-0036178'),
  ('8b494898-d35e-4a9e-8690-63d7bc83ebb4', 'Outbound', 'Cytotoxic',      266,    'A-Thermal', 'A-0036178'),
  ('8b494898-d35e-4a9e-8690-63d7bc83ebb4', 'Outbound', 'Pharmaceutical', 1156,   'A-Thermal', 'A-0036178'),
  -- 2026-02-13
  ('4e138b72-bc03-43e1-8dcf-38c7bcc6e164', 'Outbound', 'PVC',            221,    'A-Thermal', 'A-0036382'),
  -- 2026-02-17
  ('63351c34-e1da-4612-bcc7-408b6316dad3', 'Outbound', 'Anatomical',     516,    'A-Thermal', 'A-0036684'),
  -- 2026-02-21
  ('4d9786da-5948-47e0-9099-d3484da1b0c3', 'Outbound', 'Anatomical',     3505,   'A-Thermal', 'A-0037245'),
  -- 2026-02-26
  ('edfb48ef-302e-457f-bade-53cb0da41a59', 'Outbound', 'Anatomical',     2093,   'A-Thermal', 'A-0037512'),
  -- 2026-02-27
  ('85f96879-109b-4fbf-91bc-252679ca6078', 'Outbound', 'Clinical Glass', 911,    'A-Thermal', 'A-0037937'),
  ('85f96879-109b-4fbf-91bc-252679ca6078', 'Outbound', 'Cytotoxic',      795,    'A-Thermal', 'A-0037937'),
  -- 2026-03-06
  ('3c986fc0-51db-4318-aa28-92457b438e50', 'Outbound', 'Clinical Glass', 456,    'A-Thermal', 'A-0038455'),
  ('3c986fc0-51db-4318-aa28-92457b438e50', 'Outbound', 'Cytotoxic',      737,    'A-Thermal', 'A-0038455'),
  ('3c986fc0-51db-4318-aa28-92457b438e50', 'Outbound', 'Pharmaceutical', 538,    'A-Thermal', 'A-0038455'),
  -- 2026-03-09
  ('77992adc-1243-4a8d-880c-dc1278e5370a', 'Outbound', 'Anatomical',     422,    'A-Thermal', 'A-0038234'),
  -- 2026-03-11
  ('9d54ee3f-5ec2-4f9f-bdfb-5edca0dff2c7', 'Outbound', 'PVC',            216.5,  'A-Thermal', 'A-0038157'),
  -- 2026-03-12
  ('7a1d02a2-532e-4cc4-934e-0788658d0da5', 'Outbound', 'Clinical Glass', 1603,   'A-Thermal', 'A-0037410'),
  ('7a1d02a2-532e-4cc4-934e-0788658d0da5', 'Outbound', 'Pharmaceutical', 757,    'A-Thermal', 'A-0037410'),
  -- 2026-03-17
  ('8bcab6dd-9a4a-4b89-98c6-f8b77a33ffc8', 'Outbound', 'PVC',            202.5,  'A-Thermal', 'A-0039306'),
  -- 2026-03-19
  ('5b5fcef5-a6a7-4a81-b7a4-6f714d78e98f', 'Outbound', 'Anatomical',     3704,   'A-Thermal', 'A-0039301'),
  -- 2026-03-20
  ('c48733f6-8b48-4f44-b3f6-91b19b45b377', 'Outbound', 'Pharmaceutical', 2723,   'A-Thermal', 'A-0039359'),
  -- 2026-03-28
  ('27bb5ff5-6642-4916-8438-5e03928ff172', 'Outbound', 'Anatomical',     3515,   'A-Thermal', 'A-0039873'),
  -- 2026-03-31
  ('c82c7040-d09d-49f0-81cc-af369e6b1ab8', 'Outbound', 'PVC',            193.5,  'A-Thermal', 'A-0040654'),
  -- 2026-04-02
  ('26e51467-18ad-48aa-a5d1-5633a6748f28', 'Outbound', 'Clinical Glass', 3137,   'A-Thermal', 'A-0040035'),
  -- 2026-04-07
  ('765d2c4a-05bf-453d-b95a-74c334063689', 'Outbound', 'PVC',            80,     'A-Thermal', 'A-0041097'),
  -- 2026-04-10
  ('66111511-0d44-4f8c-b873-31b213202cb8', 'Outbound', 'Clinical Glass', 2961,   'A-Thermal', 'A-0041534'),
  -- 2026-04-17
  ('9691b8d8-e1bb-4ffa-b37c-6edda4001ddc', 'Outbound', 'PVC',            214,    'A-Thermal', 'A-0042277'),
  -- 2026-04-24
  ('7c28ee60-a945-409c-ac0e-f6ec3f3fb8e6', 'Outbound', 'Clinical Glass', 2387,   'A-Thermal', 'A-0042588'),
  ('7c28ee60-a945-409c-ac0e-f6ec3f3fb8e6', 'Outbound', 'Other',          308,    'A-Thermal', 'A-0042588'),
  -- 2026-05-09
  ('71038313-a367-4fd8-8e42-436842e3a545', 'Outbound', 'Clinical Glass', 3080,   'A-Thermal', 'A-0043534'),
  -- 2026-05-13
  ('ed1999d2-4d49-48e8-abd1-bc5c915c5bc7', 'Outbound', 'PVC',            265.6,  'A-Thermal', 'A-0044261'),
  -- 2026-05-14
  ('f8229413-40c7-4247-a98a-e540076d6c63', 'Outbound', 'Clinical Glass', 1050,   'A-Thermal', 'A-0042463'),
  -- 2026-05-19
  ('221f5ce1-0609-4241-981b-f4e3cfbf2a61', 'Outbound', 'PVC',            101,    'A-Thermal', 'A-0044724'),
  -- 2026-05-22
  ('e35aa444-78c2-437a-b987-6bbc0e68e1ea', 'Outbound', 'Clinical Glass', 1751,   'A-Thermal', 'A-0044753'),
  -- 2026-05-29
  ('7c314b1b-c584-46a6-a130-01e02c1c0afb', 'Outbound', 'Anatomical',     1919,   'A-Thermal', 'A-0043401');
