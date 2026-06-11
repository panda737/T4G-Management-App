import { useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase, StockOrder, StockOrderItem } from '../../lib/supabase';
import { useUser } from '../../lib/UserContext';
import Modal from '../../components/Modal';

interface LineState {
  orderItemId: string;
  qtyDelivered: number;
  varianceNote: string;
}

interface Props {
  order: StockOrder;
  items: StockOrderItem[];
  onClose: () => void;
  onSave: () => void;
}

export default function ConfirmDeliveryModal({ order, items, onClose, onSave }: Props) {
  const { profile } = useUser();
  const sorted = [...items].sort((a, b) => a.line_no - b.line_no);
  const [lines, setLines] = useState<LineState[]>(
    sorted.map(i => ({ orderItemId: i.id, qtyDelivered: i.qty_ordered, varianceNote: '' }))
  );
  const [confirmNote, setConfirmNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updateLine(orderItemId: string, patch: Partial<LineState>) {
    setLines(prev => prev.map(l => l.orderItemId === orderItemId ? { ...l, ...patch } : l));
  }

  const varianceCount = lines.filter((l, idx) => l.qtyDelivered !== sorted[idx].qty_ordered).length;
  const missingNotes = lines.filter((l, idx) => l.qtyDelivered !== sorted[idx].qty_ordered && !l.varianceNote.trim()).length;
  const allZero = lines.every(l => l.qtyDelivered === 0);

  async function handleConfirm() {
    setError('');
    if (missingNotes > 0) { setError('Every line with a changed quantity needs a variance note.'); return; }
    if (allZero) { setError('All quantities are zero — if nothing was delivered, cancel the order instead.'); return; }

    setSaving(true);
    const { error: rpcErr } = await supabase.rpc('confirm_stock_order', {
      p_order_id: order.id,
      p_lines: lines.map(l => ({
        order_item_id: l.orderItemId,
        qty_delivered: l.qtyDelivered,
        variance_note: l.varianceNote.trim(),
      })),
      p_confirm_note: confirmNote.trim(),
      p_captured_by: profile?.display_name || '',
    });

    if (rpcErr) { setError(rpcErr.message); setSaving(false); return; }
    setSaving(false);
    onSave();
  }

  return (
    <Modal
      title={`Confirm Delivery — ${order.order_number}`}
      onClose={onClose}
      size="lg"
      accent="green"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={saving || missingNotes > 0 || allZero}
            className="flex items-center gap-2 px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 font-semibold shadow-sm"
          >
            <CheckCircle2 size={15} />
            {saving ? 'Confirming...' : 'Confirm & Move Stock'}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600 mb-3">
        Check the delivered quantities against the signed delivery note for{' '}
        <strong>{order.client_name}</strong>. Confirming will deduct these quantities from stock — this cannot be undone from here.
      </p>

      {varianceCount > 0 && (
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
          <AlertTriangle size={13} className="flex-shrink-0" />
          {varianceCount} of {lines.length} line{lines.length !== 1 ? 's' : ''} differ{varianceCount === 1 ? 's' : ''} from the order — a variance note is required for each.
        </div>
      )}

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-800 text-white text-xs uppercase tracking-wider">
              <th className="text-left px-3 py-2 font-medium">Item</th>
              <th className="text-center px-2 py-2 font-medium w-20">Ordered</th>
              <th className="text-center px-2 py-2 font-medium w-24">Delivered</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((item, idx) => {
              const line = lines[idx];
              const hasVariance = line.qtyDelivered !== item.qty_ordered;
              const needsNote = hasVariance && !line.varianceNote.trim();
              return (
                <tr key={item.id} className={hasVariance ? 'bg-amber-50/50' : ''}>
                  <td className="px-3 py-2 align-top">
                    <p className="font-medium text-gray-900">{item.stock_item}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{item.stock_code || '(no code)'}{item.unit_of_measure ? ` · ${item.unit_of_measure}` : ''}</p>
                    {hasVariance && (
                      <input
                        value={line.varianceNote}
                        onChange={e => updateLine(item.id, { varianceNote: e.target.value })}
                        placeholder="Why does the quantity differ? (required)"
                        className={`mt-1.5 w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 bg-white ${needsNote ? 'border-amber-400 focus:ring-amber-400' : 'border-gray-200 focus:ring-emerald-500'}`}
                      />
                    )}
                  </td>
                  <td className="px-2 py-2 text-center font-semibold text-gray-500 align-top">{item.qty_ordered}</td>
                  <td className="px-2 py-2 text-center align-top">
                    <input
                      type="number"
                      min="0"
                      value={line.qtyDelivered}
                      onChange={e => updateLine(item.id, { qtyDelivered: Math.max(0, Number(e.target.value) || 0) })}
                      className={`w-20 text-center border rounded-lg px-2 py-1.5 text-sm font-bold focus:outline-none focus:ring-2 bg-white ${hasVariance ? 'border-amber-400 text-amber-700 focus:ring-amber-400' : 'border-gray-200 text-gray-900 focus:ring-emerald-500'}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">Confirmation note (optional)</label>
        <textarea
          value={confirmNote}
          onChange={e => setConfirmNote(e.target.value)}
          rows={2}
          placeholder="Any overall remarks about this delivery..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-700 mt-3 bg-red-50 px-3 py-2 rounded-lg border border-red-200 font-medium">{error}</p>}
    </Modal>
  );
}
