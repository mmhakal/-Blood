import bcrypt from 'bcryptjs';
import db from './database';
import { runMigrations } from './migrate';

export async function runSeeds() {
  console.log('🌱 Seeding clinical laboratory database...');
  await runMigrations();

  // Helper for password hash
  const hashPassword = (pw: string) => bcrypt.hashSync(pw, 10);

  // 1. SYSTEM SETTINGS
  const settings = [
    { id: 'set-1', key: 'app_name', value: 'MediFlow LIS - Diagnostic Laboratory Information System', description: 'System application name' },
    { id: 'set-2', key: 'currency_symbol', value: '₹', description: 'Default currency symbol' },
    { id: 'set-3', key: 'currency_code', value: 'INR', description: 'Default currency code' },
    { id: 'set-4', key: 'support_email', value: 'support@medilabs.com', description: 'System support contact' },
    { id: 'set-5', key: 'tax_rate_percent', value: '5', description: 'Default diagnostic tax percentage' },
    { id: 'set-6', key: 'auto_backup_enabled', value: 'true', description: 'Automatic daily database backup' }
  ];

  for (const s of settings) {
    await db.execute(
      `INSERT INTO system_settings (id, key, value, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [s.id, s.key, s.value, s.description]
    );
  }

  // 2. SUBSCRIPTION PLANS
  const plans = [
    {
      id: 'plan-trial',
      name: 'Trial Plan',
      code: 'TRIAL',
      description: '14-day free trial for single-branch diagnostic centers',
      max_branches: 1,
      max_users: 3,
      max_patients_per_month: 100,
      max_reports_per_month: 100,
      storage_limit_mb: 500,
      duration_days: 14,
      price: 0,
      features: JSON.stringify(['patients', 'tests', 'orders', 'results', 'reports', 'billing'])
    },
    {
      id: 'plan-basic',
      name: 'Basic Clinic LIS',
      code: 'BASIC',
      description: 'Ideal for neighborhood diagnostic clinics and solo pathologists',
      max_branches: 2,
      max_users: 5,
      max_patients_per_month: 500,
      max_reports_per_month: 500,
      storage_limit_mb: 2048,
      duration_days: 30,
      price: 2499,
      features: JSON.stringify(['patients', 'tests', 'orders', 'results', 'reports', 'billing', 'invoices', 'analytics'])
    },
    {
      id: 'plan-pro',
      name: 'Professional Multi-Branch',
      code: 'PROFESSIONAL',
      description: 'For growing diagnostic chains with sample collection centers',
      max_branches: 5,
      max_users: 25,
      max_patients_per_month: 3000,
      max_reports_per_month: 3000,
      storage_limit_mb: 10240,
      duration_days: 30,
      price: 5999,
      features: JSON.stringify(['patients', 'tests', 'orders', 'results', 'reports', 'billing', 'invoices', 'analytics', 'audit_logs', 'backup', 'custom_templates', 'doctor_referrals'])
    },
    {
      id: 'plan-enterprise',
      name: 'Enterprise Diagnostic Network',
      code: 'ENTERPRISE',
      description: 'Unlimited capacity for multi-city hospital lab chains and reference centers',
      max_branches: 50,
      max_users: 200,
      max_patients_per_month: 50000,
      max_reports_per_month: 50000,
      storage_limit_mb: 51200,
      duration_days: 365,
      price: 49999,
      features: JSON.stringify(['patients', 'tests', 'orders', 'results', 'reports', 'billing', 'invoices', 'analytics', 'audit_logs', 'backup', 'custom_templates', 'doctor_referrals', 'api_access', 'custom_branding'])
    }
  ];

  for (const p of plans) {
    await db.execute(
      `INSERT INTO subscription_plans (id, name, code, description, max_branches, max_users, max_patients_per_month, max_reports_per_month, storage_limit_mb, duration_days, price, features, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 1)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price, features = EXCLUDED.features`,
      [p.id, p.name, p.code, p.description, p.max_branches, p.max_users, p.max_patients_per_month, p.max_reports_per_month, p.storage_limit_mb, p.duration_days, p.price, p.features]
    );
  }

  // 3. PERMISSIONS
  const permissions = [
    // Dashboard
    { id: 'perm-view-dash', code: 'view_dashboard', name: 'View Dashboard', category: 'Dashboard' },
    // Super Admin
    { id: 'perm-manage-labs', code: 'manage_laboratories', name: 'Manage Laboratories', category: 'SuperAdmin' },
    { id: 'perm-manage-all-labs', code: 'manage_all_laboratories', name: 'Manage All Laboratories', category: 'SuperAdmin' },
    { id: 'perm-manage-subs', code: 'manage_subscriptions', name: 'Manage Subscriptions', category: 'SuperAdmin' },
    { id: 'perm-global-tests', code: 'manage_global_tests', name: 'Manage Global Test Catalog', category: 'SuperAdmin' },
    { id: 'perm-sys-config', code: 'manage_system_settings', name: 'System Configuration', category: 'SuperAdmin' },
    { id: 'perm-sys-analytics', code: 'view_system_analytics', name: 'View System Analytics', category: 'SuperAdmin' },
    { id: 'perm-all-audit', code: 'view_all_audit_logs', name: 'View All Audit Logs', category: 'SuperAdmin' },
    // Lab Admin & Management
    { id: 'perm-manage-lab', code: 'manage_lab', name: 'Manage Laboratory Profile', category: 'LabAdmin' },
    { id: 'perm-manage-pat-all', code: 'manage_patients', name: 'Manage All Patients', category: 'Patients' },
    { id: 'perm-manage-res-all', code: 'manage_results', name: 'Manage Test Results', category: 'Results' },
    { id: 'perm-manage-rep-all', code: 'manage_reports', name: 'Manage Clinical Reports', category: 'Reports' },
    // Patients
    { id: 'perm-view-pat', code: 'view_patients', name: 'View Patients', category: 'Patients' },
    { id: 'perm-create-pat', code: 'create_patient', name: 'Create Patient', category: 'Patients' },
    { id: 'perm-edit-pat', code: 'edit_patient', name: 'Edit Patient', category: 'Patients' },
    { id: 'perm-delete-pat', code: 'delete_patient', name: 'Delete Patient', category: 'Patients' },
    // Doctors
    { id: 'perm-manage-docs', code: 'manage_doctors', name: 'Manage Doctors', category: 'Doctors' },
    // Tests & Pricing
    { id: 'perm-manage-tests', code: 'manage_tests', name: 'Manage Tests & Parameters', category: 'Tests' },
    { id: 'perm-manage-pricing', code: 'manage_pricing', name: 'Manage Test Pricing', category: 'Tests' },
    { id: 'perm-manage-packages', code: 'manage_packages', name: 'Manage Test Packages', category: 'Tests' },
    // Orders & Samples
    { id: 'perm-create-order', code: 'create_order', name: 'Create Test Order', category: 'Orders' },
    { id: 'perm-view-orders', code: 'view_orders', name: 'View Orders', category: 'Orders' },
    { id: 'perm-cancel-order', code: 'cancel_order', name: 'Cancel Test Order', category: 'Orders' },
    { id: 'perm-collect-sample', code: 'collect_sample', name: 'Collect & Track Samples', category: 'Samples' },
    { id: 'perm-reject-sample', code: 'reject_sample', name: 'Reject Samples & Request Recollection', category: 'Samples' },
    // Results & Approval
    { id: 'perm-enter-results', code: 'enter_results', name: 'Enter Test Results', category: 'Results' },
    { id: 'perm-edit-results', code: 'edit_results', name: 'Edit Test Results', category: 'Results' },
    { id: 'perm-verify-results', code: 'verify_results', name: 'Verify Results', category: 'Results' },
    { id: 'perm-approve-report', code: 'approve_report', name: 'Approve Diagnostic Report', category: 'Reports' },
    { id: 'perm-release-report', code: 'release_report', name: 'Release Diagnostic Report', category: 'Reports' },
    { id: 'perm-print-report', code: 'print_report', name: 'Print & Download Report', category: 'Reports' },
    // Billing
    { id: 'perm-manage-billing', code: 'manage_billing', name: 'Manage Invoices & Billing', category: 'Billing' },
    { id: 'perm-receive-payments', code: 'receive_payments', name: 'Receive Payments & Issue Receipts', category: 'Billing' },
    { id: 'perm-refund-payment', code: 'refund_payment', name: 'Process Payment Refunds', category: 'Billing' },
    // Staff & Branch
    { id: 'perm-manage-users', code: 'manage_users', name: 'Manage Staff Users', category: 'Staff' },
    { id: 'perm-manage-branches', code: 'manage_branches', name: 'Manage Branches', category: 'Branches' },
    { id: 'perm-lab-settings', code: 'manage_lab_settings', name: 'Configure Lab Settings & Templates', category: 'Settings' },
    // Analytics, Audit & Backup
    { id: 'perm-view-analytics', code: 'view_analytics', name: 'View Analytics & Financial Reports', category: 'Analytics' },
    { id: 'perm-view-audit', code: 'view_audit_logs', name: 'View Audit Logs', category: 'Audit' },
    { id: 'perm-manage-backup', code: 'manage_backup', name: 'Manage Database Backup & Restore', category: 'Backup' }
  ];

  for (const perm of permissions) {
    await db.execute(
      `INSERT INTO permissions (id, code, name, category, description)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (code) DO NOTHING`,
      [perm.id, perm.code, perm.name, perm.category, perm.name]
    );
  }

  // 4. ROLES
  const systemRoles = [
    { id: 'role-superadmin', name: 'Super Admin', code: 'super_admin', description: 'Full access to all system instances and laboratories', is_system: 1 },
    { id: 'role-labadmin', name: 'Lab Admin', code: 'lab_admin', description: 'Full administrative control of laboratory and branches', is_system: 1 },
    { id: 'role-pathologist', name: 'Consultant Pathologist / Doctor', code: 'pathologist', description: 'Reviews results, clinical impressions, approvals, and digital signatures', is_system: 1 },
    { id: 'role-technician', name: 'Lab Technician', code: 'lab_technician', description: 'Sample collection, processing, and numerical result entry', is_system: 1 },
    { id: 'role-receptionist', name: 'Receptionist & Billing', code: 'receptionist', description: 'Patient intake, test ordering, appointment billing, and report dispatch', is_system: 1 },
    { id: 'role-accountant', name: 'Accountant', code: 'accountant', description: 'Financial ledger, payment receipts, discounts, and billing audits', is_system: 1 }
  ];

  for (const r of systemRoles) {
    await db.execute(
      `INSERT INTO roles (id, name, code, description, is_system)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [r.id, r.name, r.code, r.description, r.is_system]
    );
  }

  // Assign permissions to roles
  const allPermIds = permissions.map(p => p.id);
  // Super Admin gets all permissions
  for (const pId of allPermIds) {
    await db.execute(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      ['role-superadmin', pId]
    );
  }

  // Lab Admin gets all except superadmin-only
  const labAdminPerms = permissions.filter(p => p.category !== 'SuperAdmin').map(p => p.id);
  for (const pId of labAdminPerms) {
    await db.execute(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      ['role-labadmin', pId]
    );
  }

  // Pathologist
  const pathologistPerms = ['perm-view-dash', 'perm-view-pat', 'perm-view-orders', 'perm-reject-sample', 'perm-enter-results', 'perm-edit-results', 'perm-verify-results', 'perm-approve-report', 'perm-release-report', 'perm-print-report', 'perm-view-analytics'];
  for (const pId of pathologistPerms) {
    await db.execute(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, ['role-pathologist', pId]);
  }

  // Technician
  const techPerms = ['perm-view-dash', 'perm-view-pat', 'perm-view-orders', 'perm-collect-sample', 'perm-reject-sample', 'perm-enter-results', 'perm-edit-results', 'perm-print-report'];
  for (const pId of techPerms) {
    await db.execute(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, ['role-technician', pId]);
  }

  // Receptionist
  const recepPerms = ['perm-view-dash', 'perm-view-pat', 'perm-create-pat', 'perm-edit-pat', 'perm-create-order', 'perm-view-orders', 'perm-cancel-order', 'perm-collect-sample', 'perm-reject-sample', 'perm-print-report', 'perm-manage-billing', 'perm-receive-payments', 'perm-release-report'];
  for (const pId of recepPerms) {
    await db.execute(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, ['role-receptionist', pId]);
  }

  // Accountant
  const accountantPerms = ['perm-view-dash', 'perm-view-orders', 'perm-manage-billing', 'perm-receive-payments', 'perm-refund-payment', 'perm-view-analytics', 'perm-print-report'];
  for (const pId of accountantPerms) {
    await db.execute(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, ['role-accountant', pId]);
  }

  // 5. SUPER ADMIN USER
  const superAdminPassword = hashPassword('admin123');
  await db.execute(
    `INSERT INTO users (id, lab_id, branch_id, name, email, password_hash, phone, role_id, status)
     VALUES ($1, NULL, NULL, $2, $3, $4, $5, $6, 'active')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    ['user-superadmin', 'Super Administrator', 'admin@medilabs.com', superAdminPassword, '+91 99000 00001', 'role-superadmin']
  );

  // 6. DEMO LABORATORY (Apex Diagnostics & Reference Laboratory)
  const now = new Date();
  const subStart = new Date(now);
  const subEnd = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000); // 180 days

  await db.execute(
    `INSERT INTO laboratories (id, name, code, owner_name, email, phone, address, city, state, country, tax_number, license_number, status, subscription_plan_id, subscription_start, subscription_end, header_text, footer_text)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', $13, $14, $15, $16, $17)
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status`,
    [
      'lab-apex',
      'Apex Diagnostics & Reference Laboratory',
      'APEX-LAB',
      'Dr. Robert Vance',
      'contact@apexlabs.com',
      '+91 11 4567 8900',
      'Plot 45, Health City Boulevard, Medical Enclave',
      'New Delhi',
      'Delhi',
      'India',
      '07AAAAA0000A1Z5',
      'NABL-MED-2024-8891 / ISO 15189:2022',
      'plan-enterprise',
      subStart.toISOString(),
      subEnd.toISOString(),
      'Apex Diagnostics - Advanced Hematology, Biochemistry & Molecular Pathology',
      'Computer generated diagnostic report. For medical interpretation, please consult referring physician.'
    ]
  );

  // 7. DEMO BRANCHES
  const branches = [
    {
      id: 'branch-apex-central',
      lab_id: 'lab-apex',
      name: 'Apex Central Reference Hub',
      code: 'APEX-CENTRAL',
      address: 'Plot 45, Medical Enclave, New Delhi',
      phone: '+91 11 4567 8901',
      email: 'central@apexlabs.com',
      manager_name: 'Dr. Robert Vance',
      working_hours: '24 Hours / 7 Days'
    },
    {
      id: 'branch-apex-north',
      lab_id: 'lab-apex',
      name: 'Apex North Metro Collection Center',
      code: 'APEX-NORTH',
      address: 'Shop 12, Sector 14, Rohini, New Delhi',
      phone: '+91 11 4567 8902',
      email: 'north@apexlabs.com',
      manager_name: 'David Kim',
      working_hours: '7:00 AM - 9:00 PM'
    }
  ];

  for (const b of branches) {
    await db.execute(
      `INSERT INTO branches (id, lab_id, name, code, address, phone, email, manager_name, working_hours, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
       ON CONFLICT (lab_id, code) DO NOTHING`,
      [b.id, b.lab_id, b.name, b.code, b.address, b.phone, b.email, b.manager_name, b.working_hours]
    );
  }

  // 8. STAFF USERS FOR APEX LAB
  const staffUsers = [
    {
      id: 'user-labadmin',
      lab_id: 'lab-apex',
      branch_id: 'branch-apex-central',
      name: 'Dr. Robert Vance',
      email: 'labadmin@apexlabs.com',
      password: hashPassword('admin123'),
      phone: '+91 98111 22334',
      role_id: 'role-labadmin'
    },
    {
      id: 'user-pathologist',
      lab_id: 'lab-apex',
      branch_id: 'branch-apex-central',
      name: 'Dr. Sarah Jenkins, MD',
      email: 'pathologist@apexlabs.com',
      password: hashPassword('admin123'),
      phone: '+91 98222 33445',
      role_id: 'role-pathologist'
    },
    {
      id: 'user-technician',
      lab_id: 'lab-apex',
      branch_id: 'branch-apex-central',
      name: 'Alex Rivera, MLT',
      email: 'technician@apexlabs.com',
      password: hashPassword('admin123'),
      phone: '+91 98333 44556',
      role_id: 'role-technician'
    },
    {
      id: 'user-receptionist',
      lab_id: 'lab-apex',
      branch_id: 'branch-apex-central',
      name: 'Maria Garcia',
      email: 'reception@apexlabs.com',
      password: hashPassword('admin123'),
      phone: '+91 98444 55667',
      role_id: 'role-receptionist'
    },
    {
      id: 'user-accountant',
      lab_id: 'lab-apex',
      branch_id: 'branch-apex-central',
      name: 'David Kim',
      email: 'accountant@apexlabs.com',
      password: hashPassword('admin123'),
      phone: '+91 98555 66778',
      role_id: 'role-accountant'
    }
  ];

  for (const u of staffUsers) {
    await db.execute(
      `INSERT INTO users (id, lab_id, branch_id, name, email, password_hash, phone, role_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [u.id, u.lab_id, u.branch_id, u.name, u.email, u.password, u.phone, u.role_id]
    );

    // Assign to branches
    await db.execute(
      `INSERT INTO user_branches (user_id, branch_id, is_primary)
       VALUES ($1, $2, 1)
       ON CONFLICT DO NOTHING`,
      [u.id, 'branch-apex-central']
    );
    await db.execute(
      `INSERT INTO user_branches (user_id, branch_id, is_primary)
       VALUES ($1, $2, 0)
       ON CONFLICT DO NOTHING`,
      [u.id, 'branch-apex-north']
    );
  }

  // 9. REFERRING DOCTORS
  const doctors = [
    {
      id: 'doc-1',
      lab_id: 'lab-apex',
      name: 'Dr. Arthur Henderson',
      qualification: 'MBBS, MD (Internal Medicine)',
      specialization: 'General Physician & Diabetologist',
      registration_number: 'MCI-34821',
      clinic_hospital: 'City Multispeciality Hospital',
      phone: '+91 98711 00112',
      email: 'dr.arthur@cityhospital.org',
      address: 'Suite 401, City Hospital Complex, Delhi'
    },
    {
      id: 'doc-2',
      lab_id: 'lab-apex',
      name: 'Dr. Elena Rostova',
      qualification: 'MBBS, MD, DM (Cardiology)',
      specialization: 'Consultant Cardiologist',
      registration_number: 'MCI-58190',
      clinic_hospital: 'Metro Heart Institute',
      phone: '+91 98722 00223',
      email: 'dr.elena@metroheart.org',
      address: 'Metro Heart Institute, Ring Road, Delhi'
    },
    {
      id: 'doc-3',
      lab_id: 'lab-apex',
      name: 'Dr. Rajesh Verma',
      qualification: 'MBBS, DNB (Family Medicine)',
      specialization: 'Family Medicine',
      registration_number: 'DMC-29401',
      clinic_hospital: 'Verma Healthcare Clinic',
      phone: '+91 98733 00334',
      email: 'rajesh.verma@vermahealth.com',
      address: '22 Main Market, Rohini, Delhi'
    }
  ];

  for (const d of doctors) {
    await db.execute(
      `INSERT INTO doctors (id, lab_id, name, qualification, specialization, registration_number, clinic_hospital, phone, email, address, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
       ON CONFLICT DO NOTHING`,
      [d.id, d.lab_id, d.name, d.qualification, d.specialization, d.registration_number, d.clinic_hospital, d.phone, d.email, d.address]
    );
  }

  // 10. TEST CATEGORIES
  const categories = [
    { id: 'cat-hem', name: 'Hematology', code: 'HEM', description: 'Complete Blood Counts, Hemoglobin, Coagulation', display_order: 1 },
    { id: 'cat-bio', name: 'Clinical Biochemistry', code: 'BIO', description: 'Liver, Kidney, Lipid, Sugar & Electrolytes', display_order: 2 },
    { id: 'cat-endo', name: 'Endocrinology & Hormones', code: 'ENDO', description: 'Thyroid, Diabetes markers, Vitamins', display_order: 3 },
    { id: 'cat-ser', name: 'Serology & Immunology', code: 'SER', description: 'Infectious disease markers, CRP, ESR', display_order: 4 },
    { id: 'cat-urin', name: 'Clinical Pathology', code: 'PATH', description: 'Urine Routine & Microscopic analysis', display_order: 5 }
  ];

  for (const c of categories) {
    await db.execute(
      `INSERT INTO test_categories (id, lab_id, name, code, description, display_order)
       VALUES ($1, 'lab-apex', $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [c.id, c.name, c.code, c.description, c.display_order]
    );
  }

  // 11. TESTS & PARAMETERS & REFERENCE RANGES
  // A. CBC (Complete Blood Count)
  await db.execute(
    `INSERT INTO tests (id, lab_id, category_id, code, name, department, sample_type, container_type, method, turnaround_time_hours, base_price, remarks)
     VALUES ($1, 'lab-apex', 'cat-hem', 'CBC', 'Complete Blood Count (CBC / Hemogram)', 'Hematology', 'Whole Blood (EDTA)', 'Lavender Top Vacutainer', 'Automated 5-Part Cell Counter (Electrical Impedance & Flow Cytometry)', 2, 450.00, 'Fasting not mandatory')
     ON CONFLICT DO NOTHING`,
    ['test-cbc']
  );

  const cbcParams = [
    { id: 'param-hb', name: 'Hemoglobin', short_name: 'Hb', unit: 'g/dL', dec: 1, min: 13.0, max: 17.0, crit_low: 7.0, crit_high: 20.0, order: 1 },
    { id: 'param-rbc', name: 'Total RBC Count', short_name: 'RBC', unit: 'mill/cu.mm', dec: 2, min: 4.5, max: 5.9, crit_low: 2.5, crit_high: 7.0, order: 2 },
    { id: 'param-pcv', name: 'Packed Cell Volume (PCV / Hematocrit)', short_name: 'PCV', unit: '%', dec: 1, min: 40.0, max: 50.0, crit_low: 20.0, crit_high: 60.0, order: 3 },
    { id: 'param-mcv', name: 'Mean Corpuscular Volume (MCV)', short_name: 'MCV', unit: 'fL', dec: 1, min: 80.0, max: 100.0, crit_low: 65.0, crit_high: 120.0, order: 4 },
    { id: 'param-mch', name: 'Mean Corpuscular Hemoglobin (MCH)', short_name: 'MCH', unit: 'pg', dec: 1, min: 27.0, max: 32.0, crit_low: 20.0, crit_high: 40.0, order: 5 },
    { id: 'param-mchc', name: 'Mean Corpuscular Hb Concentration (MCHC)', short_name: 'MCHC', unit: 'g/dL', dec: 1, min: 32.0, max: 36.0, crit_low: 26.0, crit_high: 39.0, order: 6 },
    { id: 'param-rdw', name: 'Red Cell Distribution Width (RDW-CV)', short_name: 'RDW', unit: '%', dec: 1, min: 11.5, max: 14.5, crit_low: 9.0, crit_high: 20.0, order: 7 },
    { id: 'param-wbc', name: 'Total Leukocyte Count (WBC)', short_name: 'TLC', unit: 'cells/cu.mm', dec: 0, min: 4000, max: 11000, crit_low: 2000, crit_high: 30000, order: 8 },
    { id: 'param-neu', name: 'Neutrophils', short_name: 'NEU', unit: '%', dec: 1, min: 40.0, max: 75.0, crit_low: 20.0, crit_high: 90.0, order: 9 },
    { id: 'param-lym', name: 'Lymphocytes', short_name: 'LYM', unit: '%', dec: 1, min: 20.0, max: 45.0, crit_low: 10.0, crit_high: 70.0, order: 10 },
    { id: 'param-eos', name: 'Eosinophils', short_name: 'EOS', unit: '%', dec: 1, min: 1.0, max: 6.0, crit_low: 0.0, crit_high: 15.0, order: 11 },
    { id: 'param-mon', name: 'Monocytes', short_name: 'MON', unit: '%', dec: 1, min: 2.0, max: 10.0, crit_low: 0.0, crit_high: 15.0, order: 12 },
    { id: 'param-bas', name: 'Basophils', short_name: 'BAS', unit: '%', dec: 1, min: 0.0, max: 1.0, crit_low: 0.0, crit_high: 5.0, order: 13 },
    { id: 'param-plt', name: 'Platelet Count', short_name: 'PLT', unit: 'lakh/cu.mm', dec: 2, min: 1.50, max: 4.50, crit_low: 0.50, crit_high: 8.00, order: 14 }
  ];

  for (const p of cbcParams) {
    await db.execute(
      `INSERT INTO test_parameters (id, test_id, name, short_name, result_type, unit, decimal_precision, display_order)
       VALUES ($1, 'test-cbc', $2, $3, 'numeric', $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [p.id, p.name, p.short_name, p.unit, p.dec, p.order]
    );

    await db.execute(
      `INSERT INTO reference_ranges (id, parameter_id, gender, normal_min, normal_max, critical_low, critical_high)
       VALUES ($1, $2, 'Both', $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [`ref-${p.id}`, p.id, p.min, p.max, p.crit_low, p.crit_high]
    );
  }

  // B. LFT (Liver Function Test)
  await db.execute(
    `INSERT INTO tests (id, lab_id, category_id, code, name, department, sample_type, container_type, method, turnaround_time_hours, base_price, remarks)
     VALUES ($1, 'lab-apex', 'cat-bio', 'LFT', 'Liver Function Test (LFT)', 'Biochemistry', 'Serum', 'Red Top / SST Gel Tube', 'Fully Automated Clinical Chemistry Analyzer (Photometric / Enzymatic)', 3, 750.00, 'Overnight fasting (10-12 hours) recommended')
     ON CONFLICT DO NOTHING`,
    ['test-lft']
  );

  const lftParams = [
    { id: 'param-bili-tot', name: 'Bilirubin Total', short_name: 'TBIL', unit: 'mg/dL', dec: 2, min: 0.2, max: 1.2, crit_low: null, crit_high: 5.0, order: 1 },
    { id: 'param-bili-dir', name: 'Bilirubin Direct (Conjugated)', short_name: 'DBIL', unit: 'mg/dL', dec: 2, min: 0.0, max: 0.3, crit_low: null, crit_high: 2.5, order: 2 },
    { id: 'param-sgot', name: 'SGOT / AST (Aspartate Aminotransferase)', short_name: 'SGOT', unit: 'U/L', dec: 1, min: 5.0, max: 40.0, crit_low: null, crit_high: 250.0, order: 3 },
    { id: 'param-sgpt', name: 'SGPT / ALT (Alanine Aminotransferase)', short_name: 'SGPT', unit: 'U/L', dec: 1, min: 5.0, max: 45.0, crit_low: null, crit_high: 250.0, order: 4 },
    { id: 'param-alp', name: 'Alkaline Phosphatase (ALP)', short_name: 'ALP', unit: 'U/L', dec: 1, min: 44.0, max: 147.0, crit_low: null, crit_high: 400.0, order: 5 },
    { id: 'param-prot-tot', name: 'Total Protein', short_name: 'TP', unit: 'g/dL', dec: 2, min: 6.4, max: 8.3, crit_low: 4.5, crit_high: 10.0, order: 6 },
    { id: 'param-alb', name: 'Albumin', short_name: 'ALB', unit: 'g/dL', dec: 2, min: 3.5, max: 5.2, crit_low: 2.0, crit_high: 6.0, order: 7 },
    { id: 'param-glob', name: 'Globulin', short_name: 'GLOB', unit: 'g/dL', dec: 2, min: 2.0, max: 3.5, crit_low: 1.0, crit_high: 5.0, order: 8 },
    { id: 'param-ag-ratio', name: 'A/G Ratio', short_name: 'AGR', unit: 'Ratio', dec: 2, min: 1.1, max: 2.2, crit_low: 0.8, crit_high: 3.0, order: 9 }
  ];

  for (const p of lftParams) {
    await db.execute(
      `INSERT INTO test_parameters (id, test_id, name, short_name, result_type, unit, decimal_precision, display_order)
       VALUES ($1, 'test-lft', $2, $3, 'numeric', $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [p.id, p.name, p.short_name, p.unit, p.dec, p.order]
    );

    await db.execute(
      `INSERT INTO reference_ranges (id, parameter_id, gender, normal_min, normal_max, critical_low, critical_high)
       VALUES ($1, $2, 'Both', $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [`ref-${p.id}`, p.id, p.min, p.max, p.crit_low, p.crit_high]
    );
  }

  // C. KFT (Kidney Function Test)
  await db.execute(
    `INSERT INTO tests (id, lab_id, category_id, code, name, department, sample_type, container_type, method, turnaround_time_hours, base_price, remarks)
     VALUES ($1, 'lab-apex', 'cat-bio', 'KFT', 'Kidney Function Test (KFT / Renal Profile)', 'Biochemistry', 'Serum', 'Red Top / SST Gel Tube', 'Spectrophotometric (Kinetic Jaffe / Urease)', 3, 700.00, 'Fasting sample preferred')
     ON CONFLICT DO NOTHING`,
    ['test-kft']
  );

  const kftParams = [
    { id: 'param-urea', name: 'Blood Urea', short_name: 'UREA', unit: 'mg/dL', dec: 1, min: 15.0, max: 40.0, crit_low: 5.0, crit_high: 100.0, order: 1 },
    { id: 'param-bun', name: 'Blood Urea Nitrogen (BUN)', short_name: 'BUN', unit: 'mg/dL', dec: 1, min: 7.0, max: 20.0, crit_low: 3.0, crit_high: 60.0, order: 2 },
    { id: 'param-creat', name: 'Serum Creatinine', short_name: 'CREAT', unit: 'mg/dL', dec: 2, min: 0.7, max: 1.3, crit_low: 0.3, crit_high: 4.0, order: 3 },
    { id: 'param-uric', name: 'Uric Acid', short_name: 'UA', unit: 'mg/dL', dec: 2, min: 3.5, max: 7.2, crit_low: 1.5, crit_high: 12.0, order: 4 },
    { id: 'param-calcium', name: 'Serum Calcium', short_name: 'CA', unit: 'mg/dL', dec: 2, min: 8.5, max: 10.5, crit_low: 6.5, crit_high: 13.0, order: 5 },
    { id: 'param-phos', name: 'Phosphorus', short_name: 'PHOS', unit: 'mg/dL', dec: 2, min: 2.5, max: 4.5, crit_low: 1.0, crit_high: 7.0, order: 6 }
  ];

  for (const p of kftParams) {
    await db.execute(
      `INSERT INTO test_parameters (id, test_id, name, short_name, result_type, unit, decimal_precision, display_order)
       VALUES ($1, 'test-kft', $2, $3, 'numeric', $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [p.id, p.name, p.short_name, p.unit, p.dec, p.order]
    );

    await db.execute(
      `INSERT INTO reference_ranges (id, parameter_id, gender, normal_min, normal_max, critical_low, critical_high)
       VALUES ($1, $2, 'Both', $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [`ref-${p.id}`, p.id, p.min, p.max, p.crit_low, p.crit_high]
    );
  }

  // D. LIPID PROFILE
  await db.execute(
    `INSERT INTO tests (id, lab_id, category_id, code, name, department, sample_type, container_type, method, turnaround_time_hours, base_price, remarks)
     VALUES ($1, 'lab-apex', 'cat-bio', 'LIPID', 'Lipid Profile Screen', 'Biochemistry', 'Serum', 'Red Top / SST Gel Tube', 'CHOD-PAP / GPO-PAP Enzymatic Colorimetric', 3, 650.00, 'Strict 12-hour overnight fasting required')
     ON CONFLICT DO NOTHING`,
    ['test-lipid']
  );

  const lipidParams = [
    { id: 'param-chol-tot', name: 'Total Cholesterol', short_name: 'CHOL', unit: 'mg/dL', dec: 1, min: 125.0, max: 200.0, crit_low: 70.0, crit_high: 300.0, order: 1 },
    { id: 'param-hdl', name: 'HDL Cholesterol (Good)', short_name: 'HDL', unit: 'mg/dL', dec: 1, min: 40.0, max: 60.0, crit_low: 20.0, crit_high: null, order: 2 },
    { id: 'param-ldl', name: 'LDL Cholesterol (Bad)', short_name: 'LDL', unit: 'mg/dL', dec: 1, min: 50.0, max: 100.0, crit_low: null, crit_high: 190.0, order: 3 },
    { id: 'param-trig', name: 'Triglycerides', short_name: 'TRIG', unit: 'mg/dL', dec: 1, min: 50.0, max: 150.0, crit_low: null, crit_high: 500.0, order: 4 },
    { id: 'param-vldl', name: 'VLDL Cholesterol', short_name: 'VLDL', unit: 'mg/dL', dec: 1, min: 10.0, max: 30.0, crit_low: null, crit_high: 70.0, order: 5 }
  ];

  for (const p of lipidParams) {
    await db.execute(
      `INSERT INTO test_parameters (id, test_id, name, short_name, result_type, unit, decimal_precision, display_order)
       VALUES ($1, 'test-lipid', $2, $3, 'numeric', $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [p.id, p.name, p.short_name, p.unit, p.dec, p.order]
    );

    await db.execute(
      `INSERT INTO reference_ranges (id, parameter_id, gender, normal_min, normal_max, critical_low, critical_high)
       VALUES ($1, $2, 'Both', $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [`ref-${p.id}`, p.id, p.min, p.max, p.crit_low, p.crit_high]
    );
  }

  // E. GLYCEMIC TESTS (HbA1c & Fasting Glucose)
  await db.execute(
    `INSERT INTO tests (id, lab_id, category_id, code, name, department, sample_type, container_type, method, turnaround_time_hours, base_price, remarks)
     VALUES ($1, 'lab-apex', 'cat-endo', 'HBA1C', 'HbA1c (Glycated Hemoglobin)', 'Endocrinology', 'Whole Blood (EDTA)', 'Lavender Top Vacutainer', 'HPLC (High-Performance Liquid Chromatography - Gold Standard)', 3, 550.00, 'Reflects 3-month average glucose control')
     ON CONFLICT DO NOTHING`,
    ['test-hba1c']
  );

  await db.execute(
    `INSERT INTO test_parameters (id, test_id, name, short_name, result_type, unit, decimal_precision, display_order)
     VALUES ($1, 'test-hba1c', 'HbA1c Concentration', 'HbA1c', 'numeric', '%', 2, 1)
     ON CONFLICT DO NOTHING`,
    ['param-hba1c-val']
  );
  await db.execute(
    `INSERT INTO reference_ranges (id, parameter_id, gender, normal_min, normal_max, critical_low, critical_high, text_range)
     VALUES ($1, 'param-hba1c-val', 'Both', 4.0, 5.6, 3.5, 12.0, 'Non-diabetic: <5.7%, Pre-diabetic: 5.7-6.4%, Diabetic: >=6.5%')
     ON CONFLICT DO NOTHING`,
    ['ref-param-hba1c-val']
  );

  // F. THYROID PROFILE (T3, T4, TSH)
  await db.execute(
    `INSERT INTO tests (id, lab_id, category_id, code, name, department, sample_type, container_type, method, turnaround_time_hours, base_price, remarks)
     VALUES ($1, 'lab-apex', 'cat-endo', 'THYROID', 'Thyroid Profile (Total T3, Total T4, TSH)', 'Endocrinology', 'Serum', 'Red Top / SST Gel Tube', 'Chemiluminescence Immunoassay (CLIA)', 4, 600.00, 'Morning sample preferred')
     ON CONFLICT DO NOTHING`,
    ['test-thyroid']
  );

  const thyroidParams = [
    { id: 'param-t3', name: 'Total Triiodothyronine (T3)', short_name: 'T3', unit: 'ng/dL', dec: 2, min: 70.0, max: 200.0, order: 1 },
    { id: 'param-t4', name: 'Total Thyroxine (T4)', short_name: 'T4', unit: 'ug/dL', dec: 2, min: 4.8, max: 12.0, order: 2 },
    { id: 'param-tsh', name: 'TSH (Thyroid Stimulating Hormone, Ultra-sensitive)', short_name: 'TSH', unit: 'uIU/mL', dec: 3, min: 0.35, max: 4.94, crit_low: 0.05, crit_high: 20.0, order: 3 }
  ];

  for (const p of thyroidParams) {
    await db.execute(
      `INSERT INTO test_parameters (id, test_id, name, short_name, result_type, unit, decimal_precision, display_order)
       VALUES ($1, 'test-thyroid', $2, $3, 'numeric', $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [p.id, p.name, p.short_name, p.unit, p.dec, p.order]
    );

    await db.execute(
      `INSERT INTO reference_ranges (id, parameter_id, gender, normal_min, normal_max, critical_low, critical_high)
       VALUES ($1, $2, 'Both', $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [`ref-${p.id}`, p.id, p.min, p.max, p.crit_low || null, p.crit_high || null]
    );
  }

  // 12. PACKAGES
  const packages = [
    {
      id: 'pkg-fullbody',
      lab_id: 'lab-apex',
      name: 'Apex Executive Health Screen (54 Parameters)',
      code: 'PKG-EXEC',
      description: 'Comprehensive annual wellness package including CBC, LFT, KFT, Lipid Profile, and HbA1c',
      price: 1999.00,
      tests: ['test-cbc', 'test-lft', 'test-kft', 'test-lipid', 'test-hba1c']
    },
    {
      id: 'pkg-diabetic',
      lab_id: 'lab-apex',
      name: 'Diabetic Health & Renal Check',
      code: 'PKG-DIAB',
      description: 'Specialized profile tracking glucose control, lipid balance and kidney markers',
      price: 1499.00,
      tests: ['test-cbc', 'test-kft', 'test-lipid', 'test-hba1c']
    },
    {
      id: 'pkg-basic',
      lab_id: 'lab-apex',
      name: 'Basic Wellness Vital Panel',
      code: 'PKG-BASIC',
      description: 'Essential health indicators: Hemogram, Kidney, and Liver function',
      price: 1299.00,
      tests: ['test-cbc', 'test-kft', 'test-lft']
    }
  ];

  for (const pkg of packages) {
    await db.execute(
      `INSERT INTO packages (id, lab_id, name, code, description, price, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       ON CONFLICT DO NOTHING`,
      [pkg.id, pkg.lab_id, pkg.name, pkg.code, pkg.description, pkg.price]
    );

    for (const tId of pkg.tests) {
      await db.execute(
        `INSERT INTO package_tests (package_id, test_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [pkg.id, tId]
      );
    }
  }

  // 13. DEMO PATIENTS
  const patients = [
    {
      id: 'pat-1',
      lab_id: 'lab-apex',
      branch_id: 'branch-apex-central',
      code: 'PID-2026-0001',
      lab_num: 'LAB-2026-0101',
      name: 'Johnathan Miller',
      age: 46,
      gender: 'Male',
      mobile: '+91 98765 43210',
      email: 'johnathan.miller@gmail.com',
      address: 'House 14-B, Green Valley Apartments, New Delhi',
      doc_id: 'doc-1',
      blood_group: 'O Positive',
      remarks: 'Complaining of persistent lethargy and occasional chest tightness'
    },
    {
      id: 'pat-2',
      lab_id: 'lab-apex',
      branch_id: 'branch-apex-central',
      code: 'PID-2026-0002',
      lab_num: 'LAB-2026-0102',
      name: 'Priya Sharma',
      age: 34,
      gender: 'Female',
      mobile: '+91 98234 56789',
      email: 'priya.sharma90@yahoo.com',
      address: 'A-204, Metro Residency, Rohini, New Delhi',
      doc_id: 'doc-2',
      blood_group: 'B Positive',
      remarks: 'Routine pre-employment medical checkup'
    },
    {
      id: 'pat-3',
      lab_id: 'lab-apex',
      branch_id: 'branch-apex-north',
      code: 'PID-2026-0003',
      lab_num: 'LAB-2026-0103',
      name: 'Marcus Vance',
      age: 63,
      gender: 'Male',
      mobile: '+91 97123 45678',
      email: 'marcus.vance@live.com',
      address: '77 Heritage Lane, Civil Lines, New Delhi',
      doc_id: 'doc-3',
      blood_group: 'A Positive',
      remarks: 'Known type 2 diabetic for 12 years; quarterly monitoring'
    }
  ];

  for (const p of patients) {
    await db.execute(
      `INSERT INTO patients (id, lab_id, branch_id, patient_id_code, lab_number, name, age, gender, mobile, email, address, referring_doctor_id, blood_group, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (lab_id, patient_id_code) DO NOTHING`,
      [p.id, p.lab_id, p.branch_id, p.code, p.lab_num, p.name, p.age, p.gender, p.mobile, p.email, p.address, p.doc_id, p.blood_group, p.remarks]
    );
  }

  // 14. DEMO ORDER 1: COMPLETED, VERIFIED & APPROVED (Johnathan Miller)
  // Has CBC and Lipid Profile
  const order1Id = 'ord-1001';
  await db.execute(
    `INSERT INTO test_orders (id, lab_id, branch_id, order_number, lab_number, patient_id, referring_doctor_id, status, total_amount, discount_amount, tax_amount, net_amount, paid_amount, due_amount, payment_status, clinical_history, created_by)
     VALUES ($1, 'lab-apex', 'branch-apex-central', 'ORD-2026-0001', 'LAB-2026-0101', 'pat-1', 'doc-1', 'completed', 1100.0, 100.0, 50.0, 1050.0, 1050.0, 0.0, 'paid', 'Dyslipidemia follow-up and general fatigue', 'user-receptionist')
     ON CONFLICT (lab_id, order_number) DO NOTHING`,
    [order1Id]
  );

  // Order Items
  await db.execute(
    `INSERT INTO order_items (id, order_id, test_id, item_name, price, discount, net_price, status)
     VALUES ('item-101', 'ord-1001', 'test-cbc', 'Complete Blood Count (CBC / Hemogram)', 450.0, 0.0, 450.0, 'approved')
     ON CONFLICT DO NOTHING`
  );
  await db.execute(
    `INSERT INTO order_items (id, order_id, test_id, item_name, price, discount, net_price, status)
     VALUES ('item-102', 'ord-1001', 'test-lipid', 'Lipid Profile Screen', 650.0, 100.0, 550.0, 'approved')
     ON CONFLICT DO NOTHING`
  );

  // Samples for Order 1
  const smp1 = 'smp-101';
  const smp2 = 'smp-102';
  await db.execute(
    `INSERT INTO samples (id, lab_id, branch_id, order_id, sample_barcode, sample_type, container_type, status, collected_at, collected_by, processed_at, processed_by)
     VALUES ($1, 'lab-apex', 'branch-apex-central', 'ord-1001', 'SMP-2026-0001', 'Whole Blood (EDTA)', 'Lavender Top', 'completed', CURRENT_TIMESTAMP, 'user-technician', CURRENT_TIMESTAMP, 'user-technician')
     ON CONFLICT (lab_id, sample_barcode) DO NOTHING`,
    [smp1]
  );
  await db.execute(
    `INSERT INTO samples (id, lab_id, branch_id, order_id, sample_barcode, sample_type, container_type, status, collected_at, collected_by, processed_at, processed_by)
     VALUES ($1, 'lab-apex', 'branch-apex-central', 'ord-1001', 'SMP-2026-0002', 'Serum', 'Red Top / SST', 'completed', CURRENT_TIMESTAMP, 'user-technician', CURRENT_TIMESTAMP, 'user-technician')
     ON CONFLICT (lab_id, sample_barcode) DO NOTHING`,
    [smp2]
  );

  // Results for CBC
  const resCbcId = 'res-cbc-101';
  await db.execute(
    `INSERT INTO results (id, order_id, order_item_id, test_id, sample_id, status, entered_by, entered_at, verified_by, verified_at, approved_by, approved_at, clinical_remarks, impression)
     VALUES ($1, 'ord-1001', 'item-101', 'test-cbc', 'smp-101', 'approved', 'user-technician', CURRENT_TIMESTAMP, 'user-pathologist', CURRENT_TIMESTAMP, 'user-pathologist', CURRENT_TIMESTAMP, 'Mild normocytic normochromic red cell picture. Platelet count adequate.', 'Mild Microcytic Hypochromic Anemia')
     ON CONFLICT DO NOTHING`,
    [resCbcId]
  );

  // Result Values for CBC (Notice Hemoglobin is 11.8 g/dL - LOW flag!)
  const cbcValues = [
    { pId: 'param-hb', val: 11.8, flag: 'low', isCrit: 0, ref: '13.0 - 17.0 g/dL' },
    { pId: 'param-rbc', val: 4.82, flag: 'normal', isCrit: 0, ref: '4.50 - 5.90 mill/cu.mm' },
    { pId: 'param-pcv', val: 37.5, flag: 'low', isCrit: 0, ref: '40.0 - 50.0 %' },
    { pId: 'param-mcv', val: 77.8, flag: 'low', isCrit: 0, ref: '80.0 - 100.0 fL' },
    { pId: 'param-mch', val: 24.5, flag: 'low', isCrit: 0, ref: '27.0 - 32.0 pg' },
    { pId: 'param-mchc', val: 31.4, flag: 'low', isCrit: 0, ref: '32.0 - 36.0 g/dL' },
    { pId: 'param-rdw', val: 15.2, flag: 'high', isCrit: 0, ref: '11.5 - 14.5 %' },
    { pId: 'param-wbc', val: 8400, flag: 'normal', isCrit: 0, ref: '4000 - 11000 cells/cu.mm' },
    { pId: 'param-neu', val: 62.0, flag: 'normal', isCrit: 0, ref: '40.0 - 75.0 %' },
    { pId: 'param-lym', val: 28.0, flag: 'normal', isCrit: 0, ref: '20.0 - 45.0 %' },
    { pId: 'param-eos', val: 3.5, flag: 'normal', isCrit: 0, ref: '1.0 - 6.0 %' },
    { pId: 'param-mon', val: 6.0, flag: 'normal', isCrit: 0, ref: '2.0 - 10.0 %' },
    { pId: 'param-bas', val: 0.5, flag: 'normal', isCrit: 0, ref: '0.0 - 1.0 %' },
    { pId: 'param-plt', val: 2.85, flag: 'normal', isCrit: 0, ref: '1.50 - 4.50 lakh/cu.mm' }
  ];

  for (const cv of cbcValues) {
    await db.execute(
      `INSERT INTO result_values (id, result_id, parameter_id, value_numeric, unit, reference_range_text, flag, is_critical)
       VALUES ($1, $2, $3, $4, (SELECT unit FROM test_parameters WHERE id = $3), $5, $6, $7)
       ON CONFLICT DO NOTHING`,
      [`rv-${resCbcId}-${cv.pId}`, resCbcId, cv.pId, cv.val, cv.ref, cv.flag, cv.isCrit]
    );
  }

  // Results for Lipid Profile (Total Cholesterol 242 mg/dL - HIGH flag!, Triglycerides 215 mg/dL - HIGH flag!)
  const resLipidId = 'res-lipid-102';
  await db.execute(
    `INSERT INTO results (id, order_id, order_item_id, test_id, sample_id, status, entered_by, entered_at, verified_by, verified_at, approved_by, approved_at, clinical_remarks, impression)
     VALUES ($1, 'ord-1001', 'item-102', 'test-lipid', 'smp-102', 'approved', 'user-technician', CURRENT_TIMESTAMP, 'user-pathologist', CURRENT_TIMESTAMP, 'user-pathologist', CURRENT_TIMESTAMP, 'Elevated atherogenic lipoprotein levels observed.', 'Moderate Mixed Dyslipidemia (Hypercholesterolemia with Hypertriglyceridemia)')
     ON CONFLICT DO NOTHING`,
    [resLipidId]
  );

  const lipidValues = [
    { pId: 'param-chol-tot', val: 242.0, flag: 'high', isCrit: 0, ref: '125.0 - 200.0 mg/dL' },
    { pId: 'param-hdl', val: 36.5, flag: 'low', isCrit: 0, ref: '40.0 - 60.0 mg/dL' },
    { pId: 'param-ldl', val: 162.5, flag: 'high', isCrit: 0, ref: '50.0 - 100.0 mg/dL' },
    { pId: 'param-trig', val: 215.0, flag: 'high', isCrit: 0, ref: '50.0 - 150.0 mg/dL' },
    { pId: 'param-vldl', val: 43.0, flag: 'high', isCrit: 0, ref: '10.0 - 30.0 mg/dL' }
  ];

  for (const lv of lipidValues) {
    await db.execute(
      `INSERT INTO result_values (id, result_id, parameter_id, value_numeric, unit, reference_range_text, flag, is_critical)
       VALUES ($1, $2, $3, $4, (SELECT unit FROM test_parameters WHERE id = $3), $5, $6, $7)
       ON CONFLICT DO NOTHING`,
      [`rv-${resLipidId}-${lv.pId}`, resLipidId, lv.pId, lv.val, lv.ref, lv.flag, lv.isCrit]
    );
  }

  // Final Released Report for Order 1
  const report1Id = 'rep-1001';
  await db.execute(
    `INSERT INTO reports (id, lab_id, branch_id, order_id, report_number, status, approved_by, approved_at, released_by, released_at, qr_code_data, print_count)
     VALUES ($1, 'lab-apex', 'branch-apex-central', 'ord-1001', 'REP-2026-0001', 'released', 'user-pathologist', CURRENT_TIMESTAMP, 'user-pathologist', CURRENT_TIMESTAMP, 'https://apexlabs.com/verify/REP-2026-0001', 1)
     ON CONFLICT (lab_id, report_number) DO NOTHING`,
    [report1Id]
  );

  // Invoice for Order 1
  await db.execute(
    `INSERT INTO invoices (id, lab_id, branch_id, order_id, invoice_number, subtotal, discount, tax, net_total, paid, due, status)
     VALUES ('inv-1001', 'lab-apex', 'branch-apex-central', 'ord-1001', 'INV-2026-0001', 1100.0, 100.0, 50.0, 1050.0, 1050.0, 0.0, 'paid')
     ON CONFLICT (lab_id, invoice_number) DO NOTHING`
  );

  // Payment Receipt for Order 1
  await db.execute(
    `INSERT INTO payments (id, invoice_id, receipt_number, amount, payment_method, transaction_ref, notes, received_by)
     VALUES ('pay-1001', 'inv-1001', 'REC-2026-0001', 1050.0, 'UPI', 'UPI-TXN-9028310', 'Full payment via Google Pay', 'user-receptionist')
     ON CONFLICT DO NOTHING`
  );

  // DEMO ORDER 2: IN PROCESSING (Priya Sharma - Thyroid + HbA1c)
  await db.execute(
    `INSERT INTO test_orders (id, lab_id, branch_id, order_number, lab_number, patient_id, referring_doctor_id, status, total_amount, discount_amount, tax_amount, net_amount, paid_amount, due_amount, payment_status, clinical_history, created_by)
     VALUES ('ord-1002', 'lab-apex', 'branch-apex-central', 'ORD-2026-0002', 'LAB-2026-0102', 'pat-2', 'doc-2', 'processing', 1150.0, 0.0, 57.5, 1207.5, 1207.5, 0.0, 'paid', 'Pre-employment executive health clearance', 'user-receptionist')
     ON CONFLICT (lab_id, order_number) DO NOTHING`
  );

  await db.execute(
    `INSERT INTO order_items (id, order_id, test_id, item_name, price, discount, net_price, status)
     VALUES ('item-201', 'ord-1002', 'test-thyroid', 'Thyroid Profile (Total T3, Total T4, TSH)', 600.0, 0.0, 600.0, 'processing')
     ON CONFLICT DO NOTHING`
  );
  await db.execute(
    `INSERT INTO order_items (id, order_id, test_id, item_name, price, discount, net_price, status)
     VALUES ('item-202', 'ord-1002', 'test-hba1c', 'HbA1c (Glycated Hemoglobin)', 550.0, 0.0, 550.0, 'processing')
     ON CONFLICT DO NOTHING`
  );

  await db.execute(
    `INSERT INTO samples (id, lab_id, branch_id, order_id, sample_barcode, sample_type, container_type, status, collected_at, collected_by)
     VALUES ('smp-201', 'lab-apex', 'branch-apex-central', 'ord-1002', 'SMP-2026-0003', 'Serum', 'Red Top / SST', 'collected', CURRENT_TIMESTAMP, 'user-technician')
     ON CONFLICT (lab_id, sample_barcode) DO NOTHING`
  );
  await db.execute(
    `INSERT INTO samples (id, lab_id, branch_id, order_id, sample_barcode, sample_type, container_type, status, collected_at, collected_by)
     VALUES ('smp-202', 'lab-apex', 'branch-apex-central', 'ord-1002', 'SMP-2026-0004', 'Whole Blood (EDTA)', 'Lavender Top', 'collected', CURRENT_TIMESTAMP, 'user-technician')
     ON CONFLICT (lab_id, sample_barcode) DO NOTHING`
  );

  await db.execute(
    `INSERT INTO invoices (id, lab_id, branch_id, order_id, invoice_number, subtotal, discount, tax, net_total, paid, due, status)
     VALUES ('inv-1002', 'lab-apex', 'branch-apex-central', 'ord-1002', 'INV-2026-0002', 1150.0, 0.0, 57.5, 1207.5, 1207.5, 0.0, 'paid')
     ON CONFLICT (lab_id, invoice_number) DO NOTHING`
  );

  // DEMO ORDER 3: REGISTERED / PENDING SAMPLE (Marcus Vance - KFT + LFT)
  await db.execute(
    `INSERT INTO test_orders (id, lab_id, branch_id, order_number, lab_number, patient_id, referring_doctor_id, status, total_amount, discount_amount, tax_amount, net_amount, paid_amount, due_amount, payment_status, clinical_history, created_by)
     VALUES ('ord-1003', 'lab-apex', 'branch-apex-north', 'ORD-2026-0003', 'LAB-2026-0103', 'pat-3', 'doc-3', 'registered', 1450.0, 150.0, 65.0, 1365.0, 500.0, 865.0, 'partial', 'Diabetic nephropathy surveillance', 'user-receptionist')
     ON CONFLICT (lab_id, order_number) DO NOTHING`
  );

  await db.execute(
    `INSERT INTO order_items (id, order_id, test_id, item_name, price, discount, net_price, status)
     VALUES ('item-301', 'ord-1003', 'test-kft', 'Kidney Function Test (KFT / Renal Profile)', 700.0, 50.0, 650.0, 'pending')
     ON CONFLICT DO NOTHING`
  );
  await db.execute(
    `INSERT INTO order_items (id, order_id, test_id, item_name, price, discount, net_price, status)
     VALUES ('item-302', 'ord-1003', 'test-lft', 'Liver Function Test (LFT)', 750.0, 100.0, 650.0, 'pending')
     ON CONFLICT DO NOTHING`
  );

  await db.execute(
    `INSERT INTO samples (id, lab_id, branch_id, order_id, sample_barcode, sample_type, container_type, status)
     VALUES ('smp-301', 'lab-apex', 'branch-apex-north', 'ord-1003', 'SMP-2026-0005', 'Serum', 'Red Top / SST', 'pending')
     ON CONFLICT (lab_id, sample_barcode) DO NOTHING`
  );

  await db.execute(
    `INSERT INTO invoices (id, lab_id, branch_id, order_id, invoice_number, subtotal, discount, tax, net_total, paid, due, status)
     VALUES ('inv-1003', 'lab-apex', 'branch-apex-north', 'ord-1003', 'INV-2026-0003', 1450.0, 150.0, 65.0, 1365.0, 500.0, 865.0, 'partial')
     ON CONFLICT (lab_id, invoice_number) DO NOTHING`
  );

  await db.execute(
    `INSERT INTO payments (id, invoice_id, receipt_number, amount, payment_method, notes, received_by)
     VALUES ('pay-1003', 'inv-1003', 'REC-2026-0002', 500.0, 'Cash', 'Advance partial deposit', 'user-receptionist')
     ON CONFLICT DO NOTHING`
  );

  // 15. INITIAL AUDIT LOGS
  await db.execute(
    `INSERT INTO audit_logs (id, lab_id, branch_id, user_id, user_email, user_role, action, entity_type, entity_id, new_values, ip_address)
     VALUES ('aud-1', 'lab-apex', 'branch-apex-central', 'user-superadmin', 'admin@medilabs.com', 'super_admin', 'SYSTEM_INITIALIZATION', 'system', 'mediflow', '{"event": "LIS Core System Seeded with Clinical Catalog"}', '127.0.0.1')
     ON CONFLICT DO NOTHING`
  );

  // 16. REPORT TEMPLATE
  await db.execute(
    `INSERT INTO report_templates (id, lab_id, name, is_default, header_html, footer_html, show_logo, show_qr, show_barcode, show_doctor_signature, show_technician_signature, watermark_text, signature_layout)
     VALUES ('tmpl-apex-default', 'lab-apex', 'Apex Standard Clinical Diagnostic Template', 1,
      '<div style="text-align:center"><h3>APEX DIAGNOSTICS & REFERENCE LABORATORY</h3><p>NABL Accredited Medical Testing Laboratory | ISO 15189:2022 Certified</p></div>',
      '<div style="text-align:center; font-size:10px; color:#666;"><p>Apex Diagnostic Reference Center, 45 Medical Enclave. Helpline: +91 11 4567 8900 | web: www.apexlabs.com</p></div>',
      1, 1, 1, 1, 1, 'APEX DIAGNOSTICS', 'standard')
     ON CONFLICT DO NOTHING`
  );

  // 17. STANDARD CLINICAL SAMPLE TYPES
  const sampleTypes = [
    { id: 'smp-type-edta', code: 'EDTA_WB', name: 'Whole Blood (EDTA)', container: 'Lavender Top (K2/K3 EDTA Tube)', color_code: '#8b5cf6', cap_type: 'Lavender Rubber Hemogard', min_volume: '2.0 mL', storage_requirement: '2-8°C for 24h, do not freeze', processing_instructions: 'Invert gently 8-10 times immediately after phlebotomy' },
    { id: 'smp-type-sst', code: 'SERUM_SST', name: 'Serum (SST Gel Separator)', container: 'Gold Top / Yellow Top SST', color_code: '#eab308', cap_type: 'Gold Gel Separator Hemogard', min_volume: '4.0 mL', storage_requirement: '2-8°C for 48h, -20°C for long term', processing_instructions: 'Allow to clot 30 min, centrifuge at 3000 RPM for 10 min' },
    { id: 'smp-type-plain', code: 'SERUM_PLAIN', name: 'Plain Serum (No Additive)', container: 'Red Top Glass/Plastic Tube', color_code: '#ef4444', cap_type: 'Red Hemogard', min_volume: '4.0 mL', storage_requirement: '2-8°C for 48h', processing_instructions: 'Clot completely 30-45 min, centrifuge at 3000 RPM for 10 min' },
    { id: 'smp-type-citrate', code: 'PLASMA_CITRATE', name: 'Citrated Plasma (Coagulation)', container: 'Light Blue Top (3.2% Sodium Citrate)', color_code: '#3b82f6', cap_type: 'Light Blue Hemogard', min_volume: '2.7 mL', storage_requirement: 'Process within 4h at 18-25°C', processing_instructions: 'Fill strictly to indicator line (9:1 blood to citrate ratio), invert 3-4 times' },
    { id: 'smp-type-fluoride', code: 'PLASMA_FLUORIDE', name: 'Fluoride Plasma (Glucose)', container: 'Gray Top (Sodium Fluoride / Potassium Oxalate)', color_code: '#6b7280', cap_type: 'Gray Hemogard', min_volume: '2.0 mL', storage_requirement: '2-8°C for up to 48h', processing_instructions: 'Invert 8 times immediately to prevent glycolysis' },
    { id: 'smp-type-urine', code: 'URINE_RANDOM', name: 'Random Clean-Catch Urine', container: 'Sterile Screw-Cap Container', color_code: '#f59e0b', cap_type: 'Yellow Screw Cap', min_volume: '20.0 mL', storage_requirement: 'Test within 2h or refrigerate at 2-8°C', processing_instructions: 'Midstream clean-catch collection instruction provided to patient' },
    { id: 'smp-type-stool', code: 'STOOL_CONTAINER', name: 'Stool Specimen', container: 'Sterile Stool Vial with Spoon', color_code: '#78350f', cap_type: 'Brown Screw Cap', min_volume: '5.0 g', storage_requirement: 'Process within 1h, refrigerate if delayed', processing_instructions: 'Collect into clean receptacle, scoop into container without urine contamination' },
    { id: 'smp-type-csf', code: 'CSF_STERILE', name: 'Cerebrospinal Fluid (CSF)', container: 'Sterile Conical Tube', color_code: '#06b6d4', cap_type: 'Clear Screw Top', min_volume: '1.0 mL', storage_requirement: 'STAT testing, never refrigerate microbiology tube', processing_instructions: 'Sequential tube collection (Tube 1 Chemistry, Tube 2 Micro, Tube 3 Hematology)' }
  ];

  for (const st of sampleTypes) {
    await db.execute(
      `INSERT INTO sample_types (id, lab_id, code, name, container, color_code, cap_type, min_volume, storage_requirement, processing_instructions, status)
       VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
       ON CONFLICT DO NOTHING`,
      [st.id, st.code, st.name, st.container, st.color_code, st.cap_type, st.min_volume, st.storage_requirement, st.processing_instructions]
    );
  }

  // ==========================================
  // PHASE 5 SEED DATA — ENTERPRISE MODULES
  // ==========================================

  // 18. EXPENSE CATEGORIES & SAMPLE EXPENSES
  const expCategories = [
    { id: 'ecat-1', name: 'Laboratory Reagents & Consumables', desc: 'Direct test reagents, controls, calibrators' },
    { id: 'ecat-2', name: 'Biomedical Waste & Sterilization', desc: 'Incineration bags, sharps bins, autoclave' },
    { id: 'ecat-3', name: 'Utilities, Power & Fuel', desc: 'Electricity, generator backup diesel, RO water' },
    { id: 'ecat-4', name: 'Courier & Specimen Logistics', desc: 'Temperature-controlled phlebotomy transit' },
    { id: 'ecat-5', name: 'Equipment Maintenance (AMC/CMC)', desc: 'Analyzer calibration and preventive service' },
    { id: 'ecat-6', name: 'Stationery, Barcode Rolls & Reports', desc: 'Thermal labels, certified report cartridges' },
  ];

  for (const ec of expCategories) {
    await db.execute(
      `INSERT INTO expense_categories (id, lab_id, name, description)
       VALUES ($1, 'lab-apex', $2, $3)
       ON CONFLICT DO NOTHING`,
      [ec.id, ec.name, ec.desc]
    );
  }

  // Sample expenses
  await db.execute(
    `INSERT INTO expenses (id, lab_id, branch_id, category_id, title, amount, payment_method, expense_date, payee, notes)
     VALUES ('exp-seed-1', 'lab-apex', 'branch-apex-central', 'ecat-1', 'Monthly Reagent Pack (Sysmex CBC Diluent)', 4200.0, 'Bank Transfer', CURRENT_DATE, 'MedTech Diagnostics Ltd', 'Routine monthly restocking')
     ON CONFLICT DO NOTHING`
  );
  await db.execute(
    `INSERT INTO expenses (id, lab_id, branch_id, category_id, title, amount, payment_method, expense_date, payee, notes)
     VALUES ('exp-seed-2', 'lab-apex', 'branch-apex-central', 'ecat-4', 'Courier charges for sample transit', 650.0, 'Cash', CURRENT_DATE, 'Delhi Speed Courier', 'Express cold-chain transit')
     ON CONFLICT DO NOTHING`
  );

  // 19. INVENTORY: CATEGORIES, SUPPLIERS, ITEMS, BATCHES
  const invCategories = [
    { id: 'invcat-reagents', name: 'Diagnostic Reagents & Kits', desc: 'Automated analyzer chemistry and hematology reagents' },
    { id: 'invcat-tubes', name: 'Blood Collection Tubes & Vacutainers', desc: 'EDTA, SST, Citrate, Fluoride specimen tubes' },
    { id: 'invcat-consumables', name: 'Clinical Consumables', desc: 'Nitrile gloves, syringes, lancets, alcohol swabs' },
    { id: 'invcat-stationery', name: 'Printing & Barcode Media', desc: 'Direct thermal barcode labels and A4 bond paper' },
  ];

  for (const ic of invCategories) {
    await db.execute(
      `INSERT INTO inventory_categories (id, lab_id, name, description)
       VALUES ($1, 'lab-apex', $2, $3)
       ON CONFLICT DO NOTHING`,
      [ic.id, ic.name, ic.desc]
    );
  }

  const suppliers = [
    { id: 'sup-1', name: 'MedTech Life Sciences Ltd', contact: 'Mr. Arvind Saxena', email: 'orders@medtech.com', phone: '+91 98111 22334', gst: '07AAAAA0000A1Z5' },
    { id: 'sup-2', name: 'BD Healthcare Solutions', contact: 'Ms. Priyadarshini Rao', email: 'support@bdhealth.in', phone: '+91 98222 33445', gst: '07BBBBB1111B2Z6' },
    { id: 'sup-3', name: 'Roche Diagnostics India', contact: 'Mr. Vikram Sen', email: 'delhi.sales@roche.com', phone: '+91 98333 44556', gst: '07CCCCC2222C3Z7' },
  ];

  for (const s of suppliers) {
    await db.execute(
      `INSERT INTO suppliers (id, lab_id, name, contact_person, email, phone, gst_number)
       VALUES ($1, 'lab-apex', $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [s.id, s.name, s.contact, s.email, s.phone, s.gst]
    );
  }

  const inventoryItems = [
    { id: 'item-1', code: 'VAC_EDTA_2ML', name: 'K2 EDTA Vacutainer 2.0 mL (Lavender Cap)', unit: 'Pack (100 tubes)', min_stock: 5, max_stock: 50, current_stock: 24, purchase_price: 650.0, cat: 'invcat-tubes', sup: 'sup-2' },
    { id: 'item-2', code: 'VAC_SST_4ML', name: 'Serum Gel Separator Tube 4.0 mL (Gold Cap)', unit: 'Pack (100 tubes)', min_stock: 5, max_stock: 50, current_stock: 18, purchase_price: 850.0, cat: 'invcat-tubes', sup: 'sup-2' },
    { id: 'item-3', code: 'REAG_GLUC_500', name: 'Glucose Hexokinase Reagent Pack 500 mL', unit: 'Bottle (500 mL)', min_stock: 3, max_stock: 20, current_stock: 8, purchase_price: 1800.0, cat: 'invcat-reagents', sup: 'sup-3' },
    { id: 'item-4', code: 'REAG_CBC_DIL', name: 'Sysmex Cellpack CBC Diluent 20 L', unit: 'Cubie (20 L)', min_stock: 2, max_stock: 10, current_stock: 4, purchase_price: 3200.0, cat: 'invcat-reagents', sup: 'sup-1' },
    { id: 'item-5', code: 'CONS_GLOVES_M', name: 'Nitrile Examination Gloves Medium (Powder Free)', unit: 'Box (100 pcs)', min_stock: 10, max_stock: 100, current_stock: 35, purchase_price: 320.0, cat: 'invcat-consumables', sup: 'sup-2' },
    { id: 'item-6', code: 'CONS_SYR_5ML', name: 'Sterile 5 mL Syringe with 22G Needle', unit: 'Box (100 pcs)', min_stock: 8, max_stock: 80, current_stock: 4, purchase_price: 450.0, cat: 'invcat-consumables', sup: 'sup-2' }, // Low stock trigger
  ];

  for (const it of inventoryItems) {
    await db.execute(
      `INSERT INTO inventory_items (id, lab_id, category_id, supplier_id, code, name, unit, min_stock, max_stock, current_stock, purchase_price)
       VALUES ($1, 'lab-apex', $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT DO NOTHING`,
      [it.id, it.cat, it.sup, it.code, it.name, it.unit, it.min_stock, it.max_stock, it.current_stock, it.purchase_price]
    );
  }

  // Inventory batches
  await db.execute(
    `INSERT INTO inventory_batches (id, lab_id, item_id, batch_number, expiry_date, initial_quantity, current_quantity, unit_cost, supplier_id)
     VALUES ('bat-1', 'lab-apex', 'item-3', 'LOT-GLUC-2026B', date('now', '+240 days'), 10, 8, 1800.0, 'sup-3')
     ON CONFLICT DO NOTHING`
  );
  await db.execute(
    `INSERT INTO inventory_batches (id, lab_id, item_id, batch_number, expiry_date, initial_quantity, current_quantity, unit_cost, supplier_id)
     VALUES ('bat-2', 'lab-apex', 'item-4', 'LOT-CELL-099', date('now', '+20 days'), 5, 4, 3200.0, 'sup-1')
     ON CONFLICT DO NOTHING` // Expiring soon trigger (< 30 days)
  );

  // 20. DOCTOR PORTAL & PATIENT PORTAL ACCOUNTS
  const portalPassHash = bcrypt.hashSync('admin123', 10);

  await db.execute(
    `INSERT INTO doctor_portal_accounts (id, lab_id, doctor_id, username, password_hash, email, phone)
     VALUES ('dpa-doc-1', 'lab-apex', 'doc-1', 'dr.arthur', $1, 'dr.arthur@cityhospital.org', '+91 98711 00112')
     ON CONFLICT DO NOTHING`,
    [portalPassHash]
  );

  // Patient account for patient-1
  await db.execute(
    `INSERT INTO patient_portal_accounts (id, lab_id, patient_id, username, password_hash, mobile, email)
     VALUES ('ppa-pt-1', 'lab-apex', 'pat-1', '9836240067', $1, '9836240067', 'rohan.deshmukh@gmail.com')
     ON CONFLICT DO NOTHING`,
    [portalPassHash]
  );

  // 21. NOTIFICATION TEMPLATES FOR 16 CLINICAL TRIGGERS
  const notifTemplates = [
    { event: 'new_patient', channel: 'sms', title: 'Welcome to Apex Labs', body: 'Dear {{patient_name}}, your registration at Apex Diagnostics is confirmed. Your unique Patient ID is {{patient_id_code}}.' },
    { event: 'new_order', channel: 'whatsapp', title: 'Test Order Booked', body: 'Hello {{patient_name}}, your diagnostic order {{order_number}} has been booked. Estimated completion time: {{tat_hours}} hours.' },
    { event: 'sample_collected', channel: 'in_app', title: 'Sample Collected', body: 'Specimen barcode {{sample_barcode}} ({{sample_type}}) collected and queued for analyzer processing.' },
    { event: 'critical_result', channel: 'sms', title: 'URGENT CRITICAL RESULT ALERT', body: 'CRITICAL VALUE ALERT: Patient {{patient_name}} has critical parameter {{param_name}} ({{value}} {{unit}}). Immediate physician review required.' },
    { event: 'report_released', channel: 'whatsapp', title: 'Diagnostic Report Ready', body: 'Dear {{patient_name}}, your verified diagnostic report for Order {{order_number}} is ready. Download here: {{download_url}}' },
    { event: 'payment_received', channel: 'sms', title: 'Payment Receipt', body: 'Received ₹{{amount}} for Invoice {{invoice_number}} via {{payment_method}}. Thank you, Apex Diagnostics.' },
  ];

  for (const nt of notifTemplates) {
    await db.execute(
      `INSERT INTO notification_templates (id, lab_id, event_type, channel, title_template, body_template)
       VALUES ($1, 'lab-apex', $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [`ntpl-${nt.event}-${nt.channel}`, nt.event, nt.channel, nt.title, nt.body]
    );
  }

  // 22. COMMUNICATION PROVIDERS
  await db.execute(
    `INSERT INTO communication_providers (id, lab_id, provider_type, provider_name, config_json, is_active, is_default)
     VALUES ('prov-smtp-1', 'lab-apex', 'smtp', 'AWS SES Medical SMTP Relay', '{"host":"email-smtp.us-east-1.amazonaws.com","port":587,"secure":true,"sender_name":"Apex Diagnostics Certified Reports","sender_email":"reports@apexlabs.com"}', 1, 1)
     ON CONFLICT DO NOTHING`
  );
  await db.execute(
    `INSERT INTO communication_providers (id, lab_id, provider_type, provider_name, config_json, is_active, is_default)
     VALUES ('prov-sms-1', 'lab-apex', 'sms', 'Msg91 Healthcare DLT SMS Gateway', '{"sender_id":"APEXLB","route":"4","dlt_template_id":"170716123456"}', 1, 1)
     ON CONFLICT DO NOTHING`
  );
  await db.execute(
    `INSERT INTO communication_providers (id, lab_id, provider_type, provider_name, config_json, is_active, is_default)
     VALUES ('prov-wa-1', 'lab-apex', 'whatsapp', 'Meta Cloud WhatsApp Business API', '{"phone_number_id":"1049283748291","business_account_id":"39482019482"}', 1, 1)
     ON CONFLICT DO NOTHING`
  );

  // 23. SPECIALIZED REPORT TEMPLATES (Hematology, Biochemistry)
  await db.execute(
    `INSERT INTO report_templates (id, lab_id, name, is_default, header_html, footer_html, show_logo, show_qr, show_barcode, show_doctor_signature, show_technician_signature, watermark_text, signature_layout)
     VALUES ('tmpl-hematology', 'lab-apex', 'Hematology Specialized CBC Layout', 0,
      '<div style="text-align:center"><h3>APEX DEPARTMENT OF HEMATOLOGY & CLINICAL PATHOLOGY</h3><p>Automated 5-Part Differential Hematology Cell Counter</p></div>',
      '<div style="text-align:center; font-size:10px; color:#666;"><p>Apex Reference Laboratory Hematology Division. ISO 15189:2022 Certified.</p></div>',
      1, 1, 1, 1, 1, 'APEX HEMATOLOGY', 'standard')
     ON CONFLICT DO NOTHING`
  );

  // 24. SUBSCRIPTION FEATURES (Enterprise Tier)
  const enterpriseFeatures = [
    'inventory', 'accounting', 'doctor_portal', 'patient_portal', 'whatsapp', 'sms', 'advanced_analytics', 'custom_reports', 'api_access'
  ];
  for (const feat of enterpriseFeatures) {
    await db.execute(
      `INSERT INTO subscription_features (id, plan_id, feature_key, feature_name, is_enabled, quota_limit)
       VALUES ($1, 'plan-enterprise', $2, $3, 1, -1)
       ON CONFLICT DO NOTHING`,
      [`sf-ent-${feat}`, feat, feat.replace('_', ' ').toUpperCase()]
    );
  }

  // ==========================================
  // PHASE 6 SEED DATA — ADVANCED LIS & ANALYZERS
  // ==========================================

  // 25. AUTOMATED CLINICAL ANALYZERS
  const analyzers = [
    {
      id: 'anl-sysmex-xn550',
      name: 'Sysmex XN-550 Automated Hematology Analyzer',
      mfg: 'Sysmex Corporation',
      model: 'XN-550 (Compact 5-Part Diff)',
      serial: 'XN55-893021-IN',
      dept: 'Hematology',
      conn: 'serial',
      proto: 'astm',
      ip: '192.168.1.110',
      port: 5100,
      status: 'online',
      inst_date: '2025-06-15',
      cal_date: '2026-08-10',
      maint: 'monthly'
    },
    {
      id: 'anl-roche-cobas311',
      name: 'Roche Cobas c 311 Clinical Chemistry Analyzer',
      mfg: 'Roche Diagnostics',
      model: 'Cobas c 311 (Photometric / ISE)',
      serial: 'COBAS-311-44021',
      dept: 'Biochemistry',
      conn: 'tcp',
      proto: 'hl7',
      ip: '192.168.1.112',
      port: 5200,
      status: 'online',
      inst_date: '2025-08-01',
      cal_date: '2026-08-25',
      maint: 'monthly'
    },
    {
      id: 'anl-abbott-architect',
      name: 'Abbott ARCHITECT i1000SR Immunoassay Analyzer',
      mfg: 'Abbott Laboratories',
      model: 'ARCHITECT i1000SR (CMIA)',
      serial: 'ARCH-993201',
      dept: 'Immunology',
      conn: 'tcp',
      proto: 'hl7',
      ip: '192.168.1.115',
      port: 5300,
      status: 'online',
      inst_date: '2025-11-20',
      cal_date: '2026-09-01',
      maint: 'monthly'
    },
    {
      id: 'anl-biorad-d10',
      name: 'Bio-Rad D-10 Hemoglobin Testing System (HPLC)',
      mfg: 'Bio-Rad Laboratories',
      model: 'D-10 High Performance Liquid Chromatography',
      serial: 'BRD10-33012',
      dept: 'Clinical Pathology',
      conn: 'serial',
      proto: 'astm',
      ip: '192.168.1.118',
      port: 5400,
      status: 'maintenance',
      inst_date: '2026-01-10',
      cal_date: '2026-07-15',
      maint: 'monthly'
    }
  ];

  for (const a of analyzers) {
    await db.execute(
      `INSERT INTO analyzers (id, lab_id, branch_id, name, manufacturer, model, serial_number, department, connection_type, protocol, ip_address, port, status, installation_date, calibration_date, maintenance_schedule, is_active)
       VALUES ($1, 'lab-apex', 'branch-apex-central', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 1)
       ON CONFLICT DO NOTHING`,
      [a.id, a.name, a.mfg, a.model, a.serial, a.dept, a.conn, a.proto, a.ip, a.port, a.status, a.inst_date, a.cal_date, a.maint]
    );

    await db.execute(
      `INSERT INTO analyzer_connections (id, analyzer_id, status, last_heartbeat, latency_ms, packets_sent, packets_received)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 12, 1420, 1388)
       ON CONFLICT DO NOTHING`,
      [`conn-${a.id}`, a.id, a.status === 'online' ? 'connected' : 'disconnected']
    );
  }

  // 26. ANALYZER PARAMETER TEST MAPPINGS
  // Find test and parameter IDs for CBC and Chemistry
  const hgbParam = await db.queryOne<{ id: string; test_id: string }>(`SELECT id, test_id FROM test_parameters WHERE short_name = 'Hb' OR name LIKE '%Hemoglobin%' LIMIT 1`);
  const wbcParam = await db.queryOne<{ id: string; test_id: string }>(`SELECT id, test_id FROM test_parameters WHERE short_name = 'TLC' OR name LIKE '%Total Leukocyte%' LIMIT 1`);
  const pltParam = await db.queryOne<{ id: string; test_id: string }>(`SELECT id, test_id FROM test_parameters WHERE short_name = 'PLT' OR name LIKE '%Platelet%' LIMIT 1`);
  const glucParam = await db.queryOne<{ id: string; test_id: string }>(`SELECT id, test_id FROM test_parameters WHERE short_name = 'FBS' OR name LIKE '%Glucose%' LIMIT 1`);
  const creatParam = await db.queryOne<{ id: string; test_id: string }>(`SELECT id, test_id FROM test_parameters WHERE short_name = 'Cr' OR name LIKE '%Creatinine%' LIMIT 1`);

  if (hgbParam) {
    await db.execute(
      `INSERT INTO analyzer_test_mappings (id, lab_id, analyzer_id, test_id, parameter_id, analyzer_test_code, analyzer_parameter_name, loinc_code, unit, decimal_precision)
       VALUES ('map-sys-hgb', 'lab-apex', 'anl-sysmex-xn550', $1, $2, 'HGB', 'Hemoglobin Photometric', '718-7', 'g/dL', 1)
       ON CONFLICT DO NOTHING`,
      [hgbParam.test_id, hgbParam.id]
    );
  }
  if (wbcParam) {
    await db.execute(
      `INSERT INTO analyzer_test_mappings (id, lab_id, analyzer_id, test_id, parameter_id, analyzer_test_code, analyzer_parameter_name, loinc_code, unit, decimal_precision)
       VALUES ('map-sys-wbc', 'lab-apex', 'anl-sysmex-xn550', $1, $2, 'WBC', 'White Blood Cells Flow Cytometry', '6690-2', '10^3/uL', 2)
       ON CONFLICT DO NOTHING`,
      [wbcParam.test_id, wbcParam.id]
    );
  }
  if (pltParam) {
    await db.execute(
      `INSERT INTO analyzer_test_mappings (id, lab_id, analyzer_id, test_id, parameter_id, analyzer_test_code, analyzer_parameter_name, loinc_code, unit, decimal_precision)
       VALUES ('map-sys-plt', 'lab-apex', 'anl-sysmex-xn550', $1, $2, 'PLT', 'Platelet Impedance Count', '777-3', '10^3/uL', 0)
       ON CONFLICT DO NOTHING`,
      [pltParam.test_id, pltParam.id]
    );
  }
  if (glucParam) {
    await db.execute(
      `INSERT INTO analyzer_test_mappings (id, lab_id, analyzer_id, test_id, parameter_id, analyzer_test_code, analyzer_parameter_name, loinc_code, unit, decimal_precision)
       VALUES ('map-cob-gluc', 'lab-apex', 'anl-roche-cobas311', $1, $2, 'GLUC', 'Glucose Hexokinase UV', '1558-6', 'mg/dL', 1)
       ON CONFLICT DO NOTHING`,
      [glucParam.test_id, glucParam.id]
    );
  }
  if (creatParam) {
    await db.execute(
      `INSERT INTO analyzer_test_mappings (id, lab_id, analyzer_id, test_id, parameter_id, analyzer_test_code, analyzer_parameter_name, loinc_code, unit, decimal_precision)
       VALUES ('map-cob-crea', 'lab-apex', 'anl-roche-cobas311', $1, $2, 'CREA', 'Creatinine Enzymatic Rate', '2160-0', 'mg/dL', 2)
       ON CONFLICT DO NOTHING`,
      [creatParam.test_id, creatParam.id]
    );
  }

  // 27. CLINICAL CALCULATION FORMULAS
  const testLipid = await db.queryOne<{ id: string }>(`SELECT id FROM tests WHERE code LIKE '%LIPID%' OR name LIKE '%Lipid%' LIMIT 1`);
  const paramLdl = await db.queryOne<{ id: string }>(`SELECT id FROM test_parameters WHERE name LIKE '%LDL%' LIMIT 1`);
  if (testLipid && paramLdl) {
    await db.execute(
      `INSERT INTO calculation_formulas (id, lab_id, test_id, target_parameter_id, formula_name, formula_expression, formula_variables, decimal_precision, is_active, version)
       VALUES ('calc-friedewald-ldl', 'lab-apex', $1, $2, 'Friedewald LDL Equation', 'chol - hdl - (trig / 5)', '{"chol":"param-chol","hdl":"param-hdl","trig":"param-trig"}', 1, 1, 1)
       ON CONFLICT DO NOTHING`,
      [testLipid.id, paramLdl.id]
    );
  }

  // 28. DELTA CHECK RULES (Patient Historical Trend Alerts)
  if (hgbParam) {
    await db.execute(
      `INSERT INTO delta_check_rules (id, lab_id, test_id, parameter_id, max_percent_change, max_absolute_change, lookback_days, action, is_active)
       VALUES ('delta-hgb', 'lab-apex', $1, $2, 20.0, 2.5, 30, 'flag', 1)
       ON CONFLICT DO NOTHING`,
      [hgbParam.test_id, hgbParam.id]
    );
  }
  if (creatParam) {
    await db.execute(
      `INSERT INTO delta_check_rules (id, lab_id, test_id, parameter_id, max_percent_change, max_absolute_change, lookback_days, action, is_active)
       VALUES ('delta-creat', 'lab-apex', $1, $2, 30.0, 0.4, 30, 'flag', 1)
       ON CONFLICT DO NOTHING`,
      [creatParam.test_id, creatParam.id]
    );
  }

  // 29. AUTO-VALIDATION RULES
  const cbcTest = await db.queryOne<{ id: string }>(`SELECT id FROM tests WHERE code = 'CBC' OR name LIKE '%Complete Blood%' LIMIT 1`);
  if (cbcTest) {
    await db.execute(
      `INSERT INTO auto_validation_rules (id, lab_id, branch_id, department, test_id, allow_auto_validate, require_in_range, require_qc_pass, require_no_delta, is_active)
       VALUES ('avr-cbc', 'lab-apex', 'branch-apex-central', 'Hematology', $1, 1, 1, 1, 1, 1)
       ON CONFLICT DO NOTHING`,
      [cbcTest.id]
    );
  }

  // 30. QUALITY CONTROL: MATERIALS, LOTS, TARGETS, AND RUNS
  await db.execute(
    `INSERT INTO qc_materials (id, lab_id, name, manufacturer, level, storage_temp, notes, is_active)
     VALUES ('qcm-hem-norm', 'lab-apex', 'Bio-Rad Lyphochek Hematology Control (Normal)', 'Bio-Rad Laboratories', 'Level 2 (Normal)', '2-8 C', 'Whole blood hematology reference control', 1)
     ON CONFLICT DO NOTHING`
  );
  await db.execute(
    `INSERT INTO qc_materials (id, lab_id, name, manufacturer, level, storage_temp, notes, is_active)
     VALUES ('qcm-chem-norm', 'lab-apex', 'Bio-Rad Liquichek Assayed Chemistry Control (Level 2)', 'Bio-Rad Laboratories', 'Level 2 (Normal)', '-20 C', 'Serum multi-analyte clinical chemistry control', 1)
     ON CONFLICT DO NOTHING`
  );

  await db.execute(
    `INSERT INTO qc_lots (id, lab_id, material_id, lot_number, expiry_date, is_active, opened_at)
     VALUES ('qclot-hem-2026', 'lab-apex', 'qcm-hem-norm', 'LOT-HEM-9022A', date('now', '+180 days'), 1, CURRENT_TIMESTAMP)
     ON CONFLICT DO NOTHING`
  );
  await db.execute(
    `INSERT INTO qc_lots (id, lab_id, material_id, lot_number, expiry_date, is_active, opened_at)
     VALUES ('qclot-chem-2026', 'lab-apex', 'qcm-chem-norm', 'LOT-CHEM-8841B', date('now', '+240 days'), 1, CURRENT_TIMESTAMP)
     ON CONFLICT DO NOTHING`
  );

  // Targets for Hemoglobin QC on Sysmex
  if (hgbParam) {
    await db.execute(
      `INSERT INTO qc_targets (id, lab_id, lot_id, analyzer_id, test_id, parameter_id, mean, sd, cv_percent, min_acceptable, max_acceptable)
       VALUES ('qctarg-hgb', 'lab-apex', 'qclot-hem-2026', 'anl-sysmex-xn550', $1, $2, 13.5, 0.4, 2.96, 12.3, 14.7)
       ON CONFLICT DO NOTHING`,
      [hgbParam.test_id, hgbParam.id]
    );

    // Seed 15 realistic Levey-Jennings historical data points (Mean = 13.5, SD = 0.4)
    const ljValues = [13.4, 13.6, 13.5, 13.7, 13.3, 13.5, 13.8, 13.4, 13.5, 13.6, 13.4, 13.5, 13.9, 13.5, 13.4];
    for (let i = 0; i < ljValues.length; i++) {
      const val = ljValues[i];
      const z = Number(((val - 13.5) / 0.4).toFixed(2));
      const status = Math.abs(z) >= 3 ? 'reject' : (Math.abs(z) >= 2 ? 'warning' : 'pass');
      await db.execute(
        `INSERT INTO qc_results (id, lab_id, lot_id, analyzer_id, test_id, parameter_id, value, z_score, status, rule_violations, run_time, entered_by, remarks)
         VALUES ($1, 'lab-apex', 'qclot-hem-2026', 'anl-sysmex-xn550', $2, $3, $4, $5, $6, '[]', datetime('now', '-' || $7 || ' days'), 'user-technician', 'Daily Morning Shift QC Run')
         ON CONFLICT DO NOTHING`,
        [`qcres-hgb-${i + 1}`, hgbParam.test_id, hgbParam.id, val, z, status, (15 - i)]
      );
    }
  }

  // 31. LABORATORY EQUIPMENT ASSET MASTER
  const equipmentList = [
    { id: 'eq-cent-1', asset_id: 'EQ-CENT-01', name: 'Eppendorf 5810R Refrigerated Clinical Centrifuge', cat: 'centrifuge', mfg: 'Eppendorf SE', model: '5810 R', loc: 'Processing Bay 1', status: 'operational', next_maint: date('now', '+45 days') },
    { id: 'eq-micro-1', asset_id: 'EQ-MICR-01', name: 'Olympus CX23 LED Binocular Biological Microscope', cat: 'microscope', mfg: 'Evident Olympus', model: 'CX23 LED', loc: 'Pathology Suite A', status: 'operational', next_maint: date('now', '+60 days') },
    { id: 'eq-fridge-1', asset_id: 'EQ-FRIG-01', name: 'Haier Biomedical Laboratory Refrigerator (+4 C)', cat: 'refrigerator', mfg: 'Haier Biomedical', model: 'HYC-390', loc: 'Sample Accession Cold Room', status: 'operational', next_maint: date('now', '+90 days') },
    { id: 'eq-freezer-1', asset_id: 'EQ-FRZ-01', name: 'Thermo Scientific Forma -20 C Plasma Freezer', cat: 'freezer', mfg: 'Thermo Fisher Scientific', model: 'Forma 700', loc: 'Biobank Cold Storage', status: 'operational', next_maint: date('now', '+75 days') },
  ];

  function date(s: string, off: string) {
    return new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0];
  }

  for (const eq of equipmentList) {
    await db.execute(
      `INSERT INTO equipment (id, lab_id, branch_id, asset_id, name, category, manufacturer, model, location, status, next_maintenance_date)
       VALUES ($1, 'lab-apex', 'branch-apex-central', $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT DO NOTHING`,
      [eq.id, eq.asset_id, eq.name, eq.cat, eq.mfg, eq.model, eq.loc, eq.status, eq.next_maint]
    );

    // Preventive maintenance log
    await db.execute(
      `INSERT INTO equipment_maintenance (id, lab_id, equipment_id, maintenance_type, scheduled_date, completed_date, performed_by_vendor, service_cost, downtime_hours, work_summary, status)
       VALUES ($1, 'lab-apex', $2, 'preventive', date('now', '-30 days'), date('now', '-30 days'), 'MedTech Service Engineering', 2500.0, 1.5, 'Routine quarterly lubrication, rotor inspection, and thermal check', 'completed')
       ON CONFLICT DO NOTHING`,
      [`maint-${eq.id}`, eq.id]
    );
  }

  // 32. REAGENT LOTS TRACKING
  await db.execute(
    `INSERT INTO reagent_lots (id, lab_id, item_id, analyzer_id, lot_number, expiry_date, quantity_received, quantity_remaining, storage_location, status, opened_date)
     VALUES ('rlot-1', 'lab-apex', 'item-4', 'anl-sysmex-xn550', 'LOT-CELLPACK-0881', date('now', '+120 days'), 10, 7.5, 'Analyzer Bay Reagent Rack', 'active', date('now', '-10 days'))
     ON CONFLICT DO NOTHING`
  );

  // 33. DEVELOPER API KEYS & WEBHOOKS
  await db.execute(
    `INSERT INTO api_keys (id, lab_id, name, api_key_hash, api_key_prefix, permissions, rate_limit_rpm, is_active)
     VALUES ('apk-demo-his', 'lab-apex', 'City Hospital HIS Connector', 'hash_sha256_mock_live_secret', 'med_live_his9012', '["orders:read","results:read","patients:create"]', 120, 1)
     ON CONFLICT DO NOTHING`
  );

  await db.execute(
    `INSERT INTO webhooks (id, lab_id, name, target_url, secret, subscribed_events, is_active)
     VALUES ('wh-city-his', 'lab-apex', 'City Hospital EMR Webhook Dispatcher', 'https://his.cityhospital.org/api/webhooks/mediflow', 'sec_hmac_9941a02f891', '["order.created","result.imported","report.released","critical.detected"]', 1)
     ON CONFLICT DO NOTHING`
  );

  // 34. MULTI-LANGUAGE TRANSLATIONS (English & Hindi)
  const translations = [
    { key: 'nav.dashboard', en: 'Dashboard', hi: 'डैशबोर्ड' },
    { key: 'nav.patients', en: 'Patients', hi: 'मरीज़ (Patients)' },
    { key: 'nav.orders', en: 'Test Orders', hi: 'जांच आदेश (Orders)' },
    { key: 'nav.results', en: 'Result Entry', hi: 'परिणाम प्रविष्टि' },
    { key: 'nav.reports', en: 'Diagnostic Reports', hi: 'जांच रिपोर्ट' },
    { key: 'nav.analyzers', en: 'Analyzers', hi: 'एनालाइज़र' },
    { key: 'nav.qc', en: 'Quality Control', hi: 'गुणवत्ता नियंत्रण (QC)' },
    { key: 'nav.inventory', en: 'Inventory', hi: 'सामग्री / स्टॉक' },
    { key: 'status.normal', en: 'Normal', hi: 'सामान्य' },
    { key: 'status.abnormal', en: 'Abnormal', hi: 'असामान्य' },
    { key: 'status.critical', en: 'Critical Panic Value', hi: 'अति-गंभीर मान' }
  ];

  for (const t of translations) {
    await db.execute(
      `INSERT INTO translations (id, language_code, translation_key, translated_text)
       VALUES ($1, 'en', $2, $3)
       ON CONFLICT (language_code, translation_key) DO UPDATE SET translated_text = EXCLUDED.translated_text`,
      [`tr-en-${t.key}`, t.key, t.en]
    );
    await db.execute(
      `INSERT INTO translations (id, language_code, translation_key, translated_text)
       VALUES ($1, 'hi', $2, $3)
       ON CONFLICT (language_code, translation_key) DO UPDATE SET translated_text = EXCLUDED.translated_text`,
      [`tr-hi-${t.key}`, t.key, t.hi]
    );
  }

  // 35. MULTI-CURRENCY ENGINE
  const currencies = [
    { id: 'curr-inr', code: 'INR', symbol: '₹', name: 'Indian Rupee', rate: 1.0, dec: 2, def: 1 },
    { id: 'curr-usd', code: 'USD', symbol: '$', name: 'US Dollar', rate: 0.012, dec: 2, def: 0 },
    { id: 'curr-eur', code: 'EUR', symbol: '€', name: 'Euro', rate: 0.011, dec: 2, def: 0 },
    { id: 'curr-gbp', code: 'GBP', symbol: '£', name: 'British Pound', rate: 0.0094, dec: 2, def: 0 },
    { id: 'curr-aed', code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', rate: 0.044, dec: 2, def: 0 }
  ];

  for (const c of currencies) {
    await db.execute(
      `INSERT INTO currencies (id, code, symbol, name, exchange_rate_to_inr, decimal_places, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (code) DO UPDATE SET exchange_rate_to_inr = EXCLUDED.exchange_rate_to_inr, is_default = EXCLUDED.is_default`,
      [c.id, c.code, c.symbol, c.name, c.rate, c.dec, c.def]
    );
  }

  // 36. ENTERPRISE MULTI-LAB ORGANIZATIONS (Phase 7)
  await db.execute(
    `INSERT INTO organizations (id, name, code, logo_url, billing_currency, contact_email, contact_phone, status)
     VALUES ('org-apollo-health', 'Apollo Healthcare & Diagnostic Network', 'APOLLO-HEALTH', '/logos/apollo.png', 'INR', 'director@apollohealth.org', '+91 98765 43210', 'active')
     ON CONFLICT (code) DO NOTHING`
  );

  await db.execute(
    `UPDATE laboratories SET organization_id = 'org-apollo-health' WHERE id = 'lab-apex'`
  );

  await db.execute(
    `INSERT INTO organization_laboratories (id, organization_id, lab_id, is_primary)
     VALUES ('orglab-apex', 'org-apollo-health', 'lab-apex', 1)
     ON CONFLICT (organization_id, lab_id) DO NOTHING`
  );

  // 37. AI CLINICAL RULES & ASSISTIVE SUGGESTIONS (Phase 7)
  const aiRules = [
    { id: 'air-01', name: 'Abnormal Result Context Summarizer', code: 'trend_analysis', cond: 'on_abnormal_result' },
    { id: 'air-02', name: 'Auto-Draft Pathologist Observations', code: 'report_draft', cond: 'on_report_drafting' },
    { id: 'air-03', name: 'STAT Order SLA Delay Risk Predictor', code: 'tat_prediction', cond: 'on_stat_order' },
    { id: 'air-04', name: 'Levey-Jennings Drift & Bias Detector', code: 'qc_anomaly', cond: 'on_qc_shift' },
    { id: 'air-05', name: 'Reagent Consumption & Depletion Forecaster', code: 'inventory_forecast', cond: 'on_stock_decrement' }
  ];

  for (const r of aiRules) {
    await db.execute(
      `INSERT INTO ai_rules (id, lab_id, rule_name, feature_code, trigger_condition, is_enabled)
       VALUES ($1, 'lab-apex', $2, $3, $4, 1)
       ON CONFLICT DO NOTHING`,
      [r.id, r.name, r.code, r.cond]
    );
  }

  // Seed sample AI assistive suggestions
  await db.execute(
    `INSERT INTO ai_suggestions (id, lab_id, entity_type, entity_id, suggestion_type, suggestion_label, content_text, confidence_score, metadata_json, status)
     VALUES ('ais-01', 'lab-apex', 'result', 'res-01dbe528', 'trend_flag', 'AI-Generated Suggestion',
             'Patient Hemoglobin exhibits a declining trend (-18.2% vs 30-day baseline, previously 14.2 g/dL, current 11.6 g/dL). Recommend peripheral smear review for microcytic hypochromic picture.',
             0.92, '{"delta_percent": -18.2, "baseline_value": 14.2, "current_value": 11.6, "direction": "decreasing"}', 'pending')
     ON CONFLICT DO NOTHING`
  );

  await db.execute(
    `INSERT INTO ai_suggestions (id, lab_id, entity_type, entity_id, suggestion_type, suggestion_label, content_text, confidence_score, metadata_json, status)
     VALUES ('ais-02', 'lab-apex', 'report', 'rep-01dbe528', 'comment_suggestion', 'AI-Generated Suggestion',
             'Non-Diagnostic Clinical Observation: Serum creatinine is within normal clinical limits. Estimated GFR (CKD-EPI) indicates normal renal filtration function. Clinical correlation advised.',
             0.88, '{"suggested_section": "Clinical Pathologist Comments", "patient_friendly": true}', 'accepted')
     ON CONFLICT DO NOTHING`
  );

  // 38. SECURE DOCUMENT REPOSITORY (Phase 7)
  await db.execute(
    `INSERT INTO documents (id, lab_id, branch_id, category, title, file_url, file_size_bytes, mime_type, version, expiry_date, uploaded_by)
     VALUES ('doc-nabl-cert', 'lab-apex', 'branch-apex-central', 'license', 'NABL ISO 15189:2022 Medical Lab Accreditation Certificate', '/documents/nabl_cert_2026.pdf', 245800, 'application/pdf', 1, '2028-12-31', 'user-labadmin')
     ON CONFLICT DO NOTHING`
  );

  await db.execute(
    `INSERT INTO documents (id, lab_id, branch_id, category, title, file_url, file_size_bytes, mime_type, version, expiry_date, uploaded_by)
     VALUES ('doc-sysmex-amc', 'lab-apex', 'branch-apex-central', 'maintenance_doc', 'Sysmex XN-550 Comprehensive Annual Maintenance Contract (AMC)', '/documents/sysmex_amc.pdf', 184500, 'application/pdf', 1, '2027-06-30', 'user-labadmin')
     ON CONFLICT DO NOTHING`
  );

  // 39. ENTERPRISE MULTI-STEP APPROVAL WORKFLOWS (Phase 7)
  await db.execute(
    `INSERT INTO approval_workflows (id, lab_id, workflow_type, name, description, steps_count, is_active)
     VALUES ('wf-discount-high', 'lab-apex', 'discount', 'High Discount Order Approval (>15%)', 'Requires Lab Administrator sign-off for billing discounts exceeding 15%.', 1, 1)
     ON CONFLICT DO NOTHING`
  );

  await db.execute(
    `INSERT INTO approval_steps (id, workflow_id, step_order, required_role, step_name, approval_mode)
     VALUES ('step-disc-1', 'wf-discount-high', 1, 'lab_admin', 'Lab Admin Authorization', 'single')
     ON CONFLICT DO NOTHING`
  );

  await db.execute(
    `INSERT INTO approval_workflows (id, lab_id, workflow_type, name, description, steps_count, is_active)
     VALUES ('wf-refund-multi', 'lab-apex', 'refund', 'Patient Invoice Refund Approval (>₹500)', 'Two-step approval by Finance Accountant and Laboratory Admin.', 2, 1)
     ON CONFLICT DO NOTHING`
  );

  await db.execute(
    `INSERT INTO approval_steps (id, workflow_id, step_order, required_role, step_name, approval_mode)
     VALUES ('step-ref-1', 'wf-refund-multi', 1, 'accountant', 'Accountant Verification', 'single')
     ON CONFLICT DO NOTHING`
  );

  await db.execute(
    `INSERT INTO approval_steps (id, workflow_id, step_order, required_role, step_name, approval_mode)
     VALUES ('step-ref-2', 'wf-refund-multi', 2, 'lab_admin', 'Executive Final Approval', 'single')
     ON CONFLICT DO NOTHING`
  );

  // Seed sample active approval request
  await db.execute(
    `INSERT INTO approval_requests (id, lab_id, workflow_id, entity_type, entity_id, requested_by, current_step, status, request_payload, decision_notes)
     VALUES ('apr-001', 'lab-apex', 'wf-discount-high', 'discount', 'ord-demo-01', 'user-receptionist', 1, 'pending',
             '{"order_number": "ORD-2026-000019", "discount_requested_percent": 20, "discount_amount": 180, "patient_name": "Rohan Deshmukh", "reason": "Senior Citizen Welfare Scheme"}',
             'Pending Lab Admin review')
     ON CONFLICT DO NOTHING`
  );

  // 40. ENTERPRISE FEATURE FLAGS (Phase 7)
  const flags = [
    { key: 'ai_assistant', name: 'Assistive AI Clinical Engine', desc: 'AI trend summaries, comment suggestions, and anomaly flags' },
    { key: 'mobile_sync', name: 'Mobile Application Sync', desc: 'Real-time synchronization for iOS/Android/PWA staff apps' },
    { key: 'offline_mode', name: 'Offline-First Sample Collection', desc: 'Local queueing and conflict resolution during network outages' },
    { key: 'hl7_gateway', name: 'HL7 v2.x & ASTM Gateway', desc: 'Bidirectional analyzer interfacing on TCP listening ports' },
    { key: 'white_label', name: 'White-Label Multi-Tenant Branding', desc: 'Custom logos, domain mapping, and branded report templates' },
    { key: 'custom_domains', name: 'Custom Domain Portal Routing', desc: 'Direct vanity domains with SSL certificates' },
    { key: 'advanced_analytics', name: 'Enterprise Command Center & 24 Reports', desc: 'Consolidated cross-lab financial, TAT, and clinical analytics' }
  ];

  for (const f of flags) {
    await db.execute(
      `INSERT INTO feature_flags (id, flag_key, name, description, scope, is_enabled, rollout_percentage)
       VALUES ($1, $2, $3, $4, 'global', 1, 100)
       ON CONFLICT (flag_key) DO UPDATE SET is_enabled = EXCLUDED.is_enabled`,
      [`flag-${f.key}`, f.key, f.name, f.desc]
    );
  }

  // 41. WHITE-LABEL BRANDING & CUSTOM DOMAIN (Phase 7)
  await db.execute(
    `INSERT INTO white_label_settings (id, lab_id, organization_id, brand_name, logo_url, favicon_url, primary_color, secondary_color, accent_color, report_header_html, report_footer_html, support_email, support_phone)
     VALUES ('wl-apex', 'lab-apex', 'org-apollo-health', 'Apex Diagnostics Enterprise LIS', '/branding/apex_logo.png', '/favicon.ico', '#0284c7', '#0f172a', '#38bdf8',
             '<div style="text-align:center; font-weight:bold;">Apex Reference Laboratories — NABL Accredited ISO 15189</div>',
             '<div style="text-align:center; font-size:10px;">Computer generated diagnostic report. Authorized by Consultant Pathologist.</div>',
             'support@apexdiagnostics.com', '+91 22 4000 8000')
     ON CONFLICT DO NOTHING`
  );

  await db.execute(
    `INSERT INTO custom_domains (id, lab_id, organization_id, domain_name, ssl_status, dns_verified, is_active)
     VALUES ('cd-apex', 'lab-apex', 'org-apollo-health', 'portal.apexdiagnostics.com', 'active', 1, 1)
     ON CONFLICT (domain_name) DO NOTHING`
  );

  // 42. ACTIVE USER SESSIONS & MOBILE SYNC QUEUE (Phase 7)
  await db.execute(
    `INSERT INTO active_sessions (id, user_id, lab_id, ip_address, user_agent, device_type, is_revoked)
     VALUES ('sess-admin-active', 'user-labadmin', 'lab-apex', '192.168.1.104', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0', 'desktop', 0)
     ON CONFLICT DO NOTHING`
  );

  await db.execute(
    `INSERT INTO mobile_devices (id, user_id, lab_id, device_name, platform, app_version, push_token, is_trusted)
     VALUES ('dev-phleb-tab1', 'user-technician', 'lab-apex', 'Phlebotomy Field Tablet A1', 'android', '2.4.1', 'fcm_tok_89a02fb1', 1)
     ON CONFLICT DO NOTHING`
  );

  await db.execute(
    `INSERT INTO offline_transactions (id, lab_id, branch_id, device_id, action_type, payload_json, status, queued_at, synced_at)
     VALUES ('otx-001', 'lab-apex', 'branch-apex-central', 'dev-phleb-tab1', 'sample_collection',
             '{"sample_barcode": "SMP-2026-000026", "patient_id": "pid-2026-0001", "phlebotomist": "user-technician", "timestamp": "2026-09-14T18:30:00Z"}',
             'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT DO NOTHING`
  );

  // 43. PHASE 9: ENTERPRISE OPERATIONS, AUTOMATION, PROCUREMENT & CRM
  console.log('📦 Seeding Phase 9 Enterprise Operations, Automation, Procurement, and QMS...');

  // 43.1 Centralized Enterprise Tasks
  await db.execute(
    `INSERT INTO enterprise_tasks (id, lab_id, branch_id, task_number, title, description, source_type, department, priority, status, sla_hours, due_date)
     VALUES ('tsk-001', 'lab-apex', 'branch-apex-central', 'TSK-2026-00001', 'Investigate Sample Delay for Specimen SMP-2026-000021', 'CBC sample processing exceeded target TAT SLA threshold of 2.0 hours', 'sample_delay', 'hematology', 'high', 'in_progress', 4, CURRENT_TIMESTAMP),
            ('tsk-002', 'lab-apex', 'branch-apex-central', 'TSK-2026-00002', 'Critical Panic Value Telephonic Notification', 'Platelet count 18,000 /uL requires mandatory verbal communication to referring doctor', 'critical_result', 'pathology', 'critical', 'assigned', 1, CURRENT_TIMESTAMP),
            ('tsk-003', 'lab-apex', 'branch-apex-central', 'TSK-2026-00003', 'Reagent Restock: Hematology Lyse Reagent Low', 'Current stock is below safety reorder threshold of 5 packs', 'inventory_shortage', 'inventory', 'medium', 'open', 24, CURRENT_TIMESTAMP)
     ON CONFLICT (id) DO NOTHING`
  );

  // 43.2 Automation Rules
  await db.execute(
    `INSERT INTO automation_rules (id, lab_id, name, description, trigger_event, conditions_json, actions_json, is_active, version, execution_count)
     VALUES ('rule-delay-alert', 'lab-apex', 'Sample Turnaround Delay Escalation', 'Escalate delayed samples to Lab Supervisor if pending > 2 hours', 'SAMPLE_DELAYED',
             '[{"field": "tat_delay_minutes", "operator": ">", "value": 120, "logical_op": "AND"}]',
             '[{"action_type": "CREATE_TASK", "params": {"priority": "high", "department": "laboratory"}}, {"action_type": "NOTIFY_USER", "params": {"role": "lab_admin", "channel": "in_app"}}]',
             1, 1, 14),
            ('rule-reagent-auto', 'lab-apex', 'Low Stock Requisition Generator', 'Automatically generate inventory task when reagent stock drops below safety level', 'REAGENT_LOW',
             '[{"field": "current_stock", "operator": "<", "value": "min_stock", "logical_op": "AND"}]',
             '[{"action_type": "CREATE_TASK", "params": {"priority": "medium", "department": "procurement"}}]',
             1, 1, 8),
            ('rule-qc-hold', 'lab-apex', 'Westgard QC Violation Analyzer Safety Hold', 'Flag analyzer status as maintenance required when Westgard 1:3s rule is breached', 'QC_FAILURE',
             '[{"field": "rule_code", "operator": "=", "value": "1_3s", "logical_op": "AND"}]',
             '[{"action_type": "HOLD_ANALYZER_WORKFLOW", "params": {"hold_reason": "Westgard 1_3s Out of Control"}}]',
             1, 1, 3)
     ON CONFLICT (id) DO NOTHING`
  );

  // 43.3 Scheduled Jobs
  await db.execute(
    `INSERT INTO scheduled_jobs (id, lab_id, job_name, job_type, cron_schedule, timezone, recipient_emails, delivery_channel, is_active, last_execution_status, last_executed_at)
     VALUES ('job-daily-digest', 'lab-apex', 'Daily Operational KPI Digest', 'daily_report', '0 20 * * *', 'Asia/Kolkata', 'admin@apexlabs.com', 'email', 1, 'success', CURRENT_TIMESTAMP),
            ('job-reagent-radar', 'lab-apex', 'Reagent & Lot Expiry Early Warning', 'expiry_check', '0 8 * * *', 'Asia/Kolkata', 'inventory@apexlabs.com', 'email', 1, 'success', CURRENT_TIMESTAMP),
            ('job-tat-monitor', 'lab-apex', 'Real-time TAT Breach Sentinel', 'tat_monitor', '*/15 * * * *', 'Asia/Kolkata', 'supervisor@apexlabs.com', 'in_app', 1, 'success', CURRENT_TIMESTAMP)
     ON CONFLICT (id) DO NOTHING`
  );

  // 43.4 Suppliers
  await db.execute(
    `INSERT INTO suppliers (id, lab_id, supplier_code, name, company_name, contact_person, email, phone, address, city, state, tax_number, payment_terms, rating, categories_json, status)
     VALUES ('sup-sysmex', 'lab-apex', 'SUP-001', 'Sysmex Diagnostics India Pvt Ltd', 'Sysmex Diagnostics India Pvt Ltd', 'Rajesh Sharma', 'orders@sysmex.in', '+91 22 6123 4567', 'MIDC Andheri East', 'Mumbai', 'Maharashtra', '27AABCS1429B1Z2', 'net_30', 4.9, '["reagents","analyzers"]', 'active'),
            ('sup-biorad', 'lab-apex', 'SUP-002', 'Bio-Rad Laboratories India', 'Bio-Rad Laboratories India', 'Meera Nair', 'sales@bio-rad.in', '+91 124 400 9000', 'Udyog Vihar Phase IV', 'Gurgaon', 'Haryana', '06AAACB1209M1Z5', 'net_30', 4.8, '["qc_materials","controls"]', 'active'),
            ('sup-himedia', 'lab-apex', 'SUP-003', 'HiMedia Laboratories', 'HiMedia Laboratories', 'Anand Kulkarni', 'info@himedialabs.com', '+91 22 2500 3000', 'LBS Marg, Vikhroli', 'Mumbai', 'Maharashtra', '27AAACH1190C1Z8', 'net_15', 4.7, '["consumables","microbiology"]', 'active')
     ON CONFLICT (id) DO NOTHING`
  );

  // 43.5 Purchase Orders & Items
  await db.execute(
    `INSERT INTO purchase_orders (id, lab_id, branch_id, po_number, supplier_id, po_date, expected_delivery_date, subtotal, tax_amount, total_amount, payment_terms, approval_status, created_by)
     VALUES ('po-2026-001', 'lab-apex', 'branch-apex-central', 'PO-2026-0001', 'sup-sysmex', CURRENT_DATE, CURRENT_DATE, 45000.0, 8100.0, 53100.0, 'net_30', 'approved', 'user-labadmin')
     ON CONFLICT (id) DO NOTHING`
  );

  await db.execute(
    `INSERT INTO purchase_order_items (id, po_id, item_name, sku, quantity, received_quantity, unit_price, tax_percentage, total_price)
     VALUES ('poi-001', 'po-2026-001', 'Cellpack DCL Reagent Diluent (20L)', 'SYS-DCL-20L', 5, 5, 4500.0, 18.0, 26550.0),
            ('poi-002', 'po-2026-001', 'Lysercell WNR Lyse Pack (5L)', 'SYS-WNR-5L', 3, 3, 7500.0, 18.0, 26550.0)
     ON CONFLICT (id) DO NOTHING`
  );

  // 43.6 Goods Receipts (GRN)
  await db.execute(
    `INSERT INTO goods_receipts (id, lab_id, branch_id, grn_number, po_id, supplier_id, receipt_date, invoice_delivery_challan_no, received_by, status, qc_passed, notes)
     VALUES ('grn-2026-001', 'lab-apex', 'branch-apex-central', 'GRN-2026-0001', 'po-2026-001', 'sup-sysmex', CURRENT_DATE, 'INV-SYS-98421', 'user-technician', 'verified', 1, 'All seals intact, cold chain temperature verified at 4.2C')
     ON CONFLICT (id) DO NOTHING`
  );

  await db.execute(
    `INSERT INTO goods_receipt_items (id, grn_id, po_item_id, item_name, received_quantity, accepted_quantity, batch_lot_number, expiry_date, storage_location)
     VALUES ('gri-001', 'grn-2026-001', 'poi-001', 'Cellpack DCL Reagent Diluent (20L)', 5, 5, 'LOT-DCL-2609', '2027-09-30', 'Warehouse Bay A1'),
            ('gri-002', 'grn-2026-001', 'poi-002', 'Lysercell WNR Lyse Pack (5L)', 3, 3, 'LOT-WNR-2608', '2027-08-15', 'Cold Room Shelf B2')
     ON CONFLICT (id) DO NOTHING`
  );

  // 43.7 Supplier Contracts
  await db.execute(
    `INSERT INTO supplier_contracts (id, lab_id, entity_type, entity_id, contract_number, title, contract_value, start_date, end_date, responsible_person, status)
     VALUES ('con-sysmex-amc', 'lab-apex', 'analyzer_service', 'ana-sysmex-xn550', 'CON-AMC-2026-01', 'Comprehensive Annual Maintenance Contract (CAMC) Sysmex XN-550', 120000.0, '2026-01-01', '2026-12-31', 'Lab Director Dr. Jenkins', 'active'),
            ('con-biorad-qc', 'lab-apex', 'supplier', 'sup-biorad', 'CON-QC-2026-02', 'Unity Inter-laboratory QC Program Annual Enrollment', 45000.0, '2026-04-01', '2027-03-31', 'Chief Pathologist', 'active')
     ON CONFLICT (id) DO NOTHING`
  );

  // 43.8 CRM & Corporate Accounts
  await db.execute(
    `INSERT INTO corporate_accounts (id, lab_id, company_name, account_code, contact_person, email, phone, billing_address, tax_id, credit_limit, current_outstanding, discount_percentage, status)
     VALUES ('corp-tata', 'lab-apex', 'Tata Consultancy Services Healthcare Wing', 'CORP-TCS-01', 'Vikramaditya Sengupta', 'healthdesk@tcs.com', '+91 22 6778 1000', 'TCS Olympus, Thane West', '27AAACT2809A1Z1', 500000.0, 18500.0, 20.0, 'active'),
            ('corp-infosys', 'lab-apex', 'Infosys Wellness & Occupational Health', 'CORP-INF-02', 'Deepa Murthy', 'wellness@infosys.com', '+91 80 2852 0261', 'Electronics City, Bengaluru', '29AAACI4320L1Z9', 400000.0, 0.0, 18.0, 'active')
     ON CONFLICT (id) DO NOTHING`
  );

  await db.execute(
    `INSERT INTO corporate_employees (id, corporate_id, employee_id_code, name, gender, designation, mobile)
     VALUES ('cemp-001', 'corp-tata', 'EMP-TCS-10492', 'Siddharth Roy', 'male', 'Principal Consultant', '9820011223'),
            ('cemp-002', 'corp-tata', 'EMP-TCS-10884', 'Ananya Deshpande', 'female', 'Software Engineer', '9820099887')
     ON CONFLICT (id) DO NOTHING`
  );

  // 43.9 Marketing Campaigns & Health Camps
  await db.execute(
    `INSERT INTO campaigns (id, lab_id, name, campaign_type, target_audience, discount_percentage, start_date, end_date, status, total_leads, converted_orders, campaign_revenue)
     VALUES ('cmp-monsoon', 'lab-apex', 'Monsoon Fever & Dengue Screening Drive', 'preventive_screening', 'Local residential societies and corporate campuses', 25.0, CURRENT_DATE, CURRENT_DATE, 'active', 48, 22, 19800.0)
     ON CONFLICT (id) DO NOTHING`
  );

  await db.execute(
    `INSERT INTO health_camps (id, lab_id, camp_name, organizing_body, location, camp_date, target_patients, registered_patients_count, samples_collected_count, status)
     VALUES ('camp-itpark', 'lab-apex', 'Annual Corporate Preventive Wellness Camp', 'Hiranandani Tech Park Welfare Society', 'Auditorium Hall B, Powai', CURRENT_DATE, 150, 42, 38, 'in_progress')
     ON CONFLICT (id) DO NOTHING`
  );

  // 43.10 Field Phlebotomists & Home Collection
  await db.execute(
    `INSERT INTO phlebotomists (id, lab_id, branch_id, name, mobile, assigned_zone, vehicle_number, current_status, rating, total_collections)
     VALUES ('phleb-001', 'lab-apex', 'branch-apex-central', 'Vikram Singh', '9819922334', 'Central Mumbai Zone 1', 'MH-02-DW-4921', 'available', 4.95, 128),
            ('phleb-002', 'lab-apex', 'branch-apex-central', 'Rajesh K. Pawar', '9820033445', 'Western Suburbs Zone 2', 'MH-03-EK-9820', 'available', 4.88, 94)
     ON CONFLICT (id) DO NOTHING`
  );

  await db.execute(
    `INSERT INTO home_collection_requests (id, lab_id, branch_id, request_number, patient_name, mobile, address, scheduled_date, scheduled_time_slot, tests_requested, collection_fee, assigned_phlebotomist_id, status)
     VALUES ('hc-2026-001', 'lab-apex', 'branch-apex-central', 'HC-2026-0001', 'Sunita R. Kadam', '9821144556', 'Flat 402, Sea Breeze Apts, Worli Sea Face', CURRENT_DATE, '07:30 AM - 08:30 AM', 'Complete Blood Count, Fasting Blood Sugar, Lipid Profile', 150.0, 'phleb-001', 'assigned')
     ON CONFLICT (id) DO NOTHING`
  );

  // 43.11 Appointments & Queue Tokens
  await db.execute(
    `INSERT INTO appointments (id, lab_id, branch_id, appointment_number, patient_name, mobile, appointment_type, appointment_date, time_slot, tests_requested, status)
     VALUES ('apt-2026-001', 'lab-apex', 'branch-apex-central', 'APT-2026-0001', 'Dr. Alok Verma', '9820055667', 'walk_in', CURRENT_DATE, '09:00 AM - 09:30 AM', 'Executive Comprehensive Screening', 'confirmed')
     ON CONFLICT (id) DO NOTHING`
  );

  await db.execute(
    `INSERT INTO queue_tokens (id, lab_id, branch_id, token_number, token_category, patient_name, status, counter_room)
     VALUES ('qtok-001', 'lab-apex', 'branch-apex-central', 'A-01', 'sample_collection', 'Ramesh Gupta', 'serving', 'Phlebotomy Room 1'),
            ('qtok-002', 'lab-apex', 'branch-apex-central', 'A-02', 'sample_collection', 'Kavita Shenoy', 'waiting', 'Phlebotomy Room 1'),
            ('qtok-003', 'lab-apex', 'branch-apex-central', 'B-01', 'billing', 'Deepak Patil', 'waiting', 'Counter 2 (Billing)')
     ON CONFLICT (id) DO NOTHING`
  );

  // 43.12 Workforce Shifts & Attendance
  await db.execute(
    `INSERT INTO shifts (id, lab_id, name, start_time, end_time, department, color_code)
     VALUES ('shift-morn', 'lab-apex', 'Morning Analytical Shift', '07:00', '15:30', 'laboratory', '#0284c7'),
            ('shift-eve', 'lab-apex', 'Evening Analytical Shift', '14:30', '22:30', 'laboratory', '#f59e0b'),
            ('shift-night', 'lab-apex', 'Night Emergency On-Call Shift', '22:00', '07:30', 'emergency', '#8b5cf6')
     ON CONFLICT (id) DO NOTHING`
  );

  await db.execute(
    `INSERT INTO attendance (id, lab_id, branch_id, user_id, attendance_date, check_in_time, shift_id, status)
     VALUES ('att-001', 'lab-apex', 'branch-apex-central', 'user-technician', CURRENT_DATE, CURRENT_TIMESTAMP, 'shift-morn', 'present'),
            ('att-002', 'lab-apex', 'branch-apex-central', 'user-pathologist', CURRENT_DATE, CURRENT_TIMESTAMP, 'shift-morn', 'present')
     ON CONFLICT (id) DO NOTHING`
  );

  // 43.13 Support Tickets & Knowledge Base
  await db.execute(
    `INSERT INTO support_tickets (id, lab_id, ticket_number, category, subject, description, priority, status, assigned_to, requester_name)
     VALUES ('tkt-2026-001', 'lab-apex', 'TKT-2026-0001', 'analyzer_issue', 'Sysmex XN-550 Bi-Directional Host Query Communication Intermittent', 'Host query ASTM protocol drops packet checksum occasionally during high volume batches', 'high', 'in_progress', 'user-labadmin', 'Alex Rivera (Chief MLT)')
     ON CONFLICT (id) DO NOTHING`
  );

  await db.execute(
    `INSERT INTO knowledge_articles (id, lab_id, title, slug, category, content_markdown, is_published, access_level)
     VALUES ('kb-001', 'lab-apex', 'Sysmex XN-550 Daily Maintenance & Host Communication SOP', 'sysmex-xn550-sop', 'analyzer_guides',
             '# Sysmex XN-550 Operational Guide\n\n1. Ensure daily shutdown cycle with Cellclean reagent.\n2. Verify background check WBC < 0.1, RBC < 0.02, HGB < 0.1, PLT < 10.\n3. Keep ASTM RS-232 / TCP gateway connected on port 5100.', 1, 'internal')
     ON CONFLICT (id) DO NOTHING`
  );

  // 43.14 SOPs, Incidents, CAPA & Risk Register
  await db.execute(
    `INSERT INTO sops (id, lab_id, sop_number, title, department, category, version, status, content_text, effective_date, review_date)
     VALUES ('sop-hem-01', 'lab-apex', 'SOP-HEM-001', 'Standard Operating Procedure for Routine Complete Blood Count (CBC)', 'hematology', 'analytical', '2.0', 'published',
             'Purpose: To standardize quantitative automated analysis of blood cellular elements using impedance and optical fluorescence flow cytometry in accordance with ISO 15189:2022 standards.',
             '2026-01-01', '2027-01-01')
     ON CONFLICT (id) DO NOTHING`
  );

  await db.execute(
    `INSERT INTO incidents (id, lab_id, branch_id, incident_number, incident_type, severity, department, description, immediate_containment_action, reported_by, status)
     VALUES ('inc-2026-001', 'lab-apex', 'branch-apex-central', 'INC-2026-0001', 'sample_issue', 'medium', 'phlebotomy',
             'Hemolyzed blood specimen received from satellite collection kiosk for Potassium analysis.',
             'Specimen rejected immediately; phlebotomist instructed to collect fresh repeat specimen free of charge with patient consent.',
             'user-technician', 'capa_initiated')
     ON CONFLICT (id) DO NOTHING`
  );

  await db.execute(
    `INSERT INTO capa_records (id, lab_id, incident_id, capa_number, root_cause_analysis, root_cause_category, corrective_action, preventive_action, assigned_to, status)
     VALUES ('capa-2026-001', 'lab-apex', 'inc-2026-001', 'CAPA-2026-0001',
             'Needle gauge size 25G used with vigorous tube shaking during field phlebotomy caused mechanical red cell lysis.',
             'procedure_gap',
             'Fresh specimen collected using 21G vacuum system; Potassium reported normally.',
             'Phlebotomy staff refresher training on gentle tube inversion (5-8 times) and correct needle gauge selection.',
             'user-pathologist', 'implemented')
     ON CONFLICT (id) DO NOTHING`
  );

  await db.execute(
    `INSERT INTO risk_register (id, lab_id, risk_number, title, category, probability, impact, risk_score, inherent_risk_level, mitigation_strategy, residual_risk_level, status)
     VALUES ('rsk-2026-001', 'lab-apex', 'RSK-2026-001', 'Cold Chain Failure in Satellite Branch Sample Transport', 'supply_chain', 2, 4, 8, 'high',
             'Deploy digital data loggers with temperature excursion alarms inside all sample transport courier boxes.', 'low', 'active')
     ON CONFLICT (id) DO NOTHING`
  );

  // 43.15 Enterprise Assets & Regulatory Licenses
  await db.execute(
    `INSERT INTO assets (id, lab_id, branch_id, asset_code, name, category, manufacturer, model_number, purchase_date, purchase_cost, warranty_expiry, status)
     VALUES ('ast-001', 'lab-apex', 'branch-apex-central', 'AST-2026-0001', 'Sysmex XN-550 Automated Hematology System', 'lab_equipment', 'Sysmex Corporation', 'XN-550', '2024-03-15', 1850000.0, '2027-03-15', 'operational'),
            ('ast-002', 'lab-apex', 'branch-apex-central', 'AST-2026-0002', 'Zebra ZD421 Direct Thermal Barcode Printer', 'printer', 'Zebra Technologies', 'ZD421', '2025-01-10', 38000.0, '2027-01-10', 'operational')
     ON CONFLICT (id) DO NOTHING`
  );

  await db.execute(
    `INSERT INTO licenses (id, lab_id, license_type, license_number, issuing_authority, issue_date, expiry_date, reminder_period_days, responsible_person, status)
     VALUES ('lic-001', 'lab-apex', 'nabl_accreditation', 'MC-3912', 'National Accreditation Board for Testing and Calibration Laboratories (NABL)', '2025-06-01', '2027-05-31', 90, 'Dr. Sarah Jenkins (Quality Manager)', 'active'),
            ('lic-002', 'lab-apex', 'state_pollution_control', 'MPCB/BMW/2026/891', 'Maharashtra Pollution Control Board (Bio-Medical Waste Authorization)', '2024-10-01', '2026-09-30', 60, 'Facility Administrator', 'expiring_soon')
     ON CONFLICT (id) DO NOTHING`
  );

  // 43.16 Multi-Tier Pricing Rules
  await db.execute(
    `INSERT INTO pricing_rules (id, lab_id, test_id, rule_type, target_id, price_override, discount_percentage, min_floor_price, is_active)
     VALUES ('pr-corp-tcs', 'lab-apex', NULL, 'corporate', 'corp-tata', 0.0, 20.0, 150.0, 1),
            ('pr-promo-camp', 'lab-apex', NULL, 'promotional', 'cmp-monsoon', 0.0, 25.0, 120.0, 1)
     ON CONFLICT (id) DO NOTHING`
  );

  console.log('✅ Clinical seed dataset successfully populated with Phase 6, 7 & 9 Enterprise masters.');
}

if (require.main === module) {
  runSeeds()
    .then(() => {
      console.log('🎉 Database seeding complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Seeding error:', err);
      process.exit(1);
    });
}
