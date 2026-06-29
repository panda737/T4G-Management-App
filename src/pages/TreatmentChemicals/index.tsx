import { useEffect, useState, useMemo } from 'react';
import { Plus, Beaker, Droplets, Wallet, Gauge, Settings, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import {
  supabase, getStockStatus,
  type TreatmentChemical, type TreatmentChemicalUsage, type StockItem, type Supplier,
} from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import { MONTHS } from '../TreatmentDashboard/constants';
import MobileNavButton from '../../components/MobileNavButton';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import UsageFormModal from './UsageFormModal';
import ChemicalConfigModal from './ChemicalConfigModal';

const fmtL = (n: number) => n.toLocaleString('en-ZA', { maximumFractionDigits: 1 });
const fmtR = (n: number) => `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const monthKey = (d: string) => d.substring(0, 7); // 'YYYY-MM'
const monthLabel = (key: string) => {
  const [y, m] = key.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
};

export default function TreatmentChemicals() {
  usePageTitle('Treatment — Chemicals');
  const { isAdmin, isManagement } = useUser();
  const { addToast } = useToast();
  const canManage = isAdmin || isManagement;

  const [chemical, setChemical] = useState<TreatmentChemical | null>(null);
  const [stockItem, setStockItem] = useState<StockItem | null>(null);
  const [supplierName, setSupplierName] = useState('');
  const [unitPrice, setUnitPrice] = useState(0);
  const [usage, setUsage] = useState<TreatmentChemicalUsage[]>([]);
  const [monthCycles, setMonthCycles] = useState<Record<string, number>>({});
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const [showConfig, setShowConfig] = useState(false);
  const [showUsage, setShowUsage] = useState(false);
  const [editUsage, setEditUsage] = useState<TreatmentChemicalUsage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TreatmentChemicalUsage | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    // The catalog supports many chemicals; for now we track the first active one.
    const [chemRes, logRes, itemsRes, supRes] = await Promise.all([
      supabase.from('treatment_chemicals').select('*').eq('active', true).order('created_at').limit(1),
      supabase.from('treatment_daily_log').select('date, total_cycles'),
      supabase.from('stock_items').select('*').eq('active', true).order('stock_item'),
      supabase.from('suppliers').select('id, supplier_name').eq('active', true).order('supplier_name'),
    ]);

    const chem = (chemRes.data?.[0] ?? null) as TreatmentChemical | null;
    setChemical(chem);
    setStockItems((itemsRes.data ?? []) as StockItem[]);
    setSuppliers((supRes.data ?? []) as Supplier[]);

    const cycles: Record<string, number> = {};
    for (const l of (logRes.data ?? []) as { date: string; total_cycles: number }[]) {
      if (l.date) cycles[monthKey(l.date)] = (cycles[monthKey(l.date)] ?? 0) + Number(l.total_cycles ?? 0);
    }
    setMonthCycles(cycles);

    if (chem) {
      const [itemRes, usageRes, priceRes] = await Promise.all([
        supabase.from('stock_items').select('*').eq('id', chem.stock_item_id).maybeSingle(),
        supabase.from('treatment_chemical_usage').select('*').eq('chemical_id', chem.id).order('month', { ascending: false }),
        chem.supplier_id
          ? supabase.from('supplier_items').select('unit_price').eq('supplier_id', chem.supplier_id).eq('stock_item_id', chem.stock_item_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setStockItem((itemRes.data ?? null) as StockItem | null);
      setUsage((usageRes.data ?? []) as TreatmentChemicalUsage[]);
      setUnitPrice(Number((priceRes.data as { unit_price?: number } | null)?.unit_price ?? 0));

      if (chem.supplier_id) {
        const sup = (supRes.data ?? []).find((s: { id: string }) => s.id === chem.supplier_id) as { supplier_name?: string } | undefined;
        setSupplierName(sup?.supplier_name ?? '');
      } else {
        setSupplierName('');
      }
    } else {
      setStockItem(null);
      setUsage([]);
      setUnitPrice(0);
      setSupplierName('');
    }
    setLoading(false);
  }

  const rate = chemical?.litres_per_cycle ?? 0;
  const onHand = stockItem?.current_quantity ?? 0;
  const uom = stockItem?.unit_of_measure || 'L';
  const recordedMonths = useMemo(() => usage.map(u => monthKey(u.month)), [usage]);

  // Merge months that have cycles and/or a usage record, newest first.
  const rows = useMemo(() => {
    const keys = new Set<string>([...Object.keys(monthCycles), ...recordedMonths]);
    return Array.from(keys).sort().reverse().map(key => {
      const cycles = monthCycles[key] ?? 0;
      const expectedLive = cycles * rate;
      const u = usage.find(x => monthKey(x.month) === key) ?? null;
      return { key, cycles, expectedLive, u };
    });
  }, [monthCycles, recordedMonths, usage, rate]);

  const yearKey = String(new Date().getFullYear());
  const ytd = useMemo(() => {
    const rowsYtd = usage.filter(u => monthKey(u.month).startsWith(yearKey));
    return {
      actual: rowsYtd.reduce((s, u) => s + Number(u.actual_litres), 0),
      variance: rowsYtd.reduce((s, u) => s + Number(u.variance_litres), 0),
      cost: rowsYtd.reduce((s, u) => s + Number(u.total_cost), 0),
    };
  }, [usage, yearKey]);

  // ── Stock-movement helpers (reuse the atomic mover used by Stock receipts) ──
  async function postMovement(deltaLitres: number, type: string, key: string, groupId: string) {
    if (!chemical || !stockItem || deltaLitres === 0) return;
    const { error } = await supabase.rpc('record_stock_movement_group', {
      p_movements: [{
        stock_item_id: chemical.stock_item_id,
        stock_code: stockItem.stock_code,
        stock_item: stockItem.stock_item,
        movement_type: type,
        quantity: Math.abs(deltaLitres),
        delta: deltaLitres,
      }],
      p_reference_number: `CHEM-${key}`,
      p_supplier_client_dept: 'Treatment Plant',
      p_group_notes: `Chemical usage · ${monthLabel(key)}`,
      p_movement_group_id: groupId,
      p_movement_group_label: `Chemical usage · ${monthLabel(key)}`,
    });
    if (error) throw error;
  }

  async function handleCreateUsage(values: { month: string; actual_litres: number; notes: string }) {
    if (!chemical) return;
    const key = monthKey(values.month);
    const expected = (monthCycles[key] ?? 0) * rate;
    const groupId = crypto.randomUUID();
    const { data, error } = await supabase.from('treatment_chemical_usage').insert({
      chemical_id: chemical.id,
      month: `${key}-01`,
      expected_litres: expected,
      actual_litres: values.actual_litres,
      unit_cost: unitPrice,
      notes: values.notes,
      movement_group_id: groupId,
    }).select('id').single();
    if (error) {
      if (error.code === '23505') throw new Error('Usage for that month is already recorded — edit it instead.');
      throw error;
    }
    try {
      await postMovement(-values.actual_litres, 'Stock Issued', key, groupId);
    } catch (e) {
      // Roll back the usage row if the stock decrement failed (e.g. insufficient stock).
      await supabase.from('treatment_chemical_usage').delete().eq('id', data.id);
      throw e;
    }
    addToast('Usage recorded & stock updated');
    setShowUsage(false);
    loadData();
  }

  async function handleEditUsage(values: { month: string; actual_litres: number; notes: string }) {
    if (!editUsage || !chemical) return;
    const key = monthKey(editUsage.month);
    const delta = -(values.actual_litres - Number(editUsage.actual_litres)); // adjust stock to the new total
    // Post the stock adjustment first so an insufficient-stock failure leaves the row untouched.
    await postMovement(delta, 'Stock Adjusted', key, editUsage.movement_group_id ?? crypto.randomUUID());
    const expected = (monthCycles[key] ?? 0) * rate;
    const { error } = await supabase.from('treatment_chemical_usage').update({
      actual_litres: values.actual_litres,
      expected_litres: expected,
      unit_cost: unitPrice,
      notes: values.notes,
    }).eq('id', editUsage.id);
    if (error) throw error;
    addToast('Usage updated & stock adjusted');
    setEditUsage(null);
    loadData();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // Reverse the original decrement (add the litres back), then remove the record.
      await postMovement(Number(deleteTarget.actual_litres), 'Stock Adjusted', monthKey(deleteTarget.month), deleteTarget.movement_group_id ?? crypto.randomUUID());
      const { error } = await supabase.from('treatment_chemical_usage').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      addToast('Usage removed & stock restored');
      setDeleteTarget(null);
      loadData();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Could not delete usage', 'error');
    } finally {
      setDeleting(false);
    }
  }

  async function handleSaveConfig(values: { stock_item_id: string; supplier_id: string | null; name: string; litres_per_cycle: number }) {
    if (chemical) {
      const { error } = await supabase.from('treatment_chemicals').update(values).eq('id', chemical.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('treatment_chemicals').insert(values);
      if (error) throw error;
    }
    addToast('Chemical saved');
    setShowConfig(false);
    loadData();
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-cyan-600" /></div>;
  }

  // ── Empty state: no chemical configured yet ──
  if (!chemical) {
    return (
      <div className="space-y-5">
        <Header canManage={canManage} onConfig={() => setShowConfig(true)} onRecord={() => setShowUsage(true)} hasChemical={false} />
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm py-16 text-center">
          <Beaker size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">No chemical set up yet</p>
          <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
            Link the chemical stock item (received from your supplier) and set the litres used per cycle to start tracking usage, variance, stock and cost.
          </p>
          {canManage && (
            <button onClick={() => setShowConfig(true)} className="mt-4 inline-flex items-center gap-1.5 text-sm bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg font-medium transition">
              <Settings size={15} /> Set up chemical
            </button>
          )}
        </div>
        {showConfig && (
          <ChemicalConfigModal existing={null} stockItems={stockItems} suppliers={suppliers} onClose={() => setShowConfig(false)} onSubmit={handleSaveConfig} />
        )}
      </div>
    );
  }

  const status = stockItem ? getStockStatus(stockItem) : 'Out of Stock';
  const statusColor = status === 'Out of Stock' ? 'bg-red-100 text-red-700' : status === 'Low Stock' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
  const noPrice = unitPrice <= 0;

  return (
    <div className="space-y-5">
      <Header canManage={canManage} onConfig={() => setShowConfig(true)} onRecord={() => setShowUsage(true)} hasChemical />

      {/* Status cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card icon={<Droplets size={18} className="text-cyan-600" />} bg="bg-cyan-100" value={`${fmtL(onHand)} ${uom}`} label="Stock on hand"
          extra={<span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${statusColor}`}>{status}</span>} />
        <Card icon={<Gauge size={18} className="text-blue-600" />} bg="bg-blue-100" value={`${fmtL(rate)} ${uom}`} label="Per cycle (fixed)" />
        <Card icon={<Wallet size={18} className="text-emerald-600" />} bg="bg-emerald-100" value={noPrice ? '—' : fmtR(unitPrice)} label={`Unit cost / ${uom}`}
          extra={noPrice ? <span className="text-[11px] text-amber-600 font-medium">set price</span> : (supplierName ? <span className="text-[11px] text-gray-400">{supplierName}</span> : undefined)} />
        <Card icon={<Beaker size={18} className="text-violet-600" />} bg="bg-violet-100" value={fmtR(onHand * unitPrice)} label="Stock value" />
      </div>

      {noPrice && (
        <div className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span>No supplier price found for this chemical{supplierName ? ` from ${supplierName}` : ''}. Cost will read as zero until a price is set in the supplier price list.</span>
        </div>
      )}

      {/* YTD summary */}
      <div className="grid grid-cols-3 gap-3">
        <MiniStat label={`Actual used (${yearKey})`} value={`${fmtL(ytd.actual)} ${uom}`} />
        <MiniStat label="Variance (YTD)" value={`${ytd.variance > 0 ? '+' : ''}${fmtL(ytd.variance)} ${uom}`} valueClass={ytd.variance > 0 ? 'text-red-600' : 'text-emerald-600'} />
        <MiniStat label="Spend (YTD)" value={fmtR(ytd.cost)} />
      </div>

      {/* Monthly table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Monthly usage</h2>
          <p className="text-xs text-gray-500 mt-0.5">Expected = cycles × {fmtL(rate)} {uom}. Actual is what you record; variance and cost follow.</p>
        </div>
        {rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No cycles logged yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Month</th>
                  <th className="px-4 py-2.5 text-right">Cycles</th>
                  <th className="px-4 py-2.5 text-right">Expected ({uom})</th>
                  <th className="px-4 py-2.5 text-right">Actual ({uom})</th>
                  <th className="px-4 py-2.5 text-right">Variance ({uom})</th>
                  <th className="px-4 py-2.5 text-right">Cost</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(({ key, cycles, expectedLive, u }) => {
                  const variance = u ? Number(u.variance_litres) : null;
                  return (
                    <tr key={key} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">{monthLabel(key)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{cycles}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{fmtL(u ? Number(u.expected_litres) : expectedLive)}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900">{u ? fmtL(Number(u.actual_litres)) : '—'}</td>
                      <td className={`px-4 py-2.5 text-right font-medium ${variance === null ? 'text-gray-300' : variance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {variance === null ? '—' : `${variance > 0 ? '+' : ''}${fmtL(variance)}`}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{u ? fmtR(Number(u.total_cost)) : '—'}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManage && u && (
                            <>
                              <button onClick={() => setEditUsage(u)} className="text-gray-500 hover:text-cyan-600 transition" title="Edit"><Pencil size={15} /></button>
                              <button onClick={() => setDeleteTarget(u)} className="text-gray-500 hover:text-red-600 transition" title="Delete"><Trash2 size={15} /></button>
                            </>
                          )}
                          {canManage && !u && cycles > 0 && (
                            <button onClick={() => { setEditUsage(null); setShowUsage(true); }} className="text-xs text-cyan-600 hover:underline font-medium">Record</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(showUsage || editUsage) && (
        <UsageFormModal
          existing={editUsage}
          rate={rate}
          uom={uom}
          unitPrice={unitPrice}
          monthCycles={monthCycles}
          recordedMonths={recordedMonths}
          onClose={() => { setShowUsage(false); setEditUsage(null); }}
          onSubmit={editUsage ? handleEditUsage : handleCreateUsage}
        />
      )}
      {showConfig && (
        <ChemicalConfigModal existing={chemical} stockItems={stockItems} suppliers={suppliers} onClose={() => setShowConfig(false)} onSubmit={handleSaveConfig} />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          label={`usage for ${monthLabel(monthKey(deleteTarget.month))}`}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}

function Header({ canManage, onConfig, onRecord, hasChemical }: { canManage: boolean; onConfig: () => void; onRecord: () => void; hasChemical: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Chemicals</h1>
        <p className="text-sm text-gray-500 mt-1">Track chemical usage, variance, stock and cost</p>
      </div>
      <div className="flex items-center gap-2">
        {canManage && hasChemical && (
          <button onClick={onConfig} className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-lg font-medium transition" title="Chemical settings">
            <Settings size={15} />
          </button>
        )}
        {canManage && hasChemical && (
          <button onClick={onRecord} className="flex items-center gap-1.5 text-sm bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm whitespace-nowrap">
            <Plus size={16} /> Record usage
          </button>
        )}
        <MobileNavButton />
      </div>
    </div>
  );
}

function Card({ icon, bg, value, label, extra }: { icon: React.ReactNode; bg: string; value: string; label: string; extra?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 sm:p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-gray-900 truncate">{value}</p>
        <p className="text-xs text-gray-500 font-medium flex items-center gap-1.5">{label} {extra}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value, valueClass = 'text-gray-900' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 sm:p-4">
      <p className={`text-lg font-bold truncate ${valueClass}`}>{value}</p>
      <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
    </div>
  );
}
