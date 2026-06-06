import { TrainingModule, TrainingModuleQuestion } from '../../lib/supabase';
import Modal from '../../components/Modal';

interface Props {
  module: TrainingModule;
  questions: TrainingModuleQuestion[];
  onClose: () => void;
}

export default function ModuleViewModal({ module: mod, questions, onClose }: Props) {
  return (
    <Modal title={mod.title} onClose={onClose} size="xl">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        <div className="flex gap-2 flex-wrap">
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-sky-100 text-sky-700">{mod.category}</span>
          {mod.subcategory && <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">{mod.subcategory}</span>}
          {mod.is_mandatory && <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">Mandatory</span>}
        </div>
        <p className="text-sm text-gray-700">{mod.description}</p>
        {mod.content && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Training Material</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{mod.content}</p>
          </div>
        )}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Questions ({questions.length})</p>
          <div className="space-y-3">
            {questions.map((q, i) => (
              <div key={q.id} className="bg-white border border-gray-200 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-900 mb-2">{i + 1}. {q.question_text}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['A', 'B', 'C', 'D'] as const).map(letter => (
                    <p key={letter} className={`text-xs px-2 py-1.5 rounded ${q.correct_answer === letter ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-600'}`}>
                      {letter}. {q[`option_${letter.toLowerCase()}` as keyof TrainingModuleQuestion] as string}
                    </p>
                  ))}
                </div>
                {q.explanation && <p className="text-xs text-gray-400 mt-2 italic">{q.explanation}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
