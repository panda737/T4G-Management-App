import { useEffect, useState, useMemo, useCallback } from 'react';
import { Printer, Download, FileBarChart, ArrowDownToLine, ArrowUpFromLine, Truck } from 'lucide-react';
import { supabase, StockOrder, StockOrderItem, Client } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { downloadCSV } from '../../lib/csvExport';
import { PageSpinner } from '../../components/Spinner';
import { buildGroups, MovementWithItem, INCREASE_TYPES, directionColor, qtySign } from '../StockMovements/constants';
import { DeliveryNoteSheet } from '../StockOrders/DeliveryNotePrint';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function StockDayEnd() {
  usePageTitle('Stock — Day-End Report');
  const { profile } = useUser();
  const [date, setDate] = useState(todayStr());
  const [movements, setMovements] = useState<MovementWithItem[]>([]);
  const [completedOrders, setCompletedOrders] = useState<StockOrder[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, StockOrderItem[]>>({});
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    // local day boundaries → ISO, since movement_date/confirmed_at are timestamptz
    const dayStart = new Date(`${date}T00:00:00`).toISOString();
    const dayEnd = new Date(new Date(`${date}T00:00:00`).getTime() + 24 * 60 * 60 * 1000).toISOString();

    const [movRes, ordersRes, clientsRes] = await Promise.all([
      supabase.from('stock_movements')
        .select('*, stock_items(stock_item, description, current_quantity)')
        .gte('movement_date', dayStart)
        .lt('movement_date', dayEnd)
        .order('movement_date', { ascending: false }),
      supabase.from('stock_orders')
        .select('*')
        .eq('status', 'Completed')
        .gte('confirmed_at', dayStart)
        .lt('confirmed_at', dayEnd)
        .order('confirmed_at'),
      supabase.from('clients').select('*'),
    ]);

    const orders: StockOrder[] = ordersRes.data || [];
    setMovements(movRes.data || []);
    setCompletedOrders(orders);
    setClients(clientsRes.data || []);

    if (orders.length > 0) {
      const { data: itemsData } = await supabase
        .from('stock_order_items')
        .select('*')
        .in('order_id', orders.map(o => o.id))
        .order('line_no');
      const byOrder: Record<string, StockOrderItem[]> = {};
      (itemsData || []).forEach(i => {
        (byOrder[i.order_id] = byOrder[i.order_id] || []).push(i);
      });
      setOrderItems(byOrder);
    } else {
      setOrderItems({});
    }
    setLoading(false);
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => buildGroups(movements), [movements]);

  const totals = useMemo(() => {
    let unitsIn = 0, unitsOut = 0;
    movements.forEach(m => {
      const qty = Math.abs(m.quantity);
      if (INCREASE_TYPES.includes(m.movement_type) || (!['Stock Issued', 'Stock Damaged', 'Customer Delivery'].includes(m.movement_type) && m.quantity > 0)) {
        unitsIn += qty;
      } else {
        unitsOut += qty;
      }
    });
    return { unitsIn, unitsOut, deliveries: completedOrders.length };
  }, [movements, completedOrders]);

  function exportMovementsCSV() {
    const rows = movements.map(m => ({
      'Date/Time': new Date(m.movement_date).toLocaleString(),
      'Type': m.movement_type,
      'Stock Code': m.stock_code,
      'Item': m.stock_items?.stock_item || '',
      'Quantity': m.quantity,
      'Reference': m.reference_number,
      'Supplier/Client/Dept': m.supplier_client_department,
      'Captured By': m.captured_by,
      'Notes': m.notes,
    }));
    downloadCSV(rows, `stock-day-end-${date}`);
  }

  const reportDate = new Date(`${date}T00:00:00`).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const generatedBy = profile?.display_name || '';
  const podCount = completedOrders.filter(o => o.signed_note_path).length;

  return (
    <div className="space-y-5">
      {/* Screen header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Day-End Report</h1>
          <p className="text-sm text-gray-500 mt-1">Daily movement summary &amp; delivery notes — finance pack</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
          <button
            onClick={exportMovementsCSV}
            disabled={movements.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={() => window.print()}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-semibold shadow-sm disabled:opacity-50"
          >
            <Printer size={14} /> Print Finance Pack
          </button>
        </div>
      </div>

      {loading ? (
        <PageSpinner />
      ) : (
        <>
          {/* ====== SCREEN + PRINT PAGE 1: summary ====== */}
          <div className="print:block">
            {/* Print-only letterhead */}
            <div className="hidden print:flex items-start justify-between border-b-2 border-gray-900 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <img src="/T4G_Small_Logo.png" alt="Tech4Green" className="w-14 h-14 object-contain" />
                <div>
                  <p className="text-xl font-extrabold tracking-tight">Tech4Green</p>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500">Management Platform</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold tracking-tight">DAY-END STOCK REPORT</p>
                <p className="text-sm font-semibold mt-0.5">{reportDate}</p>
                <p className="text-[10px] text-gray-500 mt-1">
                  Generated {new Date().toLocaleString()}{generatedBy ? ` by ${generatedBy}` : ''}
                </p>
              </div>
            </div>

            {/* Totals */}
            <div className="grid grid-cols-3 gap-4 mb-5 print:mb-4">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 print:shadow-none print:rounded print:border-gray-300">
                <div className="flex items-center gap-2 text-emerald-600 mb-1 print:text-gray-700">
                  <ArrowDownToLine size={15} />
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Units In</p>
                </div>
                <p className="text-2xl font-extrabold text-gray-900">{totals.unitsIn}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 print:shadow-none print:rounded print:border-gray-300">
                <div className="flex items-center gap-2 text-red-600 mb-1 print:text-gray-700">
                  <ArrowUpFromLine size={15} />
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Units Out</p>
                </div>
                <p className="text-2xl font-extrabold text-gray-900">{totals.unitsOut}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 print:shadow-none print:rounded print:border-gray-300">
                <div className="flex items-center gap-2 text-blue-600 mb-1 print:text-gray-700">
                  <Truck size={15} />
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Deliveries Confirmed</p>
                </div>
                <p className="text-2xl font-extrabold text-gray-900">{totals.deliveries}</p>
              </div>
            </div>

            {/* Movements summary */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-5 print:shadow-none print:rounded print:border-gray-300 print:mb-4">
              <div className="px-4 py-3 border-b border-gray-100 print:border-gray-300">
                <p className="text-sm font-bold text-gray-900">Stock Movements — {new Date(`${date}T00:00:00`).toLocaleDateString()}</p>
                <p className="text-xs text-gray-400">{movements.length} movement line{movements.length !== 1 ? 's' : ''} in {groups.length} entr{groups.length !== 1 ? 'ies' : 'y'}</p>
              </div>
              {movements.length === 0 ? (
                <div className="py-10 text-center">
                  <FileBarChart size={28} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">No stock movements recorded on this day.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-800 text-white text-xs uppercase tracking-wider print:bg-white print:text-gray-900 print:border-y-2 print:border-gray-900">
                        <th className="text-left px-4 py-2.5 font-medium w-20">Time</th>
                        <th className="text-left px-4 py-2.5 font-medium w-44">Type</th>
                        <th className="text-left px-4 py-2.5 font-medium">Items</th>
                        <th className="text-left px-4 py-2.5 font-medium w-32">Reference</th>
                        <th className="text-left px-4 py-2.5 font-medium w-40">Supplier / Client / Dept</th>
                        <th className="text-center px-4 py-2.5 font-medium w-20">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {groups.map(g => (
                        <tr key={g.groupId}>
                          <td className="px-4 py-2 text-xs text-gray-500 align-top">{new Date(g.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="px-4 py-2 align-top">
                            <span className={`text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap print:border-0 print:bg-white print:px-0 print:font-semibold ${directionColor(g.movementType).badge}`}>
                              {g.movementType}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-xs text-gray-700 align-top">
                            {g.lines.map(l => (
                              <p key={l.id}>
                                {l.stock_items?.stock_item || l.stock_code || '(item)'}
                                <span className="text-gray-400"> × {Math.abs(l.quantity)}</span>
                              </p>
                            ))}
                          </td>
                          <td className="px-4 py-2 text-xs font-mono text-gray-500 align-top">{g.reference || '—'}</td>
                          <td className="px-4 py-2 text-xs text-gray-600 align-top">{g.supplierClient || '—'}</td>
                          <td className="px-4 py-2 text-center text-xs font-bold align-top whitespace-nowrap">
                            {g.lines.length === 1 ? qtySign(g.movementType, g.lines[0].quantity) : `${g.totalQty} total`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Delivery notes list */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden print:shadow-none print:rounded print:border-gray-300" style={{ breakAfter: completedOrders.length > 0 ? 'page' : 'auto' }}>
              <div className="px-4 py-3 border-b border-gray-100 print:border-gray-300">
                <p className="text-sm font-bold text-gray-900">Deliveries Confirmed Today</p>
                <p className="text-xs text-gray-400">{completedOrders.length} delivery note{completedOrders.length !== 1 ? 's' : ''} · {podCount} with signed POD on file{completedOrders.length > 0 ? ' · finance copies attached on the following pages' : ''}</p>
              </div>
              {completedOrders.length === 0 ? (
                <div className="py-10 text-center">
                  <Truck size={28} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">No deliveries were confirmed on this day.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-800 text-white text-xs uppercase tracking-wider print:bg-white print:text-gray-900 print:border-y-2 print:border-gray-900">
                        <th className="text-left px-4 py-2.5 font-medium w-32">DN No</th>
                        <th className="text-left px-4 py-2.5 font-medium">Client</th>
                        <th className="text-center px-4 py-2.5 font-medium w-20">Items</th>
                        <th className="text-center px-4 py-2.5 font-medium w-28">Units Delivered</th>
                        <th className="text-center px-4 py-2.5 font-medium w-24">Variances</th>
                        <th className="text-center px-4 py-2.5 font-medium w-24">Signed POD</th>
                        <th className="text-left px-4 py-2.5 font-medium w-28">Confirmed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {completedOrders.map(o => {
                        const items = orderItems[o.id] || [];
                        const variances = items.filter(i => i.qty_delivered !== null && i.qty_delivered !== i.qty_ordered).length;
                        return (
                          <tr key={o.id}>
                            <td className="px-4 py-2 font-mono text-xs font-semibold">{o.order_number}</td>
                            <td className="px-4 py-2 text-gray-900">{o.client_name}</td>
                            <td className="px-4 py-2 text-center text-xs">{items.length}</td>
                            <td className="px-4 py-2 text-center text-xs font-bold">{items.reduce((s, i) => s + (i.qty_delivered ?? 0), 0)}</td>
                            <td className={`px-4 py-2 text-center text-xs font-semibold ${variances > 0 ? 'text-amber-700' : 'text-gray-400'}`}>{variances > 0 ? variances : '—'}</td>
                            <td className={`px-4 py-2 text-center text-xs font-semibold ${o.signed_note_path ? 'text-emerald-700' : 'text-red-600'}`}>{o.signed_note_path ? 'Yes' : 'No'}</td>
                            <td className="px-4 py-2 text-xs text-gray-500">{o.confirmed_at ? new Date(o.confirmed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ====== PRINT ONLY: finance copy per delivery ====== */}
          <div className="hidden print:block">
            {completedOrders.map(o => (
              <DeliveryNoteSheet
                key={o.id}
                order={o}
                items={orderItems[o.id] || []}
                copyLabel="FINANCE COPY"
                showDelivered
                client={clients.find(c => c.id === o.client_id) || null}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
