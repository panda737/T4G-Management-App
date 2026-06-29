import { useState } from 'react';
import { Loader } from 'lucide-react';
import Modal from '../../components/Modal';
import type { TreatmentChemicalBookout } from '../../lib/supabase';

type EligibleEmployee = { id: string; first_name: string; surname: string; position: string };

const fmtL = (n: number) => n.toLocaleString('en-ZA', { maximumFractionDigits: 0 });
const fmtR = (n: number) => `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Props {
  existing: TreatmentChemicalBookout | null;
  uom: string;
  litresPerUnit: number;
  unitPrice: number;
  employees: EligibleEmployee[];
  onClose: () => void;
  onSubmit: (values: { bookout_date: string; units: number; booked_out_by_employee_id: string | null; notes: string }) => Promise<void>;
}

export default function BookOutModal({ existing, uom, litresPerUnit, unitPrice, employees, onClose, onSubmit }: Props) {
  const isEdit = !!existing;
  const [date, setDate] = useState(existing?.bookout_date?.substring(0, 10) ?? new Date().toISOString().substring(0, 10));
  const [units, setUnits] = useState(existing ? String(existing.units) : '1');
  const [employeeId, setEmployeeId] = useState(existing?.booked_out_by_employee_id ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const unitsNum = parseFloat(units) || 0;
  const litres = unitsNum * litresPerUnit;
  const cost = unitsNum * unitPrice;
  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500';

  async function save() {
    setError('');
    if (!date) { setError('Pick a date.'); return; }
    if (unitsNum <= 0) { setError(`Enter how many ${uom} were booked out.`); return; }
    setSaving(true);
    try {
      await onSubmit({ bookout_date: date, units: unitsNum, booked_out_by_employee_id: employeeId || null, notes });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save book-out.');
      setSaving(false);
    }
  }

  return (
    <Modal
      title={isEdit ? 'Edit book-out' : 'Book out chemical'}
      onClose={onClose}
      size="md"
      accent="cyan"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition font-medium disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader size={14} className="animate-spin" />} {isEdit ? 'Save changes' : 'Book out & deduct'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Containers ({uom}) *</label>
            <input type="number" min="0" step="any" value={units} onChange={e => setUnits(e.target.value)} className={inp} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Booked out by</label>
          <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} className={inp}>
            <option value="">— Select person —</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.surname} · {e.position}</option>)}
          </select>
          {employees.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">No eligible staff found (Stock Controller, Supervisor, Senior Operator, Maintenance, H&S Officer, Operations Manager).</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-500">Litres</p>
            <p className="text-sm font-semibold text-gray-900">{fmtL(litres)} L</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-500">Cost</p>
            <p className="text-sm font-semibold text-gray-900">{fmtR(cost)}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inp} placeholder="Optional" />
        </div>

        <p className="text-xs text-gray-400">
          {isEdit ? 'Saving adjusts stock on hand by the change.' : `This deducts ${units.trim() ? unitsNum : ''} ${uom} from stock on hand.`}
        </p>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
      </div>
    </Modal>
  );
}
