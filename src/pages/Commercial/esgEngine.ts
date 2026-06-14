import type { SupabaseClient } from '@supabase/supabase-js';
import type { EsgDataBasis } from '../../lib/supabase';

/*
  ESG calculation engine — Phase 2.

  Principle: activity data × APPROVED factor. No number is hardcoded. If a
  required factor is missing/unapproved, or required activity data is absent, the
  metric returns null with data_basis 'awaiting' (never a guessed value). Every
  metric records its inputs, the factor key+version+value+source, and a
  data-basis label into the per-result `audit` JSON for full traceability.

  Run admin-side via runEsgRecalc(): writes draft (approved=false) esg_results
  rows; an admin then reviews and approves them for customer visibility.
*/

// ── factor loading ───────────────────────────────────────────────────────────
export interface FactorRef {
  key: string;
  value: number;
  text: string;
  version: number;
  source: string;
  unit: string;
  effectiveDate: string | null;
  calculationBoundary: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
}
export type FactorMap = Map<string, FactorRef>;

/** Latest APPROVED version of each factor effective on/before periodEnd. */
export async function loadApprovedFactors(supabase: SupabaseClient, periodEnd: string): Promise<FactorMap> {
  const { data } = await supabase
    .from('esg_factors')
    .select('factor_key, value, text_value, version, source, unit, effective_date, calculation_boundary, approved_by, approved_at')
    .eq('approved', true)
    .eq('active', true)
    .lte('effective_date', periodEnd)
    .order('factor_key', { ascending: true })
    .order('version', { ascending: false });
  const map: FactorMap = new Map();
  for (const r of (data ?? []) as Array<Record<string, unknown>>) {
    const key = String(r.factor_key);
    if (map.has(key)) continue; // already have the latest version
    map.set(key, {
      key,
      value: Number(r.value),
      text: String(r.text_value ?? ''),
      version: Number(r.version),
      source: String(r.source ?? ''),
      unit: String(r.unit ?? ''),
      effectiveDate: (r.effective_date as string) ?? null,
      calculationBoundary: (r.calculation_boundary as string) ?? null,
      approvedBy: (r.approved_by as string) ?? null,
      approvedAt: (r.approved_at as string) ?? null,
    });
  }
  return map;
}

// ── computation primitives ───────────────────────────────────────────────────
type Basis = EsgDataBasis;

/** Combine contributing bases into the weakest (most cautious) label. */
function worst(...bases: Basis[]): Basis {
  if (bases.includes('awaiting')) return 'awaiting';
  if (bases.includes('estimated')) return 'estimated';
  if (bases.includes('admin_actual')) return 'admin_actual';
  if (bases.includes('benchmark')) return 'benchmark';
  return 'actual';
}

export interface ClientPeriodInput {
  clientId: string;
  clientName: string;
  periodMonth: string;          // YYYY-MM-01
  nettKg: number;               // actual, this client this month
  containers: number;
  derivedTrips: number;         // distinct manifests, this client
  plantNettKg: number;          // all clients this month (for allocation share)
  // plant-wide operational (already the raw monthly totals; allocated here by share)
  op: {
    present: boolean;
    dataSource: 'actual' | 'estimated';
    electricity_kwh: number | null;
    water_kl: number | null;
    diesel_litres: number | null;
    effluent_kl: number | null;
    treatment_energy_kwh: number | null;
    trips: number | null;
    kilometres: number | null;
    idling_hours: number | null;
  };
}

export interface ComputedResult {
  client_id: string;
  client_name: string;
  period_month: string;
  co2e_saved_kg: number | null;
  residual_tco2e: number | null;
  water_saved_kl: number | null;
  electricity_saved_kwh: number | null;
  diesel_saved_l: number | null;
  km_avoided: number | null;
  trips_avoided: number | null;
  indicative_carbon_credits: number | null;
  trees_equivalent: number | null;
  // Tech4Green "actual" side of each comparison metric (conventional = actual + saved).
  t4g_water_kl: number | null;
  t4g_electricity_kwh: number | null;
  t4g_diesel_l: number | null;
  t4g_trips: number | null;
  total_nett_kg: number;
  treatment_emissions_by_method: Record<string, number>;
  transport_comparison: Record<string, number>;
  data_basis: Record<string, Basis>;
  audit: Record<string, unknown>;
}

/** Pure per-client computation. */
export function computeClient(input: ClientPeriodInput, f: FactorMap): ComputedResult {
  const { clientId, clientName, periodMonth, nettKg, plantNettKg, op } = input;
  const share = plantNettKg > 0 ? nettKg / plantNettKg : 0;
  const opBasis: Basis = op.dataSource === 'actual' ? 'admin_actual' : 'estimated';

  const audit: Record<string, unknown> = {};
  const basis: Record<string, Basis> = {};
  // Tech4Green "actual" side of each comparison metric (customer-safe; conventional = actual + saved).
  let t4gWaterActual: number | null = null;
  let t4gElecActual: number | null = null;
  let t4gDieselActual: number | null = null;
  let t4gTripsActual: number | null = null;
  const get = (k: string) => f.get(k);
  const ref = (k: string) => { const r = f.get(k); return r ? { key: r.key, version: r.version, value: r.value, source: r.source } : { key: k, missing: true }; };

  // allocate a plant-wide operational figure to this client by nett-kg share
  const alloc = (v: number | null): number | null => (v == null ? null : v * share);

  // ── Treatment: T4G plant vs industry baseline comparator ──────────────────
  const baselineKey = `treatment_factor:${get('baseline:treatment_comparator')?.text || 'autoclave'}`;
  const fT4g = get('treatment_factor:t4g_plant');
  const fBase = get(baselineKey);
  let treatmentSaved: number | null = null;
  let t4gTreatEm: number | null = null;
  const treatmentByMethod: Record<string, number> = {};
  if (fT4g && fBase) {
    t4gTreatEm = nettKg * fT4g.value;
    const baseEm = nettKg * fBase.value;
    treatmentSaved = baseEm - t4gTreatEm;
    treatmentByMethod['Tech4Green plant (actual route)'] = round(t4gTreatEm);
    treatmentByMethod[`Industry baseline (${baselineKey.split(':')[1]})`] = round(baseEm);
    basis.treatment = 'estimated';
    audit.treatment = { nettKg, t4g_factor: ref('treatment_factor:t4g_plant'), baseline_factor: ref(baselineKey), t4g_emissions_kg: t4gTreatEm, baseline_emissions_kg: baseEm, co2e_saved_kg: treatmentSaved, basis: 'estimated' };
  } else {
    basis.treatment = 'awaiting';
    audit.treatment = { status: 'awaiting', missing: [!fT4g && 'treatment_factor:t4g_plant', !fBase && baselineKey].filter(Boolean) };
  }

  // ── Transport: T4G vs conventional box-body ───────────────────────────────
  const fDieselEf = get('emission_factor:diesel');
  const fBox = get('transport_assumption:boxbody_payload_kg');
  const fAvgKm = get('transport_assumption:avg_trip_km');
  const fLpkT4g = get('transport_assumption:diesel_l_per_km_t4g');
  const fLpkBase = get('transport_assumption:diesel_l_per_km_baseline');
  const fIdle = get('transport_assumption:idling_l_per_hr');

  let dieselSaved: number | null = null;
  let kmAvoided: number | null = null;
  let tripsAvoided: number | null = null;
  let transportSaved: number | null = null;
  let t4gTransportEm: number | null = null;
  const transportComparison: Record<string, number> = {};

  if (fDieselEf && fBox && fAvgKm && fLpkT4g && fLpkBase && fBox.value > 0) {
    // T4G side — prefer actual operational diesel/km, else estimate
    const t4gKm = alloc(op.kilometres);
    const t4gKmVal = t4gKm != null ? t4gKm : input.derivedTrips * fAvgKm.value;
    const t4gKmBasis: Basis = t4gKm != null ? opBasis : 'estimated';
    const t4gDieselAlloc = alloc(op.diesel_litres);
    const t4gDiesel = t4gDieselAlloc != null ? t4gDieselAlloc : t4gKmVal * fLpkT4g.value;
    const t4gDieselBasis: Basis = t4gDieselAlloc != null ? opBasis : 'estimated';
    const idleHours = alloc(op.idling_hours);
    const idleDiesel = idleHours != null && fIdle ? idleHours * fIdle.value : 0;

    // conventional baseline
    const convTrips = Math.ceil(nettKg / fBox.value);
    const convKm = convTrips * fAvgKm.value;
    const convDiesel = convKm * fLpkBase.value;

    t4gTransportEm = (t4gDiesel + idleDiesel) * fDieselEf.value;
    const convEm = convDiesel * fDieselEf.value;
    transportSaved = convEm - t4gTransportEm;
    dieselSaved = convDiesel - (t4gDiesel + idleDiesel);
    kmAvoided = convKm - t4gKmVal;
    tripsAvoided = convTrips - input.derivedTrips;

    transportComparison['Tech4Green diesel (L)'] = round(t4gDiesel + idleDiesel);
    transportComparison['Conventional diesel (L)'] = round(convDiesel);
    t4gDieselActual = round(t4gDiesel + idleDiesel);
    t4gTripsActual = input.derivedTrips;
    basis.transport = worst('actual', t4gDieselBasis, t4gKmBasis, 'benchmark');
    basis.diesel_saved_l = basis.transport;
    basis.km_avoided = basis.transport;
    basis.trips_avoided = 'actual';
    audit.transport = {
      diesel_factor: ref('emission_factor:diesel'),
      t4g: { diesel_l: t4gDiesel, idling_l: idleDiesel, km: t4gKmVal, trips: input.derivedTrips, basis: worst(t4gDieselBasis, t4gKmBasis) },
      conventional: { payload_kg: ref('transport_assumption:boxbody_payload_kg'), trips: convTrips, km: convKm, diesel_l: convDiesel },
      co2e_saved_kg: transportSaved, diesel_saved_l: dieselSaved, km_avoided: kmAvoided, trips_avoided: tripsAvoided,
    };
  } else {
    basis.transport = 'awaiting';
    basis.diesel_saved_l = 'awaiting';
    basis.km_avoided = 'awaiting';
    basis.trips_avoided = 'awaiting';
    audit.transport = { status: 'awaiting', missing: [!fDieselEf && 'emission_factor:diesel', !fBox && 'transport_assumption:boxbody_payload_kg', !fAvgKm && 'transport_assumption:avg_trip_km', !fLpkT4g && 'transport_assumption:diesel_l_per_km_t4g', !fLpkBase && 'transport_assumption:diesel_l_per_km_baseline'].filter(Boolean) };
  }

  // ── Plant: electricity / water / effluent vs benchmark ────────────────────
  const fElecEf = get('emission_factor:electricity');
  const fWaterEf = get('water_factor:supply');
  const fBkWh = get('plant_benchmark:autoclave_kwh_per_kg');
  const fBWater = get('plant_benchmark:autoclave_water_kl_per_kg');

  // electricity
  let electricitySaved: number | null = null;
  let elecEmSaved = 0; let t4gElecEm = 0;
  if (fElecEf && fBkWh) {
    const t4gKwhAlloc = alloc(op.electricity_kwh) ?? alloc(op.treatment_energy_kwh);
    if (t4gKwhAlloc != null) {
      const benchKwh = nettKg * fBkWh.value;
      electricitySaved = benchKwh - t4gKwhAlloc;
      elecEmSaved = electricitySaved * fElecEf.value;
      t4gElecEm = t4gKwhAlloc * fElecEf.value;
      t4gElecActual = round(t4gKwhAlloc);
      basis.electricity_saved_kwh = worst(opBasis, 'benchmark');
      audit.electricity = { actual_kwh: t4gKwhAlloc, benchmark_kwh_per_kg: ref('plant_benchmark:autoclave_kwh_per_kg'), benchmark_kwh: benchKwh, electricity_ef: ref('emission_factor:electricity'), saved_kwh: electricitySaved, basis: basis.electricity_saved_kwh };
    } else { basis.electricity_saved_kwh = 'awaiting'; audit.electricity = { status: 'awaiting', missing: ['monthly electricity_kwh'] }; }
  } else { basis.electricity_saved_kwh = 'awaiting'; audit.electricity = { status: 'awaiting', missing: [!fElecEf && 'emission_factor:electricity', !fBkWh && 'plant_benchmark:autoclave_kwh_per_kg'].filter(Boolean) }; }

  // water
  let waterSaved: number | null = null;
  let waterEmSaved = 0; let t4gWaterEm = 0;
  if (fWaterEf && fBWater) {
    const t4gWaterAlloc = alloc(op.water_kl);
    if (t4gWaterAlloc != null) {
      const benchWater = nettKg * fBWater.value;
      waterSaved = benchWater - t4gWaterAlloc;
      waterEmSaved = waterSaved * fWaterEf.value;
      t4gWaterEm = t4gWaterAlloc * fWaterEf.value;
      t4gWaterActual = round(t4gWaterAlloc);
      basis.water_saved_kl = worst(opBasis, 'benchmark');
      audit.water = { actual_kl: t4gWaterAlloc, benchmark_kl_per_kg: ref('plant_benchmark:autoclave_water_kl_per_kg'), benchmark_kl: benchWater, water_ef: ref('water_factor:supply'), saved_kl: waterSaved, basis: basis.water_saved_kl };
    } else { basis.water_saved_kl = 'awaiting'; audit.water = { status: 'awaiting', missing: ['monthly water_kl'] }; }
  } else { basis.water_saved_kl = 'awaiting'; audit.water = { status: 'awaiting', missing: [!fWaterEf && 'water_factor:supply', !fBWater && 'plant_benchmark:autoclave_water_kl_per_kg'].filter(Boolean) }; }

  // Effluent: NOT APPLICABLE to Tech4Green — the treatment process generates no
  // effluent stream. It is excluded from the Tech4Green boundary (never "awaiting").
  // water_factor:effluent is retained ONLY as a reference factor for other
  // technologies and is never applied to Tech4Green.
  audit.effluent = {
    status: 'not_applicable',
    boundary: 'excluded_from_tech4green',
    note: 'No effluent stream generated from the Tech4Green treatment process.',
  };

  // ── Totals ────────────────────────────────────────────────────────────────
  const savedParts = [treatmentSaved, transportSaved, electricitySaved != null ? elecEmSaved : null, waterSaved != null ? waterEmSaved : null];
  const anySaved = savedParts.some(p => p != null);
  let co2eSaved: number | null = null;
  if (anySaved) {
    co2eSaved = (treatmentSaved ?? 0) + (transportSaved ?? 0) + elecEmSaved + waterEmSaved;
    basis.co2e_saved_kg = worst(basis.treatment, basis.transport, basis.electricity_saved_kwh, basis.water_saved_kl);
  } else { basis.co2e_saved_kg = 'awaiting'; }

  // residual = T4G's own footprint (treatment + transport + plant utilities)
  const residualParts = [t4gTreatEm, t4gTransportEm];
  const anyResidual = residualParts.some(p => p != null);
  let residualTco2e: number | null = null;
  if (anyResidual) {
    const residualKg = (t4gTreatEm ?? 0) + (t4gTransportEm ?? 0) + t4gElecEm + t4gWaterEm;
    residualTco2e = residualKg / 1000;
    basis.residual_tco2e = worst(basis.treatment, basis.transport);
  } else { basis.residual_tco2e = 'awaiting'; }

  // indicative carbon credits — from AVOIDED emissions (co2e saved), estimate-only
  const fCredit = get('carbon_credit:tco2e_per_credit');
  let credits: number | null = null;
  if (co2eSaved != null && fCredit && fCredit.value > 0) {
    credits = Math.max(0, co2eSaved / 1000) / fCredit.value;
    basis.indicative_carbon_credits = 'estimated';
    audit.carbon_credits = { method: 'avoided_emissions', co2e_saved_kg: co2eSaved, tco2e_per_credit: ref('carbon_credit:tco2e_per_credit'), indicative_credits: credits, note: 'Indicative estimate only — not registry-verified.' };
  } else { basis.indicative_carbon_credits = 'awaiting'; }

  // trees equivalent — ILLUSTRATIVE only (not verified offsetting / actual trees).
  const fTree = get('equivalence:kg_co2e_per_tree');
  let trees: number | null = null;
  if (co2eSaved != null && fTree && fTree.value > 0) {
    trees = Math.max(0, co2eSaved) / fTree.value;
    basis.trees_equivalent = 'estimated';
    audit.trees_equivalent = { method: 'illustrative_equivalence', co2e_saved_kg: co2eSaved, kg_co2e_per_tree: ref('equivalence:kg_co2e_per_tree'), trees, note: 'Illustrative only — not verified offsetting or actual trees planted.' };
  } else { basis.trees_equivalent = 'awaiting'; }

  // Headline framing — defensible wording for the dashboard/report.
  audit.headline = {
    metric: 'estimated_avoided_co2e',
    comparison: 'treatment_only_vs_baseline',
    baseline_comparator: get('baseline:treatment_comparator')?.text || 'autoclave',
    operational_data_present: op.present,
    note: 'Estimated avoided CO₂e vs the autoclave baseline (treatment-only). Operational emissions (electricity, water, diesel, transport) are included only from verified operational data; effluent is not applicable to Tech4Green.',
  };

  return {
    client_id: clientId,
    client_name: clientName,
    period_month: periodMonth,
    co2e_saved_kg: co2eSaved == null ? null : round(co2eSaved),
    residual_tco2e: residualTco2e == null ? null : round4(residualTco2e),
    water_saved_kl: waterSaved == null ? null : round(waterSaved),
    electricity_saved_kwh: electricitySaved == null ? null : round(electricitySaved),
    diesel_saved_l: dieselSaved == null ? null : round(dieselSaved),
    km_avoided: kmAvoided == null ? null : round(kmAvoided),
    trips_avoided: tripsAvoided == null ? null : round(tripsAvoided),
    indicative_carbon_credits: credits == null ? null : round4(credits),
    trees_equivalent: trees == null ? null : round(trees),
    t4g_water_kl: t4gWaterActual,
    t4g_electricity_kwh: t4gElecActual,
    t4g_diesel_l: t4gDieselActual,
    t4g_trips: t4gTripsActual,
    total_nett_kg: round(nettKg),
    treatment_emissions_by_method: treatmentByMethod,
    transport_comparison: transportComparison,
    data_basis: basis,
    audit: { ...audit, allocation: { share, plant_nett_kg: plantNettKg, client_nett_kg: nettKg, op_present: op.present, op_basis: opBasis } },
  };
}

function round(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

/** Stable non-crypto fingerprint of the factor set used for a run (djb2). */
function hashFactors(snap: Array<{ key: string; version: number; value: number }>): string {
  const s = snap.map(fk => `${fk.key}@${fk.version}:${fk.value}`).sort().join('|');
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

// ── period helpers ───────────────────────────────────────────────────────────
export function monthBounds(ym: string): { start: string; end: string; first: string } {
  const [y, m] = ym.split('-').map(Number);
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const last = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  return { start, end, first: start };
}

/** Distinct months (YYYY-MM) that have received-waste records, newest first. */
export async function listPeriodsWithData(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase
    .from('received_waste_records')
    .select('received_date')
    .eq('import_status', 'imported')
    .not('received_date', 'is', null);
  const set = new Set<string>();
  for (const r of (data ?? []) as Array<{ received_date: string | null }>) {
    if (r.received_date) set.add(r.received_date.substring(0, 7));
  }
  return [...set].sort().reverse();
}

// ── runner: compute + persist draft results for a period ─────────────────────
export interface RecalcSummary {
  period: string;
  clients: number;
  wrote: number;
  missingFactors: string[];
  results: ComputedResult[];
}

export async function runEsgRecalc(
  supabase: SupabaseClient,
  ym: string,
  computedBy: string | null,
): Promise<RecalcSummary> {
  const { start, end, first } = monthBounds(ym);
  const factors = await loadApprovedFactors(supabase, end);

  // pull this month's records
  const { data: recs } = await supabase
    .from('received_waste_records')
    .select('client_id, nett_weight_kg, containers_received, manifest_id, waste_manifest_tracking_number')
    .eq('import_status', 'imported')
    .gte('received_date', start)
    .lte('received_date', end);

  type Rec = { client_id: string; nett_weight_kg: number; containers_received: number; manifest_id: string; waste_manifest_tracking_number: string };
  const rows = (recs ?? []) as Rec[];
  const plantNettKg = rows.reduce((s, r) => s + Number(r.nett_weight_kg || 0), 0);

  // aggregate per client
  const byClient = new Map<string, { kg: number; containers: number; manifests: Set<string> }>();
  for (const r of rows) {
    const e = byClient.get(r.client_id) ?? { kg: 0, containers: 0, manifests: new Set<string>() };
    e.kg += Number(r.nett_weight_kg || 0);
    e.containers += Number(r.containers_received || 0);
    e.manifests.add((r.manifest_id || r.waste_manifest_tracking_number || '').trim().toLowerCase());
    byClient.set(r.client_id, e);
  }

  // client names
  const clientIds = [...byClient.keys()];
  const nameMap = new Map<string, string>();
  if (clientIds.length) {
    const { data: cs } = await supabase.from('clients').select('id, client_name').in('id', clientIds);
    (cs ?? []).forEach((c: { id: string; client_name: string }) => nameMap.set(c.id, c.client_name));
  }

  // plant-wide operational row for the month
  const { data: opData } = await supabase
    .from('esg_monthly_operational')
    .select('*')
    .eq('period_month', first)
    .is('site_id', null)
    .maybeSingle();

  const op = {
    present: !!opData,
    dataSource: (opData?.data_source ?? 'estimated') as 'actual' | 'estimated',
    electricity_kwh: opData?.electricity_kwh ?? null,
    water_kl: opData?.water_kl ?? null,
    diesel_litres: opData?.diesel_litres ?? null,
    effluent_kl: opData?.effluent_kl ?? null,
    treatment_energy_kwh: opData?.treatment_energy_kwh ?? null,
    trips: opData?.trips ?? null,
    kilometres: opData?.kilometres ?? null,
    idling_hours: opData?.idling_hours ?? null,
  };

  const results: ComputedResult[] = [];
  for (const [clientId, agg] of byClient) {
    results.push(computeClient({
      clientId,
      clientName: nameMap.get(clientId) ?? '—',
      periodMonth: first,
      nettKg: agg.kg,
      containers: agg.containers,
      derivedTrips: [...agg.manifests].filter(Boolean).length || 1,
      plantNettKg,
      op,
    }, factors));
  }

  // factor snapshot (traceability) — frozen with this run's results
  const factorSnapshot = [...factors.values()].map(fr => ({
    key: fr.key, value: fr.value, unit: fr.unit, source: fr.source, version: fr.version, approved: true,
    effective_date: fr.effectiveDate, calculation_boundary: fr.calculationBoundary,
    approved_by: fr.approvedBy, approved_at: fr.approvedAt,
  }));
  const factorSetHash = hashFactors(factorSnapshot);

  // persist as DRAFT (approved=false) — re-approval required after each recalc
  let wrote = 0;
  let calcRunId: string | null = null;
  if (results.length) {
    // immutable calc-run record so every result traces to the exact factor set + run
    const { data: runRow, error: runErr } = await supabase
      .from('esg_calc_runs')
      .insert({ period_month: first, run_by: computedBy, factor_set_hash: factorSetHash, factor_count: factorSnapshot.length, client_count: byClient.size })
      .select('id').single();
    if (runErr) throw new Error('Creating calc run: ' + runErr.message);
    calcRunId = (runRow as { id: string }).id;

    const payload = results.map(r => ({
      client_id: r.client_id,
      period_month: r.period_month,
      co2e_saved_kg: r.co2e_saved_kg,
      residual_tco2e: r.residual_tco2e,
      water_saved_kl: r.water_saved_kl,
      electricity_saved_kwh: r.electricity_saved_kwh,
      diesel_saved_l: r.diesel_saved_l,
      km_avoided: r.km_avoided,
      trips_avoided: r.trips_avoided,
      indicative_carbon_credits: r.indicative_carbon_credits,
      trees_equivalent: r.trees_equivalent,
      t4g_water_kl: r.t4g_water_kl,
      t4g_electricity_kwh: r.t4g_electricity_kwh,
      t4g_diesel_l: r.t4g_diesel_l,
      t4g_trips: r.t4g_trips,
      total_nett_kg: r.total_nett_kg,
      treatment_emissions_by_method: r.treatment_emissions_by_method,
      transport_comparison: r.transport_comparison,
      data_basis: r.data_basis,
      audit: r.audit,
      factor_snapshot: factorSnapshot,
      calc_run_id: calcRunId,
      approved: false,
      computed_at: new Date().toISOString(),
      computed_by: computedBy,
    }));
    const { data, error } = await supabase
      .from('esg_results')
      .upsert(payload, { onConflict: 'client_id,period_month' })
      .select('id');
    if (error) throw new Error('Writing ESG results: ' + error.message);
    wrote = data?.length ?? 0;
  }

  // which expected factor keys are missing (for the readiness hint).
  // Baseline comparator is dynamic (autoclave by default); effluent is N/A (excluded).
  const comparator = factors.get('baseline:treatment_comparator')?.text || 'autoclave';
  const expected = [
    'emission_factor:diesel', 'emission_factor:electricity', 'water_factor:supply',
    'treatment_factor:t4g_plant', `treatment_factor:${comparator}`,
    'transport_assumption:boxbody_payload_kg', 'transport_assumption:avg_trip_km',
    'transport_assumption:diesel_l_per_km_t4g', 'transport_assumption:diesel_l_per_km_baseline',
    'plant_benchmark:autoclave_kwh_per_kg', 'plant_benchmark:autoclave_water_kl_per_kg',
    'carbon_credit:tco2e_per_credit',
  ];
  const missingFactors = expected.filter(k => !factors.has(k));

  return { period: ym, clients: byClient.size, wrote, missingFactors, results };
}
