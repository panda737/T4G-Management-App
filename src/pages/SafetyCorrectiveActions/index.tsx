import { useEffect, useState } from 'react';
import { CheckCircle, Plus } from 'lucide-react';
import { supabase, SafetyCorrectiveAction } from '../../lib/supabase';
import ActionFormModal from './ActionFormModal';
import ActionViewModal from './ActionViewModal';

type FilterState = {
  search: string;
  source_type: string;
  priority: string;
  status: string;
};

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    Low: 'bg-gray-100 text-gray-700',
    Medium: 'bg-amber-100 text-amber-700',
    High: 'bg-orange-100 text-orange-700',
    Critical: 'bg-red-100 text-red-700',
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[priority] || styles.Low}`}>{priority}</span>;
}

function StatusBadge({ status, isOverdue }: { status: string; isOverdue: boolean }) {
  const styles: Record<string, string> = {
    Open: 'bg-amber-100 text-amber-700',
    'In Progress': 'bg-sky-100 text-sky-700',
    Completed: 'bg-emerald-100 text-emerald-700',
    Verified: 'bg-teal-100 text-teal-700',
  };
  const cls = isOverdue ? 'bg-red-100 text-red-700' : (styles[status] || styles.Open);
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cls}`}>{isOverdue ? 'Overdue' : status}</span>;
}

function StatCard({ label, value, variant = 'default' }: { label: string; value: number; variant?: 'default' | 'red' | 'green' }) {
  const bgColor = variant === 'red' ? 'bg-red-50' : variant === 'green' ? 'bg-emerald-50' : 'bg-gray-50';
  const textColor = variant === 'red' ? 'text-red-700' : variant === 'green' ? 'text-emerald-700' : 'text-gray-700';
  return (
    <div className={`${bgColor} rounded-xl p-4 border border-gray-200`}>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
    </div>
  );
}

export default function SafetyCorrectiveActions() {
  const [actions, setActions] = useState<SafetyCorrectiveAction[]>([]);
  const [filters, setFilters] = useState<FilterState>({ search: '', source_type: '', priority: '', status: '' });
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<SafetyCorrectiveAction | null>(null);
  const [statusTab, setStatusTab] = useState('All');

  useEffect(() => { load(); }, []);

  async function load() {
    const { data, error } = await supabase
      .from('safety_corrective_actions')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setActions(data);
  }

  const today = new Date();

  const isOverdue = (action: SafetyCorrectiveAction) =>
    !!(action.due_date && new Date(action.due_date) < today && !['Completed', 'Verified'].includes(action.status));

  const filteredActions = actions.filter(action => {
    const searchLower = filters.search.toLowerCase();
    const matchesSearch =
      action.description.toLowerCase().includes(searchLower) ||
      action.action_number.toLowerCase().includes(searchLower) ||
      (action.assigned_to?.toLowerCase() || '').includes(searchLower) ||
      (action.source_reference?.toLowerCase() || '').includes(searchLower);
    const matchesType = !filters.source_type || action.source_type === filters.source_type;
    const matchesPriority = !filters.priority || action.priority === filters.priority;
    const matchesStatus = !filters.status || action.status === filters.status;
    const matchesTab = statusTab === 'All' ||
      (statusTab === 'Overdue' ? isOverdue(action) : action.status === statusTab);
    return matchesSearch && matchesType && matchesPriority && matchesStatus && matchesTab;
  });

  const stats = {
    total: filteredActions.length,
    open: filteredActions.filter(a => a.status === 'Open').length,
    inProgress: filteredActions.filter(a => a.status === 'In Progress').length,
    overdue: filteredActions.filter(a => isOverdue(a)).length,
    completed: filteredActions.filter(a => ['Completed', 'Verified'].includes(a.status)).length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-gray-900 flex-shrink-0" />
            <h1 className="text-3xl font-bold text-gray-900">Corrective Actions</h1>
          </div>
          <button
            onClick={() => { setSelectedAction(null); setIsAddOpen(true); }}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition w-full sm:w-auto justify-center sm:justify-start"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">New Action</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          {(['All', 'Open', 'In Progress', 'Overdue', 'Completed', 'Verified'] as const).map(tab => {
            const count = tab === 'All' ? actions.length
              : tab === 'Overdue' ? actions.filter(a => isOverdue(a)).length
              : actions.filter(a => a.status === tab).length;
            return (
              <button
                key={tab}
                onClick={() => setStatusTab(tab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusTab === tab
                    ? tab === 'Overdue' ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-900 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  statusTab === tab ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <input type="text" placeholder="Search..." value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none flex-1" />
            <select value={filters.source_type} onChange={e => setFilters({ ...filters, source_type: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none w-full sm:w-auto">
              <option value="">All Source Types</option>
              <option>Incident</option><option>Inspection</option><option>Risk Assessment</option><option>Audit</option><option>Toolbox Talk</option>
            </select>
            <select value={filters.priority} onChange={e => setFilters({ ...filters, priority: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none w-full sm:w-auto">
              <option value="">All Priorities</option>
              <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
            </select>
            <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none w-full sm:w-auto">
              <option value="">All Statuses</option>
              <option>Open</option><option>In Progress</option><option>Completed</option><option>Overdue</option><option>Verified</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Open" value={stats.open} />
          <StatCard label="In Progress" value={stats.inProgress} />
          <StatCard label="Overdue" value={stats.overdue} variant="red" />
          <StatCard label="Completed" value={stats.completed} variant="green" />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Action #', 'Source', 'Description', 'Assigned To', 'Priority', 'Due Date', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-sm font-semibold text-gray-900">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredActions.map(action => (
                  <tr key={action.id} className={`border-b border-gray-200 hover:bg-gray-50 transition ${isOverdue(action) ? 'bg-red-50' : ''}`}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{action.action_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{action.source_type} {action.source_reference && `(${action.source_reference})`}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{action.description.substring(0, 60)}...</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{action.assigned_to || '—'}</td>
                    <td className="px-6 py-4"><PriorityBadge priority={action.priority} /></td>
                    <td className={`px-6 py-4 text-sm ${isOverdue(action) ? 'text-red-700 font-semibold' : 'text-gray-600'}`}>
                      {action.due_date ? new Date(action.due_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={action.status} isOverdue={isOverdue(action)} /></td>
                    <td className="px-6 py-4 text-sm">
                      <button onClick={() => { setSelectedAction(action); setIsViewOpen(true); }} className="text-gray-600 hover:text-gray-900 underline">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-gray-100">
            {filteredActions.map(action => (
              <div key={action.id} className={`p-4 space-y-3 ${isOverdue(action) ? 'bg-red-50' : ''}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">{action.action_number}</p>
                    <p className="text-xs text-gray-500 mt-1">{action.source_type} {action.source_reference && `(${action.source_reference})`}</p>
                  </div>
                  <PriorityBadge priority={action.priority} />
                </div>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-600">Description:</span> {action.description.substring(0, 80)}...</p>
                  <p><span className="text-gray-600">Assigned To:</span> {action.assigned_to || '—'}</p>
                  <p className={isOverdue(action) ? 'text-red-700 font-semibold' : 'text-gray-600'}>
                    <span className="text-gray-600">Due Date:</span> {action.due_date ? new Date(action.due_date).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <StatusBadge status={action.status} isOverdue={isOverdue(action)} />
                  <button onClick={() => { setSelectedAction(action); setIsViewOpen(true); }} className="text-gray-600 hover:text-gray-900 text-sm font-medium">View</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isAddOpen && <ActionFormModal onClose={() => setIsAddOpen(false)} onSave={load} />}
      {isViewOpen && selectedAction && <ActionViewModal action={selectedAction} onClose={() => setIsViewOpen(false)} />}
    </div>
  );
}
