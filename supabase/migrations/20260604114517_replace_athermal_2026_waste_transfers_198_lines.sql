/*
  # Replace A-Thermal 2026 Waste Transfer Records

  ## Summary
  Replaces the previous 44 summarised A-Thermal transfer rows with 198 individual
  line-level records sourced from athermal_2026_transfers_198_lines_with_trf.csv.

  ## Changes
  1. DELETE all existing rows in treatment_waste_transfers where destination = 'A-Thermal'
  2. INSERT 198 new rows with individual container-level quantities, preserving all
     original manifest numbers, waste categories, and dates.

  ## Notes
  - All rows are linked to existing treatment_daily_log entries via daily_log_id
  - transfer_type remains 'Outbound' for all records
  - No daily_log entries are modified
*/

-- Remove previous A-Thermal records
DELETE FROM treatment_waste_transfers WHERE destination = 'A-Thermal';

-- Insert 198 individual records
INSERT INTO treatment_waste_transfers
  (daily_log_id, transfer_type, waste_category, quantity_kg, destination, manifest_number)
VALUES
  -- 2026-01-05 (log id: 5e65f426-daf0-4d16-96dc-2d6accbff0ce)
  ('5e65f426-daf0-4d16-96dc-2d6accbff0ce','Outbound','PVC',187.5,'A-Thermal','A-0031966'),
  ('5e65f426-daf0-4d16-96dc-2d6accbff0ce','Outbound','PVC',136.0,'A-Thermal','A-0032332'),
  ('5e65f426-daf0-4d16-96dc-2d6accbff0ce','Outbound','PVC',62.0,'A-Thermal','A-0033231'),

  -- 2026-01-09 (log id: 07cb9222-9614-464e-b403-4bc150773c2a)
  ('07cb9222-9614-464e-b403-4bc150773c2a','Outbound','Anatomical',391.0,'A-Thermal','A-0033567'),
  ('07cb9222-9614-464e-b403-4bc150773c2a','Outbound','Anatomical',377.0,'A-Thermal','A-0033567'),
  ('07cb9222-9614-464e-b403-4bc150773c2a','Outbound','Anatomical',314.0,'A-Thermal','A-0033567'),

  -- 2026-01-19 (log id: 487039db-234e-4567-b5ce-6315c8db5fba)
  ('487039db-234e-4567-b5ce-6315c8db5fba','Outbound','Pharmaceutical',5.4,'A-Thermal','A-0034095'),

  -- 2026-01-20 (log id: b43ef38f-b280-4e10-9e7f-953ba5c4a02f)
  ('b43ef38f-b280-4e10-9e7f-953ba5c4a02f','Outbound','Anatomical',213.0,'A-Thermal','A-0034101'),
  ('b43ef38f-b280-4e10-9e7f-953ba5c4a02f','Outbound','Anatomical',394.0,'A-Thermal','A-0034101'),
  ('b43ef38f-b280-4e10-9e7f-953ba5c4a02f','Outbound','Anatomical',414.0,'A-Thermal','A-0034101'),
  ('b43ef38f-b280-4e10-9e7f-953ba5c4a02f','Outbound','Anatomical',490.0,'A-Thermal','A-0034101'),
  ('b43ef38f-b280-4e10-9e7f-953ba5c4a02f','Outbound','Anatomical',540.0,'A-Thermal','A-0034101'),
  ('b43ef38f-b280-4e10-9e7f-953ba5c4a02f','Outbound','Anatomical',464.0,'A-Thermal','A-0034101'),
  ('b43ef38f-b280-4e10-9e7f-953ba5c4a02f','Outbound','Anatomical',401.0,'A-Thermal','A-0034101'),
  ('b43ef38f-b280-4e10-9e7f-953ba5c4a02f','Outbound','Anatomical',411.0,'A-Thermal','A-0034101'),
  ('b43ef38f-b280-4e10-9e7f-953ba5c4a02f','Outbound','Anatomical',369.0,'A-Thermal','A-0034101'),
  ('b43ef38f-b280-4e10-9e7f-953ba5c4a02f','Outbound','Anatomical',472.0,'A-Thermal','A-0034101'),
  ('b43ef38f-b280-4e10-9e7f-953ba5c4a02f','Outbound','PVC',43.4,'A-Thermal','A-0034310'),
  ('b43ef38f-b280-4e10-9e7f-953ba5c4a02f','Outbound','PVC',55.2,'A-Thermal','A-0034310'),
  ('b43ef38f-b280-4e10-9e7f-953ba5c4a02f','Outbound','PVC',43.2,'A-Thermal','A-0034310'),
  ('b43ef38f-b280-4e10-9e7f-953ba5c4a02f','Outbound','PVC',62.0,'A-Thermal','A-0034310'),

  -- 2026-01-24 (log id: 1bb94505-9ef5-4b81-a3e4-8061c5677b4e)
  ('1bb94505-9ef5-4b81-a3e4-8061c5677b4e','Outbound','Clinical Glass',351.0,'A-Thermal','A-0034464'),
  ('1bb94505-9ef5-4b81-a3e4-8061c5677b4e','Outbound','Clinical Glass',264.0,'A-Thermal','A-0034464'),
  ('1bb94505-9ef5-4b81-a3e4-8061c5677b4e','Outbound','Clinical Glass',326.0,'A-Thermal','A-0034464'),
  ('1bb94505-9ef5-4b81-a3e4-8061c5677b4e','Outbound','Clinical Glass',261.0,'A-Thermal','A-0034464'),
  ('1bb94505-9ef5-4b81-a3e4-8061c5677b4e','Outbound','Clinical Glass',328.0,'A-Thermal','A-0034464'),
  ('1bb94505-9ef5-4b81-a3e4-8061c5677b4e','Outbound','Clinical Glass',301.0,'A-Thermal','A-0034464'),
  ('1bb94505-9ef5-4b81-a3e4-8061c5677b4e','Outbound','Clinical Glass',476.0,'A-Thermal','A-0034464'),
  ('1bb94505-9ef5-4b81-a3e4-8061c5677b4e','Outbound','Clinical Glass',304.0,'A-Thermal','A-0034464'),
  ('1bb94505-9ef5-4b81-a3e4-8061c5677b4e','Outbound','Clinical Glass',306.0,'A-Thermal','A-0034464'),

  -- 2026-01-26 (log id: 5e57304f-4d9c-4c1d-bfde-4aa4122e680b)
  ('5e57304f-4d9c-4c1d-bfde-4aa4122e680b','Outbound','Anatomical',357.0,'A-Thermal','A-0034337'),
  ('5e57304f-4d9c-4c1d-bfde-4aa4122e680b','Outbound','Anatomical',354.0,'A-Thermal','A-0034337'),
  ('5e57304f-4d9c-4c1d-bfde-4aa4122e680b','Outbound','Anatomical',352.0,'A-Thermal','A-0034337'),
  ('5e57304f-4d9c-4c1d-bfde-4aa4122e680b','Outbound','Anatomical',343.0,'A-Thermal','A-0034337'),
  ('5e57304f-4d9c-4c1d-bfde-4aa4122e680b','Outbound','Anatomical',285.0,'A-Thermal','A-0034337'),
  ('5e57304f-4d9c-4c1d-bfde-4aa4122e680b','Outbound','Anatomical',454.0,'A-Thermal','A-0034337'),
  ('5e57304f-4d9c-4c1d-bfde-4aa4122e680b','Outbound','Anatomical',402.0,'A-Thermal','A-0034337'),
  ('5e57304f-4d9c-4c1d-bfde-4aa4122e680b','Outbound','Anatomical',306.0,'A-Thermal','A-0034337'),
  ('5e57304f-4d9c-4c1d-bfde-4aa4122e680b','Outbound','Anatomical',356.0,'A-Thermal','A-0034337'),
  ('5e57304f-4d9c-4c1d-bfde-4aa4122e680b','Outbound','Anatomical',160.0,'A-Thermal','A-0034337'),
  ('5e57304f-4d9c-4c1d-bfde-4aa4122e680b','Outbound','Anatomical',319.0,'A-Thermal','A-0034337'),

  -- 2026-02-03 (log id: 18825171-9bfe-487e-95e2-6b0aefa1f85f)
  ('18825171-9bfe-487e-95e2-6b0aefa1f85f','Outbound','PVC',49.4,'A-Thermal','A-0035498'),
  ('18825171-9bfe-487e-95e2-6b0aefa1f85f','Outbound','PVC',45.4,'A-Thermal','A-0035498'),
  ('18825171-9bfe-487e-95e2-6b0aefa1f85f','Outbound','PVC',50.2,'A-Thermal','A-0035498'),
  ('18825171-9bfe-487e-95e2-6b0aefa1f85f','Outbound','PVC',31.2,'A-Thermal','A-0035498'),

  -- 2026-02-04 (log id: 53a908ff-3c5c-4fc3-b7bb-2c332551160d)
  ('53a908ff-3c5c-4fc3-b7bb-2c332551160d','Outbound','Anatomical',351.0,'A-Thermal','A-0033704'),
  ('53a908ff-3c5c-4fc3-b7bb-2c332551160d','Outbound','Anatomical',191.0,'A-Thermal','A-0033704'),
  ('53a908ff-3c5c-4fc3-b7bb-2c332551160d','Outbound','Anatomical',323.0,'A-Thermal','A-0033704'),
  ('53a908ff-3c5c-4fc3-b7bb-2c332551160d','Outbound','Anatomical',312.0,'A-Thermal','A-0033704'),
  ('53a908ff-3c5c-4fc3-b7bb-2c332551160d','Outbound','Anatomical',376.0,'A-Thermal','A-0033704'),
  ('53a908ff-3c5c-4fc3-b7bb-2c332551160d','Outbound','Anatomical',244.0,'A-Thermal','A-0033704'),
  ('53a908ff-3c5c-4fc3-b7bb-2c332551160d','Outbound','Anatomical',272.0,'A-Thermal','A-0033704'),
  ('53a908ff-3c5c-4fc3-b7bb-2c332551160d','Outbound','Anatomical',331.0,'A-Thermal','A-0033704'),
  ('53a908ff-3c5c-4fc3-b7bb-2c332551160d','Outbound','Anatomical',305.0,'A-Thermal','A-0033704'),

  -- 2026-02-11 (log id: 8b494898-d35e-4a9e-8690-63d7bc83ebb4)
  ('8b494898-d35e-4a9e-8690-63d7bc83ebb4','Outbound','Pharmaceutical',384.0,'A-Thermal','A-0036178'),
  ('8b494898-d35e-4a9e-8690-63d7bc83ebb4','Outbound','Pharmaceutical',381.0,'A-Thermal','A-0036178'),
  ('8b494898-d35e-4a9e-8690-63d7bc83ebb4','Outbound','Pharmaceutical',391.0,'A-Thermal','A-0036178'),
  ('8b494898-d35e-4a9e-8690-63d7bc83ebb4','Outbound','Cytotoxic',266.0,'A-Thermal','A-0036178'),
  ('8b494898-d35e-4a9e-8690-63d7bc83ebb4','Outbound','Clinical Glass',316.0,'A-Thermal','A-0036178'),
  ('8b494898-d35e-4a9e-8690-63d7bc83ebb4','Outbound','Clinical Glass',340.0,'A-Thermal','A-0036178'),
  ('8b494898-d35e-4a9e-8690-63d7bc83ebb4','Outbound','Clinical Glass',428.0,'A-Thermal','A-0036178'),
  ('8b494898-d35e-4a9e-8690-63d7bc83ebb4','Outbound','Clinical Glass',203.0,'A-Thermal','A-0036178'),
  ('8b494898-d35e-4a9e-8690-63d7bc83ebb4','Outbound','Clinical Glass',318.0,'A-Thermal','A-0036178'),

  -- 2026-02-13 (log id: 4e138b72-bc03-43e1-8dcf-38c7bcc6e164)
  ('4e138b72-bc03-43e1-8dcf-38c7bcc6e164','Outbound','PVC',63.5,'A-Thermal','A-0036382'),
  ('4e138b72-bc03-43e1-8dcf-38c7bcc6e164','Outbound','PVC',91.5,'A-Thermal','A-0036382'),
  ('4e138b72-bc03-43e1-8dcf-38c7bcc6e164','Outbound','PVC',56.5,'A-Thermal','A-0036382'),
  ('4e138b72-bc03-43e1-8dcf-38c7bcc6e164','Outbound','PVC',9.5,'A-Thermal','A-0036382'),

  -- 2026-02-17 (log id: 63351c34-e1da-4612-bcc7-408b6316dad3)
  ('63351c34-e1da-4612-bcc7-408b6316dad3','Outbound','Anatomical',292.0,'A-Thermal','A-0036684'),
  ('63351c34-e1da-4612-bcc7-408b6316dad3','Outbound','Anatomical',224.0,'A-Thermal','A-0036684'),

  -- 2026-02-21 (log id: 4d9786da-5948-47e0-9099-d3484da1b0c3)
  ('4d9786da-5948-47e0-9099-d3484da1b0c3','Outbound','Anatomical',437.0,'A-Thermal','A-0037245'),
  ('4d9786da-5948-47e0-9099-d3484da1b0c3','Outbound','Anatomical',305.0,'A-Thermal','A-0037245'),
  ('4d9786da-5948-47e0-9099-d3484da1b0c3','Outbound','Anatomical',448.0,'A-Thermal','A-0037245'),
  ('4d9786da-5948-47e0-9099-d3484da1b0c3','Outbound','Anatomical',506.0,'A-Thermal','A-0037245'),
  ('4d9786da-5948-47e0-9099-d3484da1b0c3','Outbound','Anatomical',379.0,'A-Thermal','A-0037245'),
  ('4d9786da-5948-47e0-9099-d3484da1b0c3','Outbound','Anatomical',486.0,'A-Thermal','A-0037245'),
  ('4d9786da-5948-47e0-9099-d3484da1b0c3','Outbound','Anatomical',430.0,'A-Thermal','A-0037245'),
  ('4d9786da-5948-47e0-9099-d3484da1b0c3','Outbound','Anatomical',445.0,'A-Thermal','A-0037245'),
  ('4d9786da-5948-47e0-9099-d3484da1b0c3','Outbound','Anatomical',69.0,'A-Thermal','A-0037245'),

  -- 2026-02-26 (log id: edfb48ef-302e-457f-bade-53cb0da41a59)
  ('edfb48ef-302e-457f-bade-53cb0da41a59','Outbound','Anatomical',290.0,'A-Thermal','A-0037512'),
  ('edfb48ef-302e-457f-bade-53cb0da41a59','Outbound','Anatomical',206.0,'A-Thermal','A-0037512'),
  ('edfb48ef-302e-457f-bade-53cb0da41a59','Outbound','Anatomical',146.0,'A-Thermal','A-0037512'),
  ('edfb48ef-302e-457f-bade-53cb0da41a59','Outbound','Anatomical',276.0,'A-Thermal','A-0037512'),
  ('edfb48ef-302e-457f-bade-53cb0da41a59','Outbound','Anatomical',323.0,'A-Thermal','A-0037512'),
  ('edfb48ef-302e-457f-bade-53cb0da41a59','Outbound','Anatomical',279.0,'A-Thermal','A-0037512'),
  ('edfb48ef-302e-457f-bade-53cb0da41a59','Outbound','Anatomical',317.0,'A-Thermal','A-0037512'),
  ('edfb48ef-302e-457f-bade-53cb0da41a59','Outbound','Anatomical',256.0,'A-Thermal','A-0037512'),

  -- 2026-02-27 (log id: 85f96879-109b-4fbf-91bc-252679ca6078)
  ('85f96879-109b-4fbf-91bc-252679ca6078','Outbound','Cytotoxic',421.0,'A-Thermal','A-0037937'),
  ('85f96879-109b-4fbf-91bc-252679ca6078','Outbound','Cytotoxic',374.0,'A-Thermal','A-0037937'),
  ('85f96879-109b-4fbf-91bc-252679ca6078','Outbound','Clinical Glass',467.0,'A-Thermal','A-0037937'),
  ('85f96879-109b-4fbf-91bc-252679ca6078','Outbound','Clinical Glass',444.0,'A-Thermal','A-0037937'),

  -- 2026-03-06 (log id: 3c986fc0-51db-4318-aa28-92457b438e50)
  ('3c986fc0-51db-4318-aa28-92457b438e50','Outbound','Pharmaceutical',96.0,'A-Thermal','A-0038455'),
  ('3c986fc0-51db-4318-aa28-92457b438e50','Outbound','Pharmaceutical',216.0,'A-Thermal','A-0038455'),
  ('3c986fc0-51db-4318-aa28-92457b438e50','Outbound','Pharmaceutical',226.0,'A-Thermal','A-0038455'),
  ('3c986fc0-51db-4318-aa28-92457b438e50','Outbound','Clinical Glass',456.0,'A-Thermal','A-0038455'),
  ('3c986fc0-51db-4318-aa28-92457b438e50','Outbound','Cytotoxic',342.0,'A-Thermal','A-0038455'),
  ('3c986fc0-51db-4318-aa28-92457b438e50','Outbound','Cytotoxic',186.0,'A-Thermal','A-0038455'),
  ('3c986fc0-51db-4318-aa28-92457b438e50','Outbound','Cytotoxic',153.0,'A-Thermal','A-0038455'),
  ('3c986fc0-51db-4318-aa28-92457b438e50','Outbound','Cytotoxic',56.0,'A-Thermal','A-0038455'),

  -- 2026-03-09 (log id: 77992adc-1243-4a8d-880c-dc1278e5370a)
  ('77992adc-1243-4a8d-880c-dc1278e5370a','Outbound','Anatomical',208.0,'A-Thermal','A-0038234'),
  ('77992adc-1243-4a8d-880c-dc1278e5370a','Outbound','Anatomical',214.0,'A-Thermal','A-0038234'),

  -- 2026-03-11 (log id: 9d54ee3f-5ec2-4f9f-bdfb-5edca0dff2c7)
  ('9d54ee3f-5ec2-4f9f-bdfb-5edca0dff2c7','Outbound','PVC',175.5,'A-Thermal','A-0038157'),
  ('9d54ee3f-5ec2-4f9f-bdfb-5edca0dff2c7','Outbound','PVC',41.0,'A-Thermal','A-0038157'),

  -- 2026-03-12 (log id: 7a1d02a2-532e-4cc4-934e-0788658d0da5)
  ('7a1d02a2-532e-4cc4-934e-0788658d0da5','Outbound','Pharmaceutical',185.0,'A-Thermal','A-0037410'),
  ('7a1d02a2-532e-4cc4-934e-0788658d0da5','Outbound','Pharmaceutical',187.0,'A-Thermal','A-0037410'),
  ('7a1d02a2-532e-4cc4-934e-0788658d0da5','Outbound','Pharmaceutical',212.0,'A-Thermal','A-0037410'),
  ('7a1d02a2-532e-4cc4-934e-0788658d0da5','Outbound','Pharmaceutical',173.0,'A-Thermal','A-0037410'),
  ('7a1d02a2-532e-4cc4-934e-0788658d0da5','Outbound','Clinical Glass',446.0,'A-Thermal','A-0037410'),
  ('7a1d02a2-532e-4cc4-934e-0788658d0da5','Outbound','Clinical Glass',346.0,'A-Thermal','A-0037410'),
  ('7a1d02a2-532e-4cc4-934e-0788658d0da5','Outbound','Clinical Glass',365.0,'A-Thermal','A-0037410'),
  ('7a1d02a2-532e-4cc4-934e-0788658d0da5','Outbound','Clinical Glass',446.0,'A-Thermal','A-0037410'),

  -- 2026-03-17 (log id: 8bcab6dd-9a4a-4b89-98c6-f8b77a33ffc8)
  ('8bcab6dd-9a4a-4b89-98c6-f8b77a33ffc8','Outbound','PVC',44.5,'A-Thermal','A-0039306'),
  ('8bcab6dd-9a4a-4b89-98c6-f8b77a33ffc8','Outbound','PVC',54.0,'A-Thermal','A-0039306'),
  ('8bcab6dd-9a4a-4b89-98c6-f8b77a33ffc8','Outbound','PVC',53.5,'A-Thermal','A-0039306'),
  ('8bcab6dd-9a4a-4b89-98c6-f8b77a33ffc8','Outbound','PVC',50.5,'A-Thermal','A-0039306'),

  -- 2026-03-19 (log id: 5b5fcef5-a6a7-4a81-b7a4-6f714d78e98f)
  ('5b5fcef5-a6a7-4a81-b7a4-6f714d78e98f','Outbound','Anatomical',371.0,'A-Thermal','A-0039301'),
  ('5b5fcef5-a6a7-4a81-b7a4-6f714d78e98f','Outbound','Anatomical',422.0,'A-Thermal','A-0039301'),
  ('5b5fcef5-a6a7-4a81-b7a4-6f714d78e98f','Outbound','Anatomical',419.0,'A-Thermal','A-0039301'),
  ('5b5fcef5-a6a7-4a81-b7a4-6f714d78e98f','Outbound','Anatomical',509.0,'A-Thermal','A-0039301'),
  ('5b5fcef5-a6a7-4a81-b7a4-6f714d78e98f','Outbound','Anatomical',509.0,'A-Thermal','A-0039301'),
  ('5b5fcef5-a6a7-4a81-b7a4-6f714d78e98f','Outbound','Anatomical',499.0,'A-Thermal','A-0039301'),
  ('5b5fcef5-a6a7-4a81-b7a4-6f714d78e98f','Outbound','Anatomical',454.0,'A-Thermal','A-0039301'),
  ('5b5fcef5-a6a7-4a81-b7a4-6f714d78e98f','Outbound','Anatomical',467.0,'A-Thermal','A-0039301'),
  ('5b5fcef5-a6a7-4a81-b7a4-6f714d78e98f','Outbound','Anatomical',54.0,'A-Thermal','A-0039301'),

  -- 2026-03-20 (log id: c48733f6-8b48-4f44-b3f6-91b19b45b377)
  ('c48733f6-8b48-4f44-b3f6-91b19b45b377','Outbound','Pharmaceutical',433.0,'A-Thermal','A-0039359'),
  ('c48733f6-8b48-4f44-b3f6-91b19b45b377','Outbound','Pharmaceutical',433.0,'A-Thermal','A-0039359'),
  ('c48733f6-8b48-4f44-b3f6-91b19b45b377','Outbound','Pharmaceutical',385.0,'A-Thermal','A-0039359'),
  ('c48733f6-8b48-4f44-b3f6-91b19b45b377','Outbound','Pharmaceutical',460.0,'A-Thermal','A-0039359'),
  ('c48733f6-8b48-4f44-b3f6-91b19b45b377','Outbound','Pharmaceutical',309.0,'A-Thermal','A-0039359'),
  ('c48733f6-8b48-4f44-b3f6-91b19b45b377','Outbound','Pharmaceutical',339.0,'A-Thermal','A-0039359'),
  ('c48733f6-8b48-4f44-b3f6-91b19b45b377','Outbound','Pharmaceutical',364.0,'A-Thermal','A-0039359'),

  -- 2026-03-28 (log id: 27bb5ff5-6642-4916-8438-5e03928ff172)
  ('27bb5ff5-6642-4916-8438-5e03928ff172','Outbound','Anatomical',398.0,'A-Thermal','A-0039873'),
  ('27bb5ff5-6642-4916-8438-5e03928ff172','Outbound','Anatomical',560.0,'A-Thermal','A-0039873'),
  ('27bb5ff5-6642-4916-8438-5e03928ff172','Outbound','Anatomical',504.0,'A-Thermal','A-0039873'),
  ('27bb5ff5-6642-4916-8438-5e03928ff172','Outbound','Anatomical',414.0,'A-Thermal','A-0039873'),
  ('27bb5ff5-6642-4916-8438-5e03928ff172','Outbound','Anatomical',442.0,'A-Thermal','A-0039873'),
  ('27bb5ff5-6642-4916-8438-5e03928ff172','Outbound','Anatomical',433.0,'A-Thermal','A-0039873'),
  ('27bb5ff5-6642-4916-8438-5e03928ff172','Outbound','Anatomical',462.0,'A-Thermal','A-0039873'),
  ('27bb5ff5-6642-4916-8438-5e03928ff172','Outbound','Anatomical',302.0,'A-Thermal','A-0039873'),

  -- 2026-03-31 (log id: c82c7040-d09d-49f0-81cc-af369e6b1ab8)
  ('c82c7040-d09d-49f0-81cc-af369e6b1ab8','Outbound','PVC',80.0,'A-Thermal','A-0040654'),
  ('c82c7040-d09d-49f0-81cc-af369e6b1ab8','Outbound','PVC',82.5,'A-Thermal','A-0040654'),
  ('c82c7040-d09d-49f0-81cc-af369e6b1ab8','Outbound','PVC',31.0,'A-Thermal','A-0040654'),

  -- 2026-04-02 (log id: 26e51467-18ad-48aa-a5d1-5633a6748f28)
  ('26e51467-18ad-48aa-a5d1-5633a6748f28','Outbound','Clinical Glass',325.0,'A-Thermal','A-0040035'),
  ('26e51467-18ad-48aa-a5d1-5633a6748f28','Outbound','Clinical Glass',310.0,'A-Thermal','A-0040035'),
  ('26e51467-18ad-48aa-a5d1-5633a6748f28','Outbound','Clinical Glass',460.0,'A-Thermal','A-0040035'),
  ('26e51467-18ad-48aa-a5d1-5633a6748f28','Outbound','Clinical Glass',313.0,'A-Thermal','A-0040035'),
  ('26e51467-18ad-48aa-a5d1-5633a6748f28','Outbound','Clinical Glass',319.0,'A-Thermal','A-0040035'),
  ('26e51467-18ad-48aa-a5d1-5633a6748f28','Outbound','Clinical Glass',464.0,'A-Thermal','A-0040035'),
  ('26e51467-18ad-48aa-a5d1-5633a6748f28','Outbound','Clinical Glass',472.0,'A-Thermal','A-0040035'),
  ('26e51467-18ad-48aa-a5d1-5633a6748f28','Outbound','Clinical Glass',474.0,'A-Thermal','A-0040035'),

  -- 2026-04-07 (log id: 765d2c4a-05bf-453d-b95a-74c334063689)
  ('765d2c4a-05bf-453d-b95a-74c334063689','Outbound','PVC',40.5,'A-Thermal','A-0041097'),
  ('765d2c4a-05bf-453d-b95a-74c334063689','Outbound','PVC',39.5,'A-Thermal','A-0041097'),

  -- 2026-04-10 (log id: 66111511-0d44-4f8c-b873-31b213202cb8)
  ('66111511-0d44-4f8c-b873-31b213202cb8','Outbound','Clinical Glass',420.0,'A-Thermal','A-0041534'),
  ('66111511-0d44-4f8c-b873-31b213202cb8','Outbound','Clinical Glass',318.0,'A-Thermal','A-0041534'),
  ('66111511-0d44-4f8c-b873-31b213202cb8','Outbound','Clinical Glass',424.0,'A-Thermal','A-0041534'),
  ('66111511-0d44-4f8c-b873-31b213202cb8','Outbound','Clinical Glass',294.0,'A-Thermal','A-0041534'),
  ('66111511-0d44-4f8c-b873-31b213202cb8','Outbound','Clinical Glass',313.0,'A-Thermal','A-0041534'),
  ('66111511-0d44-4f8c-b873-31b213202cb8','Outbound','Clinical Glass',262.0,'A-Thermal','A-0041534'),
  ('66111511-0d44-4f8c-b873-31b213202cb8','Outbound','Clinical Glass',371.0,'A-Thermal','A-0041534'),
  ('66111511-0d44-4f8c-b873-31b213202cb8','Outbound','Clinical Glass',234.0,'A-Thermal','A-0041534'),
  ('66111511-0d44-4f8c-b873-31b213202cb8','Outbound','Clinical Glass',325.0,'A-Thermal','A-0041534'),

  -- 2026-04-17 (log id: 9691b8d8-e1bb-4ffa-b37c-6edda4001ddc)
  ('9691b8d8-e1bb-4ffa-b37c-6edda4001ddc','Outbound','PVC',129.5,'A-Thermal','A-0042277'),
  ('9691b8d8-e1bb-4ffa-b37c-6edda4001ddc','Outbound','PVC',84.5,'A-Thermal','A-0042277'),

  -- 2026-04-24 (log id: 7c28ee60-a945-409c-ac0e-f6ec3f3fb8e6)
  ('7c28ee60-a945-409c-ac0e-f6ec3f3fb8e6','Outbound','Clinical Glass',352.0,'A-Thermal','A-0042588'),
  ('7c28ee60-a945-409c-ac0e-f6ec3f3fb8e6','Outbound','Clinical Glass',321.0,'A-Thermal','A-0042588'),
  ('7c28ee60-a945-409c-ac0e-f6ec3f3fb8e6','Outbound','Clinical Glass',443.0,'A-Thermal','A-0042588'),
  ('7c28ee60-a945-409c-ac0e-f6ec3f3fb8e6','Outbound','Clinical Glass',326.0,'A-Thermal','A-0042588'),
  ('7c28ee60-a945-409c-ac0e-f6ec3f3fb8e6','Outbound','Clinical Glass',470.0,'A-Thermal','A-0042588'),
  ('7c28ee60-a945-409c-ac0e-f6ec3f3fb8e6','Outbound','Clinical Glass',475.0,'A-Thermal','A-0042588'),
  ('7c28ee60-a945-409c-ac0e-f6ec3f3fb8e6','Outbound','Other',156.0,'A-Thermal','A-0042588'),
  ('7c28ee60-a945-409c-ac0e-f6ec3f3fb8e6','Outbound','Other',152.0,'A-Thermal','A-0042588'),

  -- 2026-05-09 (log id: 71038313-a367-4fd8-8e42-436842e3a545)
  ('71038313-a367-4fd8-8e42-436842e3a545','Outbound','Clinical Glass',434.0,'A-Thermal','A-0043534'),
  ('71038313-a367-4fd8-8e42-436842e3a545','Outbound','Clinical Glass',357.0,'A-Thermal','A-0043534'),
  ('71038313-a367-4fd8-8e42-436842e3a545','Outbound','Clinical Glass',349.0,'A-Thermal','A-0043534'),
  ('71038313-a367-4fd8-8e42-436842e3a545','Outbound','Clinical Glass',413.0,'A-Thermal','A-0043534'),
  ('71038313-a367-4fd8-8e42-436842e3a545','Outbound','Clinical Glass',464.0,'A-Thermal','A-0043534'),
  ('71038313-a367-4fd8-8e42-436842e3a545','Outbound','Clinical Glass',307.0,'A-Thermal','A-0043534'),
  ('71038313-a367-4fd8-8e42-436842e3a545','Outbound','Clinical Glass',417.0,'A-Thermal','A-0043534'),
  ('71038313-a367-4fd8-8e42-436842e3a545','Outbound','Clinical Glass',339.0,'A-Thermal','A-0043534'),

  -- 2026-05-13 (log id: ed1999d2-4d49-48e8-abd1-bc5c915c5bc7)
  ('ed1999d2-4d49-48e8-abd1-bc5c915c5bc7','Outbound','PVC',45.6,'A-Thermal','A-0044261'),
  ('ed1999d2-4d49-48e8-abd1-bc5c915c5bc7','Outbound','PVC',52.6,'A-Thermal','A-0044261'),
  ('ed1999d2-4d49-48e8-abd1-bc5c915c5bc7','Outbound','PVC',46.0,'A-Thermal','A-0044261'),
  ('ed1999d2-4d49-48e8-abd1-bc5c915c5bc7','Outbound','PVC',45.0,'A-Thermal','A-0044261'),
  ('ed1999d2-4d49-48e8-abd1-bc5c915c5bc7','Outbound','PVC',36.6,'A-Thermal','A-0044261'),
  ('ed1999d2-4d49-48e8-abd1-bc5c915c5bc7','Outbound','PVC',39.8,'A-Thermal','A-0044261'),

  -- 2026-05-14 (log id: f8229413-40c7-4247-a98a-e540076d6c63)
  ('f8229413-40c7-4247-a98a-e540076d6c63','Outbound','Clinical Glass',421.0,'A-Thermal','A-0042463'),
  ('f8229413-40c7-4247-a98a-e540076d6c63','Outbound','Clinical Glass',311.0,'A-Thermal','A-0042463'),
  ('f8229413-40c7-4247-a98a-e540076d6c63','Outbound','Clinical Glass',318.0,'A-Thermal','A-0042463'),

  -- 2026-05-19 (log id: 221f5ce1-0609-4241-981b-f4e3cfbf2a61)
  ('221f5ce1-0609-4241-981b-f4e3cfbf2a61','Outbound','PVC',101.0,'A-Thermal','A-0044724'),

  -- 2026-05-22 (log id: e35aa444-78c2-437a-b987-6bbc0e68e1ea)
  ('e35aa444-78c2-437a-b987-6bbc0e68e1ea','Outbound','Clinical Glass',430.0,'A-Thermal','A-0044753'),
  ('e35aa444-78c2-437a-b987-6bbc0e68e1ea','Outbound','Clinical Glass',432.0,'A-Thermal','A-0044753'),
  ('e35aa444-78c2-437a-b987-6bbc0e68e1ea','Outbound','Clinical Glass',471.0,'A-Thermal','A-0044753'),
  ('e35aa444-78c2-437a-b987-6bbc0e68e1ea','Outbound','Clinical Glass',418.0,'A-Thermal','A-0044753'),

  -- 2026-05-29 (log id: 7c314b1b-c584-46a6-a130-01e02c1c0afb)
  ('7c314b1b-c584-46a6-a130-01e02c1c0afb','Outbound','Anatomical',282.0,'A-Thermal','A-0043401'),
  ('7c314b1b-c584-46a6-a130-01e02c1c0afb','Outbound','Anatomical',293.0,'A-Thermal','A-0043401'),
  ('7c314b1b-c584-46a6-a130-01e02c1c0afb','Outbound','Anatomical',351.0,'A-Thermal','A-0043401'),
  ('7c314b1b-c584-46a6-a130-01e02c1c0afb','Outbound','Anatomical',355.0,'A-Thermal','A-0043401'),
  ('7c314b1b-c584-46a6-a130-01e02c1c0afb','Outbound','Anatomical',253.0,'A-Thermal','A-0043401'),
  ('7c314b1b-c584-46a6-a130-01e02c1c0afb','Outbound','Anatomical',385.0,'A-Thermal','A-0043401');
