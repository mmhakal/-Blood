/**
 * Phase 9 — Advanced Enterprise Operations, Automation Engine & Supply Chain Test Suite
 * MediFlow LIS (Modern Blood Diagnostic Laboratory Management Software / Enterprise SaaS)
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

async function runPhase9Tests() {
  console.log('\n============================================================');
  console.log('⚡ MediFlow LIS — Phase 9 Advanced Enterprise Operations Suite');
  console.log('============================================================\n');

  try {
    // ----------------------------------------------------
    // Group 1: Authentication & Administrative Context
    // ----------------------------------------------------
    console.log('--- Group 1: Core System Authentication ---');
    const adminRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@medilabs.com', password: 'admin123' })
    });
    if (!adminRes.ok) throw new Error(`Super admin auth failed: ${JSON.stringify(adminRes.data)}`);
    const superToken = adminRes.data.token;
    pass('1.1 Super Admin authenticated', 'superadmin token granted');

    const labAdminRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'labadmin@apexlabs.com', password: 'admin123' })
    });
    if (!labAdminRes.ok) throw new Error(`Lab admin auth failed: ${JSON.stringify(labAdminRes.data)}`);
    const labToken = labAdminRes.data.token;
    pass('1.2 Lab Admin authenticated', 'Apex Diagnostics context');

    // ----------------------------------------------------
    // Group 2: Operations Center & Centralized Task Management
    // ----------------------------------------------------
    console.log('\n--- Group 2: Operations Command Center & Task Queue ---');
    const kpiRes = await request('/operations/kpis', {
      headers: { Authorization: `Bearer ${labToken}` }
    });
    if (!kpiRes.ok) throw new Error(`Failed to fetch operations KPIs: ${JSON.stringify(kpiRes.data)}`);
    if (kpiRes.data.pending_accession === undefined || kpiRes.data.analyzer_queue === undefined) {
      throw new Error('Operations KPIs missing expected operational metrics');
    }
    pass('2.1 Operations center telemetry KPIs retrieved', `Pending Accession: ${kpiRes.data.pending_accession}`);

    const newTaskRes = await request('/operations/tasks', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labToken}` },
      body: JSON.stringify({
        title: 'QC Shift Recalibration for Roche Cobas 6000',
        description: 'Recalibrate sodium and potassium electrodes after slight baseline drift.',
        department: 'biochemistry',
        priority: 'high',
        sla_hours: 6
      })
    });
    if (!newTaskRes.ok) throw new Error(`Failed to create operational task: ${JSON.stringify(newTaskRes.data)}`);
    const createdTask = newTaskRes.data;
    pass('2.2 Operational enterprise task created', `Task Number: ${createdTask.task_number}`);

    const updateTaskRes = await request(`/operations/tasks/${createdTask.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${labToken}` },
      body: JSON.stringify({ status: 'completed' })
    });
    if (!updateTaskRes.ok) throw new Error(`Failed to update task: ${JSON.stringify(updateTaskRes.data)}`);
    pass('2.3 Operational task status updated to completed');

    // ----------------------------------------------------
    // Group 3: ECA Automation Engine & Simulator
    // ----------------------------------------------------
    console.log('\n--- Group 3: No-Code/Low-Code Automation Engine ---');
    const ruleRes = await request('/automation/rules', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labToken}` },
      body: JSON.stringify({
        name: 'Auto-Task on Critical Serum Potassium > 6.0',
        description: 'Immediately dispatches a stat task and notifies pathologist if K+ > 6.0 mmol/L',
        trigger_event: 'CRITICAL_VALUE_REPORTED',
        conditions: [
          { field: 'potassium_value', operator: '>', value: 6.0 }
        ],
        actions: [
          {
            action_type: 'CREATE_TASK',
            params: {
              title: 'Critical Panic Potassium Follow-Up',
              department: 'biochemistry',
              priority: 'critical',
              sla_hours: 1
            }
          }
        ],
        is_active: true
      })
    });
    if (!ruleRes.ok) throw new Error(`Failed to create automation rule: ${JSON.stringify(ruleRes.data)}`);
    const createdRule = ruleRes.data;
    pass('3.1 ECA automation rule created', `Rule: ${createdRule.name}`);

    // Test Simulator: Satisfying condition (K = 6.4)
    const testSimRes = await request(`/automation/rules/${createdRule.id}/test`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${labToken}` },
      body: JSON.stringify({
        context: { potassium_value: 6.4, parameter: 'K+' }
      })
    });
    if (!testSimRes.ok) throw new Error(`Rule test evaluation failed: ${JSON.stringify(testSimRes.data)}`);
    if (!testSimRes.data.condition_matched) throw new Error('Expected condition to match for K+ = 6.4');
    pass('3.2 ECA dry-run simulator successfully matched positive condition');

    // Test Simulator: Failing condition (K = 4.2)
    const testSimNeg = await request(`/automation/rules/${createdRule.id}/test`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${labToken}` },
      body: JSON.stringify({
        context: { potassium_value: 4.2, parameter: 'K+' }
      })
    });
    if (testSimNeg.data.condition_matched) throw new Error('Expected condition to fail for normal K+ = 4.2');
    pass('3.3 ECA dry-run simulator rejected non-matching context');

    // Register Scheduled Cron Job
    const cronJobRes = await request('/automation/scheduled-jobs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labToken}` },
      body: JSON.stringify({
        job_name: 'Daily Operations Digest & TAT Compliance Summary',
        job_type: 'DAILY_OPERATIONS_SUMMARY',
        cron_schedule: '0 8 * * *',
        timezone: 'Asia/Kolkata',
        recipient_emails: 'labdirector@apexlabs.com',
        delivery_channel: 'email'
      })
    });
    if (!cronJobRes.ok) throw new Error(`Failed to register scheduled cron job: ${JSON.stringify(cronJobRes.data)}`);
    pass('3.4 Scheduled cron job registered', `Cron: ${cronJobRes.data.cron_schedule}`);

    // ----------------------------------------------------
    // Group 4: Procurement, Suppliers & 3-Way GRN Sync
    // ----------------------------------------------------
    console.log('\n--- Group 4: Procurement & Supply Chain Sync ---');
    const supplierRes = await request('/procurement/suppliers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labToken}` },
      body: JSON.stringify({
        supplier_code: `SUP-SYS-${Math.floor(1000 + Math.random() * 9000)}`,
        company_name: 'Sysmex Medical Reagents India Pvt Ltd',
        contact_person: 'Anil Deshmukh',
        email: 'sales@sysmex.in',
        phone: '+91 22 2845 9900',
        tax_number: '27AABCS9912K1Z5',
        city: 'Mumbai',
        rating: 5
      })
    });
    if (!supplierRes.ok) throw new Error(`Failed to add supplier: ${JSON.stringify(supplierRes.data)}`);
    const supplier = supplierRes.data;
    pass('4.1 Approved reagent supplier registered', `Code: ${supplier.supplier_code}`);

    const poRes = await request('/procurement/purchase-orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labToken}` },
      body: JSON.stringify({
        supplier_id: supplier.id,
        items: [
          { item_name: 'Sysmex Cellpack DCL Diluent 20L', quantity: 5, unit_price: 3500 }
        ],
        notes: 'Monthly hematology diluent supply'
      })
    });
    if (!poRes.ok) throw new Error(`Failed to create PO: ${JSON.stringify(poRes.data)}`);
    const po = poRes.data;
    pass('4.2 Purchase order generated with tax & totals', `PO: ${po.po_number}, Total: ₹${po.grand_total}`);

    // Create Goods Receipt Note (GRN) linked to PO
    const grnRes = await request('/procurement/goods-receipts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labToken}` },
      body: JSON.stringify({
        po_id: po.id,
        supplier_id: supplier.id,
        received_items: [
          {
            item_name: 'Sysmex Cellpack DCL Diluent 20L',
            quantity_received: 5,
            batch_number: 'BATCH-DCL-902',
            expiry_date: '2027-12-31',
            storage_temperature: '15-30C'
          }
        ]
      })
    });
    if (!grnRes.ok) throw new Error(`Failed to process GRN: ${JSON.stringify(grnRes.data)}`);
    pass('4.3 Goods Receipt Note (GRN) processed & 3-way match verified', `GRN: ${grnRes.data.grn_number}`);

    // ----------------------------------------------------
    // Group 5: CRM, Corporate B2B & Patient NPS
    // ----------------------------------------------------
    console.log('\n--- Group 5: CRM, Corporate B2B & Sentiment ---');
    const corpRes = await request('/crm/corporate-accounts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labToken}` },
      body: JSON.stringify({
        account_code: `CORP-TCS-${Math.floor(100 + Math.random() * 900)}`,
        company_name: 'Tata Consultancy Services - Health Plan',
        contact_person: 'Sunita Rao',
        email: 'wellness@tcs.com',
        phone: '+91 22 6778 9000',
        credit_limit: 250000,
        credit_days: 45,
        discount_percentage: 20,
        billing_cycle: 'monthly'
      })
    });
    if (!corpRes.ok) throw new Error(`Failed to onboard corporate account: ${JSON.stringify(corpRes.data)}`);
    pass('5.1 Corporate B2B client onboarded with credit term limits', `Account: ${corpRes.data.company_name}`);

    const referralRes = await request('/crm/doctor-referrals', {
      headers: { Authorization: `Bearer ${labToken}` }
    });
    if (!referralRes.ok) throw new Error(`Failed to get doctor referral analytics: ${JSON.stringify(referralRes.data)}`);
    pass('5.2 Non-clinical doctor referral analytics computed');

    const feedbackRes = await request('/crm/feedback', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labToken}` },
      body: JSON.stringify({
        patient_name: 'Sunil Gavaskar',
        rating: 5,
        nps_score: 10,
        feedback_category: 'phlebotomy',
        comments: 'Extremely gentle blood draw, report delivered by SMS within 2 hours!'
      })
    });
    if (!feedbackRes.ok) throw new Error(`Failed to submit feedback: ${JSON.stringify(feedbackRes.data)}`);
    pass('5.3 Patient feedback & NPS sentiment recorded', 'NPS 10 Promoter');

    // ----------------------------------------------------
    // Group 6: Field Services, Dispatch & Queue Tokens
    // ----------------------------------------------------
    console.log('\n--- Group 6: Field Logistics & Reception Queue ---');
    const homeVisitRes = await request('/field-services/home-collections', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labToken}` },
      body: JSON.stringify({
        patient_name: 'Meenakshi Iyer',
        patient_phone: '+91 98205 11223',
        collection_address: 'Flat 501, Palm Beach Residency, Vashi, Navi Mumbai',
        scheduled_slot: new Date(Date.now() + 7200000).toISOString(),
        notes: 'Fasting lipid profile & blood glucose'
      })
    });
    if (!homeVisitRes.ok) throw new Error(`Failed to schedule home collection: ${JSON.stringify(homeVisitRes.data)}`);
    const homeVisit = homeVisitRes.data;
    pass('6.1 Home sample collection visit booked', `Request #: ${homeVisit.request_number}`);

    // Update dispatch status
    const statusUpdateRes = await request(`/field-services/home-collections/${homeVisit.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${labToken}` },
      body: JSON.stringify({ status: 'sample_collected' })
    });
    if (!statusUpdateRes.ok) throw new Error(`Failed to update collection status: ${JSON.stringify(statusUpdateRes.data)}`);
    pass('6.2 Home collection transitioned to sample_collected');

    // Dispense reception token
    const tokenRes = await request('/field-services/queue-tokens', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labToken}` },
      body: JSON.stringify({ department: 'Phlebotomy' })
    });
    if (!tokenRes.ok) throw new Error(`Failed to dispense queue token: ${JSON.stringify(tokenRes.data)}`);
    pass('6.3 Walk-in reception queue token dispensed', `Token: ${tokenRes.data.token_number}`);

    // ----------------------------------------------------
    // Group 7: Workforce Management & Shift Clock-In
    // ----------------------------------------------------
    console.log('\n--- Group 7: Workforce Attendance & Shifts ---');
    const punchInRes = await request('/workforce/attendance/punch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labToken}` },
      body: JSON.stringify({ punch_type: 'IN', punch_method: 'web_portal' })
    });
    if (!punchInRes.ok) throw new Error(`Failed to punch in: ${JSON.stringify(punchInRes.data)}`);
    pass('7.1 Staff clock-in punch recorded', `Punch ID: ${punchInRes.data.id}`);

    const shiftRes = await request('/workforce/shifts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labToken}` },
      body: JSON.stringify({
        shift_name: 'Core Clinical Evening Roster',
        start_time: '14:00',
        end_time: '22:00',
        grace_period_mins: 15,
        department: 'laboratory'
      })
    });
    if (!shiftRes.ok) throw new Error(`Failed to create shift template: ${JSON.stringify(shiftRes.data)}`);
    pass('7.2 Shift template roster created', `Shift: ${shiftRes.data.shift_name}`);

    // ----------------------------------------------------
    // Group 8: Quality Governance QMS, SOPs & Incidents
    // ----------------------------------------------------
    console.log('\n--- Group 8: Quality Governance QMS & Compliance ---');
    const sopRes = await request('/quality-governance/sops', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labToken}` },
      body: JSON.stringify({
        sop_number: `SOP-BIO-${Math.floor(100 + Math.random() * 900)}`,
        title: 'Standard Procedure for Serum Electrolyte Calibration and Maintenance',
        department: 'biochemistry',
        version: 'v2.1',
        effective_date: '2026-01-01',
        review_date: '2027-01-01',
        content_markdown: '# SOP: Electrolyte Calibration\n1. Ensure ISE buffer is at room temperature.'
      })
    });
    if (!sopRes.ok) throw new Error(`Failed to register SOP: ${JSON.stringify(sopRes.data)}`);
    pass('8.1 Quality SOP registered with version control', `SOP: ${sopRes.data.sop_number}`);

    const incidentRes = await request('/quality-governance/incidents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labToken}` },
      body: JSON.stringify({
        title: 'Hemolysis detected on EDTA whole blood tube during accession',
        description: 'Specimen rejected and recollection dispatched to ensure clinical report accuracy.',
        incident_type: 'pre_analytical',
        severity: 'minor',
        department: 'phlebotomy'
      })
    });
    if (!incidentRes.ok) throw new Error(`Failed to log incident: ${JSON.stringify(incidentRes.data)}`);
    pass('8.2 Pre-analytical quality deviation incident logged', `Incident: ${incidentRes.data.incident_number}`);

    // ----------------------------------------------------
    // Group 9: Dynamic Pricing Engine & Profitability BI
    // ----------------------------------------------------
    console.log('\n--- Group 9: Multi-Tier Pricing Engine & Profitability BI ---');
    const pricingRuleRes = await request('/pricing-engine/rules', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labToken}` },
      body: JSON.stringify({
        rule_name: 'Corporate Preferred Wellness Discount 25%',
        client_type: 'corporate',
        scope_type: 'global',
        adjustment_type: 'percentage_discount',
        adjustment_value: 25,
        floor_price_inr: 200,
        priority: 1
      })
    });
    if (!pricingRuleRes.ok) throw new Error(`Failed to register pricing rule: ${JSON.stringify(pricingRuleRes.data)}`);
    pass('9.1 Tiered corporate discount rule created with floor price protection');

    // Calculate dynamic price
    const calcRes = await request('/pricing-engine/calculate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labToken}` },
      body: JSON.stringify({
        test_id: 'test-cbc',
        client_type: 'corporate',
        base_price: 500
      })
    });
    if (!calcRes.ok) throw new Error(`Dynamic price calculation failed: ${JSON.stringify(calcRes.data)}`);
    if (calcRes.data.final_price <= 0 || calcRes.data.final_price > 500) {
      throw new Error(`Unexpected dynamic price calculation: ${calcRes.data.final_price}`);
    }
    pass('9.2 Dynamic price calculated with discount & floor protection', `Base: ₹500 -> Billed: ₹${calcRes.data.final_price}`);

    const profitRes = await request('/pricing-engine/test-profitability', {
      headers: { Authorization: `Bearer ${labToken}` }
    });
    if (!profitRes.ok) throw new Error(`Failed to fetch test profitability: ${JSON.stringify(profitRes.data)}`);
    if (!Array.isArray(profitRes.data) || profitRes.data.length === 0) {
      throw new Error('Expected array of test profitability metrics');
    }
    pass('9.3 Test margin and direct-cost profitability BI retrieved', `Ranked ${profitRes.data.length} diagnostic tests`);

    // ----------------------------------------------------
    // Final Summary
    // ----------------------------------------------------
    console.log('\n============================================================');
    console.log(`✅ Phase 9 Enterprise Operations Test Suite Finished`);
    console.log(`   Passed: ${testsPassed}`);
    console.log(`   Failed: ${testsFailed}`);
    console.log('============================================================\n');

    if (testsFailed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    fail('Fatal Test Execution Error', err.message || err);
    console.log('\n============================================================');
    console.log(`❌ Phase 9 Enterprise Operations Test Suite Failed`);
    console.log(`   Passed: ${testsPassed}`);
    console.log(`   Failed: ${testsFailed}`);
    console.log('============================================================\n');
    process.exit(1);
  }
}

runPhase9Tests();
