import { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Power, AlertTriangle } from 'lucide-react';
import { supabase, StockCategory } from '../lib/supabase';
import Modal from '../components/Modal';
import { Spinner } from '../components/Spinner';

export default function Settings() {
  const [categories, setCategories] = useState<StockCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { reloadCategories(); }, []);

  async function reloadCategories() {
    setLoading(true);
    const { data } = await supabase.from('stock_categories').select('*').order('display_order');
    setCategories(data ?? []);
    setLoading(false);
  }
  const [showAdd, setShowAdd] = useState(false);
  const [editCat, setEditCat] = useState<StockCategory | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<StockCategory | null>(null);
  const [opError, setOpError] = useState('');

  async function confirmToggleActive() {
    if (!confirmToggle) return;
    setOpError('');
    const { error } = await supabase.from('stock_categories').update({ active: !confirmToggle.active }).eq('id', confirmToggle.id);
    if (error) { setOpError(error.message); return; }
    setConfirmToggle(null);
    reloadCategories();
  }

  return (
    <div className="space-y-5">
      {opError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">{opError}</div>}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage stock categories and configuration</p>
      </div>

      {/* Categories */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-900 text-sm">Stock Categories</h2>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center justify-center sm:justify-start gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors shadow-sm w-full sm:w-auto"
          >
            <Plus size={13} /> <span className="hidden sm:inline">Add Category</span>
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left px-5 py-2.5 font-medium text-xs uppercase tracking-wider">Category Name</th>
                  <th className="text-center px-4 py-2.5 font-medium text-xs uppercase tracking-wider w-24">Order</th>
                  <th className="text-center px-4 py-2.5 font-medium text-xs uppercase tracking-wider w-24">Status</th>
                  <th className="text-center px-4 py-2.5 font-medium text-xs uppercase tracking-wider w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((cat, idx) => (
                  <tr key={cat.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50 transition-colors ${!cat.active ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-3 font-medium text-gray-800">{cat.category_name}</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500">{cat.display_order}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cat.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {cat.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setEditCat(cat)}
                          className="text-gray-400 hover:text-blue-600 transition-colors p-2 rounded hover:bg-blue-50"
                          title="Edit category"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmToggle(cat)}
                          className={`transition-colors p-2 rounded ${cat.active ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-300 hover:text-emerald-500 hover:bg-emerald-50'}`}
                          title={cat.active ? 'Deactivate category' : 'Activate category'}
                        >
                          <Power size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* App Info */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 text-sm mb-4">Application Info</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-600">Application</span><span className="font-medium">Tech4Green Stock Management</span></div>
          <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-600">Version</span><span className="font-medium">1.0.0</span></div>
          <div className="flex justify-between py-2"><span className="text-gray-600">Database</span><span className="font-medium text-emerald-600">Supabase (Connected)</span></div>
        </div>
      </div>

      {showAdd && (
        <CategoryFormModal
          maxOrder={categories.length + 1}
          onClose={() => setShowAdd(false)}
          onSave={async (data) => {
            await supabase.from('stock_categories').insert(data);
            setShowAdd(false);
            reloadCategories();
          }}
        />
      )}

      {editCat && (
        <CategoryFormModal
          category={editCat}
          maxOrder={categories.length}
          onClose={() => setEditCat(null)}
          onSave={async (data) => {
            await supabase.from('stock_categories').update(data).eq('id', editCat.id);
            setEditCat(null);
            reloadCategories();
          }}
        />
      )}

      {confirmToggle && (
        <Modal title={confirmToggle.active ? 'Deactivate Category' : 'Activate Category'} onClose={() => setConfirmToggle(null)} size="sm" accent={confirmToggle.active ? 'red' : 'green'}>
          <div className="space-y-4">
            <div className={`flex gap-3 p-4 rounded-lg border ${confirmToggle.active ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <AlertTriangle size={18} className={confirmToggle.active ? 'text-red-500 flex-shrink-0 mt-0.5' : 'text-emerald-600 flex-shrink-0 mt-0.5'} />
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-1">
                  {confirmToggle.active ? 'Deactivate' : 'Activate'} &ldquo;{confirmToggle.category_name}&rdquo;?
                </p>
                <p className="text-xs text-gray-600">
                  {confirmToggle.active
                    ? 'This category will be hidden from stock lists and item creation. Existing items will not be affected.'
                    : 'This category will become visible again in stock lists and item creation.'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
            <button onClick={() => setConfirmToggle(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={confirmToggleActive}
              className={`px-5 py-2 text-sm text-white rounded-lg font-semibold shadow-sm transition-colors ${confirmToggle.active ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >
              Yes, {confirmToggle.active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

interface CategoryFormModalProps {
  category?: StockCategory;
  maxOrder: number;
  onClose: () => void;
  onSave: (data: Partial<StockCategory>) => Promise<void>;
}

function CategoryFormModal({ category, maxOrder, onClose, onSave }: CategoryFormModalProps) {
  const [name, setName] = useState(category?.category_name || '');
  const [order, setOrder] = useState(category?.display_order ?? maxOrder);
  const [active, setActive] = useState(category?.active ?? true);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name) return;
    setSaving(true);
    await onSave({ category_name: name, display_order: order, active });
    setSaving(false);
  }

  return (
    <Modal title={category ? 'Edit Category' : 'Add Category'} onClose={onClose} size="sm">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Category Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Display Order</label>
          <input type="number" min="1" value={order} onChange={e => setOrder(Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="rounded" />
          Active
        </label>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
        <button onClick={handleSave} disabled={saving || !name} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 font-medium shadow-sm">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </Modal>
  );
}
