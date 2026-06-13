import type { SupabaseClient } from '@supabase/supabase-js';

// ── low-level CSV parsing (semicolon-delimited, quote-aware) ─────────────────
export function parseDelimited(text: string, delimiter = ';'): string[][] {
  // strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else { field += ch; }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field); field = '';
    } else if (ch === '\n') {
      row.push(field); field = ''; rows.push(row); row = [];
    } else if (ch === '\r') {
      // ignore; \n handles the break
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

// ── value parsers ───────────────────────────────────────────────────────────
export function parseNum(v: string | undefined): number | null {
  if (v == null) return null;
  const t = String(v).trim().replace(/\s/g, '').replace(',', '.');
  if (t === '') return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

export function parseDateISO(v: string | undefined): string | null {
  if (!v) return null;
  // takes the date portion of "M/D/YYYY h:mm:ss AM/PM" or plain "M/D/YYYY"
  const m = String(v).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) {
    // also accept ISO YYYY-MM-DD
    const iso = String(v).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
  }
  const [, mo, d, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function parseYesNo(v: string | undefined): boolean {
  return String(v ?? '').trim().toLowerCase() === 'yes';
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// canonical field -> predicate over normalized header
const FIELD_MATCHERS: Record<string, (h: string) => boolean> = {
  client: h => h === 'client',
  generator_group: h => h === 'generatorgroup',
  generator_facility: h => h === 'generatorfacility',
  transporter: h => h === 'transporter',
  driver: h => h === 'driver',
  waste_manifest_creation_date: h => h === 'wastemanifestcreationdate',
  collection_date: h => h === 'collectiondate',
  manifest_id: h => h === 'manifestid',
  waste_manifest_tracking_number: h => h === 'wastemanifesttrackingnumber',
  waste_category: h => h === 'wastecategory',
  container_type: h => h === 'containertype',
  containers_received: h => h === 'containerscollected' || h === 'containersreceived',
  weight_collected: h => h === 'weightcollected',
  reusable_empty_weight: h => h.startsWith('reusablecontaineremptyweight'),
  nett_weight: h => h === 'nettweight',
  generator_acknowledgement_date: h => h === 'generatoracknowledgementdate',
  facility_receipt_date: h => h === 'facilityreceiptdate',
  treatment_confirmation_date: h => h === 'treatmentconfirmationdate',
  hcrw_super_category: h => h === 'hcrwsupercategory',
  reusable: h => h === 'reusable',
  treatment_facility: h => h === 'treatmentfacility',
  billed_to_client: h => h === 'billedtoclient',
  invoice_ref_number: h => h === 'invoicerefnumber',
};

export type ColumnMap = Record<string, number>; // field -> column index (-1 if absent)

export function resolveColumns(headers: string[]): ColumnMap {
  const normed = headers.map(norm);
  const map: ColumnMap = {};
  for (const field of Object.keys(FIELD_MATCHERS)) {
    map[field] = normed.findIndex(FIELD_MATCHERS[field]);
  }
  return map;
}

export interface ParsedRow {
  rowNumber: number;
  raw: Record<string, string>;
  // normalized
  client: string;
  generator_group: string;
  generator_facility: string;
  waste_category: string;
  hcrw_super_category: string;
  container_type: string;
  reusable: boolean;
  containers_received: number;
  nett_weight_kg: number;
  waste_manifest_tracking_number: string;
  manifest_id: string;
  collection_date: string | null;
  facility_receipt_date: string | null;
  received_date: string | null;
  received_date_source: 'facility_receipt' | 'collection_fallback';
  waste_manifest_creation_date: string | null;
  generator_acknowledgement_date: string | null;
  treatment_confirmation_date: string | null;
  transporter: string;
  driver: string;
  weight_collected_kg: number | null;
  reusable_empty_weight_kg: number | null;
  billed_to_client: string;
  invoice_ref_number: string;
  duplicate_key: string;
}

export interface ParseError { rowNumber: number; raw: Record<string, string>; message: string; }

export interface ParseResult {
  headers: string[];
  columnMap: ColumnMap;
  valid: ParsedRow[];
  errors: ParseError[];
  totalDataRows: number;
  missingColumns: string[];
}

const REQUIRED_COLUMNS = ['client', 'generator_facility', 'waste_category', 'container_type', 'nett_weight'];
const SUMMARY_RX = /^(total|grand total|subtotal|applied filter|filters?|summary|sum)\b/i;

function dupKey(r: ParsedRow): string {
  return [
    r.manifest_id, r.waste_manifest_tracking_number, r.client, r.generator_facility,
    r.received_date ?? '', r.waste_category, r.container_type, r.nett_weight_kg,
  ].map(v => String(v).trim().toLowerCase()).join('|');
}

export function parseReceivedWasteCsv(text: string): ParseResult {
  const grid = parseDelimited(text, ';');
  const headers = grid.length ? grid[0].map(h => h.trim()) : [];
  const cm = resolveColumns(headers);
  const missingColumns = REQUIRED_COLUMNS.filter(c => cm[c] === undefined || cm[c] < 0)
    .concat(cm.waste_manifest_tracking_number < 0 && cm.manifest_id < 0 ? ['manifest/tracking number'] : [])
    .concat(cm.facility_receipt_date < 0 && cm.collection_date < 0 ? ['receipt/collection date'] : []);

  const valid: ParsedRow[] = [];
  const errors: ParseError[] = [];
  let totalDataRows = 0;
  const get = (cells: string[], field: string) => {
    const i = cm[field];
    return i != null && i >= 0 ? (cells[i] ?? '').trim() : '';
  };

  for (let r = 1; r < grid.length; r++) {
    const cells = grid[r];
    const rowNumber = r + 1; // 1-based incl. header
    const nonEmpty = cells.filter(c => c.trim() !== '').length;
    if (nonEmpty === 0) continue; // blank row
    const clientRaw = get(cells, 'client');
    const facilityRaw = get(cells, 'generator_facility');
    // skip summary/total/filter rows
    if (SUMMARY_RX.test(clientRaw) || (clientRaw === '' && facilityRaw === '')) continue;
    totalDataRows++;

    const raw: Record<string, string> = {};
    headers.forEach((h, i) => { raw[h] = (cells[i] ?? '').trim(); });

    const facility_receipt_date = parseDateISO(get(cells, 'facility_receipt_date'));
    const collection_date = parseDateISO(get(cells, 'collection_date'));
    const received_date = facility_receipt_date ?? collection_date;
    const nett = parseNum(get(cells, 'nett_weight'));

    const row: ParsedRow = {
      rowNumber, raw,
      client: clientRaw,
      generator_group: get(cells, 'generator_group'),
      generator_facility: facilityRaw,
      waste_category: get(cells, 'waste_category'),
      hcrw_super_category: get(cells, 'hcrw_super_category'),
      container_type: get(cells, 'container_type'),
      reusable: parseYesNo(get(cells, 'reusable')),
      containers_received: parseNum(get(cells, 'containers_received')) ?? 0,
      nett_weight_kg: nett ?? 0,
      waste_manifest_tracking_number: get(cells, 'waste_manifest_tracking_number'),
      manifest_id: get(cells, 'manifest_id'),
      collection_date,
      facility_receipt_date,
      received_date,
      received_date_source: facility_receipt_date ? 'facility_receipt' : 'collection_fallback',
      waste_manifest_creation_date: parseDateISO(get(cells, 'waste_manifest_creation_date')),
      generator_acknowledgement_date: parseDateISO(get(cells, 'generator_acknowledgement_date')),
      treatment_confirmation_date: parseDateISO(get(cells, 'treatment_confirmation_date')),
      transporter: get(cells, 'transporter'),
      driver: get(cells, 'driver'),
      weight_collected_kg: parseNum(get(cells, 'weight_collected')),
      reusable_empty_weight_kg: parseNum(get(cells, 'reusable_empty_weight')),
      billed_to_client: get(cells, 'billed_to_client'),
      invoice_ref_number: get(cells, 'invoice_ref_number'),
      duplicate_key: '',
    };

    // validate required
    const problems: string[] = [];
    if (!row.client) problems.push('Client missing');
    if (!row.generator_facility) problems.push('Generator Facility missing');
    if (!row.waste_category) problems.push('Waste Category missing');
    if (!row.container_type) problems.push('Container Type missing');
    if (nett == null) problems.push('Nett Weight missing/not numeric');
    if (!row.waste_manifest_tracking_number && !row.manifest_id) problems.push('No Manifest ID or Tracking Number');
    if (!row.received_date) problems.push('No Facility Receipt or Collection Date');

    if (problems.length) {
      errors.push({ rowNumber, raw, message: problems.join('; ') });
    } else {
      row.duplicate_key = dupKey(row);
      valid.push(row);
    }
  }

  return { headers, columnMap: cm, valid, errors, totalDataRows, missingColumns };
}

// ── import execution against Supabase ────────────────────────────────────────
export interface ImportSummary {
  importId: string;
  total: number;
  imported: number;
  skipped: number;
  errors: number;
}

async function loadLookup(
  supabase: SupabaseClient, table: string, nameCol: string, extraCols = '',
): Promise<Map<string, { id: string; row: Record<string, unknown> }>> {
  const { data } = await supabase.from(table).select(`id, ${nameCol}${extraCols ? ', ' + extraCols : ''}`);
  const map = new Map<string, { id: string; row: Record<string, unknown> }>();
  const list = (data ?? []) as unknown as Array<Record<string, unknown>>;
  list.forEach(d => {
    map.set(String(d[nameCol]).trim().toLowerCase(), { id: d.id as string, row: d });
  });
  return map;
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

/**
 * Runs the full import: bookkeeping row, match-or-create lookups, dedupe, batched insert.
 * Requires an authenticated admin/management session (RLS: can_write_commercial()).
 */
export async function runImport(
  supabase: SupabaseClient,
  fileName: string,
  parse: ParseResult,
  uploadedBy: string | null,
): Promise<ImportSummary> {
  // 1. data_imports bookkeeping row
  const { data: imp, error: impErr } = await supabase
    .from('data_imports')
    .insert({
      file_name: fileName,
      uploaded_by: uploadedBy,
      total_rows: parse.totalDataRows,
      import_status: 'pending',
    })
    .select('id')
    .single();
  if (impErr || !imp) throw new Error(impErr?.message || 'Could not create import record');
  const importId = imp.id as string;

  try {
    // 2. preload lookups
    const clients = await loadLookup(supabase, 'clients', 'client_name');
    const categories = await loadLookup(supabase, 'waste_categories', 'waste_category_name');
    const containers = await loadLookup(supabase, 'container_types', 'container_type_name');
    // sites keyed by `${client_id}|${facility.lower}`
    const { data: siteData } = await supabase.from('client_sites').select('id, client_id, generator_facility');
    const sites = new Map<string, string>();
    (siteData ?? []).forEach((s: { id: string; client_id: string; generator_facility: string }) =>
      sites.set(`${s.client_id}|${s.generator_facility.trim().toLowerCase()}`, s.id));

    // 3. create missing clients
    const neededClients = new Map<string, string>(); // lower -> display
    parse.valid.forEach(r => { if (!clients.has(r.client.toLowerCase())) neededClients.set(r.client.toLowerCase(), r.client); });
    if (neededClients.size) {
      const { data, error } = await supabase.from('clients')
        .insert([...neededClients.values()].map(client_name => ({ client_name })))
        .select('id, client_name');
      if (error) throw new Error('Creating clients: ' + error.message);
      (data ?? []).forEach((d: { id: string; client_name: string }) =>
        clients.set(d.client_name.trim().toLowerCase(), { id: d.id, row: d }));
    }

    // 4. create missing categories
    const neededCats = new Map<string, { name: string; hcrw: string }>();
    parse.valid.forEach(r => { if (!categories.has(r.waste_category.toLowerCase())) neededCats.set(r.waste_category.toLowerCase(), { name: r.waste_category, hcrw: r.hcrw_super_category }); });
    if (neededCats.size) {
      const { data, error } = await supabase.from('waste_categories')
        .insert([...neededCats.values()].map(c => ({ waste_category_name: c.name, hcrw_super_category: c.hcrw })))
        .select('id, waste_category_name');
      if (error) throw new Error('Creating waste categories: ' + error.message);
      (data ?? []).forEach((d: { id: string; waste_category_name: string }) =>
        categories.set(d.waste_category_name.trim().toLowerCase(), { id: d.id, row: d }));
    }

    // 5. create missing container types
    const neededCont = new Map<string, { name: string; reusable: boolean }>();
    parse.valid.forEach(r => { if (!containers.has(r.container_type.toLowerCase())) neededCont.set(r.container_type.toLowerCase(), { name: r.container_type, reusable: r.reusable }); });
    if (neededCont.size) {
      const { data, error } = await supabase.from('container_types')
        .insert([...neededCont.values()].map(c => ({ container_type_name: c.name, reusable_boolean: c.reusable })))
        .select('id, container_type_name');
      if (error) throw new Error('Creating container types: ' + error.message);
      (data ?? []).forEach((d: { id: string; container_type_name: string }) =>
        containers.set(d.container_type_name.trim().toLowerCase(), { id: d.id, row: d }));
    }

    // 6. create missing sites (need client ids first)
    const neededSites = new Map<string, { client_id: string; facility: string; group: string }>();
    parse.valid.forEach(r => {
      const clientId = clients.get(r.client.toLowerCase())?.id;
      if (!clientId) return;
      const key = `${clientId}|${r.generator_facility.trim().toLowerCase()}`;
      if (!sites.has(key) && !neededSites.has(key)) neededSites.set(key, { client_id: clientId, facility: r.generator_facility, group: r.generator_group });
    });
    if (neededSites.size) {
      const { data, error } = await supabase.from('client_sites')
        .insert([...neededSites.values()].map(s => ({ client_id: s.client_id, generator_facility: s.facility, generator_group: s.group })))
        .select('id, client_id, generator_facility');
      if (error) throw new Error('Creating sites: ' + error.message);
      (data ?? []).forEach((d: { id: string; client_id: string; generator_facility: string }) =>
        sites.set(`${d.client_id}|${d.generator_facility.trim().toLowerCase()}`, d.id));
    }

    // 7. build record payloads, dedupe within file + against existing duplicate_keys
    const { data: existingKeysData } = await supabase.from('received_waste_records').select('duplicate_key');
    const existingKeys = new Set<string>((existingKeysData ?? []).map((d: { duplicate_key: string }) => d.duplicate_key));
    const seen = new Set<string>();
    let skipped = 0;
    const payloads = [] as Record<string, unknown>[];
    for (const r of parse.valid) {
      if (existingKeys.has(r.duplicate_key) || seen.has(r.duplicate_key)) { skipped++; continue; }
      seen.add(r.duplicate_key);
      const clientId = clients.get(r.client.toLowerCase())!.id;
      payloads.push({
        client_id: clientId,
        site_id: sites.get(`${clientId}|${r.generator_facility.trim().toLowerCase()}`) ?? null,
        waste_manifest_tracking_number: r.waste_manifest_tracking_number,
        received_date: r.received_date,
        collection_date: r.collection_date,
        facility_receipt_date: r.facility_receipt_date,
        received_date_source: r.received_date_source,
        waste_category_id: categories.get(r.waste_category.toLowerCase())?.id ?? null,
        hcrw_super_category: r.hcrw_super_category,
        container_type_id: containers.get(r.container_type.toLowerCase())?.id ?? null,
        containers_received: r.containers_received,
        nett_weight_kg: r.nett_weight_kg,
        reusable_boolean: r.reusable,
        manifest_id: r.manifest_id,
        waste_manifest_creation_date: r.waste_manifest_creation_date,
        generator_acknowledgement_date: r.generator_acknowledgement_date,
        treatment_confirmation_date: r.treatment_confirmation_date,
        transporter: r.transporter,
        driver: r.driver,
        weight_collected_kg: r.weight_collected_kg,
        reusable_empty_weight_kg: r.reusable_empty_weight_kg,
        billed_to_client: r.billed_to_client,
        invoice_ref_number: r.invoice_ref_number,
        treatment_facility: r.raw['TreatmentFacility'] ?? r.raw['Treatment Facility'] ?? '',
        source_upload_id: importId,
        source_row_number: r.rowNumber,
        import_status: 'imported',
        duplicate_key: r.duplicate_key,
      });
    }

    // 8. batched insert
    let imported = 0;
    for (const batch of chunk(payloads, 500)) {
      const { data, error } = await supabase.from('received_waste_records').insert(batch).select('id');
      if (error) throw new Error('Inserting records: ' + error.message);
      imported += data?.length ?? 0;
    }

    // 9. persist validation errors for review
    if (parse.errors.length) {
      const errRows = parse.errors.map(e => ({
        import_id: importId, source_row_number: e.rowNumber, raw_data: e.raw, error_message: e.message,
      }));
      for (const b of chunk(errRows, 500)) await supabase.from('import_error_rows').insert(b);
    }

    await supabase.from('data_imports').update({
      imported_rows: imported,
      skipped_rows: skipped,
      error_rows: parse.errors.length,
      import_status: 'completed',
    }).eq('id', importId);

    return { importId, total: parse.totalDataRows, imported, skipped, errors: parse.errors.length };
  } catch (e) {
    await supabase.from('data_imports').update({
      import_status: 'failed',
      notes: e instanceof Error ? e.message : String(e),
    }).eq('id', importId);
    throw e;
  }
}

// Read a File as text, decoding Windows-1252 (the source export's encoding).
export function readFileWin1252(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const buf = reader.result as ArrayBuffer;
        const text = new TextDecoder('windows-1252').decode(new Uint8Array(buf));
        resolve(text);
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
