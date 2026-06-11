import { useState } from 'react';
import { supabase, StockOrder } from '../../lib/supabase';
import Modal from '../../components/Modal';

interface Props {
  order: StockOrder;
  onClose: () => void;
  onSave: () => void;
}

export default function CancelOrderModal({ order, onClose, onSave }: Props) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleCancel() {
    if (!reason.trim()) { setError('A cancellation reason is required.'); return; }
    setSaving(true);
    setError('');

    const { error: err } = await supabase
      .from('stock_orders')
      .update({ status: 'Cancelled', cancelled_reason: reason.trim() })
      .eq('id', order.id)
      .not('status', 'in', '("Completed","Cancelled")');

    if (err) { setError(err.message); setSaving(false); return; }
    setSaving(false);
    onSave();
  }

  return (
    <Modal
      title={`Cancel Order ${order.order_number}`}
      onClose={onClose}
      size="md"
      accent="red"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Keep Order</button>
          <button
            onClick={handleCancel}
            disabled={saving || !reason.trim()}
            className="px-5 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 font-semibold shadow-sm"
          >
            {saving ? 'Cancelling...' : 'Cancel Order'}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600 mb-3">
        This cancels the order for <strong>{order.client_name}</strong>. No stock has moved, and nothing will move.
        Cancelled orders stay on record but can no longer be edited, dispatched or confirmed.
      </p>
      <label className="block text-xs font-medium text-gray-700 mb-1">Reason for cancellation *</label>
      <textarea
        value={reason}
        onChange={e => setReason(e.target.value)}
        rows={3}
        placeholder="e.g. Customer cancelled the order / loaded in error"
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white resize-none"
        autoFocus
      />
      {error && <p className="text-sm text-red-600 mt-3 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
    </Modal>
  );
}
