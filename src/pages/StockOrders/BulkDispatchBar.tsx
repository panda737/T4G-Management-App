import { useMemo, useState } from 'react';
import { Printer, Truck } from 'lucide-react';
import { supabase, type StockOrder, type StockOrderItem, type Client, type ClientSite } from '../../lib/supabase';
import { useToast } from '../../lib/toast';
import { downloadDeliveryNotes } from '../../lib/deliveryNotePdf';
import Modal from '../../components/Modal';
import { Button } from '../../components/ui';

interface Props {
  /** All Open orders (the bulk actions act on these). */
  openOrders: StockOrder[];
  clients: Client[];
  sites: ClientSite[];
  /** Reload the orders list after a dispatch. */
  onDispatched: () => void;
}

const COPIES = ['STORE COPY', 'CUSTOMER COPY', 'DRIVER COPY'];

/** Print-all + Mark-dispatched bulk actions for the Open delivery-notes tab. */
export default function BulkDispatchBar({ openOrders, clients, sites, onDispatched }: Props) {
  const { addToast } = useToast();
  const [printedAll, setPrintedAll] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showDispatch, setShowDispatch] = useState(false);

  const n = openOrders.length;

  // Counts grouped by client (most first).
  const byClient = useMemo(() => {
    const m = new Map<string, number>();
    openOrders.forEach(o => m.set(o.client_name, (m.get(o.client_name) || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [openOrders]);

  async function doPrint() {
    setPrinting(true);
    try {
      const ids = openOrders.map(o => o.id);
      const { data: itemsData } = await supabase
        .from('stock_order_items').select('*').in('order_id', ids).order('line_no');
      const byOrder: Record<string, StockOrderItem[]> = {};
      (itemsData || []).forEach((i: StockOrderItem) => { (byOrder[i.order_id] = byOrder[i.order_id] || []).push(i); });

      const pages = openOrders.flatMap(o => COPIES.map(copyLabel => ({
        order: o,
        items: byOrder[o.id] || [],
        copyLabel,
        showDelivered: false,
        client: clients.find(c => c.id === o.client_id) || null,
        site: (o.site_id && sites.find(s => s.id === o.site_id)) || null,
      })));

      await downloadDeliveryNotes(pages, `Delivery-Notes-Open-${new Date().toISOString().slice(0, 10)}.pdf`);

      const unprinted = openOrders.filter(o => !o.printed_at).map(o => o.id);
      if (unprinted.length) {
        await supabase.from('stock_orders').update({ printed_at: new Date().toISOString() }).in('id', unprinted);
      }
      setPrintedAll(true);
      setShowPrint(false);
      addToast(`Downloaded ${n} delivery note${n !== 1 ? 's' : ''} (3 copies each)`);
    } catch {
      addToast('Could not generate the delivery notes PDF', 'error');
    } finally {
      setPrinting(false);
    }
  }

  async function doDispatch() {
    setDispatching(true);
    const ids = openOrders.map(o => o.id);
    const { error } = await supabase
      .from('stock_orders')
      .update({ status: 'Dispatched', dispatched_at: new Date().toISOString() })
      .in('id', ids)
      .eq('status', 'Open');
    setDispatching(false);
    if (error) { addToast('Dispatch failed: ' + error.message, 'error'); return; }
    setShowDispatch(false);
    setPrintedAll(false);
    addToast(`Dispatched ${ids.length} order${ids.length !== 1 ? 's' : ''}`);
    onDispatched();
  }

  return (
    <>
      <Button
        variant="secondary"
        icon={Printer}
        onClick={() => setShowPrint(true)}
        disabled={printing || n === 0}
        hideLabelOnMobile
      >
        {printing ? 'Preparing…' : 'Print all delivery notes'}
      </Button>
      <button
        onClick={() => setShowDispatch(true)}
        disabled={!printedAll}
        title={printedAll ? undefined : 'Print the delivery notes first'}
        className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors bg-amber-500 hover:bg-amber-600 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-amber-500"
      >
        <Truck size={15} className="flex-shrink-0" />
        <span className="hidden sm:inline">Mark dispatched</span>
      </button>

      {/* Print confirm */}
      {showPrint && (
        <Modal
          title="Print all delivery notes"
          onClose={() => setShowPrint(false)}
          size="sm"
          accent="green"
          footer={
            <>
              <button onClick={() => setShowPrint(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button
                onClick={doPrint}
                disabled={printing}
                className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 font-medium shadow-sm"
              >
                {printing ? 'Preparing…' : 'Download PDF'}
              </button>
            </>
          }
        >
          <p className="text-sm text-gray-600">
            Downloads one PDF with all <strong className="text-gray-900">{n}</strong> open delivery note{n !== 1 ? 's' : ''} — 3 copies each (Store · Customer · Driver).
          </p>
          <div className="mt-3 rounded-lg border border-gray-200 overflow-hidden divide-y divide-gray-100">
            {byClient.map(([name, count]) => (
              <div key={name} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-gray-700 truncate pr-2">{name}</span>
                <span className="flex-shrink-0 font-semibold text-gray-900 bg-gray-100 rounded-full px-2 py-0.5 text-xs">{count}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {n} site{n !== 1 ? 's' : ''} across {byClient.length} client{byClient.length !== 1 ? 's' : ''}.
          </p>
        </Modal>
      )}

      {/* Dispatch confirm */}
      {showDispatch && (
        <Modal
          title="Mark dispatched"
          onClose={() => setShowDispatch(false)}
          size="sm"
          accent="amber"
          footer={
            <>
              <button onClick={() => setShowDispatch(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button
                onClick={doDispatch}
                disabled={dispatching}
                className="px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:opacity-50 font-semibold shadow-sm"
              >
                {dispatching ? 'Dispatching…' : `Dispatch all ${n}`}
              </button>
            </>
          }
        >
          <p className="text-sm text-gray-600">
            Dispatch all <strong className="text-gray-900">{n}</strong> open order{n !== 1 ? 's' : ''}? They'll move to the <strong>Dispatched</strong> tab and await the signed proof of delivery.
          </p>
        </Modal>
      )}
    </>
  );
}
