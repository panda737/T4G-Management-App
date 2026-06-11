import { useEffect, useState, useMemo, useCallback } from 'react';
import { Download, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { supabase, StockItem, StockMovement, getStockStatus } from '../lib/supabase';
import { usePageTitle } from '../lib/usePageTitle';
import { downloadCSV } from '../lib/csvExport';
import StatusBadge from '../components/StatusBadge';
import { PageSpinner } from '../components/Spinner';

function daysAgoStr(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function Reports() {
  usePageTitle('Stock — Reports');
  const [items, setItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'movements' | 'variance'>('overview');
  const [fromDate, setFromDate] = useState(daysAgoStr(30));
  const [toDate, setToDate] = useState(daysAgoStr(0));

  const load = useCallback(async () => {
    setLoading(true);
    let movQuery = supabase.from('stock_movements').select('*').order('movement_date', { ascending: false });
    if (fromDate) movQuery = movQuery.gte('movement_date', new Date(`${fromDate}T00:00:00`).toISOString());
    if (toDate) movQuery = movQuery.lt('movement_date', new Date(new Date(`${toDate}T00:00:00`).getTime() + 24 * 60 * 60 * 1000).toISOString());
    const [itemsRes, movRes] = await Promise.all([
      supabase.from('stock_items').select('*').eq('active', true).order('category').order('stock_item'),
      movQuery,
    ]);
    setItems(itemsRes.data || []);
    setMovements(movRes.data || []);
    setLoading(false);
  }, [fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const byCategory = useMemo(() => {
    const map: Record<string, StockItem[]> = {};
    items.forEach(i => { if (!map[i.category]) map[i.category] = []; map[i.category].push(i); });
    return map;
  }, [items]);

  const lowStockItems = useMemo(() => items.filter(i => getStockStatus(i) === 'Low Stock'), [items]);
  const outOfStockItems = useMemo(() => items.filter(i => getStockStatus(i) === 'Out of Stock'), [items]);

  const movementsByType = useMemo(() => {
    const map: Record<string, number> = {};
    movements.forEach(m => { map[m.movement_type] = (map[m.movement_type] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [movements]);

  function exportStockList() {
    downloadCSV(items.map(i => ({
      stock_code: i.stock_code,
      stock_item: i.stock_item,
      category: i.category,
      description: i.description,
      unit_of_measure: i.unit_of_measure,
      current_quantity: i.current_quantity,
      minimum_stock_level: i.minimum_stock_level,
      maximum_stock_level: i.maximum_stock_level,
      status: getStockStatus(i),
    })), `tech4green_stock_list_${new Date().toISOString().slice(0, 10)}`);
  }

  function exportMovements() {
    downloadCSV(movements.map(m => ({
      date: new Date(m.movement_date).toLocaleDateString(),
      stock_code: m.stock_code,
      movement_type: m.movement_type,
      quantity: m.quantity,
      reference: m.reference_number,
      supplier_client: m.supplier_client_department,
      captured_by: m.captured_by,
      notes: m.notes,
    })), `tech4green_movements_${fromDate}_to_${toDate}`);
  }

  const tabs = [
    { id: 'overview', label: 'Stock Overview' },
    { id: 'movements', label: 'Movement Summary' },
    { id: 'variance', label: 'Stock Alerts' },
  ] as const;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Stock data overview and exports</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button onClick={exportStockList} className="flex items-center justify-center sm:justify-start gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-xs font-medium transition-colors shadow-sm">
            <Download size={13} /> <span className="hidden sm:inline">Export Stock List</span>
          </button>
          <button onClick={exportMovements} className="flex items-center justify-center sm:justify-start gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-xs font-medium transition-colors shadow-sm">
            <Download size={13} /> <span className="hidden sm:inline">Export Movements</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm flex flex-col sm:flex-row gap-3 sm:items-center">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex-shrink-0">Movement period</p>
        <div className="flex items-center gap-2">
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
          <span className="text-xs text-gray-400">to</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
        </div>
        <p className="text-xs text-gray-400">{movements.length} movement{movements.length !== 1 ? 's' : ''} in range</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <PageSpinner />
      ) : activeTab === 'overview' ? (
        <div className="space-y-4">
          {Object.entries(byCategory).map(([cat, catItems]) => (
            <div key={cat} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
              <div className="px-5 py-3 bg-gray-100 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{cat}</span>
                <span className="text-xs text-gray-500">{catItems.length} items</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-800 text-white">
                      <th className="text-left px-5 py-2.5 font-medium text-xs uppercase tracking-wider w-28">Code</th>
                      <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wider">Description</th>
                      <th className="text-center px-4 py-2.5 font-medium text-xs uppercase tracking-wider w-24 bg-gray-900">Qty</th>
                      <th className="text-center px-4 py-2.5 font-medium text-xs uppercase tracking-wider w-16">Min</th>
                      <th className="text-center px-4 py-2.5 font-medium text-xs uppercase tracking-wider w-16">Max</th>
                      <th className="text-center px-4 py-2.5 font-medium text-xs uppercase tracking-wider w-28">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {catItems.map((item, idx) => (
                      <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="px-5 py-2 font-mono text-xs text-gray-600">{item.stock_code || '—'}</td>
                        <td className="px-4 py-2 text-gray-700 text-xs">{item.description}</td>
                        <td className="px-4 py-2 text-center font-semibold text-gray-900 bg-gray-50">{item.current_quantity}</td>
                        <td className="px-4 py-2 text-center text-xs text-gray-500">{item.minimum_stock_level}</td>
                        <td className="px-4 py-2 text-center text-xs text-gray-500">{item.maximum_stock_level}</td>
                        <td className="px-4 py-2 text-center"><StatusBadge status={getStockStatus(item)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'movements' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2"><TrendingUp size={15} className="text-emerald-600" /> Movements by Type</h2>
            <div className="space-y-2">
              {movementsByType.map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{type}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-100 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min((count / Math.max(...movementsByType.map(([,c]) => c))) * 100, 100)}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-6 text-right">{count}</span>
                  </div>
                </div>
              ))}
              {movementsByType.length === 0 && <p className="text-sm text-gray-400">No movements recorded</p>}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-4">Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-gray-600">Total Movements</span><span className="font-semibold">{movements.length}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">Active Stock Items</span><span className="font-semibold">{items.length}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">Out of Stock</span><span className="font-semibold text-red-600">{outOfStockItems.length}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">Low Stock</span><span className="font-semibold text-amber-600">{lowStockItems.length}</span></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {outOfStockItems.length > 0 && (
            <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-x-auto">
              <div className="px-5 py-3 bg-red-50 border-b border-red-200 flex items-center gap-2">
                <AlertTriangle size={15} className="text-red-600" />
                <span className="text-sm font-semibold text-red-700">Out of Stock ({outOfStockItems.length})</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-800 text-white"><th className="text-left px-5 py-2 font-medium text-xs uppercase tracking-wider w-28">Code</th><th className="text-left px-4 py-2 font-medium text-xs uppercase tracking-wider">Item</th><th className="text-left px-4 py-2 font-medium text-xs uppercase tracking-wider">Category</th><th className="text-center px-4 py-2 font-medium text-xs uppercase tracking-wider w-20 bg-gray-900">Qty</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {outOfStockItems.map((item, idx) => (
                      <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="px-5 py-2 font-mono text-xs text-gray-600">{item.stock_code || '—'}</td>
                        <td className="px-4 py-2 text-xs text-gray-700">{item.stock_item}</td>
                        <td className="px-4 py-2 text-xs text-gray-500">{item.category}</td>
                        <td className="px-4 py-2 text-center font-bold text-red-600 bg-gray-50">{item.current_quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {lowStockItems.length > 0 && (
            <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-x-auto">
              <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
                <TrendingDown size={15} className="text-amber-600" />
                <span className="text-sm font-semibold text-amber-700">Low Stock ({lowStockItems.length})</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-800 text-white"><th className="text-left px-5 py-2 font-medium text-xs uppercase tracking-wider w-28">Code</th><th className="text-left px-4 py-2 font-medium text-xs uppercase tracking-wider">Item</th><th className="text-left px-4 py-2 font-medium text-xs uppercase tracking-wider">Category</th><th className="text-center px-4 py-2 font-medium text-xs uppercase tracking-wider w-20 bg-gray-900">Qty</th><th className="text-center px-4 py-2 font-medium text-xs uppercase tracking-wider w-20">Min</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {lowStockItems.map((item, idx) => (
                      <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="px-5 py-2 font-mono text-xs text-gray-600">{item.stock_code || '—'}</td>
                        <td className="px-4 py-2 text-xs text-gray-700">{item.stock_item}</td>
                        <td className="px-4 py-2 text-xs text-gray-500">{item.category}</td>
                        <td className="px-4 py-2 text-center font-bold text-amber-700 bg-gray-50">{item.current_quantity}</td>
                        <td className="px-4 py-2 text-center text-xs text-gray-500">{item.minimum_stock_level}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {outOfStockItems.length === 0 && lowStockItems.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
              <p className="text-emerald-600 font-medium text-sm">All stock items are healthy!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
