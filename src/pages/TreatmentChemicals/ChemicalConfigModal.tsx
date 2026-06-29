import { useState } from 'react';
import { Loader } from 'lucide-react';
import Modal from '../../components/Modal';
import type { TreatmentChemical, StockItem, Supplier } from '../../lib/supabase';

interface Props {
  existing: TreatmentChemical | null;
  stockItems: StockItem[];
  suppliers: Pick<Supplier, 'id' | 'supplier_name'>[];
  onClose: () => void;
  onSubmit: (values: { stock_item_id: string; supplier_id: string | null; name: string; litres_per_cycle: number }) => Promise<void>;
}

export default function ChemicalConfigModal({ existing, stockItems, suppliers, onClose, onSubmit }: Props) {
  const [stockItemId, setStockItemId] = useState(existing?.stock_item_id ?? '');
  const [supplierId, setSupplierId] = useState(existing?.supplier_id ?? '');
  const [name, setName] = useState(existing?.name ?? '');
  const [litresPerCycle, setLitresPerCycle] = useState(String(existing?.litres_per_cycle ?? 27));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500';

  function pickItem(id: string) {
    setStockItemId(id);
    // Default the display name to the item's name if the user hasn't typed one.
    if (!name.trim()) {
      const item = stockItems.find(i => i.id === id);
      if (item) setName(item.stock_item);
    }
  }

  async function save() {
    setError('');
    const rate = parseFloat(litresPerCycle);
    if (!stockItemId) { setError('Choose the chemical stock item.'); return; }
    if (isNaN(rate) || rate < 0) { setError('Enter a valid litres-per-cycle.'); return; }
    setSaving(true);
    try {
      await onSubmit({ stock_item_id: stockItemId, supplier_id: supplierId || null, name: name.trim(), litres_per_cycle: rate });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not save.';
      setError(/duplicate|unique/i.test(msg) ? 'That stock item is already tracked as a chemical.' : msg);
      setSaving(false);
    }
  }

  return (
    <Modal
      title={existing ? 'Chemical settings' : 'Set up chemical'}
      onClose={onClose}
      size="md"
      accent="cyan"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition font-medium disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader size={14} className="animate-spin" />} Save
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chemical stock item *</label>
          <select value={stockItemId} onChange={e => pickItem(e.target.value)} className={inp}>
            <option value="">— Select stock item —</option>
            {stockItems.map(i => (
              <option key={i.id} value={i.id}>{i.stock_item}{i.stock_code ? ` (${i.stock_code})` : ''} · {i.unit_of_measure}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">The item received from your supplier. Stock on hand is read from here; it should be measured in litres.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Supplier (for unit cost)</label>
          <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className={inp}>
            <option value="">— None —</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
          </select>
          <p className="text-xs text-gray-400 mt-1">Unit cost is read from this supplier's price list for the item.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Treatment chemical" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Litres per cycle *</label>
            <input type="number" min="0" step="any" value={litresPerCycle} onChange={e => setLitresPerCycle(e.target.value)} className={inp} />
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
      </div>
    </Modal>
  );
}
