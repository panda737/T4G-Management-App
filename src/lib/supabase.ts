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
  movement_group_id: string | null;
  movement_group_label: string;
  created_by_user_id: string | null;
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
  correction_movement_group_id: string | null;
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
  | 'Stock Take Correction'
  | 'Customer Delivery';

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
  created_by?: string | null;
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

export type ShiftDowntime = { minutes: number; reason: string };

export type TreatmentDailyLog = {
  id: string;
  date: string;
  day_shift_cycles: number;
  day_shift_treated_kg: number;
  afternoon_shift_cycles: number;
  afternoon_shift_treated_kg: number;
  night_shift_cycles: number;
  night_shift_treated_kg: number;
  day_shift_ruc_washed: number;
  day_shift_lids_washed: number;
  day_shift_wheelie_bins: number;
  afternoon_shift_ruc_washed: number;
  afternoon_shift_lids_washed: number;
  afternoon_shift_wheelie_bins: number;
  night_shift_ruc_washed: number;
  night_shift_lids_washed: number;
  night_shift_wheelie_bins: number;
  total_cycles: number;
  total_treated_kg: number;
  chemical_litres: number;
  downtime_minutes: number;
  downtime_reason: string;
  day_shift_downtimes: ShiftDowntime[];
  afternoon_shift_downtimes: ShiftDowntime[];
  night_shift_downtimes: ShiftDowntime[];
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
  source_incident_id: string | null;
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
  attachment_path: string;
  attachment_name: string;
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

// Safe view — no correct_answer or explanation. Use for quiz display.
export type SafeQuestion = Omit<TrainingModuleQuestion, 'correct_answer' | 'explanation'>;

// Safe view — no PII. Use for dropdowns and cross-module references.
export type EmployeeDirectorySafe = Pick<Employee,
  'id' | 'employee_number' | 'first_name' | 'surname' |
  'position' | 'department' | 'hs_role' | 'is_truck_handler' | 'status'
>;

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

export type AppRole = 'admin' | 'management' | 'stock_controller' | 'production' | 'operator' | 'viewer' | 'customer';

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
  client_id: string | null;
  site_id: string | null;
  portal_access_mode: 'all_sites' | 'selected_sites';
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
  customer: 'Customer (Portal)',
};

export const ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-orange-500/20 text-orange-300',
  management: 'bg-teal-500/20 text-teal-300',
  stock_controller: 'bg-emerald-500/20 text-emerald-300',
  production: 'bg-cyan-500/20 text-cyan-300',
  operator: 'bg-indigo-500/20 text-indigo-300',
  viewer: 'bg-gray-500/20 text-gray-400',
  customer: 'bg-blue-500/20 text-blue-300',
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

export type DocumentCategory = 'SOP' | 'Policy' | 'Risk Assessment' | 'Licence & Permit' | 'Template' | 'Company';

// Categories visible only to admins (DB-enforced via RLS in 20260613000003).
export const ADMIN_ONLY_DOCUMENT_CATEGORIES: DocumentCategory[] = ['Company'];

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

export type MedicalRecordType = 'Vaccination' | 'Medical Exam' | 'Fitness Certificate' | 'Other';

export type EmployeeMedicalRecord = {
  id: string;
  employee_id: string;
  record_type: MedicalRecordType;
  name: string;
  date_administered: string | null;
  expiry_date: string | null;
  provider: string;
  notes: string;
  file_path: string;
  file_name: string;
  file_size_bytes: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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

// ─────────────────────────────────────────────────────────────────────────────
// Customer Orders & Delivery Notes
// ─────────────────────────────────────────────────────────────────────────────

export type Client = {
  id: string;
  client_code: string;
  client_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address_line_1: string;
  address_line_2: string;
  address_line_3: string;
  postal_code: string;
  notes: string;
  active: boolean;
  // CRM account fields (Phase 1)
  account_owner: string | null;
  industry: string;
  account_status: 'prospect' | 'active' | 'inactive';
  website: string;
  created_at: string;
  updated_at: string;
};

export type OrderSource = 'OrderCo' | 'Email' | 'Phone' | 'Other';

export type StockOrderStatus =
  | 'Open'
  | 'Dispatched'
  | 'Awaiting Confirmation'
  | 'Completed'
  | 'Cancelled';

export type StockOrder = {
  id: string;
  order_number: string;
  client_id: string;
  client_name: string;
  site_id: string | null;
  site_name: string;
  order_date: string;
  source: OrderSource;
  customer_reference: string;
  status: StockOrderStatus;
  notes: string;
  printed_at: string | null;
  dispatched_at: string | null;
  signed_note_path: string | null;
  signed_note_name: string;
  signed_note_size_bytes: number | null;
  signed_note_uploaded_by: string | null;
  signed_note_uploaded_at: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  confirmation_note: string;
  movement_group_id: string | null;
  cancelled_reason: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type StockOrderItem = {
  id: string;
  order_id: string;
  stock_item_id: string | null;
  stock_code: string;
  stock_item: string;
  description: string;
  unit_of_measure: string;
  qty_ordered: number;
  qty_delivered: number | null;
  variance_note: string;
  line_no: number;
  created_at: string;
};

export const ORDER_STATUS_COLORS: Record<StockOrderStatus, string> = {
  'Open': 'bg-blue-50 text-blue-700 border border-blue-200',
  'Dispatched': 'bg-amber-50 text-amber-700 border border-amber-200',
  'Awaiting Confirmation': 'bg-violet-50 text-violet-700 border border-violet-200',
  'Completed': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'Cancelled': 'bg-gray-100 text-gray-500 border border-gray-200',
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
    case 'Customer Delivery':
      return -Math.abs(quantity);
    default:
      return quantity; // can be +/-
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Stock Received (inbound) — receipt header + line items
// ─────────────────────────────────────────────────────────────────────────────

export type StockReceipt = {
  id: string;
  receipt_number: string;
  supplier: string;
  supplier_ref: string;
  received_date: string;
  notes: string;
  movement_group_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type StockReceiptItem = {
  id: string;
  receipt_id: string;
  stock_item_id: string | null;
  stock_code: string;
  stock_item: string;
  description: string;
  unit_of_measure: string;
  qty_received: number;
  line_no: number;
  created_at: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Commercial — Received Waste (Phase 1)
// ─────────────────────────────────────────────────────────────────────────────

export type WasteCategory = {
  id: string;
  waste_category_name: string;
  hcrw_super_category: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ContainerType = {
  id: string;
  container_type_name: string;
  reusable_boolean: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ClientSite = {
  id: string;
  client_id: string;
  generator_group: string;
  generator_facility: string;
  site_code: string;
  province: string;
  address_line_1: string;
  address_line_2: string;
  address_line_3: string;
  postal_code: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type TreatmentMethod = {
  id: string;
  treatment_method_name: string;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type DataImport = {
  id: string;
  file_name: string;
  uploaded_by: string | null;
  upload_date: string;
  total_rows: number;
  imported_rows: number;
  skipped_rows: number;
  error_rows: number;
  duplicate_rows: number;
  import_kind: 'waste' | 'operational' | 'sites';
  source_checksum: string;
  import_status: 'pending' | 'completed' | 'failed';
  notes: string;
  created_at: string;
};

export type ImportErrorRow = {
  id: string;
  import_id: string;
  source_row_number: number | null;
  raw_data: Record<string, string> | null;
  error_message: string;
  created_at: string;
};

export type ReceivedDateSource = 'facility_receipt' | 'collection_fallback';

// Full record (admin/staff view of the base table).
export type ReceivedWasteRecord = {
  id: string;
  client_id: string;
  site_id: string | null;
  waste_manifest_tracking_number: string;
  received_date: string | null;
  collection_date: string | null;
  facility_receipt_date: string | null;
  received_date_source: ReceivedDateSource;
  waste_category_id: string | null;
  hcrw_super_category: string;
  container_type_id: string | null;
  containers_received: number;
  nett_weight_kg: number;
  reusable_boolean: boolean;
  treatment_method_id: string | null;
  // admin-only
  manifest_id: string;
  waste_manifest_creation_date: string | null;
  generator_acknowledgement_date: string | null;
  treatment_confirmation_date: string | null;
  transporter: string;
  driver: string;
  weight_collected_kg: number | null;
  reusable_empty_weight_kg: number | null;
  billed_to_client: string;
  invoice_ref_number: string;
  treatment_facility: string;
  // provenance
  source_upload_id: string | null;
  source_row_number: number | null;
  import_status: 'imported' | 'error';
  import_error_message: string;
  duplicate_key: string;
  created_at: string;
  updated_at: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Commercial — ESG Engine (Phase 2)
// ─────────────────────────────────────────────────────────────────────────────

export type EsgFactorCategory =
  | 'emission_factor'
  | 'water_factor'
  | 'treatment_factor'
  | 'transport_assumption'
  | 'container_capacity'
  | 'plant_benchmark'
  | 'baseline'
  | 'carbon_credit'
  | 'allocation';

export type GhgScope = 'scope_1' | 'scope_2' | 'scope_3';

export const ESG_FACTOR_CATEGORY_LABELS: Record<EsgFactorCategory, string> = {
  emission_factor: 'Emission Factors',
  water_factor: 'Water & Effluent Factors',
  treatment_factor: 'Treatment-Method Factors',
  transport_assumption: 'Transport Assumptions',
  container_capacity: 'Container Capacities',
  plant_benchmark: 'Plant Benchmarks',
  baseline: 'Baselines',
  carbon_credit: 'Carbon Credit',
  allocation: 'Allocation',
};

export type EsgFactor = {
  id: string;
  factor_key: string;
  factor_name: string;
  category: EsgFactorCategory;
  ghg_scope: GhgScope | null;
  unit: string;
  value: number;
  text_value: string;
  source: string;
  effective_date: string;
  calculation_boundary: string | null;
  version: number;
  approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  notes: string;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EsgMonthlyOperational = {
  id: string;
  period_month: string;
  site_id: string | null;
  electricity_kwh: number | null;
  water_kl: number | null;
  diesel_litres: number | null;
  effluent_kl: number | null;
  treatment_energy_kwh: number | null;
  trips: number | null;
  kilometres: number | null;
  idling_hours: number | null;
  data_source: 'actual' | 'estimated';
  approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  notes: string;
  entered_by: string | null;
  created_at: string;
  updated_at: string;
};

// metric -> data-basis label (customer-safe)
export type EsgDataBasis = 'actual' | 'admin_actual' | 'estimated' | 'benchmark' | 'awaiting';

export const ESG_DATA_BASIS_LABELS: Record<EsgDataBasis, string> = {
  actual: 'Actual',
  admin_actual: 'Admin',
  estimated: 'Estimated',
  benchmark: 'Benchmark',
  awaiting: 'Awaiting data',
};

export type EsgResult = {
  id: string;
  client_id: string;
  period_month: string;
  co2e_saved_kg: number | null;
  residual_tco2e: number | null;
  water_saved_kl: number | null;
  electricity_saved_kwh: number | null;
  diesel_saved_l: number | null;
  km_avoided: number | null;
  trips_avoided: number | null;
  indicative_carbon_credits: number | null;
  trees_equivalent: number | null;
  t4g_water_kl: number | null;
  t4g_electricity_kwh: number | null;
  t4g_diesel_l: number | null;
  t4g_trips: number | null;
  total_nett_kg: number;
  treatment_emissions_by_method: Record<string, number>;
  transport_comparison: Record<string, number>;
  data_basis: Record<string, EsgDataBasis>;
  audit: Record<string, unknown>;
  factor_snapshot: Array<{ key: string; value: number; unit: string; source: string; version: number; approved: boolean; effective_date?: string | null; calculation_boundary?: string | null; approved_by?: string | null; approved_at?: string | null }>;
  calc_run_id: string | null;
  approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  computed_at: string;
  computed_by: string | null;
  created_at: string;
  updated_at: string;
};

// Customer-safe row shape returned by public.v_esg_results (no `audit`/`factor_snapshot`).
export type EsgResultCustomerRow = {
  id: string;
  client_id: string;
  client_name: string;
  period_month: string;
  co2e_saved_kg: number | null;
  residual_tco2e: number | null;
  water_saved_kl: number | null;
  electricity_saved_kwh: number | null;
  diesel_saved_l: number | null;
  km_avoided: number | null;
  trips_avoided: number | null;
  indicative_carbon_credits: number | null;
  trees_equivalent: number | null;
  t4g_water_kl: number | null;
  t4g_electricity_kwh: number | null;
  t4g_diesel_l: number | null;
  t4g_trips: number | null;
  total_nett_kg: number;
  treatment_emissions_by_method: Record<string, number>;
  transport_comparison: Record<string, number>;
  data_basis: Record<string, EsgDataBasis>;
  credits_verified: boolean;
};

// Per-site allocated ESG row from public.v_esg_site_allocated (allocated estimate).
export type EsgSiteAllocatedRow = {
  esg_result_id: string;
  client_id: string;
  client_name: string;
  site_id: string;
  generator_facility: string | null;
  province: string | null;
  period_month: string;
  basis: 'allocated_estimate';
  site_nett_kg: number;
  allocation_share: number;
  co2e_saved_kg: number | null;
  residual_tco2e: number | null;
  water_saved_kl: number | null;
  electricity_saved_kwh: number | null;
  diesel_saved_l: number | null;
  km_avoided: number | null;
  trips_avoided: number | null;
  trees_equivalent: number | null;
  t4g_water_kl: number | null;
  t4g_electricity_kwh: number | null;
  t4g_diesel_l: number | null;
  t4g_trips: number | null;
};

export type CarbonCreditEvidence = {
  id: string;
  client_id: string;
  period_month: string | null;
  registry_name: string;
  serial_ref: string;
  retirement_doc_path: string;
  quantity_tco2e: number | null;
  verified: boolean;
  notes: string;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

// ── Commercial CRM (Phase 1) ────────────────────────────────────────────────

export type CrmContact = {
  id: string;
  client_id: string;
  first_name: string;
  last_name: string;
  job_title: string;
  email: string;
  phone: string;
  mobile: string;
  is_primary: boolean;
  portal_user_id: string | null;
  notes: string;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CrmActivityType = 'task' | 'call' | 'note' | 'email' | 'meeting';
export type CrmActivityStatus = 'open' | 'completed';

export type CrmActivity = {
  id: string;
  client_id: string;
  contact_id: string | null;
  type: CrmActivityType;
  subject: string;
  body: string;
  status: CrmActivityStatus;
  due_date: string | null;
  completed_at: string | null;
  owner_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CrmSavedView = {
  id: string;
  owner_id: string;
  object_key: string;
  name: string;
  config: Record<string, unknown>;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
};

// Customer-safe row shape returned by the public.v_received_waste view.
export type ReceivedWasteCustomerRow = {
  id: string;
  client_id: string;
  client_name: string;
  site_id: string | null;
  generator_group: string | null;
  generator_facility: string | null;
  province: string | null;
  waste_manifest_tracking_number: string;
  received_date: string | null;
  collection_date: string | null;
  facility_receipt_date: string | null;
  received_date_source: ReceivedDateSource;
  waste_category_id: string | null;
  waste_category_name: string | null;
  hcrw_super_category: string;
  container_type_id: string | null;
  container_type_name: string | null;
  treatment_method_id: string | null;
  treatment_method_name: string | null;
  containers_received: number;
  nett_weight_kg: number;
  reusable_boolean: boolean;
};
