/**
 * Phase 7 — Enterprise Command Center, Multi-Lab Operations & Assistive AI Clinical Layer Test Suite
 * MediFlow LIS (Modern Blood Diagnostic Laboratory Management Software)
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

async function runPhase7Tests() {
  console.log('\n============================================================');
  console.log('🔬 MediFlow LIS — Phase 7 Enterprise Command Center & AI Suite');
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
    // Group 2: Centralized Enterprise Command Center
    // ----------------------------------------------------
    console.log('\n--- Group 2: Centralized Enterprise Command Center ---');
    const ccRes = await request('/command-center', {
      headers: { Authorization: `Bearer ${superToken}` }
    });
    if (ccRes.ok && ccRes.data.overview) {
      pass('2.1 Enterprise Command Center metrics loaded', `Laboratories: ${ccRes.data.overview.total_laboratories}, Active: ${ccRes.data.overview.active_laboratories}`);
    } else {
      fail('2.1 Enterprise Command Center metrics loaded', ccRes.data);
    }

    if (ccRes.data.analyzers && ccRes.data.workload && ccRes.data.quality_control) {
      pass('2.2 Real-time multi-dimensional operational widgets verified',
        `Analyzers Online: ${ccRes.data.analyzers.online}/${ccRes.data.analyzers.total}, Critical Alerts: ${ccRes.data.workload.critical_panic_alerts}`);
    } else {
      fail('2.2 Real-time multi-dimensional operational widgets verified', 'Missing dimensions');
    }

    // ----------------------------------------------------
    // Group 3: Multi-Lab Organization Management
    // ----------------------------------------------------
    console.log('\n--- Group 3: Multi-Lab Organization Management ---');
    const orgsRes = await request('/organizations', {
      headers: { Authorization: `Bearer ${superToken}` }
    });
    if (orgsRes.ok && orgsRes.data.length > 0) {
      pass('3.1 Listed enterprise organizations', `Found ${orgsRes.data.length} organizations: ${orgsRes.data[0].name}`);
    } else {
      fail('3.1 Listed enterprise organizations', orgsRes.data);
    }

    const orgAnalyticsRes = await request(`/organizations/org-apollo-health/consolidated-analytics`, {
      headers: { Authorization: `Bearer ${superToken}` }
    });
    if (orgAnalyticsRes.ok && orgAnalyticsRes.data.consolidated) {
      pass('3.2 Consolidated multi-lab analytics calculated',
        `Total Labs: ${orgAnalyticsRes.data.total_member_labs}, Consolidated Rev: ₹${orgAnalyticsRes.data.consolidated.total_revenue_inr}`);
    } else {
      fail('3.2 Consolidated multi-lab analytics calculated', orgAnalyticsRes.data);
    }

    // ----------------------------------------------------
    // Group 4: Assistive AI Clinical Layer
    // ----------------------------------------------------
    console.log('\n--- Group 4: Assistive AI Clinical Layer & Suggestions ---');
    const patientRes = await request('/patients', {
      headers: { Authorization: `Bearer ${labToken}` }
    });
    const patientId = patientRes.data?.[0]?.id || 'pid-2026-0001';

    const aiTrendRes = await request(`/ai/trends/${patientId}`, {
      headers: { Authorization: `Bearer ${labToken}` }
    });
    if (aiTrendRes.ok && aiTrendRes.data.disclaimer) {
      pass('4.1 Patient historical result trends analyzed with AI disclaimer',
        `Disclaimer: "${aiTrendRes.data.disclaimer.substring(0, 35)}..."`);
    } else {
      fail('4.1 Patient historical result trends analyzed with AI disclaimer', aiTrendRes.data);
    }

    const reportRes = await request('/reports', {
      headers: { Authorization: `Bearer ${labToken}` }
    });
    const reportId = reportRes.data?.[0]?.id || 'rep-demo-01';

    const aiDraftRes = await request(`/ai/draft-report/${reportId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${labToken}` }
    });
    if (aiDraftRes.ok && Array.isArray(aiDraftRes.data.suggestions)) {
      pass('4.2 Non-diagnostic report observations drafted',
        `Suggestions count: ${aiDraftRes.data.suggestions.length}, Label: "${aiDraftRes.data.suggestions[0]?.ai_label || 'AI-Generated'}"`);
    } else {
      fail('4.2 Non-diagnostic report observations drafted', aiDraftRes.data);
    }

    const aiAnomaliesRes = await request('/ai/anomalies', {
      headers: { Authorization: `Bearer ${labToken}` }
    });
    if (aiAnomaliesRes.ok && Array.isArray(aiAnomaliesRes.data)) {
      pass('4.3 Real-time clinical anomaly detection operational',
        `Detected anomalies: ${aiAnomaliesRes.data.length}`);
    } else {
      fail('4.3 Real-time clinical anomaly detection operational', aiAnomaliesRes.data);
    }

    const aiTatRes = await request('/ai/tat-predictions', {
      headers: { Authorization: `Bearer ${labToken}` }
    });
    if (aiTatRes.ok && Array.isArray(aiTatRes.data)) {
      pass('4.4 Predictive TAT and delay risk calculated',
        `Orders scored: ${aiTatRes.data.length}, Sample risk: ${aiTatRes.data[0]?.delay_risk || 'low'}`);
    } else {
      fail('4.4 Predictive TAT and delay risk calculated', aiTatRes.data);
    }

    const aiInvRes = await request('/ai/inventory-forecasts', {
      headers: { Authorization: `Bearer ${labToken}` }
    });
    if (aiInvRes.ok && Array.isArray(aiInvRes.data)) {
      pass('4.5 Predictive reagent consumption & burn rate projected',
        `Forecasted items: ${aiInvRes.data.length}, Days remaining: ${aiInvRes.data[0]?.predicted_days_remaining}d`);
    } else {
      fail('4.5 Predictive reagent consumption & burn rate projected', aiInvRes.data);
    }

    // ----------------------------------------------------
    // Group 5: AI Governance & Human Decision Feedback
    // ----------------------------------------------------
    console.log('\n--- Group 5: AI Governance & Human Decision Feedback ---');
    const feedbackRes = await request('/ai/feedback', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labToken}` },
      body: JSON.stringify({
        suggestion_id: 'ais-01',
        decision: 'accepted',
        edited_text: 'Reviewed and confirmed by Senior Pathologist.'
      })
    });
    if (feedbackRes.ok) {
      pass('5.1 Professional human review recorded for AI suggestion', 'Status: accepted');
    } else {
      fail('5.1 Professional human review recorded for AI suggestion', feedbackRes.data);
    }

    const govRes = await request('/ai/governance', {
      headers: { Authorization: `Bearer ${labToken}` }
    });
    if (govRes.ok && Array.isArray(govRes.data.events)) {
      pass('5.2 AI governance audit trail verified',
        `Audited events: ${govRes.data.events_count}, Human reviews: ${govRes.data.feedback_count}`);
    } else {
      fail('5.2 AI governance audit trail verified', govRes.data);
    }

    // ----------------------------------------------------
    // Group 6: Natural-Language Intelligent Search
    // ----------------------------------------------------
    console.log('\n--- Group 6: Natural-Language Intelligent Search ---');
    const searchRes = await request('/search?q=CBC', {
      headers: { Authorization: `Bearer ${labToken}` }
    });
    if (searchRes.ok && searchRes.data.results) {
      pass('6.1 Global intelligent search executed',
        `Query: "CBC", Total results: ${searchRes.data.total_results}`);
    } else {
      fail('6.1 Global intelligent search executed', searchRes.data);
    }

    // ----------------------------------------------------
    // Group 7: Secure Document Repository
    // ----------------------------------------------------
    console.log('\n--- Group 7: Secure Document Repository ---');
    const docsRes = await request('/documents', {
      headers: { Authorization: `Bearer ${labToken}` }
    });
    if (docsRes.ok && docsRes.data.length > 0) {
      pass('7.1 Document repository catalog retrieved', `Total documents: ${docsRes.data.length}`);
    } else {
      fail('7.1 Document repository catalog retrieved', docsRes.data);
    }

    const docDownloadRes = await request(`/documents/${docsRes.data[0].id}/download`, {
      headers: { Authorization: `Bearer ${labToken}` }
    });
    if (docDownloadRes.ok && docDownloadRes.data.download_url) {
      pass('7.2 Document access audited and secure link generated', `Expires in: ${docDownloadRes.data.expires_in_seconds}s`);
    } else {
      fail('7.2 Document access audited and secure link generated', docDownloadRes.data);
    }

    // ----------------------------------------------------
    // Group 8: Mobile & Offline-First Synchronization
    // ----------------------------------------------------
    console.log('\n--- Group 8: Mobile & Offline-First Synchronization ---');
    const devicesRes = await request('/mobile/devices', {
      headers: { Authorization: `Bearer ${labToken}` }
    });
    if (devicesRes.ok && devicesRes.data.length > 0) {
      pass('8.1 Registered mobile devices listed', `Active devices: ${devicesRes.data.length} (${devicesRes.data[0].platform})`);
    } else {
      fail('8.1 Registered mobile devices listed', devicesRes.data);
    }

    const syncBatchRes = await request('/mobile/sync/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labToken}` },
      body: JSON.stringify({
        device_id: devicesRes.data[0].id,
        transactions: [
          {
            id: `tx-test-${Date.now()}`,
            action_type: 'barcode_scan',
            payload: { barcode: 'SMP-2026-000026', location: 'Rack-A' },
            queued_at: new Date().toISOString()
          }
        ]
      })
    });
    if (syncBatchRes.ok && syncBatchRes.data.success_count >= 1) {
      pass('8.2 Offline transaction batch synchronized', `Processed: ${syncBatchRes.data.processed_count}, Success: ${syncBatchRes.data.success_count}`);
    } else {
      fail('8.2 Offline transaction batch synchronized', syncBatchRes.data);
    }

    // ----------------------------------------------------
    // Group 9: White-Label SaaS & Custom Domains
    // ----------------------------------------------------
    console.log('\n--- Group 9: White-Label SaaS & Custom Domains ---');
    const wlRes = await request('/white-label', {
      headers: { Authorization: `Bearer ${labToken}` }
    });
    if (wlRes.ok && wlRes.data.brand_name) {
      pass('9.1 White-label branding configurations retrieved', `Brand: "${wlRes.data.brand_name}", Primary: ${wlRes.data.primary_color}`);
    } else {
      fail('9.1 White-label branding configurations retrieved', wlRes.data);
    }

    const cdRes = await request('/white-label/custom-domains', {
      headers: { Authorization: `Bearer ${labToken}` }
    });
    if (cdRes.ok && cdRes.data.length > 0) {
      pass('9.2 Custom vanity domains verified', `Domain: ${cdRes.data[0].domain_name}, SSL: ${cdRes.data[0].ssl_status}`);
    } else {
      fail('9.2 Custom vanity domains verified', cdRes.data);
    }

    // ----------------------------------------------------
    // Group 10: Multi-Step Approval Workflows
    // ----------------------------------------------------
    console.log('\n--- Group 10: Enterprise Multi-Step Approval Workflows ---');
    const wfRes = await request('/approvals/workflows', {
      headers: { Authorization: `Bearer ${labToken}` }
    });
    if (wfRes.ok && wfRes.data.length > 0) {
      pass('10.1 Approval workflows loaded', `Total workflows: ${wfRes.data.length} (${wfRes.data[0].name})`);
    } else {
      fail('10.1 Approval workflows loaded', wfRes.data);
    }

    const appReqRes = await request('/approvals/requests', {
      headers: { Authorization: `Bearer ${labToken}` }
    });
    if (appReqRes.ok && appReqRes.data.length > 0) {
      pass('10.2 Pending approval requests listed', `Pending requests: ${appReqRes.data.length} (Entity: ${appReqRes.data[0].entity_type})`);
    } else {
      fail('10.2 Pending approval requests listed', appReqRes.data);
    }

    // ----------------------------------------------------
    // Group 11: Security Center & Active Sessions
    // ----------------------------------------------------
    console.log('\n--- Group 11: Security Center & Active Sessions ---');
    const sessionsRes = await request('/security-center/sessions', {
      headers: { Authorization: `Bearer ${superToken}` }
    });
    if (sessionsRes.ok && sessionsRes.data.length > 0) {
      pass('11.1 Active user sessions audited', `Active sessions: ${sessionsRes.data.length} (Device: ${sessionsRes.data[0].device_type})`);
    } else {
      fail('11.1 Active user sessions audited', sessionsRes.data);
    }

    const secEventsRes = await request('/security-center/events', {
      headers: { Authorization: `Bearer ${superToken}` }
    });
    if (secEventsRes.ok && Array.isArray(secEventsRes.data)) {
      pass('11.2 Security audit stream operational', `Security events logged: ${secEventsRes.data.length}`);
    } else {
      fail('11.2 Security audit stream operational', secEventsRes.data);
    }

    // ----------------------------------------------------
    // Group 12: Feature Flags & Configuration Versioning
    // ----------------------------------------------------
    console.log('\n--- Group 12: Feature Flags & Configuration Versioning ---');
    const flagsRes = await request('/feature-flags', {
      headers: { Authorization: `Bearer ${superToken}` }
    });
    if (flagsRes.ok && flagsRes.data.length >= 6) {
      pass('12.1 Enterprise feature flags evaluated', `Active flags: ${flagsRes.data.length}`);
    } else {
      fail('12.1 Enterprise feature flags evaluated', flagsRes.data);
    }

  } catch (err: any) {
    console.error('Fatal test runner error:', err);
    testsFailed++;
  }

  console.log('\n============================================================');
  console.log(`📊 Phase 7 Test Summary: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('============================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase7Tests();
