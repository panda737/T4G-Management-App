import { useState } from 'react';
import { Upload, FileCheck2, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import {
  parseReceivedWasteCsv, readFileWin1252, runImport,
  type ParseResult, type ImportSummary,
} from './importReceivedWaste';
import SectionTabs from '../../components/SectionTabs';
import { RECEIVED_TABS } from './commercialTabs';

const PREVIEW_COLS: { key: string; label: string }[] = [
  { key: 'client', label: 'Client' },
  { key: 'generator_facility', label: 'Generator Facility' },
  { key: 'received_date', label: 'Received' },
  { key: 'waste_category', label: 'Waste Category' },
  { key: 'container_type', label: 'Container' },
  { key: 'containers_received', label: 'Containers' },
  { key: 'nett_weight_kg', label: 'Nett kg' },
  { key: 'waste_manifest_tracking_number', label: 'Tracking #' },
];

export default function UploadReceivedWaste() {
  usePageTitle('Commercial — Upload Received Waste');
  const { profile, canWrite } = useUser();
  const { addToast } = useToast();
  const canImport = canWrite('commercial');

  const [fileName, setFileName] = useState('');
  const [parse, setParse] = useState<ParseResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState('');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(''); setSummary(null); setParse(null); setParsing(true); setFileName(file.name);
    try {
      const text = await readFileWin1252(file);
      setParse(parseReceivedWasteCsv(text));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read file');
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    if (!parse) return;
    setImporting(true); setError('');
    try {
      const res = await runImport(supabase, fileName, parse, profile?.auth_user_id ?? null);
      setSummary(res);
      setParse(null);
      addToast(`Imported ${res.imported} records (${res.skipped} skipped, ${res.errors} errors)`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  const blocked = !!parse && (parse.missingColumns.length > 0 || parse.valid.length === 0);

  return (
    <div className="space-y-5">
      <SectionTabs tabs={RECEIVED_TABS} />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Received Waste Data</h1>
        <p className="text-sm text-gray-500 mt-1">Import the received-waste export (CSV). Transfer-out / treatment data is not imported here.</p>
      </div>

      {!canImport && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-2.5">
          You don't have permission to import (admin/management only).
        </div>
      )}

      {/* Dropzone */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-10 cursor-pointer transition-colors ${canImport ? 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30' : 'border-gray-200 opacity-50 cursor-not-allowed'}`}>
          <Upload size={28} className="text-blue-500" />
          <span className="text-sm font-medium text-gray-700">{fileName || 'Choose a CSV file to import'}</span>
          <span className="text-xs text-gray-400">Semicolon-delimited export · duplicates are skipped automatically</span>
          <input type="file" accept=".csv,text/csv" className="hidden" disabled={!canImport || importing} onChange={handleFile} />
        </label>
        {parsing && <p className="text-sm text-gray-500 mt-3 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Parsing…</p>}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5 flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {summary && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
          <CheckCircle2 size={16} /> Import complete — <strong>{summary.imported}</strong> imported, {summary.skipped} skipped (duplicates), {summary.errors} errors out of {summary.total} rows.
        </div>
      )}

      {parse && (
        <>
          {/* Validation summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Data rows" value={parse.totalDataRows} tone="gray" />
            <Stat label="Valid" value={parse.valid.length} tone="emerald" />
            <Stat label="Errors" value={parse.errors.length} tone={parse.errors.length ? 'red' : 'gray'} />
            <Stat label="Columns matched" value={`${Object.values(parse.columnMap).filter(i => i >= 0).length}/${parse.headers.length}`} tone="blue" />
          </div>

          {parse.missingColumns.length > 0 && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">
              Missing required column(s): <strong>{parse.missingColumns.join(', ')}</strong>. Fix the file headers and re-upload.
            </div>
          )}

          {/* Preview */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <FileCheck2 size={15} className="text-blue-500" />
              <h2 className="text-sm font-semibold text-gray-900">Preview (first 10 valid rows)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    {PREVIEW_COLS.map(c => <th key={c.key} className="text-left px-3 py-2 text-xs font-medium uppercase tracking-wider whitespace-nowrap">{c.label}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {parse.valid.slice(0, 10).map((r, i) => (
                    <tr key={i} className={i % 2 ? 'bg-gray-50/40' : 'bg-white'}>
                      {PREVIEW_COLS.map(c => (
                        <td key={c.key} className="px-3 py-2 text-gray-700 whitespace-nowrap">
                          {String((r as unknown as Record<string, unknown>)[c.key] ?? '—')}
                          {c.key === 'received_date' && r.received_date_source === 'collection_fallback' && (
                            <span className="ml-1 text-[10px] text-amber-600">(coll.)</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Errors preview */}
          {parse.errors.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <AlertTriangle size={15} className="text-red-500" />
                <h2 className="text-sm font-semibold text-gray-900">Rows with errors (first 10)</h2>
              </div>
              <ul className="divide-y divide-gray-100">
                {parse.errors.slice(0, 10).map((e, i) => (
                  <li key={i} className="px-5 py-2 text-sm">
                    <span className="text-gray-400 mr-2">Row {e.rowNumber}:</span>
                    <span className="text-red-700">{e.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleImport}
              disabled={!canImport || blocked || importing}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 shadow-sm transition-colors"
            >
              {importing ? <><Loader2 size={15} className="animate-spin" /> Importing…</> : <>Confirm import of {parse.valid.length} rows</>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone: 'gray' | 'emerald' | 'red' | 'blue' }) {
  const tones: Record<string, string> = {
    gray: 'text-gray-900', emerald: 'text-emerald-600', red: 'text-red-600', blue: 'text-blue-600',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <p className={`text-2xl font-bold ${tones[tone]}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
