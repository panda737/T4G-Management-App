import { useState } from 'react';
import { Plus, Search, Trash2, ArrowDownCircle } from 'lucide-react';
import { supabase, StockItem } from '../../lib/supabase';
import { generateSequentialNumber } from '../../lib/numberGenerator';
import Modal from '../../components/Modal';

interface ReceiptLine {
  id: number;
  itemId: string;
  search: string;
  showDropdown: boolean;
  quantity: number;
}

interface Props {
  items: StockItem[];
  onClose: () => void;
  onSave: () => void;
}

export default function ReceiptFormModal({ items, onClose, onSave }: Props) {
  const [lines, setLines] = useState<ReceiptLine[]>([{ id: 1, itemId: '', search: '', showDropdown: false, quantity: 1 }]);
  const [supplier, setSupplier] = useState('');
  const [supplierRef, setSupplierRef] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
  const [capturedBy, setCapturedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updateLine(id: number, patch: Partial<ReceiptLine>) {
    setLines(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
  }

  function removeLine(id: number) {
    setLines(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev);
  }

  function addLine() {
    const newId = lines.reduce((max, l) => Math.max(max, l.id), 0) + 1;
    setLines(prev => [...prev, { id: newId, itemId: '', search: '', showDropdown: false, quantity: 1 }]);
  }

  function displayName(item: StockItem) {
    return (item.description || item.stock_item).replace(/\s*\([^)]*\)\s*$/, '').trim();
  }

  function getFilteredItems(search: string, currentLineId: number) {
    const usedIds = lines.filter(l => l.id !== currentLineId && l.itemId).map(l => l.itemId);
    const tokens = search.toLowerCase().split(/\s+/).filter(Boolean);
    return items
      .filter(i => !usedIds.includes(i.id))
      .filter(i => {
        if (tokens.length === 0) return true;
        const haystack = `${i.stock_code} ${i.stock_item} ${i.description} ${i.category}`.toLowerCase();
        return tokens.every(t => haystack.includes(t));
      })
      .slice(0, 30);
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
    return {
      p_receipt_number: receiptNumber,
      p_supplier: supplier,
      p_supplier_ref: supplierRef,
      p_received_date: receivedDate,
      p_notes: notes,
      p_lines,
      p_captured_by: capturedBy,
    };
  }

  async function handleSave() {
    setError('');
    const validLines = lines.filter(l => l.itemId);
    if (validLines.length === 0) { setError('Please add at least one item.'); return; }
    for (const line of validLines) {
      if (line.quantity <= 0) { setError('All quantities must be greater than 0.'); return; }
    }

    setSaving(true);

    let receiptNumber = await generateSequentialNumber('stock_receipts', 'receipt_number', 'GRN');
    let { error: rpcErr } = await supabase.rpc('record_stock_receipt', buildPayload(receiptNumber));
    if (rpcErr && (rpcErr.code === '23505' || /duplicate key/i.test(rpcErr.message))) {
      // Number collision (concurrent insert) — regenerate once and retry.
      receiptNumber = await generateSequentialNumber('stock_receipts', 'receipt_number', 'GRN');
      ({ error: rpcErr } = await supabase.rpc('record_stock_receipt', buildPayload(receiptNumber)));
    }

    if (rpcErr) { setError(rpcErr.message); setSaving(false); return; }

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
          <input value={supplier} onChange={e => setSupplier(e.target.value)} className={inputBase} placeholder="e.g. Pailpac, Mediwaste" />
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
          <input value={capturedBy} onChange={e => setCapturedBy(e.target.value)} className={inputBase} placeholder="Your name" />
        </div>
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
            const filteredItems = getFilteredItems(line.search, line.id);
            const newQty = stockItem ? stockItem.current_quantity + line.quantity : null;

            return (
              <div key={line.id} className="px-3 py-1.5">
                <div className="flex gap-2 items-center">
                  <span className="text-xs font-bold w-5 text-center flex-shrink-0 text-emerald-600">{idx + 1}</span>

                  <div className="flex-1 relative">
                    {stockItem ? (
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border-2 text-sm border-emerald-300 bg-emerald-50">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 text-sm truncate leading-tight">{displayName(stockItem)}</p>
                          <p className="text-[10px] text-gray-500 font-mono leading-tight">{stockItem.stock_code || '(no code)'} &bull; {stockItem.stock_item} &bull; on hand: <strong>{stockItem.current_quantity}</strong></p>
                        </div>
                        <button
                          onClick={() => updateLine(line.id, { itemId: '', search: '', showDropdown: false })}
                          className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0 text-xs underline"
                        >
                          change
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Search and select item..."
                            value={line.search}
                            onChange={e => updateLine(line.id, { search: e.target.value, showDropdown: true })}
                            onFocus={() => updateLine(line.id, { showDropdown: true })}
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                            autoFocus={idx === lines.length - 1 && !stockItem}
                          />
                        </div>
                        {line.showDropdown && (
                          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                            {filteredItems.length === 0 ? (
                              <p className="text-xs text-gray-400 text-center py-6">No items found</p>
                            ) : filteredItems.map(item => (
                              <button
                                key={item.id}
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => updateLine(line.id, { itemId: item.id, search: displayName(item), showDropdown: false })}
                                className="w-full text-left px-4 py-3 text-sm border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors flex items-center justify-between gap-3"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-gray-900 truncate">{displayName(item)}</p>
                                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">{item.stock_code || '(no code)'} &bull; {item.category}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-[10px] text-gray-400">on hand</p>
                                  <p className={`text-sm font-bold ${item.current_quantity === 0 ? 'text-red-600' : item.current_quantity <= (item.minimum_stock_level || 0) ? 'text-amber-600' : 'text-gray-700'}`}>{item.current_quantity}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {stockItem && (
                    <div className="flex items-center gap-1 text-xs flex-shrink-0 text-gray-500">
                      <span className="font-bold text-gray-600">{stockItem.current_quantity}</span>
                      <span className="text-emerald-600 font-bold">+{line.quantity}</span>
                      <span className="text-gray-400">=</span>
                      <span className="font-extrabold text-emerald-700">{newQty}</span>
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
          disabled={saving || validLineCount === 0}
          className="px-6 py-2 text-sm text-white rounded-lg disabled:opacity-50 font-semibold shadow-sm transition-colors bg-emerald-600 hover:bg-emerald-700"
        >
          {saving ? 'Saving...' : `Receive Stock (${validLineCount} item${validLineCount !== 1 ? 's' : ''})`}
        </button>
      </div>
    </Modal>
  );
}
