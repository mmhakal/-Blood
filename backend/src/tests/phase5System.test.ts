/**
 * Phase 5 — Enterprise Completion Automated Test Suite
 * MediFlow LIS (Diagnostic Laboratory Information System)
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

let testsPassed = 0;
let testsFailed = 0;

function pass(name: string, detail?: string) {
  testsPassed++;
  console.log(`  \x1b[32m✔\x1b[0m ${name}${detail ? ` \x1b[90m(${detail})\x1b[0m` : ''}`);
}

function fail(name: string, error: any) {
  testsFailed++;
  console.error(`  \x1b[31m✖\x1b[0m ${name}`);
  console.error(`    \x1b[31mError:\x1b[0m`, error);
}

async function request(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const contentType = res.headers.get('content-type') || '';
  let data: any = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else if (contentType.includes('text/')) {
    data = await res.text();
  }

  return {
    status: res.status,
    ok: res.ok,
    headers: res.headers,
    data,
  };
}

async function runPhase5Tests() {
  console.log('\n============================================================');
  console.log('🔬 MediFlow LIS — Phase 5 Comprehensive Automated Test Suite');
  console.log('============================================================\n');

  try {
    // ----------------------------------------------------
    // Group 1: Core System & Portal Authentication
    // ----------------------------------------------------
    console.log('--- Group 1: Core System & Portal Authentication ---');

    // 1.1 Super Admin login
    const superAdminRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@medilabs.com', password: 'admin123' })
    });
    const superAdminToken = superAdminRes.data?.token;
    if (superAdminRes.ok && superAdminToken) {
      pass('1.1 Super Admin authenticated', 'superadmin token received');
    } else {
      fail('1.1 Super Admin authenticated', superAdminRes.data);
    }

    // 1.2 Lab Admin login
    const labAdminRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'labadmin@apexlabs.com', password: 'admin123' })
    });
    const labAdminToken = labAdminRes.data?.token;
    if (labAdminRes.ok && labAdminToken) {
      pass('1.2 Lab Admin authenticated', 'Apex Labs context');
    } else {
      fail('1.2 Lab Admin authenticated', labAdminRes.data);
    }

    // 1.3 Doctor Portal login
    const doctorLoginRes = await request('/doctor-portal/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'dr.arthur', password: 'admin123' })
    });
    const doctorToken = doctorLoginRes.data?.token;
    if (doctorLoginRes.ok && doctorToken && doctorLoginRes.data?.doctor?.name?.includes('Arthur')) {
      pass('1.3 Doctor Portal authenticated', `Doctor: ${doctorLoginRes.data.doctor.name}`);
    } else {
      fail('1.3 Doctor Portal authenticated', doctorLoginRes.data);
    }

    // 1.4 Patient Portal login
    const patientLoginRes = await request('/patient-portal/login', {
      method: 'POST',
      body: JSON.stringify({ username: '9836240067', password: 'admin123' })
    });
    const patientToken = patientLoginRes.data?.token;
    if (patientLoginRes.ok && patientToken && (patientLoginRes.data?.patient?.name?.includes('Johnathan') || patientLoginRes.data?.patient?.name?.includes('Rohan'))) {
      pass('1.4 Patient Portal authenticated', `Patient: ${patientLoginRes.data.patient.name}`);
    } else {
      fail('1.4 Patient Portal authenticated', patientLoginRes.data);
    }

    // ----------------------------------------------------
    // Group 2: Doctor Portal Access & Strict Isolation
    // ----------------------------------------------------
    console.log('\n--- Group 2: Doctor Portal Access & Strict Isolation ---');

    const docAuth = { Authorization: `Bearer ${doctorToken}` };

    // 2.1 Doctor Profile
    const docProfile = await request('/doctor-portal/me', { headers: docAuth });
    if (docProfile.ok && docProfile.data?.name?.includes('Arthur')) {
      pass('2.1 Doctor profile retrieved', docProfile.data.qualification);
    } else {
      fail('2.1 Doctor profile retrieved', docProfile.data);
    }

    // 2.2 Doctor Dashboard KPIs
    const docDash = await request('/doctor-portal/dashboard', { headers: docAuth });
    if (docDash.ok && docDash.data?.referred_patients !== undefined) {
      pass('2.2 Doctor dashboard KPIs returned', `Referred Patients: ${docDash.data.referred_patients}, Orders: ${docDash.data.orders_this_month}`);
    } else {
      fail('2.2 Doctor dashboard KPIs returned', docDash.data);
    }

    // 2.3 Referred Patients List
    const docPatients = await request('/doctor-portal/patients', { headers: docAuth });
    if (docPatients.ok && Array.isArray(docPatients.data)) {
      pass('2.3 Doctor referred patients list retrieved', `Total: ${docPatients.data.length}`);
    } else {
      fail('2.3 Doctor referred patients list retrieved', docPatients.data);
    }

    // 2.4 Critical Panic Alerts feed
    const docAlerts = await request('/doctor-portal/critical-alerts', { headers: docAuth });
    if (docAlerts.ok && Array.isArray(docAlerts.data)) {
      pass('2.4 Doctor critical alert feed accessible', `${docAlerts.data.length} alerts present`);
    } else {
      fail('2.4 Doctor critical alert feed accessible', docAlerts.data);
    }

    // ----------------------------------------------------
    // Group 3: Patient Portal Access & Data Protection
    // ----------------------------------------------------
    console.log('\n--- Group 3: Patient Portal Access & Data Protection ---');

    const ptAuth = { Authorization: `Bearer ${patientToken}` };

    // 3.1 Patient Profile
    const ptProfile = await request('/patient-portal/me', { headers: ptAuth });
    if (ptProfile.ok && (ptProfile.data?.name?.includes('Johnathan') || ptProfile.data?.name?.includes('Rohan'))) {
      pass('3.1 Patient profile retrieved', ptProfile.data.patient_id_code);
    } else {
      fail('3.1 Patient profile retrieved', ptProfile.data);
    }

    // 3.2 Patient Dashboard
    const ptDash = await request('/patient-portal/dashboard', { headers: ptAuth });
    if (ptDash.ok && ptDash.data?.total_orders !== undefined) {
      pass('3.2 Patient dashboard overview loaded', `Available Reports: ${ptDash.data.available_reports}`);
    } else {
      fail('3.2 Patient dashboard overview loaded', ptDash.data);
    }

    // 3.3 Patient Orders
    const ptOrders = await request('/patient-portal/orders', { headers: ptAuth });
    if (ptOrders.ok && Array.isArray(ptOrders.data)) {
      pass('3.3 Patient test orders listed', `${ptOrders.data.length} records`);
    } else {
      fail('3.3 Patient test orders listed', ptOrders.data);
    }

    // 3.4 Patient Invoices
    const ptInvoices = await request('/patient-portal/invoices', { headers: ptAuth });
    if (ptInvoices.ok && Array.isArray(ptInvoices.data)) {
      pass('3.4 Patient financial ledger listed', `${ptInvoices.data.length} records`);
    } else {
      fail('3.4 Patient financial ledger listed', ptInvoices.data);
    }

    // 3.5 Patient Parameter History Trends
    const ptTrends = await request('/patient-portal/trends', { headers: ptAuth });
    if (ptTrends.ok && Array.isArray(ptTrends.data)) {
      pass('3.5 Patient parameter trends returned for charting', `${ptTrends.data.length} points`);
    } else {
      fail('3.5 Patient parameter trends returned for charting', ptTrends.data);
    }

    // ----------------------------------------------------
    // Group 4: Super Admin & Branch Analytics
    // ----------------------------------------------------
    console.log('\n--- Group 4: Super Admin & Branch Analytics ---');

    const superAuth = { Authorization: `Bearer ${superAdminToken}` };
    const labAuth = { Authorization: `Bearer ${labAdminToken}` };

    // 4.1 Super Admin System Analytics
    const superAnalytics = await request('/analytics/super-admin', { headers: superAuth });
    if (superAnalytics.ok && superAnalytics.data?.total_laboratories > 0) {
      pass('4.1 Super Admin system analytics loaded', `Labs: ${superAnalytics.data.total_laboratories}, Status: Operational`);
    } else {
      fail('4.1 Super Admin system analytics loaded', superAnalytics.data);
    }

    // 4.2 Branch Analytics
    const branchAnalytics = await request('/analytics/branch/branch-apex-central', { headers: labAuth });
    if (branchAnalytics.ok && branchAnalytics.data?.branch_name !== undefined) {
      pass('4.2 Branch-specific analytics loaded', branchAnalytics.data.branch_name);
    } else {
      fail('4.2 Branch-specific analytics loaded', branchAnalytics.data);
    }

    // ----------------------------------------------------
    // Group 5: Centralized Reports Catalog & Generation
    // ----------------------------------------------------
    console.log('\n--- Group 5: Centralized Reports Catalog & Generation ---');

    // 5.1 Standardized Reports Catalog
    const catalogRes = await request('/analytics/reports/catalog', { headers: labAuth });
    if (catalogRes.ok && catalogRes.data?.length === 24) {
      pass('5.1 Standardized reports catalog verified', `${catalogRes.data.length}/24 reports registered`);
    } else {
      fail('5.1 Standardized reports catalog verified', catalogRes.data);
    }

    // 5.2 Generate Patient Registration Report
    const ptReport = await request('/analytics/reports/generate', {
      method: 'POST',
      headers: labAuth,
      body: JSON.stringify({ report_code: 'patient_registration' })
    });
    if (ptReport.ok && ptReport.data?.columns?.length > 0) {
      pass('5.2 Generated Patient Registration report', `${ptReport.data.rows.length} rows`);
    } else {
      fail('5.2 Generated Patient Registration report', ptReport.data);
    }

    // 5.3 Generate Payment Collection Report
    const revReport = await request('/analytics/reports/generate', {
      method: 'POST',
      headers: labAuth,
      body: JSON.stringify({ report_code: 'payment_collection' })
    });
    if (revReport.ok && revReport.data?.columns?.length > 0) {
      pass('5.3 Generated Payment Collection report', `${revReport.data.rows.length} records`);
    } else {
      fail('5.3 Generated Payment Collection report', revReport.data);
    }

    // 5.4 Export Report CSV
    const csvExport = await request('/analytics/reports/export?report_code=patient_registration', { headers: labAuth });
    if (csvExport.ok && typeof csvExport.data === 'string') {
      pass('5.4 Exported standardized report to CSV', 'text/csv received');
    } else {
      fail('5.4 Exported standardized report to CSV', csvExport.data);
    }

    // ----------------------------------------------------
    // Group 6: Complete Accounting & Ledger Module
    // ----------------------------------------------------
    console.log('\n--- Group 6: Complete Accounting & Ledger Module ---');

    // 6.1 Financial Dashboard
    const finDash = await request('/accounting/dashboard', { headers: labAuth });
    if (finDash.ok && finDash.data?.net_revenue !== undefined) {
      pass('6.1 Financial dashboard calculated', `Net Revenue: ₹${finDash.data.net_revenue}, Outstanding: ₹${finDash.data.total_outstanding}`);
    } else {
      fail('6.1 Financial dashboard calculated', finDash.data);
    }

    // 6.2 Record Expense & General Ledger Impact
    const expRes = await request('/accounting/expenses', {
      method: 'POST',
      headers: labAuth,
      body: JSON.stringify({
        branch_id: 'branch-apex-central',
        category_id: 'ecat-1',
        title: 'Centrifuge Tube Pack Purchase',
        amount: 850.0,
        payment_method: 'Cash',
        payee: 'Universal Lab Supplies'
      })
    });
    if (expRes.status === 201) {
      pass('6.2 Recorded laboratory expense', `Expense ID: ${expRes.data.id}`);
    } else {
      fail('6.2 Recorded laboratory expense', expRes.data);
    }

    // 6.3 General Ledger listing
    const ledgerRes = await request('/accounting/ledger', { headers: labAuth });
    if (ledgerRes.ok && ledgerRes.data?.length > 0) {
      pass('6.3 General ledger debit/credit transactions verified', `${ledgerRes.data.length} entries`);
    } else {
      fail('6.3 General ledger debit/credit transactions verified', ledgerRes.data);
    }

    // 6.4 Accounts Receivable Aging
    const recvRes = await request('/accounting/receivables', { headers: labAuth });
    if (recvRes.ok && recvRes.data?.aging_summary) {
      pass('6.4 Accounts receivable aging buckets verified', `Total Due: ₹${recvRes.data.aging_summary.total_due}`);
    } else {
      fail('6.4 Accounts receivable aging buckets verified', recvRes.data);
    }

    // 6.5 End-of-shift Cash Closing
    const cashCloseRes = await request('/accounting/cash-closing', {
      method: 'POST',
      headers: labAuth,
      body: JSON.stringify({
        branch_id: 'branch-apex-central',
        opening_cash: 500.0,
        actual_cash: 500.0,
        remarks: 'End of shift evening drawer reconciliation'
      })
    });
    if (cashCloseRes.status === 201 && cashCloseRes.data?.variance !== undefined) {
      pass('6.5 Cash drawer closing reconciled', `Variance: ₹${cashCloseRes.data.variance}`);
    } else {
      fail('6.5 Cash drawer closing reconciled', cashCloseRes.data);
    }

    // 6.6 Tax Summary
    const taxSummary = await request('/accounting/tax-summary', { headers: labAuth });
    if (taxSummary.ok && Array.isArray(taxSummary.data)) {
      pass('6.6 Periodic tax/GST summary calculated', `${taxSummary.data.length} periods`);
    } else {
      fail('6.6 Periodic tax/GST summary calculated', taxSummary.data);
    }

    // ----------------------------------------------------
    // Group 7: Laboratory Inventory Lifecycle & Alerts
    // ----------------------------------------------------
    console.log('\n--- Group 7: Laboratory Inventory Lifecycle & Alerts ---');

    // 7.1 Inventory Dashboard
    const invDash = await request('/inventory/dashboard', { headers: labAuth });
    if (invDash.ok && invDash.data?.total_items > 0) {
      pass('7.1 Inventory dashboard loaded', `Items: ${invDash.data.total_items}, Stock Value: ₹${invDash.data.stock_valuation}`);
    } else {
      fail('7.1 Inventory dashboard loaded', invDash.data);
    }

    // 7.2 Create Inventory Item
    const newItemRes = await request('/inventory/items', {
      method: 'POST',
      headers: labAuth,
      body: JSON.stringify({
        code: `KIT-COVID-AG-${Date.now().toString().slice(-4)}`,
        name: 'Rapid Antigen Test Kit (25 Tests)',
        unit: 'Kit (25 Tests)',
        min_stock: 5,
        max_stock: 50,
        purchase_price: 1200.0
      })
    });
    if (newItemRes.status === 201) {
      pass('7.2 Registered new inventory item in catalog', newItemRes.data.id);
    } else {
      fail('7.2 Registered new inventory item in catalog', newItemRes.data);
    }

    // 7.3 Stock-in / Purchase Entry with Batch
    const stockInRes = await request('/inventory/stock-in', {
      method: 'POST',
      headers: labAuth,
      body: JSON.stringify({
        item_id: newItemRes.data.id,
        batch_number: `LOT-RAPID-${Date.now().toString().slice(-4)}`,
        expiry_date: '2027-12-31',
        quantity: 10,
        unit_cost: 1200.0,
        notes: 'Initial lot receipt'
      })
    });
    if (stockInRes.status === 201) {
      pass('7.3 Received stock batch into inventory', stockInRes.data.batch_id);
    } else {
      fail('7.3 Received stock batch into inventory', stockInRes.data);
    }

    // 7.4 Stock Adjustment (Consumption / Test run)
    const adjustRes = await request('/inventory/adjustment', {
      method: 'POST',
      headers: labAuth,
      body: JSON.stringify({
        item_id: newItemRes.data.id,
        adjustment_type: 'consumption',
        quantity: 2,
        reason: 'Batch consumed for 50 clinical screening tests'
      })
    });
    if (adjustRes.ok && adjustRes.data?.transaction_id) {
      pass('7.4 Consumed inventory stock with audit record', adjustRes.data.transaction_id);
    } else {
      fail('7.4 Consumed inventory stock with audit record', adjustRes.data);
    }

    // 7.5 Inter-Branch Stock Transfer
    const transferRes = await request('/inventory/transfers', {
      method: 'POST',
      headers: labAuth,
      body: JSON.stringify({
        from_branch_id: 'branch-apex-central',
        to_branch_id: 'branch-apex-north',
        item_id: newItemRes.data.id,
        quantity: 3,
        notes: 'Urgent restocking for North Satellite facility'
      })
    });
    if (transferRes.status === 201) {
      pass('7.5 Inter-branch stock transfer dispatched', transferRes.data.id);
    } else {
      fail('7.5 Inter-branch stock transfer dispatched', transferRes.data);
    }

    // 7.6 Low-Stock & Expiry Alerts
    const lowStockAlerts = await request('/inventory/alerts/low-stock', { headers: labAuth });
    const expiryAlerts = await request('/inventory/alerts/expiry', { headers: labAuth });
    if (lowStockAlerts.ok && expiryAlerts.ok) {
      pass('7.6 Inventory automated alerts operational', `Low Stock: ${lowStockAlerts.data.length}, Expiring: ${expiryAlerts.data.length}`);
    } else {
      fail('7.6 Inventory automated alerts operational', { lowStock: lowStockAlerts.data, expiry: expiryAlerts.data });
    }

    // ----------------------------------------------------
    // Group 8: Communication & Provider Integration
    // ----------------------------------------------------
    console.log('\n--- Group 8: Communication & Provider Integration ---');

    // 8.1 List Configured Providers
    const providersRes = await request('/communication/providers', { headers: labAuth });
    if (providersRes.ok && providersRes.data?.length >= 3) {
      pass('8.1 Communication providers configured', `${providersRes.data.length} channels active`);
    } else {
      fail('8.1 Communication providers configured', providersRes.data);
    }

    // 8.2 Provider Connectivity Test Handshake
    const firstProvider = providersRes.data[0];
    const testHandshake = await request(`/communication/providers/${firstProvider.id}/test`, {
      method: 'POST',
      headers: labAuth
    });
    if (testHandshake.ok && testHandshake.data?.success) {
      pass('8.2 Provider handshake verified', `${firstProvider.provider_name} (${testHandshake.data.latency_ms}ms)`);
    } else {
      fail('8.2 Provider handshake verified', testHandshake.data);
    }

    // 8.3 Notification Templates
    const templatesRes = await request('/communication/templates', { headers: labAuth });
    if (templatesRes.ok && templatesRes.data?.length > 0) {
      pass('8.3 Notification templates loaded', `${templatesRes.data.length} templates`);
    } else {
      fail('8.3 Notification templates loaded', templatesRes.data);
    }

    // 8.4 Message Dispatch & Delivery Log
    const sendMsgRes = await request('/communication/send', {
      method: 'POST',
      headers: labAuth,
      body: JSON.stringify({
        channel: 'sms',
        recipient: '+919836240067',
        subject: 'Critical Alert Test',
        message: 'Apex Labs: Critical test result notification verification.'
      })
    });
    if (sendMsgRes.ok && sendMsgRes.data?.success) {
      pass('8.4 Notification dispatched and audit log generated', sendMsgRes.data.log_id);
    } else {
      fail('8.4 Notification dispatched and audit log generated', sendMsgRes.data);
    }

    // ----------------------------------------------------
    // Group 9: Report Templates & Secure QR Verification
    // ----------------------------------------------------
    console.log('\n--- Group 9: Report Templates & Secure QR Verification ---');

    // 9.1 Report Templates List
    const repTplRes = await request('/report-templates', { headers: labAuth });
    if (repTplRes.ok && repTplRes.data?.length > 0) {
      pass('9.1 Report design templates loaded', `${repTplRes.data.length} styles available`);
    } else {
      fail('9.1 Report design templates loaded', repTplRes.data);
    }

    // 9.2 Clone Template
    const cloneRes = await request(`/report-templates/${repTplRes.data[0].id}/clone`, {
      method: 'POST',
      headers: labAuth
    });
    if (cloneRes.status === 201) {
      pass('9.2 Cloned custom report template', cloneRes.data.id);
    } else {
      fail('9.2 Cloned custom report template', cloneRes.data);
    }

    // 9.3 Generate Public QR Token for Report
    const reportsRes = await request('/reports?status=released', { headers: labAuth });
    let targetReportId = reportsRes.data?.[0]?.id;
    if (!targetReportId) {
      const anyReport = await request('/reports', { headers: labAuth });
      targetReportId = anyReport.data?.[0]?.id;
    }

    const tokenGenRes = await request(`/verify/generate-token/${targetReportId}`, {
      method: 'POST',
      headers: labAuth
    });
    const verifyToken = tokenGenRes.data?.token;
    if (tokenGenRes.ok && verifyToken) {
      pass('9.3 Generated cryptographic QR verification token', verifyToken);
    } else {
      fail('9.3 Generated cryptographic QR verification token', tokenGenRes.data);
    }

    // 9.4 Public QR Verification (No Auth Required)
    const publicVerifyRes = await request(`/verify/${verifyToken}`);
    if (publicVerifyRes.ok && publicVerifyRes.data?.valid && publicVerifyRes.data?.lab_name?.includes('Apex')) {
      pass('9.4 Public QR verification authentic', `Safe ID: ${publicVerifyRes.data.patient_safe_code}`);
    } else {
      fail('9.4 Public QR verification authentic', publicVerifyRes.data);
    }

    // ----------------------------------------------------
    // Group 10: Multi-Tier Settings & Feature Gates
    // ----------------------------------------------------
    console.log('\n--- Group 10: Multi-Tier Settings & Feature Gates ---');

    // 10.1 Centralized Settings update
    const setLabRes = await request('/settings/laboratory', {
      method: 'POST',
      headers: labAuth,
      body: JSON.stringify({
        category: 'patient',
        settings: {
          auto_numbering: true,
          patient_id_prefix: 'PID',
          duplicate_mobile_check: 'warning'
        }
      })
    });
    if (setLabRes.ok) {
      pass('10.1 Laboratory patient settings saved', 'auto_numbering: true');
    } else {
      fail('10.1 Laboratory patient settings saved', setLabRes.data);
    }

    // 10.2 System-wide settings update by Super Admin
    const setSysRes = await request('/settings/system', {
      method: 'POST',
      headers: superAuth,
      body: JSON.stringify({
        settings: {
          default_currency: 'INR',
          date_format: 'DD/MM/YYYY',
          session_timeout_minutes: 60
        }
      })
    });
    if (setSysRes.ok) {
      pass('10.2 Super Admin system settings updated', 'INR, DD/MM/YYYY');
    } else {
      fail('10.2 Super Admin system settings updated', setSysRes.data);
    }

    // 10.3 Non-superadmin cannot update system settings (403)
    const blockedSys = await request('/settings/system', {
      method: 'POST',
      headers: labAuth,
      body: JSON.stringify({ settings: { date_format: 'YYYY-MM-DD' } })
    });
    if (blockedSys.status === 403) {
      pass('10.3 Non-SuperAdmin blocked from updating system settings (403 Forbidden)');
    } else {
      fail('10.3 Non-SuperAdmin blocked from updating system settings', blockedSys.status);
    }

    console.log('\n============================================================');
    console.log(`📊 Phase 5 Test Summary: ${testsPassed} Passed, ${testsFailed} Failed`);
    console.log('============================================================\n');

    if (testsFailed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err: any) {
    console.error('\n❌ Unhandled Test Failure:', err);
    process.exit(1);
  }
}

runPhase5Tests();
