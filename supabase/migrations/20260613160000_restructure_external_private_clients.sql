/*
  # Restructure External & Private catch-all clients

  Splits the "External" and "Private" umbrella clients into proper named clients:

  Multi-site groups (group → client, facility prefix stripped):
    - Izinso Dialysis Services  (8 sites)
    - Makhathini Medical Waste  (2 sites)
    - Organic Matters           (3 sites)
    - Safeline                  (4 sites)

  Single-entity External (each becomes its own client):
    - Averda South Africa, Buhle Waste, Phuting Medical Waste,
      Pleasant Waste, Umndeni Waste

  Single-entity Private (each becomes its own client):
    - AON, Dr Mostert Veronica, Dr van Niekerk HA,
      Rina Jonk Physiotherapist, Sank Med,
      Switch Waste, Vaalbud Nursery

  Both "External" and "Private" clients are deleted after all records are migrated.
  Re-runnable: all inserts are guarded with WHERE NOT EXISTS.
*/

BEGIN;

-- ── 1. Create new clients ────────────────────────────────────────────────────

INSERT INTO public.clients (client_name)
SELECT v.name FROM (VALUES
  ('Izinso Dialysis Services'),
  ('Makhathini Medical Waste'),
  ('Organic Matters'),
  ('Safeline'),
  ('Averda South Africa'),
  ('Buhle Waste'),
  ('Phuting Medical Waste'),
  ('Pleasant Waste'),
  ('Umndeni Waste'),
  ('AON'),
  ('Dr Mostert Veronica'),
  ('Dr van Niekerk HA'),
  ('Rina Jonk Physiotherapist'),
  ('Sank Med'),
  ('Switch Waste'),
  ('Vaalbud Nursery')
) AS v(name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.clients c WHERE lower(c.client_name) = lower(v.name)
);

-- ── 2. Migrate multi-site groups ─────────────────────────────────────────────

-- Izinso Dialysis Services
UPDATE public.received_waste_records
SET client_id = (SELECT id FROM public.clients WHERE client_name = 'Izinso Dialysis Services')
WHERE site_id IN (
  SELECT id FROM public.client_sites WHERE generator_facility LIKE 'Izinso Dialysis Services%'
);
UPDATE public.client_sites
SET
  client_id    = (SELECT id FROM public.clients WHERE client_name = 'Izinso Dialysis Services'),
  generator_facility = TRIM(REPLACE(generator_facility, 'Izinso Dialysis Services ', '')),
  generator_group    = ''
WHERE generator_facility LIKE 'Izinso Dialysis Services%';

-- Makhathini Medical Waste
UPDATE public.received_waste_records
SET client_id = (SELECT id FROM public.clients WHERE client_name = 'Makhathini Medical Waste')
WHERE site_id IN (
  SELECT id FROM public.client_sites WHERE generator_facility LIKE 'Makhathini Medical Waste%'
);
UPDATE public.client_sites
SET
  client_id    = (SELECT id FROM public.clients WHERE client_name = 'Makhathini Medical Waste'),
  generator_facility = TRIM(REPLACE(REPLACE(generator_facility, 'Makhathini Medical Waste (', ''), ')', '')),
  generator_group    = ''
WHERE generator_facility LIKE 'Makhathini Medical Waste%';

-- Organic Matters
UPDATE public.received_waste_records
SET client_id = (SELECT id FROM public.clients WHERE client_name = 'Organic Matters')
WHERE site_id IN (
  SELECT id FROM public.client_sites WHERE generator_facility LIKE 'Organic Matters%'
);
UPDATE public.client_sites
SET
  client_id    = (SELECT id FROM public.clients WHERE client_name = 'Organic Matters'),
  generator_facility = TRIM(REPLACE(generator_facility, 'Organic Matters ', '')),
  generator_group    = ''
WHERE generator_facility LIKE 'Organic Matters%';

-- Safeline
UPDATE public.received_waste_records
SET client_id = (SELECT id FROM public.clients WHERE client_name = 'Safeline')
WHERE site_id IN (
  SELECT id FROM public.client_sites WHERE generator_facility LIKE 'Safeline%'
);
UPDATE public.client_sites
SET
  client_id    = (SELECT id FROM public.clients WHERE client_name = 'Safeline'),
  generator_facility = TRIM(REPLACE(generator_facility, 'Safeline ', '')),
  generator_group    = ''
WHERE generator_facility LIKE 'Safeline%';

-- ── 3. Migrate single-entity External facilities ──────────────────────────────

-- Averda South Africa (PTY) Ltd → Averda South Africa
UPDATE public.received_waste_records
SET client_id = (SELECT id FROM public.clients WHERE client_name = 'Averda South Africa')
WHERE site_id IN (SELECT id FROM public.client_sites WHERE generator_facility = 'Averda South Africa (PTY) Ltd');
UPDATE public.client_sites
SET client_id = (SELECT id FROM public.clients WHERE client_name = 'Averda South Africa'),
    generator_facility = 'Averda South Africa', generator_group = ''
WHERE generator_facility = 'Averda South Africa (PTY) Ltd';

-- Buhle Waste Pty Ltd → Buhle Waste
UPDATE public.received_waste_records
SET client_id = (SELECT id FROM public.clients WHERE client_name = 'Buhle Waste')
WHERE site_id IN (SELECT id FROM public.client_sites WHERE generator_facility = 'Buhle Waste Pty Ltd');
UPDATE public.client_sites
SET client_id = (SELECT id FROM public.clients WHERE client_name = 'Buhle Waste'),
    generator_facility = 'Buhle Waste', generator_group = ''
WHERE generator_facility = 'Buhle Waste Pty Ltd';

-- Phuting Medical Waste
UPDATE public.received_waste_records
SET client_id = (SELECT id FROM public.clients WHERE client_name = 'Phuting Medical Waste')
WHERE site_id IN (SELECT id FROM public.client_sites WHERE generator_facility = 'Phuting Medical Waste');
UPDATE public.client_sites
SET client_id = (SELECT id FROM public.clients WHERE client_name = 'Phuting Medical Waste'),
    generator_group = ''
WHERE generator_facility = 'Phuting Medical Waste';

-- Pleasant Waste
UPDATE public.received_waste_records
SET client_id = (SELECT id FROM public.clients WHERE client_name = 'Pleasant Waste')
WHERE site_id IN (SELECT id FROM public.client_sites WHERE generator_facility = 'Pleasant Waste');
UPDATE public.client_sites
SET client_id = (SELECT id FROM public.clients WHERE client_name = 'Pleasant Waste'),
    generator_group = ''
WHERE generator_facility = 'Pleasant Waste';

-- Umndeni Waste
UPDATE public.received_waste_records
SET client_id = (SELECT id FROM public.clients WHERE client_name = 'Umndeni Waste')
WHERE site_id IN (SELECT id FROM public.client_sites WHERE generator_facility = 'Umndeni Waste');
UPDATE public.client_sites
SET client_id = (SELECT id FROM public.clients WHERE client_name = 'Umndeni Waste'),
    generator_group = ''
WHERE generator_facility = 'Umndeni Waste';

-- ── 4. Migrate single-entity Private facilities ───────────────────────────────

-- AON (Pty) Ltd → AON
UPDATE public.received_waste_records
SET client_id = (SELECT id FROM public.clients WHERE client_name = 'AON')
WHERE site_id IN (SELECT id FROM public.client_sites WHERE generator_facility = 'AON (Pty) Ltd');
UPDATE public.client_sites
SET client_id = (SELECT id FROM public.clients WHERE client_name = 'AON'),
    generator_facility = 'AON', generator_group = ''
WHERE generator_facility = 'AON (Pty) Ltd';

-- Dr Mostert Veronica
UPDATE public.received_waste_records
SET client_id = (SELECT id FROM public.clients WHERE client_name = 'Dr Mostert Veronica')
WHERE site_id IN (SELECT id FROM public.client_sites WHERE generator_facility = 'Dr Mostert Veronica');
UPDATE public.client_sites
SET client_id = (SELECT id FROM public.clients WHERE client_name = 'Dr Mostert Veronica'),
    generator_group = ''
WHERE generator_facility = 'Dr Mostert Veronica';

-- Dr van Niekerk HA
UPDATE public.received_waste_records
SET client_id = (SELECT id FROM public.clients WHERE client_name = 'Dr van Niekerk HA')
WHERE site_id IN (SELECT id FROM public.client_sites WHERE generator_facility = 'Dr van Niekerk HA');
UPDATE public.client_sites
SET client_id = (SELECT id FROM public.clients WHERE client_name = 'Dr van Niekerk HA'),
    generator_group = ''
WHERE generator_facility = 'Dr van Niekerk HA';

-- Rina Jonk Physiotherapist
UPDATE public.received_waste_records
SET client_id = (SELECT id FROM public.clients WHERE client_name = 'Rina Jonk Physiotherapist')
WHERE site_id IN (SELECT id FROM public.client_sites WHERE generator_facility = 'Rina Jonk Physiotherapist');
UPDATE public.client_sites
SET client_id = (SELECT id FROM public.clients WHERE client_name = 'Rina Jonk Physiotherapist'),
    generator_group = ''
WHERE generator_facility = 'Rina Jonk Physiotherapist';

-- Sank Med (Pty) Ltd → Sank Med
UPDATE public.received_waste_records
SET client_id = (SELECT id FROM public.clients WHERE client_name = 'Sank Med')
WHERE site_id IN (SELECT id FROM public.client_sites WHERE generator_facility = 'Sank Med (Pty) Ltd');
UPDATE public.client_sites
SET client_id = (SELECT id FROM public.clients WHERE client_name = 'Sank Med'),
    generator_facility = 'Sank Med', generator_group = ''
WHERE generator_facility = 'Sank Med (Pty) Ltd';

-- Switch Waste
UPDATE public.received_waste_records
SET client_id = (SELECT id FROM public.clients WHERE client_name = 'Switch Waste')
WHERE site_id IN (SELECT id FROM public.client_sites WHERE generator_facility = 'Switch Waste');
UPDATE public.client_sites
SET client_id = (SELECT id FROM public.clients WHERE client_name = 'Switch Waste'),
    generator_group = ''
WHERE generator_facility = 'Switch Waste';

-- Vaalbud Nursery
UPDATE public.received_waste_records
SET client_id = (SELECT id FROM public.clients WHERE client_name = 'Vaalbud Nursery')
WHERE site_id IN (SELECT id FROM public.client_sites WHERE generator_facility = 'Vaalbud Nursery');
UPDATE public.client_sites
SET client_id = (SELECT id FROM public.clients WHERE client_name = 'Vaalbud Nursery'),
    generator_group = ''
WHERE generator_facility = 'Vaalbud Nursery';

-- ── 5. Catch any remaining records still pointing at External / Private ────────
-- (safety net for records without a site_id)
UPDATE public.received_waste_records
SET client_id = NULL
WHERE client_id IN (SELECT id FROM public.clients WHERE client_name IN ('External', 'Private'))
  AND site_id IS NULL;

-- ── 6. Delete the catch-all clients ──────────────────────────────────────────
DELETE FROM public.clients WHERE client_name IN ('External', 'Private');

COMMIT;
