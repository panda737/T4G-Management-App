import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type StockCategory = {
  id: string;
  category_name: string;
  display_order: number;
  active: boolean;
  created_at: string;
};

export type StockItem = {
  id: string;
  stock_code: string;
  stock_item: string;
  category: string;
  description: string;
  unit_of_measure: string;
  current_quantity: number;
  minimum_stock_level: number;
  maximum_stock_level: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type StockMovement = {
  id: string;
  movement_date: string;
  stock_item_id: string | null;
  stock_code: string;
  movement_type: string;
  quantity: number;
  reference_number: string;
  supplier_client_department: string;
  captured_by: string;
  notes: string;
  created_at: string;
};

export type StockTakeSession = {
  id: string;
  stock_take_name: string;
  stock_take_date: string;
  conducted_by: string;
  status: string;
  notes: string;
  created_at: string;
  completed_at: string | null;
  approved_by: string;
  approved_at: string | null;
  corrections_applied_at: string | null;
};

export type StockTakeLineItem = {
  id: string;
  stock_take_session_id: string;
  stock_item_id: string | null;
  stock_code: string;
  stock_item: string;
  category: string;
  description: string;
  system_quantity: number;
  counted_quantity: number | null;
  variance: number;
  comment: string;
  created_at: string;
  updated_at: string;
};

export type MovementType =
  | 'Opening Stock'
  | 'Stock Received'
  | 'Stock Issued'
  | 'Stock Adjusted'
  | 'Stock Transferred'
  | 'Stock Damaged'
  | 'Stock Returned'
  | 'Stock Take Correction';

export type EmployeeHsRole = 'employee' | 'supervisor' | 'hs_staff';

export const HS_ROLE_LABELS: Record<EmployeeHsRole, string> = {
  employee: 'Employee',
  supervisor: 'Supervisor',
  hs_staff: 'H&S Staff',
};

export const HS_ROLE_COLORS: Record<EmployeeHsRole, string> = {
  employee: 'bg-gray-100 text-gray-700',
  supervisor: 'bg-sky-100 text-sky-700',
  hs_staff: 'bg-amber-100 text-amber-700',
};

export type Employee = {
  id: string;
  employee_number: string;
  surname: string;
  first_name: string;
  gender: string;
  date_of_birth: string | null;
  id_number: string;
  contact_number: string;
  email: string;
  address_line_1: string;
  address_line_2: string;
  address_line_3: string;
  postal_code: string;
  position: string;
  department: string;
  is_truck_handler: boolean;
  hs_role: EmployeeHsRole;
  status: string;
  date_joined: string | null;
  emergency_contact_name: string;
  emergency_contact_number: string;
  medical_fund: string;
  medical_fund_number: string;
  chronic_medication: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type ToolboxAttendee = {
  id: string;
  toolbox_id: string;
  employee_id: string;
  created_at: string;
};

export type TrainingSessionAttendee = {
  id: string;
  session_id: string;
  employee_id: string;
  created_at: string;
};

export type InspectionInspector = {
  id: string;
  inspection_id: string;
  employee_id: string;
  created_at: string;
};

export type TreatmentDailyLog = {
  id: string;
  date: string;
  day_shift_cycles: number;
  day_shift_treated_kg: number;
  afternoon_shift_cycles: number;
  afternoon_shift_treated_kg: number;
  night_shift_cycles: number;
  night_shift_treated_kg: number;
  total_cycles: number;
  total_treated_kg: number;
  chemical_litres: number;
  downtime_minutes: number;
  downtime_reason: string;
  supervisor_id: string | null;
  day_shift_supervisor_id: string | null;
  afternoon_shift_supervisor_id: string | null;
  night_shift_supervisor_id: string | null;
  notes: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type TreatmentWasteTransfer = {
  id: string;
  daily_log_id: string;
  transfer_type: string;
  waste_category: string;
  quantity_kg: number;
  destination: string;
  manifest_number: string;
  notes: string;
  created_at: string;
};

export type TreatmentMonthlySummary = {
  id: string;
  month: string;
  total_sent_for_landfill_kg: number;
  total_water_to_landfill_kg: number;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type SafetyIncident = {
  id: string;
  incident_number: string;
  incident_date: string;
  incident_time: string | null;
  incident_type: string;
  severity: string;
  location: string;
  description: string;
  immediate_action: string;
  reported_by: string;
  reported_by_id: string | null;
  injured_person: string;
  injured_person_id: string | null;
  injury_type: string;
  body_part: string;
  witnesses: string;
  root_cause: string;
  status: string;
  closed_date: string | null;
  created_at: string;
  updated_at: string;
};

export type SafetyInspection = {
  id: string;
  inspection_number: string;
  inspection_date: string;
  inspection_type: string;
  area: string;
  inspector: string;
  inspector_id: string | null;
  findings: string;
  items_checked: number;
  items_passed: number;
  score_percentage: number;
  status: string;
  next_inspection_date: string | null;
  created_at: string;
  updated_at: string;
};

export type SafetyRiskAssessment = {
  id: string;
  assessment_number: string;
  assessment_date: string;
  area: string;
  activity: string;
  hazard: string;
  risk_description: string;
  likelihood: number;
  consequence: number;
  risk_rating: number;
  risk_level: string;
  existing_controls: string;
  additional_controls: string;
  responsible_person: string;
  responsible_person_id: string | null;
  review_date: string | null;
  status: string;
  assessed_by: string;
  assessed_by_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SafetyCorrectiveAction = {
  id: string;
  action_number: string;
  source_type: string;
  source_reference: string;
  description: string;
  assigned_to: string;
  assigned_to_id: string | null;
  priority: string;
  due_date: string | null;
  completed_date: string | null;
  evidence: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type SafetyToolboxTalk = {
  id: string;
  talk_number: string;
  talk_date: string;
  topic: string;
  description: string;
  presented_by: string;
  presented_by_id: string | null;
  duration_minutes: number;
  attendee_count: number;
  attendees: string;
  location: string;
  follow_up_required: boolean;
  follow_up_notes: string;
  created_at: string;
  updated_at: string;
};

export type SafetyEmergencyDrill = {
  id: string;
  drill_number: string;
  drill_date: string;
  drill_type: string;
  location: string;
  coordinator: string;
  coordinator_id: string | null;
  participants_count: number;
  evacuation_time_seconds: number;
  target_time_seconds: number;
  passed: boolean;
  observations: string;
  improvements: string;
  next_drill_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type TrainingCourse = {
  id: string;
  course_code: string;
  course_name: string;
  category: string;
  description: string;
  duration_hours: number;
  validity_months: number;
  provider: string;
  is_mandatory: boolean;
  status: string;
  created_at: string;
  updated_at: string;
};

export type TrainingRecord = {
  id: string;
  employee_id: string | null;
  course_id: string | null;
  employee_name: string;
  course_name: string;
  completion_date: string | null;
  expiry_date: string | null;
  score: number | null;
  result: string;
  instructor: string;
  notes: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type TrainingSchedule = {
  id: string;
  course_id: string | null;
  course_name: string;
  scheduled_date: string;
  scheduled_time: string | null;
  location: string;
  instructor: string;
  instructor_id: string | null;
  capacity: number;
  enrolled_count: number;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type TrainingCertificate = {
  id: string;
  employee_id: string | null;
  course_id: string | null;
  employee_name: string;
  course_name: string;
  certificate_number: string;
  issue_date: string;
  expiry_date: string | null;
  issuing_body: string;
  document_reference: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type TrainingModule = {
  id: string;
  category: string;
  subcategory: string;
  title: string;
  description: string;
  content: string;
  pass_mark: number;
  estimated_minutes: number;
  is_mandatory: boolean;
  status: string;
  created_at: string;
  updated_at: string;
};

export type TrainingModuleQuestion = {
  id: string;
  module_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
  sort_order: number;
  created_at: string;
};

export type TrainingAssessment = {
  id: string;
  employee_id: string;
  employee_name: string;
  module_id: string;
  module_title: string;
  answers: Record<string, string>;
  score: number;
  result: string;
  time_taken_seconds: number;
  taken_at: string;
  created_at: string;
};

export type TrainingAttendance = {
  id: string;
  reference_type: string;
  reference_id: string;
  employee_id: string;
  employee_name: string;
  status: string;
  signature_data: string | null;
  signed_at: string | null;
  created_at: string;
};

export type ToolboxTalkTopic = {
  id: string;
  category: string;
  subcategory: string;
  title: string;
  talking_points: string;
  key_questions: string;
  has_quiz: boolean;
  linked_module_id: string | null;
  created_at: string;
};

export type AppRole = 'admin' | 'management' | 'stock_controller' | 'production' | 'operator' | 'viewer';

export type ShiftType = 'Day' | 'Afternoon' | 'Night';

export type ShiftReport = {
  id: string;
  shift_date: string;
  shift: ShiftType;
  supervisor_id: string | null;
  submitted_by: string;
  cycles: number;
  treated_kg: number;
  ruc_washed: number;
  lids_washed: number;
  wheelie_bins: number;
  has_downtime: boolean;
  downtime_reason: string;
  downtime_minutes: number;
  notes: string;
  signature_data: string | null;
  signed_at: string | null;
  created_at: string;
};

export type ShiftTeamMember = {
  id: string;
  shift_report_id: string;
  employee_id: string;
  created_at: string;
};

export type UserProfile = {
  id: string;
  auth_user_id: string;
  display_name: string;
  role: AppRole;
  is_active: boolean;
  employee_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrator',
  management: 'Management',
  stock_controller: 'Stock Controller',
  production: 'Production',
  operator: 'Operator',
  viewer: 'Viewer',
};

export const ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-orange-500/20 text-orange-300',
  management: 'bg-teal-500/20 text-teal-300',
  stock_controller: 'bg-emerald-500/20 text-emerald-300',
  production: 'bg-cyan-500/20 text-cyan-300',
  operator: 'bg-indigo-500/20 text-indigo-300',
  viewer: 'bg-gray-500/20 text-gray-400',
};

export type Equipment = {
  id: string;
  name: string;
  category: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  location: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Part = {
  id: string;
  equipment_id: string;
  name: string;
  part_number: string | null;
  supplier: string | null;
  qty_on_hand: number;
  qty_required: number;
  unit_cost: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type MaintenanceHistory = {
  id: string;
  equipment_id: string;
  service_date: string;
  type: string;
  technician: string | null;
  description: string;
  next_service_date: string | null;
  created_at: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 types
// ─────────────────────────────────────────────────────────────────────────────

export type DocumentCategory = 'SOP' | 'Policy' | 'Risk Assessment' | 'Licence & Permit' | 'Template';

export type AppDocument = {
  id: string;
  title: string;
  category: DocumentCategory;
  description: string;
  file_path: string;
  file_name: string;
  file_size_bytes: number;
  expiry_date: string | null;
  review_date?: string | null;
  is_active: boolean;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentVersion = {
  id: string;
  document_id: string;
  version_number: number;
  file_path: string;
  file_name: string;
  file_size_bytes: number;
  replaced_by: string | null;
  replaced_at: string;
};

export type LegalAppointmentType =
  | 'First Aider'
  | 'Fire Fighter'
  | 'Emergency Coordinator'
  | 'Safety Representative'
  | '16.1 Appointee'
  | '16.2 Appointee'
  | 'Risk Assessor'
  | 'Incident Investigator'
  | 'Other';

export type LegalAppointment = {
  id: string;
  employee_id: string;
  appointment_type: LegalAppointmentType;
  appointment_date: string;
  expiry_date: string | null;
  appointed_by: string;
  document_reference: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type WasteReceiptWasteType = 'Medical' | 'Sharps' | 'Pharmaceutical' | 'Anatomical' | 'Other';

export type WasteReceipt = {
  id: string;
  receipt_number: string;
  date: string;
  client_name: string;
  waste_type: WasteReceiptWasteType;
  quantity_kg: number;
  manifest_number: string;
  vehicle_registration: string;
  received_by: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

export function getStockStatus(item: StockItem): 'Out of Stock' | 'Low Stock' | 'In Stock' {
  if (item.current_quantity <= 0) return 'Out of Stock';
  if (item.minimum_stock_level > 0 && item.current_quantity < item.minimum_stock_level) return 'Low Stock';
  return 'In Stock';
}

export function getQuantityDelta(movementType: MovementType, quantity: number): number {
  switch (movementType) {
    case 'Stock Received':
    case 'Opening Stock':
    case 'Stock Returned':
      return Math.abs(quantity);
    case 'Stock Issued':
    case 'Stock Damaged':
      return -Math.abs(quantity);
    default:
      return quantity; // can be +/-
  }
}
