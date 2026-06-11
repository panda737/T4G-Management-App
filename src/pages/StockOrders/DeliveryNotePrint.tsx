import { StockOrder, StockOrderItem, Client } from '../../lib/supabase';

interface NoteProps {
  order: StockOrder;
  items: StockOrderItem[];
  copyLabel: string;
  showDelivered?: boolean;
  client?: Client | null;
}

/*
  Single A4 delivery note. Border/typography-based so it prints reliably
  without relying on background colors. Rendered inside a print-only
  container by the caller.
*/
export function DeliveryNoteSheet({ order, items, copyLabel, showDelivered = false, client }: NoteProps) {
  const addressLines = [
    order.client_name,
    client?.contact_person,
    client?.address_line_1,
    client?.address_line_2,
    [client?.address_line_3, client?.postal_code].filter(Boolean).join(', '),
    client?.phone,
  ].filter((l): l is string => !!l && l.trim() !== '');

  return (
    <div className="bg-white text-gray-900" style={{ breakAfter: 'page', pageBreakAfter: 'always' }}>
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-gray-900 pb-4">
        <div className="flex items-center gap-3">
          <img src="/T4G_Small_Logo.png" alt="Tech4Green" className="w-14 h-14 object-contain" />
          <div>
            <p className="text-xl font-extrabold tracking-tight">Tech4Green</p>
            <p className="text-[10px] uppercase tracking-widest text-gray-500">Management Platform</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-extrabold tracking-tight">DELIVERY NOTE</p>
          <p className="text-lg font-mono font-bold mt-0.5">{order.order_number}</p>
          <p className="inline-block mt-1.5 border-2 border-gray-900 px-3 py-1 text-xs font-extrabold uppercase tracking-widest">
            {copyLabel}
          </p>
        </div>
      </div>

      {/* Meta block */}
      <div className="grid grid-cols-2 gap-6 py-4 text-sm">
        <div className="border border-gray-300 rounded p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Deliver To</p>
          {addressLines.map((line, i) => (
            <p key={i} className={i === 0 ? 'font-bold' : ''}>{line}</p>
          ))}
        </div>
        <div className="border border-gray-300 rounded p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Order Details</p>
          <table className="text-xs w-full">
            <tbody>
              <tr><td className="text-gray-500 pr-3 py-0.5">Order date</td><td className="font-semibold">{new Date(order.order_date).toLocaleDateString()}</td></tr>
              <tr><td className="text-gray-500 pr-3 py-0.5">Source</td><td className="font-semibold">{order.source}</td></tr>
              <tr><td className="text-gray-500 pr-3 py-0.5">Customer ref</td><td className="font-semibold">{order.customer_reference || '—'}</td></tr>
              {showDelivered && order.confirmed_at && (
                <tr><td className="text-gray-500 pr-3 py-0.5">Confirmed</td><td className="font-semibold">{new Date(order.confirmed_at).toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Items */}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-y-2 border-gray-900 text-[10px] uppercase tracking-widest">
            <th className="text-left py-2 pr-2 w-24">Code</th>
            <th className="text-left py-2 pr-2">Item</th>
            <th className="text-left py-2 pr-2">Description</th>
            <th className="text-center py-2 px-2 w-16">Unit</th>
            <th className="text-center py-2 px-2 w-20">Qty {showDelivered ? 'Ordered' : ''}</th>
            <th className="text-center py-2 pl-2 w-24">Qty Delivered</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            const hasVariance = showDelivered && item.qty_delivered !== null && item.qty_delivered !== item.qty_ordered;
            return (
              <tr key={item.id} className="border-b border-gray-200 align-top">
                <td className="py-2 pr-2 font-mono text-xs">{item.stock_code || '—'}</td>
                <td className="py-2 pr-2 font-medium">{item.stock_item}</td>
                <td className="py-2 pr-2 text-xs text-gray-600">
                  {item.description || '—'}
                  {hasVariance && item.variance_note && (
                    <p className="text-xs italic mt-0.5">Variance: {item.variance_note}</p>
                  )}
                </td>
                <td className="py-2 px-2 text-center text-xs">{item.unit_of_measure || '—'}</td>
                <td className="py-2 px-2 text-center font-bold">{item.qty_ordered}</td>
                <td className={`py-2 pl-2 text-center ${showDelivered ? `font-bold ${hasVariance ? 'underline' : ''}` : 'border-b border-dotted border-gray-400'}`}>
                  {showDelivered ? (item.qty_delivered ?? '—') : ''}
                </td>
              </tr>
            );
          })}
          <tr className="border-t-2 border-gray-900">
            <td colSpan={4} className="py-2 text-right text-xs font-bold uppercase tracking-widest pr-3">Total units</td>
            <td className="py-2 text-center font-extrabold">{items.reduce((s, i) => s + i.qty_ordered, 0)}</td>
            <td className="py-2 text-center font-extrabold">
              {showDelivered ? items.reduce((s, i) => s + (i.qty_delivered ?? 0), 0) : ''}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Confirmation note (finance copy) */}
      {showDelivered && order.confirmation_note && (
        <div className="mt-3 border border-gray-300 rounded p-3 text-xs">
          <p className="font-bold uppercase tracking-widest text-[10px] text-gray-500 mb-1">Confirmation Note</p>
          <p>{order.confirmation_note}</p>
        </div>
      )}
      {showDelivered && (
        <p className="mt-2 text-xs text-gray-600">
          Signed POD on file: <strong>{order.signed_note_path ? `Yes (${order.signed_note_name || 'uploaded'})` : 'No'}</strong>
        </p>
      )}

      {/* Signatures */}
      {!showDelivered && (
        <div className="grid grid-cols-2 gap-6 mt-10">
          <div className="border border-gray-400 rounded p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-6">Received by (Customer)</p>
            <div className="space-y-5 text-xs text-gray-500">
              <p className="border-b border-gray-400 pb-1">Name:</p>
              <p className="border-b border-gray-400 pb-1">Signature:</p>
              <p className="border-b border-gray-400 pb-1">Date: <span className="ml-24">Time:</span></p>
            </div>
          </div>
          <div className="border border-gray-400 rounded p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-6">Delivered by (Driver)</p>
            <div className="space-y-5 text-xs text-gray-500">
              <p className="border-b border-gray-400 pb-1">Name:</p>
              <p className="border-b border-gray-400 pb-1">Signature:</p>
              <p className="border-b border-gray-400 pb-1">Vehicle reg:</p>
            </div>
          </div>
        </div>
      )}

      {/* Fine print */}
      <p className="mt-6 text-[10px] text-gray-400 border-t border-gray-200 pt-2">
        Goods received in good order and condition unless noted above. Any discrepancy must be recorded
        on this delivery note at the time of delivery. {order.order_number} &middot; Generated by Tech4Green Management Platform.
      </p>
    </div>
  );
}

interface PrintProps {
  order: StockOrder;
  items: StockOrderItem[];
  client?: Client | null;
}

/*
  Print view for a dispatch delivery note: three labelled copies
  (store / customer / driver), each on its own A4 page.
  Hidden on screen; visible only when printing.
*/
export default function DeliveryNotePrint({ order, items, client }: PrintProps) {
  const sorted = [...items].sort((a, b) => a.line_no - b.line_no);
  return (
    <div className="hidden print:block">
      {['STORE COPY', 'CUSTOMER COPY', 'DRIVER COPY'].map(label => (
        <DeliveryNoteSheet key={label} order={order} items={sorted} copyLabel={label} client={client} />
      ))}
    </div>
  );
}
