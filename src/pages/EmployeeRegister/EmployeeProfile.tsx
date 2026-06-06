import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, MapPin, AlertTriangle, ClipboardCheck, Users, GraduationCap, Award, Shield, ShieldAlert, CheckCircle, Calendar, CreditCard as Edit, Loader, Building, CreditCard, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Employee } from '../../lib/supabase';
import { HS_ROLE_LABELS, HS_ROLE_COLORS } from '../../lib/supabase';
import { useUser } from '../../lib/UserContext';
import EmployeeFormModal from './EmployeeFormModal';

type ProfileTab = 'incidents' | 'inspections' | 'toolbox' | 'training';

interface ActivityData {
  incidentsReported: any[];
  incidentsInjured: any[];
  inspections: any[];
  toolboxPresented: any[];
  toolboxAttended: any[];
  trainingRecords: any[];
  trainingCertificates: any[];
  trainingAttendance: any[];
}

const EMPTY_ACTIVITY: ActivityData = {
  incidentsReported: [],
  incidentsInjured: [],
  inspections: [],
  toolboxPresented: [],
  toolboxAttended: [],
  trainingRecords: [],
  trainingCertificates: [],
  trainingAttendance: [],
};

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    Critical: 'bg-red-100 text-red-700',
    Serious: 'bg-orange-100 text-orange-700',
    Moderate: 'bg-amber-100 text-amber-700',
    Minor: 'bg-emerald-100 text-emerald-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[severity] ?? 'bg-gray-100 text-gray-600'}`}>
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Open: 'bg-red-100 text-red-700',
    'Under Investigation': 'bg-amber-100 text-amber-700',
    'Corrective Action': 'bg-sky-100 text-sky-700',
    Closed: 'bg-emerald-100 text-emerald-700',
    Completed: 'bg-emerald-100 text-emerald-700',
    Scheduled: 'bg-sky-100 text-sky-700',
    'Requires Action': 'bg-amber-100 text-amber-700',
    Pass: 'bg-emerald-100 text-emerald-700',
    Fail: 'bg-red-100 text-red-700',
    Valid: 'bg-emerald-100 text-emerald-700',
    Expired: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function fmt(dateStr: string | null | undefined) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function EmployeeProfile() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, isManagement } = useUser();
  const canEdit = isAdmin || isManagement;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [activity, setActivity] = useState<ActivityData>(EMPTY_ACTIVITY);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>('incidents');
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    if (id) {
      loadEmployee(id);
      loadActivity(id);
    }
  }, [id]);

  async function loadEmployee(empId: string) {
    setLoading(true);
    const { data } = await supabase.from('employees').select('*').eq('id', empId).maybeSingle();
    setEmployee(data);
    setLoading(false);
  }

  async function loadActivity(empId: string) {
    setActivityLoading(true);
    const [
      incRepRes,
      incInjRes,
      insRes,
      tbtPresentRes,
      tbtAttendRes,
      trRecRes,
      trCertRes,
      trAttRes,
    ] = await Promise.all([
      supabase
        .from('safety_incidents')
        .select('id, incident_number, incident_date, incident_type, severity, status, location')
        .eq('reported_by_id', empId)
        .order('incident_date', { ascending: false }),
      supabase
        .from('safety_incidents')
        .select('id, incident_number, incident_date, incident_type, severity, injury_type, body_part, status')
        .eq('injured_person_id', empId)
        .order('incident_date', { ascending: false }),
      supabase
        .from('safety_inspections')
        .select('id, inspection_number, inspection_date, inspection_type, area, score_percentage, status')
        .eq('inspector_id', empId)
        .order('inspection_date', { ascending: false }),
      supabase
        .from('safety_toolbox_talks')
        .select('id, talk_number, talk_date, topic, location, duration_minutes, attendee_count')
        .eq('presented_by_id', empId)
        .order('talk_date', { ascending: false }),
      supabase
        .from('toolbox_attendees')
        .select('toolbox_id, safety_toolbox_talks(id, talk_number, talk_date, topic, location, presented_by, duration_minutes)')
        .eq('employee_id', empId),
      supabase
        .from('training_records')
        .select('id, course_name, completion_date, expiry_date, score, result, instructor, status')
        .eq('employee_id', empId)
        .order('completion_date', { ascending: false }),
      supabase
        .from('training_certificates')
        .select('id, course_name, certificate_number, issue_date, expiry_date, issuing_body, status')
        .eq('employee_id', empId)
        .order('issue_date', { ascending: false }),
      supabase
        .from('training_session_attendees')
        .select('session_id, training_schedule(id, course_name, scheduled_date, location, instructor, status)')
        .eq('employee_id', empId),
    ]);

    setActivity({
      incidentsReported: incRepRes.data || [],
      incidentsInjured: incInjRes.data || [],
      inspections: insRes.data || [],
      toolboxPresented: tbtPresentRes.data || [],
      toolboxAttended: (tbtAttendRes.data || []).map((r: any) => r.safety_toolbox_talks).filter(Boolean),
      trainingRecords: trRecRes.data || [],
      trainingCertificates: trCertRes.data || [],
      trainingAttendance: (trAttRes.data || []).map((r: any) => r.training_schedule).filter(Boolean),
    });
    setActivityLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader size={24} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-20">
        <User size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Employee not found.</p>
        <Link to="/employees" className="mt-4 inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
          <ArrowLeft size={14} /> Back to Employee Register
        </Link>
      </div>
    );
  }

  const incidentTotal = activity.incidentsReported.length + activity.incidentsInjured.length;
  const toolboxTotal = activity.toolboxPresented.length + activity.toolboxAttended.length;
  const trainingTotal = activity.trainingRecords.length + activity.trainingAttendance.length;

  const statCards = [
    { icon: AlertTriangle, label: 'Incidents', value: incidentTotal, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', tab: 'incidents' as ProfileTab },
    { icon: ClipboardCheck, label: 'Inspections', value: activity.inspections.length, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-200', tab: 'inspections' as ProfileTab },
    { icon: Users, label: 'Toolbox Talks', value: toolboxTotal, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', tab: 'toolbox' as ProfileTab },
    { icon: GraduationCap, label: 'Training', value: trainingTotal, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', tab: 'training' as ProfileTab },
  ];

  const tabs: { id: ProfileTab; label: string; count: number; icon: React.ReactNode }[] = [
    { id: 'incidents', label: 'H&S Incidents', count: incidentTotal, icon: <AlertTriangle size={14} /> },
    { id: 'inspections', label: 'Inspections', count: activity.inspections.length, icon: <ClipboardCheck size={14} /> },
    { id: 'toolbox', label: 'Toolbox Talks', count: toolboxTotal, icon: <Users size={14} /> },
    { id: 'training', label: 'Training', count: trainingTotal, icon: <GraduationCap size={14} /> },
  ];

  const hsRole = employee.hs_role ?? 'employee';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Back link */}
      <Link
        to="/employees"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-emerald-600 transition-colors font-medium"
      >
        <ArrowLeft size={14} />
        Employee Register
      </Link>

      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-400" />
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0 text-2xl font-bold text-emerald-700 uppercase shadow-sm">
              {employee.first_name[0]}{employee.surname[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {employee.first_name} {employee.surname}
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">{employee.position} · {employee.department}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${HS_ROLE_COLORS[hsRole]}`}>
                      {HS_ROLE_LABELS[hsRole]}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      employee.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {employee.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                    {employee.is_truck_handler && (
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-blue-100 text-blue-700">
                        Truck Handler
                      </span>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <button
                    onClick={() => setShowEdit(true)}
                    className="flex items-center gap-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex-shrink-0"
                  >
                    <Edit size={14} /> Edit Profile
                  </button>
                )}
              </div>

              {/* Contact info row */}
              <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4">
                {employee.employee_number && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <CreditCard size={13} className="text-gray-400" />
                    <span>{employee.employee_number}</span>
                  </div>
                )}
                {employee.contact_number && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Phone size={13} className="text-gray-400" />
                    <span>{employee.contact_number}</span>
                  </div>
                )}
                {employee.email && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Mail size={13} className="text-gray-400" />
                    <span>{employee.email}</span>
                  </div>
                )}
                {employee.date_joined && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar size={13} className="text-gray-400" />
                    <span>Joined {fmt(employee.date_joined)}</span>
                  </div>
                )}
                {(employee.address_line_1) && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <MapPin size={13} className="text-gray-400" />
                    <span>{[employee.address_line_1, employee.address_line_2, employee.address_line_3].filter(Boolean).join(', ')}{employee.postal_code ? `, ${employee.postal_code}` : ''}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <button
              key={card.tab}
              onClick={() => setActiveTab(card.tab)}
              className={`bg-white rounded-xl border p-4 text-left transition-all hover:shadow-md ${
                activeTab === card.tab ? `${card.border} shadow-md ring-2 ring-offset-1 ring-emerald-300` : 'border-gray-200'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                <Icon size={20} className={card.color} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
            </button>
          );
        })}
      </div>

      {/* Tabbed Activity History */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex gap-0 border-b border-gray-200 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === tab.id ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="p-5">
          {activityLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader size={20} className="animate-spin text-emerald-500" />
            </div>
          ) : (
            <>
              {/* H&S Incidents Tab */}
              {activeTab === 'incidents' && (
                <div className="space-y-5">
                  <Section
                    icon={<Shield size={14} className="text-sky-600" />}
                    title="Incidents Reported"
                    count={activity.incidentsReported.length}
                  >
                    {activity.incidentsReported.length === 0 ? (
                      <EmptyState message="No incidents reported" />
                    ) : (
                      activity.incidentsReported.map((inc: any) => (
                        <div key={inc.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-gray-900">{inc.incident_number}</span>
                              <span className="text-xs bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-medium">Reporter</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{fmt(inc.incident_date)} · {inc.incident_type}{inc.location ? ` · ${inc.location}` : ''}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <SeverityBadge severity={inc.severity} />
                            <StatusBadge status={inc.status} />
                          </div>
                        </div>
                      ))
                    )}
                  </Section>

                  <Section
                    icon={<AlertTriangle size={14} className="text-red-600" />}
                    title="Incidents as Injured Person"
                    count={activity.incidentsInjured.length}
                  >
                    {activity.incidentsInjured.length === 0 ? (
                      <EmptyState message="No injuries on record" icon="check" />
                    ) : (
                      activity.incidentsInjured.map((inc: any) => (
                        <div key={inc.id} className="flex items-start justify-between p-3 bg-red-50/50 rounded-lg border border-red-100 hover:border-red-200 transition-colors">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-gray-900">{inc.incident_number}</span>
                              <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">Injured</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{fmt(inc.incident_date)} · {inc.incident_type}</p>
                            {inc.injury_type && <p className="text-xs text-gray-400 mt-0.5">{inc.injury_type}{inc.body_part ? ` — ${inc.body_part}` : ''}</p>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <SeverityBadge severity={inc.severity} />
                          </div>
                        </div>
                      ))
                    )}
                  </Section>
                </div>
              )}

              {/* Inspections Tab */}
              {activeTab === 'inspections' && (
                <Section
                  icon={<ClipboardCheck size={14} className="text-sky-600" />}
                  title="Inspections Conducted"
                  count={activity.inspections.length}
                >
                  {activity.inspections.length === 0 ? (
                    <EmptyState message="No inspections conducted" />
                  ) : (
                    activity.inspections.map((ins: any) => (
                      <div key={ins.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{ins.inspection_number} · {ins.inspection_type}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{fmt(ins.inspection_date)} · {ins.area}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {ins.score_percentage !== null && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              ins.score_percentage >= 80 ? 'bg-emerald-100 text-emerald-700' :
                              ins.score_percentage >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {ins.score_percentage}%
                            </span>
                          )}
                          <StatusBadge status={ins.status} />
                        </div>
                      </div>
                    ))
                  )}
                </Section>
              )}

              {/* Toolbox Talks Tab */}
              {activeTab === 'toolbox' && (
                <div className="space-y-5">
                  <Section
                    icon={<Activity size={14} className="text-amber-600" />}
                    title="Talks Presented"
                    count={activity.toolboxPresented.length}
                  >
                    {activity.toolboxPresented.length === 0 ? (
                      <EmptyState message="No talks presented" />
                    ) : (
                      activity.toolboxPresented.map((t: any) => (
                        <div key={t.id} className="p-3 bg-amber-50/50 rounded-lg border border-amber-100 hover:border-amber-200 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{t.topic}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{fmt(t.talk_date)} · {t.duration_minutes} min{t.location ? ` · ${t.location}` : ''}</p>
                            </div>
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Presenter</span>
                          </div>
                        </div>
                      ))
                    )}
                  </Section>

                  <Section
                    icon={<Users size={14} className="text-gray-600" />}
                    title="Talks Attended"
                    count={activity.toolboxAttended.length}
                  >
                    {activity.toolboxAttended.length === 0 ? (
                      <EmptyState message="No talks attended" />
                    ) : (
                      activity.toolboxAttended.map((t: any) => (
                        <div key={t.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{t.topic}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {fmt(t.talk_date)}{t.presented_by ? ` · Presenter: ${t.presented_by}` : ''}{t.location ? ` · ${t.location}` : ''}
                              </p>
                            </div>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Attendee</span>
                          </div>
                        </div>
                      ))
                    )}
                  </Section>
                </div>
              )}

              {/* Training Tab */}
              {activeTab === 'training' && (
                <div className="space-y-5">
                  <Section
                    icon={<Award size={14} className="text-emerald-600" />}
                    title="Training Records"
                    count={activity.trainingRecords.length}
                  >
                    {activity.trainingRecords.length === 0 ? (
                      <EmptyState message="No training records" />
                    ) : (
                      activity.trainingRecords.map((r: any) => (
                        <div key={r.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{r.course_name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {fmt(r.completion_date)}{r.instructor ? ` · ${r.instructor}` : ''}
                              {r.expiry_date ? ` · Expires ${fmt(r.expiry_date)}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {r.score != null && (
                              <span className="text-xs text-gray-500 font-medium">{r.score}%</span>
                            )}
                            <StatusBadge status={r.result} />
                          </div>
                        </div>
                      ))
                    )}
                  </Section>

                  <Section
                    icon={<GraduationCap size={14} className="text-sky-600" />}
                    title="Training Sessions Attended"
                    count={activity.trainingAttendance.length}
                  >
                    {activity.trainingAttendance.length === 0 ? (
                      <EmptyState message="No training sessions attended" />
                    ) : (
                      activity.trainingAttendance.map((s: any) => (
                        <div key={s.id} className="flex items-start justify-between p-3 bg-sky-50/50 rounded-lg border border-sky-100 hover:border-sky-200 transition-colors">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{s.course_name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {fmt(s.scheduled_date)}{s.instructor ? ` · ${s.instructor}` : ''}{s.location ? ` · ${s.location}` : ''}
                            </p>
                          </div>
                          <StatusBadge status={s.status} />
                        </div>
                      ))
                    )}
                  </Section>

                  {activity.trainingCertificates.length > 0 && (
                    <Section
                      icon={<Award size={14} className="text-amber-600" />}
                      title="Certificates"
                      count={activity.trainingCertificates.length}
                    >
                      {activity.trainingCertificates.map((c: any) => (
                        <div key={c.id} className="flex items-start justify-between p-3 bg-amber-50/50 rounded-lg border border-amber-100 hover:border-amber-200 transition-colors">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{c.course_name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {c.certificate_number} · Issued {fmt(c.issue_date)}
                              {c.expiry_date ? ` · Expires ${fmt(c.expiry_date)}` : ''}
                            </p>
                            {c.issuing_body && <p className="text-xs text-gray-400 mt-0.5">{c.issuing_body}</p>}
                          </div>
                          <StatusBadge status={c.status} />
                        </div>
                      ))}
                    </Section>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Additional info cards row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Personal Info */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <User size={15} className="text-emerald-600" />
            <h3 className="text-sm font-semibold text-gray-700">Personal Information</h3>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <InfoRow label="Gender" value={employee.gender} />
            <InfoRow label="ID Number" value={employee.id_number} />
            <InfoRow label="Date of Birth" value={fmt(employee.date_of_birth)} />
            <InfoRow label="Medical Fund" value={employee.medical_fund} />
            <InfoRow label="Chronic Medication" value={employee.chronic_medication} />
          </dl>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert size={15} className="text-red-500" />
            <h3 className="text-sm font-semibold text-gray-700">Emergency Contact</h3>
          </div>
          {employee.emergency_contact_name || employee.emergency_contact_number ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <InfoRow label="Contact Name" value={employee.emergency_contact_name} />
              <InfoRow label="Contact Number" value={employee.emergency_contact_number} />
            </dl>
          ) : (
            <p className="text-sm text-gray-400">No emergency contact on record.</p>
          )}

          {employee.notes && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Building size={13} className="text-gray-400" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</p>
              </div>
              <p className="text-sm text-gray-600">{employee.notes}</p>
            </div>
          )}
        </div>
      </div>

      {showEdit && (
        <EmployeeFormModal
          employee={employee}
          onClose={() => setShowEdit(false)}
          onSave={async () => {
            setShowEdit(false);
            await loadEmployee(id!);
          }}
        />
      )}
    </div>
  );
}

function Section({ icon, title, count, children }: {
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function EmptyState({ message, icon = 'empty' }: { message: string; icon?: 'empty' | 'check' }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-gray-400">
      {icon === 'check'
        ? <CheckCircle size={28} className="text-emerald-300" />
        : <Activity size={28} className="text-gray-200" />
      }
      <p className="text-sm">{message}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-800 font-medium">{value || '--'}</dd>
    </div>
  );
}
