import { useState } from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { StockItem } from '../../lib/supabase';
import { CATEGORY_ORDER } from '../../lib/stockCategories';
import Modal from '../../components/Modal';

interface Props {
  title: string;
  item?: StockItem;
  existingCodes: string[];
  categories?: string[];
  onClose: () => void;
  onSave: (data: Partial<StockItem>) => Promise<void>;
}

export default function ItemFormModal({ title, item, existingCodes, categories, onClose, onSave }: Props) {
  const categoryOptions = categories && categories.length > 0 ? categories : [...CATEGORY_ORDER];
  const [form, setForm] = useState({
    stock_code: item?.stock_code || '',
    stock_item: item?.stock_item || '',
    category: item?.category || categoryOptions[0],
    description: item?.description || '',
    unit_of_measure: item?.unit_of_measure || 'Each',
    current_quantity: item?.current_quantity ?? 0,
    minimum_stock_level: item?.minimum_stock_level ?? 0,
    maximum_stock_level: item?.maximum_stock_level ?? 0,
    active: item?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const codeDuplicate = form.stock_code && existingCodes.includes(form.stock_code);

  const set = (key: string, value: string | number | boolean) => setForm(f => ({ ...f, [key]: value }));

  async function handleSave() {
    if (!form.stock_item || !form.category) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <Modal title={title} onClose={onClose} size="lg">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Stock Code</label>
          <input value={form.stock_code} onChange={e => set('stock_code', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. TW025LR" />
          {codeDuplicate && (
            <p className="text-xs text-amber-600 flex items-center gap-1 mt-1"><AlertTriangle size={11} /> Stock code already exists — different items may share the same code.</p>
          )}
          {!form.stock_code && (
            <p className="text-xs text-amber-600 flex items-center gap-1 mt-1"><AlertCircle size={11} /> Missing stock code — you can add it later.</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Stock Item *</label>
          <input value={form.stock_item} onChange={e => set('stock_item', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
          <input value={form.description} onChange={e => set('description', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
          <select value={form.category} onChange={e => set('category', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
            {categoryOptions.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Unit of Measure</label>
          <select value={form.unit_of_measure} onChange={e => set('unit_of_measure', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
            {['Each','Packet','Roll','Box','Carton','Pair','Set'].map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Minimum Stock Level</label>
          <input type="number" min="0" value={form.minimum_stock_level} onChange={e => set('minimum_stock_level', Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Maximum Stock Level</label>
          <input type="number" min="0" value={form.maximum_stock_level} onChange={e => set('maximum_stock_level', Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        {item && (
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Current Quantity</label>
            <input type="number" value={form.current_quantity} onChange={e => set('current_quantity', Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            <p className="text-[11px] text-gray-500 mt-1">Tip: for tracked changes, use the Stock In / Stock Out buttons instead.</p>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
        <button onClick={handleSave} disabled={saving || !form.stock_item} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 transition-colors font-medium shadow-sm">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </Modal>
  );
}
