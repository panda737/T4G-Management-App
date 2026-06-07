import { useState } from 'react';
import { Loader } from 'lucide-react';
import { supabase, LegalAppointment, LegalAppointmentType } from '../../lib/supabase';
import Modal from '../../components/Modal';

const APPOINTMENT_TYPES: LegalAppointmentType[] = [
  'First Aider',
  'Fire Fighter',
  'Emergency Coordinator',
  'Safety Representative',
  '16.1 Appointee',
  '16.2 Appointee',
  'Risk Assessor',
  'Incident Investigator',
  'Other',
];

interface Props {
  employeeId: string;
  appointment: LegalAppointment | null;
  onClose: () => void;
  onSave: () => void;
}

export default function LegalAppointmentModal({ employeeId, appointment, onClose, onSave }: Props) {
  const isEdit = !!appointment;
  const [type, setType] = useState<LegalAppointmentType>(appointment?.appointment_type ?? 'First Aider');
  const [appointmentDate, setAppointmentDate] = useState(appointment?.appointment_date ?? '');
  const [expiryDate, setExpiryDate] = useState(appointment?.expiry_date ?? '');
  const [appointedBy, setAppointedBy] = useState(appointment?.appointed_by ?? '');
  const [docRef, setDocRef] = useState(appointment?.document_reference ?? '');
  const [notes, setNotes] = useState(appointment?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';

  async function handleSave() {
    setError('');
    if (!appointmentDate) { setError('Appointment date is required.'); return; }
    if (!appointedBy.trim()) { setError('Appointed by is required.'); return; }

    setSaving(true);
    const payload = {
      employee_id: employeeId,
      appointment_type: type,
      appointment_date: appointmentDate,
      expiry_date: expiryDate || null,
      appointed_by: appointedBy.trim(),
      document_reference: docRef.trim(),
      notes: notes.trim(),
      updated_at: new Date().toISOString(),
    };

    const { error: err } = isEdit
      ? await supabase.from('legal_appointments').update(payload).eq('id', appointment.id)
      : await supabase.from('legal_appointments').insert(payload);

    setSaving(false);
    if (err) { setError(err.message); return; }
    onSave();
  }

  return (
    <Modal title={isEdit ? 'Edit Appointment' : 'Add Legal Appointment'} onClose={onClose} size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Appointment Type *</label>
          <select value={type} onChange={e => setType(e.target.value as LegalAppointmentType)} className={inp}>
            {APPOINTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Appointment Date *</label>
            <input type="date" value={appointmentDate} onChange={e => setAppointmentDate(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Expiry Date</label>
            <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className={inp} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Appointed By *</label>
          <input type="text" value={appointedBy} onChange={e => setAppointedBy(e.target.value)} placeholder="Name of appointing manager" className={inp} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Document Reference</label>
          <input type="text" value={docRef} onChange={e => setDocRef(e.target.value)} placeholder="e.g. Letter of Appointment #2026-01" className={inp} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${inp} resize-none`} placeholder="Optional notes" />
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50"
          >
            {saving ? <><Loader size={14} className="animate-spin" /> Saving...</> : (isEdit ? 'Save Changes' : 'Add Appointment')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
