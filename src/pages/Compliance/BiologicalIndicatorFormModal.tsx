import { useRef, useState } from 'react';
import { Camera, X, ImagePlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import { generateSequentialNumber } from '../../lib/numberGenerator';
import Modal from '../../components/Modal';
import { BI_PHOTO_BUCKET, BI_PHOTO_MAX_BYTES, BI_PHOTO_ACCEPTED, COMPACTORS } from './constants';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-teal-500';

export default function BiologicalIndicatorFormModal({ onClose, onSaved }: Props) {
  const { profile } = useUser();
  const { addToast } = useToast();

  // Date & time are stamped when the capture is opened — the user can't change
  // them. Captured in LOCAL time (not UTC) so the date is correct in SAST.
  const [now] = useState(() => new Date());
  const pad = (n: number) => String(n).padStart(2, '0');
  const localDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const localTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const [compactor, setCompactor] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  function pickFile(f: File | null) {
    setError('');
    if (!f) return;
    if (!BI_PHOTO_ACCEPTED.includes(f.type) && !f.type.startsWith('image/')) {
      setError('Please attach a photo (JPG, PNG, WEBP or HEIC).');
      return;
    }
    if (f.size > BI_PHOTO_MAX_BYTES) {
      setError('Photo is too large — maximum 15 MB.');
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  function clearFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
  }

  const canSubmit = compactor !== '' && !!file && !saving;

  async function handleSubmit() {
    if (!file || compactor === '') {
      setError('Choose the compactor and attach a photo.');
      return;
    }
    setSaving(true);
    setError('');

    // 1. Upload the photo first so a failure never leaves a record without one.
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${now.getFullYear()}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(BI_PHOTO_BUCKET)
      .upload(path, file, { contentType: file.type || 'image/jpeg' });
    if (upErr) {
      setError(upErr.message);
      setSaving(false);
      return;
    }

    // 2. Insert the record. If it fails, remove the orphaned upload.
    try {
      const bi_number = await generateSequentialNumber('biological_indicators', 'bi_number', 'BI');
      const { error: dbErr } = await supabase.from('biological_indicators').insert([{
        bi_number,
        captured_date: localDate,
        captured_time: localTime,
        compactor_no: compactor,
        photo_path: path,
        notes: notes.trim(),
        captured_by: profile?.display_name ?? '',
        captured_by_id: profile?.employee_id ?? null,
      }]);
      if (dbErr) throw dbErr;
      addToast('Biological indicator captured');
      onSaved();
    } catch (err) {
      await supabase.storage.from(BI_PHOTO_BUCKET).remove([path]);
      setError(err instanceof Error ? err.message : 'Could not save the record.');
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Capture Biological Indicator"
      onClose={onClose}
      size="md"
      accent="cyan"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-5 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Submit'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Photo — the headline action. Two inputs: camera (capture) and gallery. */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Batch photo *</label>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => pickFile(e.target.files?.[0] ?? null)}
          />
          <input
            ref={libraryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => pickFile(e.target.files?.[0] ?? null)}
          />
          {previewUrl ? (
            <div className="relative">
              <img src={previewUrl} alt="Biological indicator" className="w-full max-h-64 object-cover rounded-xl border border-gray-200" />
              <button
                onClick={clearFile}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80"
                title="Remove photo"
              >
                <X size={16} />
              </button>
              <div className="absolute bottom-2 right-2 flex gap-1.5">
                <button
                  onClick={() => cameraRef.current?.click()}
                  className="bg-white/90 text-gray-700 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 hover:bg-white"
                >
                  <Camera size={14} /> Retake
                </button>
                <button
                  onClick={() => libraryRef.current?.click()}
                  className="bg-white/90 text-gray-700 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 hover:bg-white"
                >
                  <ImagePlus size={14} /> Replace
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => cameraRef.current?.click()}
                className="border-2 border-dashed border-teal-300 bg-teal-50 rounded-xl px-3 py-6 text-center hover:bg-teal-100 transition-colors"
              >
                <Camera size={28} className="mx-auto text-teal-500 mb-1.5" />
                <p className="text-sm font-semibold text-teal-700">Take photo</p>
              </button>
              <button
                onClick={() => libraryRef.current?.click()}
                className="border-2 border-dashed border-teal-300 bg-teal-50 rounded-xl px-3 py-6 text-center hover:bg-teal-100 transition-colors"
              >
                <ImagePlus size={28} className="mx-auto text-teal-500 mb-1.5" />
                <p className="text-sm font-semibold text-teal-700">Upload from library</p>
              </button>
              <p className="col-span-2 text-xs text-teal-600/80 text-center">A picture is required</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Compactor *</label>
          <select
            value={compactor}
            onChange={e => setCompactor(e.target.value ? Number(e.target.value) : '')}
            className={inputClass}
          >
            <option value="">Select compactor…</option>
            {COMPACTORS.map(n => <option key={n} value={n}>Compactor {n}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Anything else worth recording…"
            className={`${inputClass} resize-none`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date &amp; time</label>
          <div className={`${inputClass} bg-gray-50 text-gray-700 flex items-center`}>
            {now.toLocaleDateString()} · {localTime}
          </div>
          <p className="text-xs text-gray-400 mt-1">Recorded as now.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Captured by</label>
          <div className={`${inputClass} bg-gray-50 text-gray-700 flex items-center`}>
            {profile?.display_name || 'Logged-in user'}
          </div>
          <p className="text-xs text-gray-400 mt-1">Automatically recorded as you.</p>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      </div>
    </Modal>
  );
}
