import { useState, useRef } from 'react';
import { Upload, Loader, FileText } from 'lucide-react';
import { supabase, AppDocument, DocumentCategory } from '../../lib/supabase';
import Modal from '../../components/Modal';

const CATEGORIES: DocumentCategory[] = ['SOP', 'License', 'Permit', 'Policy', 'Certificate', 'Other'];

const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp';

interface Props {
  doc: AppDocument | null;
  onClose: () => void;
  onSave: () => void;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function DocumentFormModal({ doc, onClose, onSave }: Props) {
  const isEdit = !!doc;
  const [title, setTitle] = useState(doc?.title ?? '');
  const [category, setCategory] = useState<DocumentCategory>(doc?.category ?? 'SOP');
  const [description, setDescription] = useState(doc?.description ?? '');
  const [expiryDate, setExpiryDate] = useState(doc?.expiry_date ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500';

  async function handleSave() {
    setError('');
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!isEdit && !file) { setError('Please select a file to upload.'); return; }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Session expired — please log in again.'); return; }

      let filePath = doc?.file_path ?? '';
      let fileName = doc?.file_name ?? '';
      let fileSizeBytes = doc?.file_size_bytes ?? 0;

      if (file) {
        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
        const safeCat = category.toLowerCase().replace(/\s+/g, '-');
        const year = new Date().getFullYear();
        filePath = `${safeCat}/${year}/${crypto.randomUUID()}.${ext}`;
        fileName = file.name;
        fileSizeBytes = file.size;

        const { error: uploadErr } = await supabase.storage
          .from('documents')
          .upload(filePath, file, { upsert: false });

        if (uploadErr) { setError(`Upload failed: ${uploadErr.message}`); return; }
      }

      const payload = {
        title: title.trim(),
        category,
        description: description.trim(),
        expiry_date: expiryDate || null,
        file_path: filePath,
        file_name: fileName,
        file_size_bytes: fileSizeBytes,
        uploaded_by: session.user.id,
        updated_at: new Date().toISOString(),
      };

      if (isEdit) {
        const { error: updateErr } = await supabase
          .from('documents')
          .update(payload)
          .eq('id', doc.id);
        if (updateErr) { setError(updateErr.message); return; }
      } else {
        const { error: insertErr } = await supabase
          .from('documents')
          .insert({ ...payload, is_active: true });
        if (insertErr) { setError(insertErr.message); return; }
      }

      onSave();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Document' : 'Upload Document'} onClose={onClose} size="md" accent="green">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Medical Waste SOP v3" className={inp} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Category *</label>
            <select value={category} onChange={e => setCategory(e.target.value as DocumentCategory)} className={inp}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Expiry Date</label>
            <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className={inp} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className={`${inp} resize-none`} placeholder="Brief description (optional)" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            {isEdit ? 'Replace File (optional)' : 'File *'}
          </label>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 hover:border-violet-400 rounded-lg p-4 text-center cursor-pointer transition-colors"
          >
            {file ? (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                <FileText size={16} className="text-violet-500" />
                <span className="font-medium truncate max-w-[200px]">{file.name}</span>
                <span className="text-gray-400 text-xs flex-shrink-0">{formatBytes(file.size)}</span>
              </div>
            ) : isEdit ? (
              <div className="text-sm text-gray-400">
                <Upload size={18} className="mx-auto mb-1" />
                <span>Current: <span className="font-medium text-gray-600">{doc?.file_name}</span></span>
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
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition disabled:opacity-50"
          >
            {saving ? <><Loader size={14} className="animate-spin" />{file ? 'Uploading...' : 'Saving...'}</> : (isEdit ? 'Save Changes' : 'Upload')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
