import { useEffect, useState } from 'react';
import { Database, CheckCircle2, AlertTriangle, MapPin, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { Spinner } from '../../components/Spinner';

// ─────────────────────────────────────────────────────────────────────────────
// Portal Data Audit (admin, read-only) — Phase 0.
//
// Answers "do we have all the client data?" at a glance: per client, how many
// sites (and how many have a province), how many received-waste rows + their
// month range, and whether ESG has been computed AND approved. Reads the
// pre-aggregated v_commercial_client_data_audit view (no full-table paging).
// ─────────────────────────────────────────────────────────────────────────────

interface Row {
  client_id: string;
  client_name: string;
  sites: number;
  sites_with_province: number;
  waste_rows: number;
  month_min: string | null;
  month_max: string | null;
  esg_total: number;
  esg_approved: number;
  latest_approved: string | null;
}

const monthLabel = (ym: string | null) => {
  if (!ym) return '—';
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' });
};

export default function PortalDataAudit() {
  usePageTitle('Commercial — Portal Data Audit');
  const [rows, setRows] = useState<Row[]>([]);
  const [opMonths, setOpMonths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [auditRes, opRes] = await Promise.all([
        supabase.from('v_commercial_client_data_audit').select('*').order('client_name'),
        supabase.from('esg_monthly_operational').select('period_month'),
      ]);
      if (auditRes.error) throw new Error(auditRes.error.message);

      const data = (auditRes.data ?? []) as Row[];
      data.sort((a, b) => b.waste_rows - a.waste_rows || a.client_name.localeCompare(b.client_name));
      setRows(data);
      setOpMonths([...new Set(((opRes.data ?? []) as { period_month: string }[]).map(o => o.period_month.substring(0, 7)))].sort());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <Spinner />;

  const totals = rows.reduce((a, r) => ({
    sites: a.sites + r.sites,
    waste: a.waste + r.waste_rows,
    withApproved: a.withApproved + (r.esg_approved > 0 ? 1 : 0),
  }), { sites: 0, waste: 0, withApproved: 0 });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Database size={20} className="text-indigo-500" />
            <h1 className="text-2xl font-bold text-gray-900">Portal Data Audit</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">What client data is actually loaded — sites, received waste, and whether ESG is computed &amp; approved for the portal.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white hover:bg-gray-50">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Clients" value={rows.length} />
        <Stat label="Sites" value={totals.sites} />
        <Stat label="Received-waste rows" value={totals.waste.toLocaleString('en-ZA')} />
        <Stat label="Clients with approved ESG" value={`${totals.withApproved} / ${rows.length}`} />
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2.5 text-xs text-indigo-800">
        Months with plant operational data entered: <b>{opMonths.length ? opMonths.map(monthLabel).join(', ') : 'none yet'}</b>.
        Carbon / water / diesel figures stay blank until operational data is entered, factors are approved, and ESG results are recalculated &amp; approved.
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
              <th className="px-4 py-2.5 font-medium">Client</th>
              <th className="px-4 py-2.5 font-medium">Sites</th>
              <th className="px-4 py-2.5 font-medium">Province set</th>
              <th className="px-4 py-2.5 font-medium text-right">Waste rows</th>
              <th className="px-4 py-2.5 font-medium">Month range</th>
              <th className="px-4 py-2.5 font-medium">ESG (approved/total)</th>
              <th className="px-4 py-2.5 font-medium">Portal status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const noWaste = r.waste_rows === 0;
              return (
                <tr key={r.client_id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{r.client_name}</td>
                  <td className="px-4 py-2.5 text-gray-600">{r.sites}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1 ${r.sites && r.sites_with_province === r.sites ? 'text-emerald-600' : 'text-gray-400'}`}>
                      <MapPin size={12} /> {r.sites_with_province}/{r.sites}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{r.waste_rows.toLocaleString('en-ZA')}</td>
                  <td className="px-4 py-2.5 text-gray-600">{r.month_min ? `${monthLabel(r.month_min)} – ${monthLabel(r.month_max)}` : '—'}</td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {r.esg_total === 0 ? '—' : `${r.esg_approved}/${r.esg_total}${r.latest_approved ? ` · ${monthLabel(r.latest_approved)}` : ''}`}
                  </td>
                  <td className="px-4 py-2.5">
                    {noWaste ? (
                      <Badge tone="gray" icon={AlertTriangle}>No waste data</Badge>
                    ) : r.esg_approved > 0 ? (
                      <Badge tone="emerald" icon={CheckCircle2}>ESG live</Badge>
                    ) : (
                      <Badge tone="amber" icon={AlertTriangle}>Waste only — ESG pending</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No clients found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

const TONE: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  gray: 'bg-gray-100 text-gray-500 border-gray-200',
};

function Badge({ tone, icon: Icon, children }: { tone: string; icon: typeof CheckCircle2; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${TONE[tone]}`}>
      <Icon size={12} /> {children}
    </span>
  );
}
