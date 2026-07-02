import { useEffect, useRef, useState } from 'react';
import { Loader, Camera, ImagePlus, X } from 'lucide-react';
import Modal from '../../components/Modal';
import { supabase, type TreatmentChemicalBookout } from '../../lib/supabase';
import { CHEM_PHOTO_BUCKET, CHEM_PHOTO_MAX_BYTES, CHEM_PHOTO_ACCEPTED } from './constants';
import { localToday } from '../../lib/formatters';

const fmtL = (n: number) => n.toLocaleString('en-ZA', { maximumFractionDigits: 0 });

interface Props {
  existing: TreatmentChemicalBookout | null;
  uom: string;
  litresPerUnit: number;
  bookedOutByName: string;
  onClose: () => void;
  onSubmit: (values: { bookout_date: string; notes: string; file: File | null }) => Promise<void>;
}

export default function BookOutModal({ existing, uom, litresPerUnit, bookedOutByName, onClose, onSubmit }: Props) {
  const isEdit = !!existing;
  const [date, setDate] = useState(existing?.bookout_date?.substring(0, 10) ?? localToday());
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!existing?.photo_path) return;
    let active = true;
    supabase.storage.from(CHEM_PHOTO_BUCKET).createSignedUrl(existing.photo_path, 120)
      .then(({ data }) => { if (active && data) setExistingPhotoUrl(data.signedUrl); });
    return () => { active = false; };
  }, [existing?.photo_path]);

  function pickFile(f: File | null) {
    setError('');
    if (!f) return;
    if (!CHEM_PHOTO_ACCEPTED.includes(f.type) && !f.type.startsWith('image/')) {
      setError('Please attach a photo (JPG, PNG, WEBP or HEIC).');
      return;
    }
    if (f.size > CHEM_PHOTO_MAX_BYTES) { setError('Photo is too large — maximum 15 MB.'); return; }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  function clearFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
  }

  const litres = litresPerUnit; // exactly one IBC per book-out
  const photoOk = isEdit ? (!!file || !!existing?.photo_path) : !!file;
  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500';

  async function save() {
    setError('');
    if (!date) { setError('Pick a date.'); return; }
    if (!photoOk) { setError('A photo of the batch is required.'); return; }
    setSaving(true);
    try {
      await onSubmit({ bookout_date: date, notes, file });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save book-out.');
      setSaving(false);
    }
  }

  const shownPhoto = previewUrl ?? (file ? null : existingPhotoUrl);

  return (
    <Modal
      title={isEdit ? 'Edit book-out' : 'Book out chemical'}
      onClose={onClose}
      size="md"
      accent="cyan"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={save} disabled={saving || !photoOk} className="px-4 py-2 text-sm bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition font-medium disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader size={14} className="animate-spin" />} {isEdit ? 'Save changes' : `Book out 1 ${uom}`}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Batch photo — camera or library, required each time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Photo of the batch *</label>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => pickFile(e.target.files?.[0] ?? null)} />
          <input ref={libraryRef} type="file" accept="image/*" className="hidden" onChange={e => pickFile(e.target.files?.[0] ?? null)} />
          {shownPhoto ? (
            <div className="relative">
              <img src={shownPhoto} alt="Batch" className="w-full max-h-56 object-cover rounded-xl border border-gray-200" />
              {previewUrl && (
                <button onClick={clearFile} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80" title="Remove photo"><X size={16} /></button>
              )}
              <div className="absolute bottom-2 right-2 flex gap-1.5">
                <button onClick={() => cameraRef.current?.click()} className="bg-white/90 text-gray-700 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 hover:bg-white"><Camera size={14} /> Retake</button>
                <button onClick={() => libraryRef.current?.click()} className="bg-white/90 text-gray-700 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 hover:bg-white"><ImagePlus size={14} /> Replace</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => cameraRef.current?.click()} className="border-2 border-dashed border-cyan-300 bg-cyan-50 rounded-xl px-3 py-6 text-center hover:bg-cyan-100 transition-colors">
                <Camera size={28} className="mx-auto text-cyan-500 mb-1.5" />
                <p className="text-sm font-semibold text-cyan-700">Take photo</p>
              </button>
              <button onClick={() => libraryRef.current?.click()} className="border-2 border-dashed border-cyan-300 bg-cyan-50 rounded-xl px-3 py-6 text-center hover:bg-cyan-100 transition-colors">
                <ImagePlus size={28} className="mx-auto text-cyan-500 mb-1.5" />
                <p className="text-sm font-semibold text-cyan-700">Upload from library</p>
              </button>
              <p className="col-span-2 text-xs text-cyan-600/80 text-center">A picture of the batch is required</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <div className={`${inp} bg-gray-50 text-gray-700 flex items-center`}>1 {uom} · {fmtL(litres)} L</div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Booked out by</label>
          <div className={`${inp} bg-gray-50 text-gray-700 flex items-center`}>{bookedOutByName || 'Logged-in user'}</div>
          <p className="text-xs text-gray-400 mt-1">{isEdit ? 'Recorded when the book-out was created.' : 'Recorded as you.'}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inp} placeholder="Optional" />
        </div>

        <p className="text-xs text-gray-400">{isEdit ? 'Quantity stays at 1 — saving updates the details only.' : `This deducts 1 ${uom} from stock on hand.`}</p>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
      </div>
    </Modal>
  );
}
