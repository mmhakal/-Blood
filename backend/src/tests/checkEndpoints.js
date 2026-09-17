const fs = require('fs');
const path = require('path');

const files = [
  'operations/OperationsCenterPage.tsx',
  'operations/AutomationEnginePage.tsx',
  'procurement/ProcurementPage.tsx',
  'crm/CrmCorporatePage.tsx',
  'field/FieldServicesPage.tsx',
  'workforce/WorkforcePage.tsx',
  'governance/QualityGovernancePage.tsx',
  'pricing/PricingProfitabilityPage.tsx',
  'search/GlobalIntelligentSearch.tsx',
  'import/DataImportWizard.tsx',
  'ai/AIClinicalHub.tsx',
  'approvals/ApprovalCenter.tsx',
  'documents/DocumentManager.tsx',
  'mobile/MobileSyncCenter.tsx',
  'saas/WhiteLabelManager.tsx',
  'security/SecurityCenter.tsx',
  'system/FeatureFlagsManager.tsx',
  'developer/ApiWebhooksManager.tsx',
  'system/SystemHealthDashboard.tsx',
  'enterprise/EnterpriseCommandCenter.tsx',
  'enterprise/OrganizationManager.tsx'
];

for (const f of files) {
  const p = path.join(process.cwd(), 'frontend', 'src', 'pages', f);
  if (!fs.existsSync(p)) {
    console.log('FILE NOT FOUND:', f);
    continue;
  }
  const content = fs.readFileSync(p, 'utf8');
  const regex = /(?:fetch|api\.get|api\.post)\s*\(\s*['"`]([^'"`?]+)/g;
  const calls = [];
  let m;
  while ((m = regex.exec(content)) !== null) {
    calls.push(m[1]);
  }
  console.log(f + ':');
  for (const c of Array.from(new Set(calls))) {
    console.log('   ->', c);
  }
}
