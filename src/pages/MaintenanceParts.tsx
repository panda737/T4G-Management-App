import { useEffect, useState, useMemo } from 'react';
import { Plus, Search, X, Save, Package, ChevronDown, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePageTitle } from '../lib/usePageTitle';
import { useToast } from '../lib/toast';
import type { Part, Equipment } from '../lib/supabase';
import Modal from '../components/Modal';

export default function MaintenanceParts() {
  usePageTitle('Maintenance — Spare Parts');
  const [parts, setParts] = useState<Part[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterEquipment, setFilterEquipment] = useState('');
  const [filterLow, setFilterLow] = useState(false);

  const { addToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editPart, setEditPart] = useState<Part | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [pt, eq] = await Promise.all([
      supabase.from('parts').select('*').order('name'),
      supabase.from('equipment').select('*').order('name'),
    ]);
    setParts(pt.data || []);
    setEquipment(eq.data || []);
    setLoading(false);
  }

  const equipMap = useMemo(() => Object.fromEntries(equipment.map(e => [e.id, e.name])), [equipment]);

  const filtered = useMemo(() => {
    return parts.filter(p => {
      if (filterEquipment && p.equipment_id !== filterEquipment) return false;
      if (filterLow && p.qty_on_hand >= p.qty_required) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.part_number || '').toLowerCase().includes(q) ||
          (p.supplier || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [parts, filterEquipment, filterLow, search]);

  const lowCount = parts.filter(p => p.qty_on_hand < p.qty_required).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Spare Parts</h1>
          <p className="text-sm text-gray-500 mt-1">Parts catalogue linked to each piece of equipment</p>
        </div>
        <button
          onClick={() => { setEditPart(null); setShowModal(true); }}
          className="flex items-center gap-1.5 text-sm bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus size={16} /> Add Part
        </button>
      </div>

      {lowCount > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 text-amber-700 text-sm font-medium px-4 py-2.5 rounded-lg">
          <AlertTriangle size={15} />
          {lowCount} part{lowCount !== 1 ? 's' : ''} below required quantity
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by part name, number, supplier..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
          />
        </div>
        <div className="relative">
          <select
            value={filterEquipment}
            onChange={e => setFilterEquipment(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Equipment</option>
            {equipment.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none bg-white border border-gray-200 rounded-lg px-3 py-2">
          <input
            type="checkbox"
            checked={filterLow}
            onChange={e => setFilterLow(e.target.checked)}
            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
          />
          Below required only
        </label>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <Package size={28} className="mx-auto text-gray-300 mb-3" />
            {parts.length === 0 ? (
              <>
                <p className="text-sm font-medium text-gray-500">No spare parts catalogued yet</p>
                <p className="text-xs text-gray-400 mt-1">Add parts and link them to your equipment.</p>
                <button onClick={() => { setEditPart(null); setShowModal(true); }} className="mt-4 text-sm text-orange-600 hover:text-orange-700 font-medium">+ Add Part</button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-400">No parts match your filters.</p>
                <button onClick={() => { setSearch(''); setFilterEquipment(''); setFilterLow(false); }} className="mt-2 text-xs text-gray-500 underline">Clear filters</button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left px-5 py-2.5 text-xs font-medium uppercase tracking-wider">Part Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Equipment</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider hidden md:table-cell">Part No.</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider hidden lg:table-cell">Supplier</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium uppercase tracking-wider">On Hand</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Required</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wider hidden sm:table-cell">Unit Cost</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p, idx) => {
                  const low = p.qty_on_hand < p.qty_required;
                  return (
                    <tr
                      key={p.id}
                      className={`${low ? 'bg-amber-50/30' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} hover:bg-orange-50/30 transition-colors cursor-pointer`}
                      onClick={() => { setEditPart(p); setShowModal(true); }}
                    >
                      <td className="px-5 py-3 font-medium text-gray-800">
                        <div className="flex items-center gap-1.5">
                          {low && <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" />}
                          {p.name}
                        </div>
                        {p.notes && <p className="text-xs text-gray-400 truncate max-w-[200px]">{p.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{equipMap[p.equipment_id] || <span className="text-gray-300">--</span>}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 hidden md:table-cell">{p.part_number || <span className="text-gray-300">--</span>}</td>
                      <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{p.supplier || <span className="text-gray-300">--</span>}</td>
                      <td className={`px-4 py-3 text-center font-bold ${low ? 'text-red-600' : 'text-gray-900'}`}>{p.qty_on_hand}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{p.qty_required}</td>
                      <td className="px-4 py-3 text-right text-gray-600 hidden sm:table-cell">
                        {p.unit_cost != null ? `R ${Number(p.unit_cost).toFixed(2)}` : <span className="text-gray-300">--</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={ev => { ev.stopPropagation(); setEditPart(p); setShowModal(true); }}
                          className="text-xs text-gray-500 hover:text-orange-600 font-medium"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <PartModal
          part={editPart}
          equipment={equipment}
          onClose={() => { setShowModal(false); setEditPart(null); }}
          onSave={() => { setShowModal(false); setEditPart(null); addToast('Part saved'); load(); }}
        />
      )}
    </div>
  );
}

function PartModal({
  part, equipment, onClose, onSave,
}: {
  part: Part | null;
  equipment: Equipment[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    equipment_id: part?.equipment_id || '',
    name: part?.name || '',
    part_number: part?.part_number || '',
    supplier: part?.supplier || '',
    qty_on_hand: part?.qty_on_hand ?? 0,
    qty_required: part?.qty_required ?? 1,
    unit_cost: part?.unit_cost != null ? String(part.unit_cost) : '',
    notes: part?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function update(field: string, value: string | number) {
    setForm(p => ({ ...p, [field]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Part name is required'); return; }
    if (!form.equipment_id) { setError('Equipment is required'); return; }
    setSaving(true);
    setError('');
    const payload = {
      equipment_id: form.equipment_id,
      name: form.name.trim(),
      part_number: form.part_number || null,
      supplier: form.supplier || null,
      qty_on_hand: Number(form.qty_on_hand) || 0,
      qty_required: Number(form.qty_required) || 1,
      unit_cost: form.unit_cost !== '' ? Number(form.unit_cost) : null,
      notes: form.notes || null,
    };
    const { error: err } = part
      ? await supabase.from('parts').update(payload).eq('id', part.id)
      : await supabase.from('parts').insert(payload);
    if (err) { setError(err.message); setSaving(false); return; }
    onSave();
  }

  const footer = (
    <>
      <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
      <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-5 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-lg disabled:opacity-50 font-medium shadow-sm transition-colors">
        <Save size={14} /> {saving ? 'Saving...' : part ? 'Update' : 'Add Part'}
      </button>
    </>
  );

  return (
    <Modal title={part ? `Edit: ${part.name}` : 'Add Spare Part'} onClose={onClose} size="lg" accent="orange" footer={footer}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Equipment *</label>
          <div className="relative">
            <select
              value={form.equipment_id}
              onChange={e => update('equipment_id', e.target.value)}
              className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            >
              <option value="">-- Select Equipment --</option>
              {equipment.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Part Name *</label>
          <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Drive Belt V-Belt A60" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Part Number</label>
            <input value={form.part_number} onChange={e => update('part_number', e.target.value)} placeholder="Manufacturer part no." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Supplier</label>
            <input value={form.supplier} onChange={e => update('supplier', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Qty on Hand</label>
            <input type="number" min="0" step="1" value={form.qty_on_hand} onChange={e => update('qty_on_hand', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Qty Required (min)</label>
            <input type="number" min="0" step="1" value={form.qty_required} onChange={e => update('qty_required', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Unit Cost (R)</label>
            <input type="number" min="0" step="0.01" value={form.unit_cost} onChange={e => update('unit_cost', e.target.value)} placeholder="0.00" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={2} placeholder="Alternative part numbers, storage location, etc." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2 flex items-center gap-2"><X size={14} /> {error}</div>}
      </div>
    </Modal>
  );
}
