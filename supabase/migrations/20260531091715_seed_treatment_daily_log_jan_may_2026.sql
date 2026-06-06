/*
  # Seed Treatment Daily Log - January to May 2026

  Inserts historical treatment production data from the Tech4Green plant
  covering January 1 to May 31, 2026.

  1. Data Summary
    - 152 daily records (Jan 1 - May 31, 2026)
    - Includes per-shift cycle counts and kg treated
    - Chemical usage at 27 litres per cycle
    - Downtime events with reasons
    - Status set to 'Completed' for all historical records

  2. Monthly Summaries
    - January: 309,520 kg landfill, 61,033.9 kg water
    - February: 329,870 kg landfill, 76,849 kg water
    - March: 337,930 kg landfill, 59,282.2 kg water
    - April & May: to be updated when available

  3. Waste Transfers
    - March 15: 7,013 kg infectious to ClinX
    - March 19: 3,401 kg anatomical to A-Thermal
    - April 2: 4,300 kg anatomical to Holfontein
    - May 1: 2,265.5 kg anatomical to Averda
*/

-- January 2026
INSERT INTO treatment_daily_log (date, day_shift_cycles, day_shift_treated_kg, afternoon_shift_cycles, afternoon_shift_treated_kg, night_shift_cycles, night_shift_treated_kg, total_cycles, total_treated_kg, chemical_litres, downtime_minutes, downtime_reason, status)
VALUES
('2026-01-01', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '', 'Completed'),
('2026-01-02', 6, 3006, 14, 7014, 0, 0, 20, 10020, 540, 420, 'Chain and sprocket broke', 'Completed'),
('2026-01-03', 8, 4008, 0, 0, 0, 0, 8, 4008, 216, 0, '', 'Completed'),
('2026-01-04', 13, 6513, 0, 0, 0, 0, 13, 6513, 351, 0, '', 'Completed'),
('2026-01-05', 20, 10020, 14, 7014, 0, 0, 34, 17034, 918, 0, '', 'Completed'),
('2026-01-06', 11, 4027, 8, 4111, 0, 0, 19, 8138, 513, 0, '', 'Completed'),
('2026-01-07', 10, 5156, 13, 6545, 0, 0, 23, 11701, 621, 0, '', 'Completed'),
('2026-01-08', 8, 4085, 9, 4162, 0, 0, 17, 8247, 459, 0, '', 'Completed'),
('2026-01-09', 9, 4543.4, 10, 5954, 0, 0, 19, 10497.4, 513, 0, '', 'Completed'),
('2026-01-10', 8, 4025, 0, 0, 0, 0, 8, 4025, 216, 0, '', 'Completed'),
('2026-01-11', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '', 'Completed'),
('2026-01-12', 12, 6135, 15, 7773, 0, 0, 27, 13908, 729, 0, '', 'Completed'),
('2026-01-13', 12, 6284, 8, 4175, 0, 0, 20, 10459, 540, 0, '', 'Completed'),
('2026-01-14', 4, 2206, 10, 5271, 0, 0, 14, 7477, 378, 0, '', 'Completed'),
('2026-01-15', 5, 2542, 9, 4488, 0, 0, 14, 7030, 378, 0, '', 'Completed'),
('2026-01-16', 3, 1568, 9, 4553, 0, 0, 12, 6121, 324, 0, 'Shaft broken', 'Completed'),
('2026-01-17', 5, 2513, 0, 0, 0, 0, 5, 2513, 135, 0, '', 'Completed'),
('2026-01-18', 11, 5238, 0, 0, 0, 0, 11, 5238, 297, 0, '', 'Completed'),
('2026-01-19', 10, 4782, 9, 4392, 8, 4171, 27, 13345, 729, 0, '', 'Completed'),
('2026-01-20', 6, 2977, 8, 3892, 14, 7093, 28, 13962, 756, 0, '', 'Completed'),
('2026-01-21', 7, 3231, 5, 2425, 11, 5753, 23, 11409, 621, 0, '', 'Completed'),
('2026-01-22', 0, 0, 5, 2517, 10, 5075, 15, 7592, 405, 0, '', 'Completed'),
('2026-01-23', 5, 2355, 10, 4855, 12, 6110, 27, 13320, 729, 0, '', 'Completed'),
('2026-01-24', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '', 'Completed'),
('2026-01-25', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '', 'Completed'),
('2026-01-26', 7, 3447, 9, 5822, 8, 4062, 24, 13331, 648, 0, '', 'Completed'),
('2026-01-27', 7, 3538, 7, 3662, 0, 0, 14, 7200, 378, 0, '', 'Completed'),
('2026-01-28', 0, 0, 7, 3692, 10, 5879.7, 17, 9571.7, 459, 0, '', 'Completed'),
('2026-01-29', 10, 5079, 9, 4720, 5, 2588, 24, 12387, 648, 0, 'Shredder screen blocked', 'Completed'),
('2026-01-30', 10, 5080, 8, 4206, 3, 1517, 21, 10803, 567, 0, '', 'Completed'),
('2026-01-31', 5, 2636, 0, 0, 0, 0, 5, 2636, 135, 0, '', 'Completed')
ON CONFLICT (date) DO NOTHING;

-- February 2026
INSERT INTO treatment_daily_log (date, day_shift_cycles, day_shift_treated_kg, afternoon_shift_cycles, afternoon_shift_treated_kg, night_shift_cycles, night_shift_treated_kg, total_cycles, total_treated_kg, chemical_litres, downtime_minutes, downtime_reason, status)
VALUES
('2026-02-01', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '', 'Completed'),
('2026-02-02', 5, 2571, 11, 5740, 12, 6408, 28, 14719, 756, 0, 'Sweeper broke, Incline clog', 'Completed'),
('2026-02-03', 3, 1550, 9, 4619, 11, 5727, 23, 11896, 621, 420, 'Return pump broke and replaced', 'Completed'),
('2026-02-04', 8, 4036, 0, 0, 16, 8360, 24, 12396, 648, 0, '', 'Completed'),
('2026-02-05', 6, 3126, 11, 5625, 8, 4221, 25, 12972, 675, 0, '', 'Completed'),
('2026-02-06', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'Installing new shaft', 'Completed'),
('2026-02-07', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'Installing new shaft', 'Completed'),
('2026-02-08', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'Installing new shaft', 'Completed'),
('2026-02-09', 6, 3168, 2, 1074, 5, 2594, 13, 6836, 351, 0, 'Wors stopper fault', 'Completed'),
('2026-02-10', 0, 0, 9, 4625, 11, 5702, 20, 10327, 540, 0, '', 'Completed'),
('2026-02-11', 10, 5207, 7, 3584, 10, 5049, 27, 13840, 729, 0, '', 'Completed'),
('2026-02-12', 6, 3135, 1, 512, 11, 5662, 18, 9309, 486, 0, '', 'Completed'),
('2026-02-13', 0, 0, 3, 1528, 12, 5459, 15, 6987, 405, 0, 'Installed new stirrer', 'Completed'),
('2026-02-14', 3, 1320, 0, 0, 0, 0, 3, 1320, 81, 0, 'No power', 'Completed'),
('2026-02-15', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'No power', 'Completed'),
('2026-02-16', 3, 1251, 10, 4545, 10, 4157, 23, 9953, 621, 0, 'No power half day', 'Completed'),
('2026-02-17', 7, 2957, 10, 5071, 8, 3571, 25, 11599, 675, 0, 'Waiting for RORO bin', 'Completed'),
('2026-02-18', 11, 4594, 12, 6139, 9, 4679, 32, 15412, 864, 0, '', 'Completed'),
('2026-02-19', 4, 1735, 0, 0, 0, 0, 4, 1735, 108, 0, 'No power all day', 'Completed'),
('2026-02-20', 4, 1654, 13, 6588, 8, 4756, 25, 12998, 675, 0, '', 'Completed'),
('2026-02-21', 13, 5552, 13, 6797, 0, 0, 26, 12349, 702, 0, '', 'Completed'),
('2026-02-22', 11, 5746, 0, 0, 0, 0, 11, 5746, 297, 0, '', 'Completed'),
('2026-02-23', 8, 3589, 12, 6065, 10, 5360, 30, 15014, 810, 0, '', 'Completed'),
('2026-02-24', 9, 4565, 11, 5799, 11, 5788, 31, 16152, 837, 0, '', 'Completed'),
('2026-02-25', 2, 1014, 9, 4376, 12, 6444, 23, 11834, 621, 0, 'Power off - changing blades', 'Completed'),
('2026-02-26', 12, 6077, 13, 6927, 8, 4231, 33, 17235, 891, 0, '', 'Completed'),
('2026-02-27', 4, 2042, 12, 5926, 10, 5242, 26, 13210, 702, 0, 'Shredder clogged', 'Completed'),
('2026-02-28', 9, 4567, 9, 4615, 0, 0, 18, 9182, 486, 0, '', 'Completed')
ON CONFLICT (date) DO NOTHING;

-- March 2026
INSERT INTO treatment_daily_log (date, day_shift_cycles, day_shift_treated_kg, afternoon_shift_cycles, afternoon_shift_treated_kg, night_shift_cycles, night_shift_treated_kg, total_cycles, total_treated_kg, chemical_litres, downtime_minutes, downtime_reason, status)
VALUES
('2026-03-01', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '', 'Completed'),
('2026-03-02', 10, 5178, 13, 6756.6, 8, 4276, 31, 16210.6, 837, 0, '', 'Completed'),
('2026-03-03', 0, 0, 6, 3054, 10, 5155.5, 16, 8209.5, 432, 0, 'Wors stopped not pushing. Conveyor not moving', 'Completed'),
('2026-03-04', 8, 4339, 6, 3102, 8, 4127, 22, 11568, 594, 0, 'Power off - starting up late in afternoon shift', 'Completed'),
('2026-03-05', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'Wors Stopper not on site - upgrades', 'Completed'),
('2026-03-06', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'Wors Stopper not on site - upgrades', 'Completed'),
('2026-03-07', 4, 2135, 10, 5157, 0, 0, 14, 7292, 378, 0, 'Installing Wors upgraded stopper', 'Completed'),
('2026-03-08', 14, 7381, 0, 0, 0, 0, 14, 7381, 378, 0, '', 'Completed'),
('2026-03-09', 7, 3556, 7, 3679, 13, 6608, 27, 13843, 729, 0, 'Waiting for RORO. Wors Stopper problem.', 'Completed'),
('2026-03-10', 9, 4483, 11, 5918, 14, 7140, 34, 17541, 918, 0, '1.5hr incline screw clog', 'Completed'),
('2026-03-11', 9, 4634, 11, 5749, 13, 6597, 33, 16980, 891, 0, '7am-9am waiting for RORO', 'Completed'),
('2026-03-12', 9, 4556, 12, 6451, 8, 4116, 29, 15123, 783, 0, '7am-9am waiting for RORO. Loading Sharps', 'Completed'),
('2026-03-13', 12, 6116, 12, 6128, 9, 4305, 33, 16549, 891, 0, '', 'Completed'),
('2026-03-14', 8, 4090, 5, 2723, 0, 0, 13, 6813, 351, 0, '', 'Completed'),
('2026-03-15', 7, 3579, 0, 0, 0, 0, 7, 3579, 189, 0, '', 'Completed'),
('2026-03-16', 2, 1058, 11, 5741, 8, 4220, 21, 11019, 567, 0, 'No waste in the morning left', 'Completed'),
('2026-03-17', 3, 1557, 12, 6151, 0, 0, 15, 7708, 405, 0, 'No waste in the morning left. No waste for night shift', 'Completed'),
('2026-03-18', 3, 1523, 10, 5441, 10, 5496, 23, 12460, 621, 0, 'No waste in the morning left', 'Completed'),
('2026-03-19', 0, 0, 9, 4849, 3, 1665, 12, 6514, 324, 0, 'No waste - loaded anatomical waste and sharps', 'Completed'),
('2026-03-20', 3, 1524, 11, 5824, 11, 5782, 25, 13130, 675, 0, 'No Waste - loaded pharma', 'Completed'),
('2026-03-21', 4, 2038, 10, 5392, 0, 0, 14, 7430, 378, 0, 'Help move things for civil work', 'Completed'),
('2026-03-22', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'Sunday', 'Completed'),
('2026-03-23', 6, 3137, 9, 4632.5, 9, 4716, 24, 12485.5, 648, 0, '', 'Completed'),
('2026-03-24', 3, 1611.2, 9, 4646, 6, 3101, 18, 9358.2, 486, 0, '', 'Completed'),
('2026-03-25', 7, 3762, 4, 2010, 11, 5785, 22, 11557, 594, 0, '', 'Completed'),
('2026-03-26', 8, 4271, 7, 3619, 4, 2154, 19, 10044, 513, 0, '', 'Completed'),
('2026-03-27', 10, 5509, 9, 4659, 7, 3677, 26, 13845, 702, 0, '', 'Completed'),
('2026-03-28', 8, 4330, 0, 0, 0, 0, 8, 4330, 216, 0, '', 'Completed'),
('2026-03-29', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '', 'Completed'),
('2026-03-30', 3, 1554, 12, 6416, 9, 4738, 24, 12708, 648, 0, 'From 07h00 to 13h45 waiting for Ro-bin', 'Completed'),
('2026-03-31', 2, 841, 8, 4129, 0, 0, 10, 4970, 270, 0, 'Waste cleared', 'Completed')
ON CONFLICT (date) DO NOTHING;

-- April 2026
INSERT INTO treatment_daily_log (date, day_shift_cycles, day_shift_treated_kg, afternoon_shift_cycles, afternoon_shift_treated_kg, night_shift_cycles, night_shift_treated_kg, total_cycles, total_treated_kg, chemical_litres, downtime_minutes, downtime_reason, status)
VALUES
('2026-04-01', 6, 2982, 12, 6343, 0, 0, 18, 9325, 486, 0, 'Delays 09h27 to 12h00 waste cleared, cancelled night shift', 'Completed'),
('2026-04-02', 0, 0, 11, 5882, 0, 0, 11, 5882, 297, 0, 'Maintenance: Incline auger 1 improved', 'Completed'),
('2026-04-03', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'Everyone off for Easter Friday', 'Completed'),
('2026-04-04', 10, 5393, 0, 0, 0, 0, 10, 5393, 270, 0, '', 'Completed'),
('2026-04-05', 11, 5748, 0, 0, 0, 0, 11, 5748, 297, 0, '', 'Completed'),
('2026-04-06', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'No Waste treated. RORO bin not exchanged', 'Completed'),
('2026-04-07', 9, 4734, 10, 5252, 11, 5708, 30, 15694, 810, 0, '', 'Completed'),
('2026-04-08', 5, 2581, 9, 4794, 3, 1629, 17, 9004, 459, 0, 'Ran out of waste. Loaded trucks with sharps', 'Completed'),
('2026-04-09', 3, 1539, 10, 5342, 1, 542.7, 14, 7423.7, 378, 0, 'Ran out of waste. Loaded truck with sharps', 'Completed'),
('2026-04-10', 3, 1524, 8, 4262, 5, 2534, 16, 8320, 432, 0, 'Ran out of waste', 'Completed'),
('2026-04-11', 11, 5796, 0, 0, 0, 0, 11, 5796, 297, 0, '', 'Completed'),
('2026-04-12', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '', 'Completed'),
('2026-04-13', 3, 1599, 9, 4704, 10, 5369, 22, 11672, 594, 0, '', 'Completed'),
('2026-04-14', 5, 2695, 7, 3476, 0, 0, 12, 6171, 324, 0, 'Night shift cancelled - no waste', 'Completed'),
('2026-04-15', 7, 3710, 12, 6242, 0, 0, 19, 9952, 513, 0, 'Night shift cancelled - no waste', 'Completed'),
('2026-04-16', 4, 2156, 6, 3192, 7, 3885, 17, 9233, 459, 0, '', 'Completed'),
('2026-04-17', 5, 2606, 9, 4784, 0, 0, 14, 7390, 378, 0, 'Night shift cancelled - no waste', 'Completed'),
('2026-04-18', 12, 6475, 0, 0, 0, 0, 12, 6475, 324, 0, '', 'Completed'),
('2026-04-19', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '', 'Completed'),
('2026-04-20', 5, 2558, 8, 4294, 0, 0, 13, 6852, 351, 0, '', 'Completed'),
('2026-04-21', 12, 6372, 10, 5315, 0, 0, 22, 11687, 594, 0, '', 'Completed'),
('2026-04-22', 8, 4317, 11, 5667, 0, 0, 19, 9984, 513, 0, '', 'Completed'),
('2026-04-23', 6, 3192, 8, 4371, 0, 0, 14, 7563, 378, 0, '', 'Completed'),
('2026-04-24', 2, 1055, 10, 5373, 0, 0, 12, 6428, 324, 0, '', 'Completed'),
('2026-04-25', 14, 7234, 0, 0, 0, 0, 14, 7234, 378, 0, '', 'Completed'),
('2026-04-26', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '', 'Completed'),
('2026-04-27', 3, 1603, 10, 5332, 0, 0, 13, 6935, 351, 0, '', 'Completed'),
('2026-04-28', 10, 5303, 9, 4637, 0, 0, 19, 9940, 513, 0, '', 'Completed'),
('2026-04-29', 6, 3203, 8, 4160, 0, 0, 14, 7363, 378, 0, '', 'Completed'),
('2026-04-30', 3, 1661, 12, 6338, 0, 0, 15, 7999, 405, 0, '', 'Completed')
ON CONFLICT (date) DO NOTHING;

-- May 2026
INSERT INTO treatment_daily_log (date, day_shift_cycles, day_shift_treated_kg, afternoon_shift_cycles, afternoon_shift_treated_kg, night_shift_cycles, night_shift_treated_kg, total_cycles, total_treated_kg, chemical_litres, downtime_minutes, downtime_reason, status)
VALUES
('2026-05-01', 5, 2648, 0, 0, 0, 0, 5, 2648, 135, 0, '', 'Completed'),
('2026-05-02', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '', 'Completed'),
('2026-05-03', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '', 'Completed'),
('2026-05-04', 10, 5305, 9, 4789, 0, 0, 19, 10094, 513, 0, '', 'Completed'),
('2026-05-05', 12, 6371, 9, 5020, 0, 0, 21, 11391, 567, 0, '', 'Completed'),
('2026-05-06', 11, 5893, 10, 5367, 0, 0, 21, 11260, 567, 0, '', 'Completed'),
('2026-05-07', 12, 6226, 7, 3852, 0, 0, 19, 10078, 513, 0, '', 'Completed'),
('2026-05-08', 6, 3231, 10, 5486, 0, 0, 16, 8717, 432, 0, '', 'Completed'),
('2026-05-09', 10, 5614, 8, 4254, 0, 0, 18, 9868, 486, 0, '', 'Completed'),
('2026-05-10', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '', 'Completed'),
('2026-05-11', 5, 2739, 11, 6059, 0, 0, 16, 8798, 432, 0, '', 'Completed'),
('2026-05-12', 9, 4860, 10, 5506, 0, 0, 19, 10366, 513, 0, '', 'Completed'),
('2026-05-13', 8, 4438, 12, 6690, 0, 0, 20, 11128, 540, 0, '', 'Completed'),
('2026-05-14', 3, 1666, 8, 4608, 0, 0, 11, 6274, 297, 0, '', 'Completed'),
('2026-05-15', 8, 4130, 10, 5504, 0, 0, 18, 9634, 486, 0, '', 'Completed'),
('2026-05-16', 5, 2770, 9, 4881, 0, 0, 14, 7651, 378, 0, '', 'Completed'),
('2026-05-17', 2, 1015, 0, 0, 0, 0, 2, 1015, 54, 0, '', 'Completed'),
('2026-05-18', 3, 1648, 10, 5334, 0, 0, 13, 6982, 351, 0, '', 'Completed'),
('2026-05-19', 10, 5528, 8, 4445, 0, 0, 18, 9973, 486, 0, '', 'Completed'),
('2026-05-20', 9, 4964, 10, 5558, 0, 0, 19, 10522, 513, 0, '', 'Completed'),
('2026-05-21', 8, 4410, 10, 5494, 0, 0, 18, 9904, 486, 0, '', 'Completed'),
('2026-05-22', 10, 5513, 9, 4963, 0, 0, 19, 10476, 513, 0, '', 'Completed'),
('2026-05-23', 9, 4978, 8, 4441, 0, 0, 17, 9419, 459, 0, '', 'Completed'),
('2026-05-24', 9, 4957, 3, 1679, 0, 0, 12, 6636, 324, 0, '', 'Completed'),
('2026-05-25', 7, 3891, 11, 6125, 10, 5657, 28, 15673, 756, 0, '', 'Completed'),
('2026-05-26', 7, 3875, 8, 4463, 0, 0, 15, 8338, 405, 0, 'Wors stopper and incline dryer blocked', 'Completed'),
('2026-05-27', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '', 'Completed'),
('2026-05-28', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '', 'Completed'),
('2026-05-29', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '', 'Completed'),
('2026-05-30', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '', 'Completed'),
('2026-05-31', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '', 'Completed')
ON CONFLICT (date) DO NOTHING;

-- Monthly summaries
INSERT INTO treatment_monthly_summary (month, total_sent_for_landfill_kg, total_water_to_landfill_kg)
VALUES
('2026-01-01', 309520, 61033.9),
('2026-02-01', 329870, 76849),
('2026-03-01', 337930, 59282.2)
ON CONFLICT (month) DO NOTHING;

-- Waste transfers from the CSV data
-- We need to get the daily_log_id for the transfer dates, so we insert after the daily logs
DO $$
DECLARE
  v_log_id uuid;
BEGIN
  -- March 15: 7013 kg infectious to ClinX
  SELECT id INTO v_log_id FROM treatment_daily_log WHERE date = '2026-03-15';
  IF v_log_id IS NOT NULL THEN
    INSERT INTO treatment_waste_transfers (daily_log_id, transfer_type, waste_category, quantity_kg, destination)
    VALUES (v_log_id, 'Transfer Out', 'Infectious', 7013, 'ClinX');
  END IF;

  -- March 19: 3401 kg anatomical to A-Thermal
  SELECT id INTO v_log_id FROM treatment_daily_log WHERE date = '2026-03-19';
  IF v_log_id IS NOT NULL THEN
    INSERT INTO treatment_waste_transfers (daily_log_id, transfer_type, waste_category, quantity_kg, destination)
    VALUES (v_log_id, 'Transfer Out', 'Anatomical', 3401, 'A-Thermal');
  END IF;

  -- April 2: 4300 kg anatomical to Holfontein
  SELECT id INTO v_log_id FROM treatment_daily_log WHERE date = '2026-04-02';
  IF v_log_id IS NOT NULL THEN
    INSERT INTO treatment_waste_transfers (daily_log_id, transfer_type, waste_category, quantity_kg, destination)
    VALUES (v_log_id, 'Transfer Out', 'Anatomical', 4300, 'Holfontein');
  END IF;

  -- May 1: 2265.5 kg anatomical to Averda
  SELECT id INTO v_log_id FROM treatment_daily_log WHERE date = '2026-05-01';
  IF v_log_id IS NOT NULL THEN
    INSERT INTO treatment_waste_transfers (daily_log_id, transfer_type, waste_category, quantity_kg, destination)
    VALUES (v_log_id, 'Transfer Out', 'Anatomical', 2265.5, 'Averda');
  END IF;
END $$;
