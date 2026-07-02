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

const UPLOAD_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1200;

// Browsers throw this for a dropped/blocked connection, not for a real server
// error — worth a couple of quick retries before bothering the user (a weak
// signal on-site is more likely than a real config problem).
function isNetworkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /failed to fetch|networkerror|load failed/i.test(msg);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function friendlyError(err: unknown): string {
  if (isNetworkError(err)) {
    return 'Network connection issue — check your signal and tap Submit again. Your entries are still here.';
  }
  return err instanceof Error ? err.message : 'Could not save the spillage.';
}

async function withRetry<T>(fn: () => Promise<{ data: T; error: unknown }>): Promise<{ data: T; error: unknown }> {
  let result: { data: T; error: unknown };
  for (let attempt = 1; attempt <= UPLOAD_ATTEMPTS; attempt++) {
    result = await fn();
    if (!result.error || !isNetworkError(result.error) || attempt === UPLOAD_ATTEMPTS) return result;
    await sleep(RETRY_DELAY_MS * attempt);
  }
  return result!;
}

export default function SpillageFormModal({ onClose, onSaved }: Props) {
  const { profile } = useUser();
  const { addToast } = useToast();

  // Date & time are locked to when the report is opened — the reporter can't
  // change them. Captured in LOCAL time (not UTC) so the date is correct in SAST.
  const [now] = useState(() => new Date());
  const pad = (n: number) => String(n).padStart(2, '0');
  const localDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const localTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const [party, setParty] = useState('');
  const [type, setType] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

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
      setError('Choose the client, the type of spill, and attach a photo.');
      return;
    }
    setSaving(true);
    setError('');
    setStatus('Uploading photo…');

    // 1. Upload the photo first so a failure never leaves a record without one.
    //    A weak signal on-site can drop this mid-transfer, so a network blip
    //    gets a couple of quick retries before we bother the user.
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const year = new Date().getFullYear();
    const path = `${year}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await withRetry(() =>
      // upsert: true makes a retry idempotent — if the first attempt actually
      // landed but the confirmation was lost to the same network blip, a
      // retry overwrites the identical bytes instead of failing as a conflict.
      supabase.storage.from(SPILLAGE_PHOTO_BUCKET).upload(path, file, { contentType: file.type || 'image/jpeg', upsert: true })
    );
    if (upErr) {
      setError(friendlyError(upErr));
      setSaving(false);
      setStatus('');
      return;
    }

    // 2. Insert the record. If it fails, remove the orphaned upload.
    setStatus('Saving record…');
    try {
      const spillage_number = await generateSequentialNumber('spillages', 'spillage_number', 'SPL');
      const { error: dbErr } = await withRetry(async () =>
        supabase.from('spillages').insert([{
          spillage_number,
          spillage_date: localDate,
          spillage_time: localTime,
          party,
          spillage_type: type,
          location: location.trim(),
          description: description.trim(),
          photo_path: path,
          reported_by: profile?.display_name ?? '',
          reported_by_id: profile?.employee_id ?? null,
        }])
      );
      if (dbErr) throw dbErr;
      addToast('Spillage reported');
      onSaved();
    } catch (err) {
      await supabase.storage.from(SPILLAGE_PHOTO_BUCKET).remove([path]);
      setError(friendlyError(err));
      setSaving(false);
      setStatus('');
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
            {saving ? (status || 'Saving…') : 'Submit'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Photo — the headline action, big and obvious on mobile.
            Two inputs: the camera (capture) and the gallery/file picker (no capture). */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Photo *</label>
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
              <img src={previewUrl} alt="Spillage" className="w-full max-h-64 object-cover rounded-xl border border-gray-200" />
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
                className="border-2 border-dashed border-amber-300 bg-amber-50 rounded-xl px-3 py-6 text-center hover:bg-amber-100 transition-colors"
              >
                <Camera size={28} className="mx-auto text-amber-500 mb-1.5" />
                <p className="text-sm font-semibold text-amber-700">Take photo</p>
              </button>
              <button
                onClick={() => libraryRef.current?.click()}
                className="border-2 border-dashed border-amber-300 bg-amber-50 rounded-xl px-3 py-6 text-center hover:bg-amber-100 transition-colors"
              >
                <ImagePlus size={28} className="mx-auto text-amber-500 mb-1.5" />
                <p className="text-sm font-semibold text-amber-700">Upload from library</p>
              </button>
              <p className="col-span-2 text-xs text-amber-600/80 text-center">A picture is required</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
          <select value={party} onChange={e => setParty(e.target.value)} className={inputClass}>
            <option value="">Select client…</option>
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date &amp; time</label>
          <div className={`${inputClass} bg-gray-50 text-gray-700 flex items-center`}>
            {now.toLocaleDateString()} · {localTime}
          </div>
          <p className="text-xs text-gray-400 mt-1">Recorded as now.</p>
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
