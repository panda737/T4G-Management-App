import { useState, useEffect } from 'react';
import { Droplets, Plus, Eye, Trash2, Calendar, AlertCircle, Camera } from 'lucide-react';
import { supabase, Spillage } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useToast } from '../../lib/toast';
import { useUser } from '../../lib/UserContext';
import { PageHeader, Button, Toolbar, SearchInput, FilterSelect } from '../../components/ui';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import { SPILLAGE_PARTIES, SPILLAGE_TYPES, SPILLAGE_PHOTO_BUCKET } from './constants';
import SpillageFormModal from './SpillageFormModal';
import SpillageViewModal from './SpillageViewModal';

export default function Spillages() {
  usePageTitle('Safety — Spillages');
  const { canWrite, isAdmin, isManagement } = useUser();
  const canReport = canWrite('spillage');
  const canManage = isAdmin || isManagement;
  const { addToast } = useToast();

  const [spillages, setSpillages] = useState<Spillage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [partyFilter, setPartyFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Spillage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; photo_path: string | null; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadSpillages(); }, []);

  async function loadSpillages() {
    try {
      setLoading(true);
      setLoadError('');
      const { data, error } = await supabase
        .from('spillages')
        .select('*')
        .order('spillage_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSpillages(data || []);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load spillages. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const filtered = spillages.filter(s => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q ||
      s.spillage_number?.toLowerCase().includes(q) ||
      s.party?.toLowerCase().includes(q) ||
      s.spillage_type?.toLowerCase().includes(q) ||
      s.location?.toLowerCase().includes(q) ||
      s.reported_by?.toLowerCase().includes(q);
    const matchesParty = partyFilter === 'All' || s.party === partyFilter;
    const matchesType = typeFilter === 'All' || s.spillage_type === typeFilter;
    const matchesMonth = !monthFilter || s.spillage_date?.startsWith(monthFilter);
    return matchesSearch && matchesParty && matchesType && matchesMonth;
  });

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('spillages').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      if (deleteTarget.photo_path) {
        await supabase.storage.from(SPILLAGE_PHOTO_BUCKET).remove([deleteTarget.photo_path]);
      }
      addToast('Spillage deleted');
      setSelected(null);
      loadSpillages();
    } catch {
      addToast('Could not delete spillage', 'error');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-4">
      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="flex items-center gap-2"><AlertCircle size={15} />{loadError}</span>
          <button onClick={loadSpillages} className="text-red-600 hover:text-red-800 font-medium text-xs underline">Retry</button>
        </div>
      )}

      <PageHeader
        title="Spillage Register"
        subtitle="Quick H&S log of loose waste, blood or other spills found on site"
        icon={Droplets}
        accent="amber"
        actions={
          canReport
            ? <Button variant="primary" accent="amber" icon={Plus} onClick={() => setShowForm(true)}>Report Spillage</Button>
            : undefined
        }
      />

      <Toolbar>
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search spillages…" />
        <FilterSelect value={partyFilter} onChange={setPartyFilter} accent="amber">
          <option value="All">All Clients</option>
          {SPILLAGE_PARTIES.map(p => <option key={p} value={p}>{p}</option>)}
        </FilterSelect>
        <FilterSelect value={typeFilter} onChange={setTypeFilter} accent="amber">
          <option value="All">All Types</option>
          {SPILLAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </FilterSelect>
        <div className="relative">
          <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="month"
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            className={`pl-10 pr-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${monthFilter ? 'border-amber-300 text-amber-700' : 'border-gray-200 text-gray-600'}`}
          />
        </div>
      </Toolbar>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Droplets className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No spillages found</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Spillage #', 'Date', 'Client', 'Type', 'Location', 'Reported By', 'Photo', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr
                      key={s.id}
                      onClick={() => setSelected(s)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(s); } }}
                      role="button"
                      tabIndex={0}
                      className="border-b border-gray-200 hover:bg-gray-50 transition cursor-pointer focus:outline-none focus:bg-amber-50"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.spillage_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(s.spillage_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.party}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.spillage_type}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.location}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.reported_by}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{s.photo_path ? <Camera size={16} className="text-amber-600" /> : '—'}</td>
                      <td className="px-4 py-3 text-sm flex gap-2">
                        <button onClick={e => { e.stopPropagation(); setSelected(s); }} className="text-amber-600 hover:text-amber-700 transition" title="View"><Eye className="w-4 h-4" /></button>
                        {canManage && (
                          <button onClick={e => { e.stopPropagation(); setDeleteTarget({ id: s.id, photo_path: s.photo_path, label: s.spillage_number }); }} className="text-red-600 hover:text-red-700 transition" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {filtered.map(s => (
                <button key={s.id} onClick={() => setSelected(s)} className="w-full text-left px-4 py-3 flex items-center gap-3 active:bg-gray-50">
                  <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                    <Camera size={18} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{s.spillage_number}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700">{s.party}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {new Date(s.spillage_date).toLocaleDateString()} · {s.spillage_type}{s.location ? ` · ${s.location}` : ''}
                    </p>
                  </div>
                  <Eye size={16} className="text-gray-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {showForm && (
        <SpillageFormModal
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadSpillages(); }}
        />
      )}

      {selected && (
        <SpillageViewModal
          spillage={selected}
          canManage={canManage}
          onDelete={() => setDeleteTarget({ id: selected.id, photo_path: selected.photo_path, label: selected.spillage_number })}
          onClose={() => setSelected(null)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          label={deleteTarget.label}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}
