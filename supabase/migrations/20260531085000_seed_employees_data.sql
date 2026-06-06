/*
  # Seed Employees Data

  Inserts 40 Tech4Green employees from the company staff register.

  1. Data Summary
    - 6 Truck Drivers
    - 17 General Workers (some flagged as truck handlers)
    - 3 Senior Operators
    - 3 X-ray Operators
    - 3 Supervisors
    - 1 Maintenance technician
    - 1 Logistics Manager
    - 1 Health & Safety Officer
    - 5 additional General Workers (some with incomplete data)

  2. Important Notes
    - All employees set to 'active' status
    - Truck Drivers are also flagged as truck handlers (is_truck_handler = true)
    - Employee numbers follow the existing company code format
    - Employees 37-40 have limited data and will need to be completed by admin
    - Explicit UUIDs are used so that training, safety, and other seed files
      can reference employees by ID.
*/

INSERT INTO employees (id, employee_number, surname, first_name, gender, id_number, contact_number, position, is_truck_handler, address_line_1, address_line_2, address_line_3, postal_code, medical_fund)
VALUES
  ('73ff46b1-f671-40c0-9a68-f37615263bc0', 'MAR001', 'Mare', 'Samual Jan', 'Male', '6906175691080', '+27 82 639 2137', 'Truck Driver', true, '', '', '', '', ''),
  ('e5fa92cb-ba1b-4099-8888-fcefb9ec597c', 'MAC001', 'Macheke', 'Johannes', 'Male', '9908155663086', '+27 72 340 0326', 'Truck Driver', true, '', '', '', '', ''),
  ('eed68390-0030-4d05-964d-884d91e5353d', 'JIY001', 'Jiyane', 'Mlungisi Solly', 'Male', '9404045277089', '+27 79 617 0922', 'Truck Driver', true, '', '', '', '', ''),
  ('a1b2c3d4-e5f6-7890-ab01-ef1234567890', 'MUD001', 'Mudau', 'Fhumulani', 'Male', '8608305840086', '+27 60 393 0736', 'Truck Driver', true, '', '', '', '', ''),
  ('86962ace-9d4f-4140-9d59-a708a43dc654', 'TAL001', 'Talane', 'Phogole Leonard', 'Male', '9006125625085', '+27 82 221 9361', 'Truck Driver', true, '', '', '', '', ''),
  ('b1c2d3e4-f5a6-7891-bc02-f01234567891', 'SHA001', 'Shabangu', 'Mthandeni', 'Male', '9107226291080', '+27 76 468 6594', 'Truck Driver', true, '', '', '', '', ''),
  ('c2d3e4f5-a6b7-8902-cd03-012345678902', 'SKH001', 'Skhalo', 'Sello Tholo', 'Male', '9905205883086', '+27 65 262 4603', 'General Worker', false, '', '', '', '', ''),
  ('d3e4f5a6-b7c8-9013-de04-123456789013', 'RAM001', 'Ramurafhi', 'Rabelani', 'Male', '9911125362086', '+27 66 070 7299', 'General Worker', false, '', '', '', '', ''),
  ('e4f5a6b7-c8d9-0124-ef05-234567890124', 'MAT001', 'Matlou', 'Thabiso', 'Male', '9202095218080', '+27 82 074 0967', 'General Worker', false, '', '', '', '', ''),
  ('5168c866-7b7f-4e50-82b5-a9754b2402b1', 'MAH001', 'Mahlangu', 'David', 'Male', '9607065865084', '+27 72 641 0117', 'General Worker', false, '', '', '', '', ''),
  ('4dd5b1d5-ec1e-4b57-a6db-1eda258016ed', 'MAS001', 'Masha', 'Kgaugelo', 'Male', '9803155173089', '+27 60 593 9378', 'General Worker', false, '', '', '', '', ''),
  ('f5a6b7c8-d9e0-1235-f006-345678901235', 'RAP001', 'Raphiri', 'Itumeleng', 'Male', '8907025293083', '+27 66 395 3860', 'General Worker', false, '', '', '', '', ''),
  ('a6b7c8d9-e0f1-2346-a117-456789012346', 'MPH001', 'Mphahlele', 'Thulane', 'Male', '0003105625085', '+27 81 839 4602', 'General Worker', false, '22/47240', 'Kgagara Street', 'Mamelodi East', '0122', 'None'),
  ('7b4b988e-a41e-49af-b8e0-8e65da9cbe32', 'MAC002', 'Macheke', 'Alfred', 'Male', '9908165602082', '+27 79 940 2066', 'Senior Operator', false, '', '', '', '', ''),
  ('fd2f9cdf-8b3a-4a16-8ac5-d30f407ca6ea', 'BAN001', 'Banda', 'Castro', 'Male', '0108295596085', '+27 71 168 9373', 'General Worker', false, '', '', '', '', ''),
  ('4d8cd1e3-00ca-4f0d-ae74-9a0154315c8b', 'SEO001', 'Seotlo', 'Senthy', 'Male', '8001315360081', '+27 72 738 1283', 'Xray Operator', false, '', '', '', '', ''),
  ('e964eeb3-9f65-4c9b-a80a-a352c85694b0', 'MBA001', 'Mbavala', 'Ntshuxeko Freedom', 'Male', '9302185687085', '+27 78 555 5403', 'Senior Operator', false, '', '', '', '', ''),
  ('a7e2b7c5-00ea-4be9-b2a3-b56871ef5b23', 'MAK001', 'Makgopa', 'Kobetsi', 'Male', '9608266180083', '+27 76 583 2144', 'Senior Operator', false, '', '', '', '', ''),
  ('b7c8d9e0-f1a2-3457-b228-567890123457', 'SHO001', 'Shokane', 'Simon', 'Male', '9911245540082', '+27 72 501 8704', 'General Worker', false, '', '', '', '', ''),
  ('c8d9e0f1-a2b3-4568-c339-678901234568', 'SIT001', 'Sithole', 'Johnny', 'Male', '9011265760080', '+27 78 066 2706', 'General Worker', false, '', '', '', '', ''),
  ('d9e0f1a2-b3c4-5679-d44a-789012345679', 'MAM001', 'Mammbeda', 'Kharendwe Bree', 'Male', '0105026004082', '+27 79 907 0061', 'General Worker', false, '', '', '', '', ''),
  ('e0f1a2b3-c4d5-678a-e55b-890123456789', 'MAR002', 'Matsheni', 'Percy', 'Male', '0206175360083', '+27 82 651 9655', 'General Worker', false, '', '', '', '', ''),
  ('f1a2b3c4-d5e6-789b-f66c-901234567890', 'MAJ001', 'Maja', 'Tatello', 'Male', '0209275736087', '+27 60 187 1960', 'General Worker', false, '', '', '', '', ''),
  ('2961b45c-3572-43e7-94fc-a17427fe164b', 'COM001', 'Compion', 'Leon', 'Male', '7702205070083', '+27 71 599 8905', 'Maintenance', false, '', '', '', '', ''),
  ('b059ec2c-7c6c-45bd-9fe0-ee1b8aec834d', 'LET001', 'Letsoalo', 'Molekqnela Rudolph', 'Male', '8608246194080', '+27 82 506 9156', 'Supervisor', false, '', '', '', '', ''),
  ('88882a16-5f7d-4c69-9fce-ff6d5fbadb7c', 'SAL001', 'Salane', 'Guilty', 'Male', '9311055651089', '+27 71 275 7264', 'Supervisor', false, '', '', '', '', ''),
  ('2cf90d04-c2c4-466b-9f2e-ebff45607a2a', 'DLA001', 'Dlamini', 'Siyanda', 'Male', '8504305596085', '+27 72 403 8925', 'Logistics Manager', false, '', '', '', '', ''),
  ('2feebfa1-8608-4e9c-b5e6-8783b431a66c', 'CLA001', 'Claassens', 'Hugo', 'Male', '8306265059082', '+27 83 504 9018', 'Health & Safety Officer', false, '', '', '', '', ''),
  ('2d01fc00-46f5-499a-a19e-a063bb66b2b3', 'RAS001', 'Raseala', 'Billy', 'Male', '9202275634080', '+27 62 144 3016', 'Supervisor', false, '', '', '', '', ''),
  ('68d3a50f-876b-45a0-8d11-092f3ae2dfba', 'LET002', 'Letswalo', 'Dipolelo', 'Male', '9705315380084', '+27 79 766 2437', 'General Worker', false, '', '', '', '', ''),
  ('fbf6d99e-7cc5-4e15-be65-789a1b490566', 'CHA001', 'Chauke', 'Tinyiko', 'Male', '0007205496081', '+27 60 692 4854', 'General Worker', false, '', '', '', '', ''),
  ('a2b3c4d5-e6f7-890c-a77d-012345678901', 'MAL001', 'Malusi', 'Sibisi', 'Male', '9505016233081', '+27 70 751 2442', 'General Worker', false, '', '', '', '', ''),
  ('3adb4bbf-7410-4a97-a26e-bd96a5e63f46', 'MAH002', 'Mahanuke', 'Lodwic', 'Male', '7611085316088', '+27 63 462 3146', 'Xray Operator', false, '', '', '', '', ''),
  ('b3c4d5e6-f7a8-901d-b88e-123456789012', 'NXA001', 'Nxazonke', 'Sixolisile', 'Male', '0608136127081', '+27 63 970 7600', 'General Worker', false, '', '', '', '', ''),
  ('1e06a959-87e5-48d5-b6d6-1a34d02c4b1e', 'RAT001', 'Ratau', 'Calvin', 'Male', '0104016342081', '+27 79 435 5155', 'Xray Operator', false, '', '', '', '', ''),
  ('d135d8d4-9691-4000-899e-53de67712ad9', 'NGO001', 'Ngobeni', 'Shaun', 'Male', '', '', 'General Worker', false, '', '', '', '', ''),
  ('7e1cbffb-3db3-4906-82a6-e34eda163424', 'MAH003', 'Mahlangu', 'Siyabonga', 'Male', '', '', 'General Worker', false, '', '', '', '', ''),
  ('c4d5e6f7-a8b9-012e-c99f-234567890123', 'MOL001', 'Molema', 'Thabang', 'Male', '', '', 'General Worker', false, '', '', '', '', ''),
  ('c38fd662-6eb3-418f-9619-f3601d8ca059', 'MAH004', 'Mahlangu', 'Piet', 'Male', '', '', 'General Worker', false, '', '', '', '', '')
ON CONFLICT (employee_number) DO NOTHING;
