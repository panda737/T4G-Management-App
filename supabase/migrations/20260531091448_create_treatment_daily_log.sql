/*
  # Create Treatment Plant Daily Log Table

  This table stores daily treatment production data for the Tech4Green cold chemical
  treatment plant. Each row represents one day of operations.

  The plant uses a cold chemical treatment process (peracetic acid + hydrogen peroxide)
  to treat infectious healthcare risk waste. Operations run across 3 shifts:
  Day, Afternoon, and Night (Night shift is sometimes cancelled if waste volume is low).

  1. New Tables
    - `treatment_daily_log`
      - `id` (uuid, primary key)
      - `date` (date, unique) - the production date
      - `day_shift_cycles` (integer) - number of treatment cycles completed on day shift
      - `day_shift_treated_kg` (numeric) - kg of waste treated on day shift
      - `afternoon_shift_cycles` (integer) - cycles on afternoon shift
      - `afternoon_shift_treated_kg` (numeric) - kg treated on afternoon shift
      - `night_shift_cycles` (integer) - cycles on night shift
      - `night_shift_treated_kg` (numeric) - kg treated on night shift
      - `total_cycles` (integer) - total cycles across all shifts (auto-calculated)
      - `total_treated_kg` (numeric) - total kg treated across all shifts (auto-calculated)
      - `chemical_litres` (numeric) - total chemical usage in litres (peracetic acid + H2O2 mix, 27L per cycle)
      - `downtime_minutes` (integer) - estimated downtime in minutes
      - `downtime_reason` (text) - description of downtime cause
      - `supervisor_id` (uuid, FK to employees) - supervisor on duty
      - `notes` (text) - general notes for the day
      - `status` (text) - Draft / Completed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `treatment_waste_transfers`
      - `id` (uuid, primary key)
      - `daily_log_id` (uuid, FK to treatment_daily_log)
      - `transfer_type` (text) - 'Transfer Out' or 'Landfill'
      - `waste_category` (text) - Infectious / Sharps / Anatomical / Pharmaceutical / Other
      - `quantity_kg` (numeric) - kg transferred
      - `destination` (text) - facility name (A-Thermal, Averda, Biomed, ClinX, Mooiplaats Landfill)
      - `manifest_number` (text) - waste manifest/tracking number
      - `notes` (text)
      - `created_at` (timestamptz)

    - `treatment_monthly_summary`
      - `id` (uuid, primary key)
      - `month` (date) - first day of the month
      - `total_sent_for_landfill_kg` (numeric) - monthly total treated waste sent to Mooiplaats
      - `total_water_to_landfill_kg` (numeric) - monthly total water/liquid waste to landfill
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Authenticated users can read, insert, update, and delete treatment records

  3. Important Notes
    - Chemical usage is 27 litres per cycle (peracetic acid + hydrogen peroxide mix)
    - Target is 12 cycles per shift
    - 3 shifts: Day, Afternoon, Night
    - Transfer Out destinations: A-Thermal, Averda, Biomed, ClinX
    - Landfill destination: Mooiplaats Landfill
    - Waste categories: Infectious, Sharps, Anatomical, Pharmaceutical, Other
*/

-- Daily treatment log
CREATE TABLE IF NOT EXISTS treatment_daily_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date UNIQUE NOT NULL,
  day_shift_cycles integer DEFAULT 0,
  day_shift_treated_kg numeric DEFAULT 0,
  afternoon_shift_cycles integer DEFAULT 0,
  afternoon_shift_treated_kg numeric DEFAULT 0,
  night_shift_cycles integer DEFAULT 0,
  night_shift_treated_kg numeric DEFAULT 0,
  total_cycles integer DEFAULT 0,
  total_treated_kg numeric DEFAULT 0,
  chemical_litres numeric DEFAULT 0,
  downtime_minutes integer DEFAULT 0,
  downtime_reason text DEFAULT '',
  supervisor_id uuid REFERENCES employees(id),
  notes text DEFAULT '',
  status text NOT NULL DEFAULT 'Draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE treatment_daily_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read treatment logs"
  ON treatment_daily_log FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert treatment logs"
  ON treatment_daily_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update treatment logs"
  ON treatment_daily_log FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete treatment logs"
  ON treatment_daily_log FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_treatment_daily_log_date ON treatment_daily_log (date);
CREATE INDEX IF NOT EXISTS idx_treatment_daily_log_status ON treatment_daily_log (status);

-- Waste transfers (transfer out + landfill)
CREATE TABLE IF NOT EXISTS treatment_waste_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id uuid REFERENCES treatment_daily_log(id) ON DELETE CASCADE,
  transfer_type text NOT NULL DEFAULT 'Transfer Out',
  waste_category text NOT NULL DEFAULT 'Infectious',
  quantity_kg numeric NOT NULL DEFAULT 0,
  destination text NOT NULL DEFAULT '',
  manifest_number text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE treatment_waste_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read waste transfers"
  ON treatment_waste_transfers FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert waste transfers"
  ON treatment_waste_transfers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update waste transfers"
  ON treatment_waste_transfers FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete waste transfers"
  ON treatment_waste_transfers FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_waste_transfers_daily_log ON treatment_waste_transfers (daily_log_id);

-- Monthly summary (landfill totals)
CREATE TABLE IF NOT EXISTS treatment_monthly_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date UNIQUE NOT NULL,
  total_sent_for_landfill_kg numeric DEFAULT 0,
  total_water_to_landfill_kg numeric DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE treatment_monthly_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read monthly summaries"
  ON treatment_monthly_summary FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert monthly summaries"
  ON treatment_monthly_summary FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update monthly summaries"
  ON treatment_monthly_summary FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete monthly summaries"
  ON treatment_monthly_summary FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
