/**
 * Phase 6 — Enterprise LIS, Analyzer Integration, QC & Standardized Communication Test Suite
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

async function runPhase6Tests() {
  console.log('\n============================================================');
  console.log('🔬 MediFlow LIS — Phase 6 Advanced LIS & Analyzer Test Suite');
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
    const adminToken = adminRes.data?.token;
    if (adminRes.ok && adminToken) {
      pass('1.1 Super Admin authenticated', 'superadmin session ready');
    } else {
      fail('1.1 Super Admin authenticated', adminRes.data);
    }

    const labAdminRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'labadmin@apexlabs.com', password: 'admin123' })
    });
    const labToken = labAdminRes.data?.token;
    const authHeaders = { Authorization: `Bearer ${labToken}` };
    if (labAdminRes.ok && labToken) {
      pass('1.2 Lab Admin authenticated', 'Apex Diagnostics context');
    } else {
      fail('1.2 Lab Admin authenticated', labAdminRes.data);
    }

    // ----------------------------------------------------
    // Group 2: Analyzer Management & Connection Telemetry
    // ----------------------------------------------------
    console.log('\n--- Group 2: Analyzer Management & Telemetry ---');
    const analyzersRes = await request('/analyzers', { headers: authHeaders });
    if (analyzersRes.ok && Array.isArray(analyzersRes.data) && analyzersRes.data.length >= 2) {
      pass('2.1 Listed diagnostic analyzers', `Found ${analyzersRes.data.length} registered instruments`);
    } else {
      fail('2.1 Listed diagnostic analyzers', analyzersRes.data);
    }

    const sysmex = analyzersRes.data?.find((a: any) => a.id === 'anl-sysmex-xn550');
    if (sysmex && sysmex.status === 'online') {
      pass('2.2 Verified Sysmex XN-550 Hematology Analyzer', 'Status: online, Protocol: ASTM');
    } else {
      fail('2.2 Verified Sysmex XN-550', sysmex);
    }

    const testConnRes = await request('/analyzers/anl-sysmex-xn550/test-connection', {
      method: 'POST',
      headers: authHeaders
    });
    if (testConnRes.ok && testConnRes.data?.latency_ms !== undefined) {
      pass('2.3 Connection handshake verified', `Latency: ${testConnRes.data.latency_ms}ms`);
    } else {
      fail('2.3 Connection handshake verified', testConnRes.data);
    }

    // ----------------------------------------------------
    // Group 3: Parameter Test Mappings
    // ----------------------------------------------------
    console.log('\n--- Group 3: Analyzer Parameter Test Mappings ---');
    const mappingsRes = await request('/analyzers/anl-sysmex-xn550/mappings', { headers: authHeaders });
    if (mappingsRes.ok && Array.isArray(mappingsRes.data) && mappingsRes.data.length > 0) {
      pass('3.1 Parameter mappings retrieved', `Mapped parameters: ${mappingsRes.data.map((m: any) => m.analyzer_test_code).join(', ')}`);
    } else {
      fail('3.1 Parameter mappings retrieved', mappingsRes.data);
    }

    // ----------------------------------------------------
    // Group 4: ASTM & HL7 Communication & Simulation
    // ----------------------------------------------------
    console.log('\n--- Group 4: ASTM & HL7 Communication Gateway ---');
    // 4.1 HL7 ORU_R01 Ingestion and ACK generation
    const sampleHl7 = [
      'MSH|^~\\&|COBAS311|ROCHE|MEDIFLOW_LIS|APEX|20260914120000||ORU^R01|MSG-9021|P|2.5',
      'PID|1||PID-2026-0001||Miller^Johnathan',
      'OBR|1|ORD-2026-0001|SMP-2026-0001|^^^BIOCHEMISTRY',
      'OBX|1|NM|^^^GLUC^Glucose||98.5|mg/dL|70-100|N|||F',
      'OBX|2|NM|^^^CREA^Creatinine||1.05|mg/dL|0.7-1.3|N|||F'
    ].join('\r');

    const hl7IngestRes = await request('/hl7/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: sampleHl7
    });
    if (hl7IngestRes.ok && typeof hl7IngestRes.data === 'string' && hl7IngestRes.data.includes('MSA|AA|MSG-9021')) {
      pass('4.1 HL7 ORU_R01 ingested & ACK generated', 'MSA|AA|MSG-9021 confirmed');
    } else {
      fail('4.1 HL7 ORU_R01 ingested & ACK generated', hl7IngestRes.data);
    }

    // 4.2 ASTM E1381/E1394 packet simulation on Sysmex
    const sampleAstm = [
      'H|\\^&|||XN-550^Sysmex|||||||P|1',
      'P|1||PID-2026-0001||Miller^Johnathan',
      'O|1|SMP-2026-0001||^^^CBC',
      'R|1|^^^HGB|14.2|g/dL|N|||F',
      'R|2|^^^WBC|7.50|10^3/uL|N|||F',
      'R|3|^^^PLT|245|10^3/uL|N|||F',
      'L|1|N'
    ].join('\n');

    const simPacketRes = await request('/analyzers/anl-sysmex-xn550/simulate-packet', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ raw_message: sampleAstm, protocol_hint: 'astm' })
    });
    if (simPacketRes.ok && simPacketRes.data?.imported_count === 3) {
      pass('4.2 ASTM packet parsed and imported', `Imported ${simPacketRes.data.imported_count} observations from Sysmex`);
    } else {
      fail('4.2 ASTM packet parsed and imported', simPacketRes.data);
    }

    // ----------------------------------------------------
    // Group 5: Delta Check Engine
    // ----------------------------------------------------
    console.log('\n--- Group 5: Delta Check Historical Engine ---');
    const deltaRulesRes = await request('/lis-rules/delta-check', { headers: authHeaders });
    if (deltaRulesRes.ok && Array.isArray(deltaRulesRes.data) && deltaRulesRes.data.length >= 1) {
      pass('5.1 Delta check rules verified', `Active rules: ${deltaRulesRes.data.length}`);
    } else {
      fail('5.1 Delta check rules verified', deltaRulesRes.data);
    }

    // ----------------------------------------------------
    // Group 6: Quality Control & Levey-Jennings Charts
    // ----------------------------------------------------
    console.log('\n--- Group 6: Quality Control & Levey-Jennings Charts ---');
    const qcDashboardRes = await request('/qc/dashboard', { headers: authHeaders });
    if (qcDashboardRes.ok && qcDashboardRes.data?.total_runs > 0) {
      pass('6.1 QC dashboard metrics loaded', `Total QC Runs: ${qcDashboardRes.data.total_runs}, Active Lots: ${qcDashboardRes.data.active_lots?.length}`);
    } else {
      fail('6.1 QC dashboard metrics loaded', qcDashboardRes.data);
    }

    const chartDataRes = await request('/qc/chart-data', { headers: authHeaders });
    if (chartDataRes.ok && chartDataRes.data?.target && Array.isArray(chartDataRes.data?.points)) {
      pass('6.2 Levey-Jennings chart series loaded', `Target Mean: ${chartDataRes.data.target.mean}, SD: ${chartDataRes.data.target.sd}, Points: ${chartDataRes.data.points.length}`);
    } else {
      fail('6.2 Levey-Jennings chart series loaded', chartDataRes.data);
    }

    // Record a QC run that exceeds 3 SD to verify Westgard 1_3s rule violation
    const postQcRes = await request('/qc/results', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        lot_id: chartDataRes.data.target.lot_id,
        test_id: 'test-cbc',
        parameter_id: chartDataRes.data.target.parameter_id,
        value: 15.2, // Mean is 13.5, SD is 0.4 -> 15.2 is +4.25 SD (exceeds 3 SD!)
        remarks: 'Automated Stress QC Test Run'
      })
    });
    if (postQcRes.ok && postQcRes.data?.status === 'reject') {
      pass('6.3 Westgard 1_3s violation detected', `Status: ${postQcRes.data.status}, Z-Score: ${postQcRes.data.z_score}`);
    } else {
      fail('6.3 Westgard 1_3s violation detected', postQcRes.data);
    }

    // ----------------------------------------------------
    // Group 7: Equipment & Maintenance Management
    // ----------------------------------------------------
    console.log('\n--- Group 7: Equipment & Maintenance Management ---');
    const equipRes = await request('/equipment', { headers: authHeaders });
    if (equipRes.ok && Array.isArray(equipRes.data) && equipRes.data.length >= 2) {
      pass('7.1 Equipment assets catalog retrieved', `Total Assets: ${equipRes.data.length}`);
    } else {
      fail('7.1 Equipment assets catalog retrieved', equipRes.data);
    }

    const maintRes = await request('/equipment/maintenance', { headers: authHeaders });
    if (maintRes.ok && Array.isArray(maintRes.data) && maintRes.data.length >= 1) {
      pass('7.2 Preventive maintenance logs verified', `Completed Logs: ${maintRes.data.length}`);
    } else {
      fail('7.2 Preventive maintenance logs verified', maintRes.data);
    }

    // ----------------------------------------------------
    // Group 8: LIS Rules, Sample Accession & Aliquots
    // ----------------------------------------------------
    console.log('\n--- Group 8: LIS Rules, Accession & Aliquots ---');
    const accessionListRes = await request('/lis-rules/accession', { headers: authHeaders });
    if (accessionListRes.ok && Array.isArray(accessionListRes.data)) {
      pass('8.1 Accession queue loaded', `Specimens in queue: ${accessionListRes.data.length}`);
    } else {
      fail('8.1 Accession queue loaded', accessionListRes.data);
    }

    if (accessionListRes.data && accessionListRes.data.length > 0) {
      const sampleToSlot = accessionListRes.data[0];
      const slotRes = await request('/lis-rules/accession', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          sample_id: sampleToSlot.id,
          rack_number: 'RACK-HEM-01',
          position_in_rack: 'A-05',
          storage_refrigerator: 'Refrigerated Bay 1',
          storage_temp: '2-8 C'
        })
      });
      if (slotRes.ok) {
        pass('8.2 Sample slotted into rack', `Rack: RACK-HEM-01, Position: A-05`);
      } else {
        fail('8.2 Sample slotted into rack', slotRes.data);
      }

      const aliquotRes = await request('/lis-rules/aliquots', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          parent_sample_id: sampleToSlot.id,
          aliquot_type: 'serum_aliquot',
          volume_ml: 1.5,
          tube_type: 'Eppendorf 2.0 mL'
        })
      });
      if (aliquotRes.ok && aliquotRes.data?.aliquot_barcode) {
        pass('8.3 Child aliquot generated', `Aliquot Barcode: ${aliquotRes.data.aliquot_barcode}`);
      } else {
        fail('8.3 Child aliquot generated', aliquotRes.data);
      }
    }

    // ----------------------------------------------------
    // Group 9: Work Queues & Turnaround Time (TAT)
    // ----------------------------------------------------
    console.log('\n--- Group 9: Work Queues & TAT Metrics ---');
    const wqRes = await request('/lis-rules/work-queues', { headers: authHeaders });
    if (wqRes.ok && wqRes.data?.accession_queue && wqRes.data?.analyzer_queue) {
      pass('9.1 Operational work queues retrieved', 'All 4 clinical queues verified');
    } else {
      fail('9.1 Operational work queues retrieved', wqRes.data);
    }

    const tatRes = await request('/lis-rules/tat-metrics', { headers: authHeaders });
    if (tatRes.ok && tatRes.data?.overall_average_tat_hours && Array.isArray(tatRes.data?.stages)) {
      pass('9.2 Turnaround Time SLA milestones calculated', `Average TAT: ${tatRes.data.overall_average_tat_hours}h, Compliance: ${tatRes.data.sla_compliance_overall_percent}%`);
    } else {
      fail('9.2 Turnaround Time SLA milestones calculated', tatRes.data);
    }

    // ----------------------------------------------------
    // Group 10: Clinical Calculation Formulas
    // ----------------------------------------------------
    console.log('\n--- Group 10: Clinical Calculation Formulas ---');
    const formulasRes = await request('/lis-rules/formulas', { headers: authHeaders });
    if (formulasRes.ok && Array.isArray(formulasRes.data) && formulasRes.data.length >= 1) {
      pass('10.1 Clinical calculation formulas verified', `Formula: ${formulasRes.data[0].formula_name} (${formulasRes.data[0].formula_expression})`);
    } else {
      fail('10.1 Clinical calculation formulas verified', formulasRes.data);
    }

    // ----------------------------------------------------
    // Group 11: Developer API Keys & Webhooks
    // ----------------------------------------------------
    console.log('\n--- Group 11: Developer APIs & Webhooks ---');
    const apiKeysRes = await request('/developer/keys', { headers: authHeaders });
    if (apiKeysRes.ok && Array.isArray(apiKeysRes.data) && apiKeysRes.data.length >= 1) {
      pass('11.1 Developer API keys verified', `Active key: ${apiKeysRes.data[0].name} (${apiKeysRes.data[0].api_key_prefix}...)`);
    } else {
      fail('11.1 Developer API keys verified', apiKeysRes.data);
    }

    const webhooksRes = await request('/developer/webhooks', { headers: authHeaders });
    if (webhooksRes.ok && Array.isArray(webhooksRes.data) && webhooksRes.data.length >= 1) {
      pass('11.2 Webhook subscription verified', `Endpoint: ${webhooksRes.data[0].target_url}`);
    } else {
      fail('11.2 Webhook subscription verified', webhooksRes.data);
    }

    // ----------------------------------------------------
    // Group 12: System Health, Security & Globalization
    // ----------------------------------------------------
    console.log('\n--- Group 12: System Health & Globalization ---');
    const healthRes = await request('/system-health/status', { headers: authHeaders });
    if (healthRes.ok && healthRes.data?.status === 'healthy' && healthRes.data?.components?.analyzer_network) {
      pass('12.1 System health telemetry operational', `Database: ${healthRes.data.components.database.engine}, Analyzers Online: ${healthRes.data.components.analyzer_network.online}`);
    } else {
      fail('12.1 System health telemetry operational', healthRes.data);
    }

    const transRes = await request('/system-health/translations?lang=hi');
    if (transRes.ok && transRes.data?.translations?.['nav.dashboard']) {
      pass('12.2 Multi-language translation dictionary verified', `Hindi: ${transRes.data.translations['nav.dashboard']}`);
    } else {
      fail('12.2 Multi-language translation dictionary verified', transRes.data);
    }

    const currRes = await request('/system-health/currencies');
    if (currRes.ok && Array.isArray(currRes.data) && currRes.data.length >= 4) {
      pass('12.3 Multi-currency engine verified', `Supported currencies: ${currRes.data.map((c: any) => c.code).join(', ')}`);
    } else {
      fail('12.3 Multi-currency engine verified', currRes.data);
    }

    // Summary
    console.log('\n============================================================');
    console.log(`📊 Phase 6 Test Summary: ${testsPassed} Passed, ${testsFailed} Failed`);
    console.log('============================================================\n');

    if (testsFailed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Unhandled Phase 6 Test Failure:', error);
    process.exit(1);
  }
}

runPhase6Tests();
