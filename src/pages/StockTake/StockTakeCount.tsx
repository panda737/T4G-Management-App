import { useEffect, useState, useMemo } from 'react';
import {
  ArrowLeft, Printer, CheckCheck, ThumbsUp, Wrench,
  AlertOctagon, CheckCircle,
} from 'lucide-react';
import { PageSpinner } from '../../components/Spinner';
import { supabase } from '../../lib/supabase';
import type { StockTakeSession, StockTakeLineItem } from '../../lib/supabase';
import Modal from '../../components/Modal';
import { STATUS_STYLE, STATUS_ICON, sortedCategories, groupByCategory } from './constants';
import CountRow from './CountRow';

interface CountProps {
  session: StockTakeSession;
  onBack: () => void;
  onSessionUpdate: (s: StockTakeSession) => void;
  onReport: () => void;
}

export default function StockTakeCount({ session, onBack, onSessionUpdate, onReport }: CountProps) {
  const [lines, setLines] = useState<StockTakeLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [approvalName, setApprovalName] = useState('');
  const [applyingCorrections, setApplyingCorrections] = useState(false);
  const [showAlreadyApplied, setShowAlreadyApplied] = useState(false);
  const [showAppliedSuccess, setShowAppliedSuccess] = useState<number>(0);

  useEffect(() => { loadLines(); }, [session.id]);

  async function loadLines() {
    setLoading(true);
    const { data } = await supabase
      .from('stock_take_line_items')
      .select('*')
      .eq('stock_take_session_id', session.id)
      .order('category')
      .order('description');
    setLines(data || []);
    setLoading(false);
  }

  async function saveLine(id: string, counted: number | null, comment: string) {
    setLines(prev => prev.map(l => l.id === id
      ? { ...l, counted_quantity: counted, comment, variance: counted !== null ? counted - l.system_quantity : 0 }
      : l
    ));
    await supabase.from('stock_take_line_items').update({
      counted_quantity: counted,
      comment,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
  }

  async function updateStatus(status: string) {
    setSaving(true);
    const update: Partial<StockTakeSession> = { status };
    if (status === 'Completed') update.completed_at = new Date().toISOString();
    const { data } = await supabase.from('stock_take_sessions').update(update).eq('id', session.id).select().maybeSingle();
    if (data) onSessionUpdate(data);
    setSaving(false);
  }

  async function approveSession() {
    if (!approvalName) return;
    setSaving(true);
    const { data } = await supabase.from('stock_take_sessions').update({
      status: 'Approved',
      approved_by: approvalName,
      approved_at: new Date().toISOString(),
    }).eq('id', session.id).select().maybeSingle();
    if (data) onSessionUpdate(data);
    setShowApprove(false);
    setSaving(false);
  }

  async function applyCorrections() {
    if (session.corrections_applied_at) {
      setShowAlreadyApplied(true);
      return;
    }
    setApplyingCorrections(true);
    const linesWithVariance = lines.filter(l => l.counted_quantity !== null && l.variance !== 0 && l.stock_item_id);

    const groupId = crypto.randomUUID();
    const groupLabel = `Stock Take Correction · ${session.stock_take_name}`;
    const now = new Date().toISOString();

    for (const line of linesWithVariance) {
      await supabase.from('stock_movements').insert({
        movement_date: now,
        stock_item_id: line.stock_item_id,
        stock_code: line.stock_code,
        movement_type: 'Stock Take Correction',
        quantity: line.variance,
        reference_number: session.stock_take_name,
        notes: line.comment || `Stock take correction: variance ${line.variance}`,
        captured_by: session.approved_by || session.conducted_by,
        movement_group_id: groupId,
        movement_group_label: groupLabel,
      });
      await supabase.from('stock_items').update({
        current_quantity: line.system_quantity + line.variance,
        updated_at: now,
      }).eq('id', line.stock_item_id);
    }

    const { data: updated } = await supabase
      .from('stock_take_sessions')
      .update({ corrections_applied_at: now })
      .eq('id', session.id)
      .select()
      .maybeSingle();
    if (updated) onSessionUpdate(updated);

    setApplyingCorrections(false);
    setShowAppliedSuccess(linesWithVariance.length);
    await loadLines();
  }

  const grouped = useMemo(() => groupByCategory(lines), [lines]);
  const cats = useMemo(() => sortedCategories(grouped), [grouped]);

  const totalLines = lines.length;
  const totalCounted = lines.filter(l => l.counted_quantity !== null).length;
  const withVariance = lines.filter(l => l.counted_quantity !== null && l.variance !== 0).length;
  const pct = Math.round((totalCounted / Math.max(totalLines, 1)) * 100);
  const isReadOnly = session.status === 'Approved';

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <button onClick={onBack} className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 mb-2 transition-colors">
            <ArrowLeft size={13} /> Back to sessions
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{session.stock_take_name}</h1>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
            <span>{new Date(session.stock_take_date).toLocaleDateString()}</span>
            {session.conducted_by && <span>&bull; {session.conducted_by}</span>}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium ${STATUS_STYLE[session.status] || STATUS_STYLE.Draft}`}>
              {STATUS_ICON[session.status]}{session.status}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2">
          <button
            onClick={onReport}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors shadow-sm"
          >
            <Printer size={13} /> View Report
          </button>
          {session.status === 'In Progress' && (
            <button onClick={() => updateStatus('Completed')} disabled={saving} className="px-3 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5">
              <CheckCheck size={13} /> Mark Complete
            </button>
          )}
          {session.status === 'Completed' && (
            <button onClick={() => setShowApprove(true)} className="px-3 py-2 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm flex items-center gap-1.5">
              <ThumbsUp size={13} /> Approve
            </button>
          )}
          {session.status === 'Approved' && (
            <button
              onClick={applyCorrections}
              disabled={applyingCorrections}
              className={`px-3 py-2 text-xs text-white rounded-lg font-medium disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5 ${session.corrections_applied_at ? 'bg-amber-600 hover:bg-amber-700' : 'bg-gray-700 hover:bg-gray-800'}`}
            >
              <Wrench size={13} />
              {applyingCorrections ? 'Applying...' : session.corrections_applied_at ? 'Already Applied' : 'Apply Corrections'}
            </button>
          )}
        </div>
      </div>

      {/* Progress cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-900">{totalLines}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Items</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-emerald-600">{totalCounted}</p>
          <p className="text-xs text-gray-500 mt-0.5">Counted</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm text-center">
          <p className={`text-2xl font-bold ${withVariance > 0 ? 'text-amber-500' : 'text-gray-400'}`}>{withVariance}</p>
          <p className="text-xs text-gray-500 mt-0.5">Variances</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm text-center">
          <div className="relative inline-flex items-center justify-center">
            <p className="text-2xl font-bold text-gray-900">{pct}%</p>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Complete</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>{totalCounted} of {totalLines} items counted</span>
          <span className="font-semibold text-gray-700">{pct}%</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Count table */}
      {loading ? (
        <PageSpinner />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          {cats.map(cat => (
            <div key={cat}>
              <div className="px-5 py-2.5 bg-gray-700 flex items-center gap-3">
                <span className="text-sm font-bold text-white uppercase tracking-wide">{cat}</span>
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{grouped[cat].length} items</span>
                <span className="text-xs text-white/60 ml-auto">
                  {grouped[cat].filter(l => l.counted_quantity !== null).length}/{grouped[cat].length} counted
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-5 py-2 font-semibold text-xs uppercase tracking-wider text-gray-500 w-28">Code</th>
                    <th className="text-left px-4 py-2 font-semibold text-xs uppercase tracking-wider text-gray-500">Description</th>
                    <th className="text-center px-4 py-2 font-semibold text-xs uppercase tracking-wider text-gray-500 w-28">System Qty</th>
                    <th className="text-center px-4 py-2 font-semibold text-xs uppercase tracking-wider text-gray-500 w-32">Actual Count</th>
                    <th className="text-center px-4 py-2 font-semibold text-xs uppercase tracking-wider text-gray-500 w-24">Variance</th>
                    <th className="text-left px-4 py-2 font-semibold text-xs uppercase tracking-wider text-gray-500 w-48">Comment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {grouped[cat].map((line, idx) => (
                    <CountRow
                      key={line.id}
                      line={line}
                      odd={idx % 2 !== 0}
                      isReadOnly={isReadOnly}
                      onSave={saveLine}
                    />
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {showApprove && (
        <Modal title="Approve Stock Take" onClose={() => setShowApprove(false)} size="sm">
          <p className="text-sm text-gray-600 mb-4">Enter your name to approve and finalise this stock take.</p>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Approved By *</label>
            <input value={approvalName} onChange={e => setApprovalName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Your name" />
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
            <button onClick={() => setShowApprove(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={approveSession} disabled={saving || !approvalName} className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 font-medium">
              {saving ? 'Approving...' : 'Approve'}
            </button>
          </div>
        </Modal>
      )}

      {showAlreadyApplied && (
        <Modal title="Already Applied" onClose={() => setShowAlreadyApplied(false)} size="sm">
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertOctagon size={28} className="text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Corrections already applied</p>
              <p className="text-sm text-gray-500 mt-1">
                Stock take corrections for <strong>{session.stock_take_name}</strong> were already applied
                {session.corrections_applied_at && (
                  <> on {new Date(session.corrections_applied_at).toLocaleString()}</>
                )}.
              </p>
              <p className="text-sm text-gray-500 mt-1">Applying again would double-count the variance. No changes were made.</p>
            </div>
          </div>
          <div className="flex justify-center mt-5 pt-4 border-t border-gray-100">
            <button onClick={() => setShowAlreadyApplied(false)} className="px-6 py-2 text-sm bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-medium">
              OK, understood
            </button>
          </div>
        </Modal>
      )}

      {showAppliedSuccess > 0 && (
        <Modal title="Corrections Applied" onClose={() => setShowAppliedSuccess(0)} size="sm">
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle size={28} className="text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Corrections successfully applied</p>
              <p className="text-sm text-gray-500 mt-1">
                <strong>{showAppliedSuccess}</strong> stock item{showAppliedSuccess !== 1 ? 's' : ''} have been updated and the movements have been recorded.
              </p>
              <p className="text-sm text-gray-500 mt-1">You can view them in <strong>Stock Movements</strong> under "Stock Take Correction".</p>
            </div>
          </div>
          <div className="flex justify-center mt-5 pt-4 border-t border-gray-100">
            <button onClick={() => setShowAppliedSuccess(0)} className="px-6 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium">
              Done
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
