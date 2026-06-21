import { useEffect, useState, useMemo } from 'react';
import { Plus, Search, X, Save, Truck, ChevronDown, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { LogisticsVehicle } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useToast } from '../../lib/toast';
import { useUser } from '../../lib/UserContext';
import Modal from '../../components/Modal';
import { CTRACK_URL, VEHICLE_TYPES, VEHICLE_STATUSES, DRIVER_POSITIONS } from './constants';
import { ExpiryDate, ComplianceChip, worstStatus } from './expiry';

type DriverOption = { id: string; first_name: string; surname: string; position: string };

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700',
  'In for Repair': 'bg-amber-100 text-amber-700',
  Decommissioned: 'bg-gray-200 text-gray-600',
};

export default function VehicleRegister() {
  usePageTitle('Logistics — Vehicle Register');
  const { canWrite } = useUser();
  const writable = canWrite('logistics');
  const { addToast } = useToast();

  const [vehicles, setVehicles] = useState<LogisticsVehicle[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<LogisticsVehicle | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [vRes, eRes] = await Promise.all([
      supabase.from('logistics_vehicles').select('*').order('registration'),
      supabase.from('employees').select('id, first_name, surname, position').eq('status', 'active'),
    ]);
    setVehicles((vRes.data as LogisticsVehicle[]) ?? []);
    setDrivers((eRes.data as DriverOption[]) ?? []);
    setLoading(false);
  }

  const driverName = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of drivers) m.set(d.id, `${d.first_name} ${d.surname}`.trim());
    return m;
  }, [drivers]);

  const filtered = useMemo(() => {
    return vehicles.filter(v => {
      if (filterStatus && v.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          v.registration.toLowerCase().includes(q) ||
          (v.fleet_number || '').toLowerCase().includes(q) ||
          (v.make_model || '').toLowerCase().includes(q) ||
          (v.vehicle_type || '').toLowerCase().includes(q) ||
          (driverName.get(v.assigned_driver_id ?? '') || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [vehicles, filterStatus, search, driverName]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: vehicles.length };
    VEHICLE_STATUSES.forEach(s => { c[s] = vehicles.filter(v => v.status === s).length; });
    return c;
  }, [vehicles]);

  function openRow(v: LogisticsVehicle) {
    if (!writable) return;
    setEditItem(v);
    setShowModal(true);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicle Register</h1>
          <p className="text-sm text-gray-500 mt-1">The fleet and its compliance papers. Route planning &amp; live tracking live in Ctrack.</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={CTRACK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
            title="Plan routes & track the fleet in Ctrack"
          >
            <ExternalLink size={15} /> Open Ctrack
          </a>
          {writable && (
            <button
              onClick={() => { setEditItem(null); setShowModal(true); }}
              className="flex items-center gap-1.5 text-sm bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Plus size={16} /> Add Vehicle
            </button>
          )}
        </div>
      </div>

      {/* Status summary chips */}
      <div className="flex flex-wrap gap-2">
        {['All', ...VEHICLE_STATUSES].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s === 'All' ? '' : s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              (s === 'All' && !filterStatus) || filterStatus === s
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              (s === 'All' && !filterStatus) || filterStatus === s ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by registration, fleet no., make/model, driver..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <Truck size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No vehicles found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left px-5 py-2.5 text-xs font-medium uppercase tracking-wider">Registration</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider hidden sm:table-cell">Fleet&nbsp;No.</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider hidden md:table-cell">Make / Model</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider hidden lg:table-cell">Type</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider hidden lg:table-cell">Driver</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Papers</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Status</th>
                  {writable && <th className="w-12"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((v, idx) => (
                  <tr
                    key={v.id}
                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} transition-colors ${writable ? 'hover:bg-slate-50/40 cursor-pointer' : ''}`}
                    onClick={() => openRow(v)}
                  >
                    <td className="px-5 py-3 font-mono font-medium text-gray-800">{v.registration}</td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{v.fleet_number || <span className="text-gray-300">--</span>}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{v.make_model || <span className="text-gray-300">--</span>}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{v.vehicle_type || <span className="text-gray-300">--</span>}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
                      {v.assigned_driver_id
                        ? (driverName.get(v.assigned_driver_id) || <span className="text-gray-300">--</span>)
                        : <span className="text-gray-300">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ComplianceChip status={worstStatus([v.licence_disc_expiry, v.roadworthy_expiry, v.transport_permit_expiry, v.insurance_expiry])} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[v.status] || 'bg-gray-100 text-gray-500'}`}>{v.status}</span>
                    </td>
                    {writable && (
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={ev => { ev.stopPropagation(); openRow(v); }}
                          className="text-xs text-gray-500 hover:text-slate-700 font-medium"
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <VehicleModal
          item={editItem}
          drivers={drivers}
          onClose={() => { setShowModal(false); setEditItem(null); }}
          onSave={() => { setShowModal(false); setEditItem(null); addToast('Vehicle saved'); load(); }}
        />
      )}
    </div>
  );
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500';
const labelCls = 'block text-xs font-medium text-gray-700 mb-1';

function VehicleModal({
  item, drivers, onClose, onSave,
}: {
  item: LogisticsVehicle | null;
  drivers: DriverOption[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    registration: item?.registration || '',
    fleet_number: item?.fleet_number || '',
    make_model: item?.make_model || '',
    vehicle_type: item?.vehicle_type || '',
    capacity_kg: item?.capacity_kg != null ? String(item.capacity_kg) : '',
    assigned_driver_id: item?.assigned_driver_id || '',
    status: item?.status || 'Active',
    licence_disc_expiry: item?.licence_disc_expiry || '',
    roadworthy_expiry: item?.roadworthy_expiry || '',
    transport_permit_expiry: item?.transport_permit_expiry || '',
    insurance_expiry: item?.insurance_expiry || '',
    notes: item?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const driverOptions = useMemo(
    () => drivers.filter(d => DRIVER_POSITIONS.includes(d.position)).sort((a, b) => a.surname.localeCompare(b.surname)),
    [drivers],
  );

  function update(field: string, value: string) {
    setForm(p => ({ ...p, [field]: value }));
  }

  async function handleSave() {
    if (!form.registration.trim()) { setError('Registration is required'); return; }
    setSaving(true);
    setError('');
    const payload = {
      registration: form.registration.trim(),
      fleet_number: form.fleet_number.trim(),
      make_model: form.make_model.trim(),
      vehicle_type: form.vehicle_type,
      capacity_kg: form.capacity_kg ? Number(form.capacity_kg) : null,
      assigned_driver_id: form.assigned_driver_id || null,
      status: form.status,
      licence_disc_expiry: form.licence_disc_expiry || null,
      roadworthy_expiry: form.roadworthy_expiry || null,
      transport_permit_expiry: form.transport_permit_expiry || null,
      insurance_expiry: form.insurance_expiry || null,
      notes: form.notes.trim(),
    };
    const { error: err } = item
      ? await supabase.from('logistics_vehicles').update(payload).eq('id', item.id)
      : await supabase.from('logistics_vehicles').insert(payload);
    if (err) { setError(err.message); setSaving(false); return; }
    onSave();
  }

  const footer = (
    <>
      <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
      <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-5 py-2 text-sm bg-slate-700 hover:bg-slate-800 text-white rounded-lg disabled:opacity-50 font-medium shadow-sm transition-colors">
        <Save size={14} /> {saving ? 'Saving...' : item ? 'Update' : 'Add Vehicle'}
      </button>
    </>
  );

  return (
    <Modal title={item ? `Edit: ${item.registration}` : 'Add Vehicle'} onClose={onClose} size="lg" accent="gray" footer={footer}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Registration *</label>
            <input value={form.registration} onChange={e => update('registration', e.target.value)} placeholder="e.g. CA 123-456" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Fleet Number</label>
            <input value={form.fleet_number} onChange={e => update('fleet_number', e.target.value)} placeholder="e.g. TRK-01" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Make / Model</label>
            <input value={form.make_model} onChange={e => update('make_model', e.target.value)} placeholder="e.g. Isuzu FTR 850" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Type</label>
            <div className="relative">
              <select value={form.vehicle_type} onChange={e => update('vehicle_type', e.target.value)} className={`${inputCls} appearance-none pr-8 bg-white`}>
                <option value="">— Select —</option>
                {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Payload Capacity (kg)</label>
            <input type="number" min="0" value={form.capacity_kg} onChange={e => update('capacity_kg', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <div className="relative">
              <select value={form.status} onChange={e => update('status', e.target.value)} className={`${inputCls} appearance-none pr-8 bg-white`}>
                {VEHICLE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Assigned Driver</label>
            <div className="relative">
              <select value={form.assigned_driver_id} onChange={e => update('assigned_driver_id', e.target.value)} className={`${inputCls} appearance-none pr-8 bg-white`}>
                <option value="">— Unassigned —</option>
                {driverOptions.map(d => <option key={d.id} value={d.id}>{d.first_name} {d.surname} ({d.position})</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="pt-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Compliance &amp; renewals</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Licence Disc Expiry</label>
              <input type="date" value={form.licence_disc_expiry} onChange={e => update('licence_disc_expiry', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Roadworthy / COF Expiry</label>
              <input type="date" value={form.roadworthy_expiry} onChange={e => update('roadworthy_expiry', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Transport / Waste Permit Expiry</label>
              <input type="date" value={form.transport_permit_expiry} onChange={e => update('transport_permit_expiry', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Insurance Expiry</label>
              <input type="date" value={form.insurance_expiry} onChange={e => update('insurance_expiry', e.target.value)} className={inputCls} />
            </div>
          </div>
          {item && (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
              <span>Disc: <ExpiryDate date={form.licence_disc_expiry || null} /></span>
              <span>COF: <ExpiryDate date={form.roadworthy_expiry || null} /></span>
              <span>Permit: <ExpiryDate date={form.transport_permit_expiry || null} /></span>
              <span>Insurance: <ExpiryDate date={form.insurance_expiry || null} /></span>
            </div>
          )}
        </div>

        <div>
          <label className={labelCls}>Notes</label>
          <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={2} placeholder="Any additional notes..." className={inputCls} />
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2 flex items-center gap-2"><X size={14} /> {error}</div>}
      </div>
    </Modal>
  );
}
