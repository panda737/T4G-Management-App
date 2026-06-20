import { useEffect, useState, useMemo, useCallback } from 'react';
import { Download, FileBarChart, ArrowDownToLine, ArrowUpFromLine, Truck, FileDown } from 'lucide-react';
import { supabase, StockOrder, StockOrderItem, Client, type ClientSite } from '../../lib/supabase';
import { useToast } from '../../lib/toast';
import { exportToXlsx } from '../../lib/xlsxExport';
import { deliveryNotesToBlob } from '../../lib/deliveryNotePdf';
import { PageSpinner } from '../../components/Spinner';
import { buildGroups, MovementWithItem, INCREASE_TYPES, directionColor, qtySign } from '../StockMovements/constants';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function FinanceReport() {
  const { addToast } = useToast();
  const [date, setDate] = useState(todayStr());
  const [movements, setMovements] = useState<MovementWithItem[]>([]);
  const [completedOrders, setCompletedOrders] = useState<StockOrder[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, StockOrderItem[]>>({});
  const [clients, setClients] = useState<Client[]>([]);
  const [sites, setSites] = useState<ClientSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const dayStart = new Date(`${date}T00:00:00`).toISOString();
    const dayEnd = new Date(new Date(`${date}T00:00:00`).getTime() + 24 * 60 * 60 * 1000).toISOString();

    const [movRes, ordersRes, clientsRes, sitesRes] = await Promise.all([
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
      supabase.from('client_sites').select('*'),
    ]);

    const orders: StockOrder[] = ordersRes.data || [];
    setMovements(movRes.data || []);
    setCompletedOrders(orders);
    setClients(clientsRes.data || []);
    setSites((sitesRes.data || []) as ClientSite[]);

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

  function exportMovementsXlsx() {
    exportToXlsx({
      filename: `tech4green_finance_${date}`,
      title: 'Finance Report',
      subtitle: `${new Date(`${date}T00:00:00`).toLocaleDateString()}  ·  ${movements.length} movement line${movements.length !== 1 ? 's' : ''}`,
      sheets: [{
        name: 'Movements',
        columns: [
          { header: 'Date / Time', key: 'datetime', width: 20, numFmt: 'yyyy-mm-dd hh:mm' },
          { header: 'Type', key: 'type', width: 18 },
          { header: 'Stock Code', key: 'code', width: 14 },
          { header: 'Item', key: 'item', width: 32 },
          { header: 'Quantity', key: 'qty', width: 12, numFmt: '#,##0' },
          { header: 'Reference', key: 'reference', width: 18 },
          { header: 'Supplier / Client / Dept', key: 'supplierClient', width: 26 },
          { header: 'Captured By', key: 'capturedBy', width: 18 },
          { header: 'Notes', key: 'notes', width: 32 },
        ],
        rows: movements.map(m => ({
          datetime: new Date(m.movement_date),
          type: m.movement_type,
          code: m.stock_code,
          item: m.stock_items?.stock_item || '',
          qty: m.quantity,
          reference: m.reference_number,
          supplierClient: m.supplier_client_department,
          capturedBy: m.captured_by,
          notes: m.notes,
        })),
      }],
    });
  }

  // Download every delivery note confirmed on this date as ONE zip: a combined
  // PDF of the finance-copy notes, plus each customer-signed POD from storage.
  async function handleDownloadNotes() {
    if (completedOrders.length === 0) { addToast('No deliveries were confirmed on this date', 'error'); return; }
    setDownloading(true);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();

      const pdfBlob = await deliveryNotesToBlob(completedOrders.map(o => ({
        order: o,
        items: orderItems[o.id] || [],
        copyLabel: 'FINANCE COPY',
        showDelivered: true,
        client: clients.find(c => c.id === o.client_id) || null,
        site: (o.site_id && sites.find(s => s.id === o.site_id)) || null,
      })));
      zip.file(`Delivery-Notes-${date}.pdf`, pdfBlob);

      let signed = 0;
      for (const o of completedOrders) {
        if (!o.signed_note_path) continue;
        const { data } = await supabase.storage.from('delivery-notes').download(o.signed_note_path);
        if (!data) continue;
        const ext = (o.signed_note_name?.split('.').pop() || o.signed_note_path.split('.').pop() || 'pdf').toLowerCase();
        zip.file(`Signed PODs/${o.order_number}.${ext}`, data);
        signed++;
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Delivery-Notes-${date}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      addToast(`Downloaded ${completedOrders.length} delivery note${completedOrders.length !== 1 ? 's' : ''}${signed ? ` + ${signed} signed POD${signed !== 1 ? 's' : ''}` : ''} (zip)`);
    } catch {
      addToast('Could not generate the delivery notes — please try again', 'error');
    } finally {
      setDownloading(false);
    }
  }

  const podCount = completedOrders.filter(o => o.signed_note_path).length;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        />
        <button
          onClick={exportMovementsXlsx}
          disabled={movements.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
        >
          <Download size={14} /> Export Excel
        </button>
        <button
          onClick={handleDownloadNotes}
          disabled={loading || downloading || completedOrders.length === 0}
          title={completedOrders.length === 0 ? 'No deliveries confirmed on this date' : 'Download all delivery notes (and signed PODs) for this date'}
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-semibold shadow-sm disabled:opacity-50"
        >
          <FileDown size={14} /> {downloading ? 'Preparing…' : 'Download Delivery Notes'}
        </button>
      </div>

      {loading ? (
        <PageSpinner />
      ) : (
        <>
          {/* Totals */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-2 text-emerald-600 mb-1">
                <ArrowDownToLine size={15} />
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Units In</p>
              </div>
              <p className="text-2xl font-extrabold text-gray-900">{totals.unitsIn}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-2 text-red-600 mb-1">
                <ArrowUpFromLine size={15} />
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Units Out</p>
              </div>
              <p className="text-2xl font-extrabold text-gray-900">{totals.unitsOut}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <Truck size={15} />
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Deliveries Confirmed</p>
              </div>
              <p className="text-2xl font-extrabold text-gray-900">{totals.deliveries}</p>
            </div>
          </div>

          {/* Movements summary */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
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
                    <tr className="bg-gray-800 text-white text-xs uppercase tracking-wider">
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
                          <span className={`text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap ${directionColor(g.movementType).badge}`}>
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

          {/* Deliveries confirmed */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-900">Deliveries Confirmed Today</p>
              <p className="text-xs text-gray-400">{completedOrders.length} delivery note{completedOrders.length !== 1 ? 's' : ''} · {podCount} with signed POD on file</p>
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
                    <tr className="bg-gray-800 text-white text-xs uppercase tracking-wider">
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
        </>
      )}

    </div>
  );
}
