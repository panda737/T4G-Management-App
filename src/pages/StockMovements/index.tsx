import { useEffect, useState, useMemo } from 'react';
import { Plus, Search, ChevronRight, Package, ArrowLeftRight, ClipboardCheck, Download } from 'lucide-react';
import { supabase, StockItem } from '../../lib/supabase';
import { useToast } from '../../lib/toast';
import { downloadCSV } from '../../lib/csvExport';
import { MOVEMENT_TYPES, INCREASE_TYPES, DECREASE_TYPES, EITHER_TYPES, MovementWithItem, OrderGroup, buildGroups, directionColor } from './constants';
import { MovementIcon } from './MovementIcon';
import OrderDetail from './OrderDetail';
import MovementFormModal from './MovementFormModal';

function GroupTypeIcon({ type }: { type: string }) {
  if (type === 'Stock Take Correction') return <ClipboardCheck size={15} className="text-amber-600" />;
  if (INCREASE_TYPES.includes(type)) return <Package size={15} className="text-emerald-600" />;
  if (DECREASE_TYPES.includes(type)) return <ArrowLeftRight size={15} className="text-red-500" />;
  return <ArrowLeftRight size={15} className="text-amber-500" />;
}

export default function StockMovements() {
  const { addToast } = useToast();
  const [movements, setMovements] = useState<MovementWithItem[]>([]);
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [directionTab, setDirectionTab] = useState<'All' | 'In' | 'Out' | 'Adjustment'>('All');
  const [detailGroup, setDetailGroup] = useState<OrderGroup | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [movRes, itemRes] = await Promise.all([
      supabase.from('stock_movements')
        .select('*, stock_items(stock_item, description, current_quantity)')
        .order('movement_date', { ascending: false })
        .limit(500),
      supabase.from('stock_items').select('*').eq('active', true).order('category').order('stock_item'),
    ]);
    setMovements(movRes.data || []);
    setItems(itemRes.data || []);
    setLoading(false);
  }

  const groups = useMemo(() => buildGroups(movements), [movements]);

  const directionCounts = useMemo(() => {
    const counts = { All: groups.length, In: 0, Out: 0, Adjustment: 0 };
    groups.forEach(g => {
      if (INCREASE_TYPES.includes(g.movementType)) counts.In++;
      else if (DECREASE_TYPES.includes(g.movementType)) counts.Out++;
      else counts.Adjustment++;
    });
    return counts;
  }, [groups]);

  const filtered = useMemo(() => {
    return groups.filter(g => {
      const q = search.toLowerCase();
      const matchType = filterType === 'All' || g.movementType === filterType;
      const matchDir =
        directionTab === 'All' ||
        (directionTab === 'In' && INCREASE_TYPES.includes(g.movementType)) ||
        (directionTab === 'Out' && DECREASE_TYPES.includes(g.movementType)) ||
        (directionTab === 'Adjustment' && EITHER_TYPES.includes(g.movementType));
      const matchSearch = !q ||
        g.reference.toLowerCase().includes(q) ||
        g.supplierClient.toLowerCase().includes(q) ||
        g.label.toLowerCase().includes(q) ||
        g.movementType.toLowerCase().includes(q) ||
        g.lines.some(l =>
          (l.stock_code || '').toLowerCase().includes(q) ||
          (l.stock_items?.stock_item || '').toLowerCase().includes(q)
        );
      return matchType && matchDir && matchSearch;
    });
  }, [groups, search, filterType, directionTab]);

  if (detailGroup) {
    return <OrderDetail group={detailGroup} onBack={() => setDetailGroup(null)} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Movements</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} order{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadCSV(
              filtered.flatMap(g => g.lines.map(l => ({
                Date: l.movement_date,
                'Stock Item': l.stock_items?.stock_item || '',
                'Stock Code': l.stock_code || '',
                Type: l.movement_type,
                Quantity: l.quantity,
                Reference: l.reference_number || '',
                'Supplier/Client': l.supplier_client_department || '',
                'Captured By': l.captured_by || '',
                Notes: l.notes || '',
              }))),
              'stock-movements'
            )}
            className="flex items-center gap-1.5 text-sm border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg font-medium transition-colors shadow-sm"
            title="Export to CSV"
          >
            <Download size={14} /> <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center justify-center sm:justify-start gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus size={16} /> <span className="hidden sm:inline">Record Movement</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {([
          { key: 'All', label: 'All' },
          { key: 'In', label: 'Stock In' },
          { key: 'Out', label: 'Stock Out' },
          { key: 'Adjustment', label: 'Adjustments' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setDirectionTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              directionTab === key
                ? key === 'In' ? 'bg-emerald-600 text-white shadow-sm'
                  : key === 'Out' ? 'bg-red-600 text-white shadow-sm'
                  : key === 'Adjustment' ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-gray-800 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              directionTab === key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>{directionCounts[key]}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search reference, supplier, item..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white w-full sm:w-auto">
          <option value="All">All Movement Types</option>
          {MOVEMENT_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No movements found</div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider w-36">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider">Type / Label</th>
                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider w-36">Reference</th>
                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider w-40">Supplier / Client</th>
                    <th className="text-center px-4 py-3 font-medium text-xs uppercase tracking-wider w-20">Items</th>
                    <th className="text-center px-4 py-3 font-medium text-xs uppercase tracking-wider w-24 bg-gray-900">Total Qty</th>
                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider w-28">Captured By</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((g, idx) => {
                    const c = directionColor(g.movementType);
                    return (
                      <tr
                        key={g.groupId}
                        className={`hover:bg-emerald-50/40 transition-colors cursor-pointer group ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                        onClick={() => setDetailGroup(g)}
                      >
                        <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(g.date).toLocaleDateString()}<br />
                          <span className="text-gray-400">{new Date(g.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <GroupTypeIcon type={g.movementType} />
                            <div>
                              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium ${c.badge}`}>
                                <MovementIcon type={g.movementType} />
                                {g.movementType}
                              </span>
                              {g.isGroup && g.label !== g.movementType && (
                                <p className="text-xs text-gray-500 mt-0.5">{g.label}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-700 font-mono">{g.reference || '—'}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-600">{g.supplierClient || '—'}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-semibold">{g.itemCount}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold text-gray-900 bg-gray-50/60">
                          <span className={INCREASE_TYPES.includes(g.movementType) ? 'text-emerald-700' : DECREASE_TYPES.includes(g.movementType) ? 'text-red-600' : 'text-amber-700'}>
                            {INCREASE_TYPES.includes(g.movementType) ? '+' : DECREASE_TYPES.includes(g.movementType) ? '-' : ''}{g.totalQty}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-600">{g.capturedBy || '—'}</td>
                        <td className="px-4 py-2.5 text-center">
                          <ChevronRight size={15} className="text-gray-400 group-hover:text-emerald-600 transition-colors" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {filtered.map(g => {
                const c = directionColor(g.movementType);
                const qtySign = INCREASE_TYPES.includes(g.movementType) ? '+' : DECREASE_TYPES.includes(g.movementType) ? '-' : '';
                const qtyColor = INCREASE_TYPES.includes(g.movementType) ? 'text-emerald-700' : DECREASE_TYPES.includes(g.movementType) ? 'text-red-600' : 'text-amber-700';
                return (
                  <div
                    key={g.groupId}
                    className="p-4 hover:bg-emerald-50/40 transition-colors cursor-pointer"
                    onClick={() => setDetailGroup(g)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <GroupTypeIcon type={g.movementType} />
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${c.badge}`}>
                          <MovementIcon type={g.movementType} />
                          {g.movementType}
                        </span>
                      </div>
                      <span className={`text-sm font-bold flex-shrink-0 ${qtyColor}`}>
                        {qtySign}{g.totalQty}
                      </span>
                    </div>
                    {g.isGroup && g.label !== g.movementType && (
                      <p className="text-xs text-gray-500 mb-1 ml-6">{g.label}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                      <span>{new Date(g.date).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1.5">
                        {g.reference && <span className="font-mono text-gray-500">{g.reference}</span>}
                        <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-semibold">{g.itemCount} item{g.itemCount !== 1 ? 's' : ''}</span>
                        <ChevronRight size={13} className="text-gray-300" />
                      </span>
                    </div>
                    {g.supplierClient && (
                      <p className="text-xs text-gray-400 mt-0.5">{g.supplierClient}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {showAdd && (
        <MovementFormModal
          items={items}
          onClose={() => setShowAdd(false)}
          onSave={() => { setShowAdd(false); addToast('Movement recorded'); load(); }}
        />
      )}
    </div>
  );
}
