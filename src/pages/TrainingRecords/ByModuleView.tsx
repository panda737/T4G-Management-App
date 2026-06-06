import { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { TrainingAssessment, TrainingModule, Employee } from '../../lib/supabase';

interface Props {
  employees: Employee[];
  assessments: TrainingAssessment[];
  modules: TrainingModule[];
}

export default function ByModuleView({ employees, assessments, modules }: Props) {
  const [catFilter, setCatFilter] = useState('');

  const filteredModules = catFilter ? modules.filter(m => m.category === catFilter) : modules;
  const allCategories = [...new Set(modules.map(m => m.category))].sort();

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-6">
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Categories</option>
          {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 sticky left-0 bg-gray-50 min-w-[160px]">Employee</th>
                {filteredModules.map(m => (
                  <th key={m.id} className="px-3 py-3 text-center text-xs font-semibold text-gray-600 min-w-[100px]">
                    <div className="truncate max-w-[100px]" title={m.title}>{m.title}</div>
                    {m.is_mandatory && <span className="text-[9px] text-amber-600 font-normal block">Mandatory</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map(emp => {
                const empName = `${emp.first_name} ${emp.surname}`;
                return (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-900 sticky left-0 bg-white">{empName}</td>
                    {filteredModules.map(m => {
                      const empAssessments = assessments.filter(a => a.employee_id === emp.id && a.module_id === m.id);
                      const bestResult = empAssessments.find(a => a.result === 'Pass') || empAssessments[0];

                      if (!bestResult) {
                        return (
                          <td key={m.id} className="px-3 py-2.5 text-center">
                            <span className="text-xs text-gray-300">--</span>
                          </td>
                        );
                      }

                      return (
                        <td key={m.id} className="px-3 py-2.5 text-center">
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold ${
                            bestResult.result === 'Pass' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {bestResult.result === 'Pass' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                            {bestResult.score}%
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
