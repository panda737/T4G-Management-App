import { useEffect, useState, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, PackagePlus, ChevronRight } from 'lucide-react';
import { supabase, StockReceipt, StockReceiptItem, StockItem } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useToast } from '../../lib/toast';
import { useUser } from '../../lib/UserContext';
import { PageSpinner } from '../../components/Spinner';
import { PageHeader, Button, Toolbar, SearchInput } from '../../components/ui';
import { useBackClose } from '../../lib/useBackClose';
import ReceiptFormModal from './ReceiptFormModal';
import ReceiptDetailView from './ReceiptDetailView';

export default function StockReceived() {
  usePageTitle('Stock — Stock Received');
  const { addToast } = useToast();
  const { canWrite } = useUser();
  const canWriteStock = canWrite('stock');
  const location = useLocation();
  const [receipts, setReceipts] = useState<StockReceipt[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; supplier_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>((location.state as { openReceiptId?: string } | null)?.openReceiptId ?? null);
  const [detailItems, setDetailItems] = useState<StockReceiptItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [recRes, itemsRes, stockRes, supRes] = await Promise.all([
      supabase.from('stock_receipts').select('*').order('created_at', { ascending: false }),
      supabase.from('stock_receipt_items').select('receipt_id'),
      supabase.from('stock_items').select('*').eq('active', true).order('category').order('stock_item'),
      supabase.from('suppliers').select('id, supplier_name').eq('active', true).order('supplier_name'),
    ]);
    setReceipts(recRes.data || []);
    const counts: Record<string, number> = {};
    (itemsRes.data || []).forEach((row: { receipt_id: string }) => {
      counts[row.receipt_id] = (counts[row.receipt_id] || 0) + 1;
    });
    setItemCounts(counts);
    setStockItems(stockRes.data || []);
    setSuppliers((supRes.data as { id: string; supplier_name: string }[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadDetail = useCallback(async (receiptId: string) => {
    setDetailLoading(true);
    const { data } = await supabase
      .from('stock_receipt_items')
      .select('*')
      .eq('receipt_id', receiptId)
      .order('line_no');
    setDetailItems(data || []);
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return receipts.filter(r =>
      !q || `${r.receipt_number} ${r.supplier} ${r.supplier_ref}`.toLowerCase().includes(q)
    );
  }, [receipts, search]);

  // Device/browser Back returns from the receipt detail view to the list.
  useBackClose(!!selectedId, () => setSelectedId(null));

  const selected = receipts.find(r => r.id === selectedId) || null;

  if (selected) {
    if (detailLoading) return <PageSpinner />;
    return (
      <ReceiptDetailView
        receipt={selected}
        items={detailItems}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Stock Received"
        subtitle="Inbound stock from suppliers — each receipt posts a Stock Received movement"
        accent="emerald"
        actions={canWriteStock ? <Button variant="primary" accent="emerald" icon={Plus} onClick={() => setShowForm(true)}>Receive Stock</Button> : undefined}
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search receipt no, supplier, ref…" />
      </Toolbar>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <PageSpinner />
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <PackagePlus size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 font-medium mb-1">
              {search ? 'No receipts match your search' : 'No stock received yet'}
            </p>
            {!search && canWriteStock && (
              <>
                <p className="text-xs text-gray-400 mb-4">Record a delivery from a supplier to increase stock on hand.</p>
                <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                  <Plus size={15} /> Receive your first stock
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
                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider w-36">Receipt No</th>
                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider w-28">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider">Supplier</th>
                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider w-36">Supplier Ref</th>
                    <th className="text-center px-4 py-3 font-medium text-xs uppercase tracking-wider w-16">Items</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((r, idx) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      className={`hover:bg-emerald-50/40 transition-colors cursor-pointer group ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                    >
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold text-gray-900">{r.receipt_number}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{new Date(r.received_date).toLocaleDateString()}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{r.supplier || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">{r.supplier_ref || '—'}</td>
                      <td className="px-4 py-2.5 text-center text-xs font-semibold text-gray-700">{itemCounts[r.id] ?? 0}</td>
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
              {filtered.map(r => (
                <div key={r.id} className="p-4 hover:bg-emerald-50/40 transition-colors cursor-pointer" onClick={() => setSelectedId(r.id)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-bold text-gray-900">{r.receipt_number}</p>
                      <p className="text-sm text-gray-700 mt-0.5">{r.supplier || '—'}</p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{new Date(r.received_date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {itemCounts[r.id] ?? 0} item{(itemCounts[r.id] ?? 0) !== 1 ? 's' : ''}
                    {r.supplier_ref && ` · ref ${r.supplier_ref}`}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showForm && (
        <ReceiptFormModal
          items={stockItems}
          suppliers={suppliers}
          onClose={() => setShowForm(false)}
          onSave={() => { setShowForm(false); addToast('Stock received — on-hand updated'); load(); }}
        />
      )}
    </div>
  );
}
