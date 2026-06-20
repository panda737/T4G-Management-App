import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { supabase, type DataImport } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { PageSpinner } from '../../components/Spinner';
import SectionTabs from '../../components/SectionTabs';
import { ANALYTICS_TABS, RECEIVED_TABS } from './commercialTabs';

function fmt(d: string) {
  return new Date(d).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATUS_STYLE: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
};

export default function ImportHistory() {
  usePageTitle('Commercial — Import History');
  const [imports, setImports] = useState<DataImport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('data_imports').select('*').order('upload_date', { ascending: false });
      setImports((data ?? []) as DataImport[]);
      setLoading(false);
    })();
  }, []);

  if (loading) return <PageSpinner layout="h64" />;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <SectionTabs tabs={ANALYTICS_TABS} />
        <SectionTabs tabs={RECEIVED_TABS} />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import History</h1>
        <p className="text-sm text-gray-500 mt-1">Received-waste data uploads</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {imports.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400 flex flex-col items-center gap-2">
            <History size={24} className="text-gray-300" /> No imports yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">File</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Uploaded</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Total</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Imported</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Skipped</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Errors</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {imports.map((im, i) => (
                  <tr key={im.id} className={i % 2 ? 'bg-gray-50/40' : 'bg-white'}>
                    <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[260px] truncate">{im.file_name || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{fmt(im.upload_date)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{im.total_rows}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">{im.imported_rows}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{im.skipped_rows}</td>
                    <td className={`px-4 py-2.5 text-right ${im.error_rows ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>{im.error_rows}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[im.import_status] || 'bg-gray-100 text-gray-600'}`}>{im.import_status}</span>
                      {im.import_status === 'failed' && im.notes && <p className="text-[11px] text-red-500 mt-0.5 max-w-[260px] truncate" title={im.notes}>{im.notes}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
