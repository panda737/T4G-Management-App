import { useEffect, useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  Loader,
} from 'lucide-react';
import { supabase, TrainingCourse, TrainingRecord, TrainingCertificate, TrainingSchedule } from '../lib/supabase';
import { usePageTitle } from '../lib/usePageTitle';

export default function TrainingDashboard() {
  usePageTitle('Training');
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [certificates, setCertificates] = useState<TrainingCertificate[]>([]);
  const [schedule, setSchedule] = useState<TrainingSchedule[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, recordsRes, certsRes, scheduleRes] = await Promise.all([
          supabase.from('training_courses').select('*').order('course_name'),
          supabase.from('training_records').select('*').order('completion_date', { ascending: false }),
          supabase.from('training_certificates').select('*').order('expiry_date'),
          supabase.from('training_schedule').select('*').order('scheduled_date'),
        ]);

        setCourses(coursesRes.data || []);
        setRecords(recordsRes.data || []);
        setCertificates(certsRes.data || []);
        setSchedule(scheduleRes.data || []);
      } catch (error) {
        console.error('Error fetching training data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const today = new Date();

  // KPI Calculations
  const activeCourses = courses.filter(c => c.status === 'Active').length;
  const staffTrained = new Set(records.map(r => r.employee_name)).size;
  const validCerts = certificates.filter(c => c.expiry_date && new Date(c.expiry_date) >= today);
  const complianceRate = validCerts.length > 0 ? Math.round((validCerts.length / certificates.length) * 100) : 0;

  const expiringCerts = certificates.filter(c => {
    if (!c.expiry_date) return false;
    const expiry = new Date(c.expiry_date);
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return c.status === 'Valid' && daysLeft <= 30 && daysLeft > 0;
  }).length;

  const expiredCerts = certificates.filter(c => c.status === 'Expired').length;
  const upcomingSessions = schedule.filter(s => s.status === 'Scheduled').length;

  // Chart data: completion by category
  const categoryStats = courses.reduce((acc: Record<string, number>, course) => {
    const count = records.filter(r => r.course_name === course.course_name && r.status === 'Completed').length;
    acc[course.category] = (acc[course.category] || 0) + count;
    return acc;
  }, {});

  const categories = ['Safety', 'Operational', 'Regulatory', 'Soft Skills'];
  const categoryColors = { Safety: 'bg-sky-500', Operational: 'bg-blue-500', Regulatory: 'bg-cyan-500', 'Soft Skills': 'bg-teal-500' };
  const maxCategoryCount = Math.max(...categories.map(c => categoryStats[c] || 0), 1);

  // Course status breakdown
  const activeCourseCount = courses.filter(c => c.status === 'Active').length;
  const inactiveCourseCount = courses.length - activeCourseCount;
  const mandatoryCourses = courses.filter(c => c.is_mandatory).length;
  const optionalCourses = courses.length - mandatoryCourses;

  // Expiring certificates (within 60 days)
  const expiringList = certificates
    .filter(c => c.expiry_date)
    .filter(c => {
      const expiry = new Date(c.expiry_date!);
      const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysLeft <= 60;
    })
    .sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime())
    .slice(0, 10);

  // Upcoming sessions
  const upcomingList = schedule
    .filter(s => s.status === 'Scheduled')
    .slice(0, 8);

  // Recent completions
  const recentCompletions = records
    .filter(r => r.status === 'Completed' || r.status === 'Fail')
    .slice(0, 8);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    if (status === 'Valid') return 'bg-emerald-100 text-emerald-800';
    if (status === 'Expiring') return 'bg-amber-100 text-amber-800';
    if (status === 'Expired') return 'bg-red-100 text-red-800';
    if (status === 'Completed') return 'bg-emerald-100 text-emerald-800';
    if (status === 'Pass') return 'bg-emerald-100 text-emerald-800';
    if (status === 'Fail') return 'bg-red-100 text-red-800';
    if (status === 'Scheduled') return 'bg-sky-100 text-sky-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <GraduationCap className="w-8 h-8 text-sky-600" />
            <h1 className="text-3xl font-bold text-gray-900">Training Dashboard</h1>
          </div>
          <p className="text-gray-600">Staff training compliance, certifications, and scheduling overview</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-5">
            <BookOpen className="w-6 h-6 text-sky-500 mb-2" />
            <p className="text-gray-600 text-sm font-medium">Active Courses</p>
            <p className="text-3xl font-bold text-gray-900">{activeCourses}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-5">
            <Users className="w-6 h-6 text-emerald-500 mb-2" />
            <p className="text-gray-600 text-sm font-medium">Staff Trained</p>
            <p className="text-3xl font-bold text-gray-900">{staffTrained}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-5">
            <CheckCircle className="w-6 h-6 text-emerald-500 mb-2" />
            <p className="text-gray-600 text-sm font-medium">Compliance Rate</p>
            <p className="text-3xl font-bold text-gray-900">{complianceRate}%</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-5">
            <Clock className="w-6 h-6 text-amber-500 mb-2" />
            <p className="text-gray-600 text-sm font-medium">Expiring Soon</p>
            <p className="text-3xl font-bold text-gray-900">{expiringCerts}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-5">
            <AlertTriangle className="w-6 h-6 text-red-500 mb-2" />
            <p className="text-gray-600 text-sm font-medium">Expired Certs</p>
            <p className="text-3xl font-bold text-gray-900">{expiredCerts}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-5">
            <Calendar className="w-6 h-6 text-sky-500 mb-2" />
            <p className="text-gray-600 text-sm font-medium">Upcoming Sessions</p>
            <p className="text-3xl font-bold text-gray-900">{upcomingSessions}</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Training Completion by Category */}
          <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Training Completion by Category</h2>
            <div className="space-y-4">
              {categories.map(cat => (
                <div key={cat}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{cat}</span>
                    <span className="text-sm font-bold text-gray-900">{categoryStats[cat] || 0}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${categoryColors[cat as keyof typeof categoryColors]}`}
                      style={{ width: `${((categoryStats[cat] || 0) / maxCategoryCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Course Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Course Status</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Active vs Inactive</p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-sky-100 rounded-lg p-2 text-center">
                    <p className="text-xl font-bold text-sky-700">{activeCourseCount}</p>
                    <p className="text-xs text-sky-600">Active</p>
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-lg p-2 text-center">
                    <p className="text-xl font-bold text-gray-700">{inactiveCourseCount}</p>
                    <p className="text-xs text-gray-600">Inactive</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Mandatory vs Optional</p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-blue-100 rounded-lg p-2 text-center">
                    <p className="text-xl font-bold text-blue-700">{mandatoryCourses}</p>
                    <p className="text-xs text-blue-600">Mandatory</p>
                  </div>
                  <div className="flex-1 bg-cyan-100 rounded-lg p-2 text-center">
                    <p className="text-xl font-bold text-cyan-700">{optionalCourses}</p>
                    <p className="text-xs text-cyan-600">Optional</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tables Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Expiring Certificates */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Expiring Certificates</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Expires</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Days</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {expiringList.map((cert, i) => {
                    const expiry = new Date(cert.expiry_date!);
                    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    const statusLabel = daysLeft < 0 ? 'Expired' : daysLeft <= 30 ? 'Expiring' : 'Valid';
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{cert.employee_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{cert.course_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{new Date(cert.expiry_date!).toLocaleDateString()}</td>
                        <td className={`px-6 py-4 text-sm font-semibold ${daysLeft < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {daysLeft}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(statusLabel)}`}>
                            {statusLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Upcoming Training Sessions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Upcoming Training Sessions</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Enrolled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {upcomingList.map((sess, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{sess.course_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{new Date(sess.scheduled_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{sess.location}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{sess.enrolled_count}/{sess.capacity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Completions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Recent Training Completions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Course</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Completion Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentCompletions.filter(r => r.completion_date).map((record, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{record.employee_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{record.course_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(record.completion_date!).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{record.score}%</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(record.result)}`}>
                        {record.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
