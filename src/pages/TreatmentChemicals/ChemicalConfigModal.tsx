import { useMemo, useState } from 'react';
import { Loader } from 'lucide-react';
import Modal from '../../components/Modal';
import type { TreatmentChemical, StockItem, Supplier } from '../../lib/supabase';

type SupplierItemLink = { supplier_id: string; stock_item_id: string; unit_price: number };

interface Props {
  existing: TreatmentChemical | null;
  stockItems: StockItem[];
  suppliers: Pick<Supplier, 'id' | 'supplier_name'>[];
  supplierItems: SupplierItemLink[];
  onClose: () => void;
  onSubmit: (values: { stock_item_id: string; supplier_id: string | null; name: string; litres_per_unit: number }) => Promise<void>;
}

export default function ChemicalConfigModal({ existing, stockItems, suppliers, supplierItems, onClose, onSubmit }: Props) {
  const [supplierId, setSupplierId] = useState(existing?.supplier_id ?? '');
  const [stockItemId, setStockItemId] = useState(existing?.stock_item_id ?? '');
  const [name, setName] = useState(existing?.name ?? '');
  const [litresPerUnit, setLitresPerUnit] = useState(String(existing?.litres_per_unit ?? 1000));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500';

  // Only items the chosen supplier actually supplies (their price list).
  const availableItems = useMemo(() => {
    if (!supplierId) return [];
    const ids = new Set(supplierItems.filter(s => s.supplier_id === supplierId).map(s => s.stock_item_id));
    return stockItems.filter(i => ids.has(i.id));
  }, [supplierId, supplierItems, stockItems]);

  function pickSupplier(id: string) {
    setSupplierId(id);
    // Reset the item if it isn't supplied by the newly chosen supplier.
    if (id && !supplierItems.some(s => s.supplier_id === id && s.stock_item_id === stockItemId)) {
      setStockItemId('');
    }
  }

  function pickItem(id: string) {
    setStockItemId(id);
    if (!name.trim()) {
      const item = stockItems.find(i => i.id === id);
      if (item) setName(item.stock_item);
    }
  }

  async function save() {
    setError('');
    const rate = parseFloat(litresPerUnit);
    if (!supplierId) { setError('Choose the supplier.'); return; }
    if (!stockItemId) { setError('Choose the chemical item.'); return; }
    if (isNaN(rate) || rate <= 0) { setError('Enter the litres per container (greater than zero).'); return; }
    setSaving(true);
    try {
      await onSubmit({ stock_item_id: stockItemId, supplier_id: supplierId, name: name.trim(), litres_per_unit: rate });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not save.';
      setError(/duplicate|unique/i.test(msg) ? 'That item is already tracked as a chemical.' : msg);
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
          <select value={supplierId} onChange={e => pickSupplier(e.target.value)} className={inp}>
            <option value="">— Select supplier —</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chemical item *</label>
          <select value={stockItemId} onChange={e => pickItem(e.target.value)} disabled={!supplierId} className={`${inp} ${!supplierId ? 'bg-gray-50 text-gray-400' : ''}`}>
            <option value="">{supplierId ? '— Select item —' : 'Choose a supplier first'}</option>
            {availableItems.map(i => (
              <option key={i.id} value={i.id}>{i.stock_item}{i.stock_code ? ` (${i.stock_code})` : ''} · {i.unit_of_measure}</option>
            ))}
          </select>
          {supplierId && availableItems.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">This supplier has no items in its price list yet — add the chemical to it in Commercial → Suppliers.</p>
          )}
          <p className="text-xs text-gray-400 mt-1">Only items this supplier supplies. Stock on hand and unit cost are read from here.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Treatment chemical" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Litres per container *</label>
            <input type="number" min="1" step="any" value={litresPerUnit} onChange={e => setLitresPerUnit(e.target.value)} className={inp} />
            <p className="text-xs text-gray-400 mt-1">e.g. 1000 for a 1000 L IBC.</p>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
      </div>
    </Modal>
  );
}
