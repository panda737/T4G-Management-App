import { useEffect, useState } from 'react';
import { Trash2, ImageOff } from 'lucide-react';
import { supabase, Spillage } from '../../lib/supabase';
import Modal from '../../components/Modal';
import { SPILLAGE_PHOTO_BUCKET } from './constants';

interface Props {
  spillage: Spillage;
  canManage: boolean;
  onDelete: () => void;
  onClose: () => void;
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-900 mt-0.5 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

export default function SpillageViewModal({ spillage, canManage, onDelete, onClose }: Props) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!spillage.photo_path) { setPhotoError(true); return; }
      const { data } = await supabase.storage
        .from(SPILLAGE_PHOTO_BUCKET)
        .createSignedUrl(spillage.photo_path, 3600);
      if (!active) return;
      if (data?.signedUrl) setPhotoUrl(data.signedUrl);
      else setPhotoError(true);
    }
    load();
    return () => { active = false; };
  }, [spillage.photo_path]);

  const dateLabel = new Date(spillage.spillage_date).toLocaleDateString();
  const when = spillage.spillage_time ? `${dateLabel} · ${spillage.spillage_time.slice(0, 5)}` : dateLabel;

  return (
    <Modal
      title={spillage.spillage_number}
      onClose={onClose}
      size="md"
      accent="amber"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm">Close</button>
          {canManage && (
            <button
              onClick={onDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium flex items-center gap-1.5"
            >
              <Trash2 size={15} /> Delete
            </button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {photoUrl ? (
          <img src={photoUrl} alt="Spillage" className="w-full max-h-72 object-contain rounded-xl border border-gray-200 bg-gray-50" onError={() => setPhotoError(true)} />
        ) : photoError ? (
          <div className="w-full py-10 rounded-xl border border-gray-200 bg-gray-50 text-center text-gray-400">
            <ImageOff size={28} className="mx-auto mb-1" />
            <p className="text-xs">No photo available</p>
          </div>
        ) : (
          <div className="w-full py-10 rounded-xl border border-gray-200 bg-gray-50 text-center text-gray-400 text-xs">Loading photo…</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Team" value={spillage.party} />
          <Field label="Type" value={spillage.spillage_type} />
          <Field label="When" value={when} />
          <Field label="Location" value={spillage.location} />
          <Field label="Reported by" value={spillage.reported_by} />
        </div>
        <Field label="Notes" value={spillage.description} />
      </div>
    </Modal>
  );
}
