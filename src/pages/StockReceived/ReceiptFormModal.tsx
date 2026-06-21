import { useRef, useState } from 'react';
import { Plus, Trash2, ArrowDownCircle, Upload, FileText, X } from 'lucide-react';
import { supabase, StockItem } from '../../lib/supabase';
import { generateSequentialNumber } from '../../lib/numberGenerator';
import { useUser } from '../../lib/UserContext';
import Modal from '../../components/Modal';
import StockItemSearch from '../../components/StockItemSearch';

interface ReceiptLine {
  id: number;
  itemId: string;
  quantity: number;
}

const ACCEPTED_NOTE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_NOTE_BYTES = 20 * 1024 * 1024;

interface Props {
  items: StockItem[];
  suppliers: { id: string; supplier_name: string }[];
  onClose: () => void;
  onSave: () => void;
}

export default function ReceiptFormModal({ items, suppliers, onClose, onSave }: Props) {
  const { profile } = useUser();
  const [lines, setLines] = useState<ReceiptLine[]>([{ id: 1, itemId: '', quantity: 1 }]);
  const [supplierId, setSupplierId] = useState('');
  const [supplierRef, setSupplierRef] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
  // Captured By is always the logged-in user — recorded, not editable.
  const capturedBy = profile?.display_name || '';
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState<File | null>(null);
  const [noteError, setNoteError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function updateLine(id: number, patch: Partial<ReceiptLine>) {
    setLines(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
  }

  function removeLine(id: number) {
    setLines(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev);
  }

  function addLine() {
    const newId = lines.reduce((max, l) => Math.max(max, l.id), 0) + 1;
    setLines(prev => [...prev, { id: newId, itemId: '', quantity: 1 }]);
  }

  function pickNote(f: File | null) {
    setNoteError('');
    if (!f) return;
    if (!ACCEPTED_NOTE_TYPES.includes(f.type)) { setNoteError('Only PDF, JPG, PNG or WEBP files are allowed.'); return; }
    if (f.size > MAX_NOTE_BYTES) { setNoteError('File is too large — maximum 20 MB.'); return; }
    setDeliveryNote(f);
  }

  // Uploads the supplier delivery note to the private delivery-notes bucket and
  // links it to the receipt. Returns an error message, or null on success.
  async function uploadDeliveryNote(receiptId: string, file: File): Promise<string | null> {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const path = `receipts/${receiptId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('delivery-notes')
      .upload(path, file, { contentType: file.type });
    if (upErr) return upErr.message;
    const { data: userData } = await supabase.auth.getUser();
    const { error: dbErr } = await supabase.from('stock_receipts').update({
      delivery_note_path: path,
      delivery_note_name: file.name,
      delivery_note_size_bytes: file.size,
      delivery_note_uploaded_by: userData.user?.id ?? null,
      delivery_note_uploaded_at: new Date().toISOString(),
    }).eq('id', receiptId);
    if (dbErr) { await supabase.storage.from('delivery-notes').remove([path]); return dbErr.message; }
    return null;
  }

  function buildPayload(receiptNumber: string) {
    const validLines = lines.filter(l => l.itemId);
    const p_lines = validLines.map(line => {
      const stockItem = items.find(i => i.id === line.itemId)!;
      return {
        stock_item_id: line.itemId,
        stock_code: stockItem.stock_code || '',
        stock_item: stockItem.stock_item,
        description: stockItem.description || '',
        unit_of_measure: stockItem.unit_of_measure || '',
        qty_received: line.quantity,
      };
    });
    const selectedSupplier = suppliers.find(s => s.id === supplierId);
    return {
      p_receipt_number: receiptNumber,
      p_supplier: selectedSupplier?.supplier_name ?? '',
      p_supplier_ref: supplierRef,
      p_received_date: receivedDate,
      p_notes: notes,
      p_lines,
      p_captured_by: capturedBy,
      p_supplier_id: supplierId || null,
    };
  }

  async function handleSave() {
    setError('');
    setAttempted(true);
    const validLines = lines.filter(l => l.itemId);
    if (validLines.length === 0) { setError('Select at least one item to receive — the highlighted line is required.'); return; }
    for (const line of validLines) {
      if (line.quantity <= 0) { setError('All quantities must be greater than 0.'); return; }
    }

    setSaving(true);

    let receiptNumber = await generateSequentialNumber('stock_receipts', 'receipt_number', 'GRN');
    let { data, error: rpcErr } = await supabase.rpc('record_stock_receipt', buildPayload(receiptNumber));
    if (rpcErr && (rpcErr.code === '23505' || /duplicate key/i.test(rpcErr.message))) {
      // Number collision (concurrent insert) — regenerate once and retry.
      receiptNumber = await generateSequentialNumber('stock_receipts', 'receipt_number', 'GRN');
      ({ data, error: rpcErr } = await supabase.rpc('record_stock_receipt', buildPayload(receiptNumber)));
    }

    if (rpcErr) { setError(rpcErr.message); setSaving(false); return; }

    // Attach the supplier delivery note (if one was picked) to the new receipt.
    const receiptId = (data as { receipt_id?: string } | null)?.receipt_id;
    if (deliveryNote && receiptId) {
      const upMsg = await uploadDeliveryNote(receiptId, deliveryNote);
      if (upMsg) {
        setError(`Stock received, but the delivery note didn't upload (${upMsg}). You can re-upload it from the receipt.`);
        setSaving(false);
        onSave();
        return;
      }
    }

    setSaving(false);
    onSave();
  }

  const inputBase = 'w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white';
  const validLineCount = lines.filter(l => l.itemId).length;

  return (
    <Modal title="Receive Stock" onClose={onClose} size="xl" accent="green">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3 bg-emerald-100 text-emerald-700">
        <ArrowDownCircle size={12} />
        Recording stock received into store — posts a Stock Received movement and increases on-hand.
      </div>

      {/* Receipt header */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Supplier</label>
          <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className={inputBase}>
            <option value="">— Select supplier —</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Supplier Ref / Delivery Note No.</label>
          <input value={supplierRef} onChange={e => setSupplierRef(e.target.value)} className={inputBase} placeholder="e.g. INV-12345" />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Received Date</label>
          <input type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)} className={inputBase} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Captured By</label>
          <input
            value={capturedBy}
            readOnly
            disabled
            title="Recorded as the logged-in user"
            className={`${inputBase} bg-gray-100 text-gray-600 cursor-not-allowed`}
            placeholder="—"
          />
        </div>
      </div>

      {/* Supplier delivery note upload */}
      <div className="mb-3">
        <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Supplier Delivery Note</label>
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={e => pickNote(e.target.files?.[0] ?? null)} />
        {deliveryNote ? (
          <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 rounded-lg px-3 py-2 text-sm">
            <FileText size={16} className="text-emerald-600 flex-shrink-0" />
            <span className="min-w-0 flex-1 truncate text-gray-800">{deliveryNote.name}</span>
            <span className="text-xs text-gray-500 flex-shrink-0">{(deliveryNote.size / 1024 / 1024).toFixed(2)} MB</span>
            <button type="button" onClick={() => setDeliveryNote(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0" title="Remove file"><X size={15} /></button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-500 hover:border-emerald-300 hover:bg-gray-50 transition-colors">
            <Upload size={15} /> Upload delivery note <span className="text-gray-400">· PDF/JPG/PNG · max 20 MB</span>
          </button>
        )}
        {noteError && <p className="text-xs text-red-600 mt-1">{noteError}</p>}
      </div>

      {/* Line items */}
      <div className="rounded-xl border-2 border-emerald-200">
        <div className="px-4 py-2 flex items-center gap-2 bg-emerald-600">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex-1">Items Received</span>
          <span className="text-xs text-white/70">Qty</span>
          <span className="w-7" />
        </div>

        <div className="divide-y divide-gray-100 bg-white">
          {lines.map((line, idx) => {
            const stockItem = items.find(i => i.id === line.itemId);
            const otherIds = lines.filter(l => l.id !== line.id && l.itemId).map(l => l.itemId);

            return (
              <div key={line.id} className="px-3 py-1.5">
                <div className="flex gap-2 items-center">
                  <span className="text-xs font-bold w-5 text-center flex-shrink-0 text-emerald-600">{idx + 1}</span>

                  <div className="flex-1">
                    <StockItemSearch
                      items={items}
                      value={line.itemId}
                      excludeIds={otherIds}
                      accent="emerald"
                      invalid={attempted && !line.itemId}
                      onSelect={item => updateLine(line.id, { itemId: item.id })}
                      onClear={() => updateLine(line.id, { itemId: '' })}
                    />
                  </div>

                  {stockItem && (
                    <div className="text-center flex-shrink-0 w-16">
                      <p className="text-[10px] text-gray-400 leading-tight">on hand</p>
                      <p className="text-sm font-bold text-gray-700 leading-tight">{stockItem.current_quantity}</p>
                    </div>
                  )}

                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white flex-shrink-0">
                    <button type="button" onClick={() => updateLine(line.id, { quantity: Math.max(1, line.quantity - 1) })} className="px-2 py-1.5 text-gray-500 hover:bg-gray-100 font-bold transition-colors text-base leading-none">−</button>
                    <input
                      type="number" min="1"
                      value={line.quantity}
                      onChange={e => updateLine(line.id, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                      className="w-14 text-center text-sm font-bold text-gray-900 focus:outline-none bg-white py-1.5"
                    />
                    <button type="button" onClick={() => updateLine(line.id, { quantity: line.quantity + 1 })} className="px-2 py-1.5 text-gray-500 hover:bg-gray-100 font-bold transition-colors text-base leading-none">+</button>
                  </div>

                  <button
                    onClick={() => removeLine(line.id)}
                    disabled={lines.length === 1}
                    className="p-1 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-20"
                    title="Remove line"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-3 py-2 border-t border-emerald-100 bg-emerald-50/50">
          <button
            onClick={addLine}
            className="flex items-center gap-1.5 text-xs font-semibold transition-colors text-emerald-700 hover:text-emerald-800"
          >
            <Plus size={13} /> Add another item
          </button>
        </div>
      </div>

      <div className="mt-3">
        <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Notes</label>
        <input value={notes} onChange={e => setNotes(e.target.value)} className={inputBase} placeholder="Optional notes" />
      </div>

      {error && (
        <div className="mt-3 text-sm text-red-700 bg-red-50 px-4 py-3 rounded-lg border border-red-200 font-medium">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3 mt-3 pt-3 border-t border-gray-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 text-sm text-white rounded-lg disabled:opacity-50 font-semibold shadow-sm transition-colors bg-emerald-600 hover:bg-emerald-700"
        >
          {saving ? 'Saving...' : `Receive Stock (${validLineCount} item${validLineCount !== 1 ? 's' : ''})`}
        </button>
      </div>
    </Modal>
  );
}
