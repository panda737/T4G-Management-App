import { useRef, useState } from 'react';
import { Camera, X, ImagePlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import { generateSequentialNumber } from '../../lib/numberGenerator';
import Modal from '../../components/Modal';
import {
  SPILLAGE_PARTIES,
  SPILLAGE_TYPES,
  SPILLAGE_PHOTO_BUCKET,
  SPILLAGE_PHOTO_MAX_BYTES,
  SPILLAGE_PHOTO_ACCEPTED,
} from './constants';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-amber-500';

export default function SpillageFormModal({ onClose, onSaved }: Props) {
  const { profile } = useUser();
  const { addToast } = useToast();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('');
  const [party, setParty] = useState('');
  const [type, setType] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pickFile(f: File | null) {
    setError('');
    if (!f) return;
    if (!SPILLAGE_PHOTO_ACCEPTED.includes(f.type) && !f.type.startsWith('image/')) {
      setError('Please attach a photo (JPG, PNG, WEBP or HEIC).');
      return;
    }
    if (f.size > SPILLAGE_PHOTO_MAX_BYTES) {
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

  const canSubmit = !!party && !!type && !!file && !saving;

  async function handleSubmit() {
    if (!file || !party || !type) {
      setError('Choose the team, the type of spill, and attach a photo.');
      return;
    }
    setSaving(true);
    setError('');

    // 1. Upload the photo first so a failure never leaves a record without one.
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const year = new Date().getFullYear();
    const path = `${year}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(SPILLAGE_PHOTO_BUCKET)
      .upload(path, file, { contentType: file.type || 'image/jpeg' });
    if (upErr) {
      setError(upErr.message);
      setSaving(false);
      return;
    }

    // 2. Insert the record. If it fails, remove the orphaned upload.
    try {
      const spillage_number = await generateSequentialNumber('spillages', 'spillage_number', 'SPL');
      const { error: dbErr } = await supabase.from('spillages').insert([{
        spillage_number,
        spillage_date: date,
        spillage_time: time || null,
        party,
        spillage_type: type,
        location: location.trim(),
        description: description.trim(),
        photo_path: path,
        reported_by: profile?.display_name ?? '',
        reported_by_id: profile?.employee_id ?? null,
      }]);
      if (dbErr) throw dbErr;
      addToast('Spillage reported');
      onSaved();
    } catch (err) {
      await supabase.storage.from(SPILLAGE_PHOTO_BUCKET).remove([path]);
      setError(err instanceof Error ? err.message : 'Could not save the spillage.');
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Report Spillage"
      onClose={onClose}
      size="md"
      accent="amber"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-5 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Submit'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Photo — the headline action, big and obvious on mobile */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Photo *</label>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => pickFile(e.target.files?.[0] ?? null)}
          />
          {previewUrl ? (
            <div className="relative">
              <img src={previewUrl} alt="Spillage" className="w-full max-h-64 object-cover rounded-xl border border-gray-200" />
              <button
                onClick={clearFile}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80"
                title="Remove photo"
              >
                <X size={16} />
              </button>
              <button
                onClick={() => inputRef.current?.click()}
                className="absolute bottom-2 right-2 bg-white/90 text-gray-700 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 hover:bg-white"
              >
                <ImagePlus size={14} /> Retake
              </button>
            </div>
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full border-2 border-dashed border-amber-300 bg-amber-50 rounded-xl px-4 py-8 text-center hover:bg-amber-100 transition-colors"
            >
              <Camera size={32} className="mx-auto text-amber-500 mb-2" />
              <p className="text-sm font-semibold text-amber-700">Take or choose a photo</p>
              <p className="text-xs text-amber-600/80 mt-0.5">A picture is required</p>
            </button>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Whose waste? *</label>
          <select value={party} onChange={e => setParty(e.target.value)} className={inputClass}>
            <option value="">Select team…</option>
            {SPILLAGE_PARTIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">What was found? *</label>
          <select value={type} onChange={e => setType(e.target.value)} className={inputClass}>
            <option value="">Select type…</option>
            {SPILLAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Where on site?"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            placeholder="Anything else worth recording…"
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reported by</label>
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
