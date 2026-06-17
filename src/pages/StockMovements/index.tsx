import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal, ChevronRight, Package, ArrowLeftRight, ClipboardCheck, Download } from 'lucide-react';
import { supabase, StockItem } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useToast } from '../../lib/toast';
import { useUser } from '../../lib/UserContext';
import { downloadCSV } from '../../lib/csvExport';
import { PageHeader, Button, Toolbar, SearchInput, FilterSelect, FilterTabs } from '../../components/ui';
import { MOVEMENT_TYPES, INCREASE_TYPES, DECREASE_TYPES, EITHER_TYPES, MovementWithItem, OrderGroup, buildGroups, directionColor } from './constants';
import { MovementIcon } from './MovementIcon';
import OrderDetail from './OrderDetail';
import AdjustStockModal from './AdjustStockModal';

function GroupTypeIcon({ type }: { type: string }) {
  if (type === 'Stock Take Correction') return <ClipboardCheck size={15} className="text-amber-600" />;
  if (INCREASE_TYPES.includes(type)) return <Package size={15} className="text-emerald-600" />;
  if (DECREASE_TYPES.includes(type)) return <ArrowLeftRight size={15} className="text-red-500" />;
  return <ArrowLeftRight size={15} className="text-amber-500" />;
}

export default function StockMovements() {
  usePageTitle('Stock — Movements');
  const { addToast } = useToast();
  const { isAdmin } = useUser();
  const navigate = useNavigate();
  const [movements, setMovements] = useState<MovementWithItem[]>([]);
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdjust, setShowAdjust] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [directionTab, setDirectionTab] = useState<'All' | 'In' | 'Out' | 'Adjustment'>('All');
  const [detailGroup, setDetailGroup] = useState<OrderGroup | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    let movQuery = supabase.from('stock_movements')
      .select('*, stock_items(stock_item, description, current_quantity)')
      .order('movement_date', { ascending: false });
    if (fromDate) movQuery = movQuery.gte('movement_date', new Date(`${fromDate}T00:00:00`).toISOString());
    if (toDate) movQuery = movQuery.lt('movement_date', new Date(new Date(`${toDate}T00:00:00`).getTime() + 24 * 60 * 60 * 1000).toISOString());
    if (!fromDate && !toDate) movQuery = movQuery.limit(500);
    const [movRes, itemRes] = await Promise.all([
      movQuery,
      supabase.from('stock_items').select('*').eq('active', true).order('category').order('stock_item'),
    ]);
    setMovements(movRes.data || []);
    setItems(itemRes.data || []);
    setLoading(false);
  }, [fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

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

  // Clicking a movement opens its source record where one exists (orders, receipts,
  // stock-take sessions). Otherwise (manual adjustments, legacy data) fall back to
  // the inline movement-group detail.
  async function openGroup(g: OrderGroup) {
    if (g.movementType === 'Customer Delivery') {
      const { data } = await supabase.from('stock_orders').select('id').eq('movement_group_id', g.groupId).maybeSingle();
      if (data?.id) { navigate('/stock/orders', { state: { openOrderId: data.id } }); return; }
    } else if (g.movementType === 'Stock Received') {
      const { data } = await supabase.from('stock_receipts').select('id').eq('movement_group_id', g.groupId).maybeSingle();
      if (data?.id) { navigate('/stock/received', { state: { openReceiptId: data.id } }); return; }
    } else if (g.movementType === 'Stock Take Correction') {
      // A label-backfilled group can map to >1 legacy session (duplicate names) —
      // take the first match rather than erroring on multiple rows.
      const { data } = await supabase.from('stock_take_sessions').select('id').eq('correction_movement_group_id', g.groupId).limit(1);
      if (data && data.length) { navigate('/stock/stock-take', { state: { openSessionId: data[0].id } }); return; }
    }
    setDetailGroup(g);
  }

  if (detailGroup) {
    return <OrderDetail group={detailGroup} onBack={() => setDetailGroup(null)} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Stock Movements"
        subtitle={`${filtered.length} order${filtered.length !== 1 ? 's' : ''}`}
        accent="emerald"
        actions={
          <>
            <Button
              variant="secondary"
              icon={Download}
              hideLabelOnMobile
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
            >Export</Button>
            {isAdmin && (
              <Button variant="primary" accent="emerald" icon={SlidersHorizontal} hideLabelOnMobile onClick={() => setShowAdjust(true)}>Adjust Stock</Button>
            )}
          </>
        }
      />

      <FilterTabs
        accent="emerald"
        value={directionTab}
        onChange={v => setDirectionTab(v as 'All' | 'In' | 'Out' | 'Adjustment')}
        tabs={[
          { value: 'All', label: 'All', count: directionCounts.All },
          { value: 'In', label: 'Stock In', count: directionCounts.In },
          { value: 'Out', label: 'Stock Out', count: directionCounts.Out },
          { value: 'Adjustment', label: 'Adjustments', count: directionCounts.Adjustment },
        ]}
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search reference, supplier, item…" />
        <FilterSelect value={filterType} onChange={setFilterType} accent="emerald">
          <option value="All">All Movement Types</option>
          {[...MOVEMENT_TYPES, 'Customer Delivery'].map(t => <option key={t}>{t}</option>)}
        </FilterSelect>
        <div className="flex items-center gap-2">
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" title="From date" />
          <span className="text-xs text-gray-400">to</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" title="To date" />
        </div>
      </Toolbar>

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
                        onClick={() => openGroup(g)}
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
                    onClick={() => openGroup(g)}
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

      {showAdjust && (
        <AdjustStockModal
          items={items}
          onClose={() => setShowAdjust(false)}
          onSave={() => { setShowAdjust(false); addToast('Stock adjustment recorded'); load(); }}
        />
      )}
    </div>
  );
}
