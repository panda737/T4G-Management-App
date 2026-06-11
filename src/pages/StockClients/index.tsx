import { useEffect, useState, useMemo } from 'react';
import { Plus, Search, Building2, Pencil } from 'lucide-react';
import { supabase, Client } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useToast } from '../../lib/toast';
import { PageSpinner } from '../../components/Spinner';
import ClientFormModal from './ClientFormModal';

export default function StockClients() {
  usePageTitle('Stock — Clients');
  const { addToast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [formClient, setFormClient] = useState<Client | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('clients').select('*').order('client_name');
    setClients(data || []);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return clients.filter(c => {
      if (!showInactive && !c.active) return false;
      if (!q) return true;
      return `${c.client_name} ${c.client_code} ${c.contact_person} ${c.email} ${c.phone}`.toLowerCase().includes(q);
    });
  }, [clients, search, showInactive]);

  function openEdit(client: Client) {
    setFormClient(client);
    setShowForm(true);
  }

  function openAdd() {
    setFormClient(null);
    setShowForm(true);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} client{filtered.length !== 1 ? 's' : ''} — customer database for orders &amp; deliveries</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center justify-center sm:justify-start gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={16} /> Add Client
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search client name, code, contact..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer flex-shrink-0">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
          Show inactive
        </label>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <PageSpinner />
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <Building2 size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 font-medium mb-1">{search ? 'No clients match your search' : 'No clients yet'}</p>
            {!search && (
              <>
                <p className="text-xs text-gray-400 mb-4">Clients you add appear here and can be selected when loading an order.</p>
                <button onClick={openAdd} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                  <Plus size={15} /> Add your first client
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider w-28">Code</th>
                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider">Client</th>
                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider w-40">Contact</th>
                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider w-36">Phone</th>
                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider">Email</th>
                    <th className="text-center px-4 py-3 font-medium text-xs uppercase tracking-wider w-24">Status</th>
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((c, idx) => (
                    <tr
                      key={c.id}
                      className={`hover:bg-emerald-50/40 transition-colors cursor-pointer group ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                      onClick={() => openEdit(c)}
                    >
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{c.client_code || '—'}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-gray-900">{c.client_name}</p>
                        {c.address_line_1 && <p className="text-xs text-gray-400 truncate max-w-xs">{[c.address_line_1, c.address_line_2].filter(Boolean).join(', ')}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{c.contact_person || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{c.phone || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{c.email || '—'}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${c.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                          {c.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <Pencil size={13} className="text-gray-300 group-hover:text-emerald-600 transition-colors inline" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {filtered.map(c => (
                <div key={c.id} className="p-4 hover:bg-emerald-50/40 transition-colors cursor-pointer" onClick={() => openEdit(c)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900">{c.client_name}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{c.client_code || '(no code)'}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${c.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1.5 space-y-0.5">
                    {c.contact_person && <p>{c.contact_person}{c.phone ? ` · ${c.phone}` : ''}</p>}
                    {c.email && <p className="text-gray-400">{c.email}</p>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showForm && (
        <ClientFormModal
          client={formClient}
          onClose={() => setShowForm(false)}
          onSave={() => { setShowForm(false); addToast(formClient ? 'Client updated' : 'Client added'); load(); }}
        />
      )}
    </div>
  );
}
