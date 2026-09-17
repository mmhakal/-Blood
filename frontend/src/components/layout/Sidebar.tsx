import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity, LayoutDashboard, Building2, GitBranch, CreditCard, Users,
  UserCheck, Stethoscope, ClipboardList, TestTubes, FlaskConical, FileCheck,
  FileText, Receipt, Package, BarChart3, ShieldCheck, Database, Settings, LogOut, Bell,
  DollarSign, Wallet, FileSpreadsheet, Boxes, Cpu, Network, Award, Wrench, Scan,
  Clock, Sliders, Code, Server, Sparkles, Globe, Palette, Smartphone, Search, Lock, Radio,
  Zap, Upload, Truck, Bike, Briefcase, Calculator, BookOpen, Layers
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, logout, hasPermission } = useAuth();
  const isSuperAdmin = user?.role_code === 'super_admin';

  return (
    <aside className="app-sidebar">
      <div className="sidebar-header">
        <div style={{
          width: 38,
          height: 38,
          borderRadius: 8,
          backgroundColor: '#0284c7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)'
        }}>
          <Activity size={22} />
        </div>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>MediFlow LIS</h2>
          <span style={{ fontSize: 11, color: '#0ea5e9', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {isSuperAdmin ? 'Super Admin' : user?.lab_name?.substring(0, 20) || 'Diagnostic LIS'}
          </span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {/* SUPER ADMIN NAVIGATION */}
        {isSuperAdmin ? (
          <>
            <div className="sidebar-nav-category">System Overview</div>
            <NavLink to="/onboarding" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ color: '#10b981' }}>
              <Zap size={18} />
              <span>Onboarding Hub</span>
            </NavLink>
            <NavLink to="/command-center" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ color: '#38bdf8' }}>
              <Radio size={18} />
              <span>Command Center</span>
            </NavLink>
            <NavLink to="/operations" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ color: '#0284c7' }}>
              <Activity size={18} />
              <span>Operations Center</span>
            </NavLink>
            <NavLink to="/automation" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ color: '#a21caf' }}>
              <Zap size={18} />
              <span>Automation Engine</span>
            </NavLink>
            <NavLink to="/procurement" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ color: '#047857' }}>
              <Truck size={18} />
              <span>Procurement & PO</span>
            </NavLink>
            <NavLink to="/crm" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Briefcase size={18} />
              <span>CRM & Corporate B2B</span>
            </NavLink>
            <NavLink to="/field-services" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Bike size={18} />
              <span>Field Services & Fleet</span>
            </NavLink>
            <NavLink to="/workforce" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Users size={18} />
              <span>Workforce & Rostering</span>
            </NavLink>
            <NavLink to="/quality-governance" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <BookOpen size={18} />
              <span>Quality QMS & CAPA</span>
            </NavLink>
            <NavLink to="/pricing-profitability" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Calculator size={18} />
              <span>Pricing & Margin BI</span>
            </NavLink>
            <NavLink to="/search" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Search size={18} />
              <span>Intelligent Search</span>
            </NavLink>
            <NavLink to="/import" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Upload size={18} />
              <span>Data Migration</span>
            </NavLink>
            <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/organizations" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Building2 size={18} />
              <span>Organizations</span>
            </NavLink>
            <NavLink to="/laboratories" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Building2 size={18} />
              <span>Laboratories</span>
            </NavLink>
            <NavLink to="/branches" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <GitBranch size={18} />
              <span>Branches</span>
            </NavLink>
            <NavLink to="/subscriptions" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <CreditCard size={18} />
              <span>Subscription Plans</span>
            </NavLink>
            <NavLink to="/users" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Users size={18} />
              <span>All Users</span>
            </NavLink>
            <NavLink to="/tests" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <TestTubes size={18} />
              <span>Global Test Master</span>
            </NavLink>

            <div className="sidebar-nav-category">Governance & Data</div>
            <NavLink to="/module-governance" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ color: '#38bdf8' }}>
              <Layers size={18} />
              <span>Module Architecture</span>
            </NavLink>
            <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>

              <BarChart3 size={18} />
              <span>System Analytics</span>
            </NavLink>
            <NavLink to="/audit-logs" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <ShieldCheck size={18} />
              <span>Audit Logs</span>
            </NavLink>
            <NavLink to="/notifications" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Bell size={18} />
              <span>Notifications</span>
            </NavLink>
            <NavLink to="/backup" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Database size={18} />
              <span>Backup & Restore</span>
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Settings size={18} />
              <span>System Settings</span>
            </NavLink>

            <div className="sidebar-nav-category">Enterprise & Platform</div>
            <NavLink to="/ai-hub" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ color: '#c084fc' }}>
              <Sparkles size={18} />
              <span>AI Clinical Hub</span>
            </NavLink>
            <NavLink to="/approvals" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <ShieldCheck size={18} />
              <span>Approval Workflows</span>
            </NavLink>
            <NavLink to="/documents" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <FileText size={18} />
              <span>Document Repository</span>
            </NavLink>
            <NavLink to="/mobile-sync" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Smartphone size={18} />
              <span>Mobile Fleet Sync</span>
            </NavLink>
            <NavLink to="/white-label" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Palette size={18} />
              <span>White-Label & Domains</span>
            </NavLink>
            <NavLink to="/security-center" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Lock size={18} />
              <span>Security Center</span>
            </NavLink>
            <NavLink to="/feature-flags" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Sliders size={18} />
              <span>Feature Flags</span>
            </NavLink>
            <NavLink to="/developer" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Code size={18} />
              <span>Developer & Webhooks</span>
            </NavLink>
            <NavLink to="/system-health" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Server size={18} />
              <span>System Telemetry</span>
            </NavLink>
          </>
        ) : (
          /* LAB ADMIN & CLINICAL STAFF NAVIGATION */
          <>
            <div className="sidebar-nav-category">Diagnostic Center</div>
            <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </NavLink>

            {(hasPermission('view_patients') || hasPermission('create_patient')) && (
              <NavLink to="/patients" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <UserCheck size={18} />
                <span>Patients</span>
              </NavLink>
            )}

            {hasPermission('manage_doctors') && (
              <NavLink to="/doctors" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Stethoscope size={18} />
                <span>Referring Doctors</span>
              </NavLink>
            )}

            {(hasPermission('view_orders') || hasPermission('create_order')) && (
              <NavLink to="/orders" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <ClipboardList size={18} />
                <span>Test Orders</span>
              </NavLink>
            )}

            <div className="sidebar-nav-category">Laboratory Workflow & LIS</div>

            {hasPermission('collect_sample') && (
              <>
                <NavLink to="/lis/accession" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <Scan size={18} />
                  <span>Sample Accession Desk</span>
                </NavLink>
                <NavLink to="/lis/work-queues" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <Clock size={18} />
                  <span>Work Queues & TAT</span>
                </NavLink>
                <NavLink to="/samples" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <FlaskConical size={18} />
                  <span>Sample Tracking</span>
                </NavLink>
              </>
            )}

            {hasPermission('enter_results') && (
              <NavLink to="/results" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <TestTubes size={18} />
                <span>Result Entry</span>
              </NavLink>
            )}

            {hasPermission('verify_results') && (
              <NavLink to="/verification" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <FileCheck size={18} />
                <span>Verification Desk</span>
              </NavLink>
            )}

            {hasPermission('print_report') && (
              <NavLink to="/reports" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <FileText size={18} />
                <span>Diagnostic Reports</span>
              </NavLink>
            )}

            <div className="sidebar-nav-category">Analyzers & Automation</div>
            <NavLink to="/analyzers" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Cpu size={18} />
              <span>Analyzer Network</span>
            </NavLink>
            <NavLink to="/analyzers/hl7" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Network size={18} />
              <span>HL7 & ASTM Gateway</span>
            </NavLink>
            <NavLink to="/lis/rules" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Sliders size={18} />
              <span>Clinical Rules Engine</span>
            </NavLink>

            <div className="sidebar-nav-category">Quality & Equipment</div>
            <NavLink to="/quality-control" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Activity size={18} />
              <span>Levey-Jennings QC</span>
            </NavLink>
            <NavLink to="/equipment" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Wrench size={18} />
              <span>Equipment Lifecycle</span>
            </NavLink>
            <NavLink to="/calibrations" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Award size={18} />
              <span>Instrument Calibrations</span>
            </NavLink>

            <div className="sidebar-nav-category">Finance & Accounts</div>

            {hasPermission('manage_billing') && (
              <>
                <NavLink to="/billing" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <Receipt size={18} />
                  <span>Billing & Invoices</span>
                </NavLink>
                <NavLink to="/accounting" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <DollarSign size={18} />
                  <span>Financial Management</span>
                </NavLink>
                <NavLink to="/accounting/expenses" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <Wallet size={18} />
                  <span>Expense Manager</span>
                </NavLink>
                <NavLink to="/accounting/receivables" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <FileSpreadsheet size={18} />
                  <span>Receivables Aging</span>
                </NavLink>
                <NavLink to="/accounting/cash-closing" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <CreditCard size={18} />
                  <span>Shift Cash Closing</span>
                </NavLink>
              </>
            )}

            <div className="sidebar-nav-category">Inventory & Logistics</div>
            <NavLink to="/inventory" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Boxes size={18} />
              <span>Inventory Control</span>
            </NavLink>
            <NavLink to="/inventory/items" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Package size={18} />
              <span>Item Master</span>
            </NavLink>
            <NavLink to="/inventory/transactions" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Activity size={18} />
              <span>Stock Transactions</span>
            </NavLink>
            <NavLink to="/inventory/transfers" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <GitBranch size={18} />
              <span>Branch Transfers</span>
            </NavLink>

            <div className="sidebar-nav-category">Diagnostic Master & Network</div>

            {hasPermission('manage_tests') && (
              <>
                <NavLink to="/tests" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <TestTubes size={18} />
                  <span>Tests & Parameters</span>
                </NavLink>
                <NavLink to="/packages" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <Package size={18} />
                  <span>Health Packages</span>
                </NavLink>
              </>
            )}

            {hasPermission('manage_branches') && (
              <NavLink to="/branches" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <GitBranch size={18} />
                <span>Branches</span>
              </NavLink>
            )}

            {hasPermission('manage_users') && (
              <NavLink to="/users" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Users size={18} />
                <span>Staff & Roles</span>
              </NavLink>
            )}

            <div className="sidebar-nav-category">System & Communications</div>

            {hasPermission('view_analytics') && (
              <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <BarChart3 size={18} />
                <span>Analytics & 24 Reports</span>
              </NavLink>
            )}

            <NavLink to="/templates" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <FileText size={18} />
              <span>Report Designer</span>
            </NavLink>

            <NavLink to="/communication" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Bell size={18} />
              <span>SMS / WhatsApp Gateway</span>
            </NavLink>

            {hasPermission('view_audit_logs') && (
              <NavLink to="/audit-logs" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <ShieldCheck size={18} />
                <span>Audit Logs</span>
              </NavLink>
            )}

            <NavLink to="/notifications" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Bell size={18} />
              <span>Notifications</span>
            </NavLink>
            {hasPermission('manage_lab_settings') && (
              <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Settings size={18} />
                <span>Multi-Tier Settings</span>
              </NavLink>
            )}

            {hasPermission('manage_backup') && (
              <NavLink to="/backup" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Database size={18} />
                <span>Backup Center</span>
              </NavLink>
            )}

            <div className="sidebar-nav-category">Enterprise Command & AI</div>
            <NavLink to="/onboarding" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ color: '#10b981' }}>
              <Zap size={18} />
              <span>Onboarding Hub</span>
            </NavLink>
            <NavLink to="/command-center" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ color: '#38bdf8' }}>
              <Radio size={18} />
              <span>Command Center</span>
            </NavLink>
            <NavLink to="/search" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Search size={18} />
              <span>Intelligent Search</span>
            </NavLink>
            <NavLink to="/import" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Upload size={18} />
              <span>Data Migration</span>
            </NavLink>
            <NavLink to="/approvals" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <ShieldCheck size={18} />
              <span>Approval Center</span>
            </NavLink>
            <NavLink to="/documents" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <FileText size={18} />
              <span>Document Archive</span>
            </NavLink>
            <NavLink to="/mobile-sync" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Smartphone size={18} />
              <span>Mobile Fleet Sync</span>
            </NavLink>
            <NavLink to="/white-label" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Palette size={18} />
              <span>White-Label Branding</span>
            </NavLink>
            <NavLink to="/security-center" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Lock size={18} />
              <span>Security Center</span>
            </NavLink>

            <div className="sidebar-nav-category">Operations & Automation</div>
            <NavLink to="/operations" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ color: '#0284c7' }}>
              <Activity size={18} />
              <span>Operations Center</span>
            </NavLink>
            <NavLink to="/automation" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ color: '#a21caf' }}>
              <Zap size={18} />
              <span>Automation Engine</span>
            </NavLink>
            <NavLink to="/procurement" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ color: '#047857' }}>
              <Truck size={18} />
              <span>Procurement & Supply</span>
            </NavLink>
            <NavLink to="/crm" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Briefcase size={18} />
              <span>CRM & Corporate B2B</span>
            </NavLink>
            <NavLink to="/field-services" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Bike size={18} />
              <span>Field & Token Queue</span>
            </NavLink>
            <NavLink to="/workforce" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Users size={18} />
              <span>Workforce Attendance</span>
            </NavLink>
            <NavLink to="/quality-governance" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <BookOpen size={18} />
              <span>QMS & CAPA Desk</span>
            </NavLink>
            <NavLink to="/pricing-profitability" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Calculator size={18} />
              <span>Pricing & Profitability</span>
            </NavLink>

            <div className="sidebar-nav-category">Enterprise & Platform</div>
            <NavLink to="/developer" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Code size={18} />
              <span>Developer APIs & Webhooks</span>
            </NavLink>
            <NavLink to="/system-health" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Server size={18} />
              <span>System Health & Status</span>
            </NavLink>

            <div className="sidebar-nav-category">External Portals</div>
            <a href="/doctor/login" target="_blank" rel="noopener noreferrer" className="nav-link" style={{ color: '#0ea5e9' }}>
              <Stethoscope size={18} />
              <span>Doctor Portal ↗</span>
            </a>
            <a href="/patient/login" target="_blank" rel="noopener noreferrer" className="nav-link" style={{ color: '#10b981' }}>
              <UserCheck size={18} />
              <span>Patient Portal ↗</span>
            </a>
          </>
        )}

        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          <button
            onClick={logout}
            className="nav-link"
            style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left', color: '#f87171' }}
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </nav>
    </aside>
  );
};
