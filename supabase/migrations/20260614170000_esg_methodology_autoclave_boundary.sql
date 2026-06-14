-- ─────────────────────────────────────────────────────────────────────────────
-- ESG methodology correction (Tech4Green vs autoclave, defined boundaries)
--
-- Corrections (all kept in DRAFT — nothing is approved/published here):
--   1. Active baseline comparator = AUTOCLAVE (was incineration). Incineration is
--      retained as a reference/alternative comparator, not the active baseline.
--   2. treatment_factor:t4g_plant = 0.000 kg CO2e/kg — DIRECT TREATMENT-PROCESS
--      boundary ONLY (no combustion). This is NOT total operational net-zero:
--      electricity / diesel / water / transport are accounted separately and only
--      from verified operational data.
--   3. Effluent is NOT APPLICABLE to Tech4Green (no effluent stream). water_factor:
--      effluent is kept as a reference factor for other technologies only.
--   4. New per-factor audit field `calculation_boundary` so every factor states the
--      boundary it applies within (alongside value/unit/source/effective_date/status/
--      approved_by/approved_at already present; calc-run id lives on esg_results).
--
-- The verified autoclave factor stays a DRAFT PLACEHOLDER until a real value+source
-- is supplied; the engine therefore returns "awaiting" for carbon until then.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Audit field: calculation boundary per factor
ALTER TABLE public.esg_factors ADD COLUMN IF NOT EXISTS calculation_boundary text;

-- Sensible boundary tags for the whole library
UPDATE public.esg_factors SET calculation_boundary = CASE
  WHEN factor_key = 'treatment_factor:t4g_plant'  THEN 'direct_treatment_process'
  WHEN factor_key = 'treatment_factor:autoclave'  THEN 'direct_treatment_process'
  WHEN category   = 'treatment_factor'            THEN 'reference_only'          -- incineration/chemical/residue
  WHEN factor_key = 'water_factor:effluent'       THEN 'not_applicable_tech4green'
  WHEN factor_key = 'emission_factor:electricity' THEN 'scope2_electricity'
  WHEN factor_key = 'emission_factor:diesel'      THEN 'scope1_transport_fuel'
  WHEN category   = 'water_factor'                THEN 'scope3_water'
  WHEN category   = 'transport_assumption'        THEN 'transport_model'
  WHEN category   = 'plant_benchmark'             THEN 'baseline_operational'
  WHEN category   = 'container_capacity'          THEN 'reference_only'
  WHEN category IN ('baseline','allocation','carbon_credit') THEN 'methodology'
  ELSE 'unspecified'
END
WHERE active;

-- 2. Active baseline comparator → autoclave (kept DRAFT)
UPDATE public.esg_factors
SET text_value = 'autoclave',
    factor_name = 'Baseline treatment comparator',
    notes = 'Active baseline for the Tech4Green comparison = autoclave. Incineration is retained as an alternative comparator (reference_only), not the active baseline.'
WHERE factor_key = 'baseline:treatment_comparator' AND active;

-- 3. Tech4Green DIRECT treatment-process emissions = 0.000 (boundary-only; kept DRAFT)
UPDATE public.esg_factors
SET value = 0.000,
    source = 'Tech4Green methodology — direct treatment-process boundary (no combustion). Operational energy/transport accounted separately from verified data.',
    notes = 'Applies to DIRECT TREATMENT EMISSIONS ONLY. This is NOT total operational net-zero: electricity, diesel, water and transport are separate and calculated only from verified operational data.'
WHERE factor_key = 'treatment_factor:t4g_plant' AND active;

-- 4. Effluent factor retained as reference only — not applied to Tech4Green
UPDATE public.esg_factors
SET notes = 'Reference factor only. NOT APPLICABLE to Tech4Green — the Tech4Green treatment process generates no effluent stream. Retained for other technologies / future use.'
WHERE factor_key = 'water_factor:effluent' AND active;

-- 5. Incineration explicitly flagged as a non-active alternative comparator
UPDATE public.esg_factors
SET notes = 'Alternative comparator only — NOT the active Tech4Green baseline (autoclave is the active baseline). Retained for reference.'
WHERE factor_key = 'treatment_factor:incineration' AND active;

-- NOTE: no rows are approved here. The verified autoclave factor must be supplied
-- and approved deliberately in the ESG → Factors admin screen before any result is
-- recalculated and published.
