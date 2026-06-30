import { useEffect, useState } from 'react';
import { Beaker, Plus } from 'lucide-react';
import { supabase, type TreatmentChemical } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import MobileNavButton from '../../components/MobileNavButton';
import BookOutModal from './BookOutModal';
import { CHEM_PHOTO_BUCKET } from './constants';

// Operators get a single focused action — book out one container — like the shift record.
export default function OperatorChemicals() {
  usePageTitle('Treatment — Chemicals');
  const { profile } = useUser();
  const { addToast } = useToast();
  const [chemical, setChemical] = useState<TreatmentChemical | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBookout, setShowBookout] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('treatment_chemicals').select('*').eq('active', true).order('created_at').limit(1);
    setChemical((data?.[0] ?? null) as TreatmentChemical | null);
    setLoading(false);
  }

  async function handleBookout(v: { bookout_date: string; notes: string; file: File | null }) {
    if (!chemical || !v.file) throw new Error('A batch photo is required.');
    const ext = v.file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(CHEM_PHOTO_BUCKET).upload(path, v.file, { contentType: v.file.type || 'image/jpeg' });
    if (upErr) throw upErr;
    const { error } = await supabase.rpc('record_chemical_bookout', {
      p_chemical_id: chemical.id,
      p_bookout_date: v.bookout_date,
      p_booked_out_by: profile?.display_name ?? '',
      p_booked_out_by_employee_id: profile?.employee_id ?? null,
      p_notes: v.notes,
      p_photo_path: path,
    });
    if (error) { await supabase.storage.from(CHEM_PHOTO_BUCKET).remove([path]); throw error; }
    addToast('Chemical booked out');
    setShowBookout(false);
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-cyan-600" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chemicals</h1>
          <p className="text-sm text-gray-500 mt-1">Book out a chemical container</p>
        </div>
        <MobileNavButton />
      </div>

      {!chemical ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm py-16 text-center">
          <Beaker size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">No chemical set up yet</p>
          <p className="text-xs text-gray-400 mt-1">Ask an admin to set up the chemical first.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan-100 flex items-center justify-center mx-auto mb-4">
            <Beaker size={30} className="text-cyan-600" />
          </div>
          <p className="text-base font-semibold text-gray-900">{chemical.name || 'Treatment chemical'}</p>
          <p className="text-xs text-gray-500 mt-1 mb-6">Take a photo of the batch and book out one container.</p>
          <button onClick={() => setShowBookout(true)} className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-xl font-semibold transition shadow-sm">
            <Plus size={18} /> Book out chemical
          </button>
        </div>
      )}

      {showBookout && chemical && (
        <BookOutModal
          existing={null}
          uom="IBC"
          litresPerUnit={chemical.litres_per_unit}
          bookedOutByName={profile?.display_name ?? ''}
          onClose={() => setShowBookout(false)}
          onSubmit={handleBookout}
        />
      )}
    </div>
  );
}
