/**
 * MediFlow LIS — Data Migration & Legacy System Import Test Suite
 * Validates: CSV parsing, pre-flight validation, duplicate/format checks, batch database commit
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

async function runDataMigrationTests() {
  console.log('\n============================================================');
  console.log('📦 MediFlow LIS — Data Migration & Import Tooling Test Suite');
  console.log('============================================================\n');

  try {
    // 1. Authenticate Lab Admin
    console.log('--- Group 1: Authentication & Template Streaming ---');
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'labadmin@apexlabs.com', password: 'admin123' })
    });
    if (!loginRes.ok) throw new Error('Lab Admin authentication failed');
    const token = loginRes.data.token;
    pass('1.1 Authenticated Lab Admin session established');

    // 2. Download CSV Templates for Entities
    const entities = ['patients', 'doctors', 'tests', 'inventory'];
    for (const entity of entities) {
      const tplRes = await request(`/import/templates/${entity}`);
      if (tplRes.ok && typeof tplRes.data === 'string' && tplRes.data.length > 10) {
        pass(`1.2 Standard CSV template downloaded for '${entity}'`, `${tplRes.data.split('\n')[0]}`);
      } else {
        fail(`1.2 CSV template downloaded for '${entity}'`, tplRes.data);
      }
    }

    // 3. Pre-flight Validation with Invalid Records
    console.log('\n--- Group 2: Pre-Flight Validation Engine & Error Detection ---');
    const invalidCsv = `name,gender,dob,age,mobile,email,address,city
"",Male,"1990-01-01",36,"9899912345","test@test.com","Street 1","Mumbai"
"John Doe",,"1985-05-12",41,"notanumber","john@test.com","Street 2","Pune"
"Jane Smith",Female,,,,"jane@test.com","Street 3","Delhi"`;

    const invalidValRes = await request('/import/validate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        entity: 'patients',
        data_csv: invalidCsv
      })
    });

    if (invalidValRes.ok && invalidValRes.data.can_import === false && invalidValRes.data.errors.length >= 3) {
      pass('2.1 Pre-flight validator caught missing names, invalid genders, and invalid mobiles', `Errors: ${invalidValRes.data.errors.length}`);
    } else {
      fail('2.1 Pre-flight validator error catch', invalidValRes.data);
    }

    // 4. Pre-flight Validation with Clean Records
    console.log('\n--- Group 3: Valid CSV Parsing & Batch Execution ---');
    const validCsv = `name,gender,dob,age,mobile,email,address,city
"Vikramaditya Rao","Male","1980-08-15",46,"9820011223","vikram@example.com","Marine Lines","Mumbai"
"Ananya Sharma","Female","1995-11-23",31,"9820044556","ananya@example.com","Juhu Tara Road","Mumbai"`;

    const validValRes = await request('/import/validate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        entity: 'patients',
        data_csv: validCsv
      })
    });

    if (validValRes.ok && validValRes.data.can_import === true && validValRes.data.valid_rows === 2) {
      pass('3.1 Pre-flight validator approved clean dataset with 2 valid records');
    } else {
      fail('3.1 Pre-flight validation on clean dataset', validValRes.data);
    }

    // 5. Commit Batch Import to Database
    const recordsToImport = [
      {
        name: `Migrated Patient Alpha ${Date.now().toString().slice(-4)}`,
        gender: 'Male',
        age: 35,
        mobile: '9811223344',
        email: 'migrated.alpha@example.com',
        city: 'Mumbai',
        address: 'Bandra West'
      },
      {
        name: `Migrated Patient Beta ${Date.now().toString().slice(-4)}`,
        gender: 'Female',
        age: 28,
        mobile: '9811223355',
        email: 'migrated.beta@example.com',
        city: 'Mumbai',
        address: 'Colaba'
      }
    ];

    const commitRes = await request('/import/execute', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        entity: 'patients',
        records: recordsToImport
      })
    });

    if (commitRes.ok && commitRes.data.imported_count === 2) {
      pass('3.2 Batch commit inserted 2 verified patient records into database', `Imported: ${commitRes.data.imported_count}`);
    } else {
      fail('3.2 Batch commit failed', commitRes.data);
    }

    // 6. Test Migration Validation
    const testRecords = [
      {
        code: `TEST_MIG_${Date.now().toString().slice(-4)}`,
        name: 'Automated Migration Lipid Sub-fraction',
        department: 'Biochemistry',
        sample_type: 'Serum',
        base_price: 650.00
      }
    ];

    const testImportRes = await request('/import/execute', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        entity: 'tests',
        records: testRecords
      })
    });

    if (testImportRes.ok && testImportRes.data.imported_count === 1) {
      pass('3.3 Test catalog records migrated successfully', `Imported: ${testImportRes.data.imported_count}`);
    } else {
      fail('3.3 Test catalog migration failed', testImportRes.data);
    }

  } catch (err: any) {
    console.error('Fatal data migration test error:', err);
    testsFailed++;
  }

  console.log('\n============================================================');
  console.log(`📊 Data Migration Test Suite: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('============================================================\n');

  if (testsFailed > 0) process.exit(1);
}

runDataMigrationTests();
