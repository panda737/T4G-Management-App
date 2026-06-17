import { useState, useRef } from 'react';
import {
  ArrowLeft, Download, Truck, Upload, CheckCircle2, XCircle, Pencil,
  FileText, ExternalLink, Check, ClipboardList,
} from 'lucide-react';
import { supabase, StockOrder, StockOrderItem, Client, ClientSite, StockItem, ORDER_STATUS_COLORS } from '../../lib/supabase';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import { downloadElementPagesAsPdf } from '../../lib/pdf';
import { buildSteps, canEdit, canPrint, canDispatch, canUpload, canConfirm, canCancel } from './constants';
import DeliveryNotePrint from './DeliveryNotePrint';
import OrderFormModal from './OrderFormModal';
import UploadSignedNoteModal from './UploadSignedNoteModal';
import ConfirmDeliveryModal from './ConfirmDeliveryModal';
import CancelOrderModal from './CancelOrderModal';

interface Props {
  order: StockOrder;
  items: StockOrderItem[];
  client: Client | null;
  site: ClientSite | null;
  stockItems: StockItem[];
  clients: Client[];
  sites: ClientSite[];
  onBack: () => void;
  onChanged: () => void;
}

export default function OrderDetailView({ order, items, client, site, stockItems, clients, sites, onBack, onChanged }: Props) {
  const { canWrite } = useUser();
  const canWriteStock = canWrite('stock');
  const { addToast } = useToast();
  const [modal, setModal] = useState<'edit' | 'upload' | 'confirm' | 'cancel' | null>(null);
  const [viewingNote, setViewingNote] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const steps = buildSteps(order);
  const sorted = [...items].sort((a, b) => a.line_no - b.line_no);
  const isCompleted = order.status === 'Completed';
  const isCancelled = order.status === 'Cancelled';

  async function handleDownloadNote() {
    const container = printRef.current?.firstElementChild as HTMLElement | null;
    if (!container) return;
    setDownloading(true);
    try {
      await downloadElementPagesAsPdf(container, `Delivery-Note-${order.order_number}.pdf`);
      addToast('Delivery note downloaded (3 copies)');
      if (!order.printed_at) {
        await supabase.from('stock_orders').update({ printed_at: new Date().toISOString() }).eq('id', order.id);
        onChanged();
      }
    } catch {
      addToast('Could not generate the PDF — please try again', 'error');
    } finally {
      setDownloading(false);
    }
  }

  async function handleDispatch() {
    if (!order.printed_at) { addToast('Download the delivery note before dispatching', 'error'); return; }
    const { error } = await supabase
      .from('stock_orders')
      .update({ status: 'Dispatched', dispatched_at: new Date().toISOString() })
      .eq('id', order.id)
      .eq('status', 'Open');
    if (error) { addToast(error.message, 'error'); return; }
    addToast('Order marked as dispatched');
    onChanged();
  }

  async function viewSignedNote() {
    if (!order.signed_note_path || viewingNote) return;
    setViewingNote(true);
    const { data, error } = await supabase.storage
      .from('delivery-notes')
      .createSignedUrl(order.signed_note_path, 3600);
    setViewingNote(false);
    if (error || !data?.signedUrl) { addToast('Could not open the signed note', 'error'); return; }
    window.open(data.signedUrl, '_blank');
  }

  const fmtDateTime = (ts: string | null) =>
    ts ? new Date(ts).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

  const addressLines = [
    client?.contact_person,
    client?.address_line_1,
    client?.address_line_2,
    [client?.address_line_3, client?.postal_code].filter(Boolean).join(', '),
    client?.phone,
  ].filter((l): l is string => !!l && l.trim() !== '');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 print:hidden">
        <div className="flex items-start gap-3">
          <button onClick={onBack} className="mt-1 p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors" title="Back to orders">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 font-mono">{order.order_number}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${ORDER_STATUS_COLORS[order.status]}`}>
                {order.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {order.client_name} · {new Date(order.order_date).toLocaleDateString()} · via {order.source}
              {order.customer_reference && <> · ref <span className="font-mono">{order.customer_reference}</span></>}
            </p>
          </div>
        </div>

        {/* Action bar */}
        {canWriteStock && (
          <div className="flex flex-wrap gap-2">
            {canEdit(order.status) && (
              <button onClick={() => setModal('edit')} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                <Pencil size={14} /> Edit
              </button>
            )}
            {canPrint(order.status) && (
              <button onClick={handleDownloadNote} disabled={downloading} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50">
                <Download size={14} /> {downloading ? 'Preparing PDF...' : 'Download Delivery Note (3 copies)'}
              </button>
            )}
            {canDispatch(order.status) && (
              <button
                onClick={handleDispatch}
                disabled={!order.printed_at}
                title={!order.printed_at ? 'Download the delivery note first' : undefined}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-amber-500"
              >
                <Truck size={14} /> Mark Dispatched
              </button>
            )}
            {canUpload(order.status) && (
              <button onClick={() => setModal('upload')} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-semibold shadow-sm">
                <Upload size={14} /> {order.signed_note_path ? 'Replace Signed Note' : 'Upload Signed Note'}
              </button>
            )}
            {canConfirm(order.status) && (
              <button onClick={() => setModal('confirm')} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-semibold shadow-sm">
                <CheckCircle2 size={14} /> Confirm Delivery
              </button>
            )}
            {canCancel(order.status) && (
              <button onClick={() => setModal('cancel')} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium">
                <XCircle size={14} /> Cancel
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cancelled banner */}
      {isCancelled && (
        <div className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600 print:hidden">
          <strong>Order cancelled.</strong> {order.cancelled_reason && <>Reason: {order.cancelled_reason}</>} No stock moved.
        </div>
      )}

      {/* Progress stepper */}
      {!isCancelled && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 print:hidden">
          <div className="flex items-center">
            {steps.map((step, idx) => (
              <div key={step.label} className={`flex items-center ${idx < steps.length - 1 ? 'flex-1' : ''}`}>
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${step.done ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-gray-300 text-gray-400'}`}>
                    {step.done ? <Check size={13} strokeWidth={3} /> : idx + 1}
                  </div>
                  <p className={`text-[10px] font-semibold mt-1.5 whitespace-nowrap ${step.done ? 'text-emerald-700' : 'text-gray-400'}`}>{step.label}</p>
                  <p className="text-[9px] text-gray-400 whitespace-nowrap h-3">{fmtDateTime(step.timestamp)}</p>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mb-7 rounded ${steps[idx + 1].done ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 print:hidden">
        {/* Client & order info */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Deliver To</p>
          {(order.site_name || site) ? (
            <>
              <p className="font-semibold text-gray-900 text-sm">{site?.generator_facility || order.site_name}</p>
              <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                <p>{order.client_name}</p>
                {site && [site.site_code, site.province, site.generator_group].filter(Boolean).length > 0 && (
                  <p>{[site.site_code, site.province, site.generator_group].filter(Boolean).join(' · ')}</p>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="font-semibold text-gray-900 text-sm">{order.client_name}</p>
              {addressLines.length > 0 ? (
                <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                  {addressLines.map((l, i) => <p key={i}>{l}</p>)}
                </div>
              ) : (
                <p className="text-xs text-gray-400 mt-1">No address on file for this client.</p>
              )}
            </>
          )}
          {order.notes && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Order Notes</p>
              <p className="text-xs text-gray-600">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Signed note panel */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Signed Delivery Note (POD)</p>
          {order.signed_note_path ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                <FileText size={18} className="text-indigo-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{order.signed_note_name || 'Signed note'}</p>
                <p className="text-[10px] text-gray-400">
                  Uploaded {fmtDateTime(order.signed_note_uploaded_at)}
                  {order.signed_note_size_bytes ? ` · ${(order.signed_note_size_bytes / 1024 / 1024).toFixed(2)} MB` : ''}
                </p>
              </div>
              <button
                onClick={viewSignedNote}
                disabled={viewingNote}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex-shrink-0 disabled:opacity-50"
              >
                <ExternalLink size={12} /> {viewingNote ? 'Opening...' : 'View'}
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-400">
              {order.status === 'Open' ? 'Will be uploaded after delivery.' : order.status === 'Dispatched' ? 'Awaiting the signed copy from the driver.' : 'No signed note on file.'}
            </p>
          )}
        </div>

        {/* Confirmation panel */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Confirmation</p>
          {isCompleted ? (
            <>
              <div className="flex items-center gap-2 text-sm text-emerald-700 font-semibold">
                <CheckCircle2 size={15} /> Confirmed {fmtDateTime(order.confirmed_at)}
              </div>
              {order.confirmation_note && <p className="text-xs text-gray-600 mt-2">{order.confirmation_note}</p>}
              {order.movement_group_id && (
                <p className="text-[10px] text-gray-400 mt-2">
                  Stock movement recorded — see Movements for group <span className="font-mono">Customer Delivery · {order.order_number}</span>.
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-400 flex items-start gap-1.5">
              <ClipboardList size={13} className="flex-shrink-0 mt-0.5" />
              Stock only moves once the signed note is reviewed and the delivery is confirmed.
            </p>
          )}
        </div>
      </div>

      {/* Items table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden print:hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 text-white text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium w-10">#</th>
                <th className="text-left px-4 py-3 font-medium w-28">Code</th>
                <th className="text-left px-4 py-3 font-medium">Item</th>
                <th className="text-center px-3 py-3 font-medium w-16">Unit</th>
                <th className="text-center px-3 py-3 font-medium w-20">Ordered</th>
                {isCompleted && <th className="text-center px-3 py-3 font-medium w-20">Delivered</th>}
                {isCompleted && <th className="text-left px-4 py-3 font-medium">Variance Note</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map(item => {
                const hasVariance = isCompleted && item.qty_delivered !== null && item.qty_delivered !== item.qty_ordered;
                return (
                  <tr key={item.id} className={hasVariance ? 'bg-amber-50/60' : ''}>
                    <td className="px-4 py-2.5 text-xs text-gray-400 font-bold">{item.line_no + 1}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{item.stock_code || '—'}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-gray-900">{item.stock_item}</p>
                      {item.description && <p className="text-xs text-gray-400 truncate max-w-md">{item.description}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-gray-500">{item.unit_of_measure || '—'}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-gray-900">{item.qty_ordered}</td>
                    {isCompleted && (
                      <td className={`px-3 py-2.5 text-center font-bold ${hasVariance ? 'text-amber-700' : 'text-gray-900'}`}>
                        {item.qty_delivered ?? '—'}
                      </td>
                    )}
                    {isCompleted && (
                      <td className="px-4 py-2.5 text-xs text-gray-600 italic">{item.variance_note || ''}</td>
                    )}
                  </tr>
                );
              })}
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td colSpan={4} className="px-4 py-2.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Total units</td>
                <td className="px-3 py-2.5 text-center font-extrabold text-gray-900">{sorted.reduce((s, i) => s + i.qty_ordered, 0)}</td>
                {isCompleted && <td className="px-3 py-2.5 text-center font-extrabold text-gray-900">{sorted.reduce((s, i) => s + (i.qty_delivered ?? 0), 0)}</td>}
                {isCompleted && <td />}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Print/PDF source — delivery note, 3 copies (hidden on screen) */}
      {canPrint(order.status) && (
        <div ref={printRef}>
          <DeliveryNotePrint order={order} items={sorted} client={client} site={site} />
        </div>
      )}

      {/* Modals */}
      {modal === 'edit' && (
        <OrderFormModal
          items={stockItems}
          clients={clients}
          sites={sites}
          order={order}
          orderItems={sorted}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); addToast('Order updated'); onChanged(); }}
        />
      )}
      {modal === 'upload' && (
        <UploadSignedNoteModal
          order={order}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); addToast('Signed note uploaded — ready for confirmation'); onChanged(); }}
        />
      )}
      {modal === 'confirm' && (
        <ConfirmDeliveryModal
          order={order}
          items={sorted}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); addToast('Delivery confirmed — stock updated'); onChanged(); }}
        />
      )}
      {modal === 'cancel' && (
        <CancelOrderModal
          order={order}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); addToast('Order cancelled'); onChanged(); }}
        />
      )}
    </div>
  );
}
