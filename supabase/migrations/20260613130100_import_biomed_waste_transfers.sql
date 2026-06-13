/*
  # Import Biomed Waste Transfers (2025-2026)

  Source: Tech4Green Waste Consolidated Report (2025-2026).csv
  Columns: DATE, WEIGHBRIDGE NO., Del/Coll, SHARPS, INFECTIOUS, TOTAL.

  Rules:
    - Aggregated per (date, waste stream); destination 'Biomed'.
    - One record per non-zero Sharps / Infectious value.
    - Weighbridge no. used as manifest where a single one backs the row (N/A ignored).
  Re-runnable: deletes existing Biomed rows, recreates missing daily logs, re-inserts.
  Records: 52. Dates: 48.
*/

DELETE FROM treatment_waste_transfers WHERE destination = 'Biomed';

INSERT INTO treatment_daily_log (date, status) VALUES
  ('2025-12-05', 'Completed'),
  ('2025-12-06', 'Completed'),
  ('2025-12-10', 'Completed'),
  ('2025-12-15', 'Completed'),
  ('2025-12-17', 'Completed'),
  ('2025-12-18', 'Completed'),
  ('2025-12-23', 'Completed'),
  ('2025-12-29', 'Completed'),
  ('2025-12-30', 'Completed'),
  ('2026-01-05', 'Completed'),
  ('2026-01-08', 'Completed'),
  ('2026-01-09', 'Completed'),
  ('2026-01-12', 'Completed'),
  ('2026-01-13', 'Completed'),
  ('2026-01-15', 'Completed'),
  ('2026-01-20', 'Completed'),
  ('2026-01-23', 'Completed'),
  ('2026-01-27', 'Completed'),
  ('2026-01-28', 'Completed'),
  ('2026-02-02', 'Completed'),
  ('2026-02-03', 'Completed'),
  ('2026-02-09', 'Completed'),
  ('2026-02-12', 'Completed'),
  ('2026-02-13', 'Completed'),
  ('2026-02-15', 'Completed'),
  ('2026-02-19', 'Completed'),
  ('2026-02-27', 'Completed'),
  ('2026-03-02', 'Completed'),
  ('2026-03-06', 'Completed'),
  ('2026-03-11', 'Completed'),
  ('2026-03-12', 'Completed'),
  ('2026-03-13', 'Completed'),
  ('2026-03-16', 'Completed'),
  ('2026-03-17', 'Completed'),
  ('2026-03-19', 'Completed'),
  ('2026-03-24', 'Completed'),
  ('2026-04-09', 'Completed'),
  ('2026-04-10', 'Completed'),
  ('2026-04-16', 'Completed'),
  ('2026-04-17', 'Completed'),
  ('2026-04-24', 'Completed'),
  ('2026-05-11', 'Completed'),
  ('2026-05-12', 'Completed'),
  ('2026-05-18', 'Completed'),
  ('2026-05-19', 'Completed'),
  ('2026-05-21', 'Completed'),
  ('2026-05-22', 'Completed'),
  ('2026-05-29', 'Completed')
ON CONFLICT (date) DO NOTHING;

INSERT INTO treatment_waste_transfers
  (daily_log_id, transfer_type, waste_category, quantity_kg, destination, manifest_number)
SELECT dl.id, v.transfer_type, v.waste_category, v.quantity_kg, v.destination, v.manifest_number
FROM (VALUES
  ('2025-12-05'::date, 'Outbound', 'Infectious', 4753.6, 'Biomed', '19155'),
  ('2025-12-05'::date, 'Outbound', 'Sharps', 3466.4, 'Biomed', ''),
  ('2025-12-06'::date, 'Outbound', 'Infectious', 8055.5, 'Biomed', '19160'),
  ('2025-12-06'::date, 'Outbound', 'Sharps', 1412.5, 'Biomed', '19160'),
  ('2025-12-10'::date, 'Outbound', 'Infectious', 1761.5, 'Biomed', '19171'),
  ('2025-12-10'::date, 'Outbound', 'Sharps', 2178.5, 'Biomed', '19171'),
  ('2025-12-15'::date, 'Outbound', 'Infectious', 5480, 'Biomed', '19185'),
  ('2025-12-17'::date, 'Outbound', 'Infectious', 16370, 'Biomed', ''),
  ('2025-12-18'::date, 'Outbound', 'Sharps', 5200, 'Biomed', '19196'),
  ('2025-12-23'::date, 'Outbound', 'Sharps', 2700, 'Biomed', '19207'),
  ('2025-12-29'::date, 'Outbound', 'Infectious', 12174, 'Biomed', '19214'),
  ('2025-12-29'::date, 'Outbound', 'Sharps', 2846, 'Biomed', '19214'),
  ('2025-12-30'::date, 'Outbound', 'Infectious', 2180, 'Biomed', '19218'),
  ('2026-01-05'::date, 'Outbound', 'Sharps', 4180, 'Biomed', '19230'),
  ('2026-01-08'::date, 'Outbound', 'Infectious', 5480, 'Biomed', '19238'),
  ('2026-01-09'::date, 'Outbound', 'Sharps', 4020, 'Biomed', '19242'),
  ('2026-01-12'::date, 'Outbound', 'Infectious', 3220, 'Biomed', '19248'),
  ('2026-01-13'::date, 'Outbound', 'Sharps', 3500, 'Biomed', '19252'),
  ('2026-01-15'::date, 'Outbound', 'Infectious', 3400, 'Biomed', '19258'),
  ('2026-01-20'::date, 'Outbound', 'Sharps', 4060, 'Biomed', '19270'),
  ('2026-01-23'::date, 'Outbound', 'Infectious', 12560, 'Biomed', ''),
  ('2026-01-27'::date, 'Outbound', 'Sharps', 4540, 'Biomed', ''),
  ('2026-01-28'::date, 'Outbound', 'Infectious', 6660, 'Biomed', ''),
  ('2026-02-02'::date, 'Outbound', 'Infectious', 15330, 'Biomed', ''),
  ('2026-02-03'::date, 'Outbound', 'Infectious', 4400, 'Biomed', '19298'),
  ('2026-02-09'::date, 'Outbound', 'Infectious', 14650, 'Biomed', '19313'),
  ('2026-02-12'::date, 'Outbound', 'Sharps', 4260, 'Biomed', ''),
  ('2026-02-13'::date, 'Outbound', 'Infectious', 5120, 'Biomed', '19325'),
  ('2026-02-15'::date, 'Outbound', 'Infectious', 18130, 'Biomed', ''),
  ('2026-02-19'::date, 'Outbound', 'Sharps', 3780, 'Biomed', '19341'),
  ('2026-02-27'::date, 'Outbound', 'Sharps', 3640, 'Biomed', '19361'),
  ('2026-03-02'::date, 'Outbound', 'Infectious', 15790, 'Biomed', ''),
  ('2026-03-06'::date, 'Outbound', 'Infectious', 5120, 'Biomed', '19380'),
  ('2026-03-11'::date, 'Outbound', 'Sharps', 2400, 'Biomed', '19391'),
  ('2026-03-12'::date, 'Outbound', 'Sharps', 3680, 'Biomed', '19396'),
  ('2026-03-13'::date, 'Outbound', 'Sharps', 3480, 'Biomed', '19397'),
  ('2026-03-16'::date, 'Outbound', 'Infectious', 4520, 'Biomed', '19405'),
  ('2026-03-17'::date, 'Outbound', 'Sharps', 3820, 'Biomed', '19407'),
  ('2026-03-19'::date, 'Outbound', 'Sharps', 4120, 'Biomed', '19417'),
  ('2026-03-24'::date, 'Outbound', 'Sharps', 3700, 'Biomed', '19427'),
  ('2026-04-09'::date, 'Outbound', 'Sharps', 3420, 'Biomed', '19460'),
  ('2026-04-10'::date, 'Outbound', 'Sharps', 2660, 'Biomed', '19460'),
  ('2026-04-16'::date, 'Outbound', 'Sharps', 3100, 'Biomed', ''),
  ('2026-04-17'::date, 'Outbound', 'Sharps', 4000, 'Biomed', '19478'),
  ('2026-04-24'::date, 'Outbound', 'Sharps', 3260, 'Biomed', '19484'),
  ('2026-05-11'::date, 'Outbound', 'Sharps', 3700, 'Biomed', '19507'),
  ('2026-05-12'::date, 'Outbound', 'Sharps', 4040, 'Biomed', '19513'),
  ('2026-05-18'::date, 'Outbound', 'Sharps', 2480, 'Biomed', '19522'),
  ('2026-05-19'::date, 'Outbound', 'Sharps', 7540, 'Biomed', ''),
  ('2026-05-21'::date, 'Outbound', 'Sharps', 3900, 'Biomed', '19536'),
  ('2026-05-22'::date, 'Outbound', 'Sharps', 2700, 'Biomed', '19537'),
  ('2026-05-29'::date, 'Outbound', 'Sharps', 4340, 'Biomed', '19552')
) AS v(date, transfer_type, waste_category, quantity_kg, destination, manifest_number)
JOIN treatment_daily_log dl ON dl.date = v.date;
