import { useEffect, useState, useMemo } from 'react';
import { Plus, Search, X, Save, Settings, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePageTitle } from '../lib/usePageTitle';
import { useUser } from '../lib/UserContext';
import { useToast } from '../lib/toast';
import type { Equipment } from '../lib/supabase';
import Modal from '../components/Modal';
import DashboardError from '../components/DashboardError';
import { equipmentStatusColors as STATUS_COLORS } from '../lib/badgeColors';

const STATUSES = ['Operational', 'Under Maintenance', 'Faulty', 'Decommissioned'];

export default function MaintenanceAssets() {
  const { canWrite } = useUser();
  const canEdit = canWrite('maintenance');
  usePageTitle('Maintenance — Equipment');
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const { addToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Equipment | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setLoadError('');
    const { data, error } = await supabase.from('equipment').select('*').order('name');
    if (error) setLoadError(error.message);
    setEquipment(data || []);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    return equipment.filter(e => {
      if (filterStatus && e.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          e.name.toLowerCase().includes(q) ||
          (e.category || '').toLowerCase().includes(q) ||
          (e.manufacturer || '').toLowerCase().includes(q) ||
          (e.location || '').toLowerCase().includes(q) ||
          (e.serial_number || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [equipment, filterStatus, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: equipment.length };
    STATUSES.forEach(s => { c[s] = equipment.filter(e => e.status === s).length; });
    return c;
  }, [equipment]);

  if (loadError) return <DashboardError title="Equipment Register" message={loadError} onRetry={load} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipment Register</h1>
          <p className="text-sm text-gray-500 mt-1">All plant machinery and equipment</p>
        </div>
        {canEdit && (
          <button
            onClick={() => { setEditItem(null); setShowModal(true); }}
            className="flex items-center gap-1.5 text-sm bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <Plus size={16} /> Add Equipment
          </button>
        )}
      </div>

      {/* Status summary chips */}
      <div className="flex flex-wrap gap-2">
        {['All', ...STATUSES].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s === 'All' ? '' : s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              (s === 'All' && !filterStatus) || filterStatus === s
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              (s === 'All' && !filterStatus) || filterStatus === s
                ? 'bg-white/20 text-white'
                : 'bg-gray-100 text-gray-500'
            }`}>{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, category, manufacturer, location..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <Settings size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No equipment found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left px-5 py-2.5 text-xs font-medium uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider hidden sm:table-cell">Category</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider hidden md:table-cell">Manufacturer / Model</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider hidden lg:table-cell">Location</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider hidden lg:table-cell">Serial</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Status</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((e, idx) => (
                  <tr
                    key={e.id}
                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} hover:bg-orange-50/30 transition-colors cursor-pointer`}
                    onClick={() => { setEditItem(e); setShowModal(true); }}
                  >
                    <td className="px-5 py-3 font-medium text-gray-800">{e.name}</td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{e.category || <span className="text-gray-300">--</span>}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      {[e.manufacturer, e.model].filter(Boolean).join(' / ') || <span className="text-gray-300">--</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{e.location || <span className="text-gray-300">--</span>}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 hidden lg:table-cell">{e.serial_number || <span className="text-gray-300">--</span>}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[e.status] || 'bg-gray-100 text-gray-500'}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={ev => { ev.stopPropagation(); setEditItem(e); setShowModal(true); }}
                        className="text-xs text-gray-500 hover:text-orange-600 font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <EquipmentModal
          item={editItem}
          onClose={() => { setShowModal(false); setEditItem(null); }}
          onSave={() => { setShowModal(false); setEditItem(null); addToast('Equipment saved'); load(); }}
        />
      )}
    </div>
  );
}

function EquipmentModal({
  item, onClose, onSave,
}: {
  item: Equipment | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    name: item?.name || '',
    category: item?.category || '',
    manufacturer: item?.manufacturer || '',
    model: item?.model || '',
    serial_number: item?.serial_number || '',
    location: item?.location || '',
    status: item?.status || 'Operational',
    notes: item?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function update(field: string, value: string) {
    setForm(p => ({ ...p, [field]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    const payload = {
      name: form.name.trim(),
      category: form.category || null,
      manufacturer: form.manufacturer || null,
      model: form.model || null,
      serial_number: form.serial_number || null,
      location: form.location || null,
      status: form.status,
      notes: form.notes || null,
    };
    const { error: err } = item
      ? await supabase.from('equipment').update(payload).eq('id', item.id)
      : await supabase.from('equipment').insert(payload);
    if (err) { setError(err.message); setSaving(false); return; }
    onSave();
  }

  const footer = (
    <>
      <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
      <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-5 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-lg disabled:opacity-50 font-medium shadow-sm transition-colors">
        <Save size={14} /> {saving ? 'Saving...' : item ? 'Update' : 'Add Equipment'}
      </button>
    </>
  );

  return (
    <Modal title={item ? `Edit: ${item.name}` : 'Add Equipment'} onClose={onClose} size="lg" accent="orange" footer={footer}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Equipment Name *</label>
          <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Main Shredder" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
            <input value={form.category} onChange={e => update('category', e.target.value)} placeholder="e.g. Shredder, Autoclave, Boiler..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <div className="relative">
              <select value={form.status} onChange={e => update('status', e.target.value)} className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Manufacturer</label>
            <input value={form.manufacturer} onChange={e => update('manufacturer', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Model</label>
            <input value={form.model} onChange={e => update('model', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Serial Number</label>
            <input value={form.serial_number} onChange={e => update('serial_number', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
            <input value={form.location} onChange={e => update('location', e.target.value)} placeholder="e.g. Building A, Treatment Bay" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={2} placeholder="Any additional notes..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2 flex items-center gap-2"><X size={14} /> {error}</div>}
      </div>
    </Modal>
  );
}
