import { useEffect, useState, useMemo } from 'react';
import { Plus, ChevronDown } from 'lucide-react';
import { supabase, TreatmentWasteTransfer, TreatmentMonthlySummary } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { fmtMonth } from '../../lib/formatters';
import { PageSpinner } from '../../components/Spinner';
import { type ActiveTab, type TransferWithDate, type DailyLogRef } from './constants';
import TransfersContent from './TransfersContent';
import LandfillContent from './LandfillContent';
import TransferFormModal from './TransferFormModal';
import LandfillFormModal from './LandfillFormModal';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';

export default function TreatmentTransfers() {
  usePageTitle('Treatment — Transfers');
  const { isAdmin } = useUser();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>('Transfers');
  const [transfers, setTransfers] = useState<TransferWithDate[]>([]);
  const [landfillRecords, setLandfillRecords] = useState<TreatmentMonthlySummary[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLogRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState('');
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [editTransfer, setEditTransfer] = useState<TransferWithDate | null>(null);
  const [deletingTransfer, setDeletingTransfer] = useState<TransferWithDate | null>(null);
  const [deletingTransferBusy, setDeletingTransferBusy] = useState(false);
  const [opError, setOpError] = useState('');
  const [showLandfillForm, setShowLandfillForm] = useState(false);
  const [editLandfill, setEditLandfill] = useState<TreatmentMonthlySummary | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [tRes, lRes, lfRes] = await Promise.all([
      supabase.from('treatment_waste_transfers').select('*, treatment_daily_log(date)').order('created_at', { ascending: false }),
      supabase.from('treatment_daily_log').select('id, date').order('date', { ascending: false }),
      supabase.from('treatment_monthly_summary').select('*').order('month', { ascending: false }),
    ]);
    const raw = (tRes.data || []) as (TreatmentWasteTransfer & { treatment_daily_log?: { date: string } | null })[];
    setTransfers(raw.map(t => ({ ...t, log_date: t.treatment_daily_log?.date || '' })));
    setDailyLogs(lRes.data || []);
    setLandfillRecords(lfRes.data || []);
    setLoading(false);
  }

  async function handleDeleteTransfer() {
    if (!deletingTransfer) return;
    setDeletingTransferBusy(true);
    setOpError('');
    const { error } = await supabase.from('treatment_waste_transfers').delete().eq('id', deletingTransfer.id);
    setDeletingTransferBusy(false);
    if (error) { setOpError(error.message); return; }
    setDeletingTransfer(null);
    addToast('Transfer deleted');
    loadData();
  }

  const availableTransferMonths = useMemo(() => {
    const set = new Set<string>();
    transfers.forEach(t => { if (t.log_date) set.add(t.log_date.substring(0, 7)); });
    return Array.from(set).sort().reverse();
  }, [transfers]);

  const availableLandfillMonths = useMemo(() => {
    return landfillRecords.map(r => r.month.substring(0, 7));
  }, [landfillRecords]);

  const filteredTransfers = useMemo(() => {
    if (!monthFilter) return transfers;
    return transfers.filter(t => t.log_date && t.log_date.startsWith(monthFilter));
  }, [transfers, monthFilter]);

  const filteredLandfill = useMemo(() => {
    if (!monthFilter) return landfillRecords;
    return landfillRecords.filter(r => r.month.startsWith(monthFilter));
  }, [landfillRecords, monthFilter]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransfers.forEach(t => {
      map[t.waste_category] = (map[t.waste_category] || 0) + Number(t.quantity_kg);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredTransfers]);

  const byFacility = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransfers.forEach(t => {
      map[t.destination] = (map[t.destination] || 0) + Number(t.quantity_kg);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredTransfers]);

  const totalTransferKg = useMemo(() => filteredTransfers.reduce((s, t) => s + Number(t.quantity_kg), 0), [filteredTransfers]);
  const totalLandfillTons = useMemo(() => filteredLandfill.reduce((s, r) => s + Number(r.total_sent_for_landfill_kg) / 1000, 0), [filteredLandfill]);

  const availableMonths = activeTab === 'Transfers' ? availableTransferMonths : availableLandfillMonths;

  if (loading) {
    return (
      <PageSpinner layout="h64" />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Waste Dispatch</h1>
          <p className="text-sm text-gray-500 mt-1">Transfers to treatment facilities and treated waste dispatched to landfill</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'Transfers' ? (
            <button
              onClick={() => { setEditTransfer(null); setShowTransferForm(true); }}
              className="flex items-center justify-center gap-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm whitespace-nowrap"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Record Transfer</span><span className="sm:hidden">Transfer</span>
            </button>
          ) : (
            <button
              onClick={() => { setEditLandfill(null); setShowLandfillForm(true); }}
              className="flex items-center justify-center gap-1.5 text-sm bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm whitespace-nowrap"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Add Landfill Record</span><span className="sm:hidden">Add Record</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          {(['Transfers', 'Landfill'] as ActiveTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setMonthFilter(''); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? tab === 'Transfers'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === tab ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {tab === 'Transfers' ? transfers.length : landfillRecords.length}
              </span>
            </button>
          ))}
        </div>
        <div className="relative">
          <select
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Time</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>{fmtMonth(m)}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {activeTab === 'Transfers' ? (
        <TransfersContent
          transfers={filteredTransfers}
          byCategory={byCategory}
          byFacility={byFacility}
          totalKg={totalTransferKg}
          monthFilter={monthFilter}
          isAdmin={isAdmin}
          onEdit={t => { setEditTransfer(t); setShowTransferForm(true); }}
          onDelete={t => setDeletingTransfer(t)}
        />
      ) : (
        <LandfillContent
          records={filteredLandfill}
          totalTons={totalLandfillTons}
          monthFilter={monthFilter}
          onEdit={r => { setEditLandfill(r); setShowLandfillForm(true); }}
        />
      )}

      {showTransferForm && (
        <TransferFormModal
          transfer={editTransfer}
          dailyLogs={dailyLogs}
          onClose={() => { setShowTransferForm(false); setEditTransfer(null); }}
          onSave={() => { setShowTransferForm(false); setEditTransfer(null); addToast('Transfer saved'); loadData(); }}
        />
      )}

      {opError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5 mx-4">
          {opError}
        </div>
      )}

      {deletingTransfer && (
        <DeleteConfirmModal
          label={`transfer of ${Number(deletingTransfer.quantity_kg).toLocaleString('en-ZA', { maximumFractionDigits: 1 })} kg (${deletingTransfer.waste_category}) to ${deletingTransfer.destination}`}
          onConfirm={handleDeleteTransfer}
          onClose={() => setDeletingTransfer(null)}
          deleting={deletingTransferBusy}
        />
      )}

      {showLandfillForm && (
        <LandfillFormModal
          record={editLandfill}
          onClose={() => { setShowLandfillForm(false); setEditLandfill(null); }}
          onSave={() => { setShowLandfillForm(false); setEditLandfill(null); addToast('Landfill record saved'); loadData(); }}
        />
      )}
    </div>
  );
}
