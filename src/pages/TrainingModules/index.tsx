import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Eye, Trash2, Search, Users, AlertTriangle, Clock, Award } from 'lucide-react';
import { supabase, TrainingModule, TrainingModuleQuestion, TrainingAssessment } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import ModuleFormModal from './ModuleFormModal';
import ModuleViewModal from './ModuleViewModal';
import ModuleResultsModal from './ModuleResultsModal';

const CATEGORIES = [
  'PPE', 'Chemical Safety', 'Fire Safety', 'Manual Handling', 'Housekeeping',
  'Working at Heights', 'Electrical Safety', 'Incident Reporting',
  'Emergency Procedures', 'Environmental Compliance', 'Vehicle Safety', 'Biological Hazards',
];

function StatCard({ icon: Icon, label, value, color }: { icon: typeof BookOpen; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className={`inline-flex p-2 rounded-lg ${color} mb-3`}><Icon size={18} /></div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

export default function TrainingModules() {
  const { canWrite } = useUser();
  const canEdit = canWrite('training');
  usePageTitle('Training — Modules');
  const navigate = useNavigate();
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [questions, setQuestions] = useState<Record<string, TrainingModuleQuestion[]>>({});
  const [assessments, setAssessments] = useState<TrainingAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);
  const { addToast } = useToast();
  const [opError, setOpError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [modRes, qRes, aRes] = await Promise.all([
      supabase.from('training_modules').select('*').order('category').order('title'),
      supabase.from('training_module_questions').select('*').order('sort_order'),
      supabase.from('training_assessments').select('*').order('taken_at', { ascending: false }),
    ]);

    setModules(modRes.data || []);
    setAssessments(aRes.data || []);

    const qMap: Record<string, TrainingModuleQuestion[]> = {};
    (qRes.data || []).forEach((q: TrainingModuleQuestion) => {
      if (!qMap[q.module_id]) qMap[q.module_id] = [];
      qMap[q.module_id].push(q);
    });
    setQuestions(qMap);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    return modules.filter(m => {
      const matchSearch = !searchTerm ||
        m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.subcategory.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch && (!categoryFilter || m.category === categoryFilter);
    });
  }, [modules, searchTerm, categoryFilter]);

  const stats = useMemo(() => {
    const active = modules.filter(m => m.status === 'Active').length;
    const mandatory = modules.filter(m => m.is_mandatory).length;
    const passRate = assessments.length > 0
      ? Math.round((assessments.filter(a => a.result === 'Pass').length / assessments.length) * 100)
      : 0;
    return { active, mandatory, totalAssessments: assessments.length, passRate };
  }, [modules, assessments]);

  function handleDelete(id: string, label: string) {
    setDeleteTarget({ id, label });
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    setOpError('');
    const { error: qErr } = await supabase.from('training_module_questions').delete().eq('module_id', deleteTarget.id);
    if (qErr) { setDeleting(false); setOpError(qErr.message); return; }
    const { error } = await supabase.from('training_modules').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (error) { setOpError(error.message); return; }
    addToast('Module deleted');
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {opError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">{opError}</div>}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-sky-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Training Modules</h1>
            <p className="text-gray-500 text-sm mt-0.5">Create and manage assessment-based training with multiple-choice quizzes</p>
          </div>
        </div>
        {canEdit && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition text-sm w-full sm:w-auto justify-center">
            <Plus size={16} /> <span className="hidden sm:inline">Create Module</span><span className="sm:hidden">Create</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="Active Modules" value={stats.active} color="text-sky-600 bg-sky-50" />
        <StatCard icon={AlertTriangle} label="Mandatory" value={stats.mandatory} color="text-amber-600 bg-amber-50" />
        <StatCard icon={Users} label="Assessments Taken" value={stats.totalAssessments} color="text-emerald-600 bg-emerald-50" />
        <StatCard icon={Award} label="Pass Rate" value={`${stats.passRate}%`} color="text-teal-600 bg-teal-50" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search modules..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No modules found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(mod => {
            const modQ = questions[mod.id] || [];
            const modA = assessments.filter(a => a.module_id === mod.id);
            const passCount = modA.filter(a => a.result === 'Pass').length;
            const uniqueEmployees = new Set(modA.map(a => a.employee_id)).size;

            return (
              <div key={mod.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col">
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-sky-100 text-sky-700">{mod.category}</span>
                    {mod.is_mandatory && (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">Mandatory</span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{mod.title}</h3>
                  {mod.subcategory && <p className="text-xs text-gray-400 mb-2">{mod.subcategory}</p>}
                  <p className="text-sm text-gray-600 line-clamp-2 mb-4">{mod.description}</p>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-50 rounded-lg py-2">
                      <p className="text-lg font-bold text-gray-900">{modQ.length}</p>
                      <p className="text-[10px] text-gray-500">Questions</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg py-2">
                      <p className="text-lg font-bold text-gray-900">{uniqueEmployees}</p>
                      <p className="text-[10px] text-gray-500">Completed</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg py-2">
                      <p className="text-lg font-bold text-gray-900">{mod.pass_mark}%</p>
                      <p className="text-[10px] text-gray-500">Pass Mark</p>
                    </div>
                  </div>

                  {modA.length > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Pass rate</span>
                        <span>{Math.round((passCount / modA.length) * 100)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(passCount / modA.length) * 100}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock size={12} /> {mod.estimated_minutes} min
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setSelectedModule(mod); setShowView(true); }} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="View">
                      <Eye size={16} />
                    </button>
                    {modA.length > 0 && (
                      <button onClick={() => { setSelectedModule(mod); setShowResults(true); }} className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Results">
                        <Award size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/training/modules/${mod.id}/assess`)}
                      className="px-3 py-1 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition"
                    >
                      Take Quiz
                    </button>
                    {canEdit && (
                      <button onClick={() => handleDelete(mod.id, mod.title)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <ModuleFormModal onClose={() => setShowCreate(false)} onSave={() => { setShowCreate(false); addToast('Module saved'); load(); }} />
      )}
      {showView && selectedModule && (
        <ModuleViewModal module={selectedModule} questions={questions[selectedModule.id] || []} onClose={() => setShowView(false)} />
      )}
      {showResults && selectedModule && (
        <ModuleResultsModal module={selectedModule} assessments={assessments.filter(a => a.module_id === selectedModule.id)} onClose={() => setShowResults(false)} />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          label={deleteTarget.label}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}
