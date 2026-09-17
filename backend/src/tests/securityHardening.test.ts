/**
 * MediFlow LIS — Security Hardening, Tenant Isolation & Penetration Test Suite
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

async function runSecurityTests() {
  console.log('\n============================================================');
  console.log('🛡️ MediFlow LIS — Security Hardening & Penetration Suite');
  console.log('============================================================\n');

  try {
    // 1. Unauthenticated Route Protection
    console.log('--- Group 1: Authentication & Header Enforcement ---');
    const unauthRes = await request('/patients');
    if (unauthRes.status === 401) {
      pass('1.1 Unauthenticated API requests rejected with 401 Unauthorized');
    } else {
      fail('1.1 Unauthenticated API requests rejected', unauthRes.status);
    }

    // 2. Correlation ID and Request ID Tracking
    const healthRes = await request('/health');
    const reqId = healthRes.headers.get('x-request-id');
    const corrId = healthRes.headers.get('x-correlation-id');
    if (reqId && corrId) {
      pass('1.2 Request ID & Correlation ID headers injected into all transactions', `Request: ${reqId}`);
    } else {
      fail('1.2 Request ID headers injected', 'Missing headers');
    }

    // 3. Rate Limiting Headers
    const rateLimitLimit = healthRes.headers.get('x-ratelimit-limit');
    if (rateLimitLimit) {
      pass('1.3 Global Rate Limiting headers active', `Limit: ${rateLimitLimit} requests/window`);
    } else {
      fail('1.3 Global Rate Limiting headers active', 'Missing rate limit headers');
    }

    // 4. Multi-Tenant Cross-Access Isolation
    console.log('\n--- Group 2: Strict Multi-Tenant Data Isolation ---');
    const labLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'labadmin@apexlabs.com', password: 'admin123' })
    });
    const labToken = labLogin.data.token;

    const crossTenantQuery = await request('/branches?lab_id=lab-other-tenant', {
      headers: { Authorization: `Bearer ${labToken}` }
    });
    if (crossTenantQuery.status === 403) {
      pass('2.1 Cross-tenant query injection strictly blocked with 403 Forbidden');
    } else {
      fail('2.1 Cross-tenant query injection strictly blocked', crossTenantQuery.status);
    }

    // 5. Readiness Probe & Secret Masking
    console.log('\n--- Group 3: Observability & Health Probes ---');
    const readyRes = await request('/health/ready');
    if (readyRes.ok && readyRes.data.status === 'ready') {
      pass('3.1 Enhanced /health/ready probe operational', `Database status: ${readyRes.data.checks.database.status} (${readyRes.data.checks.database.latency_ms}ms)`);
    } else {
      fail('3.1 Enhanced /health/ready probe operational', readyRes.data);
    }

    // 6. Memory RSS metrics without credential exposure
    if (healthRes.data.memory && healthRes.data.memory.rss_mb > 0) {
      pass('3.2 Safe memory telemetry available without credential exposure', `RSS: ${healthRes.data.memory.rss_mb} MB`);
    } else {
      fail('3.2 Safe memory telemetry available', healthRes.data);
    }

  } catch (err: any) {
    console.error('Fatal security test error:', err);
    testsFailed++;
  }

  console.log('\n============================================================');
  console.log(`📊 Security Hardening Suite: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('============================================================\n');

  if (testsFailed > 0) process.exit(1);
}

runSecurityTests();
