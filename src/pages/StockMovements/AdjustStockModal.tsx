import { useState } from 'react';
import { supabase, StockItem, MovementType, getQuantityDelta } from '../../lib/supabase';
import Modal from '../../components/Modal';
import { ADJUST_TYPES, INCREASE_TYPES, DECREASE_TYPES, EITHER_TYPES } from './constants';

interface Props {
  items: StockItem[];
  onClose: () => void;
  onSave: () => void;
}

// Admin-only manual stock adjustment (damages, returns, write-offs, internal
// issues, transfers). Stock received goes through Stock Received; customer
// deliveries through Orders & Deliveries; stock-take corrections through Stock Take.
export default function AdjustStockModal({ items, onClose, onSave }: Props) {
  const [selectedItemId, setSelectedItemId] = useState('');
  const [movementType, setMovementType] = useState<MovementType>('Stock Adjusted');
  const [quantity, setQuantity] = useState(0);
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [reference, setReference] = useState('');
  const [supplierClient, setSupplierClient] = useState('');
  const [capturedBy, setCapturedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEither = EITHER_TYPES.includes(movementType);
  const selectedItem = items.find(i => i.id === selectedItemId);

  async function handleSave() {
    if (!selectedItemId || quantity <= 0) { setError('Please select an item and enter a valid quantity.'); return; }
    setSaving(true);
    setError('');

    let delta = getQuantityDelta(movementType, quantity);
    if (isEither) delta = direction === 'in' ? Math.abs(quantity) : -Math.abs(quantity);
    const storedQuantity = isEither ? delta : quantity;

    const { error: rpcErr } = await supabase.rpc('record_stock_movement_group', {
      p_movements: [{
        stock_item_id: selectedItemId,
        stock_code: selectedItem?.stock_code || '',
        stock_item: selectedItem?.stock_item || '',
        movement_type: movementType,
        quantity: storedQuantity,
        delta,
      }],
      p_movement_date: new Date().toISOString(),
      p_reference_number: reference,
      p_supplier_client_dept: supplierClient,
      p_captured_by: capturedBy,
      p_group_notes: notes,
    });

    if (rpcErr) {
      setError(rpcErr.message.includes('Insufficient stock')
        ? rpcErr.message.replace(/^.*?(Insufficient)/, '$1')
        : rpcErr.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    onSave();
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white';

  return (
    <Modal title="Adjust Stock" onClose={onClose} size="lg" accent="green" footer={
      <>
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
        <button onClick={handleSave} disabled={saving || !selectedItemId || quantity <= 0} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 font-medium shadow-sm">
          {saving ? 'Saving...' : 'Save Adjustment'}
        </button>
      </>
    }>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3 bg-amber-100 text-amber-700">
        Admin adjustment — receipts use Stock Received, deliveries use Orders &amp; Deliveries.
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Stock Item *</label>
          <select value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)} className={inputCls}>
            <option value="">Select stock item...</option>
            {items.map(item => (
              <option key={item.id} value={item.id}>
                {item.stock_code ? `[${item.stock_code}] ` : ''}{item.stock_item} — {item.description}
              </option>
            ))}
          </select>
          {selectedItem && <p className="text-xs text-gray-500 mt-1">Current quantity: <strong>{selectedItem.current_quantity}</strong></p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Adjustment Type *</label>
          <select value={movementType} onChange={e => setMovementType(e.target.value as MovementType)} className={inputCls}>
            {ADJUST_TYPES.map(t => <option key={t} value={t}>{t === 'Stock Issued' ? 'Stock Issued (Internal)' : t}</option>)}
          </select>
          {movementType === 'Stock Issued' && (
            <p className="text-xs text-gray-400 mt-1">For internal issues only — customer deliveries go through Orders &amp; Deliveries.</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Quantity * {INCREASE_TYPES.includes(movementType) ? '(will add)' : DECREASE_TYPES.includes(movementType) ? '(will subtract)' : ''}
          </label>
          <div className="flex gap-2">
            {isEither && (
              <select value={direction} onChange={e => setDirection(e.target.value as 'in' | 'out')} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white w-20">
                <option value="in">+ In</option>
                <option value="out">- Out</option>
              </select>
            )}
            <input type="number" min="0" step="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
          <div className={`${inputCls} bg-gray-50 text-gray-600`}>
            {new Date().toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
            <span className="ml-2 text-[11px] text-gray-400">· recorded now</span>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Reference Number</label>
          <input value={reference} onChange={e => setReference(e.target.value)} className={inputCls} placeholder="e.g. ADJ-001" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Supplier / Client / Department</label>
          <input value={supplierClient} onChange={e => setSupplierClient(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Captured By</label>
          <input value={capturedBy} onChange={e => setCapturedBy(e.target.value)} className={inputCls} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
        </div>
      </div>
      {error && <p className="text-sm text-red-600 mt-3 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
    </Modal>
  );
}
