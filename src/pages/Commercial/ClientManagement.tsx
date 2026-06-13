import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Link2, ChevronRight } from 'lucide-react';
import { supabase, type Client } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import { PageSpinner } from '../../components/Spinner';
import SectionTabs from '../../components/SectionTabs';
import { CLIENT_TABS } from './commercialTabs';

interface PortalUser { id: string; display_name: string; client_id: string | null; }

function kg(n: number) { return n.toLocaleString('en-ZA', { maximumFractionDigits: 0 }); }

export default function ClientManagement() {
  usePageTitle('Commercial — Client Management');
  const navigate = useNavigate();
  const { isAdmin } = useUser();
  const { addToast } = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [siteCounts, setSiteCounts] = useState<Record<string, number>>({});
  const [recCounts, setRecCounts] = useState<Record<string, { n: number; kg: number }>>({});
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [savingUser, setSavingUser] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [cRes, sRes, rRes, uRes] = await Promise.all([
      supabase.from('clients').select('*').order('client_name'),
      supabase.from('client_sites').select('client_id'),
      supabase.from('received_waste_records').select('client_id, nett_weight_kg'),
      supabase.from('user_profiles').select('id, display_name, client_id').eq('role', 'customer'),
    ]);
    setClients((cRes.data ?? []) as Client[]);
    const sc: Record<string, number> = {};
    (sRes.data ?? []).forEach((s: { client_id: string }) => { sc[s.client_id] = (sc[s.client_id] || 0) + 1; });
    setSiteCounts(sc);
    const rc: Record<string, { n: number; kg: number }> = {};
    (rRes.data ?? []).forEach((r: { client_id: string; nett_weight_kg: number }) => {
      const e = rc[r.client_id] || { n: 0, kg: 0 }; e.n++; e.kg += Number(r.nett_weight_kg); rc[r.client_id] = e;
    });
    setRecCounts(rc);
    setPortalUsers((uRes.data ?? []) as PortalUser[]);
    setLoading(false);
  }

  async function linkUser(userId: string, clientId: string) {
    setSavingUser(userId);
    const { error } = await supabase.from('user_profiles').update({ client_id: clientId || null }).eq('id', userId);
    setSavingUser(null);
    if (error) { addToast('Could not update: ' + error.message, 'error'); return; }
    setPortalUsers(prev => prev.map(u => u.id === userId ? { ...u, client_id: clientId || null } : u));
    addToast('Portal access updated');
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return clients.filter(c => !q || c.client_name.toLowerCase().includes(q) || c.client_code.toLowerCase().includes(q));
  }, [clients, search]);

  if (loading) return <PageSpinner layout="h64" />;

  return (
    <div className="space-y-5">
      <SectionTabs tabs={CLIENT_TABS} />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Client Management</h1>
        <p className="text-sm text-gray-500 mt-1">Customers and their received-waste footprint. Link portal users to a client below.</p>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients…"
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Client</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Code</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Sites</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Records</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Nett kg</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((c, i) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/commercial/clients/${c.id}`)}
                  className={`cursor-pointer hover:bg-indigo-50 transition-colors ${i % 2 ? 'bg-gray-50/40' : 'bg-white'}`}
                >
                  <td className="px-4 py-2.5 font-medium text-gray-800">{c.client_name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{c.client_code || '—'}</td>
                  <td className="px-4 py-2.5 text-right text-gray-700">{siteCounts[c.id] || 0}</td>
                  <td className="px-4 py-2.5 text-right text-gray-700">{recCounts[c.id]?.n || 0}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{kg(recCounts[c.id]?.kg || 0)}</td>
                  <td className="px-4 py-2.5 text-gray-300"><ChevronRight size={15} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Portal user linking */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} className="text-blue-500" />
          <h2 className="text-sm font-semibold text-gray-900">Portal Users</h2>
        </div>
        {!isAdmin ? (
          <p className="text-sm text-gray-400">Only admins can change portal-user links.</p>
        ) : portalUsers.length === 0 ? (
          <p className="text-sm text-gray-400">No customer users yet. Create one in <span className="font-medium">Admin → Users</span> with role “Customer”, then link them here.</p>
        ) : (
          <div className="space-y-2">
            {portalUsers.map(u => (
              <div key={u.id} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                <Link2 size={14} className="text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{u.display_name}</span>
                <select
                  value={u.client_id ?? ''}
                  disabled={savingUser === u.id}
                  onChange={e => linkUser(u.id, e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[260px]"
                >
                  <option value="">— No client (no access) —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
