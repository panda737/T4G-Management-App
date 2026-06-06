import { useState, useMemo } from 'react';
import { Search, Users, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { TrainingRecord, TrainingAssessment, TrainingModule, Employee } from '../../lib/supabase';

interface Props {
  employees: Employee[];
  records: TrainingRecord[];
  assessments: TrainingAssessment[];
  modules: TrainingModule[];
}

export default function ByEmployeeView({ employees, records, assessments, modules }: Props) {
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [empSearch, setEmpSearch] = useState('');

  const filteredEmps = empSearch
    ? employees.filter(e => `${e.first_name} ${e.surname}`.toLowerCase().includes(empSearch.toLowerCase()))
    : employees;

  const selectedEmp = employees.find(e => e.id === selectedEmpId);

  const empRecords = useMemo(() => {
    if (!selectedEmp) return [];
    const name = `${selectedEmp.first_name} ${selectedEmp.surname}`;
    return records.filter(r => r.employee_name === name || r.employee_id === selectedEmpId);
  }, [selectedEmpId, records, selectedEmp]);

  const empAssessments = useMemo(() => {
    return assessments.filter(a => a.employee_id === selectedEmpId);
  }, [selectedEmpId, assessments]);

  const mandatoryModules = modules.filter(m => m.is_mandatory);
  const completedModuleIds = new Set(empAssessments.filter(a => a.result === 'Pass').map(a => a.module_id));
  const gapModules = mandatoryModules.filter(m => !completedModuleIds.has(m.id));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={empSearch}
              onChange={e => setEmpSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-100">
          {filteredEmps.map(emp => {
            const name = `${emp.first_name} ${emp.surname}`;
            const recCount = records.filter(r => r.employee_name === name || r.employee_id === emp.id).length;
            return (
              <button
                key={emp.id}
                onClick={() => setSelectedEmpId(emp.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition ${selectedEmpId === emp.id ? 'bg-emerald-50 border-l-2 border-emerald-500' : ''}`}
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                  {emp.first_name[0]}{emp.surname[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                  <p className="text-xs text-gray-400">{emp.position}</p>
                </div>
                <span className="text-xs text-gray-400">{recCount} records</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="col-span-2 space-y-4">
        {!selectedEmp ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Select an employee to view their training history</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-lg font-bold text-emerald-700">
                  {selectedEmp.first_name[0]}{selectedEmp.surname[0]}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedEmp.first_name} {selectedEmp.surname}</h3>
                  <p className="text-sm text-gray-500">{selectedEmp.position} -- {selectedEmp.department}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">{empRecords.length}</p>
                  <p className="text-xs text-gray-500">Total Records</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-emerald-700">{empRecords.filter(r => r.result === 'Pass').length}</p>
                  <p className="text-xs text-emerald-600">Passed</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-red-700">{empRecords.filter(r => r.result === 'Fail').length}</p>
                  <p className="text-xs text-red-600">Failed</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-amber-700">{gapModules.length}</p>
                  <p className="text-xs text-amber-600">Gaps</p>
                </div>
              </div>
            </div>

            {gapModules.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <h4 className="text-sm font-semibold text-amber-800">Mandatory Training Not Completed</h4>
                </div>
                <div className="space-y-1">
                  {gapModules.map(m => (
                    <div key={m.id} className="flex items-center gap-2 text-sm text-amber-700">
                      <XCircle size={14} /> {m.title} ({m.category})
                    </div>
                  ))}
                </div>
              </div>
            )}

            {empAssessments.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900">Assessment History</h4>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Module</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">Score</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">Result</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {empAssessments.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-sm text-gray-900">{a.module_title}</td>
                        <td className="px-4 py-2.5 text-sm text-center">{a.score}%</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${a.result === 'Pass' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{a.result}</span>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-500 text-right">{new Date(a.taken_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900">Training Records</h4>
              </div>
              {empRecords.length === 0 ? (
                <p className="p-6 text-sm text-gray-400 text-center">No training records for this employee</p>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Course</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">Score</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">Result</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {empRecords.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-sm text-gray-900">{r.course_name}</td>
                        <td className="px-4 py-2.5 text-sm text-center">{r.score !== null ? `${r.score}%` : '-'}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.result === 'Pass' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{r.result}</span>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-500 text-right">{r.completion_date ? new Date(r.completion_date).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
