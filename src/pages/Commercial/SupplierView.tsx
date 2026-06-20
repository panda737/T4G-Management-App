import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Boxes, Truck, CalendarDays, Clock, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  supabase,
  type Supplier,
  type SupplierItem,
  type StockItem,
  type StockReceipt,
} from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import { PageSpinner } from '../../components/Spinner';
import Modal from '../../components/Modal';
import {
  RecordHeader,
  RecordTabs,
  RelatedList,
  DetailFields,
  type RecordTab,
  fmtDate,
} from '../../components/crm';
import SupplierFormModal from './SupplierFormModal';
import SupplierItemModal from './SupplierItemModal';

type Tab = 'overview' | 'items' | 'history';

function StatusBadge({ status }: { status: Supplier['status'] }) {
  const cls = {
    active: 'text-emerald-700 bg-emerald-50',
    prospect: 'text-amber-700 bg-amber-50',
    inactive: 'text-gray-500 bg-gray-100',
  }[status];
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function fmtPrice(n: number) {
  return Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SupplierView() {
  const { supplierId } = useParams<{ supplierId: string }>();
  const navigate = useNavigate();
  usePageTitle('Commercial — Supplier');
  const { isAdmin } = useUser();
  const { addToast } = useToast();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [items, setItems] = useState<SupplierItem[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [receipts, setReceipts] = useState<StockReceipt[]>([]);
  const [receiptItemCounts, setReceiptItemCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [itemModal, setItemModal] = useState<'new' | SupplierItem | null>(null);
  const [removingItem, setRemovingItem] = useState<SupplierItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { if (supplierId) load(); }, [supplierId]);

  async function load() {
    setLoading(true);
    const [supRes, itemsRes, stockRes, recRes] = await Promise.all([
      supabase.from('suppliers').select('*').eq('id', supplierId!).maybeSingle(),
      supabase.from('supplier_items').select('*').eq('supplier_id', supplierId!).order('created_at'),
      supabase.from('stock_items').select('*').order('stock_item'),
      supabase.from('stock_receipts').select('*').eq('supplier_id', supplierId!).order('received_date', { ascending: false }),
    ]);

    setSupplier(supRes.data as Supplier | null);
    setItems((itemsRes.data ?? []) as SupplierItem[]);
    setStockItems((stockRes.data ?? []) as StockItem[]);
    const recs = (recRes.data ?? []) as StockReceipt[];
    setReceipts(recs);

    if (recs.length) {
      const { data: ri } = await supabase
        .from('stock_receipt_items')
        .select('receipt_id')
        .in('receipt_id', recs.map(r => r.id));
      const counts: Record<string, number> = {};
      (ri ?? []).forEach((r: { receipt_id: string }) => { counts[r.receipt_id] = (counts[r.receipt_id] || 0) + 1; });
      setReceiptItemCounts(counts);
    } else {
      setReceiptItemCounts({});
    }
    setLoading(false);
  }

  const stockMap = useMemo(() => {
    const m = new Map<string, StockItem>();
    stockItems.forEach(i => m.set(i.id, i));
    return m;
  }, [stockItems]);

  const linkedIds = useMemo(() => items.map(i => i.stock_item_id), [items]);

  const TABS: RecordTab[] = useMemo(() => [
    { id: 'overview', label: 'Overview' },
    { id: 'items', label: 'Items', count: items.length },
    { id: 'history', label: 'History', count: receipts.length },
  ], [items.length, receipts.length]);

  if (loading) return <PageSpinner layout="h64" />;
  if (!supplier) return <div className="p-10 text-center text-sm text-gray-400">Supplier not found.</div>;

  // ── handlers ────────────────────────────────────────────────────────────────
  async function handleDetailSave(changes: Record<string, string | boolean>) {
    const patch: Record<string, unknown> = { ...changes };
    if ('lead_time_days' in patch) {
      const v = String(patch.lead_time_days).trim();
      patch.lead_time_days = v === '' ? null : Number(v);
    }
    const { error } = await supabase.from('suppliers').update(patch).eq('id', supplierId!);
    if (error) { addToast('Save failed: ' + error.message, 'error'); return; }
    setSupplier(prev => prev ? { ...prev, ...patch } as Supplier : prev);
    addToast('Supplier updated');
  }

  function handleItemSaved(saved: SupplierItem) {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === saved.id);
      return idx >= 0 ? prev.map((i, n) => n === idx ? saved : i) : [...prev, saved];
    });
    const wasNew = itemModal === 'new';
    setItemModal(null);
    addToast(wasNew ? 'Item added' : 'Item updated');
  }

  async function handleRemoveItem() {
    if (!removingItem) return;
    const { error } = await supabase.from('supplier_items').delete().eq('id', removingItem.id);
    if (error) { addToast('Remove failed: ' + error.message, 'error'); return; }
    setItems(prev => prev.filter(i => i.id !== removingItem.id));
    setRemovingItem(null);
    addToast('Item removed');
  }

  async function handleDelete() {
    if (!supplier || confirmText.trim() !== supplier.supplier_name.trim()) return;
    setDeleting(true);
    const { error } = await supabase.from('suppliers').delete().eq('id', supplierId!);
    setDeleting(false);
    if (error) { addToast('Delete failed: ' + error.message, 'error'); return; }
    addToast('Supplier deleted');
    navigate('/commercial/suppliers');
  }

  return (
    <div className="space-y-4">
      <RecordHeader
        title={supplier.supplier_name}
        subtitle={supplier.supplier_code || undefined}
        badges={<StatusBadge status={supplier.status} />}
        highlights={[
          { label: 'Items', value: String(items.length) },
          { label: 'Last Delivery', value: receipts[0] ? fmtDate(receipts[0].received_date) : '—' },
          { label: 'Lead Time', value: supplier.lead_time_days != null ? `${supplier.lead_time_days} days` : '—' },
          { label: 'Payment Terms', value: supplier.payment_terms || '—' },
        ]}
        actions={
          <>
            {isAdmin && (
              <button
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-1.5 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white hover:bg-gray-50 text-gray-700"
              >
                <Pencil size={14} /> Edit
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => { setConfirmText(''); setDeleteOpen(true); }}
                title="Delete supplier"
                aria-label="Delete supplier"
                className="flex items-center text-sm border border-red-200 rounded-lg px-3 py-2 bg-white hover:bg-red-50 text-red-600"
              >
                <Trash2 size={14} />
              </button>
            )}
          </>
        }
        onBack={() => navigate('/commercial/suppliers')}
        backLabel="Back to Suppliers"
      />

      <RecordTabs tabs={TABS} active={tab} onChange={t => setTab(t as Tab)} />

      {/* ── Overview ────────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard icon={Boxes} label="Items supplied" value={String(items.length)} />
            <KpiCard icon={Truck} label="Deliveries" value={String(receipts.length)} />
            <KpiCard icon={CalendarDays} label="Last delivery" value={receipts[0] ? fmtDate(receipts[0].received_date) : '—'} />
            <KpiCard icon={Clock} label="Lead time" value={supplier.lead_time_days != null ? `${supplier.lead_time_days} days` : '—'} />
          </div>
          <DetailFields
            title="Supplier Details"
            canEdit={isAdmin}
            columns={2}
            fields={[
            { key: 'supplier_name', label: 'Supplier Name', value: supplier.supplier_name },
            { key: 'supplier_code', label: 'Supplier Code', value: supplier.supplier_code },
            { key: 'status', label: 'Status', value: supplier.status, type: 'select',
              options: [{ value: 'active', label: 'Active' }, { value: 'prospect', label: 'Prospect' }, { value: 'inactive', label: 'Inactive' }] },
            { key: 'website', label: 'Website', value: supplier.website, type: 'url',
              display: supplier.website ? <a href={supplier.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline truncate block">{supplier.website}</a> : undefined },
            { key: 'contact_person', label: 'Contact Person', value: supplier.contact_person },
            { key: 'email', label: 'Email', value: supplier.email, type: 'email',
              display: supplier.email ? <a href={`mailto:${supplier.email}`} className="text-indigo-600 hover:underline">{supplier.email}</a> : undefined },
            { key: 'phone', label: 'Phone', value: supplier.phone, type: 'tel' },
            { key: 'payment_terms', label: 'Payment Terms', value: supplier.payment_terms },
            { key: 'lead_time_days', label: 'Lead Time (days)', value: supplier.lead_time_days, type: 'number' },
            { key: 'address_line_1', label: 'Street Address', value: supplier.address_line_1 },
            { key: 'address_line_2', label: 'Suburb', value: supplier.address_line_2 },
            { key: 'address_line_3', label: 'City / Province', value: supplier.address_line_3 },
            { key: 'postal_code', label: 'Postal Code', value: supplier.postal_code },
            { key: 'active', label: 'Active', value: supplier.active, type: 'checkbox' },
            { key: 'notes', label: 'Notes', value: supplier.notes, type: 'textarea', full: true },
            ]}
            onSave={handleDetailSave}
          />
        </div>
      )}

      {/* ── Items ───────────────────────────────────────────────────────────── */}
      {tab === 'items' && (
        <RelatedList
          title="Items"
          icon={Boxes}
          count={items.length}
          isEmpty={items.length === 0}
          empty="No items linked yet. Add the stock items this supplier provides."
          action={
            isAdmin ? (
              <button
                onClick={() => setItemModal('new')}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg px-2 py-1 hover:bg-indigo-50"
              >
                <Plus size={12} /> Add Item
              </button>
            ) : undefined
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
                  <th className="text-left px-4 py-2.5 font-medium">Item</th>
                  <th className="text-left px-4 py-2.5 font-medium">UOM</th>
                  <th className="text-right px-4 py-2.5 font-medium">Unit Price</th>
                  <th className="text-left px-4 py-2.5 font-medium">Supplier SKU</th>
                  {isAdmin && <th className="text-right px-4 py-2.5 font-medium w-24" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map(it => {
                  const si = stockMap.get(it.stock_item_id);
                  return (
                    <tr key={it.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-gray-900">{si?.stock_item ?? '(item removed)'}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{si?.stock_code || '(no code)'}</div>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">{si?.unit_of_measure || '—'}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmtPrice(it.unit_price)}</td>
                      <td className="px-4 py-2.5 text-gray-500">{it.supplier_sku || '—'}</td>
                      {isAdmin && (
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          <button
                            onClick={() => setItemModal(it)}
                            className="text-gray-400 hover:text-indigo-600 p-1"
                            title="Edit item" aria-label="Edit item"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setRemovingItem(it)}
                            className="text-gray-400 hover:text-red-600 p-1 ml-1"
                            title="Remove item" aria-label="Remove item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </RelatedList>
      )}

      {/* ── History ─────────────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <RelatedList
          title="Delivery History"
          icon={Truck}
          count={receipts.length}
          isEmpty={receipts.length === 0}
          empty="No stock has been received from this supplier yet."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
                  <th className="text-left px-4 py-2.5 font-medium">Receipt #</th>
                  <th className="text-left px-4 py-2.5 font-medium">Date</th>
                  <th className="text-left px-4 py-2.5 font-medium">Reference</th>
                  <th className="text-right px-4 py-2.5 font-medium">Items</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {receipts.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{r.receipt_number}</td>
                    <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{fmtDate(r.received_date)}</td>
                    <td className="px-4 py-2.5 text-gray-500">{r.supplier_ref || '—'}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{receiptItemCounts[r.id] ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </RelatedList>
      )}

      {editOpen && (
        <SupplierFormModal
          supplier={supplier}
          onClose={() => setEditOpen(false)}
          onSave={saved => { setSupplier(saved); setEditOpen(false); addToast('Supplier updated'); }}
        />
      )}

      {itemModal !== null && (
        <SupplierItemModal
          supplierId={supplierId!}
          item={itemModal === 'new' ? null : itemModal}
          stockItems={stockItems}
          excludeIds={linkedIds}
          onClose={() => setItemModal(null)}
          onSave={handleItemSaved}
        />
      )}

      {removingItem && (
        <Modal
          title="Remove Item"
          onClose={() => setRemovingItem(null)}
          size="sm"
          accent="red"
          footer={
            <>
              <button onClick={() => setRemovingItem(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleRemoveItem} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-sm">
                Remove Item
              </button>
            </>
          }
        >
          <p className="text-sm text-gray-600">
            Remove <strong className="text-gray-900">{stockMap.get(removingItem.stock_item_id)?.stock_item ?? 'this item'}</strong> from
            this supplier? This only removes the supplier link — the stock master item is unaffected.
          </p>
        </Modal>
      )}

      {deleteOpen && (
        <Modal
          title="Delete Supplier"
          onClose={() => { setDeleteOpen(false); setConfirmText(''); }}
          size="sm"
          accent="red"
          footer={
            <>
              <button
                onClick={() => { setDeleteOpen(false); setConfirmText(''); }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || confirmText.trim() !== supplier.supplier_name.trim()}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 font-medium shadow-sm"
              >
                {deleting ? 'Deleting…' : 'Delete Supplier'}
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              This permanently deletes <strong className="text-gray-900">{supplier.supplier_name}</strong>
              {items.length > 0 && <> and its {items.length} linked item{items.length !== 1 ? 's' : ''}</>}. This cannot be undone.
            </p>
            {receipts.length > 0 && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {receipts.length} delivery receipt{receipts.length !== 1 ? 's' : ''} reference this supplier — they will be kept but unlinked.
              </p>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Type <span className="font-semibold text-gray-900">{supplier.supplier_name}</span> to confirm
              </label>
              <input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                autoFocus
                placeholder={supplier.supplier_name}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
      <div className="p-2 bg-indigo-50 rounded-lg flex-shrink-0"><Icon size={18} className="text-indigo-600" /></div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-lg font-bold text-gray-900 truncate">{value}</div>
      </div>
    </div>
  );
}
