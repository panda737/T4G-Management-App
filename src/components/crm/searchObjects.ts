import type { ElementType } from 'react';
import {
  Building2, User, MapPin, Activity, Recycle, Users,
  Package, ShoppingCart, ArrowLeftRight, ClipboardCheck,
  AlertTriangle, ShieldAlert, ListChecks, MessageSquare, Siren,
  GraduationCap, ClipboardList, Award, Calendar, BookOpen,
  Cog, Wrench, History, FileText, ScrollText,
} from 'lucide-react';

// Registry that powers the truly-global search. Each entry says which table to
// query, which text columns to match, how to render the result, and where a click
// goes. Adding a searchable object = one entry here. Admin-only feature, so RLS +
// the admin role already bound what's readable; this just unifies discovery.

export type SearchGroup =
  | 'commercial' | 'people' | 'stock' | 'safety' | 'training' | 'maintenance' | 'documents';

export interface SearchObject {
  key: string;                 // unique, e.g. 'account', 'incident'
  label: string;               // dropdown group header, e.g. 'Accounts'
  group: SearchGroup;          // drives the scope selector
  icon: ElementType;
  color: string;               // tailwind text color for the icon
  table: string;               // real table name
  select: string;              // columns to fetch (must include id)
  columns: string[];           // text columns to ilike across
  title: (row: any) => string;
  subtitle: (row: any) => string;
  to: (row: any) => string;
}

// Scope selector groups, in display order.
export const SEARCH_GROUPS: { value: SearchGroup; label: string }[] = [
  { value: 'commercial', label: 'Commercial' },
  { value: 'people', label: 'People' },
  { value: 'stock', label: 'Stock' },
  { value: 'safety', label: 'Safety' },
  { value: 'training', label: 'Training' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'documents', label: 'Documents' },
];

const join = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(' · ');

export const SEARCH_OBJECTS: SearchObject[] = [
  // ── Commercial ──────────────────────────────────────────────────────────────
  {
    key: 'account', label: 'Accounts', group: 'commercial', icon: Building2, color: 'text-indigo-600',
    table: 'clients', select: 'id, client_name, client_code, contact_person, email',
    columns: ['client_name', 'client_code', 'contact_person', 'email'],
    title: r => r.client_name, subtitle: r => r.client_code || r.contact_person || 'Account',
    to: r => `/commercial/clients/${r.id}`,
  },
  {
    key: 'contact', label: 'Contacts', group: 'commercial', icon: User, color: 'text-emerald-600',
    table: 'crm_contacts', select: 'id, first_name, last_name, email, phone, job_title',
    columns: ['first_name', 'last_name', 'email', 'phone', 'job_title'],
    title: r => `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || r.email || 'Contact',
    subtitle: r => r.job_title || r.email || 'Contact',
    to: r => `/commercial/contacts/${r.id}`,
  },
  {
    key: 'site', label: 'Sites', group: 'commercial', icon: MapPin, color: 'text-amber-600',
    table: 'client_sites', select: 'id, generator_facility, generator_group, site_code, province',
    columns: ['generator_facility', 'generator_group', 'site_code', 'province'],
    title: r => r.generator_facility || r.site_code || 'Site',
    subtitle: r => join(r.site_code, r.province) || 'Site',
    to: r => `/commercial/sites/${r.id}`,
  },
  {
    key: 'activity', label: 'Activities', group: 'commercial', icon: Activity, color: 'text-violet-600',
    table: 'crm_activities', select: 'id, subject, type',
    columns: ['subject', 'body'],
    title: r => r.subject || '(no subject)', subtitle: r => r.type || 'Activity',
    to: () => '/commercial/activities',
  },
  {
    key: 'received_waste', label: 'Received waste', group: 'commercial', icon: Recycle, color: 'text-teal-600',
    table: 'received_waste_records', select: 'id, waste_manifest_tracking_number, client_name',
    columns: ['waste_manifest_tracking_number', 'client_name'],
    title: r => r.waste_manifest_tracking_number || '(no manifest)',
    subtitle: r => r.client_name || 'Received waste',
    to: () => '/commercial/imports',
  },

  // ── People ──────────────────────────────────────────────────────────────────
  {
    key: 'employee', label: 'Employees', group: 'people', icon: Users, color: 'text-sky-600',
    table: 'employees',
    select: 'id, employee_number, first_name, surname, id_number, position, department, email',
    columns: ['employee_number', 'first_name', 'surname', 'id_number', 'position', 'department', 'email'],
    title: r => `${r.first_name ?? ''} ${r.surname ?? ''}`.trim() || r.employee_number || 'Employee',
    subtitle: r => join(r.position, r.department) || r.employee_number || 'Employee',
    to: r => `/employees/${r.id}`,
  },

  // ── Stock ─────────────────────────────────────────────────────────────────--
  {
    key: 'stock_item', label: 'Stock items', group: 'stock', icon: Package, color: 'text-orange-600',
    table: 'stock_items', select: 'id, stock_code, stock_item, description, category',
    columns: ['stock_code', 'stock_item', 'description', 'category'],
    title: r => r.stock_item || r.stock_code || 'Item',
    subtitle: r => join(r.stock_code, r.category) || 'Stock item',
    to: () => '/stock/master-list',
  },
  {
    key: 'stock_order', label: 'Orders', group: 'stock', icon: ShoppingCart, color: 'text-emerald-600',
    table: 'stock_orders', select: 'id, order_number, client_name, customer_reference',
    columns: ['order_number', 'client_name', 'customer_reference'],
    title: r => r.order_number || 'Order', subtitle: r => r.client_name || 'Order',
    to: () => '/stock/orders',
  },
  {
    key: 'stock_movement', label: 'Movements', group: 'stock', icon: ArrowLeftRight, color: 'text-blue-600',
    table: 'stock_movements',
    select: 'id, reference_number, supplier_client_department, movement_group_label, stock_code',
    columns: ['reference_number', 'supplier_client_department', 'movement_group_label', 'stock_code'],
    title: r => r.reference_number || r.movement_group_label || '(movement)',
    subtitle: r => join(r.supplier_client_department, r.stock_code) || 'Movement',
    to: () => '/stock/movements',
  },
  {
    key: 'stock_take', label: 'Stock takes', group: 'stock', icon: ClipboardCheck, color: 'text-purple-600',
    table: 'stock_take_sessions', select: 'id, stock_take_name, conducted_by',
    columns: ['stock_take_name', 'conducted_by'],
    title: r => r.stock_take_name || 'Stock take', subtitle: r => r.conducted_by || 'Stock take',
    to: () => '/stock/stock-take',
  },

  // ── Safety ────────────────────────────────────────────────────────────────--
  {
    key: 'incident', label: 'Incidents', group: 'safety', icon: AlertTriangle, color: 'text-red-600',
    table: 'safety_incidents',
    select: 'id, incident_number, description, location, injured_person, incident_type',
    columns: ['incident_number', 'description', 'location', 'injured_person', 'incident_type'],
    title: r => r.incident_number || 'Incident',
    subtitle: r => join(r.incident_type, r.location) || r.description || 'Incident',
    to: () => '/safety/incidents',
  },
  {
    key: 'inspection', label: 'Inspections', group: 'safety', icon: ClipboardCheck, color: 'text-green-600',
    table: 'safety_inspections', select: 'id, inspection_number, area, inspector, inspection_type',
    columns: ['inspection_number', 'area', 'inspector', 'inspection_type'],
    title: r => r.inspection_number || 'Inspection',
    subtitle: r => join(r.area, r.inspection_type) || 'Inspection',
    to: () => '/safety/inspections',
  },
  {
    key: 'risk', label: 'Risk assessments', group: 'safety', icon: ShieldAlert, color: 'text-amber-600',
    table: 'safety_risk_assessments', select: 'id, assessment_number, area, activity, hazard',
    columns: ['assessment_number', 'area', 'activity', 'hazard'],
    title: r => r.assessment_number || 'Risk assessment',
    subtitle: r => join(r.area, r.hazard) || 'Risk assessment',
    to: () => '/safety/risk-assessments',
  },
  {
    key: 'corrective', label: 'Corrective actions', group: 'safety', icon: ListChecks, color: 'text-orange-600',
    table: 'safety_corrective_actions',
    select: 'id, action_number, description, assigned_to, source_reference',
    columns: ['action_number', 'description', 'assigned_to', 'source_reference'],
    title: r => r.action_number || 'Corrective action',
    subtitle: r => r.description || r.assigned_to || 'Corrective action',
    to: () => '/safety/corrective-actions',
  },
  {
    key: 'toolbox', label: 'Toolbox talks', group: 'safety', icon: MessageSquare, color: 'text-sky-600',
    table: 'safety_toolbox_talks', select: 'id, talk_number, topic, presented_by',
    columns: ['talk_number', 'topic', 'presented_by'],
    title: r => r.topic || r.talk_number || 'Toolbox talk',
    subtitle: r => join(r.talk_number, r.presented_by) || 'Toolbox talk',
    to: () => '/safety/toolbox-talks',
  },
  {
    key: 'drill', label: 'Emergency drills', group: 'safety', icon: Siren, color: 'text-rose-600',
    table: 'safety_emergency_drills', select: 'id, drill_number, drill_type, location, coordinator',
    columns: ['drill_number', 'drill_type', 'location', 'coordinator'],
    title: r => r.drill_number || 'Drill',
    subtitle: r => join(r.drill_type, r.location) || 'Emergency drill',
    to: () => '/safety/drills',
  },

  // ── Training ──────────────────────────────────────────────────────────────--
  {
    key: 'course', label: 'Courses', group: 'training', icon: GraduationCap, color: 'text-indigo-600',
    table: 'training_courses', select: 'id, course_code, course_name, provider',
    columns: ['course_code', 'course_name', 'provider'],
    title: r => r.course_name || r.course_code || 'Course',
    subtitle: r => join(r.course_code, r.provider) || 'Course',
    to: () => '/training/courses',
  },
  {
    key: 'training_record', label: 'Training records', group: 'training', icon: ClipboardList, color: 'text-emerald-600',
    table: 'training_records', select: 'id, employee_name, course_name, instructor',
    columns: ['employee_name', 'course_name', 'instructor'],
    title: r => r.employee_name || 'Record', subtitle: r => r.course_name || 'Training record',
    to: () => '/training/records',
  },
  {
    key: 'certificate', label: 'Certificates', group: 'training', icon: Award, color: 'text-amber-600',
    table: 'training_certificates',
    select: 'id, certificate_number, employee_name, course_name, issuing_body',
    columns: ['certificate_number', 'employee_name', 'course_name', 'issuing_body'],
    title: r => r.certificate_number || 'Certificate',
    subtitle: r => join(r.employee_name, r.course_name) || 'Certificate',
    to: () => '/training/certificates',
  },
  {
    key: 'schedule', label: 'Scheduled sessions', group: 'training', icon: Calendar, color: 'text-sky-600',
    table: 'training_schedule', select: 'id, course_name, instructor, location',
    columns: ['course_name', 'instructor', 'location'],
    title: r => r.course_name || 'Session', subtitle: r => join(r.location, r.instructor) || 'Session',
    to: () => '/training/schedule',
  },
  {
    key: 'module', label: 'Training modules', group: 'training', icon: BookOpen, color: 'text-violet-600',
    table: 'training_modules', select: 'id, title, category, subcategory',
    columns: ['title', 'category', 'subcategory'],
    title: r => r.title || 'Module', subtitle: r => join(r.category, r.subcategory) || 'Module',
    to: () => '/training/modules',
  },

  // ── Maintenance ─────────────────────────────────────────────────────────────
  {
    key: 'equipment', label: 'Equipment', group: 'maintenance', icon: Cog, color: 'text-slate-600',
    table: 'equipment', select: 'id, name, serial_number, model, manufacturer, location',
    columns: ['name', 'serial_number', 'model', 'manufacturer', 'location'],
    title: r => r.name || 'Equipment',
    subtitle: r => join(r.model, r.serial_number) || r.location || 'Equipment',
    to: () => '/maintenance/assets',
  },
  {
    key: 'part', label: 'Spare parts', group: 'maintenance', icon: Wrench, color: 'text-orange-600',
    table: 'parts', select: 'id, name, part_number, supplier',
    columns: ['name', 'part_number', 'supplier'],
    title: r => r.name || 'Part', subtitle: r => join(r.part_number, r.supplier) || 'Spare part',
    to: () => '/maintenance/parts',
  },
  {
    key: 'service', label: 'Service history', group: 'maintenance', icon: History, color: 'text-cyan-600',
    table: 'maintenance_history', select: 'id, description, technician, type',
    columns: ['description', 'technician', 'type'],
    title: r => r.description || 'Service', subtitle: r => join(r.type, r.technician) || 'Service record',
    to: () => '/maintenance/work-orders',
  },

  // ── Documents & compliance ──────────────────────────────────────────────────
  {
    key: 'document', label: 'Documents', group: 'documents', icon: FileText, color: 'text-blue-600',
    table: 'documents', select: 'id, title, file_name, description',
    columns: ['title', 'file_name', 'description'],
    title: r => r.title || r.file_name || 'Document', subtitle: r => r.file_name || 'Document',
    to: () => '/documents',
  },
  {
    key: 'legal_appointment', label: 'Legal appointments', group: 'documents', icon: ScrollText, color: 'text-amber-700',
    table: 'legal_appointments', select: 'id, appointment_type, appointed_by, document_reference',
    columns: ['appointment_type', 'appointed_by', 'document_reference'],
    title: r => r.appointment_type || 'Appointment',
    subtitle: r => join(r.appointed_by, r.document_reference) || 'Legal appointment',
    to: () => '/employees/appointments',
  },
];
