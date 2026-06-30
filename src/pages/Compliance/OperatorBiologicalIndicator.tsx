import { useState } from 'react';
import { Camera, Plus } from 'lucide-react';
import { usePageTitle } from '../../lib/usePageTitle';
import MobileNavButton from '../../components/MobileNavButton';
import BiologicalIndicatorFormModal from './BiologicalIndicatorFormModal';

// Operators get a single focused action — capture one biological indicator —
// just like the shift record / chemical book-out views. No tabs, no log.
export default function OperatorBiologicalIndicator() {
  usePageTitle('Compliance — Biological Indicator');
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Biological Indicator</h1>
          <p className="text-sm text-gray-500 mt-1">Photograph and log a compactor sterility check</p>
        </div>
        <MobileNavButton />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center mx-auto mb-4">
          <Camera size={30} className="text-teal-600" />
        </div>
        <p className="text-base font-semibold text-gray-900">Capture a biological indicator</p>
        <p className="text-xs text-gray-500 mt-1 mb-6">Take a photo of the batch and pick the compactor.</p>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-semibold transition shadow-sm">
          <Plus size={18} /> Capture biological indicator
        </button>
      </div>

      {showForm && (
        <BiologicalIndicatorFormModal
          onClose={() => setShowForm(false)}
          onSaved={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
