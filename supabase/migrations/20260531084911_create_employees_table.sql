/*
  # Create Employees Table

  This migration creates the central employees table that serves as the single source
  of truth for all Tech4Green staff, referenced across all modules (Stock, Treatment,
  Health & Safety, Training).

  1. New Tables
    - `employees`
      - `id` (uuid, primary key) - unique identifier
      - `employee_number` (text, unique) - company employee code (e.g., MAR001)
      - `surname` (text) - last name
      - `first_name` (text) - first name(s)
      - `gender` (text) - Male/Female/Other
      - `date_of_birth` (date, nullable) - birth date
      - `id_number` (text, nullable) - SA ID number
      - `contact_number` (text, nullable) - phone number
      - `email` (text, nullable) - email address
      - `address_line_1` (text) - physical address line 1
      - `address_line_2` (text) - physical address line 2
      - `address_line_3` (text) - physical address line 3
      - `postal_code` (text) - postal code
      - `position` (text) - job title/role (Truck Driver, General Worker, etc.)
      - `department` (text) - department assignment
      - `is_truck_handler` (boolean) - whether this general worker rotates to truck duties
      - `status` (text) - active/inactive
      - `date_joined` (date, nullable) - employment start date
      - `emergency_contact_name` (text) - emergency contact name
      - `emergency_contact_number` (text) - emergency contact phone
      - `medical_fund` (text) - medical aid fund & plan
      - `medical_fund_number` (text) - medical aid number
      - `chronic_medication` (text) - chronic medication info
      - `notes` (text) - additional notes
      - `created_at` (timestamptz) - record creation timestamp
      - `updated_at` (timestamptz) - record last update timestamp

  2. Security
    - Enable RLS on `employees` table
    - Add policy for authenticated users to read employee data
    - Add policy for authenticated users to insert employee data
    - Add policy for authenticated users to update employee data
    - Add policy for authenticated users to delete employee data

  3. Important Notes
    - The `is_truck_handler` flag marks general workers who rotate between plant and truck duties
    - Employee numbers follow the pattern: first 3 letters of surname + sequence (e.g., MAR001)
    - This table is the central reference for all modules
*/

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_number text UNIQUE NOT NULL,
  surname text NOT NULL DEFAULT '',
  first_name text NOT NULL DEFAULT '',
  gender text NOT NULL DEFAULT '',
  date_of_birth date,
  id_number text DEFAULT '',
  contact_number text DEFAULT '',
  email text DEFAULT '',
  address_line_1 text DEFAULT '',
  address_line_2 text DEFAULT '',
  address_line_3 text DEFAULT '',
  postal_code text DEFAULT '',
  position text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT 'Operations',
  is_truck_handler boolean DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  date_joined date,
  emergency_contact_name text DEFAULT '',
  emergency_contact_number text DEFAULT '',
  medical_fund text DEFAULT '',
  medical_fund_number text DEFAULT '',
  chronic_medication text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read employees"
  ON employees FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_employees_employee_number ON employees (employee_number);
CREATE INDEX IF NOT EXISTS idx_employees_position ON employees (position);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees (status);
