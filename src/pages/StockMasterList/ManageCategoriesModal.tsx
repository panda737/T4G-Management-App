import { useEffect, useMemo, useState } from 'react';
import { Plus, Eye, EyeOff } from 'lucide-react';
import { supabase, StockItem } from '../../lib/supabase';
import { categoryMeta, compareCategories } from '../../lib/stockCategories';
import Modal from '../../components/Modal';

interface Props {
  items: StockItem[];
  onClose: () => void;
  onChanged: () => void;
}

interface CatRow { name: string; active: boolean }

export default function ManageCategoriesModal({ items, onClose, onChanged }: Props) {
  const [cats, setCats] = useState<CatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    // The table has historic duplicate rows per name — collapse to one entry,
    // treating a name as active if ANY of its rows is active.
    const { data } = await supabase.from('stock_categories').select('category_name, active');
    const map = new Map<string, boolean>();
    (data || []).forEach((r: { category_name: string; active: boolean }) => {
      map.set(r.category_name, (map.get(r.category_name) || false) || r.active);
    });
    const rows = Array.from(map.entries()).map(([name, active]) => ({ name, active }));
    rows.sort((a, b) => compareCategories(a.name, b.name));
    setCats(rows);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const countByCat = useMemo(() => {
    const m: Record<string, number> = {};
    items.forEach(i => { m[i.category] = (m[i.category] || 0) + 1; });
    return m;
  }, [items]);

  async function toggleActive(name: string, active: boolean) {
    setBusy(true); setError('');
    const { error } = await supabase.from('stock_categories').update({ active: !active }).eq('category_name', name);
    setBusy(false);
    if (error) { setError(error.message); return; }
    await load();
    onChanged();
  }

  async function addCategory() {
    const name = newName.trim();
    if (!name) return;
    if (cats.some(c => c.name.toLowerCase() === name.toLowerCase())) { setError('That category already exists.'); return; }
    setBusy(true); setError('');
    const { data } = await supabase.from('stock_categories').select('display_order').order('display_order', { ascending: false }).limit(1);
    const nextOrder = (((data && data[0]?.display_order) as number | undefined) ?? 0) + 1;
    const { error } = await supabase.from('stock_categories').insert({ category_name: name, display_order: nextOrder, active: true });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setNewName('');
    await load();
    onChanged();
  }

  return (
    <Modal title="Manage Stock Categories" onClose={onClose} size="md" accent="green">
      <p className="text-xs text-gray-500 mb-3">
        Categories group the Master List. Colours are assigned automatically. Deactivating a category
        hides it when adding items — existing items keep their category.
      </p>

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600" /></div>
      ) : (
        <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {cats.map(c => {
            const meta = categoryMeta(c.name);
            return (
              <div key={c.name} className={`flex items-center gap-3 px-3 py-2.5 ${c.active ? 'bg-white' : 'bg-gray-50 opacity-70'}`}>
                <span className={`w-3.5 h-3.5 rounded-sm flex-shrink-0 ${meta.swatch}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                  <p className="text-[11px] text-gray-400">{countByCat[c.name] ?? 0} item{(countByCat[c.name] ?? 0) !== 1 ? 's' : ''}</p>
                </div>
                <button
                  onClick={() => toggleActive(c.name, c.active)}
                  disabled={busy}
                  className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50 ${c.active ? 'text-gray-500 hover:bg-gray-100' : 'text-emerald-600 hover:bg-emerald-50'}`}
                  title={c.active ? 'Deactivate' : 'Activate'}
                >
                  {c.active ? <><EyeOff size={13} /> Active</> : <><Eye size={13} /> Hidden</>}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add */}
      <div className="mt-4 flex items-center gap-2">
        <input
          value={newName}
          onChange={e => { setNewName(e.target.value); setError(''); }}
          onKeyDown={e => { if (e.key === 'Enter') addCategory(); }}
          placeholder="New category name…"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          onClick={addCategory}
          disabled={busy || !newName.trim()}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm disabled:opacity-50"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {error && <div className="mt-3 text-sm text-red-700 bg-red-50 px-4 py-2.5 rounded-lg border border-red-200">{error}</div>}

      <div className="flex justify-end mt-5 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Done</button>
      </div>
    </Modal>
  );
}
