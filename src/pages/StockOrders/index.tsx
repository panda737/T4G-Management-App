import { useEffect, useState, useMemo, useCallback } from 'react';
import { Plus, ClipboardList, ChevronRight } from 'lucide-react';
import { supabase, StockOrder, StockOrderItem, StockItem, Client, ClientSite, StockOrderStatus, ORDER_STATUS_COLORS } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useToast } from '../../lib/toast';
import { useUser } from '../../lib/UserContext';
import { PageSpinner } from '../../components/Spinner';
import { PageHeader, Button, Toolbar, SearchInput, FilterTabs } from '../../components/ui';
import { ORDER_STATUSES } from './constants';
import OrderFormModal from './OrderFormModal';
import OrderDetailView from './OrderDetailView';

type Tab = StockOrderStatus | 'All';
const TABS: Tab[] = ['Open', 'Dispatched', 'Awaiting Confirmation', 'Completed', 'Cancelled', 'All'];

export default function StockOrders() {
  usePageTitle('Stock — Orders & Deliveries');
  const { addToast } = useToast();
  const { canWrite } = useUser();
  const canWriteStock = canWrite('stock');
  const [orders, setOrders] = useState<StockOrder[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sites, setSites] = useState<ClientSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('Open');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailItems, setDetailItems] = useState<StockOrderItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [ordersRes, itemsRes, stockRes, clientsRes, sitesRes] = await Promise.all([
      supabase.from('stock_orders').select('*').order('created_at', { ascending: false }),
      supabase.from('stock_order_items').select('order_id'),
      supabase.from('stock_items').select('*').order('stock_item'),
      supabase.from('clients').select('*').order('client_name'),
      supabase.from('client_sites').select('*').eq('active', true).order('generator_facility'),
    ]);
    setOrders(ordersRes.data || []);
    const counts: Record<string, number> = {};
    (itemsRes.data || []).forEach((row: { order_id: string }) => {
      counts[row.order_id] = (counts[row.order_id] || 0) + 1;
    });
    setItemCounts(counts);
    setStockItems(stockRes.data || []);
    setClients(clientsRes.data || []);
    setSites(sitesRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadDetail = useCallback(async (orderId: string) => {
    setDetailLoading(true);
    const { data } = await supabase
      .from('stock_order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('line_no');
    setDetailItems(data || []);
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: orders.length };
    ORDER_STATUSES.forEach(s => { c[s] = 0; });
    orders.forEach(o => { c[o.status] = (c[o.status] || 0) + 1; });
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter(o => {
      if (tab !== 'All' && o.status !== tab) return false;
      if (!q) return true;
      return `${o.order_number} ${o.client_name} ${o.customer_reference}`.toLowerCase().includes(q);
    });
  }, [orders, tab, search]);

  const selectedOrder = orders.find(o => o.id === selectedId) || null;

  if (selectedOrder) {
    if (detailLoading) return <PageSpinner />;
    return (
      <OrderDetailView
        order={selectedOrder}
        items={detailItems}
        client={clients.find(c => c.id === selectedOrder.client_id) || null}
        site={sites.find(s => s.id === selectedOrder.site_id) || null}
        stockItems={stockItems}
        clients={clients}
        sites={sites}
        onBack={() => setSelectedId(null)}
        onChanged={async () => { await load(); loadDetail(selectedOrder.id); }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Orders & Deliveries"
        subtitle="Customer orders, delivery notes and proof-of-delivery confirmation"
        accent="emerald"
        actions={canWriteStock ? <Button variant="primary" accent="emerald" icon={Plus} onClick={() => setShowForm(true)}>Load Order</Button> : undefined}
      />

      <FilterTabs
        accent="emerald"
        value={tab}
        onChange={v => setTab(v as Tab)}
        tabs={TABS.map(t => ({ value: t, label: t, count: counts[t] ?? 0 }))}
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search delivery note no, client, customer ref…" />
      </Toolbar>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <PageSpinner />
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <ClipboardList size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 font-medium mb-1">
              {search ? 'No orders match your search' : tab === 'All' ? 'No orders yet' : `No ${tab.toLowerCase()} orders`}
            </p>
            {!search && tab === 'Open' && canWriteStock && (
              <>
                <p className="text-xs text-gray-400 mb-4">Load a customer order to generate its delivery note.</p>
                <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                  <Plus size={15} /> Load your first order
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider w-32">DN No</th>
                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider w-28">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider">Client</th>
                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider">Site</th>
                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider w-32">Customer Ref</th>
                    <th className="text-center px-4 py-3 font-medium text-xs uppercase tracking-wider w-16">Items</th>
                    <th className="text-center px-4 py-3 font-medium text-xs uppercase tracking-wider w-44">Status</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((o, idx) => (
                    <tr
                      key={o.id}
                      onClick={() => setSelectedId(o.id)}
                      className={`hover:bg-emerald-50/40 transition-colors cursor-pointer group ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                    >
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold text-gray-900">{o.order_number}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{new Date(o.order_date).toLocaleDateString()}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{o.client_name}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{o.site_name || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">{o.customer_reference || '—'}</td>
                      <td className="px-4 py-2.5 text-center text-xs font-semibold text-gray-700">{itemCounts[o.id] ?? 0}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${ORDER_STATUS_COLORS[o.status]}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <ChevronRight size={14} className="text-gray-300 group-hover:text-emerald-600 transition-colors inline" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {filtered.map(o => (
                <div key={o.id} className="p-4 hover:bg-emerald-50/40 transition-colors cursor-pointer" onClick={() => setSelectedId(o.id)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-bold text-gray-900">{o.order_number}</p>
                      <p className="text-sm text-gray-700 mt-0.5">{o.client_name}</p>
                      {o.site_name && <p className="text-xs text-gray-500">{o.site_name}</p>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${ORDER_STATUS_COLORS[o.status]}`}>
                      {o.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {new Date(o.order_date).toLocaleDateString()} · {itemCounts[o.id] ?? 0} item{(itemCounts[o.id] ?? 0) !== 1 ? 's' : ''}
                    {o.customer_reference && ` · ref ${o.customer_reference}`}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showForm && (
        <OrderFormModal
          items={stockItems}
          clients={clients}
          sites={sites}
          onClose={() => setShowForm(false)}
          onSave={() => { setShowForm(false); addToast('Order loaded — delivery note ready to print'); load(); }}
        />
      )}
    </div>
  );
}
