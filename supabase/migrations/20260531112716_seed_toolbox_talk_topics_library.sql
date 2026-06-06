/*
  # Seed Toolbox Talk Topics Library

  Populates the toolbox_talk_topics table with a comprehensive library of
  health and safety topics organized by 12 categories, each with 3-5 subcategories.
  Topics are tailored to a medical/hazardous waste treatment facility.

  Categories:
  1. PPE (Personal Protective Equipment)
  2. Chemical Safety
  3. Fire Safety
  4. Manual Handling
  5. Housekeeping
  6. Working at Heights
  7. Electrical Safety
  8. Incident Reporting
  9. Emergency Procedures
  10. Environmental Compliance
  11. Vehicle Safety
  12. Biological Hazards
*/

INSERT INTO toolbox_talk_topics (category, subcategory, title, talking_points, key_questions) VALUES

-- 1. PPE
('PPE', 'General PPE', 'Importance of Wearing PPE at All Times',
'Personal Protective Equipment is your last line of defence against workplace hazards. PPE must be worn correctly and consistently in all designated areas. Damaged or ill-fitting PPE must be reported and replaced immediately. PPE is not optional — it is a legal requirement under the OHS Act. Always inspect your PPE before each shift.',
'Why is PPE considered the last line of defence? What should you do if your PPE is damaged? When is it acceptable to remove PPE on site?'),

('PPE', 'Gloves', 'Selecting the Right Gloves for the Task',
'Different tasks require different glove types. Chemical-resistant gloves (nitrile) must be used when handling peracetic acid and hydrogen peroxide. Cut-resistant gloves are needed for handling sharp waste. Latex gloves alone are NOT sufficient for chemical handling. Always check gloves for tears, punctures, or degradation before use. Double-gloving is recommended when handling infectious waste.',
'What type of gloves should you use when handling treatment chemicals? How do you check if gloves are still safe to use? Why is double-gloving recommended for infectious waste?'),

('PPE', 'Respiratory Protection', 'When and How to Use Respiratory Protection',
'Respiratory protection is required when chemical fumes are present, particularly during treatment cycles with peracetic acid. N95 masks protect against particulates but NOT chemical vapours. Half-face respirators with organic vapour cartridges are required for chemical exposure. Fit testing must be done annually. Facial hair prevents a proper seal. Always check the cartridge expiry date.',
'When must respiratory protection be worn at the treatment plant? Why does facial hair affect respirator effectiveness? How often should respirator cartridges be replaced?'),

('PPE', 'Eye Protection', 'Protecting Your Eyes from Chemical Splashes',
'Chemical splash goggles must be worn when handling peracetic acid, hydrogen peroxide, or any treatment chemicals. Standard safety glasses are NOT sufficient for chemical splash protection. If chemicals contact your eyes, use the emergency eyewash station immediately for at least 15 minutes. Contact lenses should not be worn when working with chemicals. Know the location of all eyewash stations.',
'Where are the eyewash stations located on site? How long should you flush your eyes after a chemical splash? Why are standard safety glasses insufficient for chemical work?'),

('PPE', 'Full Body Protection', 'Chemical Suits and Protective Clothing',
'Chemical-resistant coveralls or aprons must be worn during treatment operations. Ordinary overalls do not protect against chemical splashes. Ensure protective clothing covers all exposed skin. Contaminated clothing must be removed immediately and decontaminated. Never take contaminated workwear home. Disposable coveralls should be discarded after use with infectious waste.',
'What type of protective clothing is required during treatment operations? What should you do if your protective clothing becomes contaminated? Why should contaminated workwear never be taken home?'),

-- 2. Chemical Safety
('Chemical Safety', 'Chemical Handling', 'Safe Handling of Peracetic Acid',
'Peracetic acid is a strong oxidiser and corrosive chemical used in our treatment process. It can cause severe burns to skin and eyes. Always wear full PPE including chemical goggles, nitrile gloves, and chemical-resistant apron. Never mix peracetic acid with other chemicals. Use dedicated containers and dispensing equipment. Know the location of the Safety Data Sheet (SDS). In case of skin contact, flush with water for at least 20 minutes.',
'What are the main hazards of peracetic acid? What PPE is required when handling it? What should you do in case of skin contact?'),

('Chemical Safety', 'Chemical Storage', 'Proper Chemical Storage Requirements',
'All chemicals must be stored in designated, ventilated areas. Incompatible chemicals must be separated (oxidisers away from flammables). Containers must be clearly labelled with GHS pictograms. Never store chemicals above eye level. Keep storage areas locked when not in use. Conduct monthly inspections of chemical storage areas. Report any leaking or damaged containers immediately.',
'Why must oxidisers and flammables be stored separately? What information must be on a chemical label? What should you do if you find a leaking container?'),

('Chemical Safety', 'Spill Response', 'Chemical Spill Cleanup Procedures',
'Know the location of spill kits before you need them. Small spills: contain with absorbent material, wear PPE, dispose as hazardous waste. Large spills: evacuate the area, alert supervisor, call emergency response. Never wash chemicals into drains. Document all spills in the incident register. Peracetic acid spills require neutralisation with sodium bicarbonate. Used spill materials are hazardous waste.',
'Where are the spill kits located? What is the difference between handling a small spill vs a large spill? How do you neutralise a peracetic acid spill?'),

('Chemical Safety', 'SDS Awareness', 'Understanding Safety Data Sheets',
'Every chemical on site has a Safety Data Sheet (SDS). The SDS contains 16 sections covering hazards, first aid, handling, storage, and disposal. Section 4 covers first aid measures — know these for the chemicals you work with. Section 8 covers PPE requirements. SDS documents must be readily accessible in the workplace. If you cannot find an SDS, do not use the chemical until one is obtained.',
'How many sections does an SDS contain? Which section tells you about first aid? Where are the SDS documents kept on site?'),

-- 3. Fire Safety
('Fire Safety', 'Fire Prevention', 'Preventing Fires in the Workplace',
'Good housekeeping prevents fires — keep work areas free of combustible waste. Never block fire exits or fire extinguisher access points. Electrical equipment must be switched off when not in use. Smoking is only permitted in designated areas. Flammable materials must be stored in approved containers. Report any electrical faults, frayed wires, or overloaded outlets. Hot work requires a permit.',
'What are the three elements of the fire triangle? What housekeeping practices help prevent fires? Who do you report electrical faults to?'),

('Fire Safety', 'Fire Extinguishers', 'Types and Use of Fire Extinguishers',
'Know which extinguisher to use for each fire class. Class A (solids): water or foam. Class B (liquids): foam or CO2. Class C (gases): dry chemical powder. Class E (electrical): CO2 only. Never use water on electrical or chemical fires. Use the PASS technique: Pull pin, Aim at base, Squeeze handle, Sweep side to side. Only attempt to fight small fires — if in doubt, evacuate.',
'What does PASS stand for? Which extinguisher type should you use on an electrical fire? When should you NOT attempt to fight a fire?'),

('Fire Safety', 'Evacuation Procedures', 'Fire Evacuation and Assembly Points',
'Know your evacuation routes — there should be at least two escape routes from every area. When the fire alarm sounds, stop work immediately and proceed to the assembly point. Do not use lifts during evacuation. Close doors behind you to slow fire spread. Assist colleagues with disabilities. Report to your roll-call marshal at the assembly point. Do not re-enter the building until cleared.',
'Where is your nearest emergency exit? Where is the assembly point? What should you do if your primary escape route is blocked?'),

('Fire Safety', 'Hot Work Safety', 'Safe Practices for Welding and Cutting',
'Hot work includes welding, cutting, grinding, and brazing. A hot work permit is required before starting any hot work. Remove or cover all combustible materials within 11 metres. A fire watch must be maintained during and for 30 minutes after hot work. Ensure a suitable fire extinguisher is within reach. Check the area for flammable gases or vapours before starting. Never perform hot work near chemical storage.',
'What is considered hot work? How far must combustibles be from hot work? How long must fire watch continue after hot work?'),

-- 4. Manual Handling
('Manual Handling', 'Lifting Techniques', 'Safe Lifting — Protecting Your Back',
'Back injuries are the most common workplace injury. Plan your lift: check the weight, check the route, check the destination. Use the correct technique: feet shoulder-width apart, bend your knees, keep the load close, lift with your legs not your back. Never twist while carrying a load — move your feet instead. If the load is too heavy (over 25kg), get help or use mechanical aids.',
'What is the maximum weight one person should lift? Why should you never twist while carrying a load? What are the steps of a safe lift?'),

('Manual Handling', 'Mechanical Aids', 'Using Trolleys, Hoists and Lifting Equipment',
'Always use mechanical aids when available — trolleys, pallet jacks, hoists, and forklifts. Inspect equipment before each use. Never exceed the rated load capacity. Ensure wheels are in good condition and brakes work. Push rather than pull whenever possible. Report any faulty equipment immediately. Only trained and authorised persons may operate forklifts and overhead cranes.',
'Why should you push rather than pull a trolley? What should you check before using a pallet jack? Who is allowed to operate a forklift?'),

('Manual Handling', 'Repetitive Tasks', 'Avoiding Injury from Repetitive Movements',
'Repetitive tasks such as sorting waste and loading treatment chambers can cause musculoskeletal injuries. Take regular micro-breaks (30 seconds every 20 minutes). Alternate between tasks where possible. Stretch before starting repetitive work. Report any pain, tingling, or discomfort early — do not wait until it becomes severe. Workstation setup should allow neutral posture.',
'What are the early warning signs of a repetitive strain injury? How often should you take micro-breaks? Why is it important to report discomfort early?'),

-- 5. Housekeeping
('Housekeeping', 'Workplace Cleanliness', '5S Principles for a Safe Workplace',
'Good housekeeping prevents slips, trips, falls, and contamination. Sort: remove unnecessary items. Set in Order: a place for everything. Shine: clean regularly. Standardise: make it routine. Sustain: maintain the discipline. Clean spills immediately. Keep walkways clear. Stack materials neatly and securely. A clean workplace is a safe workplace.',
'What are the 5S principles? Why is it important to clean spills immediately? What hazards can poor housekeeping create?'),

('Housekeeping', 'Waste Segregation', 'Correct Waste Segregation On Site',
'Waste must be segregated at source into the correct streams: general waste (black bags), recyclables (clear bags), hazardous waste (yellow containers), and infectious waste (red containers). Never mix waste streams. Contaminated materials must go into hazardous waste. Sharps go into approved sharps containers. Incorrect segregation can lead to environmental contamination and legal penalties.',
'What colour container is used for infectious waste? Why must waste streams never be mixed? Where do sharps go?'),

('Housekeeping', 'Slip, Trip, Fall Prevention', 'Preventing Slips, Trips and Falls',
'Slips, trips and falls are the second most common cause of workplace injuries. Keep floors clean and dry. Report wet floors and use warning signs. Secure loose cables and hoses. Ensure adequate lighting in all work areas. Wear appropriate footwear with non-slip soles. Use handrails on stairs. Never run in the workplace. Report any uneven surfaces or damaged flooring.',
'What are the three main causes of slips, trips and falls? What type of footwear should be worn? What should you do if you spot a wet floor?'),

-- 6. Working at Heights
('Working at Heights', 'Ladder Safety', 'Safe Use of Ladders',
'Falls from ladders are a leading cause of serious injury. Inspect the ladder before use — check for damage, ensure locking mechanisms work. Use the 4:1 ratio — for every 4 metres of height, the base should be 1 metre from the wall. Maintain three points of contact at all times. Never overreach. Do not carry heavy items up a ladder. Secure the top and bottom of the ladder.',
'What is the 4:1 ratio for ladder placement? What does three points of contact mean? When should a ladder NOT be used?'),

('Working at Heights', 'Fall Protection', 'Fall Protection Systems and Harnesses',
'Any work above 2 metres requires fall protection. Full-body harnesses must be inspected before each use. Check webbing for cuts, fraying, or chemical damage. Ensure the lanyard is connected to an approved anchor point rated for at least 22 kN. Never tie off to handrails, pipes, or conduits. Harness training is mandatory before use. Report any near-miss falls immediately.',
'At what height is fall protection required? What should you inspect on a harness before use? What makes a valid anchor point?'),

('Working at Heights', 'Scaffolding', 'Working Safely on Scaffolding',
'Only work on scaffolding that has been erected by a competent person and has a green tag. Check that guardrails, mid-rails, and toeboards are in place. Platforms must be fully decked with no gaps. Never climb on scaffold bracing. Report any damage or missing components. Scaffolds must be inspected weekly and after adverse weather. Do not overload the scaffold.',
'What does a green tag on scaffolding mean? What safety features must scaffolding have? Who is allowed to erect scaffolding?'),

-- 7. Electrical Safety
('Electrical Safety', 'General Electrical Safety', 'Avoiding Electrical Hazards',
'Electricity can kill — treat all electrical equipment with respect. Never work on or near live electrical equipment unless authorised and trained. Report frayed cords, damaged plugs, or faulty switches immediately. Do not use electrical equipment near water. Ensure circuits are properly earthed. Use RCDs (residual current devices) for portable equipment. Lock out and tag out before any electrical maintenance.',
'Why is it dangerous to use electrical equipment near water? What is a lockout/tagout procedure? What should you do if you find a damaged electrical cord?'),

('Electrical Safety', 'Lockout/Tagout', 'Lockout/Tagout Procedures for Equipment Maintenance',
'Lockout/Tagout (LOTO) prevents unexpected energisation during maintenance. Steps: notify affected employees, shut down equipment, isolate energy sources, apply lock and tag, verify isolation (try to start), perform maintenance, remove locks in reverse order. Only the person who applied the lock may remove it. Multi-lock hasps allow multiple workers to lock out the same equipment.',
'What is the purpose of lockout/tagout? Who may remove a lockout device? What must you do after applying the lock to verify isolation?'),

('Electrical Safety', 'Portable Equipment', 'Safe Use of Portable Electrical Tools',
'Inspect portable electrical tools before each use. Check the cord, plug, and housing for damage. Ensure the tool is properly earthed or double-insulated. Use the correct tool for the job. Disconnect by pulling the plug, not the cord. Never carry a tool by its cord. Portable tools must be PAT tested at required intervals. Use battery-powered tools in wet conditions where possible.',
'How should you disconnect a portable tool? What does double-insulated mean? How often should portable tools be tested?'),

-- 8. Incident Reporting
('Incident Reporting', 'Why Report', 'The Importance of Reporting All Incidents',
'Every incident, no matter how small, must be reported. Near misses are especially valuable — they reveal hazards before someone gets hurt. Under-reporting creates a false sense of safety. South African law (OHS Act) requires reporting of certain incidents to the Department of Employment and Labour. Reporting protects YOU — if an injury worsens, having a report on file supports your claim.',
'Why are near misses important to report? What law requires incident reporting in South Africa? What happens if an injury is not reported and gets worse?'),

('Incident Reporting', 'How to Report', 'Step-by-Step Incident Reporting Process',
'Step 1: Ensure the scene is safe and provide first aid if needed. Step 2: Report to your supervisor immediately. Step 3: Preserve the scene if possible (do not clean up until investigated). Step 4: Complete the incident report form within 24 hours. Include: what happened, when, where, who was involved, what injuries occurred, and what immediate actions were taken. Step 5: Cooperate with the investigation.',
'What is the first thing you should do after an incident? How soon must the incident report be completed? Why should you preserve the scene?'),

('Incident Reporting', 'Root Cause Analysis', 'Understanding Why Incidents Happen',
'Most incidents are caused by multiple factors, not a single cause. The 5 Whys technique helps identify root causes: ask "Why?" five times. Categories of causes: people (human error), process (inadequate procedures), plant (equipment failure), and environment (conditions). Fixing symptoms without addressing root causes means the incident will recur. Corrective actions must target the root cause.',
'What is the 5 Whys technique? What are the four categories of incident causes? Why is fixing only the symptom a problem?'),

-- 9. Emergency Procedures
('Emergency Procedures', 'Medical Emergencies', 'Responding to Medical Emergencies On Site',
'Know the location of first aid kits and who the trained first aiders are. In a medical emergency: call for help, do not move the casualty unless in danger, apply basic first aid (stop bleeding, keep airways clear), stay with the casualty until help arrives. Know the emergency number for ambulance services. AED (defibrillator) locations must be known. Document all medical treatments provided.',
'Where are the first aid kits located? Who are the trained first aiders on your shift? What is the emergency number for medical services?'),

('Emergency Procedures', 'Chemical Emergency', 'Responding to Chemical Emergencies',
'In case of a chemical release: move upwind and away from the spill. Alert others in the area. Do not attempt to contain large spills yourself. Activate emergency response if required. If a person is contaminated: remove contaminated clothing, flush skin with water for 20 minutes, flush eyes for 15 minutes at the eyewash station. Bring the SDS to the emergency responders.',
'Which direction should you move during a chemical release? How long should you flush contaminated skin? Why is the SDS important during a chemical emergency?'),

('Emergency Procedures', 'Evacuation Drills', 'Participating Effectively in Emergency Drills',
'Drills are practice for real emergencies — take them seriously. When the alarm sounds, stop all operations safely (shut down equipment if time permits). Proceed calmly to the nearest exit. Go to the designated assembly point. Wait for roll call and do not leave until cleared. Report any missing persons to the marshal. After the drill, participate in the debrief to identify improvements.',
'What should you do first when the alarm sounds? Why should you stay at the assembly point? What is the purpose of the post-drill debrief?'),

('Emergency Procedures', 'First Aid Basics', 'Basic First Aid Every Worker Should Know',
'Everyone should know: how to call for help, how to apply pressure to stop bleeding, how to position an unconscious breathing person in the recovery position, how to perform CPR (30 compressions, 2 breaths), and how to use an AED. Never give medication to a casualty. Keep the casualty warm and comfortable. Do not remove embedded objects. Record what happened and what treatment was given.',
'What is the ratio of compressions to breaths in CPR? Why should you not remove embedded objects? What position should an unconscious breathing person be placed in?'),

-- 10. Environmental Compliance
('Environmental Compliance', 'Waste Management', 'Environmental Responsibilities in Waste Treatment',
'Our facility treats hazardous medical waste — we must comply with NEMWA (National Environmental Management: Waste Act). All waste must be tracked from cradle to grave. Manifest documents must accompany every waste movement. Illegal dumping carries criminal penalties. Treated waste sent to Mooiplaats landfill must meet treatment standards. Water discharge must comply with municipal bylaws.',
'What does cradle-to-grave waste tracking mean? What document must accompany waste movements? What legislation governs waste management in SA?'),

('Environmental Compliance', 'Water Protection', 'Preventing Water Contamination',
'Treatment chemicals and waste water must never enter storm water drains. Bunding must be in place around chemical storage to contain spills. Wash water from treatment areas must be captured and treated. Report any discharge to storm water drains immediately. Regular water quality monitoring is required. The treatment plant must maintain zero discharge to natural water sources.',
'What is bunding and why is it important? Where must wash water from treatment areas go? What should you do if you see discharge entering a storm water drain?'),

('Environmental Compliance', 'Air Quality', 'Managing Air Emissions from Treatment Operations',
'The treatment process can produce fumes from peracetic acid and hydrogen peroxide. Adequate ventilation must be maintained in the treatment area. Air quality monitoring should be conducted regularly. Workers in high-exposure areas must wear appropriate respiratory protection. Report any unusual odours or visible fumes. The facility must comply with the National Environmental Management: Air Quality Act.',
'Why is ventilation important during treatment operations? What should you do if you detect unusual fumes? What type of respiratory protection is needed?'),

-- 11. Vehicle Safety
('Vehicle Safety', 'Driving On Site', 'Safe Driving Rules Within the Facility',
'Speed limit on site is 20 km/h. Always wear your seatbelt. Give way to pedestrians at all times. Use hazard lights when reversing. No cellphone use while driving. Park only in designated areas. Report any vehicle defects before operating. Ensure adequate clearance when manoeuvring around buildings and equipment. Sound your horn at blind corners.',
'What is the speed limit on site? When should you use hazard lights? What should you do at blind corners?'),

('Vehicle Safety', 'Forklift Safety', 'Safe Forklift Operation and Pedestrian Awareness',
'Only licensed and authorised operators may drive forklifts. Conduct a pre-use inspection: brakes, steering, forks, tyres, lights, horn, and seatbelt. Never carry passengers. Keep forks low when travelling. Sound horn at intersections and blind spots. Pedestrians must maintain a 3-metre exclusion zone. Never walk under raised forks. Refuel/recharge in designated areas only.',
'What must you check during a forklift pre-use inspection? How far must pedestrians stay from a moving forklift? Why should forks be kept low when travelling?'),

('Vehicle Safety', 'Loading and Unloading', 'Safe Loading and Unloading of Waste Vehicles',
'Ensure the vehicle is properly parked with handbrake engaged and wheels chocked. Wear full PPE during loading and unloading — especially when handling waste containers. Check container integrity before lifting. Secure loads properly before transport. Follow the waste manifest and verify container counts. Report any damaged, leaking, or incorrectly labelled containers. No smoking during loading operations.',
'Why must wheels be chocked during loading? What PPE is required during waste handling? What should you do if a container is leaking?'),

-- 12. Biological Hazards
('Biological Hazards', 'Infection Control', 'Protecting Yourself from Biological Hazards',
'Medical waste can contain dangerous pathogens: HIV, Hepatitis B/C, TB, and other infectious agents. Always treat all medical waste as potentially infectious. Never handle waste with bare hands. Use needle-safe handling procedures. Wash hands thoroughly after handling waste, even when gloves were worn. Report any needlestick injuries or mucous membrane exposures immediately. Hepatitis B vaccination is recommended for all workers.',
'Why should all medical waste be treated as potentially infectious? What should you do after a needlestick injury? Which vaccination is recommended for waste workers?'),

('Biological Hazards', 'Sharps Safety', 'Safe Handling of Sharps and Needles',
'Sharps (needles, scalpels, broken glass) are the highest-risk items in medical waste. Never reach into waste bags or containers. Use tongs or grabbers to handle loose sharps. Sharps containers must be puncture-resistant and clearly marked. Do not overfill sharps containers — close at the three-quarter mark. If a needlestick injury occurs: wash immediately with soap and water, report to supervisor, seek medical attention within 1 hour.',
'How full should a sharps container be before sealing? What tools should you use to handle loose sharps? What is the first thing to do after a needlestick injury?'),

('Biological Hazards', 'Decontamination', 'Decontamination Procedures After Exposure',
'Decontamination removes or neutralises biological hazards. Hand hygiene: wash with soap and water for at least 20 seconds, or use alcohol-based hand sanitiser. Equipment decontamination: use approved disinfectant solutions. Work area decontamination: clean with hospital-grade disinfectant. Contaminated PPE must be removed carefully to avoid self-contamination (remove gloves last). Shower facilities are available for full-body decontamination.',
'How long should you wash your hands for effective decontamination? What is the correct order for removing contaminated PPE? When is full-body decontamination necessary?'),

('Biological Hazards', 'Bloodborne Pathogens', 'Understanding Bloodborne Pathogen Risks',
'Bloodborne pathogens (BBPs) include HIV, Hepatitis B, and Hepatitis C. Transmission occurs through: needlestick injuries, cuts from contaminated sharps, contact with broken skin or mucous membranes. Hepatitis B is 100x more infectious than HIV. The Hepatitis B vaccine provides over 95% protection. Post-exposure prophylaxis (PEP) for HIV must be started within 72 hours. All exposure incidents require medical evaluation.',
'Which bloodborne pathogen is most infectious? How soon must HIV PEP be started after exposure? What protection does the Hepatitis B vaccine provide?');
