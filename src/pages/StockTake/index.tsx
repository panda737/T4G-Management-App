import { useEffect, useState } from 'react';
import { Plus, ChevronRight, CheckCheck } from 'lucide-react';
import { supabase, StockItem, StockTakeSession, StockTakeLineItem } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import Modal from '../../components/Modal';
import { PageSpinner } from '../../components/Spinner';
import { STATUS_STYLE, STATUS_ICON } from './constants';
import StockTakeCount from './StockTakeCount';
import StockTakeReport from './StockTakeReport';

type View = 'list' | 'count' | 'report';

export default function StockTake() {
  usePageTitle('Stock — Stock Take');
  const [sessions, setSessions] = useState<StockTakeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [activeSession, setActiveSession] = useState<StockTakeSession | null>(null);
  const [view, setView] = useState<View>('list');

  useEffect(() => { loadSessions(); }, []);

  async function loadSessions() {
    setLoading(true);
    const { data } = await supabase.from('stock_take_sessions').select('*').order('created_at', { ascending: false });
    setSessions(data || []);
    setLoading(false);
  }

  function openSession(session: StockTakeSession) {
    setActiveSession(session);
    setView('count');
  }

  function handleBack() {
    setActiveSession(null);
    setView('list');
    loadSessions();
  }

  if (activeSession && view === 'count') {
    return (
      <StockTakeCount
        session={activeSession}
        onBack={handleBack}
        onSessionUpdate={s => setActiveSession(s)}
        onReport={() => setView('report')}
      />
    );
  }

  if (activeSession && view === 'report') {
    return (
      <StockTakeReport
        session={activeSession}
        onBack={() => setView('count')}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Take</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage physical count sessions</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center justify-center sm:justify-start gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={16} /> <span className="hidden sm:inline">New Stock Take</span>
        </button>
      </div>

      {loading ? (
        <PageSpinner />
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-16 text-center">
          <CheckCheck size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No stock take sessions yet</p>
          <p className="text-gray-400 text-sm mt-1">Create one to begin a physical count.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Session Name</th>
                  <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider w-32">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider w-40">Conducted By</th>
                  <th className="text-center px-4 py-3 font-medium text-xs uppercase tracking-wider w-32">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider w-40">Approved By</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessions.map((s, i) => (
                  <tr
                    key={s.id}
                    onClick={() => openSession(s)}
                    className={`cursor-pointer hover:bg-emerald-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
                  >
                    <td className="px-5 py-3 font-semibold text-gray-900">{s.stock_take_name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(s.stock_take_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{s.conducted_by || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium ${STATUS_STYLE[s.status] || STATUS_STYLE.Draft}`}>
                        {STATUS_ICON[s.status]}{s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{s.approved_by || '—'}</td>
                    <td className="px-4 py-3 text-center"><ChevronRight size={15} className="text-gray-400 mx-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="md:hidden divide-y divide-gray-100">
            {sessions.map((s) => (
              <div key={s.id} onClick={() => openSession(s)} className="px-4 py-3 hover:bg-emerald-50 transition-colors cursor-pointer">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900">{s.stock_take_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{new Date(s.stock_take_date).toLocaleDateString()}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${STATUS_STYLE[s.status] || STATUS_STYLE.Draft}`}>
                    {STATUS_ICON[s.status]}{s.status}
                  </span>
                </div>
                <div className="text-xs text-gray-600 space-y-0.5">
                  {s.conducted_by && <p>Conducted by: {s.conducted_by}</p>}
                  {s.approved_by && <p>Approved by: {s.approved_by}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showNew && (
        <NewSessionModal
          onClose={() => setShowNew(false)}
          onSave={(session) => { setShowNew(false); openSession(session); }}
        />
      )}
    </div>
  );
}

function NewSessionModal({ onClose, onSave }: { onClose: () => void; onSave: (s: StockTakeSession) => void }) {
  const [name, setName] = useState(`Stock Take ${new Date().toLocaleDateString()}`);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [conductedBy, setConductedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  async function handleSave() {
    if (!name) return;
    setSaving(true);
    setSaveError('');
    const { data: session, error } = await supabase.from('stock_take_sessions').insert({
      stock_take_name: name,
      stock_take_date: new Date(date).toISOString(),
      conducted_by: conductedBy,
      status: 'In Progress',
      notes,
    }).select().maybeSingle();

    if (error || !session) { setSaveError(error?.message ?? 'Failed to create session'); setSaving(false); return; }

    const { data: stockItems } = await supabase.from('stock_items').select('*').eq('active', true).order('category').order('stock_item');
    if (stockItems && stockItems.length > 0) {
      const lineItems = stockItems.map((item: StockItem) => ({
        stock_take_session_id: session.id,
        stock_item_id: item.id,
        stock_code: item.stock_code,
        stock_item: item.stock_item,
        category: item.category,
        description: item.description,
        system_quantity: item.current_quantity,
        counted_quantity: null,
        comment: '',
      }));
      await supabase.from('stock_take_line_items').insert(lineItems);
    }
    setSaving(false);
    onSave(session);
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';

  return (
    <Modal title="New Stock Take Session" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Session Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Conducted By</label>
          <input value={conductedBy} onChange={e => setConductedBy(e.target.value)} className={inputCls} placeholder="Name of person conducting count" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
        </div>
      </div>
      {saveError && <div className="mt-3 text-sm text-red-700 bg-red-50 px-4 py-2.5 rounded-lg border border-red-200">{saveError}</div>}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
        <button onClick={handleSave} disabled={saving || !name} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 font-medium shadow-sm">
          {saving ? 'Creating...' : 'Start Stock Take'}
        </button>
      </div>
    </Modal>
  );
}
