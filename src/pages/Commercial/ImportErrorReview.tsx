import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronDown, Upload } from 'lucide-react';
import { supabase, type DataImport, type ImportErrorRow } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { PageSpinner } from '../../components/Spinner';
import SectionTabs from '../../components/SectionTabs';
import { RECEIVED_TABS } from './commercialTabs';

export default function ImportErrorReview() {
  usePageTitle('Commercial — Import Errors');
  const [imports, setImports] = useState<DataImport[]>([]);
  const [selected, setSelected] = useState('');
  const [rows, setRows] = useState<ImportErrorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('data_imports')
        .select('*').gt('error_rows', 0).order('upload_date', { ascending: false });
      const list = (data ?? []) as DataImport[];
      setImports(list);
      if (list.length) setSelected(list[0].id);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selected) { setRows([]); return; }
    setLoadingRows(true);
    (async () => {
      const { data } = await supabase.from('import_error_rows')
        .select('*').eq('import_id', selected).order('source_row_number');
      setRows((data ?? []) as ImportErrorRow[]);
      setLoadingRows(false);
    })();
  }, [selected]);

  if (loading) return <PageSpinner layout="h64" />;

  return (
    <div className="space-y-5">
      <SectionTabs tabs={RECEIVED_TABS} />
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Error Review</h1>
          <p className="text-sm text-gray-500 mt-1">Rows that failed validation. Fix them in the source file and re-upload.</p>
        </div>
        <Link to="/commercial/upload" className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm">
          <Upload size={15} /> Re-upload
        </Link>
      </div>

      {imports.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm text-center py-12 text-sm text-gray-400">
          No imports with errors 🎉
        </div>
      ) : (
        <>
          <div className="relative w-full sm:w-96">
            <select value={selected} onChange={e => { setSelected(e.target.value); setExpanded(null); }}
              className="appearance-none w-full bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {imports.map(im => (
                <option key={im.id} value={im.id}>{im.file_name} — {im.error_rows} errors ({new Date(im.upload_date).toLocaleDateString('en-ZA')})</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {loadingRows ? (
              <div className="py-10"><PageSpinner /></div>
            ) : rows.length === 0 ? (
              <div className="text-center py-10 text-sm text-gray-400">No error rows stored for this import</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {rows.map(r => (
                  <li key={r.id} className="px-4 py-2.5">
                    <button onClick={() => setExpanded(expanded === r.id ? null : r.id)} className="w-full flex items-center gap-2 text-left">
                      <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                      <span className="text-xs text-gray-400 w-16 flex-shrink-0">Row {r.source_row_number ?? '—'}</span>
                      <span className="text-sm text-red-700 flex-1">{r.error_message}</span>
                      <ChevronDown size={14} className={`text-gray-400 transition-transform ${expanded === r.id ? 'rotate-180' : ''}`} />
                    </button>
                    {expanded === r.id && r.raw_data && (
                      <div className="mt-2 ml-8 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-xs bg-gray-50 rounded-lg p-3">
                        {Object.entries(r.raw_data).filter(([, v]) => v).map(([k, v]) => (
                          <div key={k} className="truncate"><span className="text-gray-400">{k}:</span> <span className="text-gray-700">{String(v)}</span></div>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
