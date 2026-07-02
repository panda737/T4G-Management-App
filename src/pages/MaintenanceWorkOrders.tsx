import { useEffect, useState, useMemo } from 'react';
import { Plus, Search, X, Save, Calendar, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePageTitle } from '../lib/usePageTitle';
import { useUser } from '../lib/UserContext';
import { useToast } from '../lib/toast';
import type { MaintenanceHistory, Equipment } from '../lib/supabase';
import Modal from '../components/Modal';
import DashboardError from '../components/DashboardError';
import { maintenanceTypeColors as TYPE_COLORS } from '../lib/badgeColors';

const TYPES = ['Scheduled', 'Corrective', 'Preventive', 'Emergency'];

export default function MaintenanceWorkOrders() {
  const { canWrite } = useUser();
  const canEdit = canWrite('maintenance');
  usePageTitle('Maintenance — Service History');
  const [history, setHistory] = useState<MaintenanceHistory[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [search, setSearch] = useState('');
  const [filterEquipment, setFilterEquipment] = useState('');
  const [filterType, setFilterType] = useState('');

  const { addToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<MaintenanceHistory | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setLoadError('');
    const [ht, eq] = await Promise.all([
      supabase.from('maintenance_history').select('*').order('service_date', { ascending: false }),
      supabase.from('equipment').select('*').order('name'),
    ]);
    const firstErr = [ht, eq].find(r => r.error)?.error;
    if (firstErr) setLoadError(firstErr.message);
    setHistory(ht.data || []);
    setEquipment(eq.data || []);
    setLoading(false);
  }

  const equipMap = useMemo(() => Object.fromEntries(equipment.map(e => [e.id, e.name])), [equipment]);

  const filtered = useMemo(() => {
    return history.filter(h => {
      if (filterEquipment && h.equipment_id !== filterEquipment) return false;
      if (filterType && h.type !== filterType) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          h.description.toLowerCase().includes(q) ||
          (h.technician || '').toLowerCase().includes(q) ||
          (equipMap[h.equipment_id] || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [history, filterEquipment, filterType, search, equipMap]);

  if (loadError) return <DashboardError title="Service History" message={loadError} onRetry={load} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance History</h1>
          <p className="text-sm text-gray-500 mt-1">All service and maintenance records for plant equipment</p>
        </div>
        {canEdit && (
          <button
            onClick={() => { setEditItem(null); setShowModal(true); }}
            className="flex items-center gap-1.5 text-sm bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <Plus size={16} /> Log Service
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by description, technician, equipment..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
          />
        </div>
        <div className="relative">
          <select value={filterEquipment} onChange={e => setFilterEquipment(e.target.value)} className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
            <option value="">All Equipment</option>
            {equipment.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
            <option value="">All Types</option>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <Calendar size={28} className="mx-auto text-gray-300 mb-3" />
            {history.length === 0 ? (
              <>
                <p className="text-sm font-medium text-gray-500">No service records yet</p>
                <p className="text-xs text-gray-400 mt-1">Log your first maintenance or service event.</p>
                {canEdit && <button onClick={() => { setEditItem(null); setShowModal(true); }} className="mt-4 text-sm text-orange-600 hover:text-orange-700 font-medium">+ Log Service</button>}
              </>
            ) : (
              <>
                <p className="text-sm text-gray-400">No records match your filters.</p>
                <button onClick={() => { setSearch(''); setFilterEquipment(''); setFilterType(''); }} className="mt-2 text-xs text-gray-500 underline">Clear filters</button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="text-left px-5 py-2.5 text-xs font-medium uppercase tracking-wider">Service Date</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Equipment</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Description</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Technician</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Next Service</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((h, idx) => (
                    <tr
                      key={h.id}
                      className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} hover:bg-orange-50/30 transition-colors cursor-pointer`}
                      onClick={() => { setEditItem(h); setShowModal(true); }}
                    >
                      <td className="px-5 py-3 font-medium text-gray-700 whitespace-nowrap">
                        {new Date(h.service_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{equipMap[h.equipment_id] || <span className="text-gray-300">--</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[h.type] || 'bg-gray-100 text-gray-500'}`}>{h.type}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{h.description}</td>
                      <td className="px-4 py-3 text-gray-600">{h.technician || <span className="text-gray-300">--</span>}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {h.next_service_date
                          ? new Date(h.next_service_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
                          : <span className="text-gray-300">--</span>
                        }
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={ev => { ev.stopPropagation(); setEditItem(h); setShowModal(true); }}
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

            {/* Mobile */}
            <div className="md:hidden divide-y divide-gray-100">
              {filtered.map(h => (
                <div
                  key={h.id}
                  className="p-4 hover:bg-orange-50/30 cursor-pointer transition-colors"
                  onClick={() => { setEditItem(h); setShowModal(true); }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="font-medium text-gray-800 text-sm">{equipMap[h.equipment_id] || '--'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${TYPE_COLORS[h.type] || 'bg-gray-100 text-gray-500'}`}>{h.type}</span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{h.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(h.service_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {h.technician ? ` · ${h.technician}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showModal && (
        <HistoryModal
          item={editItem}
          equipment={equipment}
          onClose={() => { setShowModal(false); setEditItem(null); }}
          onSave={() => { setShowModal(false); setEditItem(null); addToast('Service record saved'); load(); }}
        />
      )}
    </div>
  );
}

function HistoryModal({
  item, equipment, onClose, onSave,
}: {
  item: MaintenanceHistory | null;
  equipment: Equipment[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    equipment_id: item?.equipment_id || '',
    service_date: item?.service_date || new Date().toISOString().split('T')[0],
    type: item?.type || 'Scheduled',
    technician: item?.technician || '',
    description: item?.description || '',
    next_service_date: item?.next_service_date || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function update(field: string, value: string) {
    setForm(p => ({ ...p, [field]: value }));
  }

  async function handleSave() {
    if (!form.equipment_id) { setError('Equipment is required'); return; }
    if (!form.description.trim()) { setError('Description is required'); return; }
    setSaving(true);
    setError('');
    const payload = {
      equipment_id: form.equipment_id,
      service_date: form.service_date,
      type: form.type,
      technician: form.technician || null,
      description: form.description.trim(),
      next_service_date: form.next_service_date || null,
    };
    const { error: err } = item
      ? await supabase.from('maintenance_history').update(payload).eq('id', item.id)
      : await supabase.from('maintenance_history').insert(payload);
    if (err) { setError(err.message); setSaving(false); return; }
    onSave();
  }

  const footer = (
    <>
      <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
      <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-5 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-lg disabled:opacity-50 font-medium shadow-sm transition-colors">
        <Save size={14} /> {saving ? 'Saving...' : item ? 'Update' : 'Log Service'}
      </button>
    </>
  );

  return (
    <Modal title={item ? 'Edit Service Record' : 'Log Service Record'} onClose={onClose} size="lg" accent="orange" footer={footer}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Equipment *</label>
          <div className="relative">
            <select value={form.equipment_id} onChange={e => update('equipment_id', e.target.value)} className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white">
              <option value="">-- Select Equipment --</option>
              {equipment.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Service Date</label>
            <input type="date" value={form.service_date} onChange={e => update('service_date', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <div className="relative">
              <select value={form.type} onChange={e => update('type', e.target.value)} className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white">
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Technician</label>
            <input value={form.technician} onChange={e => update('technician', e.target.value)} placeholder="Name of person who did the work" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Next Service Date</label>
            <input type="date" value={form.next_service_date} onChange={e => update('next_service_date', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Description *</label>
          <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3} placeholder="What was done, parts replaced, observations..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2 flex items-center gap-2"><X size={14} /> {error}</div>}
      </div>
    </Modal>
  );
}
