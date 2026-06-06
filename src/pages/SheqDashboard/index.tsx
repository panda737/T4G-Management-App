import { useEffect, useState, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  ClipboardCheck,
  Clock,
  Users,
  Siren,
} from 'lucide-react';
import {
  supabase,
  SafetyIncident,
  SafetyCorrectiveAction,
  SafetyToolboxTalk,
  SafetyEmergencyDrill,
  SafetyRiskAssessment,
} from '../../lib/supabase';
import { severityColors, incidentStatusColors, priorityColors } from '../../lib/badgeColors';

interface DashboardStats {
  incidentsThisYear: number;
  openIncidents: number;
  inspectionCompliance: number;
  overdueActions: number;
  toolboxTalksThisYear: number;
  drillsCompletedThisYear: number;
}

export default function SheqDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    incidentsThisYear: 0,
    openIncidents: 0,
    inspectionCompliance: 0,
    overdueActions: 0,
    toolboxTalksThisYear: 0,
    drillsCompletedThisYear: 0,
  });
  const [incidents, setIncidents] = useState<SafetyIncident[]>([]);
  const [actions, setActions] = useState<SafetyCorrectiveAction[]>([]);
  const [drills, setDrills] = useState<SafetyEmergencyDrill[]>([]);
  const [talks, setTalks] = useState<SafetyToolboxTalk[]>([]);
  const [risks, setRisks] = useState<SafetyRiskAssessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const today = new Date();
    const thisYear = new Date(today.getFullYear(), 0, 1).toISOString();

    const [incidentsRes, actionsRes, drillsRes, talksRes, inspectionsRes, risksRes] =
      await Promise.all([
        supabase.from('safety_incidents').select('*').order('incident_date', { ascending: false }),
        supabase.from('safety_corrective_actions').select('*').order('due_date', { ascending: false }),
        supabase.from('safety_emergency_drills').select('*').order('drill_date', { ascending: false }),
        supabase.from('safety_toolbox_talks').select('*').order('talk_date', { ascending: false }),
        supabase.from('safety_inspections').select('*').order('inspection_date', { ascending: false }),
        supabase.from('safety_risk_assessments').select('*').order('assessment_date', { ascending: false }),
      ]);

    const allIncidents = incidentsRes.data || [];
    const allActions = actionsRes.data || [];
    const allDrills = drillsRes.data || [];
    const allTalks = talksRes.data || [];
    const allInspections = inspectionsRes.data || [];
    const allRisks = risksRes.data || [];

    const incidentsThisYear = allIncidents.filter(
      (i) => new Date(i.incident_date) >= new Date(thisYear)
    ).length;
    const openIncidents = allIncidents.filter((i) => i.status === 'Open').length;

    const avgCompliance =
      allInspections.length > 0
        ? Math.round(
            allInspections.reduce((sum, i) => sum + (i.score_percentage || 0), 0) /
              allInspections.length
          )
        : 0;

    const overdueActions = allActions.filter(
      (a) =>
        (a.status === 'Open' || a.status === 'In Progress') &&
        a.due_date &&
        new Date(a.due_date) < today
    ).length;

    const toolboxTalksThisYear = allTalks.filter(
      (t) => new Date(t.talk_date) >= new Date(thisYear)
    ).length;

    const drillsCompletedThisYear = allDrills.filter(
      (d) => d.status === 'Completed' && new Date(d.drill_date) >= new Date(thisYear)
    ).length;

    setStats({
      incidentsThisYear,
      openIncidents,
      inspectionCompliance: avgCompliance,
      overdueActions,
      toolboxTalksThisYear,
      drillsCompletedThisYear,
    });
    setIncidents(allIncidents);
    setActions(allActions);
    setDrills(allDrills);
    setTalks(allTalks);
    setRisks(allRisks);
    setLoading(false);
  }

  const incidentsByMonth = useMemo(() => {
    const today = new Date();
    const thisYear = today.getFullYear();
    const monthCounts: Record<number, { minor: number; moderate: number; serious: number; critical: number }> = {};

    for (let i = 0; i < 12; i++) {
      monthCounts[i] = { minor: 0, moderate: 0, serious: 0, critical: 0 };
    }

    incidents.forEach((inc) => {
      const incDate = new Date(inc.incident_date);
      if (incDate.getFullYear() === thisYear) {
        const month = incDate.getMonth();
        const severity = (inc.severity || '').toLowerCase();
        if (severity === 'minor') monthCounts[month].minor++;
        else if (severity === 'moderate') monthCounts[month].moderate++;
        else if (severity === 'serious') monthCounts[month].serious++;
        else if (severity === 'critical') monthCounts[month].critical++;
      }
    });

    return monthCounts;
  }, [incidents]);

  const riskMatrix = useMemo(() => {
    const matrix: Record<number, Record<number, number>> = {};
    for (let i = 1; i <= 5; i++) {
      matrix[i] = {};
      for (let j = 1; j <= 5; j++) {
        matrix[i][j] = 0;
      }
    }

    risks.forEach((risk) => {
      if (risk.status === 'Active' && risk.likelihood <= 5 && risk.consequence <= 5) {
        matrix[risk.likelihood][risk.consequence]++;
      }
    });

    return matrix;
  }, [risks]);

  const getRiskCellColor = (score: number) => {
    if (score <= 4) return 'bg-emerald-50 border-emerald-200';
    if (score <= 9) return 'bg-amber-50 border-amber-200';
    if (score <= 14) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  const getRiskCellTextColor = (score: number) => {
    if (score <= 4) return 'text-emerald-700';
    if (score <= 9) return 'text-amber-700';
    if (score <= 14) return 'text-orange-700';
    return 'text-red-700';
  };

  const statusColors = incidentStatusColors;

  const kpis = [
    {
      label: 'Incidents This Year',
      value: stats.incidentsThisYear,
      icon: AlertTriangle,
      color: 'bg-amber-500',
      light: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Open Incidents',
      value: stats.openIncidents,
      icon: AlertCircle,
      color: 'bg-red-500',
      light: 'bg-red-50 text-red-600',
    },
    {
      label: 'Inspection Compliance',
      value: `${stats.inspectionCompliance}%`,
      icon: ClipboardCheck,
      color: 'bg-emerald-500',
      light: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Overdue Actions',
      value: stats.overdueActions,
      icon: Clock,
      color: 'bg-red-500',
      light: 'bg-red-50 text-red-600',
    },
    {
      label: 'Toolbox Talks',
      value: stats.toolboxTalksThisYear,
      icon: Users,
      color: 'bg-sky-500',
      light: 'bg-sky-50 text-sky-600',
    },
    {
      label: 'Drills Completed',
      value: stats.drillsCompletedThisYear,
      icon: Siren,
      color: 'bg-teal-500',
      light: 'bg-teal-50 text-teal-600',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
      </div>
    );
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const maxMonthValue = Math.max(
    ...Object.values(incidentsByMonth).map(
      (m) => m.minor + m.moderate + m.serious + m.critical
    ),
    1
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <ShieldAlert size={28} className="text-amber-600" />
          <h1 className="text-2xl font-bold text-gray-900">SHEQ Dashboard</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">Health, Safety, Environment & Quality overview</p>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`inline-flex p-2 rounded-lg ${kpi.light} mb-3`}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
              <p className="text-xs text-gray-500 mt-1 leading-tight">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      {/* Incident Trend & Risk Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incident Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-4">Incident Trend (This Year)</h2>
          <div className="space-y-2">
            {months.map((month, idx) => {
              const data = incidentsByMonth[idx];
              const total = data.minor + data.moderate + data.serious + data.critical;
              const barWidth = total > 0 ? (total / maxMonthValue) * 100 : 2;

              return (
                <div key={month} className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-600 w-6">{month}</span>
                  <div className="flex-1 flex h-6 rounded bg-gray-100 overflow-hidden">
                    {data.minor > 0 && (
                      <div
                        className="bg-emerald-500"
                        style={{
                          width: `${(data.minor / (total || 1)) * barWidth}%`,
                        }}
                      />
                    )}
                    {data.moderate > 0 && (
                      <div
                        className="bg-amber-500"
                        style={{
                          width: `${(data.moderate / (total || 1)) * barWidth}%`,
                        }}
                      />
                    )}
                    {data.serious > 0 && (
                      <div
                        className="bg-orange-500"
                        style={{
                          width: `${(data.serious / (total || 1)) * barWidth}%`,
                        }}
                      />
                    )}
                    {data.critical > 0 && (
                      <div
                        className="bg-red-600"
                        style={{
                          width: `${(data.critical / (total || 1)) * barWidth}%`,
                        }}
                      />
                    )}
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-6 text-right">{total}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-gray-600">Minor</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-gray-600">Moderate</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-gray-600">Serious</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-600" />
              <span className="text-gray-600">Critical</span>
            </div>
          </div>
        </div>

        {/* Risk Matrix */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 sm:p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-4">Risk Matrix</h2>
          <div className="space-y-1 text-xs">
            <div className="flex">
              <div className="w-8 h-8" />
              {[1, 2, 3, 4, 5].map((c) => (
                <div key={`header-${c}`} className="flex-1 text-center font-semibold text-gray-600 text-[10px]">
                  {c}
                </div>
              ))}
            </div>
            {[5, 4, 3, 2, 1].map((likelihood) => (
              <div key={`row-${likelihood}`} className="flex gap-1">
                <div className="w-8 text-center font-semibold text-gray-600 text-[10px] flex items-center justify-center">
                  {likelihood}
                </div>
                {[1, 2, 3, 4, 5].map((consequence) => {
                  const count = riskMatrix[likelihood][consequence];
                  const score = likelihood * consequence;
                  return (
                    <div
                      key={`cell-${likelihood}-${consequence}`}
                      className={`flex-1 h-8 rounded border text-center flex items-center justify-center text-[10px] font-semibold ${getRiskCellColor(score)} ${getRiskCellTextColor(score)}`}
                    >
                      {count > 0 ? count : '-'}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-500 mt-3 text-center">Likelihood (Y) × Consequence (X)</p>
        </div>
      </div>

      {/* Recent Incidents & Overdue Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Incidents */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Recent Incidents</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {incidents.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No incidents recorded</p>
            )}
            {incidents.slice(0, 5).map((inc) => (
              <div key={inc.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{inc.incident_number}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(inc.incident_date).toLocaleDateString()} • {inc.location || 'N/A'}
                  </p>
                </div>
                <div className="ml-2 flex-shrink-0 flex gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded font-medium ${severityColors[inc.severity] || 'bg-gray-100 text-gray-600'}`}
                  >
                    {inc.severity || 'Unknown'}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded font-medium whitespace-nowrap ${statusColors[inc.status] || 'bg-gray-100 text-gray-600'}`}
                  >
                    {inc.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Corrective Actions Due */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Corrective Actions Due</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {actions.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No actions</p>
            )}
            {actions
              .filter((a) => a.status === 'Open' || a.status === 'In Progress')
              .slice(0, 5)
              .map((action) => (
                <div
                  key={action.id}
                  className="px-5 py-3 flex flex-col gap-2 hover:bg-gray-50 transition-colors text-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{action.action_number}</p>
                      <p className="text-xs text-gray-600 truncate">{action.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">{action.assigned_to || 'Unassigned'}</p>
                    <div className="flex gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded font-medium ${priorityColors[action.priority] || 'bg-gray-100 text-gray-600'}`}
                      >
                        {action.priority}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded font-medium whitespace-nowrap ${statusColors[action.status] || 'bg-gray-100 text-gray-600'}`}
                      >
                        {action.status}
                      </span>
                    </div>
                  </div>
                  {action.due_date && (
                    <p className="text-xs text-gray-500">
                      Due: {new Date(action.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Upcoming Drills & Recent Toolbox Talks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Upcoming Drills */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Upcoming/Recent Drills</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {drills.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No drills scheduled</p>
            )}
            {drills.slice(0, 5).map((drill) => (
              <div key={drill.id} className="px-5 py-3 flex items-start justify-between hover:bg-gray-50 transition-colors text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{drill.drill_type}</p>
                  <p className="text-xs text-gray-600">{drill.location || 'N/A'}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(drill.drill_date).toLocaleDateString()} • {drill.coordinator || 'N/A'}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded font-medium whitespace-nowrap flex-shrink-0 ml-2 ${drill.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}
                >
                  {drill.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Toolbox Talks */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Recent Toolbox Talks</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {talks.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No toolbox talks</p>
            )}
            {talks.slice(0, 5).map((talk) => (
              <div key={talk.id} className="px-5 py-3 flex items-start justify-between hover:bg-gray-50 transition-colors text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{talk.topic}</p>
                  <p className="text-xs text-gray-600">{talk.presented_by || 'N/A'}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(talk.talk_date).toLocaleDateString()} • {talk.attendee_count} attendees
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
