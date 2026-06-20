import { useState } from 'react';
import { supabase, type StockItem, type SupplierItem } from '../../lib/supabase';
import Modal from '../../components/Modal';
import StockItemSearch from '../../components/StockItemSearch';

interface Props {
  supplierId: string;
  /** Present when editing an existing link (the stock item is then fixed). */
  item?: SupplierItem | null;
  /** Full stock catalogue, for the picker and to label a locked item. */
  stockItems: StockItem[];
  /** stock_item_ids already linked to this supplier (hidden from the picker). */
  excludeIds: string[];
  onClose: () => void;
  onSave: (saved: SupplierItem) => void;
}

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white';

export default function SupplierItemModal({ supplierId, item, stockItems, excludeIds, onClose, onSave }: Props) {
  const editing = !!item;
  const [stockItemId, setStockItemId] = useState(item?.stock_item_id ?? '');
  const [unitPrice, setUnitPrice] = useState(item ? String(item.unit_price) : '');
  const [supplierSku, setSupplierSku] = useState(item?.supplier_sku ?? '');
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const lockedItem = editing ? stockItems.find(i => i.id === item!.stock_item_id) : undefined;
  const priceNum = Number(unitPrice);
  const priceValid = unitPrice.trim() === '' || (!Number.isNaN(priceNum) && priceNum >= 0);
  const canSave = !!stockItemId && priceValid;

  async function handleSave() {
    if (!stockItemId) { setError('Select a stock item.'); return; }
    if (!priceValid) { setError('Unit price must be zero or greater.'); return; }
    setSaving(true);
    setError('');

    const values = {
      unit_price: unitPrice.trim() === '' ? 0 : priceNum,
      supplier_sku: supplierSku,
      notes,
    };

    const { data, error: err } = editing
      ? await supabase.from('supplier_items').update(values).eq('id', item!.id).select().single()
      : await supabase.from('supplier_items').insert({ supplier_id: supplierId, stock_item_id: stockItemId, ...values }).select().single();

    setSaving(false);
    if (err) {
      setError(err.code === '23505' ? 'This item is already linked to the supplier.' : err.message);
      return;
    }
    onSave(data as SupplierItem);
  }

  return (
    <Modal
      title={editing ? 'Edit Item' : 'Add Item'}
      onClose={onClose}
      size="md"
      accent="indigo"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !canSave}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 font-medium shadow-sm"
          >
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Item'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Stock Item</label>
          {editing ? (
            <div className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm">
              <div className="font-medium text-gray-900">{lockedItem?.stock_item ?? '(item)'}</div>
              <div className="text-[11px] text-gray-500 font-mono">{lockedItem?.stock_code || '(no code)'}</div>
            </div>
          ) : (
            <StockItemSearch
              items={stockItems}
              value={stockItemId}
              excludeIds={excludeIds}
              accent="blue"
              onSelect={i => setStockItemId(i.id)}
              onClear={() => setStockItemId('')}
            />
          )}
          {!editing && (
            <p className="text-[11px] text-gray-400 mt-1">
              New stock items are created in the Stock master list, not here.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Unit Price</label>
            <input
              type="number" min="0" step="0.01"
              value={unitPrice}
              onChange={e => setUnitPrice(e.target.value)}
              className={inputCls}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Supplier SKU</label>
            <input value={supplierSku} onChange={e => setSupplierSku(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      </div>
    </Modal>
  );
}
