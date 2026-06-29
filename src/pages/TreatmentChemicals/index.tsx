import { useEffect, useState, useMemo } from 'react';
import { Plus, Beaker, Droplets, Wallet, Activity, Settings, Pencil, Trash2, AlertTriangle, PackageSearch } from 'lucide-react';
import {
  supabase, getStockStatus,
  type TreatmentChemical, type TreatmentChemicalBookout, type StockItem, type Supplier,
} from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import { MONTHS } from '../TreatmentDashboard/constants';
import MobileNavButton from '../../components/MobileNavButton';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import BookOutModal from './BookOutModal';
import ChemicalConfigModal from './ChemicalConfigModal';

// Employees eligible to be recorded as the person who booked chemical out.
export const BOOKOUT_POSITIONS = [
  'Stock Controller', 'Supervisor', 'Senior Operator', 'Maintenance',
  'Health & Safety Officer', 'Operations Manager',
];

export type SupplierItemLink = { supplier_id: string; stock_item_id: string; unit_price: number };
export type EligibleEmployee = { id: string; first_name: string; surname: string; position: string };
type BookoutRow = TreatmentChemicalBookout & { employees?: { first_name: string; surname: string } | null };

const fmtL = (n: number) => n.toLocaleString('en-ZA', { maximumFractionDigits: 0 });
const fmtU = (n: number) => n.toLocaleString('en-ZA', { maximumFractionDigits: 1 });
const fmtR = (n: number) => `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const mKey = (d: string) => d.substring(0, 7);
const mLabel = (key: string) => { const [y, m] = key.split('-'); return `${MONTHS[Number(m) - 1]} ${y}`; };

export default function TreatmentChemicals() {
  usePageTitle('Treatment — Chemicals');
  const { canWrite } = useUser();
  const { addToast } = useToast();
  const canManage = canWrite('stock');

  const [chemical, setChemical] = useState<TreatmentChemical | null>(null);
  const [stockItem, setStockItem] = useState<StockItem | null>(null);
  const [supplierName, setSupplierName] = useState('');
  const [unitPrice, setUnitPrice] = useState(0); // price per IBC (per stock unit)
  const [bookouts, setBookouts] = useState<BookoutRow[]>([]);
  const [systemByMonth, setSystemByMonth] = useState<Record<string, number>>({});
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [suppliers, setSuppliers] = useState<Pick<Supplier, 'id' | 'supplier_name'>[]>([]);
  const [supplierItems, setSupplierItems] = useState<SupplierItemLink[]>([]);
  const [employees, setEmployees] = useState<EligibleEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  const [showConfig, setShowConfig] = useState(false);
  const [showBookout, setShowBookout] = useState(false);
  const [editBookout, setEditBookout] = useState<BookoutRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BookoutRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [chemRes, logRes, itemsRes, supRes, supItemsRes, empRes] = await Promise.all([
      supabase.from('treatment_chemicals').select('*').eq('active', true).order('created_at').limit(1),
      supabase.from('treatment_daily_log').select('date, chemical_litres'),
      supabase.from('stock_items').select('*').eq('active', true).order('stock_item'),
      supabase.from('suppliers').select('id, supplier_name').eq('active', true).order('supplier_name'),
      supabase.from('supplier_items').select('supplier_id, stock_item_id, unit_price'),
      supabase.from('employees').select('id, first_name, surname, position').in('position', BOOKOUT_POSITIONS).eq('status', 'active').order('surname'),
    ]);

    const chem = (chemRes.data?.[0] ?? null) as TreatmentChemical | null;
    const items = (itemsRes.data ?? []) as StockItem[];
    const supItems = (supItemsRes.data ?? []) as SupplierItemLink[];
    const sups = (supRes.data ?? []) as { id: string; supplier_name: string }[];
    setChemical(chem);
    setStockItems(items);
    setSuppliers(sups);
    setSupplierItems(supItems);
    setEmployees((empRes.data ?? []) as EligibleEmployee[]);

    // System usage per month = sum of daily-log chemical_litres (already cycles × 27 L).
    const sys: Record<string, number> = {};
    for (const l of (logRes.data ?? []) as { date: string; chemical_litres: number }[]) {
      if (l.date) sys[mKey(l.date)] = (sys[mKey(l.date)] ?? 0) + Number(l.chemical_litres ?? 0);
    }
    setSystemByMonth(sys);

    if (chem) {
      setStockItem(items.find(i => i.id === chem.stock_item_id) ?? null);
      const link = supItems.find(s => s.supplier_id === chem.supplier_id && s.stock_item_id === chem.stock_item_id);
      setUnitPrice(Number(link?.unit_price ?? 0));
      setSupplierName(sups.find(s => s.id === chem.supplier_id)?.supplier_name ?? '');
      const boRes = await supabase
        .from('treatment_chemical_bookouts')
        .select('*, employees(first_name, surname)')
        .eq('chemical_id', chem.id)
        .order('bookout_date', { ascending: false });
      setBookouts((boRes.data ?? []) as BookoutRow[]);
    } else {
      setStockItem(null); setUnitPrice(0); setSupplierName(''); setBookouts([]);
    }
    setLoading(false);
  }

  const litresPerUnit = chemical?.litres_per_unit ?? 0;
  const onHandUnits = stockItem?.current_quantity ?? 0;
  const onHandLitres = onHandUnits * litresPerUnit;

  const bookedByMonth = useMemo(() => {
    const m: Record<string, { units: number; litres: number; cost: number }> = {};
    for (const b of bookouts) {
      const k = mKey(b.bookout_date);
      (m[k] ||= { units: 0, litres: 0, cost: 0 });
      m[k].units += Number(b.units); m[k].litres += Number(b.litres); m[k].cost += Number(b.total_cost);
    }
    return m;
  }, [bookouts]);

  const rows = useMemo(() => {
    const keys = new Set<string>([...Object.keys(systemByMonth), ...Object.keys(bookedByMonth)]);
    return Array.from(keys).sort().reverse().map(key => ({
      key,
      system: systemByMonth[key] ?? 0,
      booked: bookedByMonth[key] ?? { units: 0, litres: 0, cost: 0 },
    }));
  }, [systemByMonth, bookedByMonth]);

  const thisMonth = mKey(new Date().toISOString());
  const sysThis = systemByMonth[thisMonth] ?? 0;
  const bookThis = bookedByMonth[thisMonth] ?? { units: 0, litres: 0, cost: 0 };

  // ── Stock movement helper (reuses the atomic mover used by Stock receipts) ──
  async function postMovement(deltaUnits: number, type: string, groupId: string) {
    if (!chemical || !stockItem || deltaUnits === 0) return;
    const { error } = await supabase.rpc('record_stock_movement_group', {
      p_movements: [{
        stock_item_id: chemical.stock_item_id,
        stock_code: stockItem.stock_code,
        stock_item: stockItem.stock_item,
        movement_type: type,
        quantity: Math.abs(deltaUnits),
        delta: deltaUnits,
      }],
      p_reference_number: 'CHEM-OUT',
      p_supplier_client_dept: 'Treatment Plant',
      p_group_notes: 'Chemical book-out',
      p_movement_group_id: groupId,
      p_movement_group_label: 'Chemical book-out',
    });
    if (error) throw error;
  }

  async function handleCreate(v: BookoutValues) {
    if (!chemical) return;
    const groupId = crypto.randomUUID();
    const { data, error } = await supabase.from('treatment_chemical_bookouts').insert({
      chemical_id: chemical.id,
      bookout_date: v.bookout_date,
      units: v.units,
      litres: v.units * litresPerUnit,
      unit_cost: unitPrice,
      booked_out_by_employee_id: v.booked_out_by_employee_id,
      notes: v.notes,
      movement_group_id: groupId,
    }).select('id').single();
    if (error) throw error;
    try {
      await postMovement(-v.units, 'Stock Issued', groupId);
    } catch (e) {
      await supabase.from('treatment_chemical_bookouts').delete().eq('id', data.id);
      throw e;
    }
    addToast('Booked out & stock updated');
    setShowBookout(false);
    loadData();
  }

  async function handleEdit(v: BookoutValues) {
    if (!editBookout) return;
    const delta = -(v.units - Number(editBookout.units)); // adjust stock to the new amount
    await postMovement(delta, 'Stock Adjusted', editBookout.movement_group_id ?? crypto.randomUUID());
    const { error } = await supabase.from('treatment_chemical_bookouts').update({
      bookout_date: v.bookout_date,
      units: v.units,
      litres: v.units * litresPerUnit,
      unit_cost: unitPrice,
      booked_out_by_employee_id: v.booked_out_by_employee_id,
      notes: v.notes,
    }).eq('id', editBookout.id);
    if (error) throw error;
    addToast('Book-out updated & stock adjusted');
    setEditBookout(null);
    loadData();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await postMovement(Number(deleteTarget.units), 'Stock Adjusted', deleteTarget.movement_group_id ?? crypto.randomUUID());
      const { error } = await supabase.from('treatment_chemical_bookouts').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      addToast('Book-out removed & stock restored');
      setDeleteTarget(null);
      loadData();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Could not delete', 'error');
    } finally {
      setDeleting(false);
    }
  }

  async function handleSaveConfig(values: { stock_item_id: string; supplier_id: string | null; name: string; litres_per_unit: number }) {
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

  if (!chemical) {
    return (
      <div className="space-y-5">
        <Header canManage={canManage} hasChemical={false} onConfig={() => setShowConfig(true)} onBookout={() => setShowBookout(true)} />
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm py-16 text-center">
          <Beaker size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">No chemical set up yet</p>
          <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
            Pick the supplier (Chempower) and its chemical item, and set the litres per container, to start tracking stock, system usage and book-outs.
          </p>
          {canManage && (
            <button onClick={() => setShowConfig(true)} className="mt-4 inline-flex items-center gap-1.5 text-sm bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg font-medium transition">
              <Settings size={15} /> Set up chemical
            </button>
          )}
        </div>
        {showConfig && (
          <ChemicalConfigModal existing={null} stockItems={stockItems} suppliers={suppliers} supplierItems={supplierItems} onClose={() => setShowConfig(false)} onSubmit={handleSaveConfig} />
        )}
      </div>
    );
  }

  const status = stockItem ? getStockStatus(stockItem) : 'Out of Stock';
  const statusColor = status === 'Out of Stock' ? 'bg-red-100 text-red-700' : status === 'Low Stock' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
  const noPrice = unitPrice <= 0;
  const uom = stockItem?.unit_of_measure || 'IBC';

  return (
    <div className="space-y-5">
      <Header canManage={canManage} hasChemical onConfig={() => setShowConfig(true)} onBookout={() => { setEditBookout(null); setShowBookout(true); }} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card icon={<Droplets size={18} className="text-cyan-600" />} bg="bg-cyan-100" value={`${fmtL(onHandLitres)} L`} label={`On site · ${fmtU(onHandUnits)} ${uom}`}
          extra={<span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${statusColor}`}>{status}</span>} />
        <Card icon={<Activity size={18} className="text-blue-600" />} bg="bg-blue-100" value={`${fmtL(sysThis)} L`} label="System used (this month)" />
        <Card icon={<PackageSearch size={18} className="text-amber-600" />} bg="bg-amber-100" value={`${fmtL(bookThis.litres)} L`} label={`Booked out (this month) · ${fmtU(bookThis.units)} ${uom}`} />
        <Card icon={<Wallet size={18} className="text-emerald-600" />} bg="bg-emerald-100" value={noPrice ? '—' : fmtR(unitPrice)} label={`Cost / ${uom}`}
          extra={noPrice ? <span className="text-[11px] text-amber-600 font-medium">set price</span> : (supplierName ? <span className="text-[11px] text-gray-400">{supplierName}</span> : undefined)} />
      </div>

      {noPrice && (
        <div className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span>No supplier price found{supplierName ? ` from ${supplierName}` : ''} for this item — cost reads as zero until a price is set in the supplier price list.</span>
        </div>
      )}

      {/* Monthly comparison: system usage vs what was booked out */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">System usage vs booked out</h2>
          <p className="text-xs text-gray-500 mt-0.5">System used = cycles × 27 L (from daily logs). A big gap vs booked out is worth investigating.</p>
        </div>
        {rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">No data yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Month</th>
                  <th className="px-4 py-2.5 text-right">System used (L)</th>
                  <th className="px-4 py-2.5 text-right">Booked out ({uom})</th>
                  <th className="px-4 py-2.5 text-right">Booked out (L)</th>
                  <th className="px-4 py-2.5 text-right">Difference (L)</th>
                  <th className="px-4 py-2.5 text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(({ key, system, booked }) => {
                  const diff = booked.litres - system;
                  return (
                    <tr key={key} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">{mLabel(key)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{fmtL(system)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{booked.units ? fmtU(booked.units) : '—'}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{booked.litres ? fmtL(booked.litres) : '—'}</td>
                      <td className={`px-4 py-2.5 text-right font-medium ${diff > 0 ? 'text-red-600' : diff < 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                        {diff === 0 ? '—' : `${diff > 0 ? '+' : ''}${fmtL(diff)}`}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{booked.cost ? fmtR(booked.cost) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Book-out log (the events that move stock) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Book-out log</h2>
          <p className="text-xs text-gray-500 mt-0.5">Each book-out deducts from stock on hand.</p>
        </div>
        {bookouts.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">No book-outs recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Booked out by</th>
                  <th className="px-4 py-2.5 text-right">{uom}</th>
                  <th className="px-4 py-2.5 text-right">Litres</th>
                  <th className="px-4 py-2.5 text-right">Cost</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookouts.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{new Date(b.bookout_date).toLocaleDateString('en-ZA')}</td>
                    <td className="px-4 py-2.5 text-gray-900">{b.employees ? `${b.employees.first_name} ${b.employees.surname}` : '—'}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900">{fmtU(Number(b.units))}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{fmtL(Number(b.litres))}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{fmtR(Number(b.total_cost))}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {canManage && (
                          <>
                            <button onClick={() => setEditBookout(b)} className="text-gray-500 hover:text-cyan-600 transition" title="Edit"><Pencil size={15} /></button>
                            <button onClick={() => setDeleteTarget(b)} className="text-gray-500 hover:text-red-600 transition" title="Delete"><Trash2 size={15} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(showBookout || editBookout) && (
        <BookOutModal
          existing={editBookout}
          uom={uom}
          litresPerUnit={litresPerUnit}
          unitPrice={unitPrice}
          employees={employees}
          onClose={() => { setShowBookout(false); setEditBookout(null); }}
          onSubmit={editBookout ? handleEdit : handleCreate}
        />
      )}
      {showConfig && (
        <ChemicalConfigModal existing={chemical} stockItems={stockItems} suppliers={suppliers} supplierItems={supplierItems} onClose={() => setShowConfig(false)} onSubmit={handleSaveConfig} />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          label={`book-out of ${fmtU(Number(deleteTarget.units))} ${uom} on ${new Date(deleteTarget.bookout_date).toLocaleDateString('en-ZA')}`}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}

type BookoutValues = { bookout_date: string; units: number; booked_out_by_employee_id: string | null; notes: string };

function Header({ canManage, hasChemical, onConfig, onBookout }: { canManage: boolean; hasChemical: boolean; onConfig: () => void; onBookout: () => void }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Chemicals</h1>
        <p className="text-sm text-gray-500 mt-1">Chemical on site, system usage and book-outs</p>
      </div>
      <div className="flex items-center gap-2">
        {canManage && hasChemical && (
          <button onClick={onConfig} className="flex items-center gap-1.5 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-lg font-medium transition" title="Chemical settings">
            <Settings size={15} />
          </button>
        )}
        {canManage && hasChemical && (
          <button onClick={onBookout} className="flex items-center gap-1.5 text-sm bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm whitespace-nowrap">
            <Plus size={16} /> Book out
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
