import { useState } from 'react';
import { Plus, Search, ArrowDownCircle, ArrowUpCircle, Trash2 } from 'lucide-react';
import { supabase, StockItem } from '../../lib/supabase';
import Modal from '../../components/Modal';

interface MovementLine {
  id: number;
  itemId: string;
  search: string;
  showDropdown: boolean;
  quantity: number;
}

interface Props {
  direction: 'in' | 'out';
  items: StockItem[];
  onClose: () => void;
  onSave: () => void;
}

export default function QuickMovementModal({ direction, items, onClose, onSave }: Props) {
  const isIn = direction === 'in';
  const [lines, setLines] = useState<MovementLine[]>([{ id: 1, itemId: '', search: '', showDropdown: false, quantity: 1 }]);
  const [supplierClient, setSupplierClient] = useState('');
  const [reference, setReference] = useState('');
  const [capturedBy, setCapturedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updateLine(id: number, patch: Partial<MovementLine>) {
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

  async function handleSave() {
    setError('');
    const validLines = lines.filter(l => l.itemId);
    if (validLines.length === 0) { setError('Please add at least one item.'); return; }
    for (const line of validLines) {
      if (line.quantity <= 0) { setError('All quantities must be greater than 0.'); return; }
      if (!isIn) {
        const stockItem = items.find(i => i.id === line.itemId);
        if (stockItem && line.quantity > stockItem.current_quantity) {
          setError(`Cannot issue ${line.quantity} of "${stockItem.stock_item}". Only ${stockItem.current_quantity} on hand.`);
          return;
        }
      }
    }

    setSaving(true);
    const groupId = crypto.randomUUID();
    const itemCount = validLines.length;
    const groupLabel = `${isIn ? 'Stock In' : 'Stock Out'}${reference ? ` · ${reference}` : ''} · ${itemCount} item${itemCount !== 1 ? 's' : ''}`;
    const now = new Date().toISOString();

    for (const line of validLines) {
      const stockItem = items.find(i => i.id === line.itemId)!;
      const delta = isIn ? line.quantity : -line.quantity;
      const { error: movErr } = await supabase.from('stock_movements').insert({
        movement_date: now,
        stock_item_id: line.itemId,
        stock_code: stockItem.stock_code || '',
        movement_type: isIn ? 'Stock Received' : 'Stock Issued',
        quantity: line.quantity,
        reference_number: reference,
        supplier_client_department: supplierClient,
        captured_by: capturedBy,
        notes,
        movement_group_id: groupId,
        movement_group_label: groupLabel,
      });
      if (movErr) { setError(movErr.message); setSaving(false); return; }
      const newQty = Math.max(0, stockItem.current_quantity + delta);
      const { error: updErr } = await supabase.from('stock_items').update({ current_quantity: newQty, updated_at: new Date().toISOString() }).eq('id', line.itemId);
      if (updErr) { setError(updErr.message); setSaving(false); return; }
    }
    setSaving(false);
    onSave();
  }

  const inputBase = 'w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 bg-white';
  const focusRing = isIn ? 'focus:ring-emerald-400' : 'focus:ring-red-400';
  const validLineCount = lines.filter(l => l.itemId).length;

  return (
    <Modal
      title={isIn ? 'Stock In — Receive Stock' : 'Stock Out — Issue Stock'}
      onClose={onClose}
      size="xl"
      accent={isIn ? 'green' : 'red'}
    >
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3 ${isIn ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
        {isIn ? <ArrowDownCircle size={12} /> : <ArrowUpCircle size={12} />}
        {isIn ? 'Recording stock received into store' : 'Recording stock issued out of store'}
      </div>

      <div className={`rounded-xl border-2 ${isIn ? 'border-emerald-200' : 'border-red-200'}`}>
        <div className={`px-4 py-2 flex items-center gap-2 ${isIn ? 'bg-emerald-600' : 'bg-red-600'}`}>
          <span className="text-xs font-bold text-white uppercase tracking-wider flex-1">Stock Items</span>
          <span className="text-xs text-white/70">Qty</span>
          <span className="w-7" />
        </div>

        <div className="divide-y divide-gray-100 bg-white">
          {lines.map((line, idx) => {
            const stockItem = items.find(i => i.id === line.itemId);
            const filteredItems = getFilteredItems(line.search, line.id);
            const newQty = stockItem ? Math.max(0, stockItem.current_quantity + (isIn ? line.quantity : -line.quantity)) : null;
            const overStock = !isIn && stockItem && line.quantity > stockItem.current_quantity;

            return (
              <div key={line.id} className={`px-3 py-1.5 ${overStock ? 'bg-red-50' : ''}`}>
                <div className="flex gap-2 items-center">
                  <span className={`text-xs font-bold w-5 text-center flex-shrink-0 ${isIn ? 'text-emerald-600' : 'text-red-500'}`}>{idx + 1}</span>

                  <div className="flex-1 relative">
                    {stockItem ? (
                      <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border-2 text-sm ${isIn ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'}`}>
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
                            className={`w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 ${focusRing} bg-white`}
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
                    <div className={`flex items-center gap-1 text-xs flex-shrink-0 ${overStock ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                      {overStock
                        ? <span className="whitespace-nowrap">Only {stockItem.current_quantity} on hand</span>
                        : <>
                            <span className="font-bold text-gray-600">{stockItem.current_quantity}</span>
                            <span className={isIn ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>{isIn ? `+${line.quantity}` : `−${line.quantity}`}</span>
                            <span className="text-gray-400">=</span>
                            <span className={`font-extrabold ${isIn ? 'text-emerald-700' : 'text-red-700'}`}>{newQty}</span>
                          </>
                      }
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

        <div className={`px-3 py-2 border-t ${isIn ? 'border-emerald-100 bg-emerald-50/50' : 'border-red-100 bg-red-50/50'}`}>
          <button
            onClick={addLine}
            className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${isIn ? 'text-emerald-700 hover:text-emerald-800' : 'text-red-700 hover:text-red-800'}`}
          >
            <Plus size={13} /> Add another item
          </button>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Movement Details</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">{isIn ? 'Supplier' : 'Client / Department'}</label>
            <input value={supplierClient} onChange={e => setSupplierClient(e.target.value)} className={`${inputBase} ${focusRing}`} placeholder={isIn ? 'e.g. Pailpac, Mediwaste' : 'e.g. Hospital ABC'} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Reference Number</label>
            <input value={reference} onChange={e => setReference(e.target.value)} className={`${inputBase} ${focusRing}`} placeholder="e.g. PO-12345" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Captured By</label>
            <input value={capturedBy} onChange={e => setCapturedBy(e.target.value)} className={`${inputBase} ${focusRing}`} placeholder="Your name" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className={`${inputBase} ${focusRing}`} placeholder="Optional notes" />
          </div>
        </div>
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
          className={`px-6 py-2 text-sm text-white rounded-lg disabled:opacity-50 font-semibold shadow-sm transition-colors ${
            isIn ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {saving ? 'Saving...' : isIn ? `Confirm Stock In (${validLineCount})` : `Confirm Stock Out (${validLineCount})`}
        </button>
      </div>
    </Modal>
  );
}
