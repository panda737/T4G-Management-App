import { useEffect, useState } from 'react';
import { Plus, BadgeCheck, Clock, Trash2 } from 'lucide-react';
import { supabase, type CarbonCreditEvidence, type Client } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import { PageSpinner } from '../../components/Spinner';
import Modal from '../../components/Modal';
import SectionTabs from '../../components/SectionTabs';
import { ESG_TABS } from './commercialTabs';

const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';

export default function EsgCreditEvidence() {
  usePageTitle('Commercial — Carbon Credit Evidence');
  const { isAdmin, canWrite } = useUser();
  const { addToast } = useToast();
  const [rows, setRows] = useState<CarbonCreditEvidence[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [e, c] = await Promise.all([
      supabase.from('carbon_credit_evidence').select('*').order('created_at', { ascending: false }),
      supabase.from('clients').select('*').order('client_name'),
    ]);
    setRows((e.data ?? []) as CarbonCreditEvidence[]);
    setClients((c.data ?? []) as Client[]);
    setLoading(false);
  }

  const clientName = (id: string) => clients.find(c => c.id === id)?.client_name ?? '—';

  async function toggleVerify(r: CarbonCreditEvidence) {
    if (!isAdmin) { addToast('Only admins can verify', 'error'); return; }
    const { error } = await supabase.from('carbon_credit_evidence').update({ verified: !r.verified }).eq('id', r.id);
    if (error) { addToast('Update failed: ' + error.message, 'error'); return; }
    addToast(r.verified ? 'Marked unverified' : 'Marked verified — credits show as verified');
    load();
  }

  async function remove(r: CarbonCreditEvidence) {
    const { error } = await supabase.from('carbon_credit_evidence').delete().eq('id', r.id);
    if (error) { addToast('Delete failed: ' + error.message, 'error'); return; }
    addToast('Evidence removed');
    load();
  }

  if (loading) return <PageSpinner layout="h64" />;

  return (
    <div className="space-y-5">
      <SectionTabs tabs={ESG_TABS} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Carbon Credit Evidence</h1>
          <p className="text-sm text-gray-500 mt-1">Credits stay "indicative" until registry-issued credits + retirement evidence are linked here. Verified evidence flips a client's credits to "verified".</p>
        </div>
        {canWrite('commercial') && (
          <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-2 rounded-lg transition">
            <Plus size={15} /> Add evidence
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-400">
          No evidence linked. Until evidence is added, all carbon credits are shown to customers as <b>indicative estimates only</b>.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white text-[11px] uppercase tracking-wider">
                  <th className="text-left px-4 py-2.5 font-medium">Client</th>
                  <th className="text-left px-4 py-2.5 font-medium">Period</th>
                  <th className="text-left px-4 py-2.5 font-medium">Registry</th>
                  <th className="text-left px-4 py-2.5 font-medium">Serial / Ref</th>
                  <th className="text-right px-4 py-2.5 font-medium">tCO₂e</th>
                  <th className="text-center px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r, i) => (
                  <tr key={r.id} className={i % 2 ? 'bg-gray-50/40' : 'bg-white'}>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{clientName(r.client_id)}</td>
                    <td className="px-4 py-2.5 text-gray-500">{r.period_month ? r.period_month.substring(0, 7) : 'All'}</td>
                    <td className="px-4 py-2.5 text-gray-700">{r.registry_name || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{r.serial_ref || '—'}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{r.quantity_tco2e ?? '—'}</td>
                    <td className="px-4 py-2.5 text-center">
                      {r.verified
                        ? <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold"><BadgeCheck size={12} /> Verified</span>
                        : <span className="inline-flex items-center gap-1 text-gray-400 text-xs font-semibold"><Clock size={12} /> Unverified</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {isAdmin && (
                          <button onClick={() => toggleVerify(r)} className={`text-xs px-2 py-1 rounded font-medium ${r.verified ? 'text-gray-500 hover:bg-gray-100' : 'text-emerald-700 hover:bg-emerald-50'}`}>
                            {r.verified ? 'Unverify' : 'Verify'}
                          </button>
                        )}
                        {canWrite('commercial') && (
                          <button onClick={() => remove(r)} className="text-red-500 hover:bg-red-50 p-1.5 rounded" title="Delete"><Trash2 size={14} /></button>
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

      {adding && <AddEvidenceModal clients={clients} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
    </div>
  );
}

function AddEvidenceModal({ clients, onClose, onSaved }: { clients: Client[]; onClose: () => void; onSaved: () => void }) {
  const { addToast } = useToast();
  const [form, setForm] = useState({ client_id: '', period_month: '', registry_name: '', serial_ref: '', quantity_tco2e: '', retirement_doc_path: '', notes: '' });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.client_id) { addToast('Select a client', 'error'); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('carbon_credit_evidence').insert({
      client_id: form.client_id,
      period_month: form.period_month ? `${form.period_month}-01` : null,
      registry_name: form.registry_name,
      serial_ref: form.serial_ref,
      retirement_doc_path: form.retirement_doc_path,
      quantity_tco2e: form.quantity_tco2e ? Number(form.quantity_tco2e) : null,
      notes: form.notes,
      uploaded_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) { addToast('Save failed: ' + error.message, 'error'); return; }
    addToast('Evidence added');
    onSaved();
  }

  return (
    <Modal title="Add credit evidence" onClose={onClose} size="md" accent="indigo"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">Save</button>
        </>
      }>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Client *</label>
          <select className={inp} value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
            <option value="">— Select —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Period (optional)</label>
            <input type="month" className={inp} value={form.period_month} onChange={e => setForm({ ...form, period_month: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Quantity (tCO₂e)</label>
            <input type="number" step="any" className={inp} value={form.quantity_tco2e} onChange={e => setForm({ ...form, quantity_tco2e: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Registry</label>
            <input className={inp} value={form.registry_name} onChange={e => setForm({ ...form, registry_name: e.target.value })} placeholder="e.g. Verra, Gold Standard" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Serial / Ref</label>
            <input className={inp} value={form.serial_ref} onChange={e => setForm({ ...form, serial_ref: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Retirement document reference</label>
          <input className={inp} value={form.retirement_doc_path} onChange={e => setForm({ ...form, retirement_doc_path: e.target.value })} placeholder="link or file reference" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes</label>
          <textarea className={inp} rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>
    </Modal>
  );
}
