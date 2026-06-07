import { useState, useEffect } from 'react';
import { Sun, Sunset, Moon, ClipboardCopy, Check, CheckCircle, AlertTriangle, Loader, PenLine, RotateCcw, ChevronLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { ShiftType } from '../../lib/supabase';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import EmployeeMultiSelect from '../../components/EmployeeMultiSelect';
import SignaturePad from '../../components/SignaturePad';

type Step = 'select' | 'form' | 'summary';

interface FormState {
  cycles: string;
  treated_kg: string;
  ruc_washed: string;
  lids_washed: string;
  wheelie_bins: string;
  has_downtime: boolean;
  downtime_reason: string;
  downtime_minutes: string;
  notes: string;
  team_ids: string[];
  team_names: string[];
}

const EMPTY_FORM: FormState = {
  cycles: '',
  treated_kg: '',
  ruc_washed: '',
  lids_washed: '',
  wheelie_bins: '',
  has_downtime: false,
  downtime_reason: '',
  downtime_minutes: '',
  notes: '',
  team_ids: [],
  team_names: [],
};

function getShiftDate(shift: ShiftType): string {
  const now = new Date();
  if (shift === 'Night') {
    const h = now.getHours();
    if (h >= 23 || h < 6) {
      const prev = new Date(now);
      prev.setDate(prev.getDate() - 1);
      return prev.toISOString().split('T')[0];
    }
  }
  return now.toISOString().split('T')[0];
}

function formatDisplayDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const SHIFT_CONFIG: Record<ShiftType, {
  Icon: typeof Sun;
  label: string;
  time: string;
  bg: string;
  border: string;
  text: string;
  iconBg: string;
}> = {
  Day: {
    Icon: Sun,
    label: 'Day Shift Report',
    time: '06:00 – 14:00',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    iconBg: 'bg-amber-100',
  },
  Afternoon: {
    Icon: Sunset,
    label: 'Afternoon Shift Report',
    time: '14:00 – 22:00',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    iconBg: 'bg-orange-100',
  },
  Night: {
    Icon: Moon,
    label: 'Night Shift Report',
    time: '22:00 – 06:00',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    iconBg: 'bg-indigo-100',
  },
};

const INPUT = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white';

export default function OperatorShiftEntry() {
  const { profile } = useUser();
  const { addToast } = useToast();

  const [step, setStep] = useState<Step>('select');
  const [shift, setShift] = useState<ShiftType | null>(null);
  const [shiftDate, setShiftDate] = useState('');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [excludeIds, setExcludeIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [copied, setCopied] = useState(false);

  // Build the exclude list for team member selection
  useEffect(() => {
    supabase
      .from('employees')
      .select('id, first_name, surname, position, hs_role')
      .eq('status', 'active')
      .then(({ data }) => {
        if (!data) return;
        const displayName = (profile?.display_name ?? '').toLowerCase();
        const excluded = data
          .filter(e =>
            e.hs_role === 'hs_staff' ||
            (e.position ?? '').toLowerCase().includes('driver') ||
            (e.position ?? '').toLowerCase().includes('maintenance') ||
            `${e.first_name} ${e.surname}`.toLowerCase() === displayName
          )
          .map(e => e.id);
        setExcludeIds(excluded);
      });
  }, [profile?.display_name]);

  function selectShift(s: ShiftType) {
    setShift(s);
    setShiftDate(getShiftDate(s));
    setStep('form');
  }

  function resetAll() {
    setForm(EMPTY_FORM);
    setSignatureData(null);
    setShowSignaturePad(false);
    setSubmitError('');
    setShift(null);
    setCopied(false);
  }

  function goBackToSelect() {
    setForm(EMPTY_FORM);
    setSignatureData(null);
    setShowSignaturePad(false);
    setSubmitError('');
    setShift(null);
    setStep('select');
  }

  function setField<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSubmit() {
    if (!signatureData) {
      setSubmitError('Please add your signature before submitting.');
      return;
    }
    if (!shift) return;

    setSaving(true);
    setSubmitError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSubmitError('Session expired. Please log in again.');
      setSaving(false);
      return;
    }

    const { data: report, error: reportErr } = await supabase
      .from('treatment_shift_reports')
      .insert({
        shift_date:       shiftDate,
        shift,
        submitted_by:     user.id,
        cycles:           Number(form.cycles) || 0,
        treated_kg:       Number(form.treated_kg) || 0,
        ruc_washed:       Number(form.ruc_washed) || 0,
        lids_washed:      Number(form.lids_washed) || 0,
        wheelie_bins:     Number(form.wheelie_bins) || 0,
        has_downtime:     form.has_downtime,
        downtime_reason:  form.downtime_reason,
        downtime_minutes: Number(form.downtime_minutes) || 0,
        notes:            form.notes,
        signature_data:   signatureData,
        signed_at:        new Date().toISOString(),
      })
      .select('id')
      .single();

    if (reportErr || !report) {
      setSubmitError(reportErr?.message ?? 'Failed to save. Please try again.');
      setSaving(false);
      return;
    }

    if (form.team_ids.length > 0) {
      await supabase.from('treatment_shift_team_members').insert(
        form.team_ids.map(employee_id => ({
          shift_report_id: report.id,
          employee_id,
        }))
      );
    }

    setSaving(false);
    addToast('Shift report submitted successfully');
    setStep('summary');
  }

  function buildClipboardText(): string {
    const supervisor = profile?.display_name ?? 'Unknown';
    const teamStr = form.team_names.length > 0
      ? `${supervisor} + ${form.team_names.join(', ')}`
      : supervisor;
    const delays = form.has_downtime
      ? `${form.downtime_reason}${form.downtime_minutes ? ` (${form.downtime_minutes} min)` : ''}`
      : 'None';
    return [
      `Date: ${shiftDate}`,
      `Shift: ${shift} Shift`,
      `Team: ${teamStr}`,
      `Cycles: ${form.cycles || 0}`,
      `KG Treated: ${form.treated_kg || 0}`,
      `RUC Washed: ${form.ruc_washed || 0}`,
      `Lids Washed: ${form.lids_washed || 0}`,
      `Wheelie Bins Washed: ${form.wheelie_bins || 0}`,
      `Delays: ${delays}`,
      `Notes: ${form.notes.trim() || '—'}`,
    ].join('\n');
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildClipboardText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      addToast('Could not copy to clipboard', 'error');
    }
  }

  // ── Step 1: Shift Selection ───────────────────────────────────────────────
  if (step === 'select') {
    return (
      <div className="max-w-md mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shift Report</h1>
          <p className="text-sm text-gray-500 mt-1">Select your shift to begin</p>
        </div>

        <div className="space-y-3">
          {(['Day', 'Afternoon', 'Night'] as ShiftType[]).map(s => {
            const cfg = SHIFT_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => selectShift(s)}
                className={`w-full flex items-center gap-4 p-5 rounded-xl border-2 ${cfg.bg} ${cfg.border} hover:shadow-md active:scale-[0.99] transition-all text-left`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.iconBg}`}>
                  <cfg.Icon size={22} className={cfg.text} />
                </div>
                <div>
                  <p className={`text-base font-semibold ${cfg.text}`}>{cfg.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{cfg.time}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Step 2: Data Entry Form ───────────────────────────────────────────────
  if (step === 'form' && shift) {
    const cfg = SHIFT_CONFIG[shift];

    return (
      <div className="max-w-lg mx-auto space-y-6 pb-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={goBackToSelect}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{cfg.label}</h1>
            <p className="text-sm text-gray-500">{formatDisplayDate(shiftDate)}</p>
          </div>
        </div>

        {/* Supervisor & Date (read-only) */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Supervisor</p>
            <p className="text-sm font-semibold text-gray-900">{profile?.display_name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Date</p>
            <p className="text-sm font-semibold text-gray-900">{shiftDate}</p>
          </div>
        </div>

        {/* Production Data */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Production Data</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Number of Cycles</label>
              <input
                type="number" min="0"
                value={form.cycles}
                onChange={e => setField('cycles', e.target.value)}
                placeholder="0"
                className={INPUT}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">KG Treated</label>
              <input
                type="number" min="0" step="0.1"
                value={form.treated_kg}
                onChange={e => setField('treated_kg', e.target.value)}
                placeholder="0"
                className={INPUT}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">RUC Washed</label>
              <input
                type="number" min="0"
                value={form.ruc_washed}
                onChange={e => setField('ruc_washed', e.target.value)}
                placeholder="0"
                className={INPUT}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Lids Washed</label>
              <input
                type="number" min="0"
                value={form.lids_washed}
                onChange={e => setField('lids_washed', e.target.value)}
                placeholder="0"
                className={INPUT}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Wheelie Bins Washed</label>
              <input
                type="number" min="0"
                value={form.wheelie_bins}
                onChange={e => setField('wheelie_bins', e.target.value)}
                placeholder="0"
                className={INPUT}
              />
            </div>
          </div>
        </div>

        {/* Downtime */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Downtime / Delays</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, has_downtime: false, downtime_reason: '', downtime_minutes: '' }))}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition ${
                !form.has_downtime
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => setField('has_downtime', true)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition ${
                form.has_downtime
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Yes
            </button>
          </div>

          {form.has_downtime && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
                <input
                  type="text"
                  value={form.downtime_reason}
                  onChange={e => setField('downtime_reason', e.target.value)}
                  placeholder="e.g. Shredder clogged"
                  className={INPUT}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Duration (minutes)</label>
                <input
                  type="number" min="0"
                  value={form.downtime_minutes}
                  onChange={e => setField('downtime_minutes', e.target.value)}
                  placeholder="0"
                  className={INPUT}
                />
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</h2>
          <textarea
            value={form.notes}
            onChange={e => setField('notes', e.target.value)}
            rows={3}
            placeholder="Any additional notes for this shift…"
            className={`${INPUT} resize-none`}
          />
        </div>

        {/* Team Members */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Team Members</h2>
          <EmployeeMultiSelect
            value={form.team_ids}
            onChange={(ids, names) => setForm(f => ({ ...f, team_ids: ids, team_names: names }))}
            placeholder="Select team members…"
            excludeIds={excludeIds}
          />
        </div>

        {/* Signature */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Supervisor Signature <span className="text-red-400 normal-case font-normal">(required)</span>
          </h2>

          {signatureData ? (
            <div className="space-y-2">
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                <img src={signatureData} alt="Signature" className="w-full h-24 object-contain" />
              </div>
              <button
                type="button"
                onClick={() => { setSignatureData(null); setShowSignaturePad(true); }}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition"
              >
                <RotateCcw size={11} /> Re-sign
              </button>
            </div>
          ) : showSignaturePad ? (
            <SignaturePad
              onSave={url => { setSignatureData(url); setShowSignaturePad(false); }}
              onCancel={() => setShowSignaturePad(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowSignaturePad(true)}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-cyan-400 rounded-xl py-7 text-sm text-gray-400 hover:text-cyan-600 transition"
            >
              <PenLine size={16} /> Tap to sign
            </button>
          )}
        </div>

        {/* Error */}
        {submitError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            <AlertTriangle size={15} className="flex-shrink-0" />
            {submitError}
          </div>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !signatureData}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {saving ? (
            <><Loader size={16} className="animate-spin" /> Submitting…</>
          ) : (
            'Submit Shift Report'
          )}
        </button>
      </div>
    );
  }

  // ── Step 3: Summary ───────────────────────────────────────────────────────
  const supervisor = profile?.display_name ?? 'Unknown';
  const teamDisplay = form.team_names.length > 0
    ? `${supervisor} + ${form.team_names.join(', ')}`
    : supervisor;
  const delayDisplay = form.has_downtime
    ? `${form.downtime_reason}${form.downtime_minutes ? ` (${form.downtime_minutes} min)` : ''}`
    : 'None';

  const summaryRows = [
    { label: 'Date',               value: shiftDate },
    { label: 'Shift',              value: `${shift} Shift` },
    { label: 'Supervisor',         value: supervisor },
    { label: 'Team',               value: form.team_names.length > 0 ? teamDisplay : supervisor },
    { label: 'Cycles',             value: form.cycles || '0' },
    { label: 'KG Treated',         value: form.treated_kg || '0' },
    { label: 'RUC Washed',         value: form.ruc_washed || '0' },
    { label: 'Lids Washed',        value: form.lids_washed || '0' },
    { label: 'Wheelie Bins Washed',value: form.wheelie_bins || '0' },
    { label: 'Delays',             value: delayDisplay },
    { label: 'Notes',              value: form.notes.trim() || '—' },
  ];

  return (
    <div className="max-w-md mx-auto space-y-5 pb-8">
      <div className="text-center py-4">
        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle size={28} className="text-emerald-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Report Submitted</h1>
        <p className="text-sm text-gray-500 mt-1">{shift} Shift · {shiftDate}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
        {summaryRows.map(row => (
          <div key={row.label} className="flex items-start justify-between px-4 py-2.5 gap-4">
            <span className="text-xs font-medium text-gray-500 shrink-0 pt-0.5">{row.label}</span>
            <span className="text-xs text-gray-900 text-right">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleCopy}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition ${
            copied
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          {copied ? <><Check size={15} /> Copied!</> : <><ClipboardCopy size={15} /> Copy Report</>}
        </button>

        <button
          type="button"
          onClick={() => { resetAll(); setStep('select'); }}
          className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium transition"
        >
          Submit Another
        </button>
      </div>
    </div>
  );
}
