-- ============================================================
-- Blood Diagnostic LIS Database Indexes
-- High-Performance Multi-Tenant & Query Optimization
-- ============================================================

-- Multi-Tenant Laboratory Indexes
CREATE INDEX IF NOT EXISTS idx_users_lab ON users(lab_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_branches_lab ON branches(lab_id);
CREATE INDEX IF NOT EXISTS idx_laboratories_status ON laboratories(status);
CREATE INDEX IF NOT EXISTS idx_laboratories_code ON laboratories(code);
CREATE INDEX IF NOT EXISTS idx_subs_lab ON subscriptions(lab_id);
CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_lab ON notifications(lab_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_audit_lab ON audit_logs(lab_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_patients_lab ON patients(lab_id);
CREATE INDEX IF NOT EXISTS idx_orders_lab ON test_orders(lab_id);
CREATE INDEX IF NOT EXISTS idx_samples_lab ON samples(lab_id);
CREATE INDEX IF NOT EXISTS idx_results_lab ON results(lab_id);
CREATE INDEX IF NOT EXISTS idx_reports_lab ON reports(lab_id);
CREATE INDEX IF NOT EXISTS idx_invoices_lab ON invoices(lab_id);
