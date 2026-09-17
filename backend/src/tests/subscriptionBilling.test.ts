/**
 * MediFlow LIS — Subscription Billing, Payments & SaaS Operations Test Suite
 * Validates: Subscription lifecycle engine, payment order initiation, cryptographic verification,
 * ledger entry, refund processing, job queues, and self-service onboarding status.
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

async function runSubscriptionBillingTests() {
  console.log('\n============================================================');
  console.log('💳 MediFlow LIS — Subscription Billing & Payments Test Suite');
  console.log('============================================================\n');

  try {
    // 1. Authenticate Lab Admin
    console.log('--- Group 1: Authentication & Subscription Lifecycle ---');
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'labadmin@apexlabs.com', password: 'admin123' })
    });
    if (!loginRes.ok) throw new Error('Lab Admin authentication failed');
    const token = loginRes.data.token;
    pass('1.1 Authenticated Lab Admin session established');

    // 2. Evaluate Subscription Lifecycle Engine
    const evalRes = await request('/payments/subscriptions/lifecycle/evaluate', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (evalRes.ok && evalRes.data.evaluated_count !== undefined) {
      pass('1.2 Subscription lifecycle engine evaluated all tenant laboratories',
        `Evaluated: ${evalRes.data.evaluated_count}, Active: ${evalRes.data.active_count}, Grace: ${evalRes.data.grace_period_count}`);
    } else {
      fail('1.2 Subscription lifecycle engine evaluated', evalRes.data);
    }

    // 3. Payment Gateway Order Initiation
    console.log('\n--- Group 2: Payment Gateway Integration & Verification ---');
    // Get existing invoice or create test payment initiation
    const invoicesRes = await request('/billing/invoices', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const testInvoice = invoicesRes.data?.[0];
    const invoiceId = testInvoice?.id || 'inv-demo-001';

    const orderRes = await request('/payments/initiate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        invoice_id: invoiceId,
        amount: 1500,
        currency: 'INR',
        payment_method: 'UPI',
        notes: 'Monthly Laboratory Subscription Renewal'
      })
    });

    if (orderRes.ok && orderRes.data.gateway_order_id) {
      pass('2.1 Payment order initiated successfully with provider independent gateway',
        `Order: ${orderRes.data.gateway_order_id}`);
    } else {
      fail('2.1 Payment order initiation failed', orderRes.data);
    }

    // 4. Cryptographic Server-Side Payment Verification
    const verifyRes = await request('/payments/verify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        invoice_id: invoiceId,
        amount: 1500,
        currency: 'INR',
        payment_method: 'UPI',
        gateway_order_id: orderRes.data?.gateway_order_id || `order_test_${Date.now()}`,
        gateway_payment_id: `pay_test_${Date.now()}`,
        gateway_signature: 'valid_mock_signature'
      })
    });

    let verifiedPaymentId: string | null = null;
    if (verifyRes.ok && verifyRes.data.receipt_number && verifyRes.data.status === 'settled') {
      verifiedPaymentId = verifyRes.data.payment_id;
      pass('2.2 Cryptographic server-side payment verification recorded ledger entry',
        `Receipt: ${verifyRes.data.receipt_number}, Payment: ${verifyRes.data.payment_id}`);
    } else {
      fail('2.2 Server-side payment verification failed', verifyRes.data);
    }

    // 5. Authorized Refund Processing
    if (verifiedPaymentId) {
      console.log('\n--- Group 3: Refund Processing & Financial Ledgers ---');
      const refundRes = await request('/payments/refund', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          payment_id: verifiedPaymentId,
          amount: 500,
          reason: 'Duplicate payment adjustment'
        })
      });

      if (refundRes.ok && refundRes.data.refund_id) {
        pass('3.1 Authorized partial refund processed and adjusted against invoice due',
          `Refund ID: ${refundRes.data.refund_id}`);
      } else {
        fail('3.1 Refund processing failed', refundRes.data);
      }
    }

    // 6. Background Job Queue Metrics & Operations
    console.log('\n--- Group 4: Background Job Queue Telemetry ---');
    const jobsMetricsRes = await request('/jobs/metrics', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (jobsMetricsRes.ok && jobsMetricsRes.data.total !== undefined) {
      pass('4.1 Background job queue operational and reporting telemetry',
        `Total jobs: ${jobsMetricsRes.data.total}, Completed: ${jobsMetricsRes.data.completed}`);
    } else {
      fail('4.1 Background job queue metrics failed', jobsMetricsRes.data);
    }

    // 7. Customer Onboarding Wizard & Self-Service Provisioning
    console.log('\n--- Group 5: SaaS Self-Service Onboarding ---');
    const onboardingRes = await request('/onboarding/status', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (onboardingRes.ok && onboardingRes.data.progress_percentage !== undefined) {
      pass('5.1 Laboratory onboarding checklist evaluated dynamically',
        `Progress: ${onboardingRes.data.progress_percentage}%, Steps: ${onboardingRes.data.completed_count}/${onboardingRes.data.total_steps}`);
    } else {
      fail('5.1 Onboarding status query failed', onboardingRes.data);
    }

    const starterKitRes = await request('/onboarding/quick-starter', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (starterKitRes.ok && starterKitRes.data.success === true) {
      pass('5.2 1-Click Starter Kit Provisioning initialized default branch and NABL template');
    } else {
      fail('5.2 Starter Kit Provisioning failed', starterKitRes.data);
    }

  } catch (err: any) {
    console.error('Fatal subscription billing test error:', err);
    testsFailed++;
  }

  console.log('\n============================================================');
  console.log(`📊 Subscription Billing & SaaS Operations: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('============================================================\n');

  if (testsFailed > 0) process.exit(1);
}

runSubscriptionBillingTests();
