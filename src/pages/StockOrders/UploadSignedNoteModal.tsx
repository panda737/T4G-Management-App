import { useRef, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { supabase, StockOrder } from '../../lib/supabase';
import Modal from '../../components/Modal';

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 20 * 1024 * 1024;

interface Props {
  order: StockOrder;
  onClose: () => void;
  onSave: () => void;
}

export default function UploadSignedNoteModal({ order, onClose, onSave }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const isReplace = !!order.signed_note_path;

  function pickFile(f: File | null) {
    setError('');
    if (!f) return;
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError('Only PDF, JPG, PNG or WEBP files are allowed.');
      return;
    }
    if (f.size > MAX_BYTES) {
      setError('File is too large — maximum 20 MB.');
      return;
    }
    setFile(f);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError('');

    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const year = new Date().getFullYear();
    const path = `${year}/${order.order_number}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('delivery-notes')
      .upload(path, file, { contentType: file.type });

    if (upErr) { setError(upErr.message); setUploading(false); return; }

    const { data: userData } = await supabase.auth.getUser();
    const { error: dbErr } = await supabase
      .from('stock_orders')
      .update({
        signed_note_path: path,
        signed_note_name: file.name,
        signed_note_size_bytes: file.size,
        signed_note_uploaded_by: userData.user?.id ?? null,
        signed_note_uploaded_at: new Date().toISOString(),
        status: 'Awaiting Confirmation',
      })
      .eq('id', order.id)
      .in('status', ['Dispatched', 'Awaiting Confirmation']);

    if (dbErr) {
      // remove the orphaned upload so the bucket stays clean
      await supabase.storage.from('delivery-notes').remove([path]);
      setError(dbErr.message);
      setUploading(false);
      return;
    }

    setUploading(false);
    onSave();
  }

  return (
    <Modal
      title={isReplace ? 'Replace Signed Delivery Note' : 'Upload Signed Delivery Note'}
      onClose={onClose}
      size="md"
      accent="indigo"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 font-medium shadow-sm"
          >
            {uploading ? 'Uploading...' : 'Upload & Submit for Confirmation'}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600 mb-3">
        Upload the customer-signed copy of <strong className="font-mono">{order.order_number}</strong>.
        Once uploaded, the order moves to <strong>Awaiting Confirmation</strong> for review.
      </p>

      {isReplace && (
        <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          A signed note is already on file ({order.signed_note_name || 'uploaded file'}). Uploading a new file will replace it for confirmation purposes.
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={e => pickFile(e.target.files?.[0] ?? null)}
      />

      {file ? (
        <div className="flex items-center gap-3 border-2 border-indigo-200 bg-indigo-50 rounded-xl px-4 py-3">
          <FileText size={20} className="text-indigo-600 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
            <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <button onClick={() => setFile(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0" title="Remove file">
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0] ?? null); }}
          className={`border-2 border-dashed rounded-xl px-4 py-10 text-center cursor-pointer transition-colors ${dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-300 hover:bg-gray-50'}`}
        >
          <Upload size={28} className="mx-auto text-gray-400 mb-2" />
          <p className="text-sm font-medium text-gray-700">Click to choose a file or drag it here</p>
          <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG or WEBP · max 20 MB</p>
        </div>
      )}

      {error && <p className="text-sm text-red-600 mt-3 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
    </Modal>
  );
}
