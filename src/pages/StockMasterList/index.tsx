import { useEffect, useRef, useState, useMemo } from 'react';
import { Plus, Search, Edit2, AlertCircle, ChevronDown, ChevronRight, ArrowDownCircle, ArrowUpCircle, Package } from 'lucide-react';
import { supabase, StockItem, getStockStatus } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useToast } from '../../lib/toast';
import StatusBadge from '../../components/StatusBadge';
import QuickMovementModal from './QuickMovementModal';
import ItemFormModal from './ItemFormModal';

const CATEGORIES = ['All', 'Liners', 'Sharps', 'External Customer Containers', 'Anatomical (Specibins)', 'Pharmaceutical', 'Box Sets', 'Other'];
const STATUSES = ['All', 'In Stock', 'Low Stock', 'Out of Stock'];
const CATEGORY_ORDER = ['Liners', 'Sharps', 'External Customer Containers', 'Anatomical (Specibins)', 'Pharmaceutical', 'Box Sets', 'Other'];

export default function StockMasterList() {
  usePageTitle('Stock — Master List');
  const { addToast } = useToast();
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [editItem, setEditItem] = useState<StockItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [globalMovement, setGlobalMovement] = useState<'in' | 'out' | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [existingCodes, setExistingCodes] = useState<string[]>([]);
  const [opError, setOpError] = useState('');
  const collapseInit = useRef(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('stock_items').select('*').eq('active', true).order('category').order('stock_item');
    setItems(data || []);
    setExistingCodes((data || []).map(i => i.stock_code).filter(Boolean));
    // On first load, collapse every category — user must click a header to expand it.
    if (!collapseInit.current) {
      setCollapsedCategories(new Set((data || []).map(i => i.category).filter(Boolean)));
      collapseInit.current = true;
    }
    setLoading(false);
  }

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

  const sortedCategories = Object.keys(groupedByCategory).sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Master List</h1>
          <p className="text-xs text-gray-500 mt-0.5">{filtered.length} of {items.length} items &bull; {totalQty.toLocaleString()} total units on hand</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setGlobalMovement('in')}
            className="group flex items-center justify-center sm:justify-start gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md"
          >
            <ArrowDownCircle size={15} className="group-hover:scale-110 transition-transform" /> <span className="hidden sm:inline">Stock In</span>
          </button>
          <button
            onClick={() => setGlobalMovement('out')}
            className="group flex items-center justify-center sm:justify-start gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md"
          >
            <ArrowUpCircle size={15} className="group-hover:scale-110 transition-transform" /> <span className="hidden sm:inline">Stock Out</span>
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center justify-center sm:justify-start gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus size={15} /> <span className="hidden sm:inline">Add Item</span>
          </button>
        </div>
      </div>

      {/* Mini stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2"><Package size={14} className="text-blue-500" /><span className="text-xs text-gray-500">Items</span></div>
          <span className="text-sm font-bold text-gray-900">{items.length}</span>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 flex items-center justify-between shadow-sm">
          <span className="text-xs text-gray-500">On hand</span>
          <span className="text-sm font-bold text-emerald-600">{totalQty.toLocaleString()}</span>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 flex items-center justify-between shadow-sm">
          <span className="text-xs text-gray-500">Low</span>
          <span className="text-sm font-bold text-amber-600">{lowCount}</span>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 flex items-center justify-between shadow-sm">
          <span className="text-xs text-gray-500">Out</span>
          <span className="text-sm font-bold text-red-600">{outCount}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search code, item, description..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
          </div>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="border border-gray-200 rounded-lg text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white w-full sm:w-auto">
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-lg text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white w-full sm:w-auto">
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

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
            return (
              <div key={category} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div
                  className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-gray-800 to-gray-700 cursor-pointer hover:from-gray-700 hover:to-gray-600 transition-colors select-none"
                  onClick={() => toggleCategory(category)}
                >
                  <div className="flex items-center gap-2.5">
                    {collapsed
                      ? <ChevronRight size={14} className="text-gray-300" />
                      : <ChevronDown size={14} className="text-gray-300" />}
                    <span className="text-xs font-bold text-white uppercase tracking-wider">{category}</span>
                    <span className="text-[10px] text-gray-300 bg-white/10 border border-white/20 px-1.5 py-0.5 rounded-full font-medium">{catItems.length} items</span>
                  </div>
                  <span className="text-xs text-gray-300">Total on hand: <strong className="text-white">{catTotal}</strong></span>
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

      {showAdd && (
        <ItemFormModal
          title="Add Stock Item"
          existingCodes={existingCodes}
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

      {globalMovement && (
        <QuickMovementModal
          direction={globalMovement}
          items={items}
          onClose={() => setGlobalMovement(null)}
          onSave={() => { setGlobalMovement(null); addToast('Movement recorded'); load(); }}
        />
      )}
    </div>
  );
}
