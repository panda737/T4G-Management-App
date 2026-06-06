import { TrainingModule, TrainingAssessment } from '../../lib/supabase';
import Modal from '../../components/Modal';

interface Props {
  module: TrainingModule;
  assessments: TrainingAssessment[];
  onClose: () => void;
}

export default function ModuleResultsModal({ module: mod, assessments, onClose }: Props) {
  const passCount = assessments.filter(a => a.result === 'Pass').length;

  return (
    <Modal title={`Results: ${mod.title}`} onClose={onClose} size="lg">
      <div className="max-h-[60vh] overflow-y-auto space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{assessments.length}</p>
            <p className="text-xs text-gray-500">Attempts</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-emerald-700">{passCount}</p>
            <p className="text-xs text-emerald-600">Passed</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-700">{assessments.length - passCount}</p>
            <p className="text-xs text-red-600">Failed</p>
          </div>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Employee</th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Score</th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Result</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {assessments.map(a => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{a.employee_name}</td>
                <td className="px-4 py-2.5 text-sm text-center text-gray-700">{a.score}%</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${a.result === 'Pass' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {a.result}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 text-right">{new Date(a.taken_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
