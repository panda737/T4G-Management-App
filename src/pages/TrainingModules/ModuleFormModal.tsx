import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { supabase, TrainingModuleQuestion } from '../../lib/supabase';
import Modal from '../../components/Modal';

const CATEGORIES = [
  'PPE', 'Chemical Safety', 'Fire Safety', 'Manual Handling', 'Housekeeping',
  'Working at Heights', 'Electrical Safety', 'Incident Reporting',
  'Emergency Procedures', 'Environmental Compliance', 'Vehicle Safety', 'Biological Hazards',
];

type QuestionDraft = Omit<TrainingModuleQuestion, 'id' | 'module_id' | 'created_at'>;

interface Props {
  onClose: () => void;
  onSave: () => void;
}

export default function ModuleFormModal({ onClose, onSave }: Props) {
  const [form, setForm] = useState({
    category: '',
    subcategory: '',
    title: '',
    description: '',
    content: '',
    pass_mark: 90,
    estimated_minutes: 15,
    is_mandatory: false,
  });
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    { question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', explanation: '', sort_order: 1 },
  ]);
  const [saving, setSaving] = useState(false);

  function addQuestion() {
    setQuestions(prev => [...prev, {
      question_text: '', option_a: '', option_b: '', option_c: '', option_d: '',
      correct_answer: 'A', explanation: '', sort_order: prev.length + 1,
    }]);
  }

  function removeQuestion(idx: number) {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  }

  function updateQuestion(idx: number, field: string, value: string) {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  }

  async function handleSave() {
    if (!form.title || !form.category) return;
    const validQ = questions.filter(q => q.question_text && q.option_a && q.option_b && q.option_c && q.option_d);
    if (validQ.length === 0) return;

    setSaving(true);
    const { data: moduleData, error } = await supabase
      .from('training_modules')
      .insert([{ ...form, status: 'Active' }])
      .select()
      .maybeSingle();

    if (error || !moduleData) { setSaving(false); return; }

    await supabase.from('training_module_questions').insert(
      validQ.map((q, i) => ({ ...q, module_id: moduleData.id, sort_order: i + 1 }))
    );

    setSaving(false);
    onSave();
  }

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500';

  return (
    <Modal title="Create Training Module" onClose={onClose} size="xl" accent="green">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inp}>
              <option value="">Select category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
            <input type="text" value={form.subcategory} onChange={e => setForm({ ...form, subcategory: e.target.value })} className={inp} placeholder="e.g., Gloves, Lifting" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inp} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className={inp} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Training Content</label>
          <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={4} className={inp} placeholder="Full training material the employee will read before the quiz..." />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pass Mark (%)</label>
            <input type="number" min={1} max={100} value={form.pass_mark} onChange={e => setForm({ ...form, pass_mark: parseInt(e.target.value) || 90 })} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Est. Minutes</label>
            <input type="number" min={1} value={form.estimated_minutes} onChange={e => setForm({ ...form, estimated_minutes: parseInt(e.target.value) || 15 })} className={inp} />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_mandatory} onChange={e => setForm({ ...form, is_mandatory: e.target.checked })} className="rounded border-gray-300" />
              <span className="text-sm font-medium text-gray-700">Mandatory</span>
            </label>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Questions ({questions.length})</h3>
            <button onClick={addQuestion} className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-sky-700 bg-sky-50 rounded-lg hover:bg-sky-100 transition">
              <Plus size={14} /> Add Question
            </button>
          </div>

          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200 relative">
                <button onClick={() => removeQuestion(idx)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500"><X size={14} /></button>
                <p className="text-xs font-semibold text-gray-500 mb-2">Question {idx + 1}</p>
                <input
                  type="text"
                  value={q.question_text}
                  onChange={e => updateQuestion(idx, 'question_text', e.target.value)}
                  placeholder="Enter the question..."
                  className={`w-full mb-3 ${inp}`}
                />
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {(['A', 'B', 'C', 'D'] as const).map(letter => (
                    <label key={letter} className={`flex items-center gap-1.5 cursor-pointer rounded-lg border px-3 py-2 flex-1 text-sm transition ${q.correct_answer === letter ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
                      <input
                        type="radio"
                        name={`correct-${idx}`}
                        checked={q.correct_answer === letter}
                        onChange={() => updateQuestion(idx, 'correct_answer', letter)}
                        className="text-emerald-600"
                      />
                      <span className="font-semibold text-gray-500">{letter}.</span>
                      <input
                        type="text"
                        value={q[`option_${letter.toLowerCase()}` as keyof QuestionDraft] as string}
                        onChange={e => updateQuestion(idx, `option_${letter.toLowerCase()}`, e.target.value)}
                        placeholder={`Option ${letter}`}
                        className="flex-1 bg-transparent border-none outline-none text-sm"
                      />
                    </label>
                  ))}
                </div>
                <input
                  type="text"
                  value={q.explanation}
                  onChange={e => updateQuestion(idx, 'explanation', e.target.value)}
                  placeholder="Explanation (shown after answering)..."
                  className={`w-full text-xs text-gray-600 ${inp}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-200">
        <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition text-sm disabled:opacity-50">
          {saving ? 'Creating...' : 'Create Module'}
        </button>
      </div>
    </Modal>
  );
}
