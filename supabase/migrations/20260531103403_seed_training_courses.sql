/*
  # Seed Training Courses

  Populates the training_courses table with 15 realistic courses
  for a medical waste treatment facility covering safety,
  operational, regulatory, and soft skills categories.

  1. Data Seeded
    - 15 training courses across 4 categories
    - Mix of mandatory and optional courses
    - Varying validity periods (6-36 months)
    - Mix of internal and external providers

  Note: Explicit UUIDs are used so that training_records,
  training_certificates, and training_schedule seeds can
  reference them by ID.
*/

INSERT INTO training_courses (id, course_code, course_name, category, description, duration_hours, validity_months, provider, is_mandatory, status) VALUES
('ef03595b-6412-4f4b-ada1-a2573dc356bf', 'SAF-001', 'General Safety Induction', 'Safety', 'Comprehensive workplace safety orientation covering hazard identification, emergency procedures, PPE requirements, and reporting protocols.', 8, 24, 'Internal', true, 'Active'),
('1ef82aec-32b3-4b60-b913-e2ea025f976b', 'SAF-002', 'First Aid Level 1', 'Safety', 'Basic first aid including wound management, CPR, choking response, and emergency scene management.', 16, 24, 'Red Cross SA', true, 'Active'),
('02388bcd-ead8-41ea-8eaa-c82a23d32919', 'SAF-003', 'Fire Fighting & Prevention', 'Safety', 'Use of fire extinguishers, fire prevention, evacuation procedures, and emergency response.', 8, 12, 'Internal', true, 'Active'),
('faf721ef-4444-43fc-86d0-3018477953e3', 'SAF-004', 'Chemical Handling & MSDS', 'Safety', 'Safe handling, storage, and disposal of hazardous chemicals. Material Safety Data Sheet interpretation.', 4, 12, 'Internal', true, 'Active'),
('6374a10d-3b1d-4898-a00d-f2e13f5473ba', 'SAF-005', 'Working at Heights', 'Safety', 'Fall protection, harness use, ladder safety, and permit to work procedures for elevated work.', 8, 12, 'SafetyFirst Training', false, 'Active'),
('32e75475-9902-44ff-af5e-6a43c681394a', 'SAF-006', 'Lockout/Tagout (LOTO)', 'Safety', 'Energy isolation procedures for maintenance and repair of equipment.', 4, 12, 'Internal', true, 'Active'),
('2ea69930-ac3b-4a21-a5c9-01c350d7e434', 'OPS-001', 'Autoclave Operations', 'Operational', 'Safe operation of autoclave equipment including startup, loading, cycle monitoring, and shutdown procedures.', 16, 12, 'Internal', true, 'Active'),
('fa0b00ce-f769-434c-8b4b-bed3870b790a', 'OPS-002', 'Forklift Operations', 'Operational', 'Safe forklift operation, load handling, pedestrian awareness, and daily pre-use inspection.', 24, 24, 'LiftSafe Academy', false, 'Active'),
('88b68494-744b-496e-9b9b-7a4b2c30ff3e', 'OPS-003', 'Waste Segregation & Classification', 'Operational', 'Medical waste categories, colour coding, segregation at source, and packaging requirements.', 8, 12, 'Internal', true, 'Active'),
('1ed5da37-62d5-4cf7-a1ab-8af46ad6adc9', 'OPS-004', 'Defensive Driving', 'Operational', 'Advanced driving techniques, hazard perception, fatigue management for waste collection routes.', 8, 24, 'AA Driving School', false, 'Active'),
('833ac59d-114e-471d-8d0f-5c2cbdba43eb', 'REG-001', 'HCRW Regulations Awareness', 'Regulatory', 'Health Care Risk Waste regulations, legal requirements, duty of care, and compliance obligations.', 8, 12, 'IWMSA', true, 'Active'),
('c3d4e5f6-a7b8-9012-cde0-234567890123', 'REG-002', 'Environmental Compliance', 'Regulatory', 'Effluent management, air quality, noise pollution, and environmental incident reporting.', 4, 12, 'Internal', false, 'Active'),
('88345c3e-4e62-4bba-92aa-55ebf4695eaa', 'REG-003', 'OHS Act Awareness', 'Regulatory', 'Occupational Health and Safety Act requirements, employer and employee duties, incident reporting.', 8, 24, 'IRCA', true, 'Active'),
('6157c9e6-01d6-4629-b67a-a5f79445fd6b', 'SKL-001', 'Supervisor Development', 'Soft Skills', 'Leadership, communication, conflict resolution, and team management for shift supervisors.', 16, 36, 'LeadWell Consulting', false, 'Active'),
('39ea12ac-9a7e-44dd-a98b-3add2a2d23a2', 'SKL-002', 'Incident Investigation', 'Soft Skills', 'Root cause analysis, investigation techniques, evidence preservation, and corrective action development.', 8, 24, 'Internal', false, 'Active');
