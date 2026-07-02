import { useEffect, useState, useMemo } from 'react';
import { Plus, ArrowDownCircle, ArrowUpCircle, Scale, Zap, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase, WasteReceipt, TreatmentWasteTransfer, TreatmentDailyLog } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import WasteReceiptFormModal from './WasteReceiptFormModal';
import WasteFlowChart, { type FlowDatum } from './WasteFlowChart';
import DashboardError from '../../components/DashboardError';

type TransferWithDate = TreatmentWasteTransfer & { log_date: string };

export default function WasteOnFloor() {
  usePageTitle('Treatment — Waste on Floor');
  const { isAdmin, isManagement } = useUser();
  const { addToast } = useToast();
  const canEdit = isAdmin || isManagement;

  const [receipts, setReceipts] = useState<WasteReceipt[]>([]);
  const [transfers, setTransfers] = useState<TransferWithDate[]>([]);
  const [treatmentLogs, setTreatmentLogs] = useState<TreatmentDailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    setLoadError('');
    try {
      const [rRes, tRes, logRes] = await Promise.all([
        supabase.from('waste_receipts').select('*').order('date', { ascending: false }),
        supabase.from('treatment_waste_transfers').select('*, treatment_daily_log(date)').order('created_at', { ascending: false }),
        supabase.from('treatment_daily_log').select('id, date, total_treated_kg').order('date', { ascending: false }),
      ]);
      const firstErr = [rRes, tRes, logRes].find(r => r.error)?.error;
      if (firstErr) throw new Error(firstErr.message);
      setReceipts((rRes.data ?? []) as WasteReceipt[]);
      const raw = (tRes.data ?? []) as (TreatmentWasteTransfer & { treatment_daily_log?: { date: string } | null })[];
      setTransfers(raw.map(t => ({ ...t, log_date: t.treatment_daily_log?.date ?? '' })));
      setTreatmentLogs((logRes.data ?? []) as TreatmentDailyLog[]);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load waste-on-floor data');
    } finally {
      setLoading(false);
    }
  }

  const totalReceived = useMemo(() => receipts.reduce((s, r) => s + Number(r.quantity_kg), 0), [receipts]);
  const totalTreated = useMemo(() => treatmentLogs.reduce((s, l) => s + Number(l.total_treated_kg), 0), [treatmentLogs]);
  const totalSentAway = useMemo(() => transfers.reduce((s, t) => s + Number(t.quantity_kg), 0), [transfers]);
  const onFloor = totalReceived - totalTreated - totalSentAway;

  const onFloorPercent = totalReceived > 0 ? (onFloor / totalReceived) * 100 : 0;
  const floorColor = onFloor <= 0 ? 'text-emerald-600' : onFloorPercent > 100 ? 'text-red-600' : onFloorPercent > 80 ? 'text-amber-600' : 'text-emerald-600';

  // Monthly received / removed flow with a running on-floor balance.
  const monthly = useMemo<FlowDatum[]>(() => {
    const m: Record<string, { inKg: number; treated: number; transferred: number }> = {};
    const ensure = (k: string) => (m[k] ||= { inKg: 0, treated: 0, transferred: 0 });
    receipts.forEach(r => { if (r.date) ensure(r.date.substring(0, 7)).inKg += Number(r.quantity_kg); });
    treatmentLogs.forEach(l => { if (l.date) ensure(l.date.substring(0, 7)).treated += Number(l.total_treated_kg); });
    transfers.forEach(t => { if (t.log_date) ensure(t.log_date.substring(0, 7)).transferred += Number(t.quantity_kg); });
    let bal = 0;
    return Object.keys(m).sort().map(mo => {
      const inKg = m[mo].inKg;
      const outKg = m[mo].treated + m[mo].transferred;
      bal += inKg - outKg;
      return { month: mo, inKg, outKg, balance: bal };
    });
  }, [receipts, treatmentLogs, transfers]);

  if (loadError) return <DashboardError title="Waste on Floor" message={loadError} onRetry={loadData} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Waste on Floor</h1>
          <p className="text-sm text-gray-500 mt-1">How much untreated waste is currently held on the floor</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm(true)}
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

      {/* Monthly movement chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-900">Monthly Movement &amp; Floor Balance</h2>
        <p className="text-xs text-gray-500 mt-0.5 mb-4">Waste received vs removed each month, with the running on-floor balance</p>
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-600" /></div>
        ) : monthly.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">No data yet</div>
        ) : (
          <WasteFlowChart data={monthly} />
        )}
      </div>

      <p className="text-xs text-gray-400">
        Individual receipts and transfers are managed in{' '}
        <Link to="/treatment/transfers" className="text-cyan-600 hover:underline inline-flex items-center gap-1">
          Treatment → Transfers <ExternalLink size={10} />
        </Link>
      </p>

      {showForm && (
        <WasteReceiptFormModal
          receipt={null}
          onClose={() => setShowForm(false)}
          onSave={() => { setShowForm(false); addToast('Receipt recorded'); loadData(); }}
        />
      )}
    </div>
  );
}
