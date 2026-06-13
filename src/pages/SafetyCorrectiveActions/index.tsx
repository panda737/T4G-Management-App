import { useEffect, useState } from 'react';
import { CheckCircle, Plus, AlertCircle } from 'lucide-react';
import { supabase, SafetyCorrectiveAction } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useToast } from '../../lib/toast';
import { useUser } from '../../lib/UserContext';
import { PageHeader, Button, Toolbar, SearchInput, FilterSelect, FilterTabs, StatStrip } from '../../components/ui';
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

export default function SafetyCorrectiveActions() {
  usePageTitle('Safety — Corrective Actions');
  const { addToast } = useToast();
  const { canWrite } = useUser();
  const canEditSafety = canWrite('safety');
  const [actions, setActions] = useState<SafetyCorrectiveAction[]>([]);
  const [filters, setFilters] = useState<FilterState>({ search: '', source_type: '', priority: '', status: '' });
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editAction, setEditAction] = useState<SafetyCorrectiveAction | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<SafetyCorrectiveAction | null>(null);

  async function handleComplete(action: SafetyCorrectiveAction) {
    const { error } = await supabase
      .from('safety_corrective_actions')
      .update({ status: 'Completed', completed_date: new Date().toISOString().split('T')[0], updated_at: new Date().toISOString() })
      .eq('id', action.id);
    if (error) { addToast('Could not complete action', 'error'); return; }
    addToast('Action marked complete');
    setIsViewOpen(false);
    setSelectedAction(null);
    load();
  }
  const [statusTab, setStatusTab] = useState('All');
  const [loadError, setLoadError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setLoadError('');
      const { data, error } = await supabase
        .from('safety_corrective_actions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setActions(data || []);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load corrective actions. Please try again.');
    }
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
    <div className="space-y-4">
      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="flex items-center gap-2"><AlertCircle size={15} />{loadError}</span>
          <button onClick={load} className="text-red-600 hover:text-red-800 font-medium text-xs underline">Retry</button>
        </div>
      )}

      <PageHeader
        title="Corrective Actions"
        subtitle={`${actions.length} action${actions.length !== 1 ? 's' : ''}`}
        icon={CheckCircle}
        accent="amber"
        actions={
          canEditSafety
            ? <Button variant="primary" accent="amber" icon={Plus} onClick={() => { setEditAction(null); setIsAddOpen(true); }}>New Action</Button>
            : undefined
        }
      />

      <FilterTabs
        accent="amber"
        value={statusTab}
        onChange={setStatusTab}
        tabs={['All', 'Open', 'In Progress', 'Overdue', 'Completed', 'Verified'].map(tab => ({
          value: tab,
          label: tab,
          count: tab === 'All' ? actions.length
            : tab === 'Overdue' ? actions.filter(a => isOverdue(a)).length
            : actions.filter(a => a.status === tab).length,
        }))}
      />

      <Toolbar>
        <SearchInput value={filters.search} onChange={v => setFilters({ ...filters, search: v })} placeholder="Search actions…" />
        <FilterSelect value={filters.source_type} onChange={v => setFilters({ ...filters, source_type: v })} allValue="" accent="amber">
          <option value="">All Source Types</option>
          <option>Incident</option><option>Inspection</option><option>Risk Assessment</option><option>Audit</option><option>Toolbox Talk</option>
        </FilterSelect>
        <FilterSelect value={filters.priority} onChange={v => setFilters({ ...filters, priority: v })} allValue="" accent="amber">
          <option value="">All Priorities</option>
          <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
        </FilterSelect>
        <FilterSelect value={filters.status} onChange={v => setFilters({ ...filters, status: v })} allValue="" accent="amber">
          <option value="">All Statuses</option>
          <option>Open</option><option>In Progress</option><option>Completed</option><option>Overdue</option><option>Verified</option>
        </FilterSelect>
      </Toolbar>

      <StatStrip
        accent="amber"
        cols={5}
        stats={[
          { label: 'Total', value: stats.total },
          { label: 'Open', value: stats.open },
          { label: 'In Progress', value: stats.inProgress },
          { label: 'Overdue', value: stats.overdue, valueClass: 'text-red-600' },
          { label: 'Completed', value: stats.completed, valueClass: 'text-emerald-600' },
        ]}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {filteredActions.length === 0 && (
            <div className="py-14 text-center">
              {actions.length === 0 ? (
                <>
                  <CheckCircle className="w-8 h-8 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-500">No corrective actions yet</p>
                  <p className="text-xs text-gray-400 mt-1">Create actions from incidents, inspections, or risk assessments.</p>
                  <button
                    onClick={() => { setSelectedAction(null); setIsAddOpen(true); }}
                    className="mt-4 text-sm text-gray-700 hover:text-gray-900 font-medium"
                  >
                    + New Action
                  </button>
                </>
              ) : (
                <>
                  <CheckCircle className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">No actions match your filters.</p>
                  <button
                    onClick={() => { setFilters({ search: '', source_type: '', priority: '', status: '' }); setStatusTab('All'); }}
                    className="mt-2 text-xs text-gray-500 underline"
                  >
                    Clear filters
                  </button>
                </>
              )}
            </div>
          )}
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

      {(isAddOpen || editAction) && (
        <ActionFormModal
          action={editAction}
          onClose={() => { setIsAddOpen(false); setEditAction(null); }}
          onSave={() => { addToast(editAction ? 'Action updated' : 'Action saved'); load(); }}
        />
      )}
      {isViewOpen && selectedAction && (
        <ActionViewModal
          action={selectedAction}
          canEdit={canEditSafety}
          onEdit={() => { setIsViewOpen(false); setEditAction(selectedAction); }}
          onComplete={() => handleComplete(selectedAction)}
          onClose={() => setIsViewOpen(false)}
        />
      )}
    </div>
  );
}
