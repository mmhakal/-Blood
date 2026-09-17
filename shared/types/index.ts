/**
 * Shared Type Definitions for Blood Diagnostic Laboratory Information System (LIS)
 * Core System Architecture & Multi-Tenant Entities
 */

// ==========================================
// 1. RBAC & PERMISSION CONSTANTS
// ==========================================

export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'super_admin',
  LAB_ADMIN: 'lab_admin',
  PATHOLOGIST: 'pathologist',
  LAB_TECHNICIAN: 'lab_technician',
  RECEPTIONIST: 'receptionist',
  ACCOUNTANT: 'accountant',
} as const;

export type SystemRoleCode = typeof SYSTEM_ROLES[keyof typeof SYSTEM_ROLES];

export const SYSTEM_PERMISSIONS = {
  // Super Admin Permissions
  MANAGE_ALL_LABORATORIES: 'manage_all_laboratories',
  MANAGE_SUBSCRIPTIONS: 'manage_subscriptions',
  MANAGE_GLOBAL_TESTS: 'manage_global_tests',
  MANAGE_SYSTEM_SETTINGS: 'manage_system_settings',
  VIEW_SYSTEM_ANALYTICS: 'view_system_analytics',
  VIEW_ALL_AUDIT_LOGS: 'view_all_audit_logs',
  MANAGE_USERS: 'manage_users',

  // Lab Admin & Management Permissions
  MANAGE_LAB: 'manage_lab',
  MANAGE_BRANCHES: 'manage_branches',
  MANAGE_PATIENTS: 'manage_patients',
  MANAGE_TESTS: 'manage_tests',
  MANAGE_RESULTS: 'manage_results',
  MANAGE_REPORTS: 'manage_reports',
  MANAGE_BILLING: 'manage_billing',
  VIEW_ANALYTICS: 'view_analytics',
  VIEW_AUDIT_LOGS: 'view_audit_logs',

  // Clinical & Operations Permissions
  CREATE_PATIENT: 'create_patient',
  VIEW_PATIENTS: 'view_patients',
  CREATE_ORDER: 'create_order',
  VIEW_ORDERS: 'view_orders',
  COLLECT_SAMPLE: 'collect_sample',
  ENTER_RESULTS: 'enter_results',
  VERIFY_RESULTS: 'verify_results',
  APPROVE_REPORT: 'approve_report',
  PRINT_REPORT: 'print_report',
  RECEIVE_PAYMENTS: 'receive_payments',
  MANAGE_BACKUP: 'manage_backup',
} as const;

export type SystemPermissionCode = typeof SYSTEM_PERMISSIONS[keyof typeof SYSTEM_PERMISSIONS];

// ==========================================
// 2. USER & AUTHENTICATION ENTITIES
// ==========================================

export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface User {
  id: string;
  lab_id: string | null;
  branch_id: string | null;
  name: string;
  email: string;
  phone?: string;
  role_id: string;
  role_code: SystemRoleCode | string;
  role_name?: string;
  lab_name?: string;
  branch_name?: string;
  status: UserStatus;
  avatar_url?: string;
  failed_login_attempts?: number;
  locked_until?: string | null;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role_code: SystemRoleCode | string;
  role_name?: string;
  lab_id: string | null;
  lab_name: string;
  branch_id: string | null;
  branch_name: string;
  authorized_branches: Array<{ id: string; name: string; code: string; is_primary: boolean }>;
  permissions: string[];
}

export interface Role {
  id: string;
  lab_id: string | null;
  name: string;
  code: string;
  description?: string;
  is_system: boolean | number;
  created_at: string;
}

export interface Permission {
  id: string;
  name: string;
  code: string;
  category: string;
  description?: string;
}

// ==========================================
// 3. LABORATORY & BRANCH (TENANTS)
// ==========================================

export type LaboratoryStatus = 'active' | 'suspended' | 'expired' | 'deactivated';

export interface Laboratory {
  id: string;
  name: string;
  code: string;
  owner_name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  tax_number?: string;
  license_number?: string;
  logo_url?: string;
  header_text?: string;
  footer_text?: string;
  signature_url?: string;
  status: LaboratoryStatus;
  subscription_plan_id?: string | null;
  subscription_plan_name?: string;
  subscription_plan_code?: string;
  subscription_start?: string | null;
  subscription_end?: string | null;
  branches_count?: number;
  users_count?: number;
  patients_count?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Branch {
  id: string;
  lab_id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  alternate_phone?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  tax_number?: string;
  registration_number?: string;
  email?: string;
  manager_name?: string;
  working_hours?: string;
  logo_url?: string;
  report_header?: string;
  report_footer?: string;
  status: 'active' | 'inactive';
  user_count?: number;
  patient_count?: number;
  order_count?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface BranchUserAssignment {
  user_id: string;
  branch_id: string;
  is_primary: boolean;
  user_name?: string;
  user_email?: string;
  role_name?: string;
}

// ==========================================
// 4. SUBSCRIPTION MODULE ENTITIES
// ==========================================

export type SubscriptionStatus = 'trial' | 'active' | 'expiring_soon' | 'expired' | 'suspended' | 'cancelled';

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  description?: string;
  max_branches: number;
  max_users: number;
  max_patients_per_month: number;
  max_reports_per_month: number;
  storage_limit_mb: number;
  duration_days: number;
  price: number;
  features: string[]; // parsed JSON array
  is_active: boolean | number;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionRecord {
  id: string;
  lab_id: string;
  plan_id: string;
  plan_name?: string;
  plan_code?: string;
  status: SubscriptionStatus;
  start_date: string;
  end_date: string;
  price_paid: number;
  billing_cycle: 'monthly' | 'quarterly' | 'annual' | 'custom';
  notes?: string;
  created_at: string;
}

// ==========================================
// 5. AUDIT & NOTIFICATION ENTITIES
// ==========================================

export interface AuditLog {
  id: string;
  lab_id?: string | null;
  lab_name?: string;
  branch_id?: string | null;
  branch_name?: string;
  user_id?: string | null;
  user_email?: string | null;
  user_role?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'danger';

export interface Notification {
  id: string;
  lab_id?: string | null;
  user_id?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  link?: string | null;
  created_at: string;
}

// ==========================================
// 6. SUPER ADMIN DASHBOARD METRICS
// ==========================================

export interface SuperAdminDashboardStats {
  metrics: {
    total_laboratories: number;
    active_laboratories: number;
    suspended_laboratories: number;
    total_branches: number;
    total_users: number;
    total_patients: number;
    active_subscriptions: number;
    expiring_subscriptions: number;
    expired_subscriptions: number;
    total_monthly_revenue: number;
  };
  charts: {
    monthly_laboratories: Array<{ month: string; count: number }>;
    monthly_subscriptions: Array<{ month: string; revenue: number; count: number }>;
    plan_distribution: Array<{ plan_name: string; count: number }>;
  };
  recent_activities: AuditLog[];
  recent_laboratories: Laboratory[];
  recent_notifications: Notification[];
}

// ==========================================
// 7. PHASE 3: CLINICAL MASTER & OPERATIONS
// ==========================================

export interface Doctor {
  id: string;
  lab_id: string;
  name: string;
  qualification?: string;
  specialization?: string;
  registration_number?: string;
  clinic_hospital?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  commission_rate: number;
  status: 'active' | 'inactive';
  referral_count?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Patient {
  id: string;
  lab_id: string;
  branch_id: string;
  patient_id_code: string;
  lab_number?: string;
  name: string;
  age: number;
  age_unit: 'years' | 'months' | 'days';
  dob?: string;
  gender: 'Male' | 'Female' | 'Other';
  mobile: string;
  alternate_mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  referring_doctor_id?: string;
  doctor_name?: string;
  clinic_hospital?: string;
  emergency_contact?: string;
  blood_group?: string;
  remarks?: string;
  status: 'active' | 'inactive';
  branch_name?: string;
  total_orders?: number;
  last_visit_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface PatientProfile {
  patient: Patient;
  orders: Array<{
    id: string;
    order_number: string;
    created_at: string;
    status: string;
    net_amount: number;
    payment_status: string;
    report_number?: string;
    report_status?: string;
    item_count?: number;
  }>;
  recentResults: Array<{
    value_numeric?: number;
    flag?: string;
    unit?: string;
    created_at: string;
    param_name: string;
    test_name: string;
  }>;
  invoices: Array<{
    id: string;
    invoice_number: string;
    net_total: number;
    paid: number;
    due: number;
    status: string;
    created_at: string;
  }>;
  activityLogs: AuditLog[];
}

export interface TestCategory {
  id: string;
  lab_id?: string | null;
  name: string;
  code: string;
  description?: string;
  display_order: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at?: string;
}

export type ResultType = 'numeric' | 'text' | 'positive_negative' | 'reactive_nonreactive' | 'options' | 'formula';

export interface ReferenceRange {
  id: string;
  parameter_id: string;
  gender: 'Male' | 'Female' | 'Both';
  min_age_days?: number;
  max_age_days?: number;
  normal_min?: number | null;
  normal_max?: number | null;
  critical_low?: number | null;
  critical_high?: number | null;
  text_range?: string | null;
  remarks?: string;
}

export interface TestParameter {
  id: string;
  test_id: string;
  name: string;
  short_name?: string;
  result_type: ResultType;
  unit?: string;
  decimal_precision: number;
  default_value?: string;
  method?: string;
  display_order: number;
  remarks?: string;
  reference_ranges?: ReferenceRange[];
  normal_min?: number;
  normal_max?: number;
  critical_low?: number;
  critical_high?: number;
  text_range?: string;
}

export interface TestPrice {
  id: string;
  test_id: string;
  branch_id: string;
  branch_name?: string;
  price: number;
  effective_date?: string;
  tax_percentage?: number;
  discount_allowed?: boolean;
}

export interface Test {
  id: string;
  lab_id?: string | null;
  category_id?: string;
  category_name?: string;
  code: string;
  name: string;
  department: string;
  sample_type: string;
  container_type: string;
  method?: string;
  turnaround_time_hours: number;
  base_price: number;
  effective_price?: number;
  remarks?: string;
  status: 'active' | 'inactive';
  parameters?: TestParameter[];
  prices?: TestPrice[];
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface TestPackage {
  id: string;
  lab_id?: string | null;
  name: string;
  code: string;
  description?: string;
  price: number;
  discount_percentage?: number;
  validity_days?: number;
  status: 'active' | 'inactive';
  tests?: Array<{
    id: string;
    name: string;
    code: string;
    base_price: number;
    sample_type: string;
  }>;
  total_base_price?: number;
  created_at: string;
}

export interface SampleType {
  id: string;
  lab_id?: string | null;
  name: string;
  code: string;
  container: string;
  color_code?: string;
  cap_type?: string;
  min_volume?: string;
  storage_requirement?: string;
  processing_instructions?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface LabAdminDashboardStats {
  metrics: {
    total_patients: number;
    today_patients: number;
    today_orders: number;
    pending_samples: number;
    processing_samples: number;
    pending_results: number;
    awaiting_verification: number;
    completed_reports: number;
    today_revenue: number;
    outstanding_payments: number;
    active_branches: number;
    active_staff: number;
  };
  charts: {
    daily_registrations: Array<{ date: string; count: number }>;
    test_volume: Array<{ date: string; count: number }>;
    revenue_trend: Array<{ date: string; amount: number }>;
    branch_stats: Array<{ id: string; name: string; code: string; patient_count: number; order_count: number }>;
    popular_tests: Array<{ name: string; count: number }>;
  };
  recent_orders: any[];
}

// ==========================================
// 8. PHASE 4: DIAGNOSTIC & CLINICAL PIPELINE
// ==========================================

export type OrderPriority = 'routine' | 'urgent' | 'stat';

export type OrderStatus =
  | 'draft'
  | 'registered'
  | 'sample_pending'
  | 'sample_collected'
  | 'processing'
  | 'result_pending'
  | 'verification_pending'
  | 'approved'
  | 'report_released'
  | 'cancelled';

export type SampleStatus =
  | 'pending'
  | 'collected'
  | 'received'
  | 'processing'
  | 'processed'
  | 'rejected'
  | 'recollection_required'
  | 'completed';

export type SampleRejectionReason =
  | 'insufficient'
  | 'wrong_container'
  | 'hemolyzed'
  | 'clotted'
  | 'leaking_container'
  | 'incorrect_labeling'
  | 'sample_expired'
  | 'other';

export type PaymentMethod = 'Cash' | 'Card' | 'UPI' | 'Bank Transfer' | 'Online' | 'Other';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overpaid' | 'refunded';

export type ResultFlag = 'normal' | 'low' | 'high' | 'critical_low' | 'critical_high' | 'abnormal';

export type ReportStatus = 'draft' | 'verification_pending' | 'approved' | 'released' | 'amended' | 'cancelled';

export interface TestOrder {
  id: string;
  lab_id: string;
  branch_id: string;
  order_number: string;
  lab_number: string;
  patient_id: string;
  patient_name?: string;
  patient_id_code?: string;
  patient_mobile?: string;
  age?: number;
  gender?: string;
  referring_doctor_id?: string;
  doctor_name?: string;
  branch_name?: string;
  status: OrderStatus;
  priority: OrderPriority;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  net_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_status: PaymentStatus;
  clinical_history?: string;
  remarks?: string;
  cancellation_reason?: string;
  cancelled_by?: string;
  cancelled_at?: string;
  item_count?: number;
  report_id?: string;
  report_number?: string;
  report_status?: string;
  created_by?: string;
  creator_name?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  test_id?: string;
  package_id?: string;
  item_name: string;
  price: number;
  discount: number;
  net_price: number;
  status: string;
  test_code?: string;
  sample_type?: string;
  container_type?: string;
}

export interface Sample {
  id: string;
  lab_id: string;
  branch_id: string;
  order_id: string;
  sample_barcode: string;
  sample_type: string;
  container_type?: string;
  status: SampleStatus;
  collected_at?: string;
  collected_by?: string;
  collector_name?: string;
  processed_at?: string;
  processed_by?: string;
  processor_name?: string;
  rejection_reason?: string;
  recollection_reason?: string;
  remarks?: string;
  order_number?: string;
  lab_number?: string;
  patient_name?: string;
  patient_id_code?: string;
  age?: number;
  gender?: string;
  branch_name?: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  lab_id: string;
  branch_id: string;
  order_id: string;
  invoice_number: string;
  subtotal: number;
  discount: number;
  tax: number;
  net_total: number;
  paid: number;
  due: number;
  status: PaymentStatus;
  order_number?: string;
  lab_number?: string;
  patient_name?: string;
  patient_id_code?: string;
  patient_mobile?: string;
  branch_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  receipt_number: string;
  amount: number;
  payment_method: PaymentMethod;
  transaction_ref?: string;
  notes?: string;
  received_by?: string;
  received_by_name?: string;
  created_at: string;
}

export interface Refund {
  id: string;
  payment_id: string;
  amount: number;
  reason: string;
  approved_by?: string;
  created_at: string;
}

export interface DiscountRecord {
  id: string;
  lab_id: string;
  order_id: string;
  invoice_id?: string;
  discount_type: 'percentage' | 'fixed' | 'test_specific' | 'package';
  discount_value: number;
  discount_amount: number;
  reason?: string;
  authorized_by?: string;
  role_code?: string;
  created_at: string;
}

export interface BarcodeLabel {
  id: string;
  lab_id: string;
  branch_id?: string;
  entity_type: 'patient' | 'order' | 'sample';
  entity_id: string;
  barcode_text: string;
  label_type: string;
  printed_by?: string;
  print_count: number;
  created_at: string;
}

export interface ResultValue {
  id: string;
  result_id: string;
  parameter_id: string;
  param_name?: string;
  short_name?: string;
  value_numeric?: number | null;
  value_text?: string | null;
  unit?: string;
  reference_range_text?: string;
  flag: ResultFlag;
  is_critical: boolean | number;
  previous_value?: string | number | null;
  previous_date?: string | null;
  remarks?: string;
}

export interface WorkQueuesResponse {
  reception: {
    pending_registrations: number;
    pending_payments: number;
    unpaid_invoices: number;
  };
  sample_collection: {
    pending_collection: number;
    recollection_required: number;
    rejected_samples: number;
  };
  technician: {
    pending_processing: number;
    pending_results: number;
  };
  pathologist: {
    awaiting_verification: number;
    critical_results: number;
    awaiting_approval: number;
  };
}

// ==========================================
// PHASE 5 TYPES — ENTERPRISE COMPLETION
// ==========================================

// Accounting & Financials
export interface ExpenseCategory {
  id: string;
  lab_id: string;
  name: string;
  description?: string;
  is_active: boolean | number;
  created_at: string;
}

export interface Expense {
  id: string;
  lab_id: string;
  branch_id?: string;
  branch_name?: string;
  category_id?: string;
  category_name?: string;
  title: string;
  amount: number;
  payment_method: string;
  expense_date: string;
  payee?: string;
  receipt_url?: string;
  notes?: string;
  recorded_by?: string;
  recorder_name?: string;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  lab_id: string;
  branch_id?: string;
  branch_name?: string;
  entry_type: 'debit' | 'credit';
  category: string;
  amount: number;
  balance_after: number;
  reference_type?: string;
  reference_id?: string;
  description: string;
  recorded_by?: string;
  created_at: string;
}

export interface Receivable {
  id: string;
  lab_id: string;
  branch_id?: string;
  branch_name?: string;
  invoice_id: string;
  invoice_number?: string;
  patient_id: string;
  patient_name?: string;
  patient_mobile?: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  due_date?: string;
  status: 'pending' | 'partial' | 'overdue' | 'written_off';
  last_reminder_sent_at?: string;
  notes?: string;
  created_at: string;
}

export interface CashClosing {
  id: string;
  lab_id: string;
  branch_id: string;
  branch_name?: string;
  shift_date: string;
  opening_cash: number;
  cash_sales: number;
  cash_expenses: number;
  refunds_paid: number;
  calculated_cash: number;
  actual_cash: number;
  variance: number;
  closed_by: string;
  closer_name?: string;
  verified_by?: string;
  verifier_name?: string;
  status: 'open' | 'closed' | 'verified';
  remarks?: string;
  created_at: string;
}

// Inventory & Consumables
export interface InventoryCategory {
  id: string;
  lab_id: string;
  name: string;
  description?: string;
  item_count?: number;
  created_at: string;
}

export interface Supplier {
  id: string;
  lab_id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  gst_number?: string;
  payment_terms?: string;
  is_active: boolean | number;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  lab_id: string;
  category_id?: string;
  category_name?: string;
  supplier_id?: string;
  supplier_name?: string;
  code: string;
  name: string;
  unit: string;
  min_stock: number;
  max_stock: number;
  current_stock: number;
  purchase_price: number;
  selling_cost: number;
  storage_temp?: string;
  location?: string;
  is_active: boolean | number;
  is_low_stock?: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryBatch {
  id: string;
  lab_id: string;
  item_id: string;
  item_name?: string;
  item_code?: string;
  batch_number: string;
  expiry_date: string;
  initial_quantity: number;
  current_quantity: number;
  unit_cost: number;
  mfg_date?: string;
  supplier_id?: string;
  is_expired?: boolean;
  days_to_expiry?: number;
  created_at: string;
}

export interface StockTransaction {
  id: string;
  lab_id: string;
  branch_id?: string;
  branch_name?: string;
  item_id: string;
  item_name?: string;
  batch_id?: string;
  batch_number?: string;
  transaction_type: 'purchase' | 'stock_in' | 'consumption' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'damaged' | 'expired';
  quantity: number;
  unit_cost: number;
  total_cost: number;
  reference_type?: string;
  reference_id?: string;
  reason?: string;
  performed_by?: string;
  performer_name?: string;
  created_at: string;
}

export interface StockTransfer {
  id: string;
  lab_id: string;
  from_branch_id: string;
  from_branch_name?: string;
  to_branch_id: string;
  to_branch_name?: string;
  item_id: string;
  item_name?: string;
  batch_id?: string;
  batch_number?: string;
  quantity: number;
  status: 'requested' | 'dispatched' | 'received' | 'rejected';
  requested_by?: string;
  dispatched_by?: string;
  received_by?: string;
  transfer_date: string;
  dispatch_date?: string;
  receipt_date?: string;
  notes?: string;
  created_at: string;
}

// Doctor & Patient Portals
export interface DoctorPortalAccount {
  id: string;
  lab_id: string;
  doctor_id: string;
  username: string;
  email?: string;
  phone?: string;
  is_active: boolean | number;
  last_login_at?: string;
}

export interface PatientPortalAccount {
  id: string;
  lab_id: string;
  patient_id: string;
  username: string;
  mobile?: string;
  email?: string;
  is_active: boolean | number;
  last_login_at?: string;
}

// Communications & Notifications
export interface CommunicationProvider {
  id: string;
  lab_id: string;
  provider_type: 'smtp' | 'sms' | 'whatsapp';
  provider_name: string;
  config_json?: string;
  is_active: boolean | number;
  is_default: boolean | number;
  created_at: string;
}

export interface NotificationTemplateItem {
  id: string;
  lab_id: string;
  event_type: string;
  channel: 'in_app' | 'email' | 'sms' | 'whatsapp';
  title_template?: string;
  body_template: string;
  is_active: boolean | number;
  created_at: string;
}

export interface CommunicationLog {
  id: string;
  lab_id: string;
  channel: 'email' | 'sms' | 'whatsapp';
  provider?: string;
  recipient: string;
  subject?: string;
  message_preview?: string;
  status: 'sent' | 'failed' | 'delivered';
  error?: string;
  sent_at: string;
}

// Report Designer & QR Verification
export interface ReportTemplate {
  id: string;
  lab_id: string;
  branch_id?: string;
  name: string;
  is_default: boolean | number;
  header_html?: string;
  footer_html?: string;
  show_logo: boolean | number;
  show_qr: boolean | number;
  show_barcode: boolean | number;
  show_doctor_signature: boolean | number;
  show_technician_signature: boolean | number;
  watermark_text?: string;
  signature_layout: string;
  styles_json?: string;
  created_at: string;
}

export interface ReportVerificationToken {
  id: string;
  report_id: string;
  token: string;
  patient_safe_code: string;
  expires_at?: string;
  scan_count: number;
  last_scanned_at?: string;
  created_at: string;
}

export interface PublicVerificationDetails {
  valid: boolean;
  report_number: string;
  patient_safe_code: string;
  order_date: string;
  lab_name: string;
  lab_license?: string;
  branch_name?: string;
  pathologist_name?: string;
  verification_status: string;
  is_amended: boolean;
  version_number: number;
  certified_at?: string;
}

// Subscription Feature Gate
export interface SubscriptionFeature {
  id: string;
  plan_id: string;
  feature_key: string;
  feature_name: string;
  is_enabled: boolean | number;
  quota_limit: number;
  created_at: string;
}

// ==========================================
// 44. MODULE CONTRACTS & DOMAIN EVENTS
// ==========================================
export * from './moduleContracts';
