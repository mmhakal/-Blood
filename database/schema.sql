-- ============================================================
-- Blood Diagnostic Laboratory Management Software (LIS)
-- Phase 2 Canonical Relational Database Schema
-- Dual-Engine Compatible: PostgreSQL & Embedded Relational SQLite
-- ============================================================

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
  features TEXT, -- JSON array of enabled feature codes
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
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
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
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
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  UNIQUE(lab_id, code)
);

-- 5. ROLES
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  lab_id TEXT, -- NULL for global system roles (super_admin, lab_admin, etc.)
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
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  reset_token TEXT,
  reset_token_expires_at TIMESTAMP,
  last_login_at TIMESTAMP,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
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
  status TEXT DEFAULT 'active', -- trial, active, expiring_soon, expired, suspended, cancelled
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  price_paid REAL DEFAULT 0.0,
  billing_cycle TEXT DEFAULT 'monthly', -- monthly, quarterly, annual, custom
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lab_id) REFERENCES laboratories(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

-- 11. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  lab_id TEXT, -- NULL for system-wide notifications
  user_id TEXT, -- NULL for lab-wide notifications
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- info, success, warning, danger
  is_read BOOLEAN DEFAULT 0,
  link TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. AUDIT LOGS (Append-Only)
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

-- 13. SAMPLE TYPES MASTER
CREATE TABLE IF NOT EXISTS sample_types (
  id TEXT PRIMARY KEY,
  lab_id TEXT,
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

-- 14. TEST SAMPLE REQUIREMENTS
CREATE TABLE IF NOT EXISTS test_sample_requirements (
  test_id TEXT NOT NULL,
  sample_type_id TEXT NOT NULL,
  min_volume TEXT,
  is_primary BOOLEAN DEFAULT 1,
  PRIMARY KEY (test_id, sample_type_id)
);

