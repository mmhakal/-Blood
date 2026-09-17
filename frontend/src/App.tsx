import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Layout
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { Login } from './pages/auth/Login';
import { SuperAdminDashboard } from './pages/dashboard/SuperAdminDashboard';
import { LabAdminDashboard } from './pages/dashboard/LabAdminDashboard';
import { PatientList } from './pages/patients/PatientList';
import { DoctorList } from './pages/doctors/DoctorList';
import { OrderList } from './pages/orders/OrderList';
import { SampleTracking } from './pages/samples/SampleTracking';
import { ResultEntry } from './pages/results/ResultEntry';
import { VerificationDesk } from './pages/verification/VerificationDesk';
import { ReportList } from './pages/reports/ReportList';
import { InvoiceList } from './pages/billing/InvoiceList';
import { TestMaster } from './pages/tests/TestMaster';
import { Packages } from './pages/tests/Packages';
import { BranchList } from './pages/branches/BranchList';
import { LaboratoryList } from './pages/laboratories/LaboratoryList';
import { LaboratoryDetails } from './pages/laboratories/LaboratoryDetails';
import { SubscriptionPlans } from './pages/subscriptions/SubscriptionPlans';
import { NotificationCenter } from './pages/notifications/NotificationCenter';
import { UserList } from './pages/users/UserList';
import { AnalyticsPage } from './pages/analytics/AnalyticsPage';
import { AuditLogViewer } from './pages/audit/AuditLogViewer';
import { BackupManager } from './pages/backup/BackupManager';
import { SettingsPage } from './pages/settings/SettingsPage';

// Phase 5 Enterprise Pages
import { AccountingDashboard } from './pages/accounting/AccountingDashboard';
import { ExpenseManager } from './pages/accounting/ExpenseManager';
import { GeneralLedger } from './pages/accounting/GeneralLedger';
import { ReceivablesManager } from './pages/accounting/ReceivablesManager';
import { CashClosingDesk } from './pages/accounting/CashClosingDesk';

import { InventoryDashboard } from './pages/inventory/InventoryDashboard';
import { ItemMaster } from './pages/inventory/ItemMaster';
import { StockTransactions } from './pages/inventory/StockTransactions';
import { StockTransfers } from './pages/inventory/StockTransfers';

import { DoctorLogin } from './pages/portal/DoctorLogin';
import { DoctorDashboard } from './pages/portal/DoctorDashboard';
import { PatientLogin } from './pages/portal/PatientLogin';
import { PatientDashboard } from './pages/portal/PatientDashboard';
import { PublicReportVerify } from './pages/portal/PublicReportVerify';

import { ReportTemplateManager } from './pages/templates/ReportTemplateManager';
import { CommunicationSettings } from './pages/communication/CommunicationSettings';

// Phase 6 Enterprise LIS Pages
import { AnalyzerDashboard } from './pages/analyzers/AnalyzerDashboard';
import { HL7Gateway } from './pages/analyzers/HL7Gateway';
import { QualityControlDashboard } from './pages/qc/QualityControlDashboard';
import { EquipmentManager } from './pages/equipment/EquipmentManager';
import { CalibrationManager } from './pages/equipment/CalibrationManager';
import { SampleAccession } from './pages/lis/SampleAccession';
import { LISWorkQueues } from './pages/lis/LISWorkQueues';
import { LISRulesManager } from './pages/lis/LISRulesManager';
import { ApiWebhooksManager } from './pages/developer/ApiWebhooksManager';
import { SystemHealthDashboard } from './pages/system/SystemHealthDashboard';
import { ModuleGovernance } from './pages/system/ModuleGovernance';


// Phase 7 Enterprise Command Center, AI & Multi-Lab Pages
import { EnterpriseCommandCenter } from './pages/enterprise/EnterpriseCommandCenter';
import { OrganizationManager } from './pages/enterprise/OrganizationManager';
import { AIClinicalHub } from './pages/ai/AIClinicalHub';
import { GlobalIntelligentSearch } from './pages/search/GlobalIntelligentSearch';
import { DocumentManager } from './pages/documents/DocumentManager';
import { MobileSyncCenter } from './pages/mobile/MobileSyncCenter';
import { WhiteLabelManager } from './pages/saas/WhiteLabelManager';
import { ApprovalCenter } from './pages/approvals/ApprovalCenter';
import { SecurityCenter } from './pages/security/SecurityCenter';
import { FeatureFlagsManager } from './pages/system/FeatureFlagsManager';

// Production Operations & Onboarding Pages
import { DataImportWizard } from './pages/import/DataImportWizard';
import { OnboardingWizard } from './pages/onboarding/OnboardingWizard';

// Phase 9 Enterprise Operations, Supply Chain & Automation Pages
import { OperationsCenterPage } from './pages/operations/OperationsCenterPage';
import { AutomationEnginePage } from './pages/operations/AutomationEnginePage';
import { ProcurementPage } from './pages/procurement/ProcurementPage';
import { CrmCorporatePage } from './pages/crm/CrmCorporatePage';
import { FieldServicesPage } from './pages/field/FieldServicesPage';
import { WorkforcePage } from './pages/workforce/WorkforcePage';
import { QualityGovernancePage } from './pages/governance/QualityGovernancePage';
import { PricingProfitabilityPage } from './pages/pricing/PricingProfitabilityPage';

// Smart Dashboard selector based on active user role
const DashboardDispatcher: React.FC = () => {
  const { user } = useAuth();
  if (user?.role_code === 'super_admin') {
    return <SuperAdminDashboard />;
  }
  return <LabAdminDashboard />;
};

export const App: React.FC = () => {
  return (
    <NotificationProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Core Authentication */}
            <Route path="/login" element={<Login />} />

            {/* External Secure Doctor & Patient Portals */}
            <Route path="/doctor/login" element={<DoctorLogin />} />
            <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
            <Route path="/patient/login" element={<PatientLogin />} />
            <Route path="/patient/dashboard" element={<PatientDashboard />} />

            {/* Public Cryptographic QR Report Verification */}
            <Route path="/verify/:token" element={<PublicReportVerify />} />
            <Route path="/verify-report/:token" element={<PublicReportVerify />} />

            {/* Main Authenticated LIS Workspace */}
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardDispatcher />} />
              <Route path="patients" element={<PatientList />} />
              <Route path="doctors" element={<DoctorList />} />
              <Route path="orders" element={<OrderList />} />
              <Route path="samples" element={<SampleTracking />} />
              <Route path="results" element={<ResultEntry />} />
              <Route path="verification" element={<VerificationDesk />} />
              <Route path="reports" element={<ReportList />} />
              <Route path="billing" element={<InvoiceList />} />

              {/* Accounting & Ledger Module */}
              <Route path="accounting" element={<AccountingDashboard />} />
              <Route path="accounting/expenses" element={<ExpenseManager />} />
              <Route path="accounting/ledger" element={<GeneralLedger />} />
              <Route path="accounting/receivables" element={<ReceivablesManager />} />
              <Route path="accounting/cash-closing" element={<CashClosingDesk />} />

              {/* Inventory & Reagents Module */}
              <Route path="inventory" element={<InventoryDashboard />} />
              <Route path="inventory/items" element={<ItemMaster />} />
              <Route path="inventory/transactions" element={<StockTransactions />} />
              <Route path="inventory/transfers" element={<StockTransfers />} />

              {/* Masters, Facilities & Network */}
              <Route path="tests" element={<TestMaster />} />
              <Route path="packages" element={<Packages />} />
              <Route path="branches" element={<BranchList />} />
              <Route path="laboratories" element={<LaboratoryList />} />
              <Route path="laboratories/:id" element={<LaboratoryDetails />} />
              <Route path="subscriptions" element={<SubscriptionPlans />} />
              <Route path="users" element={<UserList />} />

              {/* Analytics, Designer, Gateway, Audits & Settings */}
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="templates" element={<ReportTemplateManager />} />
              <Route path="communication" element={<CommunicationSettings />} />
              <Route path="notifications" element={<NotificationCenter />} />
              <Route path="audit-logs" element={<AuditLogViewer />} />
              <Route path="backup" element={<BackupManager />} />
              <Route path="settings" element={<SettingsPage />} />

              {/* Phase 6 Advanced LIS, Automation & Interfacing */}
              <Route path="analyzers" element={<AnalyzerDashboard />} />
              <Route path="analyzers/hl7" element={<HL7Gateway />} />
              <Route path="quality-control" element={<QualityControlDashboard />} />
              <Route path="equipment" element={<EquipmentManager />} />
              <Route path="calibrations" element={<CalibrationManager />} />
              <Route path="lis/accession" element={<SampleAccession />} />
              <Route path="lis/work-queues" element={<LISWorkQueues />} />
              <Route path="lis/rules" element={<LISRulesManager />} />
              <Route path="developer" element={<ApiWebhooksManager />} />
              <Route path="system-health" element={<SystemHealthDashboard />} />
              <Route path="module-governance" element={<ModuleGovernance />} />
              <Route path="system/module-governance" element={<ModuleGovernance />} />


              {/* Phase 7 Enterprise Command Center, AI & Multi-Lab */}
              <Route path="command-center" element={<EnterpriseCommandCenter />} />
              <Route path="organizations" element={<OrganizationManager />} />
              <Route path="ai-hub" element={<AIClinicalHub />} />
              <Route path="search" element={<GlobalIntelligentSearch />} />
              <Route path="documents" element={<DocumentManager />} />
              <Route path="mobile-sync" element={<MobileSyncCenter />} />
              <Route path="white-label" element={<WhiteLabelManager />} />
              <Route path="approvals" element={<ApprovalCenter />} />
              <Route path="security-center" element={<SecurityCenter />} />
              <Route path="feature-flags" element={<FeatureFlagsManager />} />

              {/* Production Operations & Onboarding */}
              <Route path="import" element={<DataImportWizard />} />
              <Route path="onboarding" element={<OnboardingWizard />} />

              {/* Phase 9 Enterprise Operations, Automation & Supply Chain */}
              <Route path="operations" element={<OperationsCenterPage />} />
              <Route path="automation" element={<AutomationEnginePage />} />
              <Route path="procurement" element={<ProcurementPage />} />
              <Route path="crm" element={<CrmCorporatePage />} />
              <Route path="field-services" element={<FieldServicesPage />} />
              <Route path="workforce" element={<WorkforcePage />} />
              <Route path="quality-governance" element={<QualityGovernancePage />} />
              <Route path="pricing-profitability" element={<PricingProfitabilityPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </NotificationProvider>
  );
};

export default App;
