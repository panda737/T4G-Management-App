import { useState } from 'react';
import { Merge, AlertTriangle } from 'lucide-react';
import { supabase, type ClientSite } from '../../lib/supabase';
import { useToast } from '../../lib/toast';
import Modal from '../../components/Modal';

interface Props {
  sites: ClientSite[];
  clientName: Record<string, string>;
  stats: Record<string, { n: number; kg: number }>;
  onClose: () => void;
  onMerged: () => void;
}

export default function SiteMergeModal({ sites, clientName, stats, onClose, onMerged }: Props) {
  const { addToast } = useToast();
  const [target, setTarget] = useState('');
  const [merging, setMerging] = useState(false);

  const sameClient = sites.length >= 2 && sites.every(s => s.client_id === sites[0].client_id);

  async function doMerge() {
    if (!sameClient || !target) return;
    const sources = sites.filter(s => s.id !== target).map(s => s.id);
    if (sources.length === 0) return;
    setMerging(true);

    const { error: upErr } = await supabase
      .from('received_waste_records')
      .update({ site_id: target })
      .in('site_id', sources);
    if (upErr) { setMerging(false); addToast('Merge failed: ' + upErr.message, 'error'); return; }

    const { error: delErr } = await supabase.from('client_sites').delete().in('id', sources);
    setMerging(false);
    if (delErr) {
      addToast('Records moved but could not delete old sites: ' + delErr.message, 'error');
    } else {
      addToast(`Merged ${sources.length} site${sources.length > 1 ? 's' : ''}`);
    }
    onMerged();
  }

  return (
    <Modal
      title="Merge Sites"
      onClose={onClose}
      size="md"
      accent="indigo"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={doMerge}
            disabled={!sameClient || !target || merging}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 font-medium shadow-sm"
          >
            <Merge size={14} /> {merging ? 'Merging…' : 'Merge Sites'}
          </button>
        </>
      }
    >
      {!sameClient ? (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5 text-amber-500" />
          <p>Selected facilities must all belong to the <strong>same account</strong> to merge. Adjust your selection and try again.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            All waste records from the other facilities of{' '}
            <strong>{clientName[sites[0].client_id] ?? '—'}</strong>{' '}
            will be moved to the surviving facility, and the duplicates will be deleted.
            This cannot be undone.
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Surviving facility</label>
            <select
              value={target}
              onChange={e => setTarget(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— choose facility to keep —</option>
              {sites.map(s => (
                <option key={s.id} value={s.id}>
                  {s.generator_facility} ({stats[s.id]?.n || 0} records)
                </option>
              ))}
            </select>
          </div>

          <div className="border border-gray-100 rounded-lg divide-y divide-gray-100">
            {sites.map(s => (
              <div key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className={s.id === target ? 'font-semibold text-indigo-700' : 'text-gray-600'}>
                  {s.generator_facility}
                  {s.id === target && <span className="ml-2 text-[10px] uppercase tracking-wider text-indigo-500">keep</span>}
                </span>
                <span className="text-xs text-gray-400">{stats[s.id]?.n || 0} recs</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
