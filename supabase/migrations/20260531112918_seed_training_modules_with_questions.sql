/*
  # Seed Training Modules with Multiple-Choice Questions

  Creates 6 mandatory training modules covering key safety topics
  for a medical waste treatment facility. Each module has 6-8
  multiple-choice questions with explanations. Pass mark is 90%.

  Modules:
  1. PPE Fundamentals (8 questions)
  2. Chemical Safety - Peracetic Acid (8 questions)
  3. Fire Safety Essentials (7 questions)
  4. Incident Reporting (6 questions)
  5. Biological Hazards & Infection Control (8 questions)
  6. Manual Handling & Lifting (6 questions)
*/

-- Module 1: PPE Fundamentals
INSERT INTO training_modules (id, category, subcategory, title, description, content, pass_mark, estimated_minutes, is_mandatory, status)
VALUES (
  'a1000000-0000-0000-0000-000000000001',
  'PPE', 'General', 'PPE Fundamentals',
  'Comprehensive training on selecting, inspecting, and using Personal Protective Equipment correctly.',
  'Personal Protective Equipment (PPE) is the last line of defence in the hierarchy of controls. This module covers the types of PPE used at the treatment facility, when each type is required, how to inspect PPE before use, and the legal requirements under the OHS Act. Topics include: gloves (nitrile, cut-resistant), eye protection (safety glasses vs chemical goggles), respiratory protection (N95 vs half-face respirators), protective clothing, and hearing protection.',
  90, 20, true, 'Active'
);

INSERT INTO training_module_questions (module_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, sort_order) VALUES
('a1000000-0000-0000-0000-000000000001', 'PPE is considered which level in the hierarchy of controls?', 'First line of defence', 'Last line of defence', 'Second line of defence', 'It is not part of the hierarchy', 'B', 'PPE is the last line of defence. Engineering controls, administrative controls, and elimination/substitution should be considered first.', 1),
('a1000000-0000-0000-0000-000000000001', 'Which type of gloves must be used when handling peracetic acid?', 'Latex gloves', 'Cotton gloves', 'Nitrile chemical-resistant gloves', 'Leather gloves', 'C', 'Nitrile gloves provide chemical resistance against peracetic acid. Latex alone is insufficient for chemical handling.', 2),
('a1000000-0000-0000-0000-000000000001', 'What type of eye protection is required for chemical splash hazards?', 'Standard safety glasses', 'Chemical splash goggles', 'Sunglasses', 'A face shield alone', 'B', 'Chemical splash goggles provide a seal around the eyes to prevent liquid entry. Standard safety glasses have gaps where chemicals can reach the eyes.', 3),
('a1000000-0000-0000-0000-000000000001', 'How long should you flush your eyes at an eyewash station after a chemical splash?', '30 seconds', '5 minutes', '15 minutes', '1 minute', 'C', 'Eyes must be flushed for a minimum of 15 minutes after chemical contact to adequately dilute and remove the chemical.', 4),
('a1000000-0000-0000-0000-000000000001', 'Why does facial hair affect respirator effectiveness?', 'It makes the respirator uncomfortable', 'It prevents a proper seal against the face', 'It has no effect on the respirator', 'It causes the filter to clog faster', 'B', 'Facial hair breaks the seal between the respirator and the skin, allowing contaminated air to bypass the filter.', 5),
('a1000000-0000-0000-0000-000000000001', 'What should you do if your PPE is damaged during a shift?', 'Continue using it until the end of the shift', 'Report it and get a replacement immediately', 'Repair it yourself with tape', 'Only replace it if the damage is severe', 'B', 'Damaged PPE must be replaced immediately as it cannot provide adequate protection. Report the damage to your supervisor.', 6),
('a1000000-0000-0000-0000-000000000001', 'When handling infectious waste, what is the recommended practice?', 'Single-gloving is sufficient', 'Double-gloving is recommended', 'No gloves needed if using tongs', 'Gloves are optional for bagged waste', 'B', 'Double-gloving provides an additional barrier against puncture and contamination when handling infectious waste.', 7),
('a1000000-0000-0000-0000-000000000001', 'An N95 mask protects against which hazard?', 'Chemical vapours', 'Particulates and dust', 'Oxygen-deficient atmospheres', 'All of the above', 'B', 'N95 masks filter airborne particulates but do NOT protect against chemical vapours or oxygen-deficient atmospheres. A respirator with organic vapour cartridges is needed for chemicals.', 8);


-- Module 2: Chemical Safety - Peracetic Acid & Hydrogen Peroxide
INSERT INTO training_modules (id, category, subcategory, title, description, content, pass_mark, estimated_minutes, is_mandatory, status)
VALUES (
  'a1000000-0000-0000-0000-000000000002',
  'Chemical Safety', 'Chemical Handling', 'Chemical Safety - Treatment Chemicals',
  'Safe handling, storage, and emergency response for peracetic acid and hydrogen peroxide used in the treatment process.',
  'This module covers the specific chemical hazards at our treatment facility. Peracetic acid is a strong oxidiser and corrosive agent. Hydrogen peroxide is also an oxidiser that can cause burns. Workers must understand: chemical properties and hazards, PPE requirements, safe handling and dispensing procedures, storage requirements (separation of incompatibles), spill response procedures, and first aid measures. Knowledge of Safety Data Sheets (SDS) is essential.',
  90, 25, true, 'Active'
);

INSERT INTO training_module_questions (module_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, sort_order) VALUES
('a1000000-0000-0000-0000-000000000002', 'Peracetic acid is classified as which type of chemical hazard?', 'Flammable liquid', 'Strong oxidiser and corrosive', 'Explosive material', 'Inert substance', 'B', 'Peracetic acid is both a strong oxidiser and corrosive. It can cause severe chemical burns and reacts with organic materials.', 1),
('a1000000-0000-0000-0000-000000000002', 'How long should you flush skin with water after contact with peracetic acid?', '5 minutes', '10 minutes', '20 minutes', '2 minutes', 'C', 'Skin contact with peracetic acid requires flushing with water for at least 20 minutes to adequately remove and dilute the chemical.', 2),
('a1000000-0000-0000-0000-000000000002', 'What should be used to neutralise a peracetic acid spill?', 'Water only', 'Sodium bicarbonate', 'Sand', 'Vinegar', 'B', 'Sodium bicarbonate (baking soda) is used to neutralise peracetic acid spills. It reacts with the acid to form a less hazardous product.', 3),
('a1000000-0000-0000-0000-000000000002', 'Why must oxidisers and flammable materials be stored separately?', 'They have different labelling requirements', 'Oxidisers can intensify a fire involving flammables', 'They have different temperature requirements', 'It is only a recommendation, not a requirement', 'B', 'Oxidisers provide oxygen that intensifies combustion. Storing them with flammables dramatically increases fire and explosion risk.', 4),
('a1000000-0000-0000-0000-000000000002', 'Which section of a Safety Data Sheet covers first aid measures?', 'Section 2', 'Section 4', 'Section 8', 'Section 11', 'B', 'Section 4 of an SDS covers first aid measures including symptoms of exposure and treatment procedures for different routes of exposure.', 5),
('a1000000-0000-0000-0000-000000000002', 'What is the first action in a large chemical spill?', 'Attempt to contain the spill with absorbent', 'Evacuate the area and alert supervisor', 'Wash the spill into the nearest drain', 'Continue working and report at end of shift', 'B', 'For large spills, the priority is to evacuate the area and alert the supervisor and emergency response team. Do not attempt to contain large spills yourself.', 6),
('a1000000-0000-0000-0000-000000000002', 'What must chemicals never be washed into?', 'Bunded areas', 'Approved waste containers', 'Drains or storm water systems', 'Neutralisation tanks', 'C', 'Chemicals must never be washed into drains or storm water systems as this causes environmental contamination and is a legal offence.', 7),
('a1000000-0000-0000-0000-000000000002', 'If you cannot find the SDS for a chemical, what should you do?', 'Use the chemical carefully', 'Do not use the chemical until an SDS is obtained', 'Ask a colleague what the hazards are', 'Only use a small amount', 'B', 'Never use a chemical without access to its SDS. The SDS provides critical safety information needed for safe handling and emergency response.', 8);


-- Module 3: Fire Safety Essentials
INSERT INTO training_modules (id, category, subcategory, title, description, content, pass_mark, estimated_minutes, is_mandatory, status)
VALUES (
  'a1000000-0000-0000-0000-000000000003',
  'Fire Safety', 'General', 'Fire Safety Essentials',
  'Fire prevention, extinguisher types and usage, evacuation procedures, and hot work safety.',
  'This module covers fire safety fundamentals including the fire triangle, fire classes, extinguisher selection and the PASS technique, evacuation procedures, assembly point protocols, and hot work permit requirements. Workers must know: their nearest exit routes, assembly point location, how to operate fire extinguishers, and when NOT to fight a fire.',
  90, 20, true, 'Active'
);

INSERT INTO training_module_questions (module_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, sort_order) VALUES
('a1000000-0000-0000-0000-000000000003', 'What does the PASS technique stand for?', 'Push, Aim, Spray, Stop', 'Pull, Aim, Squeeze, Sweep', 'Point, Activate, Spray, Sweep', 'Pull, Activate, Spray, Stop', 'B', 'PASS stands for Pull the pin, Aim at the base of the fire, Squeeze the handle, and Sweep side to side.', 1),
('a1000000-0000-0000-0000-000000000003', 'Which type of fire extinguisher should be used on an electrical fire?', 'Water', 'Foam', 'CO2', 'Wet chemical', 'C', 'CO2 extinguishers are safe for electrical fires as CO2 is non-conductive and leaves no residue. Water and foam conduct electricity.', 2),
('a1000000-0000-0000-0000-000000000003', 'How far must combustible materials be removed from hot work?', '2 metres', '5 metres', '11 metres', '20 metres', 'C', 'Combustible materials must be removed or covered within 11 metres of hot work to prevent sparks and heat from causing ignition.', 3),
('a1000000-0000-0000-0000-000000000003', 'How long must a fire watch continue after hot work is completed?', '5 minutes', '15 minutes', '30 minutes', '1 hour', 'C', 'A fire watch must be maintained for at least 30 minutes after hot work to detect any smouldering materials that could reignite.', 4),
('a1000000-0000-0000-0000-000000000003', 'During a fire evacuation, what should you do after reaching the assembly point?', 'Go back inside to collect personal items', 'Leave the assembly point to go home', 'Wait for roll call and do not leave until cleared', 'Call your family to let them know', 'C', 'You must remain at the assembly point until roll call is completed and you are cleared by the marshal. This ensures everyone is accounted for.', 5),
('a1000000-0000-0000-0000-000000000003', 'What are the three elements of the fire triangle?', 'Heat, fuel, oxygen', 'Heat, fuel, water', 'Fuel, oxygen, electricity', 'Heat, smoke, oxygen', 'A', 'The fire triangle consists of heat, fuel, and oxygen. Remove any one element and the fire cannot sustain itself.', 6),
('a1000000-0000-0000-0000-000000000003', 'When should you NOT attempt to fight a fire yourself?', 'When the fire is small and contained', 'When you have been trained on the extinguisher', 'When the fire is large, spreading, or blocking your exit', 'When you have a fire extinguisher available', 'C', 'Never attempt to fight a fire if it is large, spreading rapidly, producing toxic smoke, or blocking your escape route. Evacuate immediately.', 7);


-- Module 4: Incident Reporting
INSERT INTO training_modules (id, category, subcategory, title, description, content, pass_mark, estimated_minutes, is_mandatory, status)
VALUES (
  'a1000000-0000-0000-0000-000000000004',
  'Incident Reporting', 'General', 'Incident Reporting Procedures',
  'How to report incidents, near misses, and understand root cause analysis.',
  'This module covers the importance of reporting all incidents and near misses, the step-by-step reporting process, legal requirements under the OHS Act, and basic root cause analysis using the 5 Whys technique. Workers learn that every incident must be reported within 24 hours and that near-miss reporting is crucial for preventing future injuries.',
  90, 15, true, 'Active'
);

INSERT INTO training_module_questions (module_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, sort_order) VALUES
('a1000000-0000-0000-0000-000000000004', 'Within what timeframe must an incident report be completed?', '1 hour', '24 hours', '1 week', 'End of the month', 'B', 'Incident reports must be completed within 24 hours while details are fresh. Delays lead to inaccurate reporting and missed details.', 1),
('a1000000-0000-0000-0000-000000000004', 'Why are near-miss reports important?', 'They are not important, only actual injuries matter', 'They reveal hazards before someone gets hurt', 'They are only required for legal compliance', 'They only matter if a manager witnesses them', 'B', 'Near misses reveal hazards and unsafe conditions that could cause injuries. Reporting them allows corrective action before someone gets hurt.', 2),
('a1000000-0000-0000-0000-000000000004', 'What should you do first after an incident occurs?', 'Complete the incident report form', 'Ensure the scene is safe and provide first aid', 'Clean up the area', 'Continue working and report later', 'B', 'The first priority is always to ensure the scene is safe and provide first aid to any injured persons. Reporting comes after immediate safety needs are addressed.', 3),
('a1000000-0000-0000-0000-000000000004', 'Why should the incident scene be preserved?', 'To take photos for social media', 'To allow investigation and determine root causes', 'It does not need to be preserved', 'Only for serious incidents', 'B', 'Preserving the scene allows investigators to examine physical evidence, understand the sequence of events, and determine root causes accurately.', 4),
('a1000000-0000-0000-0000-000000000004', 'What is the 5 Whys technique used for?', 'Counting the number of incidents', 'Identifying the root cause of an incident', 'Ranking incident severity', 'Determining who is to blame', 'B', 'The 5 Whys technique involves asking "Why?" repeatedly to dig beyond surface symptoms and identify the underlying root cause of an incident.', 5),
('a1000000-0000-0000-0000-000000000004', 'Under South African law, which incidents must be reported to the Department of Employment and Labour?', 'Only fatal incidents', 'Only incidents involving chemicals', 'Certain serious incidents as defined by the OHS Act', 'No incidents need to be reported externally', 'C', 'The OHS Act requires reporting of certain incidents including fatalities, serious injuries, and dangerous occurrences to the Department of Employment and Labour.', 6);


-- Module 5: Biological Hazards & Infection Control
INSERT INTO training_modules (id, category, subcategory, title, description, content, pass_mark, estimated_minutes, is_mandatory, status)
VALUES (
  'a1000000-0000-0000-0000-000000000005',
  'Biological Hazards', 'Infection Control', 'Biological Hazards & Infection Control',
  'Protecting against bloodborne pathogens, sharps safety, and decontamination procedures.',
  'This module covers biological hazards specific to medical waste treatment: bloodborne pathogens (HIV, Hepatitis B/C), routes of transmission, sharps handling safety, needlestick injury response, decontamination procedures, and vaccination requirements. Workers learn the universal precaution principle: treat ALL medical waste as potentially infectious.',
  90, 25, true, 'Active'
);

INSERT INTO training_module_questions (module_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, sort_order) VALUES
('a1000000-0000-0000-0000-000000000005', 'Why should all medical waste be treated as potentially infectious?', 'Because it looks dangerous', 'Because you cannot tell by looking whether waste contains pathogens', 'Only certain types of medical waste are infectious', 'It is a suggestion, not a requirement', 'B', 'You cannot determine by visual inspection whether waste contains infectious pathogens. The universal precaution principle treats ALL medical waste as potentially infectious.', 1),
('a1000000-0000-0000-0000-000000000005', 'Which bloodborne pathogen is approximately 100 times more infectious than HIV?', 'Hepatitis A', 'Hepatitis B', 'Hepatitis C', 'Tuberculosis', 'B', 'Hepatitis B is approximately 100 times more infectious than HIV. This is why vaccination against Hepatitis B is strongly recommended for all waste workers.', 2),
('a1000000-0000-0000-0000-000000000005', 'What should you do FIRST after a needlestick injury?', 'Complete an incident report', 'Wash the wound immediately with soap and water', 'Continue working and report at end of shift', 'Apply a plaster and carry on', 'B', 'Immediately wash the wound with soap and running water. Then report to your supervisor and seek medical attention within 1 hour for possible post-exposure prophylaxis.', 3),
('a1000000-0000-0000-0000-000000000005', 'At what level should a sharps container be sealed and replaced?', 'When completely full', 'At the three-quarter mark', 'At the halfway mark', 'Only when it starts overflowing', 'B', 'Sharps containers must be sealed and replaced when they reach the three-quarter (75%) fill line to prevent injuries from overfilling.', 4),
('a1000000-0000-0000-0000-000000000005', 'Within how many hours must HIV post-exposure prophylaxis (PEP) be started?', '24 hours', '72 hours', '1 week', '48 hours', 'B', 'HIV PEP must be started within 72 hours of exposure to be effective. The sooner treatment begins, the better the outcome.', 5),
('a1000000-0000-0000-0000-000000000005', 'How long should you wash your hands for effective decontamination?', '5 seconds', '10 seconds', '20 seconds', '1 minute', 'C', 'Hands should be washed with soap and water for at least 20 seconds for effective decontamination of potential biological hazards.', 6),
('a1000000-0000-0000-0000-000000000005', 'What tools should you use to handle loose sharps?', 'Your gloved hands', 'Tongs or grabbers', 'A piece of cardboard', 'A plastic bag', 'B', 'Always use tongs, forceps, or mechanical grabbers to handle loose sharps. Never pick up needles or sharp objects with your hands, even when wearing gloves.', 7),
('a1000000-0000-0000-0000-000000000005', 'What is the correct order when removing contaminated PPE?', 'Gloves first, then gown, then mask', 'Gown first, then mask, then gloves', 'Gloves last to avoid contaminating your hands', 'The order does not matter', 'C', 'Gloves should be removed last because they protect your hands while removing other contaminated PPE items. Removing gloves first risks contaminating your hands.', 8);


-- Module 6: Manual Handling & Lifting
INSERT INTO training_modules (id, category, subcategory, title, description, content, pass_mark, estimated_minutes, is_mandatory, status)
VALUES (
  'a1000000-0000-0000-0000-000000000006',
  'Manual Handling', 'Lifting Techniques', 'Safe Manual Handling & Lifting',
  'Correct lifting techniques, use of mechanical aids, and preventing musculoskeletal injuries.',
  'This module covers safe manual handling principles including: risk assessment before lifting, correct lifting technique (bend knees, straight back, load close to body), weight limits, when to use mechanical aids, pushing vs pulling, and recognising early signs of musculoskeletal injury. Back injuries are the most common workplace injury and are largely preventable with correct technique.',
  90, 15, true, 'Active'
);

INSERT INTO training_module_questions (module_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, sort_order) VALUES
('a1000000-0000-0000-0000-000000000006', 'What is the recommended maximum weight for one person to lift?', '15 kg', '25 kg', '35 kg', '50 kg', 'B', 'The generally recommended maximum weight for one person to lift is 25 kg. Heavier loads require assistance or mechanical aids.', 1),
('a1000000-0000-0000-0000-000000000006', 'When lifting, you should lift with your:', 'Back muscles', 'Leg muscles', 'Arms only', 'Shoulder muscles', 'B', 'Always lift with your leg muscles by bending your knees. Your legs are much stronger than your back and using them prevents back injuries.', 2),
('a1000000-0000-0000-0000-000000000006', 'Why should you never twist while carrying a load?', 'It makes you look unprofessional', 'It puts excessive strain on the spine and can cause disc injury', 'It is only a problem with heavy loads', 'Twisting has no effect on injury risk', 'B', 'Twisting while carrying a load puts uneven strain on the spinal discs, which can cause herniation and serious back injury. Move your feet to turn instead.', 3),
('a1000000-0000-0000-0000-000000000006', 'When using a trolley or hand cart, should you push or pull?', 'Always pull', 'Always push', 'It does not matter', 'Alternate between pushing and pulling', 'B', 'Pushing is preferred over pulling because you can use your body weight to assist, maintain better visibility, and reduce strain on the back and shoulders.', 4),
('a1000000-0000-0000-0000-000000000006', 'What are the early warning signs of a repetitive strain injury?', 'Sudden sharp pain only', 'Tingling, numbness, or aching in the affected area', 'No symptoms until the injury is severe', 'Only visible swelling', 'B', 'Early signs include tingling, numbness, aching, stiffness, or weakness in the affected muscles and joints. Report these early to prevent progression.', 5),
('a1000000-0000-0000-0000-000000000006', 'Before lifting a load, what should you assess first?', 'Whether anyone is watching', 'The weight of the load, the route, and the destination', 'Only the weight matters', 'Nothing — just lift it', 'B', 'Before lifting, assess: the weight and shape of the load, the route you will take (obstacles, stairs, doors), and where the load needs to go. Plan the lift before executing it.', 6);
