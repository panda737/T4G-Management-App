import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, type Supplier } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import SectionTabs from '../../components/SectionTabs';
import { SUPPLIER_TABS } from './commercialTabs';
import { ListView, type Column, type FilterDef } from '../../components/crm';
import { fmtNum, fmtDate } from '../../components/crm/crmUtils';
import SupplierFormModal from './SupplierFormModal';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'inactive', label: 'Inactive' },
];

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

export default function SupplierManagement() {
  usePageTitle('Commercial — Suppliers');
  const navigate = useNavigate();
  const { isAdmin } = useUser();
  const { addToast } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [lastDelivery, setLastDelivery] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'new' | Supplier | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [sRes, iRes, rRes] = await Promise.all([
      supabase.from('suppliers').select('*').order('supplier_name'),
      supabase.from('supplier_items').select('supplier_id'),
      supabase.from('stock_receipts').select('supplier_id, received_date').not('supplier_id', 'is', null),
    ]);
    setSuppliers((sRes.data ?? []) as Supplier[]);

    const ic: Record<string, number> = {};
    (iRes.data ?? []).forEach((r: { supplier_id: string }) => { ic[r.supplier_id] = (ic[r.supplier_id] || 0) + 1; });
    setItemCounts(ic);

    const ld: Record<string, string> = {};
    (rRes.data ?? []).forEach((r: { supplier_id: string; received_date: string }) => {
      if (!ld[r.supplier_id] || r.received_date > ld[r.supplier_id]) ld[r.supplier_id] = r.received_date;
    });
    setLastDelivery(ld);
    setLoading(false);
  }

  // ── columns ───────────────────────────────────────────────────────────────
  const columns: Column<Supplier>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Supplier',
      cell: s => (
        <div>
          <div className="font-medium text-gray-900">{s.supplier_name}</div>
          {s.contact_person && <div className="text-xs text-gray-400 mt-0.5">{s.contact_person}</div>}
        </div>
      ),
      sortValue: s => s.supplier_name,
      exportValue: s => s.supplier_name,
    },
    {
      key: 'code',
      header: 'Code',
      cell: s => s.supplier_code || '—',
      sortValue: s => s.supplier_code,
      exportValue: s => s.supplier_code,
    },
    {
      key: 'status',
      header: 'Status',
      cell: s => <StatusBadge status={s.status} />,
      sortValue: s => s.status,
      exportValue: s => s.status,
    },
    {
      key: 'contact',
      header: 'Contact',
      cell: s => s.contact_person || '—',
      sortValue: s => s.contact_person,
      defaultHidden: true,
    },
    {
      key: 'email',
      header: 'Email',
      cell: s => s.email
        ? <a href={`mailto:${s.email}`} onClick={e => e.stopPropagation()} className="text-indigo-600 hover:underline truncate block max-w-[180px]">{s.email}</a>
        : '—',
      exportValue: s => s.email,
      defaultHidden: true,
    },
    {
      key: 'phone',
      header: 'Phone',
      cell: s => s.phone || '—',
      exportValue: s => s.phone,
      defaultHidden: true,
    },
    {
      key: 'items',
      header: 'Items',
      cell: s => itemCounts[s.id] ?? 0,
      sortValue: s => itemCounts[s.id] ?? 0,
      exportValue: s => itemCounts[s.id] ?? 0,
      align: 'right',
    },
    {
      key: 'last_delivery',
      header: 'Last Delivery',
      cell: s => lastDelivery[s.id] ? fmtDate(lastDelivery[s.id]) : '—',
      sortValue: s => lastDelivery[s.id] ?? '',
      exportValue: s => lastDelivery[s.id] ? fmtDate(lastDelivery[s.id]) : '',
      align: 'right',
    },
  ], [itemCounts, lastDelivery]);

  // ── filters ───────────────────────────────────────────────────────────────
  const filters: FilterDef<Supplier>[] = useMemo(() => [
    { key: 'status', label: 'Status', options: STATUS_OPTIONS, predicate: (s, v) => s.status === v },
  ], []);

  // ── handlers ──────────────────────────────────────────────────────────────
  function handleSaved(saved: Supplier) {
    setSuppliers(prev => {
      const idx = prev.findIndex(s => s.id === saved.id);
      return idx >= 0
        ? prev.map((s, i) => i === idx ? saved : s)
        : [saved, ...prev].sort((a, b) => a.supplier_name.localeCompare(b.supplier_name));
    });
    setModal(null);
    addToast(modal === 'new' ? 'Supplier created' : 'Supplier updated');
  }

  return (
    <div className="space-y-5">
      <SectionTabs tabs={SUPPLIER_TABS} />

      <ListView<Supplier>
        objectKey="suppliers"
        title="Suppliers"
        subtitle={`${fmtNum(suppliers.length)} supplier${suppliers.length !== 1 ? 's' : ''}`}
        rows={suppliers}
        loading={loading}
        columns={columns}
        filters={filters}
        rowId={s => s.id}
        search={s => `${s.supplier_name} ${s.supplier_code} ${s.contact_person} ${s.email}`}
        searchPlaceholder="Search suppliers…"
        onRowClick={s => navigate(`/commercial/suppliers/${s.id}`)}
        onNew={isAdmin ? () => setModal('new') : undefined}
        newLabel="New Supplier"
        exportName="suppliers"
        savedViews
        emptyMessage="No suppliers found."
      />

      {modal !== null && (
        <SupplierFormModal
          supplier={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSaved}
        />
      )}
    </div>
  );
}
