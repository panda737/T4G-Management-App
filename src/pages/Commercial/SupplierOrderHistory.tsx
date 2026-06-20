import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, type StockReceipt } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import SectionTabs from '../../components/SectionTabs';
import { SUPPLIER_TABS } from './commercialTabs';
import { ListView, type Column } from '../../components/crm';
import { fmtNum, fmtDate } from '../../components/crm/crmUtils';

export default function SupplierOrderHistory() {
  usePageTitle('Commercial — Order History');
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<StockReceipt[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [recRes, itemsRes] = await Promise.all([
      supabase.from('stock_receipts').select('*').order('received_date', { ascending: false }),
      supabase.from('stock_receipt_items').select('receipt_id'),
    ]);
    setReceipts((recRes.data ?? []) as StockReceipt[]);
    const c: Record<string, number> = {};
    (itemsRes.data ?? []).forEach((r: { receipt_id: string }) => { c[r.receipt_id] = (c[r.receipt_id] || 0) + 1; });
    setItemCounts(c);
    setLoading(false);
  }

  const columns: Column<StockReceipt>[] = useMemo(() => [
    {
      key: 'receipt',
      header: 'Receipt #',
      cell: r => <span className="font-mono text-xs font-semibold text-gray-900">{r.receipt_number}</span>,
      sortValue: r => r.receipt_number,
      exportValue: r => r.receipt_number,
    },
    {
      key: 'date',
      header: 'Date',
      cell: r => fmtDate(r.received_date),
      sortValue: r => r.received_date,
      exportValue: r => r.received_date,
    },
    {
      key: 'supplier',
      header: 'Supplier',
      cell: r => r.supplier || '—',
      sortValue: r => r.supplier,
      exportValue: r => r.supplier,
    },
    {
      key: 'ref',
      header: 'Reference',
      cell: r => r.supplier_ref || '—',
      sortValue: r => r.supplier_ref,
      exportValue: r => r.supplier_ref,
    },
    {
      key: 'items',
      header: 'Items',
      cell: r => itemCounts[r.id] ?? 0,
      sortValue: r => itemCounts[r.id] ?? 0,
      exportValue: r => itemCounts[r.id] ?? 0,
      align: 'right',
    },
  ], [itemCounts]);

  return (
    <div className="space-y-5">
      <SectionTabs tabs={SUPPLIER_TABS} />

      <ListView<StockReceipt>
        objectKey="supplier-orders"
        title="Order History"
        subtitle={`${fmtNum(receipts.length)} order${receipts.length !== 1 ? 's' : ''} received`}
        rows={receipts}
        loading={loading}
        columns={columns}
        rowId={r => r.id}
        search={r => `${r.receipt_number} ${r.supplier} ${r.supplier_ref}`}
        searchPlaceholder="Search orders…"
        onRowClick={r => navigate('/stock/received', { state: { openReceiptId: r.id } })}
        exportName="supplier-orders"
        savedViews
        emptyMessage="No supplier orders recorded yet."
      />
    </div>
  );
}
