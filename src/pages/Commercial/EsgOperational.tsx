import { useEffect, useState } from 'react';
import { Plus, CheckCircle, Clock, Pencil, Info } from 'lucide-react';
import { supabase, type EsgMonthlyOperational } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import { PageSpinner } from '../../components/Spinner';
import Modal from '../../components/Modal';
import SectionTabs from '../../components/SectionTabs';
import { ESG_TABS } from './commercialTabs';

const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';

// Effluent is intentionally excluded — Not Applicable to Tech4Green (no effluent stream).
const FIELDS: { key: keyof EsgMonthlyOperational; label: string; unit: string }[] = [
  { key: 'electricity_kwh', label: 'Electricity', unit: 'kWh' },
  { key: 'water_kl', label: 'Water', unit: 'kL' },
  { key: 'diesel_litres', label: 'Diesel', unit: 'L' },
  { key: 'treatment_energy_kwh', label: 'Treatment energy', unit: 'kWh' },
  { key: 'trips', label: 'Trips', unit: '' },
  { key: 'kilometres', label: 'Kilometres', unit: 'km' },
  { key: 'idling_hours', label: 'Idling', unit: 'hrs' },
];

function monthLabel(d: string) {
  const [y, m] = d.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
}

export default function EsgOperational() {
  usePageTitle('Commercial — ESG Operational Data');
  const { isAdmin, canWrite } = useUser();
  const { addToast } = useToast();
  const [rows, setRows] = useState<EsgMonthlyOperational[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EsgMonthlyOperational | 'new' | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('esg_monthly_operational').select('*')
      .is('site_id', null).order('period_month', { ascending: false });
    setRows((data ?? []) as EsgMonthlyOperational[]);
    setLoading(false);
  }

  async function toggleApprove(r: EsgMonthlyOperational) {
    if (!isAdmin) { addToast('Only admins can approve', 'error'); return; }
    const { error } = await supabase.from('esg_monthly_operational').update({ approved: !r.approved }).eq('id', r.id);
    if (error) { addToast('Update failed: ' + error.message, 'error'); return; }
    addToast(r.approved ? 'Moved back to draft' : 'Month approved');
    load();
  }

  if (loading) return <PageSpinner layout="h64" />;

  return (
    <div className="space-y-5">
      <SectionTabs tabs={ESG_TABS} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monthly Operational Data</h1>
          <p className="text-sm text-gray-500 mt-1">Plant utilities &amp; transport per month — the few numbers only you can know. Leave a field blank and the engine estimates it from assumptions.</p>
        </div>
        {canWrite('commercial') && (
          <button onClick={() => setEditing('new')} className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-2 rounded-lg transition">
            <Plus size={15} /> Add month
          </button>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 flex items-start gap-2 text-sm text-blue-800">
        <Info size={15} className="mt-0.5 flex-shrink-0" />
        These plant-wide totals are allocated to each client by their share of nett-kg treated that month. Mark each month as <b>Actual</b> (meter readings) or <b>Estimated</b>. <b>Effluent is Not Applicable</b> — the Tech4Green process generates no effluent stream.
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-400">
          No operational data yet. Click <b>Add month</b> to enter your first month of plant readings.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white text-[11px] uppercase tracking-wider">
                  <th className="text-left px-4 py-2.5 font-medium">Month</th>
                  {FIELDS.map(f => <th key={f.key} className="text-right px-3 py-2.5 font-medium">{f.label}</th>)}
                  <th className="text-center px-3 py-2.5 font-medium">Basis</th>
                  <th className="text-center px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r, i) => (
                  <tr key={r.id} className={i % 2 ? 'bg-gray-50/40' : 'bg-white'}>
                    <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap">{monthLabel(r.period_month)}</td>
                    {FIELDS.map(f => (
                      <td key={f.key} className="px-3 py-2.5 text-right text-gray-700">
                        {r[f.key] == null ? <span className="text-gray-300">—</span> : Number(r[f.key]).toLocaleString('en-ZA')}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.data_source === 'actual' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{r.data_source}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {r.approved
                        ? <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold"><CheckCircle size={11} /> Approved</span>
                        : <span className="inline-flex items-center gap-1 text-amber-700 text-xs font-semibold"><Clock size={11} /> Draft</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => setEditing(r)} className="text-gray-500 hover:text-indigo-600 p-1.5 rounded hover:bg-indigo-50" title="Edit"><Pencil size={14} /></button>
                        {isAdmin && (
                          <button onClick={() => toggleApprove(r)} className={`text-xs px-2 py-1 rounded font-medium ${r.approved ? 'text-amber-700 hover:bg-amber-50' : 'text-emerald-700 hover:bg-emerald-50'}`}>
                            {r.approved ? 'Unapprove' : 'Approve'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <EditOpModal row={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
    </div>
  );
}

function EditOpModal({ row, onClose, onSaved }: { row: EsgMonthlyOperational | null; onClose: () => void; onSaved: () => void }) {
  const { addToast } = useToast();
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState(row ? row.period_month.substring(0, 7) : defaultMonth);
  const [dataSource, setDataSource] = useState<'actual' | 'estimated'>(row?.data_source ?? 'actual');
  const [notes, setNotes] = useState(row?.notes ?? '');
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    FIELDS.forEach(f => { o[f.key] = row && row[f.key] != null ? String(row[f.key]) : ''; });
    return o;
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const payload: Record<string, unknown> = {
      period_month: `${month}-01`,
      site_id: null,
      data_source: dataSource,
      notes,
    };
    FIELDS.forEach(f => { payload[f.key] = vals[f.key].trim() === '' ? null : Number(vals[f.key]); });
    let error;
    if (row) ({ error } = await supabase.from('esg_monthly_operational').update(payload).eq('id', row.id));
    else ({ error } = await supabase.from('esg_monthly_operational').upsert(payload, { onConflict: 'period_month' }));
    setSaving(false);
    if (error) { addToast('Save failed: ' + error.message, 'error'); return; }
    addToast('Operational data saved');
    onSaved();
  }

  return (
    <Modal title={row ? 'Edit month' : 'Add month'} onClose={onClose} size="md" accent="indigo"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">Save</button>
        </>
      }>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Month</label>
            <input type="month" className={inp} value={month} disabled={!!row} onChange={e => setMonth(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Data basis</label>
            <select className={inp} value={dataSource} onChange={e => setDataSource(e.target.value as 'actual' | 'estimated')}>
              <option value="actual">Actual (meter readings)</option>
              <option value="estimated">Estimated</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {FIELDS.map(f => (
            <div key={f.key}>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{f.label} {f.unit && <span className="text-gray-400 font-normal">({f.unit})</span>}</label>
              <input type="number" step="any" className={inp} value={vals[f.key]} placeholder="blank = estimate"
                onChange={e => setVals({ ...vals, [f.key]: e.target.value })} />
            </div>
          ))}
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes</label>
          <textarea className={inp} rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}
