import { useEffect, useState, useMemo } from 'react';
import { Plus, Search, X, Save, Contact } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { LogisticsDriverCompliance } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useToast } from '../../lib/toast';
import { useUser } from '../../lib/UserContext';
import Modal from '../../components/Modal';
import { DRIVER_POSITIONS } from './constants';
import { ExpiryDate, ComplianceChip, worstStatus } from './expiry';

type DriverOption = { id: string; first_name: string; surname: string; position: string };

export default function DriverCompliance() {
  usePageTitle('Logistics — Driver Compliance');
  const { canWrite } = useUser();
  const writable = canWrite('logistics');
  const { addToast } = useToast();

  const [records, setRecords] = useState<LogisticsDriverCompliance[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<LogisticsDriverCompliance | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [rRes, eRes] = await Promise.all([
      supabase.from('logistics_driver_compliance').select('*'),
      supabase.from('employees').select('id, first_name, surname, position').eq('status', 'active'),
    ]);
    setRecords((rRes.data as LogisticsDriverCompliance[]) ?? []);
    setDrivers((eRes.data as DriverOption[]) ?? []);
    setLoading(false);
  }

  const driverById = useMemo(() => {
    const m = new Map<string, DriverOption>();
    for (const d of drivers) m.set(d.id, d);
    return m;
  }, [drivers]);

  const rows = useMemo(() => {
    const withNames = records.map(r => {
      const d = driverById.get(r.employee_id);
      return { rec: r, name: d ? `${d.first_name} ${d.surname}`.trim() : '(unknown)', position: d?.position ?? '' };
    });
    withNames.sort((a, b) => a.name.localeCompare(b.name));
    if (!search) return withNames;
    const q = search.toLowerCase();
    return withNames.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.position.toLowerCase().includes(q) ||
      (r.rec.licence_code || '').toLowerCase().includes(q) ||
      (r.rec.prdp_categories || '').toLowerCase().includes(q),
    );
  }, [records, driverById, search]);

  // Active drivers who don't yet have a compliance record (for the Add picker).
  const unrecorded = useMemo(() => {
    const taken = new Set(records.map(r => r.employee_id));
    return drivers
      .filter(d => DRIVER_POSITIONS.includes(d.position) && !taken.has(d.id))
      .sort((a, b) => a.surname.localeCompare(b.surname));
  }, [drivers, records]);

  function openRow(r: LogisticsDriverCompliance) {
    if (!writable) return;
    setEditItem(r);
    setShowModal(true);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Driver Compliance</h1>
          <p className="text-sm text-gray-500 mt-1">Licences, PrDPs, medicals &amp; dangerous-goods training for the driving team.</p>
        </div>
        {writable && (
          <button
            onClick={() => { setEditItem(null); setShowModal(true); }}
            className="flex items-center gap-1.5 text-sm bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <Plus size={16} /> Add Driver
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by driver, position, licence, PrDP..."
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
        ) : rows.length === 0 ? (
          <div className="py-14 text-center">
            <Contact size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No driver records yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left px-5 py-2.5 text-xs font-medium uppercase tracking-wider">Driver</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider hidden md:table-cell">Licence</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider hidden lg:table-cell">PrDP</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider hidden lg:table-cell">Medical</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider hidden xl:table-cell">DG Training</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Compliance</th>
                  {writable && <th className="w-12"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(({ rec, name, position }, idx) => (
                  <tr
                    key={rec.id}
                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} transition-colors ${writable ? 'hover:bg-slate-50/40 cursor-pointer' : ''}`}
                    onClick={() => openRow(rec)}
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">{name}</p>
                      <p className="text-xs text-gray-400">{position}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        {rec.licence_code && <span className="text-xs font-mono text-gray-500">{rec.licence_code}</span>}
                        <ExpiryDate date={rec.licence_expiry} />
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        {rec.prdp_categories && <span className="text-xs font-mono text-gray-500">{rec.prdp_categories}</span>}
                        <ExpiryDate date={rec.prdp_expiry} />
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell"><ExpiryDate date={rec.medical_expiry} /></td>
                    <td className="px-4 py-3 hidden xl:table-cell"><ExpiryDate date={rec.dg_training_expiry} /></td>
                    <td className="px-4 py-3 text-center">
                      <ComplianceChip status={worstStatus([rec.licence_expiry, rec.prdp_expiry, rec.medical_expiry, rec.dg_training_expiry])} />
                    </td>
                    {writable && (
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={ev => { ev.stopPropagation(); openRow(rec); }}
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
        <DriverModal
          item={editItem}
          driverById={driverById}
          unrecorded={unrecorded}
          onClose={() => { setShowModal(false); setEditItem(null); }}
          onSave={() => { setShowModal(false); setEditItem(null); addToast('Driver record saved'); load(); }}
        />
      )}
    </div>
  );
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500';
const labelCls = 'block text-xs font-medium text-gray-700 mb-1';

function DriverModal({
  item, driverById, unrecorded, onClose, onSave,
}: {
  item: LogisticsDriverCompliance | null;
  driverById: Map<string, DriverOption>;
  unrecorded: DriverOption[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    employee_id: item?.employee_id || '',
    licence_code: item?.licence_code || '',
    licence_expiry: item?.licence_expiry || '',
    prdp_categories: item?.prdp_categories || '',
    prdp_expiry: item?.prdp_expiry || '',
    medical_expiry: item?.medical_expiry || '',
    dg_training_expiry: item?.dg_training_expiry || '',
    induction_date: item?.induction_date || '',
    notes: item?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const existing = item ? driverById.get(item.employee_id) : null;
  const driverLabel = existing ? `${existing.first_name} ${existing.surname} (${existing.position})` : '';

  function update(field: string, value: string) {
    setForm(p => ({ ...p, [field]: value }));
  }

  async function handleSave() {
    if (!form.employee_id) { setError('Select a driver'); return; }
    setSaving(true);
    setError('');
    const payload = {
      employee_id: form.employee_id,
      licence_code: form.licence_code.trim(),
      licence_expiry: form.licence_expiry || null,
      prdp_categories: form.prdp_categories.trim(),
      prdp_expiry: form.prdp_expiry || null,
      medical_expiry: form.medical_expiry || null,
      dg_training_expiry: form.dg_training_expiry || null,
      induction_date: form.induction_date || null,
      notes: form.notes.trim(),
    };
    const { error: err } = item
      ? await supabase.from('logistics_driver_compliance').update(payload).eq('id', item.id)
      : await supabase.from('logistics_driver_compliance').insert(payload);
    if (err) { setError(err.message); setSaving(false); return; }
    onSave();
  }

  const footer = (
    <>
      <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
      <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-5 py-2 text-sm bg-slate-700 hover:bg-slate-800 text-white rounded-lg disabled:opacity-50 font-medium shadow-sm transition-colors">
        <Save size={14} /> {saving ? 'Saving...' : item ? 'Update' : 'Add Driver'}
      </button>
    </>
  );

  return (
    <Modal title={item ? `Edit: ${driverLabel}` : 'Add Driver Record'} onClose={onClose} size="lg" accent="gray" footer={footer}>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Driver *</label>
          {item ? (
            <input value={driverLabel} disabled className={`${inputCls} bg-gray-50 text-gray-500`} />
          ) : unrecorded.length === 0 ? (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Every active driver already has a record. Edit an existing one instead.
            </p>
          ) : (
            <select value={form.employee_id} onChange={e => update('employee_id', e.target.value)} className={`${inputCls} bg-white`}>
              <option value="">— Select a driver —</option>
              {unrecorded.map(d => <option key={d.id} value={d.id}>{d.first_name} {d.surname} ({d.position})</option>)}
            </select>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Driver's Licence Code</label>
            <input value={form.licence_code} onChange={e => update('licence_code', e.target.value)} placeholder="e.g. EC" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Licence Expiry</label>
            <input type="date" value={form.licence_expiry} onChange={e => update('licence_expiry', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>PrDP Categories</label>
            <input value={form.prdp_categories} onChange={e => update('prdp_categories', e.target.value)} placeholder="e.g. G, D (Dangerous goods)" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>PrDP Expiry</label>
            <input type="date" value={form.prdp_expiry} onChange={e => update('prdp_expiry', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Medical Certificate Expiry</label>
            <input type="date" value={form.medical_expiry} onChange={e => update('medical_expiry', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Dangerous-Goods Training Expiry</label>
            <input type="date" value={form.dg_training_expiry} onChange={e => update('dg_training_expiry', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Induction Date</label>
            <input type="date" value={form.induction_date} onChange={e => update('induction_date', e.target.value)} className={inputCls} />
          </div>
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
