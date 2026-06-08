import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, CheckCircle, XCircle,
  Award, AlertTriangle, Loader, BookOpen, User,
} from 'lucide-react';
import { supabase, TrainingModule, TrainingModuleQuestion, Employee } from '../lib/supabase';
import { usePageTitle } from '../lib/usePageTitle';

type Step = 'select-employee' | 'reading' | 'quiz' | 'results';

export default function TrainingAssessment() {
  usePageTitle('Training — Assessment');
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const [module, setModule] = useState<TrainingModule | null>(null);
  const [questions, setQuestions] = useState<TrainingModuleQuestion[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<Step>('select-employee');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<'Pass' | 'Fail'>('Fail');
  const [saving, setSaving] = useState(false);
  const [opError, setOpError] = useState('');
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    loadData();
  }, [moduleId]);

  async function loadData() {
    if (!moduleId) return;
    setLoading(true);
    const [modRes, qRes, empRes] = await Promise.all([
      supabase.from('training_modules').select('*').eq('id', moduleId).maybeSingle(),
      supabase.from('training_module_questions').select('*').eq('module_id', moduleId).order('sort_order'),
      supabase.from('employees').select('*').eq('status', 'active').order('first_name'),
    ]);
    setModule(modRes.data);
    setQuestions(qRes.data || []);
    setEmployees(empRes.data || []);
    setLoading(false);
  }

  function startQuiz() {
    startTimeRef.current = Date.now();
    setStep('quiz');
    setAnswers({});
  }

  function selectAnswer(questionId: string, answer: string) {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  }

  async function submitQuiz() {
    if (!module || !selectedEmployee) return;
    setSaving(true);
    setOpError('');

    let correct = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correct_answer) correct++;
    });

    const pct = Math.round((correct / questions.length) * 100);
    const pass = pct >= module.pass_mark;
    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);

    setScore(pct);
    setResult(pass ? 'Pass' : 'Fail');
    setSubmitted(true);

    const employeeName = `${selectedEmployee.first_name} ${selectedEmployee.surname}`;

    const { error: aErr } = await supabase.from('training_assessments').insert([{
      employee_id: selectedEmployee.id,
      employee_name: employeeName,
      module_id: module.id,
      module_title: module.title,
      answers,
      score: pct,
      result: pass ? 'Pass' : 'Fail',
      time_taken_seconds: timeTaken,
    }]);
    if (aErr) { setOpError(aErr.message); setSaving(false); return; }

    const today = new Date().toISOString().split('T')[0];
    const { error: rErr } = await supabase.from('training_records').insert([{
      employee_id: selectedEmployee.id,
      employee_name: employeeName,
      course_name: module.title,
      completion_date: today,
      score: pct,
      result: pass ? 'Pass' : 'Fail',
      instructor: 'Self-Assessment',
      notes: `Module: ${module.category} - ${module.subcategory}. Time: ${formatTime(timeTaken)}`,
      status: 'Completed',
    }]);
    if (rErr) { setOpError(rErr.message); setSaving(false); return; }

    setSaving(false);
    setStep('results');
  }

  const filteredEmployees = employeeSearch
    ? employees.filter(e =>
        `${e.first_name} ${e.surname}`.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        e.employee_number?.toLowerCase().includes(employeeSearch.toLowerCase())
      )
    : employees;

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  if (!module) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Module not found</p>
          <button onClick={() => navigate('/training/modules')} className="mt-4 text-sky-600 hover:underline text-sm">Back to Modules</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/training/modules')} className="p-1.5 text-gray-400 hover:text-gray-700 transition">
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-gray-900 truncate">{module.title}</h1>
            <p className="text-xs text-gray-400 truncate">{module.category} {module.subcategory ? `/ ${module.subcategory}` : ''}</p>
          </div>
        </div>
        {step === 'quiz' && !submitted && (
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            <span className="text-xs text-gray-500 whitespace-nowrap">{answeredCount} / {questions.length}</span>
            <div className="w-24 sm:w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {opError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5 mx-4 sm:mx-8 mt-4">{opError}</div>}
      <div className="max-w-3xl mx-auto p-4 sm:p-8">
        {/* Step 1: Select Employee */}
        {step === 'select-employee' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-8">
            <div className="text-center mb-6">
              <div className="inline-flex p-3 bg-sky-50 rounded-full mb-3">
                <User className="w-8 h-8 text-sky-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Who is taking this assessment?</h2>
              <p className="text-sm text-gray-500">Select your name from the employee list below</p>
            </div>

            <input
              type="text"
              placeholder="Search by name or employee number..."
              value={employeeSearch}
              onChange={e => setEmployeeSearch(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />

            <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
              {filteredEmployees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${
                    selectedEmployee?.id === emp.id ? 'bg-sky-50 border-l-2 border-sky-500' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                    {emp.first_name[0]}{emp.surname[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{emp.first_name} {emp.surname}</p>
                    <p className="text-xs text-gray-400">{emp.position} {emp.employee_number ? `-- ${emp.employee_number}` : ''}</p>
                  </div>
                  {selectedEmployee?.id === emp.id && <CheckCircle className="w-5 h-5 text-sky-500 flex-shrink-0" />}
                </button>
              ))}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setStep('reading')}
                disabled={!selectedEmployee}
                className="flex items-center gap-2 px-6 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
              >
                Continue <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Reading Material */}
        {step === 'reading' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-8">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-sky-600" />
              <h2 className="text-lg font-bold text-gray-900">Training Material</h2>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Read the following material carefully. You will need to answer {questions.length} questions to pass with a minimum score of {module.pass_mark}%.
            </p>

            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 mb-6 max-h-[400px] overflow-y-auto">
              <h3 className="text-base font-semibold text-gray-900 mb-3">{module.title}</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{module.content || module.description}</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Assessment Information</p>
                  <ul className="text-xs text-amber-700 mt-1 space-y-0.5">
                    <li>-- {questions.length} multiple-choice questions</li>
                    <li>-- Pass mark: {module.pass_mark}% (you need {Math.ceil(questions.length * module.pass_mark / 100)} correct answers)</li>
                    <li>-- Results are recorded immediately</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between">
              <button onClick={() => setStep('select-employee')} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition w-full sm:w-auto">
                <ArrowLeft size={16} className="inline mr-1" /> Back
              </button>
              <button onClick={startQuiz} className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition text-sm font-medium w-full sm:w-auto justify-center">
                Start Quiz <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Quiz */}
        {step === 'quiz' && !submitted && (
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div key={q.id} className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 transition ${
                answers[q.id] ? 'border-sky-200' : ''
              }`}>
                <p className="text-xs font-semibold text-gray-400 mb-2">Question {idx + 1} of {questions.length}</p>
                <p className="text-sm font-medium text-gray-900 mb-4">{q.question_text}</p>
                <div className="space-y-2">
                  {(['A', 'B', 'C', 'D'] as const).map(letter => {
                    const optionText = q[`option_${letter.toLowerCase()}` as keyof TrainingModuleQuestion] as string;
                    const isSelected = answers[q.id] === letter;
                    return (
                      <button
                        key={letter}
                        onClick={() => selectAnswer(q.id, letter)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition text-sm flex items-center gap-3 ${
                          isSelected
                            ? 'border-sky-500 bg-sky-50 text-sky-800'
                            : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isSelected ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {letter}
                        </span>
                        {optionText}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex justify-end pt-4">
              <button
                onClick={submitQuiz}
                disabled={!allAnswered || saving}
                className="flex items-center gap-2 px-6 sm:px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
              >
                {saving ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle size={18} />}
                <span className="hidden sm:inline">{saving ? 'Submitting...' : 'Submit Assessment'}</span>
                <span className="sm:hidden">{saving ? 'Submitting' : 'Submit'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 'results' && (
          <div className="space-y-6">
            <div className={`rounded-xl p-4 sm:p-8 text-center ${
              result === 'Pass' ? 'bg-emerald-600' : 'bg-red-600'
            } text-white shadow-lg`}>
              <div className="inline-flex p-3 rounded-full bg-white/20 mb-4">
                {result === 'Pass' ? <Award className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
              </div>
              <h2 className="text-3xl font-bold mb-1">{score}%</h2>
              <p className="text-lg font-semibold opacity-90">{result === 'Pass' ? 'Congratulations! You Passed!' : 'Assessment Not Passed'}</p>
              <p className="text-sm opacity-70 mt-1">
                {selectedEmployee?.first_name} {selectedEmployee?.surname} -- {module.title}
              </p>
              <p className="text-xs opacity-60 mt-2">
                Pass mark: {module.pass_mark}% -- You scored: {score}%
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Question Review</h3>
              <div className="space-y-4">
                {questions.map((q, idx) => {
                  const userAnswer = answers[q.id];
                  const isCorrect = userAnswer === q.correct_answer;
                  return (
                    <div key={q.id} className={`rounded-lg p-4 border ${isCorrect ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'}`}>
                      <div className="flex items-start gap-2 mb-2">
                        {isCorrect ? <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
                        <p className="text-sm font-medium text-gray-900">{idx + 1}. {q.question_text}</p>
                      </div>
                      <div className="ml-6 space-y-1">
                        {!isCorrect && (
                          <p className="text-xs text-red-600">
                            Your answer: {userAnswer}. {q[`option_${userAnswer.toLowerCase()}` as keyof TrainingModuleQuestion]}
                          </p>
                        )}
                        <p className="text-xs text-emerald-700">
                          Correct: {q.correct_answer}. {q[`option_${q.correct_answer.toLowerCase()}` as keyof TrainingModuleQuestion]}
                        </p>
                        {q.explanation && (
                          <p className="text-xs text-gray-500 italic mt-1">{q.explanation}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
              <button
                onClick={() => navigate('/training/modules')}
                className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition w-full sm:w-auto"
              >
                Back to Modules
              </button>
              {result === 'Fail' && (
                <button
                  onClick={() => {
                    setAnswers({});
                    setSubmitted(false);
                    setStep('reading');
                  }}
                  className="px-6 py-2.5 bg-sky-600 text-white rounded-lg text-sm hover:bg-sky-700 transition font-medium w-full sm:w-auto"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}
