import { useState, useRef } from 'react';
import { Upload, Loader, FileText } from 'lucide-react';
import { supabase, EmployeeMedicalRecord, MedicalRecordType } from '../../lib/supabase';
import Modal from '../../components/Modal';

const RECORD_TYPES: MedicalRecordType[] = ['Vaccination', 'Medical Exam', 'Fitness Certificate', 'Other'];
const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp';
const BUCKET = 'employee-medical';

interface Props {
  employeeId: string;
  record: EmployeeMedicalRecord | null;
  onClose: () => void;
  onSave: () => void;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function MedicalRecordModal({ employeeId, record, onClose, onSave }: Props) {
  const isEdit = !!record;
  const [recordType, setRecordType] = useState<MedicalRecordType>(record?.record_type ?? 'Vaccination');
  const [name, setName] = useState(record?.name ?? '');
  const [dateAdministered, setDateAdministered] = useState(record?.date_administered ?? '');
  const [expiryDate, setExpiryDate] = useState(record?.expiry_date ?? '');
  const [provider, setProvider] = useState(record?.provider ?? '');
  const [notes, setNotes] = useState(record?.notes ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';

  async function handleSave() {
    setError('');
    if (!name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Session expired — please log in again.'); return; }

      let filePath = record?.file_path ?? '';
      let fileName = record?.file_name ?? '';
      let fileSizeBytes = record?.file_size_bytes ?? 0;

      if (file) {
        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
        filePath = `${employeeId}/${crypto.randomUUID()}.${ext}`;
        fileName = file.name;
        fileSizeBytes = file.size;
        const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(filePath, file, { upsert: false });
        if (uploadErr) { setError(`Upload failed: ${uploadErr.message}`); return; }
      }

      const payload = {
        employee_id: employeeId,
        record_type: recordType,
        name: name.trim(),
        date_administered: dateAdministered || null,
        expiry_date: expiryDate || null,
        provider: provider.trim(),
        notes: notes.trim(),
        file_path: filePath,
        file_name: fileName,
        file_size_bytes: fileSizeBytes,
        updated_at: new Date().toISOString(),
      };

      if (isEdit) {
        const { error: updErr } = await supabase.from('employee_medical_records').update(payload).eq('id', record.id);
        if (updErr) { setError(updErr.message); return; }
      } else {
        const { error: insErr } = await supabase.from('employee_medical_records').insert({ ...payload, created_by: session.user.id });
        if (insErr) { setError(insErr.message); return; }
      }
      onSave();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Medical Record' : 'Add Medical Record'} onClose={onClose} size="md" accent="green">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Type *</label>
            <select value={recordType} onChange={e => setRecordType(e.target.value as MedicalRecordType)} className={inp}>
              {RECORD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Hepatitis B" className={inp} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Date Administered</label>
            <input type="date" value={dateAdministered} onChange={e => setDateAdministered(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Expiry / Next Due</label>
            <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className={inp} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Provider</label>
          <input type="text" value={provider} onChange={e => setProvider(e.target.value)} placeholder="Clinic / practitioner" className={inp} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${inp} resize-none`} placeholder="Optional" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">{isEdit ? 'Replace File (optional)' : 'Attachment (optional)'}</label>
          <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-gray-300 hover:border-emerald-400 rounded-lg p-4 text-center cursor-pointer transition-colors">
            {file ? (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                <FileText size={16} className="text-emerald-500" />
                <span className="font-medium truncate max-w-[200px]">{file.name}</span>
                <span className="text-gray-400 text-xs flex-shrink-0">{formatBytes(file.size)}</span>
              </div>
            ) : isEdit && record?.file_name ? (
              <div className="text-sm text-gray-400">
                <Upload size={18} className="mx-auto mb-1" />
                <span>Current: <span className="font-medium text-gray-600">{record.file_name}</span></span>
                <p className="text-xs mt-0.5">Click to replace</p>
              </div>
            ) : (
              <div className="text-sm text-gray-400">
                <Upload size={18} className="mx-auto mb-1" />
                <span>Click to select a file</span>
                <p className="text-xs mt-0.5">PDF, Word, Excel, JPG, PNG — max 50 MB</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50">
            {saving ? <><Loader size={14} className="animate-spin" />{file ? 'Uploading...' : 'Saving...'}</> : (isEdit ? 'Save Changes' : 'Add Record')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
