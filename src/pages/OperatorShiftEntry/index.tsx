import { useState, useEffect } from 'react';
import { Sun, Sunset, Moon, ClipboardCopy, Check, CheckCircle, AlertTriangle, Loader, PenLine, RotateCcw, ChevronLeft, Menu } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import type { ShiftType } from '../../lib/supabase';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import { useOpenNav } from '../../lib/mobileNav';
import { useBackClose } from '../../lib/useBackClose';
import { SHIFT_TEAM_EXCLUDED_NAMES } from '../../lib/excludedEmployees';
import EmployeeTogglePicker from '../../components/EmployeeTogglePicker';
import SignaturePad from '../../components/SignaturePad';

type Step = 'select' | 'form' | 'summary';

interface DowntimeEntry {
  reason: string;
  hours: string;
  minutes: string;
}

const entryTotalMin = (d: DowntimeEntry) => (parseInt(d.hours) || 0) * 60 + (parseInt(d.minutes) || 0);
const entryHasContent = (d: DowntimeEntry) => d.hours !== '' || d.minutes !== '' || d.reason.trim() !== '';
function fmtHM(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

interface FormState {
  cycles: string;
  treated_kg: string;
  ruc_washed: string;
  lids_washed: string;
  wheelie_bins: string;
  has_downtime: boolean;
  downtimes: DowntimeEntry[];
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
  downtimes: [{ reason: '', hours: '', minutes: '' }],
  notes: '',
  team_ids: [],
  team_names: [],
};

// Format a Date as YYYY-MM-DD using local calendar components (avoids UTC drift).
function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getShiftDate(shift: ShiftType): string {
  const now = new Date();
  // A Night shift runs ~23:00 → ~08:00 the next morning and is attributed to the
  // day it STARTED. Reported in the morning/afternoon (before 18:00) it started
  // yesterday; reported in the evening (>= 18:00, at/after the ~23:00 start) it
  // started today.
  if (shift === 'Night' && now.getHours() < 18) {
    const prev = new Date(now);
    prev.setDate(prev.getDate() - 1);
    return toLocalISO(prev);
  }
  return toLocalISO(now);
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
  usePageTitle('Shift Report');
  const { profile } = useUser();
  const { addToast } = useToast();
  const openNav = useOpenNav();

  const [step, setStep] = useState<Step>('select');
  const [shift, setShift] = useState<ShiftType | null>(null);
  const [shiftDate, setShiftDate] = useState('');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [excludeIds, setExcludeIds] = useState<string[]>([]);
  const [supervisorName, setSupervisorName] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [copied, setCopied] = useState(false);
  // Attendees of the most recent toolbox talk — pre-ticked on the shift team picker.
  const [toolboxTeam, setToolboxTeam] = useState<{ ids: string[]; names: string[] }>({ ids: [], names: [] });

  // Fetch linked employee name and build team exclusion list
  useEffect(() => {
    supabase
      .from('employees')
      .select('id, first_name, surname, position, hs_role')
      .eq('status', 'active')
      .then(({ data }) => {
        if (!data) return;
        const linkedId = profile?.employee_id ?? null;
        const linked = linkedId ? data.find(e => e.id === linkedId) : null;
        setSupervisorName(
          linked
            ? linked.first_name
            : (profile?.display_name ?? '').split(' ')[0]
        );
        const excludedNames = new Set(SHIFT_TEAM_EXCLUDED_NAMES.map(n => n.toLowerCase()));
        const excluded = data
          .filter(e => {
            const full = `${e.first_name} ${e.surname}`.toLowerCase();
            const first = (e.first_name ?? '').toLowerCase();
            return e.hs_role === 'hs_staff' ||
              (e.position ?? '').toLowerCase().includes('driver') ||
              (e.position ?? '').toLowerCase().includes('maintenance') ||
              excludedNames.has(full) || excludedNames.has(first) ||
              (linkedId ? e.id === linkedId : full === (profile?.display_name ?? '').toLowerCase());
          })
          .map(e => e.id);
        setExcludeIds(excluded);
      });
  }, [profile?.employee_id, profile?.display_name]);

  // Pull the attendees of the most recent toolbox talk so the shift team starts
  // pre-ticked with whoever was at the talk done at the start of the shift.
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: talk } = await supabase
        .from('safety_toolbox_talks')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!active || !talk) return;
      const { data: att } = await supabase
        .from('toolbox_attendees')
        .select('employee_id')
        .eq('toolbox_id', talk.id);
      const attIds = (att ?? []).map(a => a.employee_id);
      if (!active || attIds.length === 0) return;
      const { data: emps } = await supabase
        .from('employees')
        .select('id, first_name, surname')
        .eq('status', 'active')
        .in('id', attIds);
      if (!active) return;
      const nameById = new Map((emps ?? []).map(e => [e.id, `${e.first_name} ${e.surname}`]));
      const ids = attIds.filter(id => nameById.has(id));
      setToolboxTeam({ ids, names: ids.map(id => nameById.get(id) as string) });
    })();
    return () => { active = false; };
  }, []);

  function selectShift(s: ShiftType) {
    setShift(s);
    setShiftDate(getShiftDate(s));
    // Start the team pre-ticked with the most recent toolbox talk's attendees.
    setForm(f => ({ ...f, team_ids: toolboxTeam.ids, team_names: toolboxTeam.names }));
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
    resetAll();
    setStep('select');
  }

  // Device/browser Back: from the form/summary return to the shift picker (instead
  // of leaving the page); if the signature pad is open, Back closes it first.
  useBackClose(step !== 'select', goBackToSelect);
  useBackClose(showSignaturePad, () => setShowSignaturePad(false));

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

    const employeeId = profile?.employee_id ?? null;

    const { data: report, error: reportErr } = await supabase
      .from('treatment_shift_reports')
      .insert({
        shift_date:       shiftDate,
        shift,
        supervisor_id:    employeeId,
        submitted_by:     user.id,
        cycles:           Number(form.cycles) || 0,
        treated_kg:       Number(form.treated_kg) || 0,
        ruc_washed:       Number(form.ruc_washed) || 0,
        lids_washed:      Number(form.lids_washed) || 0,
        wheelie_bins:     Number(form.wheelie_bins) || 0,
        has_downtime:     form.has_downtime && form.downtimes.some(entryHasContent),
        notes:            form.notes,
        signature_data:   signatureData,
        signed_at:        new Date().toISOString(),
      })
      .select('id')
      .single();

    if (reportErr || !report) {
      // 23505 = the new UNIQUE (shift_date, shift) — this shift is already recorded.
      setSubmitError(
        reportErr?.code === '23505'
          ? `A report for the ${shift} shift on ${shiftDate} has already been submitted. Ask a supervisor to correct it if the numbers are wrong.`
          : reportErr?.message ?? 'Failed to save. Please try again.'
      );
      setSaving(false);
      return;
    }

    // If any follow-up write fails, remove the report we just created (children
    // cascade) so the operator can retry cleanly instead of hitting the
    // one-report-per-shift constraint on a half-saved submission.
    async function failSubmit(message: string) {
      await supabase.from('treatment_shift_reports').delete().eq('id', report!.id);
      setSubmitError(`${message} Nothing was saved — please try again.`);
      setSaving(false);
    }

    if (form.team_ids.length > 0) {
      const { error: teamErr } = await supabase.from('treatment_shift_team_members').insert(
        form.team_ids.map(employee_id => ({
          shift_report_id: report.id,
          employee_id,
        }))
      );
      if (teamErr) { await failSubmit(teamErr.message); return; }
    }

    if (form.has_downtime) {
      const downtimeRows = form.downtimes
        .filter(entryHasContent)
        .map(d => ({
          shift_report_id: report.id,
          reason: d.reason.trim(),
          minutes: entryTotalMin(d),
        }));
      if (downtimeRows.length > 0) {
        const { error: downtimeErr } = await supabase.from('treatment_shift_downtimes').insert(downtimeRows);
        if (downtimeErr) { await failSubmit(downtimeErr.message); return; }
      }
    }

    // Upsert shift data into the daily log (creates the row if it doesn't exist).
    // The DB trigger recalculates total_cycles, total_treated_kg, chemical_litres automatically.
    const shiftUpdate = shift === 'Day'
      ? {
          day_shift_cycles:        Number(form.cycles) || 0,
          day_shift_treated_kg:    Number(form.treated_kg) || 0,
          day_shift_ruc_washed:    Number(form.ruc_washed) || 0,
          day_shift_lids_washed:   Number(form.lids_washed) || 0,
          day_shift_wheelie_bins:  Number(form.wheelie_bins) || 0,
          day_shift_supervisor_id: employeeId,
        }
      : shift === 'Afternoon'
      ? {
          afternoon_shift_cycles:        Number(form.cycles) || 0,
          afternoon_shift_treated_kg:    Number(form.treated_kg) || 0,
          afternoon_shift_ruc_washed:    Number(form.ruc_washed) || 0,
          afternoon_shift_lids_washed:   Number(form.lids_washed) || 0,
          afternoon_shift_wheelie_bins:  Number(form.wheelie_bins) || 0,
          afternoon_shift_supervisor_id: employeeId,
        }
      : {
          night_shift_cycles:        Number(form.cycles) || 0,
          night_shift_treated_kg:    Number(form.treated_kg) || 0,
          night_shift_ruc_washed:    Number(form.ruc_washed) || 0,
          night_shift_lids_washed:   Number(form.lids_washed) || 0,
          night_shift_wheelie_bins:  Number(form.wheelie_bins) || 0,
          night_shift_supervisor_id: employeeId,
        };
    const { error: logErr } = await supabase
      .from('treatment_daily_log')
      .upsert({ date: shiftDate, updated_at: new Date().toISOString(), ...shiftUpdate }, { onConflict: 'date' });
    if (logErr) { await failSubmit(logErr.message); return; }

    setSaving(false);
    addToast('Shift report submitted successfully');
    setStep('summary');
  }

  function buildClipboardText(): string {
    const sup = supervisorName || profile?.display_name || 'Unknown';
    const firstNames = form.team_names.map(n => n.split(' ')[0]);
    const teamStr = firstNames.length > 0
      ? `${sup}, ${firstNames.join(', ')}`
      : sup;
    const lines: string[] = [
      `Date: ${shiftDate}`,
      `Shift: ${shift} Shift`,
      `Team: ${teamStr}`,
      '',
      `Cycles: ${form.cycles || 0}`,
      `KG Treated: ${form.treated_kg || 0}`,
      '',
      `RUC Washed: ${form.ruc_washed || 0}`,
      `Lids Washed: ${form.lids_washed || 0}`,
      `Wheelie Bins: ${form.wheelie_bins || 0}`,
      '',
    ];
    const activeDowntimes = form.has_downtime
      ? form.downtimes.filter(entryHasContent)
      : [];
    if (activeDowntimes.length > 0) {
      activeDowntimes.forEach((d, i) => {
        const t = entryTotalMin(d);
        const mins = t > 0 ? ` (${fmtHM(t)})` : '';
        lines.push(`Delay ${i + 1}: ${d.reason || 'Downtime'}${mins}`);
      });
    } else {
      lines.push('Delays: None');
    }
    if (form.notes.trim()) {
      lines.push('', `Notes: ${form.notes.trim()}`);
    }
    return lines.join('\n');
  }

  function handleCopy() {
    const text = buildClipboardText();

    function onSuccess() {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }

    function fallback() {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
      document.body.appendChild(el);
      el.focus();
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      if (ok) onSuccess();
      else addToast('Could not copy to clipboard', 'error');
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(onSuccess).catch(fallback);
    } else {
      fallback();
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

        {/* Menu — opens the navigation drawer (mobile). Operators land here, so
            this gives them a clear way into the rest of the app without reaching
            for the top bar. */}
        <button
          onClick={openNav}
          className="lg:hidden w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 active:scale-[0.99] transition-all"
        >
          <Menu size={20} /> Menu
        </button>
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
            <p className="text-sm font-semibold text-gray-900">{supervisorName || '—'}</p>
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
          </div>
          <div className="grid grid-cols-3 gap-3">
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
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Wheelie Bins</label>
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
              onClick={() => setForm(f => ({ ...f, has_downtime: false, downtimes: [{ reason: '', hours: '', minutes: '' }] }))}
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
              {form.downtimes.map((entry, idx) => (
                <div key={idx} className={idx > 0 ? 'pt-3 mt-1 border-t border-gray-100' : ''}>
                  {form.downtimes.length > 1 && (
                    <p className="text-[11px] font-semibold text-gray-400 mb-1.5">Delay {idx + 1}</p>
                  )}
                  <div className="flex gap-2 items-start">
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={entry.reason}
                      onChange={e => {
                        const updated = form.downtimes.map((d, i) => i === idx ? { ...d, reason: e.target.value } : d);
                        setField('downtimes', updated);
                      }}
                      placeholder="e.g. Shredder clogged"
                      className={INPUT}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min="0"
                        value={entry.hours}
                        onChange={e => {
                          const updated = form.downtimes.map((d, i) => i === idx ? { ...d, hours: e.target.value } : d);
                          setField('downtimes', updated);
                        }}
                        placeholder="0"
                        className={`${INPUT} w-20`}
                      />
                      <span className="text-xs text-gray-400">hrs</span>
                      <input
                        type="number" min="0" max="59"
                        value={entry.minutes}
                        onChange={e => {
                          const updated = form.downtimes.map((d, i) => i === idx ? { ...d, minutes: e.target.value } : d);
                          setField('downtimes', updated);
                        }}
                        placeholder="0"
                        className={`${INPUT} w-20`}
                      />
                      <span className="text-xs text-gray-400">min</span>
                    </div>
                  </div>
                  {form.downtimes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setField('downtimes', form.downtimes.filter((_, i) => i !== idx))}
                      className="mt-1 text-gray-400 hover:text-red-500 transition px-1 text-lg leading-none"
                    >
                      ×
                    </button>
                  )}
                  </div>
                </div>
              ))}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setField('downtimes', [...form.downtimes, { reason: '', hours: '', minutes: '' }])}
                  className="flex items-center gap-1.5 text-sm text-cyan-600 hover:text-cyan-700 font-medium transition"
                >
                  + Add downtime
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Team Members */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Team Members</h2>
          <EmployeeTogglePicker
            value={form.team_ids}
            onChange={(ids, names) => setForm(f => ({ ...f, team_ids: ids, team_names: names }))}
            excludeIds={excludeIds}
            priorityIds={toolboxTeam.ids}
          />
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
                onClick={() => setShowSignaturePad(true)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition"
              >
                <RotateCcw size={11} /> Re-sign
              </button>
            </div>
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

        {/* Signature popup */}
        {showSignaturePad && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowSignaturePad(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-3">
              <h3 className="text-base font-semibold text-gray-900 text-center">Draw your signature</h3>
              <SignaturePad
                onSave={url => { setSignatureData(url); setShowSignaturePad(false); }}
                onCancel={() => setShowSignaturePad(false)}
                existingSignature={signatureData}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Step 3: Summary ───────────────────────────────────────────────────────
  const sup = supervisorName || profile?.display_name || 'Unknown';
  const teamFirstNames = form.team_names.map(n => n.split(' ')[0]);
  const teamDisplay = teamFirstNames.length > 0
    ? `${sup}, ${teamFirstNames.join(', ')}`
    : sup;
  const activeDowntimes = form.has_downtime
    ? form.downtimes.filter(entryHasContent)
    : [];
  const delayDisplay = activeDowntimes.length > 0
    ? activeDowntimes.map((d, i) => { const t = entryTotalMin(d); return `${i + 1}. ${d.reason || 'Downtime'}${t > 0 ? ` (${fmtHM(t)})` : ''}`; }).join(' · ')
    : 'None';

  const summaryRows = [
    { label: 'Date',                value: shiftDate },
    { label: 'Shift',               value: `${shift} Shift` },
    { label: 'Team',                value: teamDisplay },
    { label: 'Cycles',              value: form.cycles || '0' },
    { label: 'KG Treated',          value: form.treated_kg || '0' },
    { label: 'RUC Washed',          value: form.ruc_washed || '0' },
    { label: 'Lids Washed',         value: form.lids_washed || '0' },
    { label: 'Wheelie Bins Washed', value: form.wheelie_bins || '0' },
    { label: 'Delays',              value: delayDisplay },
    ...(form.notes.trim() ? [{ label: 'Notes', value: form.notes.trim() }] : []),
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

      <button
        type="button"
        onClick={handleCopy}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition ${
          copied
            ? 'bg-emerald-600 text-white border-emerald-600'
            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
        }`}
      >
        {copied ? <><Check size={15} /> Copied!</> : <><ClipboardCopy size={15} /> Copy Report</>}
      </button>
    </div>
  );
}
