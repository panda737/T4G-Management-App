import React, { useEffect, useState } from 'react';
import {
  User, Award, AlertTriangle, ClipboardCheck,
  GraduationCap, CheckCircle, ShieldAlert, Loader,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Employee } from '../../lib/supabase';
import Modal from '../../components/Modal';
import { departmentForPosition } from './constants';

type ProfileTab = 'info' | 'training' | 'safety' | 'incidents';

interface ProfileActivity {
  trainingRecords: any[];
  trainingCertificates: any[];
  incidents: any[];
  inspections: any[];
  correctiveActions: any[];
  toolboxTalks: any[];
  drills: any[];
}

export default function EmployeeDetailModal({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('info');
  const [activity, setActivity] = useState<ProfileActivity | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);

  useEffect(() => {
    loadActivity();
  }, [employee.id]);

  async function loadActivity() {
    setLoadingActivity(true);
    const id = employee.id;
    const [
      trainingRecordsRes,
      trainingCertsRes,
      incidentsReportedRes,
      incidentsInjuredRes,
      inspectionsRes,
      correctiveActionsRes,
      toolboxTalksRes,
      drillsRes,
    ] = await Promise.all([
      supabase.from('training_records').select('*').eq('employee_id', id).order('completion_date', { ascending: false }),
      supabase.from('training_certificates').select('*').eq('employee_id', id).order('issue_date', { ascending: false }),
      supabase.from('safety_incidents').select('incident_number, incident_date, incident_type, severity, status').eq('reported_by_id', id).order('incident_date', { ascending: false }),
      supabase.from('safety_incidents').select('incident_number, incident_date, incident_type, severity, injury_type, body_part').eq('injured_person_id', id).order('incident_date', { ascending: false }),
      supabase.from('safety_inspections').select('inspection_number, inspection_date, inspection_type, area, score_percentage, status').eq('inspector_id', id).order('inspection_date', { ascending: false }),
      supabase.from('safety_corrective_actions').select('action_number, description, priority, due_date, status').eq('assigned_to_id', id).order('created_at', { ascending: false }),
      supabase.from('safety_toolbox_talks').select('talk_number, talk_date, topic, duration_minutes, attendee_count').eq('presented_by_id', id).order('talk_date', { ascending: false }),
      supabase.from('safety_emergency_drills').select('drill_number, drill_date, drill_type, participants_count, passed, status').eq('coordinator_id', id).order('drill_date', { ascending: false }),
    ]);

    const combined: any[] = [];
    (incidentsReportedRes.data || []).forEach(i => combined.push({ ...i, _role: 'Reported By' }));
    (incidentsInjuredRes.data || []).forEach(i => {
      if (!combined.find(c => c.incident_number === i.incident_number)) {
        combined.push({ ...i, _role: 'Injured Person' });
      }
    });

    setActivity({
      trainingRecords: trainingRecordsRes.data || [],
      trainingCertificates: trainingCertsRes.data || [],
      incidents: combined,
      inspections: inspectionsRes.data || [],
      correctiveActions: correctiveActionsRes.data || [],
      toolboxTalks: toolboxTalksRes.data || [],
      drills: drillsRes.data || [],
    });
    setLoadingActivity(false);
  }

  const fields: { label: string; value: string }[] = [
    { label: 'Employee Number', value: employee.employee_number },
    { label: 'Full Name', value: `${employee.first_name} ${employee.surname}` },
    { label: 'Position', value: employee.position },
    { label: 'Department', value: departmentForPosition(employee.position) },
    { label: 'Gender', value: employee.gender },
    { label: 'ID Number', value: employee.id_number || '--' },
    { label: 'Contact Number', value: employee.contact_number || '--' },
    { label: 'Email', value: employee.email || '--' },
    { label: 'Status', value: employee.status },
    { label: 'Address', value: [employee.address_line_1, employee.address_line_2, employee.address_line_3, employee.postal_code].filter(Boolean).join(', ') || '--' },
    { label: 'Medical Fund', value: employee.medical_fund || '--' },
    { label: 'Medical Fund Number', value: employee.medical_fund_number || '--' },
    { label: 'Chronic Medication', value: employee.chronic_medication || '--' },
    { label: 'Emergency Contact', value: employee.emergency_contact_name || '--' },
    { label: 'Emergency Phone', value: employee.emergency_contact_number || '--' },
    { label: 'Notes', value: employee.notes || '--' },
  ];

  const tabs: { id: ProfileTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'info', label: 'Profile', icon: <User size={14} /> },
    { id: 'training', label: 'Training', icon: <GraduationCap size={14} />, count: activity ? activity.trainingRecords.length + activity.trainingCertificates.length : undefined },
    { id: 'safety', label: 'Safety', icon: <ShieldAlert size={14} />, count: activity ? activity.inspections.length + activity.correctiveActions.length + activity.toolboxTalks.length + activity.drills.length : undefined },
    { id: 'incidents', label: 'Incidents', icon: <AlertTriangle size={14} />, count: activity ? activity.incidents.length : undefined },
  ];

  return (
    <Modal title={`${employee.first_name} ${employee.surname}`} onClose={onClose} size="xl">
      {/* Profile Header */}
      <div className="flex items-center gap-4 mb-5 pb-4 border-b border-gray-100">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-xl font-bold text-emerald-700 uppercase">
          {employee.first_name[0]}{employee.surname[0]}
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900">{employee.first_name} {employee.surname}</p>
          <p className="text-sm text-gray-500">{employee.position} · {employee.department}</p>
          <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
            employee.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {employee.status === 'active' ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 mb-5 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === tab.id ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loadingActivity && activeTab !== 'info' && (
        <div className="flex justify-center py-8">
          <Loader size={20} className="animate-spin text-gray-400" />
        </div>
      )}

      {/* Info Tab */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {fields.map(f => (
            <div key={f.label} className="py-2 border-b border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{f.label}</p>
              <p className="text-sm text-gray-800 font-medium">{f.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Training Tab */}
      {activeTab === 'training' && !loadingActivity && activity && (
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ClipboardCheck size={14} className="text-emerald-600" />
              <p className="text-sm font-semibold text-gray-700">Training Records ({activity.trainingRecords.length})</p>
            </div>
            {activity.trainingRecords.length === 0 ? (
              <p className="text-xs text-gray-400 pl-5">No training records</p>
            ) : (
              <div className="space-y-2">
                {activity.trainingRecords.map((r: any, i: number) => (
                  <div key={i} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{r.course_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {r.completion_date ? new Date(r.completion_date).toLocaleDateString() : 'No date'} · {r.instructor || 'No instructor'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {r.score != null && <span className="text-xs text-gray-500">{r.score}%</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.result === 'Pass' ? 'bg-emerald-100 text-emerald-700' :
                        r.result === 'Fail' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {r.result}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Award size={14} className="text-amber-600" />
              <p className="text-sm font-semibold text-gray-700">Certificates ({activity.trainingCertificates.length})</p>
            </div>
            {activity.trainingCertificates.length === 0 ? (
              <p className="text-xs text-gray-400 pl-5">No certificates</p>
            ) : (
              <div className="space-y-2">
                {activity.trainingCertificates.map((c: any, i: number) => (
                  <div key={i} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.course_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {c.certificate_number} · Issued {new Date(c.issue_date).toLocaleDateString()}
                        {c.expiry_date && ` · Expires ${new Date(c.expiry_date).toLocaleDateString()}`}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      c.status === 'Valid' ? 'bg-emerald-100 text-emerald-700' :
                      c.status === 'Expired' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Safety Tab */}
      {activeTab === 'safety' && !loadingActivity && activity && (
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ClipboardCheck size={14} className="text-amber-600" />
              <p className="text-sm font-semibold text-gray-700">Inspections Conducted ({activity.inspections.length})</p>
            </div>
            {activity.inspections.length === 0 ? (
              <p className="text-xs text-gray-400 pl-5">No inspections conducted</p>
            ) : (
              <div className="space-y-2">
                {activity.inspections.map((ins: any, i: number) => (
                  <div key={i} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{ins.inspection_number} · {ins.inspection_type}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{ins.area} · {new Date(ins.inspection_date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-500">{ins.score_percentage}%</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        ins.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                        ins.status === 'Requires Action' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
                      }`}>{ins.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={14} className="text-sky-600" />
              <p className="text-sm font-semibold text-gray-700">Corrective Actions Assigned ({activity.correctiveActions.length})</p>
            </div>
            {activity.correctiveActions.length === 0 ? (
              <p className="text-xs text-gray-400 pl-5">No corrective actions assigned</p>
            ) : (
              <div className="space-y-2">
                {activity.correctiveActions.map((ca: any, i: number) => (
                  <div key={i} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{ca.action_number}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{ca.description}</p>
                      {ca.due_date && <p className="text-xs text-gray-400 mt-0.5">Due {new Date(ca.due_date).toLocaleDateString()}</p>}
                    </div>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      ca.status === 'Completed' || ca.status === 'Verified' ? 'bg-emerald-100 text-emerald-700' :
                      ca.priority === 'Critical' || ca.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>{ca.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap size={14} className="text-gray-600" />
              <p className="text-sm font-semibold text-gray-700">Toolbox Talks Presented ({activity.toolboxTalks.length})</p>
            </div>
            {activity.toolboxTalks.length === 0 ? (
              <p className="text-xs text-gray-400 pl-5">No toolbox talks presented</p>
            ) : (
              <div className="space-y-2">
                {activity.toolboxTalks.map((t: any, i: number) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{t.topic}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{new Date(t.talk_date).toLocaleDateString()} · {t.duration_minutes} min · {t.attendee_count} attendees</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert size={14} className="text-red-600" />
              <p className="text-sm font-semibold text-gray-700">Emergency Drills Coordinated ({activity.drills.length})</p>
            </div>
            {activity.drills.length === 0 ? (
              <p className="text-xs text-gray-400 pl-5">No drills coordinated</p>
            ) : (
              <div className="space-y-2">
                {activity.drills.map((d: any, i: number) => (
                  <div key={i} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{d.drill_number} · {d.drill_type}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{new Date(d.drill_date).toLocaleDateString()} · {d.participants_count} participants</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      d.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>{d.passed ? 'Passed' : 'Failed'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Incidents Tab */}
      {activeTab === 'incidents' && !loadingActivity && activity && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-orange-600" />
            <p className="text-sm font-semibold text-gray-700">Incident History ({activity.incidents.length})</p>
          </div>
          {activity.incidents.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle size={32} className="text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No incidents on record</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activity.incidents.map((inc: any, i: number) => (
                <div key={i} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{inc.incident_number}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        inc._role === 'Injured Person' ? 'bg-red-100 text-red-700' : 'bg-sky-100 text-sky-700'
                      }`}>{inc._role}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(inc.incident_date).toLocaleDateString()} · {inc.incident_type}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                    inc.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                    inc.severity === 'Serious' ? 'bg-orange-100 text-orange-700' :
                    inc.severity === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>{inc.severity}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
