import { useEffect, useState } from 'react';
import { Search, Download } from 'lucide-react';
import { PageSpinner } from '../../components/Spinner';
import { usePageTitle } from '../../lib/usePageTitle';
import { usePortalClient } from './PortalClientContext';
import { useManifests, fetchAllManifests, type ManifestHistRow } from './portalApi';
import { exportManifests } from './portalExport';
import { kg, num, fmtDate } from './portalUtils';

const PAGE = 100;

export default function ManifestHistory() {
  usePageTitle('Portal — Manifest History');
  const { clientId, siteId } = usePortalClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [acc, setAcc] = useState<ManifestHistRow[]>([]);
  const [exporting, setExporting] = useState(false);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset paging whenever the query or scope changes.
  useEffect(() => { setOffset(0); setAcc([]); }, [search, clientId, siteId]);

  const { rows: page, total, loading, error } = useManifests(clientId, siteId, search, PAGE, offset);

  // Append (or replace, for offset 0) each fetched page into the accumulator.
  useEffect(() => {
    if (loading) return;
    setAcc(prev => (offset === 0 ? page : [...prev, ...page]));
  }, [page, offset, loading]);

  async function handleExport() {
    setExporting(true);
    try {
      const all = await fetchAllManifests(clientId, siteId, search);
      if (!exportManifests(all, search ? 'search' : 'all')) alert('No manifests to export for the current selection.');
    } catch (e) {
      alert(`Export failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setExporting(false);
    }
  }

  if (loading && acc.length === 0) return <PageSpinner layout="h64" />;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manifest History</h1>
          <p className="text-sm text-gray-500 mt-1">{num(total)} manifest{total === 1 ? '' : 's'} received{search ? ` matching “${search}”` : ''}</p>
        </div>
        <button onClick={handleExport} disabled={exporting || total === 0}
          className="inline-flex items-center gap-1.5 text-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg font-medium disabled:opacity-50 print:hidden">
          <Download size={15} /> {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search tracking # or facility…"
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
      </div>

      {error && <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800">Some data couldn’t load: {error}</div>}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {acc.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">No manifests</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Tracking #</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Received</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Collected</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Facility</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Categories</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Containers</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Nett kg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {acc.map((m, i) => (
                  <tr key={m.tracking + i} className={i % 2 ? 'bg-gray-50/40' : 'bg-white'}>
                    <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap">{m.tracking}</td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{fmtDate(m.received_date)}</td>
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{fmtDate(m.collection_date)}</td>
                    <td className="px-4 py-2.5 text-gray-700">{m.generator_facility}</td>
                    <td className="px-4 py-2.5 text-gray-500 max-w-[220px] truncate" title={m.categories}>{m.categories || '—'}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{num(m.containers)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{kg(m.kg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {acc.length < total && (
        <div className="text-center">
          <button onClick={() => setOffset(acc.length)} disabled={loading}
            className="text-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium disabled:opacity-50">
            {loading ? 'Loading…' : `Load more (${num(acc.length)} of ${num(total)})`}
          </button>
        </div>
      )}
    </div>
  );
}
