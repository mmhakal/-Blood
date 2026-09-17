/**
 * Diagnostic script to test all backend endpoints called by frontend pages
 * for Super Admin.
 */

async function testEndpoints() {
  const BASE_URL = 'http://localhost:5000/api';

  // 1. Log in as Super Admin
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@medilabs.com', password: 'admin123' })
  });

  if (!loginRes.ok) {
    console.error('Login failed:', await loginRes.text());
    process.exit(1);
  }

  const { token, user } = await loginRes.json();
  console.log(`✅ Logged in as: ${user.name} (${user.role_code}), lab_id: ${user.lab_id}`);

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const endpointsToTest = [
    // Onboarding Hub
    { page: 'Onboarding Hub (/onboarding)', url: '/onboarding/checklist' },
    { page: 'Onboarding Hub (/onboarding)', url: '/onboarding/status' },

    // Command Center
    { page: 'Command Center (/command-center)', url: '/command-center/metrics' },
    { page: 'Command Center (/command-center)', url: '/command-center/telemetry' },

    // Operations Center
    { page: 'Operations Center (/operations)', url: '/operations/metrics' },
    { page: 'Operations Center (/operations)', url: '/operations/tat-bottlenecks' },

    // Automation Engine
    { page: 'Automation Engine (/automation)', url: '/automation/rules' },
    { page: 'Automation Engine (/automation)', url: '/automation/stats' },

    // Procurement & PO
    { page: 'Procurement & PO (/procurement)', url: '/procurement/purchase-orders' },
    { page: 'Procurement & PO (/procurement)', url: '/procurement/suppliers' },
    { page: 'Procurement & PO (/procurement)', url: '/procurement/goods-receipts' },
    { page: 'Procurement & PO (/procurement)', url: '/procurement/contracts' },

    // CRM & Corporate B2B
    { page: 'CRM (/crm)', url: '/crm/corporate-accounts' },
    { page: 'CRM (/crm)', url: '/crm/doctor-referrals' },
    { page: 'CRM (/crm)', url: '/crm/campaigns' },
    { page: 'CRM (/crm)', url: '/crm/feedback' },

    // Field Services & Fleet
    { page: 'Field Services (/field-services)', url: '/field-services/home-collection' },
    { page: 'Field Services (/field-services)', url: '/field-services/phlebotomists' },
    { page: 'Field Services (/field-services)', url: '/field-services/routes' },

    // Workforce & Rostering
    { page: 'Workforce (/workforce)', url: '/workforce/staff' },
    { page: 'Workforce (/workforce)', url: '/workforce/shifts' },
    { page: 'Workforce (/workforce)', url: '/workforce/productivity' },

    // Quality QMS & CAPA
    { page: 'Quality Governance (/quality-governance)', url: '/quality-governance/incidents' },
    { page: 'Quality Governance (/quality-governance)', url: '/quality-governance/capa' },
    { page: 'Quality Governance (/quality-governance)', url: '/quality-governance/audits' },

    // Pricing & Margin BI
    { page: 'Pricing Profitability (/pricing-profitability)', url: '/pricing-engine/test-profitability' },
    { page: 'Pricing Profitability (/pricing-profitability)', url: '/pricing-engine/branch-margins' },

    // Intelligent Search
    { page: 'Intelligent Search (/search)', url: '/search?q=test' },

    // Data Migration
    { page: 'Data Migration (/import)', url: '/import/jobs' },

    // AI Clinical Hub
    { page: 'AI Clinical Hub (/ai-hub)', url: '/ai/insights' },

    // Approvals
    { page: 'Approval Center (/approvals)', url: '/approvals/pending' },

    // Documents
    { page: 'Document Archive (/documents)', url: '/documents' },

    // Mobile Sync
    { page: 'Mobile Fleet Sync (/mobile-sync)', url: '/mobile/devices' },

    // White-Label
    { page: 'White-Label (/white-label)', url: '/white-label' },

    // Security Center
    { page: 'Security Center (/security-center)', url: '/security-center/posture' },
    { page: 'Security Center (/security-center)', url: '/security-center/events' },

    // Feature Flags
    { page: 'Feature Flags (/feature-flags)', url: '/feature-flags' },

    // Developer & Webhooks
    { page: 'Developer (/developer)', url: '/developer/keys' },
    { page: 'Developer (/developer)', url: '/developer/webhooks' },

    // System Telemetry
    { page: 'System Telemetry (/system-health)', url: '/system-health' }
  ];

  console.log(`\nTesting ${endpointsToTest.length} endpoints as Super Admin...\n`);

  let successCount = 0;
  let failureCount = 0;

  for (const ep of endpointsToTest) {
    try {
      const res = await fetch(`${BASE_URL}${ep.url}`, { headers });
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch {}

      if (res.ok) {
        successCount++;
        const preview = Array.isArray(json) ? `Array[${json.length}]` : (typeof json === 'object' && json !== null ? Object.keys(json).join(', ') : text.substring(0, 30));
        console.log(`  \x1b[32m✔ [${res.status}]\x1b[0m ${ep.page} -> ${ep.url} (${preview})`);
      } else {
        failureCount++;
        console.log(`  \x1b[31m✖ [${res.status}]\x1b[0m ${ep.page} -> ${ep.url}`);
        console.log(`      \x1b[33mError response:\x1b[0m ${text.substring(0, 120)}`);
      }
    } catch (err: any) {
      failureCount++;
      console.log(`  \x1b[31m✖ [NETWORK ERR]\x1b[0m ${ep.page} -> ${ep.url}: ${err.message}`);
    }
  }

  console.log(`\n============================================================`);
  console.log(`Endpoint Test Results: ${successCount} OK, ${failureCount} FAILED`);
  console.log(`============================================================\n`);
}

testEndpoints();
