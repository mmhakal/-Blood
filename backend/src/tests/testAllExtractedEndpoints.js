/**
 * Comprehensive Endpoint Tester across all extracted page endpoints
 */

const endpoints = [
  // Operations
  '/api/operations/kpis',
  '/api/operations/tasks',

  // Automation
  '/api/automation/rules',
  '/api/automation/scheduled-jobs',
  '/api/automation/executions',

  // Procurement
  '/api/procurement/purchase-orders',
  '/api/procurement/suppliers',
  '/api/procurement/goods-receipts',
  '/api/procurement/contracts',

  // CRM
  '/api/crm/corporate-accounts',
  '/api/crm/doctor-referrals',
  '/api/crm/campaigns',
  '/api/crm/feedback',

  // Field Services
  '/api/field-services/home-collections',
  '/api/field-services/home-collection',
  '/api/field-services/phlebotomists',
  '/api/field-services/queue-tokens',

  // Workforce
  '/api/workforce/attendance',
  '/api/workforce/shifts',

  // Quality Governance
  '/api/quality-governance/sops',
  '/api/quality-governance/incidents',
  '/api/quality-governance/capa',
  '/api/quality-governance/risk-register',
  '/api/quality-governance/licenses',

  // Pricing
  '/api/pricing-engine/rules',
  '/api/pricing-engine/test-profitability',

  // Search
  '/api/search?q=test',

  // Import
  '/api/import/validate',
  '/api/import/execute',

  // AI
  '/api/ai/anomalies',
  '/api/ai/tat-predictions',
  '/api/ai/inventory-forecasts',
  '/api/ai/governance',

  // Approvals
  '/api/approvals/requests',

  // Documents
  '/api/documents',

  // Mobile
  '/api/mobile/devices',

  // White-Label
  '/api/white-label',
  '/api/white-label/custom-domains',

  // Security Center
  '/api/security-center/sessions',
  '/api/security-center/events',

  // Feature Flags
  '/api/feature-flags',
  '/api/feature-flags/versions',

  // Developer (testing both with and without /api)
  '/api/developer/keys',
  '/api/developer/webhooks',
  '/api/developer/logs',

  // System Health (testing both with and without /api)
  '/api/system-health/status',
  '/api/system-health/security-events',
  '/api/system-health/translations',
  '/api/system-health/currencies',

  // Command Center & Organizations
  '/api/command-center',
  '/api/organizations'
];

async function runTest() {
  const BASE_URL = 'http://localhost:5000';

  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@medilabs.com', password: 'admin123' })
  });
  const { token } = await loginRes.json();
  const headers = { Authorization: `Bearer ${token}` };

  console.log('\n--- TESTING ENDPOINTS AS SUPER ADMIN ---');
  for (const ep of endpoints) {
    try {
      const res = await fetch(`${BASE_URL}${ep}`, { headers });
      const text = await res.text();
      if (res.ok) {
        console.log(`  \x1b[32m✔ [${res.status}]\x1b[0m ${ep}`);
      } else {
        console.log(`  \x1b[31m✖ [${res.status}]\x1b[0m ${ep} -> ${text.substring(0, 100)}`);
      }
    } catch (e) {
      console.log(`  \x1b[31m✖ [NET_ERR]\x1b[0m ${ep}: ${e.message}`);
    }
  }
}

runTest();
