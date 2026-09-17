-- Blood Diagnostic Laboratory Management Software / LIS Database Schema
-- Multi-tenant schema supporting PostgreSQL and SQLite

-- 1. SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. SUBSCRIPTION PLANS
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  max_branches INTEGER NOT NULL DEFAULT 1,
  max_users INTEGER NOT NULL DEFAULT 5,
  max_patients_per_month INTEGER NOT NULL DEFAULT 500,
  max_reports_per_month INTEGER NOT NULL DEFAULT 500,
  storage_limit_mb INTEGER NOT NULL DEFAULT 1024,
  duration_days INTEGER NOT NULL DEFAULT 30,
  price REAL NOT NULL DEFAULT 0.0,
  features TEXT, -- JSON array of enabled features
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. LABORATORIES (Tenants)
CREATE TABLE IF NOT EXISTS laboratories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  owner_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  tax_number TEXT,
  license_number TEXT,
  logo_url TEXT,
  header_text TEXT,
  footer_text TEXT,
  signature_url TEXT,
  status TEXT DEFAULT 'active', -- active, suspended, expired, deactivated
  subscription_plan_id TEXT,
  subscription_start TIMESTAMP,
  subscription_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subscription_plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL
);

-- 4. BRANCHES
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  manager_name TEXT,
  working_hours TEXT,
  logo_url TEXT,
  report_header TEXT,
  report_footer TEXT,
  status TEXT DEFAULT 'active', -- active, inactive
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  UNIQUE(lab_id, code)
);

-- 5. ROLES
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  lab_id TEXT, -- NULL for global/system roles
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lab_id, code)
);

-- 6. PERMISSIONS
CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  description TEXT
);

-- 7. ROLE PERMISSIONS
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- 8. USERS
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  lab_id TEXT, -- NULL for super_admin
  branch_id TEXT, -- default or primary branch
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  role_id TEXT NOT NULL,
  avatar_url TEXT,
  status TEXT DEFAULT 'active', -- active, inactive, suspended
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- 9. USER BRANCH ASSIGNMENTS
CREATE TABLE IF NOT EXISTS user_branches (
  user_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT 0,
  PRIMARY KEY (user_id, branch_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

-- 10. SUBSCRIPTIONS HISTORY
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  price_paid REAL DEFAULT 0.0,
  billing_cycle TEXT DEFAULT 'monthly',
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

-- 11. REFERRING DOCTORS
CREATE TABLE IF NOT EXISTS doctors (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  name TEXT NOT NULL,
  qualification TEXT,
  specialization TEXT,
  registration_number TEXT,
  clinic_hospital TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  commission_rate REAL DEFAULT 0.0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 12. PATIENTS
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  patient_id_code TEXT NOT NULL, -- e.g. PID-2026-0001
  lab_number TEXT,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  age_unit TEXT DEFAULT 'years', -- years, months, days
  dob DATE,
  gender TEXT NOT NULL, -- Male, Female, Other
  mobile TEXT NOT NULL,
  email TEXT,
  address TEXT,
  referring_doctor_id TEXT,
  emergency_contact TEXT,
  blood_group TEXT,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (referring_doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
  UNIQUE(lab_id, patient_id_code)
);

-- 13. TEST CATEGORIES
CREATE TABLE IF NOT EXISTS test_categories (
  id TEXT PRIMARY KEY,
  lab_id TEXT, -- NULL for global default categories
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. TESTS
CREATE TABLE IF NOT EXISTS tests (
  id TEXT PRIMARY KEY,
  lab_id TEXT, -- NULL for global master tests
  category_id TEXT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  department TEXT DEFAULT 'Hematology',
  sample_type TEXT DEFAULT 'Whole Blood (EDTA)', -- Whole Blood, Serum, Plasma, Urine, etc.
  container_type TEXT DEFAULT 'Lavender Top (EDTA)',
  method TEXT,
  turnaround_time_hours INTEGER DEFAULT 4,
  base_price REAL NOT NULL DEFAULT 0.0,
  remarks TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES test_categories(id) ON DELETE SET NULL
);

-- 15. TEST PARAMETERS
CREATE TABLE IF NOT EXISTS test_parameters (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT,
  result_type TEXT DEFAULT 'numeric', -- numeric, text, options, formula
  unit TEXT,
  decimal_precision INTEGER DEFAULT 2,
  default_value TEXT,
  method TEXT,
  display_order INTEGER DEFAULT 0,
  remarks TEXT,
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
);

-- 16. REFERENCE RANGES
CREATE TABLE IF NOT EXISTS reference_ranges (
  id TEXT PRIMARY KEY,
  parameter_id TEXT NOT NULL,
  gender TEXT DEFAULT 'Both', -- Male, Female, Both
  min_age_days INTEGER DEFAULT 0,
  max_age_days INTEGER DEFAULT 43800, -- 120 years
  normal_min REAL,
  normal_max REAL,
  critical_low REAL,
  critical_high REAL,
  text_range TEXT, -- For non-numeric e.g. "Negative", "Non-Reactive"
  remarks TEXT,
  FOREIGN KEY (parameter_id) REFERENCES test_parameters(id) ON DELETE CASCADE
);

-- 17. TEST PRICES (Branch-specific overrides)
CREATE TABLE IF NOT EXISTS test_prices (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  price REAL NOT NULL,
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  UNIQUE(test_id, branch_id)
);

-- 18. PACKAGES
CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  lab_id TEXT,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 19. PACKAGE TESTS
CREATE TABLE IF NOT EXISTS package_tests (
  package_id TEXT NOT NULL,
  test_id TEXT NOT NULL,
  PRIMARY KEY (package_id, test_id),
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
);

-- 20. TEST ORDERS
CREATE TABLE IF NOT EXISTS test_orders (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  order_number TEXT NOT NULL, -- ORD-2026-0001
  lab_number TEXT NOT NULL,   -- LAB-2026-0001
  patient_id TEXT NOT NULL,
  referring_doctor_id TEXT,
  status TEXT DEFAULT 'registered', -- registered, sample_collected, processing, completed, cancelled
  priority TEXT DEFAULT 'routine', -- routine, urgent, stat
  total_amount REAL NOT NULL DEFAULT 0.0,
  discount_amount REAL NOT NULL DEFAULT 0.0,
  tax_amount REAL NOT NULL DEFAULT 0.0,
  net_amount REAL NOT NULL DEFAULT 0.0,
  paid_amount REAL NOT NULL DEFAULT 0.0,
  due_amount REAL NOT NULL DEFAULT 0.0,
  payment_status TEXT DEFAULT 'unpaid', -- unpaid, partial, paid
  clinical_history TEXT,
  remarks TEXT,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (referring_doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(lab_id, order_number)
);

-- 21. ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  test_id TEXT,
  package_id TEXT,
  item_name TEXT NOT NULL,
  price REAL NOT NULL,
  discount REAL DEFAULT 0.0,
  net_price REAL NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, sample_collected, processing, resulted, verified, approved
  FOREIGN KEY (order_id) REFERENCES test_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE SET NULL,
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL
);

-- 22. SAMPLES
CREATE TABLE IF NOT EXISTS samples (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  sample_barcode TEXT NOT NULL, -- SMP-2026-0001
  sample_type TEXT NOT NULL,
  container_type TEXT,
  status TEXT DEFAULT 'pending', -- pending, collected, processing, completed, rejected
  collected_at TIMESTAMP,
  collected_by TEXT,
  processed_at TIMESTAMP,
  processed_by TEXT,
  rejection_reason TEXT,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES test_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (collected_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(lab_id, sample_barcode)
);

-- 23. SAMPLE EVENTS
CREATE TABLE IF NOT EXISTS sample_events (
  id TEXT PRIMARY KEY,
  sample_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- registered, collected, sent_to_lab, received, processing, rejected, recollected
  description TEXT,
  performed_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE CASCADE,
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 24. RESULTS
CREATE TABLE IF NOT EXISTS results (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  order_item_id TEXT NOT NULL,
  test_id TEXT NOT NULL,
  sample_id TEXT,
  status TEXT DEFAULT 'draft', -- draft, submitted, verified, approved, released
  entered_by TEXT,
  entered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_by TEXT,
  verified_at TIMESTAMP,
  approved_by TEXT,
  approved_at TIMESTAMP,
  clinical_remarks TEXT,
  impression TEXT,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES test_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
  FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE SET NULL,
  FOREIGN KEY (entered_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 25. RESULT VALUES
CREATE TABLE IF NOT EXISTS result_values (
  id TEXT PRIMARY KEY,
  result_id TEXT NOT NULL,
  parameter_id TEXT NOT NULL,
  value_numeric REAL,
  value_text TEXT,
  unit TEXT,
  reference_range_text TEXT,
  flag TEXT DEFAULT 'normal', -- normal, high, low, critical_high, critical_low, abnormal
  is_critical BOOLEAN DEFAULT 0,
  previous_value TEXT,
  remarks TEXT,
  FOREIGN KEY (result_id) REFERENCES results(id) ON DELETE CASCADE,
  FOREIGN KEY (parameter_id) REFERENCES test_parameters(id) ON DELETE CASCADE
);

-- 26. REPORTS
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  report_number TEXT NOT NULL, -- REP-2026-0001
  status TEXT DEFAULT 'draft', -- draft, verified, approved, released
  approved_by TEXT,
  approved_at TIMESTAMP,
  released_by TEXT,
  released_at TIMESTAMP,
  pdf_url TEXT,
  qr_code_data TEXT,
  print_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES test_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (released_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(lab_id, report_number)
);

-- 27. REPORT VERSIONS
CREATE TABLE IF NOT EXISTS report_versions (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  snapshot_data TEXT NOT NULL, -- JSON snapshot of patient, order, tests, results, parameters, and signer
  changed_by TEXT,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 28. REPORT TEMPLATES
CREATE TABLE IF NOT EXISTS report_templates (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT 0,
  header_html TEXT,
  footer_html TEXT,
  show_logo BOOLEAN DEFAULT 1,
  show_qr BOOLEAN DEFAULT 1,
  show_barcode BOOLEAN DEFAULT 1,
  show_doctor_signature BOOLEAN DEFAULT 1,
  show_technician_signature BOOLEAN DEFAULT 1,
  watermark_text TEXT,
  signature_layout TEXT DEFAULT 'standard',
  styles_json TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

-- 29. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  invoice_number TEXT NOT NULL, -- INV-2026-0001
  subtotal REAL NOT NULL DEFAULT 0.0,
  discount REAL NOT NULL DEFAULT 0.0,
  tax REAL NOT NULL DEFAULT 0.0,
  net_total REAL NOT NULL DEFAULT 0.0,
  paid REAL NOT NULL DEFAULT 0.0,
  due REAL NOT NULL DEFAULT 0.0,
  status TEXT DEFAULT 'unpaid', -- unpaid, partial, paid
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES test_orders(id) ON DELETE CASCADE,
  UNIQUE(lab_id, invoice_number)
);

-- 30. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  receipt_number TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_method TEXT NOT NULL, -- Cash, Card, UPI, Bank Transfer
  transaction_ref TEXT,
  notes TEXT,
  received_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 31. REFUNDS
CREATE TABLE IF NOT EXISTS refunds (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL,
  amount REAL NOT NULL,
  reason TEXT NOT NULL,
  approved_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 32. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  lab_id TEXT,
  user_id TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- info, success, warning, danger
  is_read BOOLEAN DEFAULT 0,
  link TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 33. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  lab_id TEXT,
  branch_id TEXT,
  user_id TEXT,
  user_email TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  old_values TEXT, -- JSON
  new_values TEXT, -- JSON
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 34. BACKUPS
CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY,
  lab_id TEXT,
  filename TEXT NOT NULL,
  file_size_bytes INTEGER DEFAULT 0,
  backup_type TEXT DEFAULT 'manual', -- manual, scheduled
  status TEXT DEFAULT 'completed', -- completed, failed
  error_message TEXT,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 35. LABORATORY SETTINGS
CREATE TABLE IF NOT EXISTS laboratory_settings (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  UNIQUE(lab_id, key)
);

-- 36. BRANCH SETTINGS
CREATE TABLE IF NOT EXISTS branch_settings (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  UNIQUE(branch_id, key)
);

-- 37. SAMPLE TYPES MASTER
CREATE TABLE IF NOT EXISTS sample_types (
  id TEXT PRIMARY KEY,
  lab_id TEXT, -- NULL for system global defaults
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  container TEXT NOT NULL,
  color_code TEXT,
  cap_type TEXT,
  min_volume TEXT,
  storage_requirement TEXT,
  processing_instructions TEXT,
  status TEXT DEFAULT 'active',
  created_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- 38. TEST SAMPLE REQUIREMENTS
CREATE TABLE IF NOT EXISTS test_sample_requirements (
  test_id TEXT NOT NULL,
  sample_type_id TEXT NOT NULL,
  min_volume TEXT,
  is_primary BOOLEAN DEFAULT 1,
  PRIMARY KEY (test_id, sample_type_id),
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
  FOREIGN KEY (sample_type_id) REFERENCES sample_types(id) ON DELETE CASCADE
);

-- 39. BARCODE LABELS
CREATE TABLE IF NOT EXISTS barcode_labels (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT,
  entity_type TEXT NOT NULL, -- patient, order, sample
  entity_id TEXT NOT NULL,
  barcode_text TEXT NOT NULL,
  label_type TEXT DEFAULT 'standard',
  printed_by TEXT,
  print_count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (printed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 40. INVOICE ITEMS
CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  item_type TEXT DEFAULT 'test', -- test, package, custom
  item_id TEXT,
  item_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0.0,
  discount REAL DEFAULT 0.0,
  tax REAL DEFAULT 0.0,
  total REAL NOT NULL DEFAULT 0.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- 41. DISCOUNTS
CREATE TABLE IF NOT EXISTS discounts (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  invoice_id TEXT,
  discount_type TEXT DEFAULT 'fixed', -- percentage, fixed, test_specific, package
  discount_value REAL NOT NULL DEFAULT 0.0,
  discount_amount REAL NOT NULL DEFAULT 0.0,
  reason TEXT,
  authorized_by TEXT,
  role_code TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES test_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
  FOREIGN KEY (authorized_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 42. RESULT COMMENTS
CREATE TABLE IF NOT EXISTS result_comments (
  id TEXT PRIMARY KEY,
  result_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  comment_type TEXT DEFAULT 'clinical', -- clinical, technician, pathologist, internal
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (result_id) REFERENCES results(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 43. RESULT VERIFICATIONS
CREATE TABLE IF NOT EXISTS result_verifications (
  id TEXT PRIMARY KEY,
  result_id TEXT NOT NULL,
  verified_by TEXT NOT NULL,
  status TEXT NOT NULL, -- verified, rejected, correction_requested
  remarks TEXT,
  correction_requested TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (result_id) REFERENCES results(id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 44. REPORT SIGNATURES
CREATE TABLE IF NOT EXISTS report_signatures (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  signer_id TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signer_role TEXT NOT NULL,
  signature_image_url TEXT,
  digital_hash TEXT,
  signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  FOREIGN KEY (signer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 45. EXPENSE CATEGORIES
CREATE TABLE IF NOT EXISTS expense_categories (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 46. EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT,
  category_id TEXT,
  title TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_method TEXT DEFAULT 'Cash', -- Cash, Bank Transfer, UPI, Cheque
  expense_date DATE DEFAULT CURRENT_DATE,
  payee TEXT,
  receipt_url TEXT,
  notes TEXT,
  recorded_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 47. LEDGERS
CREATE TABLE IF NOT EXISTS ledgers (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT,
  entry_type TEXT NOT NULL, -- debit, credit
  category TEXT NOT NULL, -- revenue, expense, refund, discount, transfer
  amount REAL NOT NULL,
  balance_after REAL DEFAULT 0.0,
  reference_type TEXT, -- invoice, payment, expense, refund
  reference_id TEXT,
  description TEXT,
  recorded_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 48. RECEIVABLES
CREATE TABLE IF NOT EXISTS receivables (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT,
  invoice_id TEXT,
  patient_id TEXT,
  total_amount REAL NOT NULL,
  paid_amount REAL DEFAULT 0.0,
  due_amount REAL NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'pending', -- pending, partial, overdue, written_off
  last_reminder_sent_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- 49. CASH CLOSINGS
CREATE TABLE IF NOT EXISTS cash_closings (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  shift_date DATE DEFAULT CURRENT_DATE,
  opening_cash REAL DEFAULT 0.0,
  cash_sales REAL DEFAULT 0.0,
  cash_expenses REAL DEFAULT 0.0,
  refunds_paid REAL DEFAULT 0.0,
  calculated_cash REAL DEFAULT 0.0,
  actual_cash REAL DEFAULT 0.0,
  variance REAL DEFAULT 0.0,
  closed_by TEXT NOT NULL,
  verified_by TEXT,
  status TEXT DEFAULT 'closed', -- open, closed, verified
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (closed_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 50. INVENTORY CATEGORIES
CREATE TABLE IF NOT EXISTS inventory_categories (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 51. SUPPLIERS
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  gst_number TEXT,
  payment_terms TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 52. INVENTORY ITEMS
CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  category_id TEXT,
  supplier_id TEXT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL, -- Vial, Kit, Box, Pack, Tube, Piece
  min_stock REAL DEFAULT 10,
  max_stock REAL DEFAULT 500,
  current_stock REAL DEFAULT 0,
  purchase_price REAL DEFAULT 0.0,
  selling_cost REAL DEFAULT 0.0,
  storage_temp TEXT, -- 2-8 C, Room Temp, -20 C
  location TEXT, -- Shelf A, Refrigerator 1, Freezer
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES inventory_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- 53. INVENTORY BATCHES
CREATE TABLE IF NOT EXISTS inventory_batches (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  batch_number TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  initial_quantity REAL NOT NULL,
  current_quantity REAL NOT NULL,
  unit_cost REAL DEFAULT 0.0,
  mfg_date DATE,
  supplier_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- 54. STOCK TRANSACTIONS
CREATE TABLE IF NOT EXISTS stock_transactions (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT,
  item_id TEXT NOT NULL,
  batch_id TEXT,
  transaction_type TEXT NOT NULL, -- purchase, stock_in, consumption, adjustment, transfer_in, transfer_out, damaged, expired
  quantity REAL NOT NULL,
  unit_cost REAL DEFAULT 0.0,
  total_cost REAL DEFAULT 0.0,
  reference_type TEXT, -- purchase_order, test_order, manual_adjustment, transfer
  reference_id TEXT,
  reason TEXT,
  performed_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES inventory_batches(id) ON DELETE SET NULL,
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 55. STOCK TRANSFERS
CREATE TABLE IF NOT EXISTS stock_transfers (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  from_branch_id TEXT NOT NULL,
  to_branch_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  batch_id TEXT,
  quantity REAL NOT NULL,
  status TEXT DEFAULT 'requested', -- requested, dispatched, received, rejected
  requested_by TEXT,
  dispatched_by TEXT,
  received_by TEXT,
  transfer_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  dispatch_date TIMESTAMP,
  receipt_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (from_branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (to_branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES inventory_batches(id) ON DELETE SET NULL,
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (dispatched_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 56. DOCTOR PORTAL ACCOUNTS
CREATE TABLE IF NOT EXISTS doctor_portal_accounts (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  doctor_id TEXT NOT NULL,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT 1,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  UNIQUE(lab_id, username)
);

-- 57. PATIENT PORTAL ACCOUNTS
CREATE TABLE IF NOT EXISTS patient_portal_accounts (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  username TEXT NOT NULL, -- usually mobile or PID
  password_hash TEXT NOT NULL,
  mobile TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT 1,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  UNIQUE(lab_id, username)
);

-- 58. NOTIFICATION TEMPLATES
CREATE TABLE IF NOT EXISTS notification_templates (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- new_patient, new_order, payment_received, payment_pending, sample_collected, sample_rejected, sample_processing, result_entered, result_verified, report_approved, report_released, critical_result, invoice_generated, payment_reminder, subscription_expiry, low_inventory
  channel TEXT NOT NULL, -- in_app, email, sms, whatsapp
  title_template TEXT,
  body_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 59. NOTIFICATION DELIVERIES
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  notification_id TEXT,
  channel TEXT NOT NULL, -- in_app, email, sms, whatsapp
  recipient TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed
  provider_name TEXT,
  provider_response TEXT,
  attempts INTEGER DEFAULT 1,
  error_message TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 60. COMMUNICATION PROVIDERS
CREATE TABLE IF NOT EXISTS communication_providers (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  provider_type TEXT NOT NULL, -- smtp, sms, whatsapp
  provider_name TEXT NOT NULL, -- e.g. AWS SES, SendGrid, Twilio, Msg91, Gupshup, Meta Cloud API
  config_json TEXT NOT NULL, -- Encrypted JSON credentials
  is_active BOOLEAN DEFAULT 1,
  is_default BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 61. COMMUNICATION LOGS
CREATE TABLE IF NOT EXISTS communication_logs (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  channel TEXT NOT NULL, -- email, sms, whatsapp
  provider TEXT,
  recipient TEXT NOT NULL,
  subject TEXT,
  message_preview TEXT,
  status TEXT DEFAULT 'sent', -- sent, failed, delivered
  error TEXT,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 62. REPORT TEMPLATE VERSIONS
CREATE TABLE IF NOT EXISTS report_template_versions (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  styles_json TEXT,
  header_html TEXT,
  footer_html TEXT,
  changed_by TEXT,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES report_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 63. REPORT VERIFICATION TOKENS
CREATE TABLE IF NOT EXISTS report_verification_tokens (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  patient_safe_code TEXT NOT NULL,
  expires_at TIMESTAMP,
  scan_count INTEGER DEFAULT 0,
  last_scanned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

-- 64. LABORATORY SETTINGS
CREATE TABLE IF NOT EXISTS laboratory_settings (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  setting_category TEXT NOT NULL, -- general, patient, order, sample, billing, report, notification, security, system
  setting_key TEXT NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  UNIQUE(lab_id, setting_category, setting_key)
);

-- 65. BRANCH SETTINGS
CREATE TABLE IF NOT EXISTS branch_settings (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  UNIQUE(branch_id, setting_key)
);

-- 66. SUBSCRIPTION FEATURES
CREATE TABLE IF NOT EXISTS subscription_features (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  feature_key TEXT NOT NULL, -- inventory, accounting, doctor_portal, patient_portal, whatsapp, sms, advanced_analytics, custom_reports, api_access
  feature_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT 1,
  quota_limit INTEGER DEFAULT -1, -- -1 = unlimited
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE,
  UNIQUE(plan_id, feature_key)
);

-- 67. FEATURE USAGE
CREATE TABLE IF NOT EXISTS feature_usage (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  reset_date DATE DEFAULT CURRENT_DATE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  UNIQUE(lab_id, feature_key)
);

-- 68. ANALYTICS REPORTS
CREATE TABLE IF NOT EXISTS analytics_reports (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  report_code TEXT NOT NULL,
  report_name TEXT NOT NULL,
  category TEXT NOT NULL, -- clinical, financial, operational, audit
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 69. REPORT FILTERS
CREATE TABLE IF NOT EXISTS report_filters (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  report_code TEXT NOT NULL,
  filter_name TEXT NOT NULL,
  filter_criteria TEXT NOT NULL, -- JSON string of saved filter values
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- INDEXES for high query performance
CREATE INDEX IF NOT EXISTS idx_patients_lab ON patients(lab_id);
CREATE INDEX IF NOT EXISTS idx_patients_mobile ON patients(mobile);
CREATE INDEX IF NOT EXISTS idx_patients_code ON patients(patient_id_code);
CREATE INDEX IF NOT EXISTS idx_orders_lab ON test_orders(lab_id);
CREATE INDEX IF NOT EXISTS idx_orders_patient ON test_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON test_orders(status);
CREATE INDEX IF NOT EXISTS idx_samples_barcode ON samples(sample_barcode);
CREATE INDEX IF NOT EXISTS idx_samples_order ON samples(order_id);
CREATE INDEX IF NOT EXISTS idx_results_order ON results(order_id);
CREATE INDEX IF NOT EXISTS idx_reports_order ON reports(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_audit_lab ON audit_logs(lab_id);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sample_types_lab ON sample_types(lab_id);
CREATE INDEX IF NOT EXISTS idx_barcode_labels_entity ON barcode_labels(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_discounts_order ON discounts(order_id);
CREATE INDEX IF NOT EXISTS idx_result_comments_result ON result_comments(result_id);
CREATE INDEX IF NOT EXISTS idx_result_verifications_result ON result_verifications(result_id);
CREATE INDEX IF NOT EXISTS idx_report_signatures_report ON report_signatures(report_id);

-- Phase 5 Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_lab ON expenses(lab_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_ledgers_lab ON ledgers(lab_id);
CREATE INDEX IF NOT EXISTS idx_receivables_lab ON receivables(lab_id);
CREATE INDEX IF NOT EXISTS idx_cash_closings_branch ON cash_closings(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_lab ON inventory_items(lab_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_item ON inventory_batches(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_trans_item ON stock_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_lab ON stock_transfers(lab_id);
CREATE INDEX IF NOT EXISTS idx_doctor_portal_doctor ON doctor_portal_accounts(doctor_id);
CREATE INDEX IF NOT EXISTS idx_patient_portal_patient ON patient_portal_accounts(patient_id);
CREATE INDEX IF NOT EXISTS idx_notif_templates_lab ON notification_templates(lab_id);
CREATE INDEX IF NOT EXISTS idx_comm_providers_lab ON communication_providers(lab_id);
CREATE INDEX IF NOT EXISTS idx_verify_tokens_token ON report_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_lab_settings_lab ON laboratory_settings(lab_id);

-- ==========================================
-- PHASE 6 ENTERPRISE LIS & ANALYZER INTEGRATION SCHEMA
-- ==========================================

-- 70. ANALYZERS MASTER
CREATE TABLE IF NOT EXISTS analyzers (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT,
  name TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT,
  department TEXT NOT NULL, -- Hematology, Biochemistry, Immunology, Coagulation, etc.
  connection_type TEXT DEFAULT 'tcp', -- tcp, serial, file, http
  protocol TEXT DEFAULT 'hl7', -- hl7, astm, json, csv
  ip_address TEXT,
  port INTEGER,
  status TEXT DEFAULT 'offline', -- online, offline, maintenance, error, disabled
  installation_date DATE,
  calibration_date DATE,
  maintenance_schedule TEXT DEFAULT 'monthly', -- daily, weekly, monthly, quarterly, annual
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

-- 71. ANALYZER CONNECTIONS & REAL-TIME TELEMETRY
CREATE TABLE IF NOT EXISTS analyzer_connections (
  id TEXT PRIMARY KEY,
  analyzer_id TEXT NOT NULL,
  status TEXT DEFAULT 'disconnected', -- connected, disconnected, error, listening
  last_heartbeat TIMESTAMP,
  error_message TEXT,
  latency_ms INTEGER DEFAULT 0,
  packets_sent INTEGER DEFAULT 0,
  packets_received INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (analyzer_id) REFERENCES analyzers(id) ON DELETE CASCADE
);

-- 72. ANALYZER TEST MAPPINGS
CREATE TABLE IF NOT EXISTS analyzer_test_mappings (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  analyzer_id TEXT NOT NULL,
  test_id TEXT NOT NULL,
  parameter_id TEXT NOT NULL,
  analyzer_test_code TEXT NOT NULL, -- e.g. HGB, WBC, GLUC, CREA
  analyzer_parameter_name TEXT,
  loinc_code TEXT,
  unit TEXT,
  decimal_precision INTEGER DEFAULT 2,
  conversion_formula TEXT, -- optional math expression e.g. "value * 1.0"
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (analyzer_id) REFERENCES analyzers(id) ON DELETE CASCADE,
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
  FOREIGN KEY (parameter_id) REFERENCES test_parameters(id) ON DELETE CASCADE,
  UNIQUE(analyzer_id, analyzer_test_code)
);

-- 73. ANALYZER RAW COMMUNICATION MESSAGES
CREATE TABLE IF NOT EXISTS analyzer_messages (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  analyzer_id TEXT NOT NULL,
  direction TEXT NOT NULL, -- inbound, outbound
  protocol TEXT NOT NULL, -- astm, hl7, json, csv
  raw_message TEXT NOT NULL,
  parsed_json TEXT,
  status TEXT DEFAULT 'received', -- received, parsed, failed, processed
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (analyzer_id) REFERENCES analyzers(id) ON DELETE CASCADE
);

-- 74. ANALYZER IMPORTED RESULTS QUEUE
CREATE TABLE IF NOT EXISTS analyzer_results (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  analyzer_id TEXT NOT NULL,
  message_id TEXT,
  sample_barcode TEXT NOT NULL,
  accession_number TEXT,
  analyzer_test_code TEXT NOT NULL,
  raw_value TEXT NOT NULL,
  parsed_value REAL,
  unit TEXT,
  flag TEXT DEFAULT 'normal', -- normal, low, high, critical_low, critical_high, abnormal
  test_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'pending', -- pending, imported, matched, discarded, validation_failed
  matched_result_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (analyzer_id) REFERENCES analyzers(id) ON DELETE CASCADE,
  FOREIGN KEY (message_id) REFERENCES analyzer_messages(id) ON DELETE SET NULL
);

-- 75. HL7 MESSAGES AUDIT & TRANSACTION LOG
CREATE TABLE IF NOT EXISTS hl7_messages (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  direction TEXT NOT NULL, -- inbound, outbound
  message_type TEXT NOT NULL, -- ORU_R01, OML_O21, ACK
  control_id TEXT NOT NULL,
  raw_hl7 TEXT NOT NULL,
  parsed_segments TEXT,
  ack_code TEXT DEFAULT 'AA', -- AA (Accepted), AE (Error), AR (Rejected)
  status TEXT DEFAULT 'processed',
  error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 76. RESULT VALIDATION RULES
CREATE TABLE IF NOT EXISTS result_validation_rules (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  test_id TEXT NOT NULL,
  parameter_id TEXT NOT NULL,
  rule_type TEXT NOT NULL, -- range, numeric, text, delta, qc, calculation
  config_json TEXT NOT NULL,
  action TEXT DEFAULT 'flag', -- auto_validate, hold, flag, reject, repeat
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
  FOREIGN KEY (parameter_id) REFERENCES test_parameters(id) ON DELETE CASCADE
);

-- 77. DELTA CHECK RULES (HISTORICAL VARIATION)
CREATE TABLE IF NOT EXISTS delta_check_rules (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  test_id TEXT NOT NULL,
  parameter_id TEXT NOT NULL,
  max_percent_change REAL,
  max_absolute_change REAL,
  lookback_days INTEGER DEFAULT 30,
  action TEXT DEFAULT 'flag', -- flag, hold, notify, critical
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
  FOREIGN KEY (parameter_id) REFERENCES test_parameters(id) ON DELETE CASCADE,
  UNIQUE(lab_id, parameter_id)
);

-- 78. AUTO-VALIDATION RULES
CREATE TABLE IF NOT EXISTS auto_validation_rules (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT,
  department TEXT,
  test_id TEXT,
  allow_auto_validate BOOLEAN DEFAULT 1,
  require_in_range BOOLEAN DEFAULT 1,
  require_qc_pass BOOLEAN DEFAULT 1,
  require_no_delta BOOLEAN DEFAULT 1,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
);

-- 79. REFLEX TESTING RULES
CREATE TABLE IF NOT EXISTS reflex_test_rules (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  trigger_test_id TEXT NOT NULL,
  trigger_parameter_id TEXT NOT NULL,
  condition_operator TEXT NOT NULL, -- gt, lt, eq, between, abnormal, critical
  threshold_low REAL,
  threshold_high REAL,
  reflex_test_id TEXT NOT NULL,
  auto_order BOOLEAN DEFAULT 1,
  require_approval BOOLEAN DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (trigger_test_id) REFERENCES tests(id) ON DELETE CASCADE,
  FOREIGN KEY (trigger_parameter_id) REFERENCES test_parameters(id) ON DELETE CASCADE,
  FOREIGN KEY (reflex_test_id) REFERENCES tests(id) ON DELETE CASCADE
);

-- 80. CLINICAL CALCULATION FORMULAS
CREATE TABLE IF NOT EXISTS calculation_formulas (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  test_id TEXT NOT NULL,
  target_parameter_id TEXT NOT NULL,
  formula_name TEXT NOT NULL,
  formula_expression TEXT NOT NULL, -- e.g. "chol - hdl - (trig / 5)"
  formula_variables TEXT NOT NULL, -- JSON mapping variable names to parameter IDs
  decimal_precision INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT 1,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
  FOREIGN KEY (target_parameter_id) REFERENCES test_parameters(id) ON DELETE CASCADE
);

-- 81. QUALITY CONTROL MATERIALS
CREATE TABLE IF NOT EXISTS qc_materials (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  name TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  level TEXT NOT NULL, -- Level 1 (Low), Level 2 (Normal), Level 3 (High)
  storage_temp TEXT DEFAULT '2-8 C',
  notes TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 82. QUALITY CONTROL LOTS
CREATE TABLE IF NOT EXISTS qc_lots (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  material_id TEXT NOT NULL,
  lot_number TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  opened_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES qc_materials(id) ON DELETE CASCADE,
  UNIQUE(lab_id, lot_number)
);

-- 83. QUALITY CONTROL TARGET VALUES & STATS
CREATE TABLE IF NOT EXISTS qc_targets (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  lot_id TEXT NOT NULL,
  analyzer_id TEXT,
  test_id TEXT NOT NULL,
  parameter_id TEXT NOT NULL,
  mean REAL NOT NULL,
  sd REAL NOT NULL,
  cv_percent REAL NOT NULL,
  min_acceptable REAL NOT NULL,
  max_acceptable REAL NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (lot_id) REFERENCES qc_lots(id) ON DELETE CASCADE,
  FOREIGN KEY (analyzer_id) REFERENCES analyzers(id) ON DELETE SET NULL,
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
  FOREIGN KEY (parameter_id) REFERENCES test_parameters(id) ON DELETE CASCADE
);

-- 84. QUALITY CONTROL RESULTS RUNS
CREATE TABLE IF NOT EXISTS qc_results (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  lot_id TEXT NOT NULL,
  analyzer_id TEXT,
  test_id TEXT NOT NULL,
  parameter_id TEXT NOT NULL,
  value REAL NOT NULL,
  z_score REAL NOT NULL,
  status TEXT DEFAULT 'pass', -- pass, warning, reject
  rule_violations TEXT, -- JSON array of violated Westgard rules: 1_2s, 1_3s, 2_2s, R_4s, 4_1s, 10_x
  run_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  entered_by TEXT,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (lot_id) REFERENCES qc_lots(id) ON DELETE CASCADE,
  FOREIGN KEY (analyzer_id) REFERENCES analyzers(id) ON DELETE SET NULL,
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
  FOREIGN KEY (parameter_id) REFERENCES test_parameters(id) ON DELETE CASCADE,
  FOREIGN KEY (entered_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 85. QUALITY CONTROL FAILURES & CAPA WORKFLOW
CREATE TABLE IF NOT EXISTS qc_failures (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  qc_result_id TEXT,
  lot_id TEXT NOT NULL,
  analyzer_id TEXT,
  test_id TEXT NOT NULL,
  parameter_id TEXT NOT NULL,
  rule_violated TEXT NOT NULL,
  root_cause TEXT,
  corrective_action TEXT,
  preventive_action TEXT,
  status TEXT DEFAULT 'open', -- open, under_investigation, resolved
  resolved_by TEXT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (qc_result_id) REFERENCES qc_results(id) ON DELETE SET NULL,
  FOREIGN KEY (lot_id) REFERENCES qc_lots(id) ON DELETE CASCADE,
  FOREIGN KEY (analyzer_id) REFERENCES analyzers(id) ON DELETE SET NULL,
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
  FOREIGN KEY (parameter_id) REFERENCES test_parameters(id) ON DELETE CASCADE,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 86. LABORATORY EQUIPMENT ASSET MASTER
CREATE TABLE IF NOT EXISTS equipment (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT,
  asset_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- analyzer, centrifuge, microscope, refrigerator, freezer, incubator, ups, printer, other
  manufacturer TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT,
  purchase_date DATE,
  warranty_expiry DATE,
  location TEXT,
  service_provider TEXT,
  contact_phone TEXT,
  status TEXT DEFAULT 'operational', -- operational, maintenance, repair, offline
  next_maintenance_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  UNIQUE(lab_id, asset_id)
);

-- 87. EQUIPMENT MAINTENANCE & SERVICE LOGS
CREATE TABLE IF NOT EXISTS equipment_maintenance (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  equipment_id TEXT NOT NULL,
  maintenance_type TEXT NOT NULL, -- preventive, corrective, calibration, emergency
  scheduled_date DATE NOT NULL,
  completed_date DATE,
  performed_by_vendor TEXT,
  service_cost REAL DEFAULT 0.0,
  downtime_hours REAL DEFAULT 0.0,
  work_summary TEXT,
  next_due_date DATE,
  status TEXT DEFAULT 'scheduled', -- scheduled, in_progress, completed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
);

-- 88. CALIBRATION RECORDS & SCHEDULES
CREATE TABLE IF NOT EXISTS calibrations (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  analyzer_id TEXT,
  test_id TEXT,
  calibrator_lot TEXT NOT NULL,
  calibration_date DATE NOT NULL,
  expiry_date DATE,
  next_due_date DATE NOT NULL,
  status TEXT DEFAULT 'passed', -- passed, failed, pending
  performed_by TEXT,
  verified_by TEXT,
  results_json TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (analyzer_id) REFERENCES analyzers(id) ON DELETE SET NULL,
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE SET NULL,
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 89. REAGENT LOTS TRACKING
CREATE TABLE IF NOT EXISTS reagent_lots (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  analyzer_id TEXT,
  lot_number TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  quantity_received REAL NOT NULL,
  quantity_remaining REAL NOT NULL,
  storage_location TEXT,
  status TEXT DEFAULT 'active', -- quarantine, active, depleted, expired
  opened_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
  FOREIGN KEY (analyzer_id) REFERENCES analyzers(id) ON DELETE SET NULL,
  UNIQUE(lab_id, item_id, lot_number)
);

-- 90. SAMPLE ACCESSION & ALIQUOTS
CREATE TABLE IF NOT EXISTS sample_aliquots (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  parent_sample_id TEXT NOT NULL,
  aliquot_barcode TEXT UNIQUE NOT NULL,
  aliquot_type TEXT NOT NULL, -- serum_aliquot, plasma_aliquot, backup_aliquot
  volume_ml REAL DEFAULT 1.0,
  tube_type TEXT,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_sample_id) REFERENCES samples(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 91. SAMPLE STORAGE LOCATIONS & DISPOSAL
CREATE TABLE IF NOT EXISTS sample_locations (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT,
  sample_id TEXT NOT NULL,
  rack_number TEXT NOT NULL,
  position_in_rack TEXT NOT NULL,
  storage_refrigerator TEXT,
  storage_shelf TEXT,
  storage_temp TEXT DEFAULT '2-8 C',
  stored_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  disposed_at TIMESTAMP,
  disposal_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE CASCADE
);

-- 92. TURNAROUND TIME (TAT) TRACKING & SLA RECORDS
CREATE TABLE IF NOT EXISTS tat_records (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT,
  order_id TEXT NOT NULL,
  test_id TEXT NOT NULL,
  registered_at TIMESTAMP NOT NULL,
  collected_at TIMESTAMP,
  received_at TIMESTAMP,
  processed_at TIMESTAMP,
  result_entered_at TIMESTAMP,
  verified_at TIMESTAMP,
  report_approved_at TIMESTAMP,
  total_tat_minutes INTEGER DEFAULT 0,
  sla_minutes INTEGER DEFAULT 240, -- default 4 hours
  is_sla_breached BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (order_id) REFERENCES test_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
);

-- 93. CLINICAL & SYSTEM ALERT RULES
CREATE TABLE IF NOT EXISTS alert_rules (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  alert_type TEXT NOT NULL, -- critical_result, qc_failure, analyzer_offline, calibration_due, maintenance_due, tat_breach, low_reagent
  severity TEXT DEFAULT 'warning', -- info, warning, critical
  notify_roles TEXT, -- JSON array of role codes
  notify_channels TEXT, -- JSON array: in_app, email, sms, whatsapp
  escalation_minutes INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 94. ACTIVE ALERTS NOTIFICATION FEED
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  alert_rule_id TEXT,
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  entity_type TEXT, -- result, analyzer, qc, equipment
  entity_id TEXT,
  severity TEXT DEFAULT 'warning',
  status TEXT DEFAULT 'unread', -- unread, acknowledged, escalated, resolved
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (alert_rule_id) REFERENCES alert_rules(id) ON DELETE SET NULL,
  FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 95. DEVELOPER API KEYS
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  api_key_prefix TEXT NOT NULL,
  permissions TEXT NOT NULL, -- JSON array of granted API permissions
  ip_whitelist TEXT,
  rate_limit_rpm INTEGER DEFAULT 120,
  is_active BOOLEAN DEFAULT 1,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 96. DEVELOPER API REQUEST LOGS
CREATE TABLE IF NOT EXISTS api_logs (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  api_key_id TEXT,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  ip_address TEXT,
  request_body TEXT,
  response_body TEXT,
  latency_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL
);

-- 97. OUTGOING WEBHOOK SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target_url TEXT NOT NULL,
  secret TEXT NOT NULL, -- HMAC-SHA256 signing secret
  subscribed_events TEXT NOT NULL, -- JSON array: order.created, result.imported, report.released, etc.
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 98. WEBHOOK DISPATCH DELIVERIES
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  webhook_id TEXT NOT NULL,
  event TEXT NOT NULL,
  payload TEXT NOT NULL,
  status_code INTEGER,
  attempts INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending', -- pending, success, failed, retrying
  error_message TEXT,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE
);

-- 99. ENTERPRISE SECURITY EVENTS AUDIT
CREATE TABLE IF NOT EXISTS security_events (
  id TEXT PRIMARY KEY,
  lab_id TEXT,
  user_id TEXT,
  event_type TEXT NOT NULL, -- login_failed, brute_force_lockout, session_revoked, unauthorized_access, ip_change
  ip_address TEXT,
  user_agent TEXT,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 100. MULTI-LANGUAGE TRANSLATIONS
CREATE TABLE IF NOT EXISTS translations (
  id TEXT PRIMARY KEY,
  language_code TEXT NOT NULL, -- en, hi, etc.
  translation_key TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(language_code, translation_key)
);

-- 101. MULTI-CURRENCY ENGINE
CREATE TABLE IF NOT EXISTS currencies (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL, -- INR, USD, EUR, GBP, AED
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  exchange_rate_to_inr REAL DEFAULT 1.0,
  decimal_places INTEGER DEFAULT 2,
  is_default BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Phase 6 Performance Indexes
CREATE INDEX IF NOT EXISTS idx_analyzers_lab ON analyzers(lab_id);
CREATE INDEX IF NOT EXISTS idx_analyzers_status ON analyzers(status);
CREATE INDEX IF NOT EXISTS idx_test_mappings_analyzer ON analyzer_test_mappings(analyzer_id);
CREATE INDEX IF NOT EXISTS idx_analyzer_results_barcode ON analyzer_results(sample_barcode);
CREATE INDEX IF NOT EXISTS idx_analyzer_results_status ON analyzer_results(status);
CREATE INDEX IF NOT EXISTS idx_hl7_messages_control ON hl7_messages(control_id);
CREATE INDEX IF NOT EXISTS idx_qc_results_lot ON qc_results(lot_id);
CREATE INDEX IF NOT EXISTS idx_qc_results_time ON qc_results(run_time);
CREATE INDEX IF NOT EXISTS idx_equipment_lab ON equipment(lab_id);
CREATE INDEX IF NOT EXISTS idx_calibrations_due ON calibrations(next_due_date);
CREATE INDEX IF NOT EXISTS idx_reagent_lots_item ON reagent_lots(item_id);
CREATE INDEX IF NOT EXISTS idx_sample_aliquots_parent ON sample_aliquots(parent_sample_id);
CREATE INDEX IF NOT EXISTS idx_tat_records_order ON tat_records(order_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(api_key_hash);
CREATE INDEX IF NOT EXISTS idx_webhooks_lab ON webhooks(lab_id);

-- ============================================================
-- PHASE 7: ENTERPRISE COMMAND CENTER, MULTI-LAB & AI ASSISTANT
-- ============================================================

-- 102. ORGANIZATIONS (MULTI-LAB PARENT)
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  billing_currency TEXT DEFAULT 'INR',
  contact_email TEXT,
  contact_phone TEXT,
  headquarters_address TEXT,
  status TEXT DEFAULT 'active', -- active, suspended, trial
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 103. ORGANIZATION LABORATORIES
CREATE TABLE IF NOT EXISTS organization_laboratories (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  lab_id TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT 0,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  UNIQUE(organization_id, lab_id)
);

-- 104. ORGANIZATION USERS (CENTRAL GOVERNANCE)
CREATE TABLE IF NOT EXISTS organization_users (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role_code TEXT NOT NULL, -- org_admin, org_director, org_auditor
  cross_lab_access BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(organization_id, user_id)
);

-- 105. AI CLINICAL INFERENCE AUDIT EVENTS
CREATE TABLE IF NOT EXISTS ai_events (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  user_id TEXT,
  feature_code TEXT NOT NULL, -- trend_analysis, report_draft, anomaly_detection, tat_prediction, workload_balance, qc_anomaly
  model_name TEXT NOT NULL,
  prompt_hash TEXT,
  tokens_used INTEGER DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  input_context_id TEXT, -- e.g. result_id, order_id, lot_id
  status TEXT DEFAULT 'completed', -- completed, failed, filtered
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 106. AI ASSISTIVE SUGGESTIONS (CLEARLY LABELED NON-DIAGNOSTIC)
CREATE TABLE IF NOT EXISTS ai_suggestions (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- result, report, order, patient, qc, analyzer, inventory
  entity_id TEXT NOT NULL,
  suggestion_type TEXT NOT NULL, -- comment_suggestion, trend_flag, anomaly_alert, tat_forecast, inventory_reorder
  suggestion_label TEXT DEFAULT 'AI-Generated Suggestion',
  content_text TEXT NOT NULL,
  confidence_score REAL DEFAULT 0.85,
  metadata_json TEXT, -- structured JSON
  status TEXT DEFAULT 'pending', -- pending, accepted, edited, rejected, ignored
  reviewed_by TEXT,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 107. AI PROFESSIONAL FEEDBACK & HUMAN DECISION LOG
CREATE TABLE IF NOT EXISTS ai_feedback (
  id TEXT PRIMARY KEY,
  suggestion_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  decision TEXT NOT NULL, -- accepted, edited, rejected, ignored
  edited_text TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (suggestion_id) REFERENCES ai_suggestions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 108. AI CLINICAL RULES & CONFIGURATION
CREATE TABLE IF NOT EXISTS ai_rules (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  feature_code TEXT NOT NULL,
  trigger_condition TEXT NOT NULL, -- e.g. on_abnormal_result, on_stat_order, on_qc_shift
  is_enabled BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 109. PREDICTIVE TAT & SLA RISK SCORES
CREATE TABLE IF NOT EXISTS tat_predictions (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  test_id TEXT NOT NULL,
  predicted_completion_at TIMESTAMP NOT NULL,
  sla_target_at TIMESTAMP NOT NULL,
  delay_risk_level TEXT DEFAULT 'low', -- low, medium, high, critical
  delay_risk_score REAL DEFAULT 0.1, -- 0.0 to 1.0
  bottleneck_reason TEXT,
  recommended_action TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES test_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
);

-- 110. WORKLOAD ASSIGNMENTS & CAPACITY BALANCING
CREATE TABLE IF NOT EXISTS workload_assignments (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT,
  user_id TEXT NOT NULL,
  role_type TEXT NOT NULL, -- technician, pathologist
  department TEXT NOT NULL,
  active_tests_count INTEGER DEFAULT 0,
  pending_verifications_count INTEGER DEFAULT 0,
  sla_score REAL DEFAULT 95.0,
  shift_status TEXT DEFAULT 'on_duty', -- on_duty, on_break, off_duty
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 111. PREDICTIVE INVENTORY CONSUMPTION FORECASTS
CREATE TABLE IF NOT EXISTS inventory_forecasts (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  current_stock INTEGER NOT NULL,
  daily_burn_rate REAL DEFAULT 1.0,
  predicted_days_remaining REAL DEFAULT 30.0,
  recommended_reorder_qty INTEGER DEFAULT 10,
  reorder_urgency TEXT DEFAULT 'normal', -- normal, urgent, critical
  forecast_date DATE DEFAULT CURRENT_DATE,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
);

-- 112. QC LEVEY-JENNINGS ANOMALIES
CREATE TABLE IF NOT EXISTS qc_anomalies (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  lot_id TEXT NOT NULL,
  analyzer_id TEXT,
  anomaly_type TEXT NOT NULL, -- drift, shift, excessive_cv, westgard_cluster
  description TEXT NOT NULL,
  suggested_action TEXT,
  status TEXT DEFAULT 'open', -- open, under_investigation, resolved
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_by TEXT,
  resolved_at TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (lot_id) REFERENCES qc_lots(id) ON DELETE CASCADE,
  FOREIGN KEY (analyzer_id) REFERENCES analyzers(id) ON DELETE SET NULL,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 113. ANALYZER COMMUNICATION & ERROR ANOMALIES
CREATE TABLE IF NOT EXISTS analyzer_anomalies (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  analyzer_id TEXT NOT NULL,
  anomaly_type TEXT NOT NULL, -- comm_failure, error_spike, abnormal_tat, rejected_packets
  incident_count INTEGER DEFAULT 1,
  severity TEXT DEFAULT 'warning', -- info, warning, critical
  description TEXT NOT NULL,
  suggested_action TEXT,
  status TEXT DEFAULT 'open', -- open, resolved
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (analyzer_id) REFERENCES analyzers(id) ON DELETE CASCADE
);

-- 114. SECURE DOCUMENT REPOSITORY
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT,
  category TEXT NOT NULL, -- license, calibration_cert, maintenance_doc, supplier_doc, qc_doc, patient_attachment
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes INTEGER DEFAULT 0,
  mime_type TEXT DEFAULT 'application/pdf',
  version INTEGER DEFAULT 1,
  expiry_date DATE,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 115. DOCUMENT HISTORICAL VERSIONS
CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  change_summary TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 116. DOCUMENT ACCESS & DOWNLOAD AUDIT LOGS
CREATE TABLE IF NOT EXISTS document_access_logs (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL, -- view, download, preview
  ip_address TEXT,
  accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 117. MOBILE DEVICE REGISTRY
CREATE TABLE IF NOT EXISTS mobile_devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  lab_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  platform TEXT NOT NULL, -- ios, android, pwa
  app_version TEXT NOT NULL,
  push_token TEXT,
  is_trusted BOOLEAN DEFAULT 1,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 118. OFFLINE TRANSACTIONS SYNC QUEUE
CREATE TABLE IF NOT EXISTS offline_transactions (
  id TEXT PRIMARY KEY, -- client generated UUID
  lab_id TEXT NOT NULL,
  branch_id TEXT,
  device_id TEXT NOT NULL,
  action_type TEXT NOT NULL, -- sample_collection, barcode_scan, basic_order, status_update
  payload_json TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, syncing, completed, failed, conflict
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  queued_at TIMESTAMP NOT NULL,
  synced_at TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (device_id) REFERENCES mobile_devices(id) ON DELETE CASCADE
);

-- 119. OFFLINE SYNC CONFLICTS
CREATE TABLE IF NOT EXISTS sync_conflicts (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  server_version_json TEXT NOT NULL,
  client_version_json TEXT NOT NULL,
  conflict_field TEXT,
  resolution_strategy TEXT DEFAULT 'manual', -- server_wins, client_wins, manual_merge
  status TEXT DEFAULT 'unresolved', -- unresolved, resolved
  resolved_by TEXT,
  resolved_at TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES offline_transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 120. WHITE-LABEL MULTI-TENANT BRANDING SETTINGS
CREATE TABLE IF NOT EXISTS white_label_settings (
  id TEXT PRIMARY KEY,
  lab_id TEXT, -- NULL if global default
  organization_id TEXT,
  brand_name TEXT NOT NULL,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#0284c7',
  secondary_color TEXT DEFAULT '#0f172a',
  accent_color TEXT DEFAULT '#38bdf8',
  custom_css TEXT,
  report_header_html TEXT,
  report_footer_html TEXT,
  login_banner_url TEXT,
  support_email TEXT,
  support_phone TEXT,
  terms_url TEXT,
  privacy_url TEXT,
  is_active BOOLEAN DEFAULT 1,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- 121. CUSTOM DOMAINS (PORTAL ROUTING)
CREATE TABLE IF NOT EXISTS custom_domains (
  id TEXT PRIMARY KEY,
  lab_id TEXT,
  organization_id TEXT,
  domain_name TEXT UNIQUE NOT NULL, -- e.g. portal.apexdiagnostics.com
  ssl_status TEXT DEFAULT 'active', -- pending, active, failed
  dns_verified BOOLEAN DEFAULT 1,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- 122. ENTERPRISE MULTI-STEP APPROVAL WORKFLOWS
CREATE TABLE IF NOT EXISTS approval_workflows (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  workflow_type TEXT NOT NULL, -- discount, refund, report_amendment, inventory_adjustment, config_change
  name TEXT NOT NULL,
  description TEXT,
  steps_count INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 123. APPROVAL WORKFLOW STEPS
CREATE TABLE IF NOT EXISTS approval_steps (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  required_role TEXT NOT NULL, -- lab_admin, pathologist, accountant, super_admin
  step_name TEXT NOT NULL,
  approval_mode TEXT DEFAULT 'single', -- single, all
  FOREIGN KEY (workflow_id) REFERENCES approval_workflows(id) ON DELETE CASCADE
);

-- 124. APPROVAL REQUESTS RUNTIME
CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  workflow_id TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- discount, invoice_refund, report, inventory_item, config
  entity_id TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  current_step INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  request_payload TEXT, -- JSON details
  decision_notes TEXT,
  history_json TEXT DEFAULT '[]', -- JSON array of approval step audit entries
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (workflow_id) REFERENCES approval_workflows(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 125. ACTIVE USER SESSIONS & REMOTE TERMINATION
CREATE TABLE IF NOT EXISTS active_sessions (
  id TEXT PRIMARY KEY, -- session token hash / id
  user_id TEXT NOT NULL,
  lab_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT DEFAULT 'desktop',
  login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_revoked BOOLEAN DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 126. ENTERPRISE FEATURE FLAGS
CREATE TABLE IF NOT EXISTS feature_flags (
  id TEXT PRIMARY KEY,
  flag_key TEXT UNIQUE NOT NULL, -- ai_assistant, mobile_sync, offline_mode, hl7_gateway, white_label, custom_domains
  name TEXT NOT NULL,
  description TEXT,
  scope TEXT DEFAULT 'global', -- global, organization, laboratory
  is_enabled BOOLEAN DEFAULT 1,
  rollout_percentage INTEGER DEFAULT 100,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 127. CONFIGURATION VERSIONING & ROLLBACK
CREATE TABLE IF NOT EXISTS configuration_versions (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  config_type TEXT NOT NULL, -- reference_ranges, calculations, qc_rules, analyzer_mappings
  version_number INTEGER NOT NULL,
  config_json TEXT NOT NULL,
  change_summary TEXT,
  effective_date DATE DEFAULT CURRENT_DATE,
  created_by TEXT NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Phase 7 Performance Indexes
CREATE INDEX IF NOT EXISTS idx_org_labs_org ON organization_laboratories(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_users_user ON organization_users(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_events_lab ON ai_events(lab_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_entity ON ai_suggestions(entity_id);
CREATE INDEX IF NOT EXISTS idx_tat_predictions_order ON tat_predictions(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_forecasts_item ON inventory_forecasts(item_id);
CREATE INDEX IF NOT EXISTS idx_documents_lab ON documents(lab_id);
CREATE INDEX IF NOT EXISTS idx_offline_tx_device ON offline_transactions(device_id);
CREATE INDEX IF NOT EXISTS idx_approval_req_lab ON approval_requests(lab_id);
CREATE INDEX IF NOT EXISTS idx_approval_req_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(flag_key);

-- ==============================================================================
-- PHASE 9: SMART OPERATIONS, AUTOMATION, PROCUREMENT, CRM, FIELD, QMS & PRICING
-- ==============================================================================

-- 128. CENTRALIZED ENTERPRISE TASKS
CREATE TABLE IF NOT EXISTS enterprise_tasks (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT,
  task_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  source_type TEXT NOT NULL,
  source_id TEXT,
  department TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  assigned_to TEXT,
  assigned_role TEXT,
  sla_hours INTEGER DEFAULT 24,
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  created_by TEXT,
  completed_by TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- 129. TASK COMMENTS & ATTACHMENTS
CREATE TABLE IF NOT EXISTS task_comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  comment TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES enterprise_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 130. NO-CODE / LOW-CODE AUTOMATION RULES
CREATE TABLE IF NOT EXISTS automation_rules (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL,
  conditions_json TEXT NOT NULL,
  actions_json TEXT NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  version INTEGER DEFAULT 1,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMP,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 131. AUTOMATION EXECUTIONS LOG
CREATE TABLE IF NOT EXISTS automation_executions (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  lab_id TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  trigger_entity_id TEXT,
  condition_result BOOLEAN NOT NULL,
  actions_executed_json TEXT,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rule_id) REFERENCES automation_rules(id) ON DELETE CASCADE
);

-- 132. SCHEDULED AUTOMATION JOBS
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  job_name TEXT NOT NULL,
  job_type TEXT NOT NULL,
  cron_schedule TEXT NOT NULL,
  timezone TEXT DEFAULT 'Asia/Kolkata',
  recipient_emails TEXT,
  delivery_channel TEXT DEFAULT 'email',
  is_active BOOLEAN DEFAULT 1,
  last_execution_status TEXT,
  last_executed_at TIMESTAMP,
  next_execution_at TIMESTAMP,
  failure_count INTEGER DEFAULT 0,
  last_error_log TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 133. PROCUREMENT SUPPLIERS
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  supplier_code TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  tax_number TEXT,
  pan_number TEXT,
  payment_terms TEXT DEFAULT 'net_30',
  bank_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  rating REAL DEFAULT 5.0,
  categories_json TEXT DEFAULT '[]',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 134. PROCUREMENT PURCHASE REQUESTS
CREATE TABLE IF NOT EXISTS procurement_requests (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT,
  request_number TEXT UNIQUE NOT NULL,
  requested_by TEXT NOT NULL,
  department TEXT,
  urgency TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  items_json TEXT NOT NULL,
  justification TEXT,
  approved_by TEXT,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 135. SUPPLIER QUOTATIONS
CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  request_id TEXT,
  supplier_id TEXT NOT NULL,
  quotation_number TEXT NOT NULL,
  quotation_date DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  items_json TEXT NOT NULL,
  total_amount REAL NOT NULL,
  currency TEXT DEFAULT 'INR',
  payment_terms TEXT,
  status TEXT DEFAULT 'received',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

-- 136. PURCHASE ORDERS
CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT,
  po_number TEXT UNIQUE NOT NULL,
  supplier_id TEXT NOT NULL,
  request_id TEXT,
  po_date DATE DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  subtotal REAL NOT NULL DEFAULT 0.0,
  tax_amount REAL NOT NULL DEFAULT 0.0,
  discount_amount REAL NOT NULL DEFAULT 0.0,
  total_amount REAL NOT NULL DEFAULT 0.0,
  payment_terms TEXT,
  notes TEXT,
  approval_status TEXT DEFAULT 'draft',
  approved_by TEXT,
  approved_at TIMESTAMP,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

-- 137. PURCHASE ORDER LINE ITEMS
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id TEXT PRIMARY KEY,
  po_id TEXT NOT NULL,
  item_id TEXT,
  item_name TEXT NOT NULL,
  sku TEXT,
  quantity INTEGER NOT NULL,
  received_quantity INTEGER DEFAULT 0,
  unit_price REAL NOT NULL,
  tax_percentage REAL DEFAULT 0.0,
  total_price REAL NOT NULL,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
);

-- 138. GOODS RECEIPTS (GRN)
CREATE TABLE IF NOT EXISTS goods_receipts (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT,
  grn_number TEXT UNIQUE NOT NULL,
  po_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  receipt_date DATE DEFAULT CURRENT_DATE,
  invoice_delivery_challan_no TEXT,
  received_by TEXT NOT NULL,
  status TEXT DEFAULT 'verified',
  qc_passed BOOLEAN DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

-- 139. GOODS RECEIPT LINE ITEMS
CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id TEXT PRIMARY KEY,
  grn_id TEXT NOT NULL,
  po_item_id TEXT,
  item_id TEXT,
  item_name TEXT NOT NULL,
  received_quantity INTEGER NOT NULL,
  accepted_quantity INTEGER NOT NULL,
  damaged_rejected_quantity INTEGER DEFAULT 0,
  batch_lot_number TEXT,
  expiry_date DATE,
  storage_location TEXT,
  FOREIGN KEY (grn_id) REFERENCES goods_receipts(id) ON DELETE CASCADE
);

-- 140. SUPPLIER INVOICES
CREATE TABLE IF NOT EXISTS supplier_invoices (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  po_id TEXT,
  grn_id TEXT,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  subtotal REAL NOT NULL,
  tax_amount REAL DEFAULT 0.0,
  total_amount REAL NOT NULL,
  amount_paid REAL DEFAULT 0.0,
  match_status TEXT DEFAULT 'matched',
  payment_status TEXT DEFAULT 'unpaid',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

-- 141. SUPPLIER PAYMENTS
CREATE TABLE IF NOT EXISTS supplier_payments (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  invoice_id TEXT,
  payment_number TEXT UNIQUE NOT NULL,
  amount REAL NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL,
  reference_txn_id TEXT,
  notes TEXT,
  paid_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

-- 142. ENTERPRISE CONTRACTS & SERVICE AGREEMENTS
CREATE TABLE IF NOT EXISTS supplier_contracts (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  contract_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  contract_value REAL DEFAULT 0.0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  renewal_reminder_days INTEGER DEFAULT 30,
  responsible_person TEXT,
  document_url TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 143. CRM CUSTOMER DIRECTORY
CREATE TABLE IF NOT EXISTS crm_customers (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  customer_type TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  total_orders INTEGER DEFAULT 0,
  total_revenue REAL DEFAULT 0.0,
  outstanding_balance REAL DEFAULT 0.0,
  last_interaction_at TIMESTAMP,
  tags_json TEXT DEFAULT '[]',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 144. CORPORATE B2B ACCOUNTS
CREATE TABLE IF NOT EXISTS corporate_accounts (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  account_code TEXT UNIQUE NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  billing_address TEXT,
  tax_id TEXT,
  credit_limit REAL DEFAULT 100000.0,
  credit_days INTEGER DEFAULT 30,
  current_outstanding REAL DEFAULT 0.0,
  discount_percentage REAL DEFAULT 15.0,
  contract_start DATE,
  contract_end DATE,
  account_manager_id TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 145. CORPORATE EMPLOYEES / ELIGIBLE BENEFICIARIES
CREATE TABLE IF NOT EXISTS corporate_employees (
  id TEXT PRIMARY KEY,
  corporate_id TEXT NOT NULL,
  employee_id_code TEXT NOT NULL,
  name TEXT NOT NULL,
  gender TEXT,
  dob DATE,
  department TEXT,
  designation TEXT,
  mobile TEXT,
  is_active BOOLEAN DEFAULT 1,
  FOREIGN KEY (corporate_id) REFERENCES corporate_accounts(id) ON DELETE CASCADE
);

-- 146. DOCTOR & CLINIC REFERRAL ANALYTICS LOG
CREATE TABLE IF NOT EXISTS referral_records (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  doctor_id TEXT,
  corporate_id TEXT,
  order_id TEXT NOT NULL,
  order_amount REAL NOT NULL,
  referral_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 147. MARKETING & PREVENTIVE SCREENING CAMPAIGNS
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL,
  target_audience TEXT,
  package_id TEXT,
  discount_percentage REAL DEFAULT 0.0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  channels_json TEXT DEFAULT '["email","sms","whatsapp"]',
  status TEXT DEFAULT 'active',
  total_leads INTEGER DEFAULT 0,
  converted_orders INTEGER DEFAULT 0,
  campaign_revenue REAL DEFAULT 0.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 148. COMMUNITY HEALTH CAMPS
CREATE TABLE IF NOT EXISTS health_camps (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  camp_name TEXT NOT NULL,
  organizing_body TEXT,
  location TEXT NOT NULL,
  camp_date DATE NOT NULL,
  lead_staff_id TEXT,
  packages_offered TEXT,
  target_patients INTEGER DEFAULT 100,
  registered_patients_count INTEGER DEFAULT 0,
  samples_collected_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 149. CUSTOMER FEEDBACK (CSAT & NPS)
CREATE TABLE IF NOT EXISTS customer_feedback (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT,
  patient_id TEXT,
  order_id TEXT,
  rating INTEGER NOT NULL,
  nps_score INTEGER,
  category TEXT DEFAULT 'overall_service',
  comments TEXT,
  sentiment TEXT DEFAULT 'positive',
  resolved BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 150. LOYALTY ACCOUNTS
CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  patient_id TEXT UNIQUE NOT NULL,
  membership_tier TEXT DEFAULT 'silver',
  points_balance INTEGER DEFAULT 0,
  total_points_earned INTEGER DEFAULT 0,
  total_points_redeemed INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- 151. LOYALTY TRANSACTIONS
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  order_id TEXT,
  transaction_type TEXT NOT NULL,
  points INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES loyalty_accounts(id) ON DELETE CASCADE
);

-- 152. FIELD PHLEBOTOMISTS
CREATE TABLE IF NOT EXISTS phlebotomists (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT,
  user_id TEXT,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  assigned_zone TEXT,
  vehicle_number TEXT,
  current_status TEXT DEFAULT 'available',
  rating REAL DEFAULT 5.0,
  total_collections INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 153. HOME SAMPLE COLLECTION REQUESTS
CREATE TABLE IF NOT EXISTS home_collection_requests (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT,
  request_number TEXT UNIQUE NOT NULL,
  patient_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  address TEXT NOT NULL,
  area_pincode TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time_slot TEXT NOT NULL,
  tests_requested TEXT,
  collection_fee REAL DEFAULT 150.0,
  assigned_phlebotomist_id TEXT,
  status TEXT DEFAULT 'requested',
  collected_sample_barcode TEXT,
  collected_at TIMESTAMP,
  received_at_lab_at TIMESTAMP,
  cancellation_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_phlebotomist_id) REFERENCES phlebotomists(id) ON DELETE SET NULL
);

-- 154. PATIENT & CLINICAL APPOINTMENTS
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT,
  appointment_number TEXT UNIQUE NOT NULL,
  patient_id TEXT,
  patient_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  appointment_type TEXT DEFAULT 'walk_in',
  appointment_date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  tests_requested TEXT,
  status TEXT DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 155. LABORATORY QUEUE TOKENS
CREATE TABLE IF NOT EXISTS queue_tokens (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  token_number TEXT NOT NULL,
  token_category TEXT DEFAULT 'sample_collection',
  patient_name TEXT,
  status TEXT DEFAULT 'waiting',
  counter_room TEXT,
  served_by TEXT,
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  called_at TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

-- 156. WORKFORCE SHIFTS
CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  name TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  department TEXT,
  color_code TEXT DEFAULT '#3b82f6',
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 157. STAFF ATTENDANCE RECORDS
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT,
  user_id TEXT NOT NULL,
  attendance_date DATE DEFAULT CURRENT_DATE,
  check_in_time TIMESTAMP,
  check_out_time TIMESTAMP,
  shift_id TEXT,
  status TEXT DEFAULT 'present',
  late_minutes INTEGER DEFAULT 0,
  overtime_minutes INTEGER DEFAULT 0,
  punch_source TEXT DEFAULT 'web',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 158. LEAVE RECORDS
CREATE TABLE IF NOT EXISTS leave_records (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  leave_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  approved_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 159. SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  ticket_number TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  assigned_to TEXT,
  requester_name TEXT,
  requester_email TEXT,
  requester_phone TEXT,
  sla_hours INTEGER DEFAULT 24,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 160. TICKET COMMENTS
CREATE TABLE IF NOT EXISTS ticket_comments (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  user_id TEXT,
  is_internal_note BOOLEAN DEFAULT 0,
  message TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
);

-- 161. KNOWLEDGE BASE ARTICLES
CREATE TABLE IF NOT EXISTS knowledge_articles (
  id TEXT PRIMARY KEY,
  lab_id TEXT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  category TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  is_published BOOLEAN DEFAULT 1,
  access_level TEXT DEFAULT 'internal',
  view_count INTEGER DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 162. STANDARD OPERATING PROCEDURES (SOPS)
CREATE TABLE IF NOT EXISTS sops (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  sop_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  category TEXT DEFAULT 'analytical',
  version TEXT DEFAULT '1.0',
  status TEXT DEFAULT 'draft',
  content_text TEXT,
  document_url TEXT,
  effective_date DATE,
  review_date DATE,
  author_id TEXT,
  reviewer_id TEXT,
  approver_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 163. SOP VERSIONS
CREATE TABLE IF NOT EXISTS sop_versions (
  id TEXT PRIMARY KEY,
  sop_id TEXT NOT NULL,
  version TEXT NOT NULL,
  change_summary TEXT,
  content_snapshot TEXT,
  approved_by TEXT,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sop_id) REFERENCES sops(id) ON DELETE CASCADE
);

-- 164. LABORATORY INCIDENTS
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT,
  incident_number TEXT UNIQUE NOT NULL,
  incident_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  department TEXT,
  incident_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description TEXT NOT NULL,
  immediate_containment_action TEXT,
  reported_by TEXT NOT NULL,
  status TEXT DEFAULT 'reported',
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 165. CORRECTIVE AND PREVENTIVE ACTIONS (CAPA)
CREATE TABLE IF NOT EXISTS capa_records (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  incident_id TEXT NOT NULL,
  capa_number TEXT UNIQUE NOT NULL,
  root_cause_analysis TEXT NOT NULL,
  root_cause_category TEXT,
  corrective_action TEXT NOT NULL,
  preventive_action TEXT NOT NULL,
  assigned_to TEXT NOT NULL,
  target_completion_date DATE,
  status TEXT DEFAULT 'open',
  effectiveness_review_notes TEXT,
  verified_by TEXT,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
);

-- 166. ENTERPRISE RISK REGISTER
CREATE TABLE IF NOT EXISTS risk_register (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  risk_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  probability INTEGER DEFAULT 2,
  impact INTEGER DEFAULT 3,
  risk_score INTEGER DEFAULT 6,
  inherent_risk_level TEXT DEFAULT 'medium',
  mitigation_strategy TEXT,
  residual_risk_level TEXT DEFAULT 'low',
  owner_id TEXT,
  review_date DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 167. ENTERPRISE ASSETS
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  branch_id TEXT,
  asset_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  manufacturer TEXT,
  model_number TEXT,
  serial_number TEXT,
  purchase_date DATE,
  purchase_cost REAL DEFAULT 0.0,
  warranty_expiry DATE,
  status TEXT DEFAULT 'operational',
  location_room TEXT,
  assigned_user TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 168. ASSET MAINTENANCE LOGS
CREATE TABLE IF NOT EXISTS asset_maintenance (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  maintenance_type TEXT NOT NULL,
  maintenance_date DATE DEFAULT CURRENT_DATE,
  performed_by TEXT,
  cost REAL DEFAULT 0.0,
  findings_notes TEXT,
  next_maintenance_due DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

-- 169. LABORATORY REGULATORY LICENSES & CERTIFICATES
CREATE TABLE IF NOT EXISTS licenses (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  license_type TEXT NOT NULL,
  license_number TEXT NOT NULL,
  issuing_authority TEXT NOT NULL,
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  reminder_period_days INTEGER DEFAULT 60,
  document_url TEXT,
  responsible_person TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 170. MULTI-TIER PRICING RULES
CREATE TABLE IF NOT EXISTS pricing_rules (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  test_id TEXT,
  rule_type TEXT NOT NULL,
  target_id TEXT,
  price_override REAL NOT NULL,
  discount_percentage REAL DEFAULT 0.0,
  min_floor_price REAL DEFAULT 0.0,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT 1,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE
);

-- 171. PACKAGE PRICING & CORPORATE ELIGIBILITY OVERRIDES
CREATE TABLE IF NOT EXISTS package_pricing_overrides (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL,
  corporate_id TEXT,
  branch_id TEXT,
  special_price REAL NOT NULL,
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_to DATE,
  is_active BOOLEAN DEFAULT 1,
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
);

-- Phase 9 Performance Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_lab ON enterprise_tasks(lab_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON enterprise_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON enterprise_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_automation_lab ON automation_rules(lab_id);
CREATE INDEX IF NOT EXISTS idx_automation_trigger ON automation_rules(trigger_event);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_lab ON scheduled_jobs(lab_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_lab ON suppliers(lab_id);
CREATE INDEX IF NOT EXISTS idx_po_lab ON purchase_orders(lab_id);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_grn_po ON goods_receipts(po_id);
CREATE INDEX IF NOT EXISTS idx_crm_customers_lab ON crm_customers(lab_id);
CREATE INDEX IF NOT EXISTS idx_corp_accounts_lab ON corporate_accounts(lab_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_lab ON campaigns(lab_id);
CREATE INDEX IF NOT EXISTS idx_health_camps_lab ON health_camps(lab_id);
CREATE INDEX IF NOT EXISTS idx_home_collection_lab ON home_collection_requests(lab_id);
CREATE INDEX IF NOT EXISTS idx_home_collection_status ON home_collection_requests(status);
CREATE INDEX IF NOT EXISTS idx_appointments_lab ON appointments(lab_id);
CREATE INDEX IF NOT EXISTS idx_queue_tokens_branch ON queue_tokens(branch_id);
CREATE INDEX IF NOT EXISTS idx_queue_tokens_status ON queue_tokens(status);
CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_support_tickets_lab ON support_tickets(lab_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_sops_lab ON sops(lab_id);
CREATE INDEX IF NOT EXISTS idx_incidents_lab ON incidents(lab_id);
CREATE INDEX IF NOT EXISTS idx_capa_incident ON capa_records(incident_id);
CREATE INDEX IF NOT EXISTS idx_risk_register_lab ON risk_register(lab_id);
CREATE INDEX IF NOT EXISTS idx_assets_lab ON assets(lab_id);
CREATE INDEX IF NOT EXISTS idx_licenses_lab ON licenses(lab_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_test ON pricing_rules(test_id);

-- 172. RESULT AUDIT HISTORY & VERSION TRACKING (Section 6)
CREATE TABLE IF NOT EXISTS result_history (
  id TEXT PRIMARY KEY,
  result_id TEXT NOT NULL,
  parameter_id TEXT NOT NULL,
  parameter_name TEXT,
  previous_value TEXT,
  new_value TEXT NOT NULL,
  modified_by TEXT NOT NULL,
  modified_by_name TEXT,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  lab_id TEXT NOT NULL,
  FOREIGN KEY (result_id) REFERENCES results(id) ON DELETE CASCADE
);

-- 173. DOMAIN EVENT IDEMPOTENCY & CONSUMER DEDUPLICATION (Section 27)
CREATE TABLE IF NOT EXISTS event_idempotency (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  consumer_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'completed', -- completed, failed, skipped
  tenant_id TEXT NOT NULL,
  UNIQUE(event_id, consumer_id)
);

CREATE INDEX IF NOT EXISTS idx_result_history_result ON result_history(result_id);
CREATE INDEX IF NOT EXISTS idx_result_history_param ON result_history(parameter_id);
CREATE INDEX IF NOT EXISTS idx_event_idempotency_lookup ON event_idempotency(event_id, consumer_id);



