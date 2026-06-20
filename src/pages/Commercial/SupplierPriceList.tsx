import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, type SupplierItem } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import SectionTabs from '../../components/SectionTabs';
import { SUPPLIER_TABS } from './commercialTabs';
import { ListView, type Column, type FilterDef } from '../../components/crm';
import { fmtNum } from '../../components/crm/crmUtils';

type PriceRow = SupplierItem & {
  supplier_name: string;
  stock_item: string;
  stock_code: string;
  unit_of_measure: string;
};

function fmtPrice(n: number) {
  return Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SupplierPriceList() {
  usePageTitle('Commercial — Price List');
  const navigate = useNavigate();
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [itemsRes, supRes, stockRes] = await Promise.all([
      supabase.from('supplier_items').select('*'),
      supabase.from('suppliers').select('id, supplier_name'),
      supabase.from('stock_items').select('id, stock_item, stock_code, unit_of_measure'),
    ]);

    const supMap = new Map<string, string>();
    (supRes.data ?? []).forEach((s: { id: string; supplier_name: string }) => supMap.set(s.id, s.supplier_name));
    const stockMap = new Map<string, { stock_item: string; stock_code: string; unit_of_measure: string }>();
    (stockRes.data ?? []).forEach((i: { id: string; stock_item: string; stock_code: string; unit_of_measure: string }) =>
      stockMap.set(i.id, { stock_item: i.stock_item, stock_code: i.stock_code, unit_of_measure: i.unit_of_measure }));

    const enriched: PriceRow[] = ((itemsRes.data ?? []) as SupplierItem[]).map(it => {
      const si = stockMap.get(it.stock_item_id);
      return {
        ...it,
        supplier_name: supMap.get(it.supplier_id) ?? '(unknown supplier)',
        stock_item: si?.stock_item ?? '(item removed)',
        stock_code: si?.stock_code ?? '',
        unit_of_measure: si?.unit_of_measure ?? '',
      };
    }).sort((a, b) => a.stock_item.localeCompare(b.stock_item) || a.supplier_name.localeCompare(b.supplier_name));

    setRows(enriched);
    setLoading(false);
  }

  const columns: Column<PriceRow>[] = useMemo(() => [
    {
      key: 'item',
      header: 'Item',
      cell: r => (
        <div>
          <div className="font-medium text-gray-900">{r.stock_item}</div>
          {r.stock_code && <div className="text-[11px] text-gray-400 font-mono mt-0.5">{r.stock_code}</div>}
        </div>
      ),
      sortValue: r => r.stock_item,
      exportValue: r => r.stock_item,
    },
    {
      key: 'supplier',
      header: 'Supplier',
      cell: r => r.supplier_name,
      sortValue: r => r.supplier_name,
      exportValue: r => r.supplier_name,
    },
    {
      key: 'price',
      header: 'Unit Price',
      cell: r => fmtPrice(r.unit_price),
      sortValue: r => r.unit_price,
      exportValue: r => r.unit_price,
      align: 'right',
    },
    {
      key: 'sku',
      header: 'Supplier SKU',
      cell: r => r.supplier_sku || '—',
      sortValue: r => r.supplier_sku,
      exportValue: r => r.supplier_sku,
    },
    {
      key: 'uom',
      header: 'UOM',
      cell: r => r.unit_of_measure || '—',
      exportValue: r => r.unit_of_measure,
      defaultHidden: true,
    },
  ], []);

  const supplierOptions = useMemo(
    () => [...new Set(rows.map(r => r.supplier_name))].sort().map(v => ({ value: v, label: v })),
    [rows],
  );

  const filters: FilterDef<PriceRow>[] = useMemo(() => [
    { key: 'supplier', label: 'Supplier', options: supplierOptions, predicate: (r, v) => r.supplier_name === v },
  ], [supplierOptions]);

  return (
    <div className="space-y-5">
      <SectionTabs tabs={SUPPLIER_TABS} />

      <ListView<PriceRow>
        objectKey="supplier-price-list"
        title="Price List"
        subtitle={`${fmtNum(rows.length)} item${rows.length !== 1 ? 's' : ''} across suppliers`}
        rows={rows}
        loading={loading}
        columns={columns}
        filters={filters}
        rowId={r => r.id}
        search={r => `${r.stock_item} ${r.stock_code} ${r.supplier_name} ${r.supplier_sku}`}
        searchPlaceholder="Search items or suppliers…"
        onRowClick={r => navigate(`/commercial/suppliers/${r.supplier_id}`)}
        exportName="supplier-price-list"
        savedViews
        emptyMessage="No supplier items yet. Add items on a supplier's Items tab."
      />
    </div>
  );
}
