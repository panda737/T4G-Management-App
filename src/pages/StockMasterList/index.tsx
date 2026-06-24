import { useEffect, useRef, useState, useMemo } from 'react';
import { Plus, Edit2, AlertCircle, ChevronDown, ChevronRight, Package, Tags } from 'lucide-react';
import { supabase, StockItem, getStockStatus } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useToast } from '../../lib/toast';
import { useUser } from '../../lib/UserContext';
import { compareCategories, categoryMeta } from '../../lib/stockCategories';
import StatusBadge from '../../components/StatusBadge';
import { PageHeader, Button, Toolbar, SearchInput, FilterSelect, StatStrip } from '../../components/ui';
import ItemFormModal from './ItemFormModal';
import ManageCategoriesModal from './ManageCategoriesModal';

const STATUSES = ['All', 'In Stock', 'Low Stock', 'Out of Stock'];

export default function StockMasterList() {
  usePageTitle('Stock — Master List');
  const { addToast } = useToast();
  const { isAdmin } = useUser();
  const [items, setItems] = useState<StockItem[]>([]);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [editItem, setEditItem] = useState<StockItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [existingCodes, setExistingCodes] = useState<string[]>([]);
  const [opError, setOpError] = useState('');
  const collapseInit = useRef(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [itemsRes, catRes] = await Promise.all([
      supabase.from('stock_items').select('*').eq('active', true).order('category').order('stock_item'),
      supabase.from('stock_categories').select('category_name').eq('active', true),
    ]);
    const data = itemsRes.data || [];
    setItems(data);
    setExistingCodes(data.map(i => i.stock_code).filter(Boolean));
    setActiveCategories(Array.from(new Set((catRes.data || []).map((c: { category_name: string }) => c.category_name))));
    // On first load, collapse every category — user must click a header to expand it.
    if (!collapseInit.current) {
      setCollapsedCategories(new Set(data.map(i => i.category).filter(Boolean)));
      collapseInit.current = true;
    }
    setLoading(false);
  }

  // Filter / item-form options: active categories from the table merged with any
  // category already used by items (so nothing becomes unselectable), in the
  // canonical display order.
  const categoryOptions = useMemo(() => {
    const merged = new Set<string>([...activeCategories, ...items.map(i => i.category).filter(Boolean)]);
    return Array.from(merged).sort(compareCategories);
  }, [activeCategories, items]);
  const filterCategories = ['All', ...categoryOptions];

  const filtered = useMemo(() => {
    return items.filter(item => {
      const q = search.toLowerCase();
      const matchSearch = !q || item.stock_code.toLowerCase().includes(q) || item.stock_item.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
      const matchCat = filterCategory === 'All' || item.category === filterCategory;
      const matchStatus = filterStatus === 'All' || getStockStatus(item) === filterStatus;
      return matchSearch && matchCat && matchStatus;
    });
  }, [items, search, filterCategory, filterStatus]);

  const groupedByCategory = useMemo(() => {
    const map: Record<string, StockItem[]> = {};
    filtered.forEach(item => { if (!map[item.category]) map[item.category] = []; map[item.category].push(item); });
    return map;
  }, [filtered]);

  const sortedCategories = Object.keys(groupedByCategory).sort(compareCategories);

  const totalQty = useMemo(() => items.reduce((s, i) => s + i.current_quantity, 0), [items]);
  const lowCount = useMemo(() => items.filter(i => getStockStatus(i) === 'Low Stock').length, [items]);
  const outCount = useMemo(() => items.filter(i => getStockStatus(i) === 'Out of Stock').length, [items]);

  function toggleCategory(cat: string) {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {opError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">{opError}</div>}
      <PageHeader
        title="Stock Master List"
        subtitle={`${filtered.length} of ${items.length} items • ${totalQty.toLocaleString()} total units on hand`}
        accent="emerald"
        actions={
          <>
            {isAdmin && (
              <Button variant="secondary" icon={Tags} hideLabelOnMobile onClick={() => setShowCategories(true)}>Manage Categories</Button>
            )}
            <Button variant="primary" accent="emerald" icon={Plus} hideLabelOnMobile onClick={() => setShowAdd(true)}>Add Item</Button>
          </>
        }
      />

      <StatStrip
        accent="emerald"
        stats={[
          { label: 'Items', value: items.length, icon: Package },
          { label: 'On hand', value: totalQty.toLocaleString(), valueClass: 'text-emerald-600' },
          { label: 'Low', value: lowCount, valueClass: 'text-amber-600' },
          { label: 'Out', value: outCount, valueClass: 'text-red-600' },
        ]}
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search code, item, description…" />
        <FilterSelect value={filterCategory} onChange={setFilterCategory} accent="emerald">
          {filterCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </FilterSelect>
        <FilterSelect value={filterStatus} onChange={setFilterStatus} accent="emerald">
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </FilterSelect>
      </Toolbar>

      {/* Category sections */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>
      ) : sortedCategories.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-400 text-center py-12">No items found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedCategories.map(category => {
            const catItems = groupedByCategory[category];
            const collapsed = collapsedCategories.has(category);
            const catTotal = catItems.reduce((s, i) => s + i.current_quantity, 0);
            const meta = categoryMeta(category);
            return (
              <div key={category} className={`bg-white rounded-xl border border-gray-200 border-l-4 ${meta.borderL} shadow-sm overflow-hidden`}>
                <div
                  className={`flex items-center justify-between pl-4 pr-4 py-2.5 cursor-pointer transition-opacity hover:opacity-90 select-none ${meta.header}`}
                  onClick={() => toggleCategory(category)}
                >
                  <div className="flex items-center gap-2.5">
                    {collapsed
                      ? <ChevronRight size={14} className={meta.chevron} />
                      : <ChevronDown size={14} className={meta.chevron} />}
                    <span className="text-xs font-bold uppercase tracking-wider">{category}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${meta.chip}`}>{catItems.length} items</span>
                  </div>
                  <span className="text-xs opacity-90">Total on hand: <strong>{catTotal}</strong></span>
                </div>

                {!collapsed && (
                  <>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-100 border-b border-gray-200">
                            <th className="text-left px-4 py-2 font-semibold text-[11px] uppercase tracking-wider text-gray-600 w-28">Stock Code</th>
                            <th className="text-left px-3 py-2 font-semibold text-[11px] uppercase tracking-wider text-gray-600 w-36">Stock Item</th>
                            <th className="text-left px-3 py-2 font-semibold text-[11px] uppercase tracking-wider text-gray-600">Description</th>
                            <th className="text-center px-3 py-2 font-semibold text-[11px] uppercase tracking-wider text-gray-600 w-16">Qty</th>
                            <th className="text-center px-3 py-2 font-semibold text-[11px] uppercase tracking-wider text-gray-600 w-24">Status</th>
                            <th className="text-center px-3 py-2 font-semibold text-[11px] uppercase tracking-wider text-gray-600 w-16">Edit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {catItems.map((item, idx) => {
                            const status = getStockStatus(item);
                            const missingCode = !item.stock_code;
                            const rowBg = status === 'Out of Stock'
                              ? 'bg-red-50/40'
                              : status === 'Low Stock'
                              ? 'bg-amber-50/40'
                              : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40';
                            return (
                              <tr key={item.id} className={`hover:bg-blue-50/50 transition-colors ${rowBg}`}>
                                <td className="px-4 py-2 font-mono text-[11px] text-gray-600">
                                  {missingCode ? (
                                    <span className="flex items-center gap-1 text-amber-600">
                                      <AlertCircle size={11} /> Missing
                                    </span>
                                  ) : item.stock_code}
                                </td>
                                <td className="px-3 py-2 text-gray-800 text-xs font-medium">{item.stock_item}</td>
                                <td className="px-3 py-2 text-gray-500 text-xs">{item.description}</td>
                                <td className="px-3 py-2 text-center font-bold text-gray-900 text-sm">{item.current_quantity}</td>
                                <td className="px-3 py-2 text-center"><StatusBadge status={status} /></td>
                                <td className="px-3 py-2 text-center">
                                  <button
                                    onClick={() => setEditItem(item)}
                                    className="p-1 rounded hover:bg-blue-100 text-gray-500 hover:text-blue-600 transition-colors"
                                    title="Edit item"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile card view */}
                    <div className="md:hidden divide-y divide-gray-100">
                      {catItems.map((item) => {
                        const status = getStockStatus(item);
                        const missingCode = !item.stock_code;
                        return (
                          <div key={item.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-mono text-xs text-gray-600 mb-1">{missingCode ? <span className="text-amber-600">Missing code</span> : item.stock_code}</p>
                                <p className="font-semibold text-sm text-gray-900 truncate">{item.stock_item}</p>
                              </div>
                              <button
                                onClick={() => setEditItem(item)}
                                className="p-1.5 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0"
                                title="Edit item"
                              >
                                <Edit2 size={14} />
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 mb-2">{item.description}</p>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">Qty: <span className="font-bold text-gray-900">{item.current_quantity}</span></span>
                              <StatusBadge status={status} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCategories && (
        <ManageCategoriesModal
          items={items}
          onClose={() => setShowCategories(false)}
          onChanged={load}
        />
      )}

      {showAdd && (
        <ItemFormModal
          title="Add Stock Item"
          existingCodes={existingCodes}
          categories={categoryOptions}
          onClose={() => setShowAdd(false)}
          onSave={async (data) => {
            const { error } = await supabase.from('stock_items').insert(data);
            if (error) { setOpError(error.message); return; }
            addToast('Item added');
            setShowAdd(false);
            load();
          }}
        />
      )}

      {editItem && (
        <ItemFormModal
          title="Edit Stock Item"
          item={editItem}
          existingCodes={existingCodes.filter(c => c !== editItem.stock_code)}
          categories={categoryOptions}
          onClose={() => setEditItem(null)}
          onSave={async (data) => {
            const { error } = await supabase.from('stock_items').update({ ...data, updated_at: new Date().toISOString() }).eq('id', editItem.id);
            if (error) { setOpError(error.message); return; }
            addToast('Item updated');
            setEditItem(null);
            load();
          }}
        />
      )}
    </div>
  );
}
