import { useMemo, useState } from 'react';
import { Loader } from 'lucide-react';
import Modal from '../../components/Modal';
import type { TreatmentChemicalUsage } from '../../lib/supabase';

const fmtL = (n: number) => n.toLocaleString('en-ZA', { maximumFractionDigits: 1 });
const fmtR = (n: number) => `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Props {
  existing: TreatmentChemicalUsage | null;
  rate: number;
  uom: string;
  unitPrice: number;
  monthCycles: Record<string, number>;
  recordedMonths: string[];
  onClose: () => void;
  onSubmit: (values: { month: string; actual_litres: number; notes: string }) => Promise<void>;
}

export default function UsageFormModal({ existing, rate, uom, unitPrice, monthCycles, recordedMonths, onClose, onSubmit }: Props) {
  const isEdit = !!existing;

  const defaultMonth = useMemo(() => {
    if (existing) return existing.month.substring(0, 7);
    // Most recent month that has cycles but no usage recorded yet, else current month.
    const open = Object.keys(monthCycles).filter(k => !recordedMonths.includes(k)).sort().reverse();
    return open[0] ?? new Date().toISOString().substring(0, 7);
  }, [existing, monthCycles, recordedMonths]);

  const [month, setMonth] = useState(defaultMonth);
  const [actual, setActual] = useState(existing ? String(existing.actual_litres) : '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const cycles = monthCycles[month] ?? 0;
  const expected = cycles * rate;
  const actualNum = parseFloat(actual) || 0;
  const variance = actualNum - expected;
  const cost = actualNum * unitPrice;

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500';

  async function save() {
    setError('');
    if (!month) { setError('Pick a month.'); return; }
    if (!actual.trim() || actualNum < 0) { setError('Enter the actual litres used (0 or more).'); return; }
    if (!isEdit && recordedMonths.includes(month)) { setError('That month is already recorded — edit it instead.'); return; }
    setSaving(true);
    try {
      await onSubmit({ month, actual_litres: actualNum, notes });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save usage.');
      setSaving(false);
    }
  }

  return (
    <Modal
      title={isEdit ? 'Edit chemical usage' : 'Record chemical usage'}
      onClose={onClose}
      size="md"
      accent="cyan"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition font-medium disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader size={14} className="animate-spin" />} {isEdit ? 'Save changes' : 'Record & update stock'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} disabled={isEdit} className={`${inp} ${isEdit ? 'bg-gray-50 text-gray-500' : ''}`} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-500">Cycles this month</p>
            <p className="text-sm font-semibold text-gray-900">{cycles}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-500">Expected ({uom})</p>
            <p className="text-sm font-semibold text-gray-900">{fmtL(expected)} <span className="text-xs font-normal text-gray-400">@ {fmtL(rate)}/cycle</span></p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Actual used ({uom}) *</label>
          <input type="number" min="0" step="any" value={actual} onChange={e => setActual(e.target.value)} placeholder="e.g. 1350" className={inp} />
        </div>

        {actual.trim() !== '' && (
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-lg px-3 py-2 border ${variance > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <p className="text-xs text-gray-500">Variance ({uom})</p>
              <p className={`text-sm font-semibold ${variance > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{variance > 0 ? '+' : ''}{fmtL(variance)}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500">Cost</p>
              <p className="text-sm font-semibold text-gray-900">{fmtR(cost)}</p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inp} placeholder="Optional" />
        </div>

        <p className="text-xs text-gray-400">
          {isEdit ? 'Saving adjusts stock on hand by the change in actual usage.' : `Recording reduces stock on hand by ${actual.trim() ? fmtL(actualNum) : 'the actual'} ${uom}.`}
        </p>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
      </div>
    </Modal>
  );
}
