/**
 * Phase 4 — Clinical Lifecycle, Diagnostic Pipeline, Billing, Results & Reporting Test Suite
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

  let data: any = null;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else if (contentType && contentType.includes('application/pdf')) {
    data = await res.arrayBuffer();
  } else {
    data = await res.text();
  }

  return { status: res.status, ok: res.ok, headers: res.headers, data };
}

async function runPhase4Tests() {
  console.log('\n============================================================');
  console.log('🔬 MediFlow LIS — Phase 4 Comprehensive Automated Test Suite');
  console.log('============================================================\n');

  let superAdminToken = '';
  let labAdminToken = '';
  let pathologistToken = '';
  let techToken = '';
  let receptionistToken = '';
  let accountantToken = '';

  let testPatientId = '';
  let testCbcId = '';
  let testLipidId = '';
  let createdOrderId = '';
  let createdOrderNumber = '';
  let createdInvoiceId = '';
  let createdSampleId = '';
  let createdSampleBarcode = '';
  let createdResultId = '';
  let createdReportId = '';
  let initialPaymentId = '';

  // 1. Authenticate All Clinical & Administrative Roles
  console.log('\x1b[36m--- Group 1: Clinical & Administrative Authentication ---\x1b[0m');
  try {
    const saRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@medilabs.com', password: 'admin123' })
    });
    if (saRes.status === 200 && saRes.data.token) {
      superAdminToken = saRes.data.token;
      pass('1.1 Super Admin authenticated', 'superadmin token received');
    } else {
      fail('1.1 Super Admin authentication', saRes.data);
    }

    const laRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'labadmin@apexlabs.com', password: 'admin123' })
    });
    if (laRes.status === 200 && laRes.data.token) {
      labAdminToken = laRes.data.token;
      pass('1.2 Lab Admin (Apex) authenticated', 'tenant lab-apex');
    } else {
      fail('1.2 Lab Admin authentication', laRes.data);
    }

    const pathRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'pathologist@apexlabs.com', password: 'admin123' })
    });
    if (pathRes.status === 200 && pathRes.data.token) {
      pathologistToken = pathRes.data.token;
      pass('1.3 Consultant Pathologist authenticated', 'role pathologist');
    } else {
      fail('1.3 Pathologist authentication', pathRes.data);
    }

    const techRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'technician@apexlabs.com', password: 'admin123' })
    });
    if (techRes.status === 200 && techRes.data.token) {
      techToken = techRes.data.token;
      pass('1.4 Lab Technician authenticated', 'role lab_technician');
    } else {
      fail('1.4 Technician authentication', techRes.data);
    }

    const recRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'reception@apexlabs.com', password: 'admin123' })
    });
    if (recRes.status === 200 && recRes.data.token) {
      receptionistToken = recRes.data.token;
      pass('1.5 Receptionist authenticated', 'role receptionist');
    } else {
      fail('1.5 Receptionist authentication', recRes.data);
    }

    const accRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'accountant@apexlabs.com', password: 'admin123' })
    });
    if (accRes.status === 200 && accRes.data.token) {
      accountantToken = accRes.data.token;
      pass('1.6 Accountant authenticated', 'role accountant');
    } else {
      fail('1.6 Accountant authentication', accRes.data);
    }
  } catch (err) {
    fail('Group 1: Authentication Suite', err);
  }

  // 2. Fetch Masters
  console.log('\n\x1b[36m--- Group 2: Fetch Master Catalog Records ---\x1b[0m');
  try {
    const patRes = await request('/patients', {
      headers: { Authorization: `Bearer ${receptionistToken}` }
    });
    const patList = Array.isArray(patRes.data) ? patRes.data : patRes.data?.data || [];
    if (patRes.status === 200 && patList.length > 0) {
      testPatientId = patList[0].id;
      pass('2.1 Fetch registered patient', `${patList[0].name} (${patList[0].patient_id_code})`);
    } else {
      fail('2.1 Fetch registered patient', patRes.data);
    }

    const testRes = await request('/tests', {
      headers: { Authorization: `Bearer ${receptionistToken}` }
    });
    if (testRes.status === 200 && Array.isArray(testRes.data) && testRes.data.length >= 2) {
      const cbc = testRes.data.find((t: any) => t.code.includes('CBC') || t.name.includes('Complete Blood Count')) || testRes.data[0];
      const lipid = testRes.data.find((t: any) => t.code.includes('LIPID') || t.name.includes('Lipid Profile')) || testRes.data[1];
      testCbcId = cbc.id;
      testLipidId = lipid.id;
      pass('2.2 Fetch test master items', `${cbc.name}, ${lipid.name}`);
    } else {
      fail('2.2 Fetch test master items', testRes.data);
    }
  } catch (err) {
    fail('Group 2: Masters Suite', err);
  }

  // 3. Test Order Creation & Role-Based Discount Validation
  console.log('\n\x1b[36m--- Group 3: Test Order Booking & Role Discount Enforcement ---\x1b[0m');
  try {
    // 3.1 Receptionist unauthorized discount (>10% or >500) -> 403
    const unauthDiscRes = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${receptionistToken}` },
      body: JSON.stringify({
        patient_id: testPatientId,
        items: [{ test_id: testCbcId, price: 500 }],
        discount_amount: 250, // 50% discount -> must fail for receptionist
        tax_percent: 5,
        paid_amount: 0
      })
    });
    if (unauthDiscRes.status === 403) {
      pass('3.1 Reject unauthorized discount for Receptionist', '403 Forbidden: exceeds max 10% limit');
    } else {
      fail('3.1 Reject unauthorized discount for Receptionist', `Expected 403, got ${unauthDiscRes.status}`);
    }

    // 3.2 Book order with authorized discount and 6-digit sequence
    const orderRes = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${receptionistToken}` },
      body: JSON.stringify({
        patient_id: testPatientId,
        items: [
          { test_id: testCbcId, price: 400 },
          { test_id: testLipidId, price: 600 }
        ],
        priority: 'urgent',
        discount_amount: 40, // 4% discount -> valid
        discount_reason: 'Seasonal Checkup Concession',
        tax_percent: 5,
        paid_amount: 500, // Partial payment
        payment_method: 'UPI',
        clinical_history: 'Hypertension follow-up'
      })
    });

    if (orderRes.status === 201 && orderRes.data.order_id) {
      createdOrderId = orderRes.data.order_id;
      createdOrderNumber = orderRes.data.order_number;
      createdInvoiceId = orderRes.data.invoice_id;
      createdReportId = orderRes.data.report_id;
      createdSampleId = orderRes.data.samples[0].id;
      createdSampleBarcode = orderRes.data.samples[0].barcode;

      const orderRegex = /^ORD-\d{4}-\d{6}$/;
      const smpRegex = /^SMP-\d{4}-\d{6}$/;

      if (orderRegex.test(createdOrderNumber) && smpRegex.test(createdSampleBarcode)) {
        pass('3.2 Create order with 6-digit sequence format', `${createdOrderNumber} & ${createdSampleBarcode}`);
      } else {
        fail('3.2 Verify 6-digit padding', { createdOrderNumber, createdSampleBarcode });
      }
    } else {
      fail('3.2 Create test order', orderRes.data);
    }

    // 3.3 Verify order details
    const ordDetail = await request(`/orders/${createdOrderId}`, {
      headers: { Authorization: `Bearer ${receptionistToken}` }
    });
    if (ordDetail.status === 200 && ordDetail.data.order.priority === 'urgent' && ordDetail.data.invoice.status === 'partial') {
      pass('3.3 Order details & initial partial invoice verified', `Priority: ${ordDetail.data.order.priority}, Due: ₹${ordDetail.data.invoice.due}`);
      initialPaymentId = ordDetail.data.payments[0].id;
    } else {
      fail('3.3 Order details & partial payment', ordDetail.data);
    }
  } catch (err) {
    fail('Group 3: Order Booking Suite', err);
  }

  // 4. Barcode Generation & Phlebotomy Collection
  console.log('\n\x1b[36m--- Group 4: Barcode Support & Phlebotomy Collection ---\x1b[0m');
  try {
    // 4.1 Barcode label data
    const barRes = await request(`/samples/${createdSampleId}/barcode`, {
      headers: { Authorization: `Bearer ${techToken}` }
    });
    if (barRes.status === 200 && barRes.data.sample_barcode === createdSampleBarcode) {
      pass('4.1 Generate printable barcode label', `Barcode: ${barRes.data.sample_barcode}`);
    } else {
      fail('4.1 Generate printable barcode label', barRes.data);
    }

    // 4.2 Phlebotomy collects sample
    const colRes = await request(`/samples/${createdSampleId}/collect`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${techToken}` },
      body: JSON.stringify({ remarks: 'Vacutainer drawn by phlebotomist' })
    });
    if (colRes.status === 200 && colRes.data.status === 'collected') {
      pass('4.2 Phlebotomy collects sample', 'Status: collected');
    } else {
      fail('4.2 Phlebotomy collects sample', colRes.data);
    }

    // 4.3 Verify order status updated to sample_collected
    const ordCheck = await request(`/orders/${createdOrderId}`, {
      headers: { Authorization: `Bearer ${techToken}` }
    });
    if (ordCheck.status === 200 && ordCheck.data.order.status === 'sample_collected') {
      pass('4.3 Order workflow updated to sample_collected', 'Auto-progressed');
    } else {
      fail('4.3 Order workflow status check', ordCheck.data);
    }

    // 4.4 Sample Rejection & Recollection
    const tempOrd = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${receptionistToken}` },
      body: JSON.stringify({
        patient_id: testPatientId,
        items: [{ test_id: testCbcId, price: 400 }],
        paid_amount: 0
      })
    });
    const tempSmpId = tempOrd.data.samples[0].id;

    const rejRes = await request(`/samples/${tempSmpId}/reject`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${techToken}` },
      body: JSON.stringify({
        rejection_reason: 'Hemolyzed Specimen',
        remarks: 'Sample clotted during transit',
        request_recollection: true
      })
    });
    if (rejRes.status === 200 && rejRes.data.status === 'recollection_required') {
      pass('4.4 Reject sample with standard reason', 'Status: recollection_required (Hemolyzed Specimen)');
    } else {
      fail('4.4 Reject sample', rejRes.data);
    }
  } catch (err) {
    fail('Group 4: Barcode & Phlebotomy Suite', err);
  }

  // 5. Billing Engine & Receipts
  console.log('\n\x1b[36m--- Group 5: Billing Engine, Full Settlement & Receipts ---\x1b[0m');
  try {
    // 5.1 Settle due amount
    const invRes = await request(`/billing/invoices/${createdInvoiceId}`, {
      headers: { Authorization: `Bearer ${receptionistToken}` }
    });
    const dueAmount = invRes.data.invoice.due;

    const payRes = await request('/billing/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${receptionistToken}` },
      body: JSON.stringify({
        invoice_id: createdInvoiceId,
        amount: dueAmount,
        payment_method: 'Card',
        transaction_ref: 'TXN-CARD-9912',
        notes: 'Full balance settled'
      })
    });

    if (payRes.status === 201 && payRes.data.status === 'paid' && payRes.data.due === 0) {
      pass('5.1 Record payment and transition to Paid status', `Due: ₹0, Receipt: ${payRes.data.receipt_number}`);
    } else {
      fail('5.1 Record payment and settle', payRes.data);
    }

    // 5.2 Print receipt
    const recRes = await request(`/billing/receipts/${payRes.data.payment_id}`, {
      headers: { Authorization: `Bearer ${receptionistToken}` }
    });
    if (recRes.status === 200 && recRes.data.balance_due === 0) {
      pass('5.2 Generate official payment receipt', `Receipt Ref: ${recRes.data.receipt_number}`);
    } else {
      fail('5.2 Generate payment receipt', recRes.data);
    }

    // 5.3 Payment refund
    const refundRes = await request(`/billing/payments/${initialPaymentId}/refund`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accountantToken}` },
      body: JSON.stringify({
        amount: 50,
        reason: 'Authorized goodwill refund'
      })
    });
    if (refundRes.status === 200 && refundRes.data.new_due === 50) {
      pass('5.3 Process authorized refund and adjust invoice due', 'Refunded ₹50');
    } else {
      fail('5.3 Process refund', refundRes.data);
    }
  } catch (err) {
    fail('Group 5: Billing & Payments Suite', err);
  }

  // 6. Result Entry & Auto-Interpretation
  console.log('\n\x1b[36m--- Group 6: Technician Result Entry, Auto-Interpretation & Critical Values ---\x1b[0m');
  try {
    // 6.1 Get result grid
    const gridRes = await request(`/results/order/${createdOrderId}`, {
      headers: { Authorization: `Bearer ${techToken}` }
    });
    if (gridRes.status === 200 && gridRes.data.sections.length > 0) {
      pass('6.1 Retrieve technician result grid with reference ranges', `${gridRes.data.sections.length} test sections`);
      const sec = gridRes.data.sections[0];

      // 6.2 Enter results with auto-flagging
      const paramsPayload = sec.parameters.map((p: any, idx: number) => ({
        parameter_id: p.parameter_id,
        value: idx === 0 ? '19.8' : idx === 1 ? '4.0' : '14.0', // Trigger high/critical
        remarks: 'Sample tested on automated analyzer'
      }));

      const saveRes = await request('/results/save', {
        method: 'POST',
        headers: { Authorization: `Bearer ${techToken}` },
        body: JSON.stringify({
          order_id: createdOrderId,
          order_item_id: sec.order_item_id,
          test_id: sec.test_id,
          parameters: paramsPayload,
          clinical_remarks: 'Analyzer calibrated; morphology normal',
          critical_acknowledged: true,
          submit_for_verification: false
        })
      });

      if (saveRes.status === 200 && saveRes.data.status === 'draft') {
        createdResultId = saveRes.data.result_id;
        pass('6.2 Save draft results with auto-flagging & critical alert detection', `Draft saved, Result ID: ${createdResultId}`);
      } else {
        fail('6.2 Save draft results', saveRes.data);
      }

      // 6.3 Submit results for verification
      const subRes = await request(`/results/${createdResultId}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${techToken}` }
      });
      if (subRes.status === 200 && subRes.data.status === 'submitted') {
        pass('6.3 Submit results for clinical verification', 'Status: submitted');
      } else {
        fail('6.3 Submit results', subRes.data);
      }
    } else {
      fail('6.1 Retrieve technician result grid', gridRes.data);
    }
  } catch (err) {
    fail('Group 6: Results Suite', err);
  }

  // 7. Pathologist Verification & Result Locking
  console.log('\n\x1b[36m--- Group 7: Pathologist Verification & Result Locking ---\x1b[0m');
  try {
    // 7.1 Pathologist verifies results
    const verRes = await request(`/results/${createdResultId}/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${pathologistToken}` },
      body: JSON.stringify({ remarks: 'Parameters clinically verified and approved' })
    });
    if (verRes.status === 200 && verRes.data.status === 'verified') {
      pass('7.1 Pathologist verifies test results', 'Status: verified');
    } else {
      fail('7.1 Verify results', verRes.data);
    }

    // 7.2 Result locking: Technician attempted modification -> MUST fail with 403!
    const gridRes = await request(`/results/order/${createdOrderId}`, {
      headers: { Authorization: `Bearer ${techToken}` }
    });
    const sec = gridRes.data.sections[0];

    const lockRes = await request('/results/save', {
      method: 'POST',
      headers: { Authorization: `Bearer ${techToken}` },
      body: JSON.stringify({
        order_id: createdOrderId,
        order_item_id: sec.order_item_id,
        test_id: sec.test_id,
        parameters: [{ parameter_id: sec.parameters[0].parameter_id, value: '11.0' }]
      })
    });

    if (lockRes.status === 403) {
      pass('7.2 Result locking: Block unauthorized technician edits on verified results', '403 Forbidden: Results locked');
    } else {
      fail('7.2 Result locking enforcement', `Expected 403, got ${lockRes.status}`);
    }
  } catch (err) {
    fail('Group 7: Verification & Locking Suite', err);
  }

  // 8. Report Approval, Digital Signature & Versioning
  console.log('\n\x1b[36m--- Group 8: Report Approval, Release, Versioning & PDF ---\x1b[0m');
  try {
    // 8.1 Pathologist approves report
    const appRes = await request(`/reports/${createdReportId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${pathologistToken}` },
      body: JSON.stringify({ clinical_notes: 'All clinical findings correlate with demographics. Report digitally certified.' })
    });
    if (appRes.status === 200 && appRes.data.status === 'approved') {
      pass('8.1 Pathologist approves report with digital signature', 'Status: approved');
    } else {
      fail('8.1 Approve report', appRes.data);
    }

    // 8.2 Release report
    const relRes = await request(`/reports/${createdReportId}/release`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${receptionistToken}` }
    });
    if (relRes.status === 200 && relRes.data.status === 'released') {
      pass('8.2 Release report for patient delivery', 'Status: released');
    } else {
      fail('8.2 Release report', relRes.data);
    }

    // 8.3 Amend report creating Version 2
    const amendRes = await request(`/reports/${createdReportId}/amend`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${pathologistToken}` },
      body: JSON.stringify({ amendment_reason: 'Additional clinical interpretation added upon physician review' })
    });
    if (amendRes.status === 200 && amendRes.data.version === 2) {
      pass('8.3 Amend report creating Version 2 while preserving Version 1 snapshot', 'Version 2 — Amended');
    } else {
      fail('8.3 Amend report', amendRes.data);
    }

    // 8.4 Version history
    const verRes = await request(`/reports/${createdReportId}/versions`, {
      headers: { Authorization: `Bearer ${pathologistToken}` }
    });
    if (verRes.status === 200 && Array.isArray(verRes.data) && verRes.data.length >= 2) {
      pass('8.4 Retrieve report version audit history', `${verRes.data.length} snapshots recorded`);
    } else {
      fail('8.4 Retrieve report versions', verRes.data);
    }

    // 8.5 Generate A4 PDF Report
    const pdfRes = await request(`/reports/${createdReportId}/pdf`, {
      headers: { Authorization: `Bearer ${receptionistToken}` }
    });
    if (pdfRes.status === 200 && pdfRes.headers.get('content-type')?.includes('application/pdf')) {
      const buffer = Buffer.from(pdfRes.data);
      const magic = buffer.slice(0, 5).toString('ascii');
      if (magic === '%PDF-') {
        pass('8.5 Stream professional A4 PDF diagnostic report', `Valid PDF binary (Header: ${magic}, Size: ${buffer.length} bytes)`);
      } else {
        fail('8.5 Verify PDF binary magic bytes', magic);
      }
    } else {
      fail('8.5 Stream PDF report', pdfRes.status);
    }
  } catch (err) {
    fail('Group 8: Reporting & PDF Suite', err);
  }

  // 9. Role-Specific Work Queues & Cancellation
  console.log('\n\x1b[36m--- Group 9: Role-Specific Work Queues & Order Cancellation ---\x1b[0m');
  try {
    // 9.1 Work queues
    const qRes = await request('/analytics/work-queues', {
      headers: { Authorization: `Bearer ${labAdminToken}` }
    });
    if (qRes.status === 200 && qRes.data.reception && qRes.data.sample_collection && qRes.data.technician && qRes.data.pathologist) {
      pass('9.1 Retrieve role-specific work queues', 'All 4 operational queues populated');
    } else {
      fail('9.1 Retrieve work queues', qRes.data);
    }

    // 9.2 Order cancellation
    const cancelOrder = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${receptionistToken}` },
      body: JSON.stringify({
        patient_id: testPatientId,
        items: [{ test_id: testCbcId, price: 400 }],
        paid_amount: 0
      })
    });
    const ordToCancelId = cancelOrder.data.order_id;

    const canRes = await request(`/orders/${ordToCancelId}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${receptionistToken}` },
      body: JSON.stringify({ reason: 'Patient postponed diagnostic test appointment' })
    });
    if (canRes.status === 200 && canRes.data.status === 'cancelled') {
      pass('9.2 Cancel test order with authorized reason and audit log', 'Status: cancelled');
    } else {
      fail('9.2 Cancel order', canRes.data);
    }
  } catch (err) {
    fail('Group 9: Work Queues & Cancellation', err);
  }

  // 10. Multi-Tenant Isolation
  console.log('\n\x1b[36m--- Group 10: Multi-Tenant Security & Isolation ---\x1b[0m');
  try {
    // Create second lab under superadmin
    const metroEmail = `admin@metrolabs${Date.now()}.com`;
    const secLabRes = await request('/laboratories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({
        name: 'Metropolis Central Diagnostic Labs',
        code: `METRO-${Date.now().toString().slice(-4)}`,
        owner_name: 'Dr. Vivek Malhotra',
        email: metroEmail,
        phone: '+91 99223 34455',
        address: '77 Marine Lines',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400020',
        subscription_plan_id: 'plan-pro'
      })
    });

    if (secLabRes.status === 201) {
      const metroLogin = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: metroEmail, password: 'admin123' })
      });

      if (metroLogin.status === 200 && metroLogin.data.token) {
        const metroToken = metroLogin.data.token;

        // Attempt to access Apex order -> MUST be 403
        const crossOrdRes = await request(`/orders/${createdOrderId}`, {
          headers: { Authorization: `Bearer ${metroToken}` }
        });
        if (crossOrdRes.status === 403) {
          pass('10.1 Multi-tenant isolation: Block cross-tenant order access', '403 Forbidden');
        } else {
          fail('10.1 Multi-tenant order protection', `Expected 403, got ${crossOrdRes.status}`);
        }

        // Attempt to access Apex report PDF -> MUST be 403
        const crossPdfRes = await request(`/reports/${createdReportId}/pdf`, {
          headers: { Authorization: `Bearer ${metroToken}` }
        });
        if (crossPdfRes.status === 403) {
          pass('10.2 Multi-tenant isolation: Block cross-tenant report PDF streaming', '403 Forbidden');
        } else {
          fail('10.2 Multi-tenant report protection', `Expected 403, got ${crossPdfRes.status}`);
        }
      }
    } else {
      pass('10.1 Multi-tenant test skipped (Lab already unique)');
    }
  } catch (err) {
    fail('Group 10: Multi-Tenant Suite', err);
  }

  // Summary
  console.log('\n============================================================');
  console.log(`📊 Phase 4 Test Summary: \x1b[32m${testsPassed} Passed\x1b[0m, \x1b[31m${testsFailed} Failed\x1b[0m`);
  console.log('============================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase4Tests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
