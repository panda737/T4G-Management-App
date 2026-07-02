import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, X, Plus, Wrench,
  AlertTriangle, Package, Clock, Maximize2, Settings,
  ChevronDown,
} from 'lucide-react';
import { Spinner, PageSpinner } from '../../components/Spinner';
import { supabase } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import type { Equipment, Part, MaintenanceHistory } from '../../lib/supabase';
import { PLANT_STEPS, STEP_COLORS } from '../../data/plantEquipment';
import type { PlantStep } from '../../data/plantEquipment';
import PlantDiagram from '../../components/PlantDiagram';
import PartFormModal from './PartFormModal';
import MaintenanceFormModal from './MaintenanceFormModal';

const STATUS_DOT: Record<string, string> = {
  Operational: 'bg-emerald-500',
  'Under Maintenance': 'bg-amber-400',
  Faulty: 'bg-red-500',
  Decommissioned: 'bg-gray-400',
};

const TYPE_BADGE: Record<string, string> = {
  Scheduled: 'bg-blue-100 text-blue-700',
  Corrective: 'bg-orange-100 text-orange-700',
  Preventive: 'bg-sky-100 text-sky-700',
  Emergency: 'bg-red-100 text-red-700',
};

function matchStepKey(eq: Equipment): string | null {
  const n = eq.name.toLowerCase();
  for (const s of PLANT_STEPS) {
    if (n.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(n)) return s.key;
  }
  return null;
}

export default function PlantOverview() {
  usePageTitle('Maintenance — Plant Overview');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [equipByStep, setEquipByStep] = useState<Record<string, Equipment>>({});
  const [allParts, setAllParts] = useState<Part[]>([]);
  const [ready, setReady] = useState(false);
  const [stepParts, setStepParts] = useState<Part[]>([]);
  const [stepLogs, setStepLogs] = useState<MaintenanceHistory[]>([]);
  const [innerLoading, setInnerLoading] = useState(false);
  const [modal, setModal] = useState<'part' | 'maintenance' | null>(null);
  const [editPart, setEditPart] = useState<Part | null>(null);
  const [opError, setOpError] = useState('');

  const loadAll = useCallback(async () => {
    const [{ data: eqData }, { data: partsData }] = await Promise.all([
      supabase.from('equipment').select('*').order('name'),
      supabase.from('parts').select('*'),
    ]);
    const map: Record<string, Equipment> = {};
    (eqData || []).forEach(eq => {
      const key = matchStepKey(eq);
      if (key) map[key] = eq;
    });
    setEquipByStep(map);
    setAllParts(partsData || []);
    setReady(true);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const statusMap = useMemo(() => {
    const m: Record<string, string> = {};
    PLANT_STEPS.forEach(s => { m[s.key] = equipByStep[s.key]?.status || 'Operational'; });
    return m;
  }, [equipByStep]);

  const lowPartsMap = useMemo(() => {
    const m: Record<string, number> = {};
    PLANT_STEPS.forEach(s => {
      const eq = equipByStep[s.key];
      if (eq) m[s.key] = allParts.filter(p => p.equipment_id === eq.id && p.qty_on_hand < p.qty_required).length;
    });
    return m;
  }, [equipByStep, allParts]);

  const loadStepDetails = useCallback(async (key: string) => {
    const eq = equipByStep[key];
    if (!eq) { setStepParts([]); setStepLogs([]); return; }
    setInnerLoading(true);
    const [{ data: p }, { data: h }] = await Promise.all([
      supabase.from('parts').select('*').eq('equipment_id', eq.id).order('name'),
      supabase.from('maintenance_history').select('*').eq('equipment_id', eq.id).order('service_date', { ascending: false }).limit(20),
    ]);
    setStepParts(p || []);
    setStepLogs(h || []);
    setInnerLoading(false);
  }, [equipByStep]);

  function handleSelect(key: string) {
    if (selectedKey === key) { setSelectedKey(null); return; }
    setSelectedKey(key);
    loadStepDetails(key);
  }

  function navigateStep(dir: -1 | 1) {
    if (!selectedKey) return;
    const idx = PLANT_STEPS.findIndex(s => s.key === selectedKey);
    const next = idx + dir;
    if (next < 0 || next >= PLANT_STEPS.length) return;
    const nextKey = PLANT_STEPS[next].key;
    setSelectedKey(nextKey);
    loadStepDetails(nextKey);
  }

  async function updateStatus(status: string) {
    const eq = selectedKey ? equipByStep[selectedKey] : null;
    if (!eq) return;
    setOpError('');
    const { error } = await supabase.from('equipment').update({ status }).eq('id', eq.id);
    if (error) { setOpError(error.message); return; }
    setEquipByStep(prev => ({ ...prev, [selectedKey!]: { ...prev[selectedKey!], status } }));
  }

  function afterSave() {
    if (selectedKey) loadStepDetails(selectedKey);
    loadAll();
    setModal(null);
    setEditPart(null);
  }

  const selectedStep = PLANT_STEPS.find(s => s.key === selectedKey) || null;
  const selectedEq = selectedKey ? equipByStep[selectedKey] || null : null;
  const selectedIdx = selectedKey ? PLANT_STEPS.findIndex(s => s.key === selectedKey) : -1;

  if (!ready) {
    return <div className="flex justify-center py-20"><PageSpinner color="orange" /></div>;
  }

  return (
    <div className="space-y-4">
      {opError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">{opError}</div>}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plant Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Interactive treatment plant diagram -- click equipment to inspect</p>
        </div>
        {selectedKey && (
          <button onClick={() => setSelectedKey(null)} className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            <Maximize2 size={14} /> Full Overview
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {(['Operational', 'Under Maintenance', 'Faulty', 'Decommissioned'] as const).map(status => {
          const count = PLANT_STEPS.filter(s => statusMap[s.key] === status).length;
          if (count === 0) return null;
          return (
            <div key={status} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[status]}`} />
              <span className="font-medium">{count}</span> {status}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300 ${selectedKey ? 'lg:flex-1' : 'w-full'}`}>
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings size={14} className="text-orange-500" />
              <span className="text-xs font-semibold text-gray-700">Treatment Plant Process Flow</span>
            </div>
            <span className="text-[10px] text-gray-400">Shredder (right) → Outlet (left)</span>
          </div>
          <div className="p-3 sm:p-4">
            <PlantDiagram selectedKey={selectedKey} statusMap={statusMap} lowPartsMap={lowPartsMap} onSelect={handleSelect} />
          </div>
          <div className="px-4 pb-3 flex items-center gap-4 flex-wrap">
            {[['bg-emerald-500', 'Operational'], ['bg-amber-400', 'Under Maintenance'], ['bg-red-500', 'Faulty'], ['bg-gray-400', 'Decommissioned']].map(([dot, label]) => (
              <div key={label} className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <span className={`w-2 h-2 rounded-full ${dot}`} />{label}
              </div>
            ))}
          </div>
        </div>

        {selectedKey && selectedStep && (
          <DetailPanel
            step={selectedStep}
            equipment={selectedEq}
            parts={stepParts}
            logs={stepLogs}
            loading={innerLoading}
            stepIndex={selectedIdx}
            totalSteps={PLANT_STEPS.length}
            onClose={() => setSelectedKey(null)}
            onNavigate={navigateStep}
            onStatusChange={updateStatus}
            onAddPart={() => { setEditPart(null); setModal('part'); }}
            onEditPart={p => { setEditPart(p); setModal('part'); }}
            onLogMaintenance={() => setModal('maintenance')}
          />
        )}
      </div>

      {modal === 'part' && selectedEq && (
        <PartFormModal equipmentId={selectedEq.id} part={editPart} onClose={() => { setModal(null); setEditPart(null); }} onSave={afterSave} />
      )}
      {modal === 'maintenance' && selectedEq && (
        <MaintenanceFormModal equipmentId={selectedEq.id} onClose={() => setModal(null)} onSave={afterSave} />
      )}
    </div>
  );
}

function DetailPanel({ step, equipment, parts, logs, loading, stepIndex, totalSteps, onClose, onNavigate, onStatusChange, onAddPart, onEditPart, onLogMaintenance }: {
  step: PlantStep; equipment: Equipment | null; parts: Part[]; logs: MaintenanceHistory[];
  loading: boolean; stepIndex: number; totalSteps: number;
  onClose: () => void; onNavigate: (dir: -1 | 1) => void; onStatusChange: (status: string) => void;
  onAddPart: () => void; onEditPart: (p: Part) => void; onLogMaintenance: () => void;
}) {
  const [tab, setTab] = useState<'overview' | 'parts' | 'history'>('overview');
  const color = STEP_COLORS[step.key];
  const lowParts = parts.filter(p => p.qty_on_hand < p.qty_required);

  useEffect(() => { setTab('overview'); }, [step.key]);

  return (
    <div className="w-full lg:w-[380px] flex-shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 220px)', minHeight: 400 }}>
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: color }}>
              {step.step}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm leading-tight">{step.name}</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Step {step.step} of {totalSteps}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors"><X size={16} /></button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onNavigate(-1)} disabled={stepIndex <= 0} className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-600 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft size={13} /> Prev
          </button>
          <div className="flex-1 flex justify-center gap-1">
            {PLANT_STEPS.map((s, i) => (
              <div key={s.key} className={`w-2 h-2 rounded-full transition-colors ${i === stepIndex ? 'bg-orange-500' : 'bg-gray-200'}`} />
            ))}
          </div>
          <button onClick={() => onNavigate(1)} disabled={stepIndex >= totalSteps - 1} className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-600 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors">
            Next <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {equipment && (
        <div className="flex-shrink-0 px-4 py-2.5 border-b border-gray-50 flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_DOT[equipment.status] || 'bg-gray-400'}`} />
          <span className="text-xs font-medium text-gray-700 flex-1">{equipment.status}</span>
          <div className="relative">
            <select
              value={equipment.status}
              onChange={e => onStatusChange(e.target.value)}
              className="appearance-none text-xs border border-gray-200 rounded-lg pl-2 pr-6 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-400 bg-white"
            >
              {['Operational', 'Under Maintenance', 'Faulty', 'Decommissioned'].map(s => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          {lowParts.length > 0 && (
            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
              <AlertTriangle size={10} className="text-amber-500" />
              <span className="text-[10px] text-amber-700 font-medium">{lowParts.length} low</span>
            </div>
          )}
        </div>
      )}

      <div className="flex-shrink-0 flex border-b border-gray-100 px-4">
        {(['overview', 'parts', 'history'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 mr-4 text-xs font-medium border-b-2 transition-colors capitalize ${tab === t ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            {t === 'parts' ? `Parts (${parts.length})` : t === 'history' ? `History (${logs.length})` : 'Overview'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex justify-center py-10"><Spinner size="sm" color="orange" /></div>
        ) : tab === 'overview' ? (
          <OverviewTab step={step} equipment={equipment} />
        ) : tab === 'parts' ? (
          <PartsTab parts={parts} onAdd={onAddPart} onEdit={onEditPart} />
        ) : (
          <HistoryTab logs={logs} onLog={onLogMaintenance} />
        )}
      </div>
    </div>
  );
}

function OverviewTab({ step, equipment }: { step: PlantStep; equipment: Equipment | null }) {
  return (
    <div className="p-4 space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</h4>
        <p className="text-sm text-gray-700 leading-relaxed">{step.description}</p>
      </div>
      {equipment ? (
        <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Equipment Record</p>
          {equipment.manufacturer && <EquipRow label="Manufacturer" value={equipment.manufacturer} />}
          {equipment.model && <EquipRow label="Model" value={equipment.model} />}
          {equipment.serial_number && <EquipRow label="Serial No." value={equipment.serial_number} />}
          {equipment.location && <EquipRow label="Location" value={equipment.location} />}
          {equipment.category && <EquipRow label="Category" value={equipment.category} />}
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-amber-800">Not linked to Equipment Register</p>
            <p className="text-[11px] text-amber-600 mt-0.5">Add equipment named "{step.name}" in the Equipment Register to link it here.</p>
          </div>
        </div>
      )}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Main Components</h4>
        <div className="grid grid-cols-2 gap-1.5">
          {step.mainParts.map(p => (
            <div key={p} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />{p}
            </div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Reference Spare Parts</h4>
        <div className="grid grid-cols-2 gap-1.5">
          {step.spareParts.map(p => (
            <div key={p} className="flex items-center gap-1.5 text-xs text-gray-500">
              <Package size={10} className="text-gray-300 flex-shrink-0" />{p}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EquipRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-700 font-medium">{value}</span>
    </div>
  );
}

function PartsTab({ parts, onAdd, onEdit }: { parts: Part[]; onAdd: () => void; onEdit: (p: Part) => void }) {
  const canEdit = useUser().canWrite('maintenance');
  return (
    <div className="p-4 space-y-2.5">
      {canEdit && (
        <div className="flex justify-end">
          <button onClick={onAdd} className="inline-flex items-center gap-1 text-xs bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600 transition-colors shadow-sm">
            <Plus size={12} /> Add Part
          </button>
        </div>
      )}
      {parts.length === 0 ? (
        <div className="py-6 text-center">
          <Package size={20} className="mx-auto text-gray-300 mb-1.5" />
          <p className="text-xs text-gray-400">No spare parts recorded yet</p>
        </div>
      ) : parts.map(p => {
        const low = p.qty_on_hand < p.qty_required;
        return (
          <div key={p.id} className={`rounded-lg border p-3 ${low ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">{p.name}</p>
                {p.part_number && <p className="text-[10px] text-gray-400 font-mono">{p.part_number}</p>}
              </div>
              {canEdit && <button onClick={() => onEdit(p)} className="text-[10px] text-orange-600 hover:underline flex-shrink-0 font-medium">Edit</button>}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-xs font-bold ${low ? 'text-red-600' : 'text-gray-700'}`}>{p.qty_on_hand}/{p.qty_required}</span>
              <span className="text-[10px] text-gray-400">on hand / required</span>
              {p.unit_cost != null && <span className="text-[10px] text-gray-400 ml-auto">R {Number(p.unit_cost).toFixed(2)}</span>}
            </div>
            {p.supplier && <p className="text-[10px] text-gray-400 mt-1">Supplier: {p.supplier}</p>}
          </div>
        );
      })}
    </div>
  );
}

function HistoryTab({ logs, onLog }: { logs: MaintenanceHistory[]; onLog: () => void }) {
  const canEdit = useUser().canWrite('maintenance');
  return (
    <div className="p-4 space-y-2.5">
      {canEdit && (
        <div className="flex justify-end">
          <button onClick={onLog} className="inline-flex items-center gap-1 text-xs bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600 transition-colors shadow-sm">
            <Wrench size={12} /> Log Service
          </button>
        </div>
      )}
      {logs.length === 0 ? (
        <div className="py-6 text-center">
          <Clock size={20} className="mx-auto text-gray-300 mb-1.5" />
          <p className="text-xs text-gray-400">No service records yet</p>
        </div>
      ) : logs.map(log => (
        <div key={log.id} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-medium text-gray-700">
              {new Date(log.service_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TYPE_BADGE[log.type] || 'bg-gray-100 text-gray-500'}`}>{log.type}</span>
            {log.technician && <span className="text-[10px] text-gray-400">{log.technician}</span>}
          </div>
          <p className="text-xs text-gray-600">{log.description}</p>
          {log.next_service_date && (
            <p className="text-[10px] text-orange-500 mt-1 font-medium">
              Next service: {new Date(log.next_service_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
