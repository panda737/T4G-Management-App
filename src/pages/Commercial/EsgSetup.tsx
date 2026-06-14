import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Circle, ArrowRight, Sliders, Gauge, Database, RefreshCw, Award, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { PageSpinner } from '../../components/Spinner';
import SectionTabs from '../../components/SectionTabs';
import { ESG_TABS } from './commercialTabs';

// Factor keys the engine needs for the core (carbon + transport) metrics.
// Baseline comparator = autoclave (Tech4Green's normal comparison). Tech4Green's
// own direct treatment factor is 0.000 within the direct treatment-process boundary.
const ESSENTIAL_FACTORS = [
  'emission_factor:diesel', 'emission_factor:electricity',
  'treatment_factor:t4g_plant', 'treatment_factor:autoclave',
  'transport_assumption:boxbody_payload_kg', 'transport_assumption:avg_trip_km',
  'transport_assumption:diesel_l_per_km_t4g', 'transport_assumption:diesel_l_per_km_baseline',
  'carbon_credit:tco2e_per_credit',
];
const METHODOLOGY_FACTORS = ['baseline:treatment_comparator', 'allocation:method', 'carbon_credit:tco2e_per_credit'];

interface StepState { done: boolean; detail: string; }

export default function EsgSetup() {
  usePageTitle('Commercial — ESG Setup');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<Record<string, StepState>>({});

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [fRes, opRes, rRes] = await Promise.all([
      supabase.from('esg_factors').select('factor_key, version, approved, category').eq('active', true).order('version', { ascending: false }),
      supabase.from('esg_monthly_operational').select('id, approved').is('site_id', null),
      supabase.from('esg_results').select('id, approved'),
    ]);

    // latest version per key
    const seen = new Set<string>();
    const approvedKeys = new Set<string>();
    let draftCount = 0, totalCount = 0;
    for (const f of (fRes.data ?? []) as Array<{ factor_key: string; approved: boolean }>) {
      if (seen.has(f.factor_key)) continue;
      seen.add(f.factor_key); totalCount++;
      if (f.approved) approvedKeys.add(f.factor_key); else draftCount++;
    }
    const essentialApproved = ESSENTIAL_FACTORS.filter(k => approvedKeys.has(k)).length;
    const methodologyApproved = METHODOLOGY_FACTORS.filter(k => approvedKeys.has(k)).length;

    const opRows = (opRes.data ?? []) as Array<{ approved: boolean }>;
    const opApproved = opRows.filter(o => o.approved).length;
    const resRows = (rRes.data ?? []) as Array<{ approved: boolean }>;
    const resApproved = resRows.filter(r => r.approved).length;

    setSteps({
      factors: {
        done: essentialApproved === ESSENTIAL_FACTORS.length,
        detail: `${essentialApproved}/${ESSENTIAL_FACTORS.length} essential factors approved · ${draftCount} draft of ${totalCount} total`,
      },
      methodology: {
        done: methodologyApproved === METHODOLOGY_FACTORS.length,
        detail: `${methodologyApproved}/${METHODOLOGY_FACTORS.length} methodology defaults confirmed`,
      },
      operational: {
        done: opApproved > 0,
        detail: opRows.length === 0 ? 'No months entered yet' : `${opApproved} of ${opRows.length} month(s) approved`,
      },
      recalc: {
        done: resRows.length > 0,
        detail: resRows.length === 0 ? 'Not run yet' : `${resRows.length} client-month result(s) computed`,
      },
      approve: {
        done: resApproved > 0,
        detail: resApproved === 0 ? 'Nothing visible to customers yet' : `${resApproved} result(s) live to customers`,
      },
    });
    setLoading(false);
  }

  if (loading) return <PageSpinner layout="h64" />;

  const order = ['factors', 'methodology', 'operational', 'recalc', 'approve'];
  const doneCount = order.filter(k => steps[k]?.done).length;
  const pct = Math.round((doneCount / order.length) * 100);

  const cards: { id: string; n: number; title: string; desc: string; icon: LucideIcon; to: string; cta: string }[] = [
    { id: 'factors', n: 1, title: 'Review & approve factors', desc: 'The library is pre-loaded as drafts. Check each value & source, then approve. Nothing reaches customers until approved.', icon: Sliders, to: '/commercial/esg/factors', cta: 'Open factors' },
    { id: 'methodology', n: 2, title: 'Confirm methodology', desc: 'Allocation = share of nett kg · 1 credit = 1 tCO₂e · admin approves. Confirm or edit these defaults (in the factor list under Baselines / Allocation / Carbon Credit).', icon: Gauge, to: '/commercial/esg/factors', cta: 'Confirm defaults' },
    { id: 'operational', n: 3, title: 'Enter monthly plant data', desc: 'Electricity, water, diesel, trips, km, idling. Blank fields are estimated automatically. Effluent is Not Applicable for Tech4Green (no effluent stream).', icon: Database, to: '/commercial/esg/operational', cta: 'Enter data' },
    { id: 'recalc', n: 4, title: 'Recalculate & review', desc: 'Run the engine for a month. Every number shows its inputs, factor version and data basis. Missing factor → "awaiting data", never a guess.', icon: RefreshCw, to: '/commercial/esg/recalculate', cta: 'Recalculate' },
    { id: 'approve', n: 5, title: 'Approve for customers', desc: 'Approve reviewed results to make them visible in the customer ESG dashboard.', icon: ShieldCheck, to: '/commercial/esg/recalculate', cta: 'Approve results' },
  ];

  return (
    <div className="space-y-6">
      <SectionTabs tabs={ESG_TABS} />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ESG Setup</h1>
        <p className="text-sm text-gray-500 mt-1">Five steps to go live. The system comes pre-loaded — you mostly review &amp; approve.</p>
      </div>

      {/* Readiness meter */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">Readiness</span>
          <span className="text-sm font-bold text-indigo-600">{pct}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full bg-indigo-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-2">{doneCount} of {order.length} steps complete.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {cards.map(c => {
          const s = steps[c.id];
          const Icon = c.icon;
          return (
            <div key={c.id + c.n} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col">
              <div className="flex items-start gap-3 mb-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s?.done ? 'bg-emerald-50' : 'bg-indigo-50'}`}>
                  <Icon size={18} className={s?.done ? 'text-emerald-600' : 'text-indigo-600'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-gray-400">STEP {c.n}</span>
                    {s?.done
                      ? <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px] font-semibold"><CheckCircle size={11} /> Done</span>
                      : <span className="inline-flex items-center gap-1 text-gray-400 text-[11px] font-semibold"><Circle size={11} /> To do</span>}
                  </div>
                  <h2 className="text-sm font-semibold text-gray-900">{c.title}</h2>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-3 flex-1">{c.desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400">{s?.detail}</span>
                <button onClick={() => navigate(c.to)} className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800">
                  {c.cta} <ArrowRight size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-3">
        <Award size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-gray-500">
          Optional: upload registry / retirement evidence in <button onClick={() => navigate('/commercial/esg/credits')} className="text-indigo-600 font-medium hover:underline">Carbon Credit Evidence</button> to upgrade a client's credits from "indicative estimate" to "verified".
        </p>
      </div>
    </div>
  );
}
