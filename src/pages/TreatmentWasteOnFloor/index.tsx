import { useEffect, useState, useMemo } from 'react';
import { Plus, Search, ArrowDownCircle, ArrowUpCircle, Scale, Pencil, Trash2, ChevronDown, ExternalLink, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase, WasteReceipt, TreatmentWasteTransfer, TreatmentDailyLog } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import WasteReceiptFormModal from './WasteReceiptFormModal';

type TransferWithDate = TreatmentWasteTransfer & { log_date: string };

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function WasteOnFloor() {
  usePageTitle('Treatment — Waste on Floor');
  const { isAdmin, isManagement } = useUser();
  const { addToast } = useToast();
  const canEdit = isAdmin || isManagement;

  const [receipts, setReceipts] = useState<WasteReceipt[]>([]);
  const [transfers, setTransfers] = useState<TransferWithDate[]>([]);
  const [treatmentLogs, setTreatmentLogs] = useState<TreatmentDailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'receipts' | 'transfers'>('receipts');
  const [showForm, setShowForm] = useState(false);
  const [editReceipt, setEditReceipt] = useState<WasteReceipt | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WasteReceipt | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [rRes, tRes, logRes] = await Promise.all([
      supabase.from('waste_receipts').select('*').order('date', { ascending: false }),
      supabase.from('treatment_waste_transfers').select('*, treatment_daily_log(date)').order('created_at', { ascending: false }),
      supabase.from('treatment_daily_log').select('id, date, total_treated_kg').order('date', { ascending: false }),
    ]);
    setReceipts((rRes.data ?? []) as WasteReceipt[]);
    const raw = (tRes.data ?? []) as (TreatmentWasteTransfer & { treatment_daily_log?: { date: string } | null })[];
    setTransfers(raw.map(t => ({ ...t, log_date: t.treatment_daily_log?.date ?? '' })));
    setTreatmentLogs((logRes.data ?? []) as TreatmentDailyLog[]);
    setLoading(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from('waste_receipts').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    addToast('Receipt deleted');
    loadData();
  }

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    receipts.forEach(r => set.add(r.date.substring(0, 7)));
    transfers.forEach(t => t.log_date && set.add(t.log_date.substring(0, 7)));
    return Array.from(set).sort().reverse();
  }, [receipts, transfers]);

  const totalReceived = useMemo(() => receipts.reduce((s, r) => s + Number(r.quantity_kg), 0), [receipts]);
  const totalTreated = useMemo(() => treatmentLogs.reduce((s, l) => s + Number(l.total_treated_kg), 0), [treatmentLogs]);
  const totalSentAway = useMemo(() => transfers.reduce((s, t) => s + Number(t.quantity_kg), 0), [transfers]);
  const onFloor = totalReceived - totalTreated - totalSentAway;

  const filteredReceipts = useMemo(() => {
    const q = search.toLowerCase();
    return receipts.filter(r => {
      if (monthFilter && !r.date.startsWith(monthFilter)) return false;
      if (q) return r.client_name.toLowerCase().includes(q) || r.waste_type.toLowerCase().includes(q) || r.manifest_number.toLowerCase().includes(q);
      return true;
    });
  }, [receipts, search, monthFilter]);

  const filteredTransfers = useMemo(() => {
    const q = search.toLowerCase();
    return transfers.filter(t => {
      if (monthFilter && t.log_date && !t.log_date.startsWith(monthFilter)) return false;
      if (q) return t.waste_category.toLowerCase().includes(q) || t.destination.toLowerCase().includes(q) || t.manifest_number.toLowerCase().includes(q);
      return true;
    });
  }, [transfers, search, monthFilter]);

  const onFloorPercent = totalReceived > 0 ? (onFloor / totalReceived) * 100 : 0;
  const floorColor = onFloor <= 0 ? 'text-emerald-600' : onFloorPercent > 100 ? 'text-red-600' : onFloorPercent > 80 ? 'text-amber-600' : 'text-emerald-600';
  const barColor = onFloor <= 0 ? 'bg-emerald-500' : onFloorPercent > 100 ? 'bg-red-500' : onFloorPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Waste on Floor</h1>
          <p className="text-sm text-gray-500 mt-1">Inbound waste receipts vs outbound transfers — current floor balance</p>
        </div>
        {canEdit && (
          <button
            onClick={() => { setEditReceipt(null); setShowForm(true); }}
            className="flex items-center gap-1.5 text-sm bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm whitespace-nowrap"
          >
            <Plus size={16} /> Record Receipt
          </button>
        )}
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 sm:p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <ArrowDownCircle size={18} className="text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-gray-900 truncate">{totalReceived.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</p>
            <p className="text-xs text-gray-500 font-medium">Received (kg)</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 sm:p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Zap size={18} className="text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-gray-900 truncate">{totalTreated.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</p>
            <p className="text-xs text-gray-500 font-medium">Treated (kg)</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 sm:p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
            <ArrowUpCircle size={18} className="text-orange-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-gray-900 truncate">{totalSentAway.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</p>
            <p className="text-xs text-gray-500 font-medium">Transferred (kg)</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 sm:p-4 flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${onFloor <= 0 ? 'bg-emerald-100' : onFloorPercent > 80 ? 'bg-amber-100' : 'bg-cyan-100'}`}>
            <Scale size={18} className={floorColor} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xl font-bold truncate ${floorColor}`}>{Math.max(0, onFloor).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</p>
            <p className="text-xs text-gray-500 font-medium">On Floor (kg)</p>
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-400 -mt-2">On Floor = Received − Treated − Transferred</p>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by client, waste type or manifest..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
          />
        </div>
        <div className="relative">
          <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 w-full sm:w-auto">
            <option value="">All Time</option>
            {availableMonths.map(m => {
              const [y, mo] = m.split('-').map(Number);
              const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
              return <option key={m} value={m}>{names[mo - 1]} {y}</option>;
            })}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['receipts', 'transfers'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab === 'receipts' ? `Receipts In (${filteredReceipts.length})` : `Transfers Out (${filteredTransfers.length})`}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-600" /></div>
        ) : activeTab === 'receipts' ? (
          filteredReceipts.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">No receipts recorded yet</div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-800 text-white">
                      <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider whitespace-nowrap">Receipt #</th>
                      <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider whitespace-nowrap">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">Client</th>
                      <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider whitespace-nowrap">Waste Type</th>
                      <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider whitespace-nowrap">Qty (kg)</th>
                      <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider whitespace-nowrap">Manifest</th>
                      <th className="px-4 py-3 w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredReceipts.map((r, idx) => (
                      <tr key={r.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} hover:bg-cyan-50/30 transition`}>
                        <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap">{r.receipt_number}</td>
                        <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{fmt(r.date)}</td>
                        <td className="px-4 py-2.5 text-gray-700 max-w-[180px] truncate">{r.client_name}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-cyan-100 text-cyan-700">{r.waste_type}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap">
                          {Number(r.quantity_kg).toLocaleString('en-ZA', { maximumFractionDigits: 1 })}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{r.manifest_number || '—'}</td>
                        <td className="px-4 py-2.5">
                          {canEdit && (
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => { setEditReceipt(r); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => setDeleteTarget(r)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {filteredReceipts.map(r => (
                  <div key={r.id} className="px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900 truncate">{r.client_name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-100 text-cyan-700 flex-shrink-0">{r.waste_type}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {r.receipt_number} · {fmt(r.date)} · <strong className="text-gray-600">{Number(r.quantity_kg).toLocaleString('en-ZA', { maximumFractionDigits: 1 })} kg</strong>
                          {r.manifest_number && ` · ${r.manifest_number}`}
                        </p>
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button onClick={() => { setEditReceipt(r); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-cyan-600 rounded-lg transition">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setDeleteTarget(r)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )
        ) : (
          /* Transfers tab — read-only view of existing transfer data */
          filteredTransfers.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">
              No transfers recorded.{' '}
              <Link to="/treatment/transfers" className="text-cyan-600 hover:underline inline-flex items-center gap-1">
                Go to Transfers <ExternalLink size={12} />
              </Link>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-800 text-white">
                      <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider whitespace-nowrap">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">Category</th>
                      <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider whitespace-nowrap">Qty (kg)</th>
                      <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">Destination</th>
                      <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider whitespace-nowrap">Manifest</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTransfers.map((t, idx) => (
                      <tr key={t.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} hover:bg-orange-50/20 transition`}>
                        <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{t.log_date ? fmt(t.log_date) : '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">{t.waste_category}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap">
                          {Number(t.quantity_kg).toLocaleString('en-ZA', { maximumFractionDigits: 1 })}
                        </td>
                        <td className="px-4 py-2.5 text-gray-700 max-w-[200px] truncate">{t.destination}</td>
                        <td className="px-4 py-2.5 text-gray-500">{t.manifest_number || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden divide-y divide-gray-100">
                {filteredTransfers.map(t => (
                  <div key={t.id} className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-gray-800 truncate">{t.destination}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700 flex-shrink-0">{t.waste_category}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {t.log_date ? fmt(t.log_date) : '—'} · <strong className="text-gray-600">{Number(t.quantity_kg).toLocaleString('en-ZA', { maximumFractionDigits: 1 })} kg</strong>
                      {t.manifest_number && ` · ${t.manifest_number}`}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )
        )}
      </div>

      <p className="text-xs text-gray-400">
        Transfers data is managed in{' '}
        <Link to="/treatment/transfers" className="text-cyan-600 hover:underline inline-flex items-center gap-1">
          Treatment → Transfers <ExternalLink size={10} />
        </Link>
      </p>

      {showForm && (
        <WasteReceiptFormModal
          receipt={editReceipt}
          onClose={() => { setShowForm(false); setEditReceipt(null); }}
          onSave={() => { setShowForm(false); setEditReceipt(null); addToast(editReceipt ? 'Receipt updated' : 'Receipt recorded'); loadData(); }}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          label={`receipt ${deleteTarget.receipt_number}`}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}
