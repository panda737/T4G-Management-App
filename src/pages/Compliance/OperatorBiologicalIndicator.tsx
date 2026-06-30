import { useState } from 'react';
import { Camera, Plus, Menu } from 'lucide-react';
import { usePageTitle } from '../../lib/usePageTitle';
import { useOpenNav } from '../../lib/mobileNav';
import BiologicalIndicatorFormModal from './BiologicalIndicatorFormModal';

// Operators get a single focused action — capture one biological indicator —
// just like the shift record / chemical book-out views. No tabs, no log.
export default function OperatorBiologicalIndicator() {
  usePageTitle('Compliance — Biological Indicator');
  const openNav = useOpenNav();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Biological Indicator</h1>
        <p className="text-sm text-gray-500 mt-1">Photograph and log a compactor sterility check</p>
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

      {/* Menu — opens the navigation drawer (mobile), mirroring the Shift Record page. */}
      <button
        onClick={openNav}
        className="lg:hidden w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 active:scale-[0.99] transition-all"
      >
        <Menu size={20} /> Menu
      </button>

      {showForm && (
        <BiologicalIndicatorFormModal
          onClose={() => setShowForm(false)}
          onSaved={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
