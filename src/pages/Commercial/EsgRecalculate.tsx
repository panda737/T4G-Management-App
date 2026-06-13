import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, Clock, ChevronDown, AlertTriangle, ShieldCheck } from 'lucide-react';
import { supabase, type EsgResult, type EsgDataBasis, ESG_DATA_BASIS_LABELS } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import { Spinner } from '../../components/Spinner';
import SectionTabs from '../../components/SectionTabs';
import { ESG_TABS } from './commercialTabs';
import { runEsgRecalc, listPeriodsWithData } from './esgEngine';

const num = (n: number | null) => n == null ? '—' : Number(n).toLocaleString('en-ZA', { maximumFractionDigits: 2 });

const METRICS: { key: keyof EsgResult; basisKey: string; label: string; unit: string }[] = [
  { key: 'co2e_saved_kg', basisKey: 'co2e_saved_kg', label: 'CO₂e saved', unit: 'kg' },
  { key: 'residual_tco2e', basisKey: 'residual_tco2e', label: 'Residual', unit: 'tCO₂e' },
  { key: 'electricity_saved_kwh', basisKey: 'electricity_saved_kwh', label: 'Electricity saved', unit: 'kWh' },
  { key: 'water_saved_kl', basisKey: 'water_saved_kl', label: 'Water saved', unit: 'kL' },
  { key: 'diesel_saved_l', basisKey: 'diesel_saved_l', label: 'Diesel saved', unit: 'L' },
  { key: 'km_avoided', basisKey: 'km_avoided', label: 'Km avoided', unit: 'km' },
  { key: 'trips_avoided', basisKey: 'trips_avoided', label: 'Trips avoided', unit: '' },
  { key: 'indicative_carbon_credits', basisKey: 'indicative_carbon_credits', label: 'Indicative credits', unit: '' },
];

const BASIS_STYLE: Record<EsgDataBasis, string> = {
  actual: 'bg-emerald-50 text-emerald-700',
  admin_actual: 'bg-blue-50 text-blue-700',
  estimated: 'bg-amber-50 text-amber-700',
  benchmark: 'bg-violet-50 text-violet-700',
  awaiting: 'bg-gray-100 text-gray-400',
};

function BasisBadge({ b }: { b: EsgDataBasis | undefined }) {
  const basis = b ?? 'awaiting';
  return <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${BASIS_STYLE[basis]}`}>{ESG_DATA_BASIS_LABELS[basis]}</span>;
}

export default function EsgRecalculate() {
  usePageTitle('Commercial — ESG Recalculate & Review');
  const { isAdmin } = useUser();
  const { addToast } = useToast();

  const [periods, setPeriods] = useState<string[]>([]);
  const [period, setPeriod] = useState('');
  const [results, setResults] = useState<EsgResult[]>([]);
  const [missing, setMissing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const p = await listPeriodsWithData(supabase);
      setPeriods(p);
      setPeriod(p[0] ?? '');
      setLoading(false);
    })();
  }, []);

  useEffect(() => { if (period) loadResults(period); }, [period]);

  async function loadResults(ym: string) {
    const { data } = await supabase.from('esg_results').select('*').eq('period_month', `${ym}-01`).order('total_nett_kg', { ascending: false });
    setResults((data ?? []) as EsgResult[]);
  }

  async function recalc() {
    if (!period) return;
    setRunning(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const summary = await runEsgRecalc(supabase, period, user?.id ?? null);
      setMissing(summary.missingFactors);
      await loadResults(period);
      addToast(`Recalculated ${summary.clients} client(s). Results are draft — review and approve.`);
    } catch (e) {
      addToast('Recalc failed: ' + (e instanceof Error ? e.message : String(e)), 'error');
    } finally {
      setRunning(false);
    }
  }

  async function approve(r: EsgResult) {
    if (!isAdmin) { addToast('Only admins can approve results', 'error'); return; }
    const { error } = await supabase.from('esg_results').update({ approved: !r.approved }).eq('id', r.id);
    if (error) { addToast('Update failed: ' + error.message, 'error'); return; }
    addToast(r.approved ? 'Result hidden from customer' : 'Result approved — now visible to customer');
    loadResults(period);
  }

  async function approveAll() {
    if (!isAdmin) return;
    const { error } = await supabase.from('esg_results').update({ approved: true }).eq('period_month', `${period}-01`).eq('approved', false);
    if (error) { addToast('Approve failed: ' + error.message, 'error'); return; }
    addToast('All results approved for this period');
    loadResults(period);
  }

  if (loading) return <Spinner />;

  const draftCount = results.filter(r => !r.approved).length;

  return (
    <div className="space-y-5">
      <SectionTabs tabs={ESG_TABS} />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Recalculate &amp; Review</h1>
        <p className="text-sm text-gray-500 mt-1">Run the engine for a month, review each client's numbers and their provenance, then approve for customer visibility.</p>
      </div>

      {periods.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-400">
          No received-waste data yet. Import received waste first, then recalculate ESG.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <select value={period} onChange={e => setPeriod(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {periods.map(p => {
                const [y, m] = p.split('-').map(Number);
                return <option key={p} value={p}>{new Date(y, m - 1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}</option>;
              })}
            </select>
            <button onClick={recalc} disabled={running} className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white hover:bg-indigo-700 px-3.5 py-2 rounded-lg transition disabled:opacity-50">
              {running ? <Spinner size="sm" color="gray" /> : <RefreshCw size={15} />} Recalculate this month
            </button>
            {isAdmin && draftCount > 0 && (
              <button onClick={approveAll} className="flex items-center gap-1.5 text-sm bg-emerald-600 text-white hover:bg-emerald-700 px-3.5 py-2 rounded-lg transition">
                <ShieldCheck size={15} /> Approve all {draftCount}
              </button>
            )}
          </div>

          {missing.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              <div className="flex items-center gap-2 font-semibold mb-1"><AlertTriangle size={15} /> Some metrics are "awaiting data"</div>
              These approved factors are missing, so the metrics that need them are blank (never guessed):
              <span className="font-mono text-xs"> {missing.join(', ')}</span>. Approve them in <b>ESG Factors</b> and recalculate.
            </div>
          )}

          {results.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-400">
              No results for this month yet. Click <b>Recalculate this month</b>.
            </div>
          ) : (
            <div className="space-y-3">
              {results.map(r => (
                <div key={r.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setExpanded(expanded === r.id ? null : r.id)} className="text-gray-400 hover:text-gray-700">
                        <ChevronDown size={16} className={`transition-transform ${expanded === r.id ? 'rotate-180' : ''}`} />
                      </button>
                      <div>
                        <ClientName clientId={r.client_id} />
                        <div className="text-[11px] text-gray-400">{num(r.total_nett_kg)} kg treated</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {r.approved
                        ? <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-xs font-semibold"><CheckCircle size={12} /> Approved (live)</span>
                        : <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full text-xs font-semibold"><Clock size={12} /> Draft</span>}
                      {isAdmin && (
                        <button onClick={() => approve(r)} className={`text-xs px-3 py-1.5 rounded-lg font-medium ${r.approved ? 'text-amber-700 hover:bg-amber-50 border border-amber-200' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                          {r.approved ? 'Unapprove' : 'Approve'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
                    {METRICS.map(m => {
                      const basis = r.data_basis?.[m.basisKey] as EsgDataBasis | undefined;
                      const v = r[m.key] as number | null;
                      return (
                        <div key={m.key} className="bg-gray-50 rounded-lg px-3 py-2.5">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] text-gray-500">{m.label}</span>
                            <BasisBadge b={basis} />
                          </div>
                          <div className="text-sm font-bold text-gray-900">
                            {basis === 'awaiting' || v == null ? <span className="text-gray-300">Awaiting data</span> : <>{num(v)} <span className="text-xs font-normal text-gray-400">{m.unit}</span></>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {expanded === r.id && (
                    <div className="border-t border-gray-100 bg-gray-50/60 p-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Audit trail (inputs · factors · provenance)</p>
                      <pre className="text-[11px] text-gray-600 bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto max-h-96">{JSON.stringify(r.audit, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ClientName({ clientId }: { clientId: string }) {
  const [name, setName] = useState('…');
  useEffect(() => {
    supabase.from('clients').select('client_name').eq('id', clientId).maybeSingle()
      .then(({ data }) => setName(data?.client_name ?? '—'));
  }, [clientId]);
  return <div className="font-semibold text-gray-800">{name}</div>;
}
