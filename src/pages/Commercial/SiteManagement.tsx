import { useEffect, useMemo, useState } from 'react';
import { Search, Merge, Loader2 } from 'lucide-react';
import { supabase, type ClientSite } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import { PageSpinner } from '../../components/Spinner';
import SectionTabs from '../../components/SectionTabs';
import { CLIENT_TABS } from './commercialTabs';

function kg(n: number) { return n.toLocaleString('en-ZA', { maximumFractionDigits: 0 }); }

export default function SiteManagement() {
  usePageTitle('Commercial — Site Management');
  const { canWrite } = useUser();
  const { addToast } = useToast();
  const canEdit = canWrite('commercial');

  const [sites, setSites] = useState<ClientSite[]>([]);
  const [clientName, setClientName] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<Record<string, { n: number; kg: number }>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState('');
  const [merging, setMerging] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [sRes, cRes, rRes] = await Promise.all([
      supabase.from('client_sites').select('*').order('generator_facility'),
      supabase.from('clients').select('id, client_name'),
      supabase.from('received_waste_records').select('site_id, nett_weight_kg'),
    ]);
    setSites((sRes.data ?? []) as ClientSite[]);
    const cn: Record<string, string> = {};
    (cRes.data ?? []).forEach((c: { id: string; client_name: string }) => { cn[c.id] = c.client_name; });
    setClientName(cn);
    const st: Record<string, { n: number; kg: number }> = {};
    (rRes.data ?? []).forEach((r: { site_id: string | null; nett_weight_kg: number }) => {
      if (!r.site_id) return;
      const e = st[r.site_id] || { n: 0, kg: 0 }; e.n++; e.kg += Number(r.nett_weight_kg); st[r.site_id] = e;
    });
    setStats(st);
    setSelected(new Set()); setTarget('');
    setLoading(false);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sites.filter(s => !q || s.generator_facility.toLowerCase().includes(q) || (clientName[s.client_id] || '').toLowerCase().includes(q) || (s.generator_group || '').toLowerCase().includes(q));
  }, [sites, search, clientName]);

  const selectedSites = sites.filter(s => selected.has(s.id));
  const sameClient = selectedSites.length >= 2 && selectedSites.every(s => s.client_id === selectedSites[0].client_id);

  function toggle(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    setTarget('');
  }

  async function doMerge() {
    if (!sameClient || !target) return;
    const sources = [...selected].filter(id => id !== target);
    if (sources.length === 0) return;
    setMerging(true);
    const { error: upErr } = await supabase.from('received_waste_records').update({ site_id: target }).in('site_id', sources);
    if (upErr) { setMerging(false); addToast('Merge failed: ' + upErr.message, 'error'); return; }
    const { error: delErr } = await supabase.from('client_sites').delete().in('id', sources);
    setMerging(false);
    if (delErr) { addToast('Records moved but could not delete old sites: ' + delErr.message, 'error'); }
    else addToast(`Merged ${sources.length} site(s)`);
    load();
  }

  if (loading) return <PageSpinner layout="h64" />;

  return (
    <div className="space-y-5">
      <SectionTabs tabs={CLIENT_TABS} />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Site Management</h1>
        <p className="text-sm text-gray-500 mt-1">Generator facilities. Select duplicate facilities of the same client to merge them.</p>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search facility, group or client…"
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
      </div>

      {canEdit && selected.size >= 2 && (
        <div className={`rounded-xl border p-3 flex flex-wrap items-center gap-3 ${sameClient ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
          {!sameClient ? (
            <span className="text-sm text-amber-800">Selected facilities must all belong to the same client to merge.</span>
          ) : (
            <>
              <Merge size={16} className="text-blue-600" />
              <span className="text-sm text-blue-900">Merge {selected.size} facilities of <strong>{clientName[selectedSites[0].client_id]}</strong> into:</span>
              <select value={target} onChange={e => setTarget(e.target.value)} className="text-sm border border-blue-200 rounded-lg px-3 py-1.5 bg-white">
                <option value="">— choose surviving facility —</option>
                {selectedSites.map(s => <option key={s.id} value={s.id}>{s.generator_facility} ({stats[s.id]?.n || 0} recs)</option>)}
              </select>
              <button onClick={doMerge} disabled={!target || merging}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded-lg font-medium disabled:opacity-50">
                {merging ? <Loader2 size={14} className="animate-spin" /> : <Merge size={14} />} Merge
              </button>
            </>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 text-white">
                {canEdit && <th className="px-3 py-2.5 w-8"></th>}
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Generator Facility</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Group</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Client</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Records</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Nett kg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((s, i) => (
                <tr key={s.id} className={`${i % 2 ? 'bg-gray-50/40' : 'bg-white'} ${selected.has(s.id) ? 'bg-blue-50/60' : ''}`}>
                  {canEdit && (
                    <td className="px-3 py-2.5 text-center">
                      <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} className="rounded border-gray-300" />
                    </td>
                  )}
                  <td className="px-4 py-2.5 font-medium text-gray-800">{s.generator_facility}</td>
                  <td className="px-4 py-2.5 text-gray-500">{s.generator_group || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-700">{clientName[s.client_id] || '—'}</td>
                  <td className="px-4 py-2.5 text-right text-gray-700">{stats[s.id]?.n || 0}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{kg(stats[s.id]?.kg || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
