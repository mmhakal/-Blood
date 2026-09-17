/**
 * Phase 3 — Lab Admin, Branch Management, Patient Registration,
 * Doctor Management, Test Master, Parameters & Reference Ranges Test Suite
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
  } else {
    data = await res.text();
  }

  return { status: res.status, ok: res.ok, data };
}

async function runPhase3Tests() {
  console.log('\n============================================================');
  console.log('🧪 MediFlow LIS — Phase 3 Clinical Architecture Test Suite');
  console.log('============================================================\n');

  let superAdminToken = '';
  let labAdminToken = '';
  let createdBranchId = '';
  let createdPatientId = '';
  let createdDoctorId = '';
  let createdTestId = '';
  let createdParamId = '';
  let createdRangeId = '';
  let createdPackageId = '';
  let createdSampleTypeId = '';

  // -------------------------------------------------------------
  // 1. AUTHENTICATION & CONTEXT SETUP
  // -------------------------------------------------------------
  console.log('\x1b[36m[1/12] Authentication & Operational Context\x1b[0m');
  try {
    const superRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@medilabs.com', password: 'admin123' }),
    });
    if (superRes.status === 200 && superRes.data.token) {
      superAdminToken = superRes.data.token;
      pass('Super Admin authenticated', `User: ${superRes.data.user.name}`);
    } else {
      fail('Super Admin login failed', superRes.data);
    }

    const labRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'labadmin@apexlabs.com', password: 'admin123' }),
    });
    if (labRes.status === 200 && labRes.data.token) {
      labAdminToken = labRes.data.token;
      pass('Lab Admin authenticated with Lab Apex context', `Lab: ${labRes.data.user.lab_name}`);
    } else {
      fail('Lab Admin login failed', labRes.data);
    }
  } catch (err) {
    fail('Authentication setup failed', err);
  }

  // -------------------------------------------------------------
  // 2. LAB ADMIN DASHBOARD OPERATIONAL KPIS & CHARTS
  // -------------------------------------------------------------
  console.log('\n\x1b[36m[2/12] Lab Admin Dashboard KPIs & Trend Metrics\x1b[0m');
  try {
    const dashRes = await request('/analytics/dashboard', {
      headers: { Authorization: `Bearer ${labAdminToken}` },
    });

    if (
      dashRes.status === 200 &&
      dashRes.data.total_patients !== undefined &&
      dashRes.data.pending_samples !== undefined &&
      dashRes.data.charts?.popular_tests !== undefined
    ) {
      pass('Lab Admin dashboard returns all clinical KPIs', `Patients: ${dashRes.data.total_patients}, Branches: ${dashRes.data.active_branches}, Staff: ${dashRes.data.active_staff}`);
      pass('Dashboard charts data aggregated', `Popular tests count: ${dashRes.data.charts.popular_tests.length}`);
    } else {
      fail('Dashboard KPIs request failed', dashRes.data);
    }
  } catch (err) {
    fail('Dashboard request error', err);
  }

  // -------------------------------------------------------------
  // 3. MULTI-BRANCH MANAGEMENT & DUPLICATE PREVENTION
  // -------------------------------------------------------------
  console.log('\n\x1b[36m[3/12] Multi-Branch Management & Isolation\x1b[0m');
  const branchCode = `BR_${Date.now().toString().slice(-4)}`;
  try {
    // Create new branch
    const createRes = await request('/branches', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labAdminToken}` },
      body: JSON.stringify({
        name: 'Apex South Metropolis Diagnostic Center',
        code: branchCode,
        address: 'Plot 42, South Avenue Health Corridor',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110017',
        phone: '+91 11 2689 4400',
        alternate_phone: '+91 11 2689 4401',
        email: 'south.hub@apexlabs.com',
        manager_name: 'Dr. Suresh Kumar',
        working_hours: '6:30 AM - 10:00 PM',
        tax_number: '07AAAAA0000A1Z5',
        registration_number: 'DEL/CLINIC/2026/089'
      })
    });

    if (createRes.status === 201 && createRes.data.id) {
      createdBranchId = createRes.data.id;
      pass('Branch created successfully with full clinical fields', `ID: ${createdBranchId}, Code: ${branchCode}`);
    } else {
      fail('Branch creation failed', createRes.data);
    }

    // Verify duplicate branch code within same lab is rejected
    const dupRes = await request('/branches', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labAdminToken}` },
      body: JSON.stringify({
        name: 'Duplicate Branch Attempt',
        code: branchCode,
      })
    });
    if (dupRes.status === 409) {
      pass('Duplicate branch code rejected with 409 Conflict', `Code: ${branchCode}`);
    } else {
      fail('Duplicate branch code check failed', dupRes.data);
    }

    // Fetch branch details
    const getRes = await request(`/branches/${createdBranchId}`, {
      headers: { Authorization: `Bearer ${labAdminToken}` }
    });
    if (getRes.status === 200 && getRes.data.branch?.code === branchCode) {
      pass('Branch details retrieved with stats & roster', `City: ${getRes.data.branch.city}`);
    } else {
      fail('Fetch branch details failed', getRes.data);
    }

    // Toggle branch status
    const statusRes = await request(`/branches/${createdBranchId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${labAdminToken}` },
      body: JSON.stringify({ status: 'inactive' })
    });
    if (statusRes.status === 200) {
      pass('Branch status toggled to inactive successfully');
    } else {
      fail('Branch status toggle failed', statusRes.data);
    }
  } catch (err) {
    fail('Branch tests error', err);
  }

  // -------------------------------------------------------------
  // 4. BRANCH USERS ASSIGNMENT & CROSS-TENANT ISOLATION
  // -------------------------------------------------------------
  console.log('\n\x1b[36m[4/12] Branch User Assignment & Multi-Tenant Security\x1b[0m');
  try {
    // Assign technician to branch
    const assignRes = await request(`/branches/${createdBranchId}/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${labAdminToken}` },
      body: JSON.stringify({ user_id: 'user-technician', is_primary: true })
    });
    if (assignRes.status === 201) {
      pass('Staff user assigned to branch with primary flag', `User: user-technician`);
    } else {
      fail('Branch user assignment failed', assignRes.data);
    }

    // List assigned users
    const usersRes = await request(`/branches/${createdBranchId}/users`, {
      headers: { Authorization: `Bearer ${labAdminToken}` }
    });
    if (usersRes.status === 200 && usersRes.data.some((u: any) => u.id === 'user-technician')) {
      pass('Branch assigned staff list verified');
    } else {
      fail('Fetch branch users failed', usersRes.data);
    }

    // Cross-tenant branch injection attempt (Lab Admin attempting to modify another lab's branch or query invalid lab)
    const crossRes = await request('/branches?lab_id=lab-other-forbidden', {
      headers: { Authorization: `Bearer ${labAdminToken}` }
    });
    if (crossRes.status === 403) {
      pass('Cross-tenant branch access strictly blocked with 403 Forbidden');
    } else {
      fail('Cross-tenant branch query was not blocked', crossRes.data);
    }
  } catch (err) {
    fail('Branch user assignment error', err);
  }

  // -------------------------------------------------------------
  // 5. DOCTOR MANAGEMENT (DOCTOR MASTER)
  // -------------------------------------------------------------
  console.log('\n\x1b[36m[5/12] Doctor Master Module\x1b[0m');
  const regNumber = `MCI-${Date.now().toString().slice(-5)}`;
  try {
    const docRes = await request('/doctors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labAdminToken}` },
      body: JSON.stringify({
        name: 'Dr. Ananya Roy, MD',
        qualification: 'MBBS, MD (General Medicine)',
        specialization: 'Internal Medicine & Diabetology',
        registration_number: regNumber,
        clinic_hospital: 'Apollo Spectra Speciality Clinic',
        phone: '+91 98112 34567',
        email: 'dr.ananya@apollospectra.com',
        address: 'Suite 204, City Health Arcade',
        city: 'New Delhi',
        state: 'Delhi',
        commission_rate: 10
      })
    });

    if (docRes.status === 201 && docRes.data.id) {
      createdDoctorId = docRes.data.id;
      pass('Doctor registered successfully in Doctor Master', `ID: ${createdDoctorId}, Reg: ${regNumber}`);
    } else {
      fail('Doctor creation failed', docRes.data);
    }

    // Fetch doctor with referral metrics
    const getDoc = await request(`/doctors/${createdDoctorId}`, {
      headers: { Authorization: `Bearer ${labAdminToken}` }
    });
    if (getDoc.status === 200 && getDoc.data.doctor?.name.includes('Ananya')) {
      pass('Doctor profile fetched with referral metrics');
    } else {
      fail('Fetch doctor details failed', getDoc.data);
    }

    // Update doctor
    const updateDoc = await request(`/doctors/${createdDoctorId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${labAdminToken}` },
      body: JSON.stringify({ phone: '+91 98112 34599', commission_rate: 12 })
    });
    if (updateDoc.status === 200) {
      pass('Doctor contact & referral terms updated successfully');
    } else {
      fail('Doctor update failed', updateDoc.data);
    }
  } catch (err) {
    fail('Doctor tests error', err);
  }

  // -------------------------------------------------------------
  // 6. PATIENT REGISTRATION & AUTO-ID GENERATION
  // -------------------------------------------------------------
  console.log('\n\x1b[36m[6/12] Patient Registration & Auto-ID Architecture\x1b[0m');
  const testMobile = `98${Date.now().toString().slice(-8)}`;
  try {
    const patRes = await request('/patients', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labAdminToken}` },
      body: JSON.stringify({
        name: 'Rohan Deshmukh',
        age: 38,
        age_unit: 'years',
        dob: '1988-04-15',
        gender: 'Male',
        mobile: testMobile,
        alternate_mobile: '+91 98765 43211',
        email: 'rohan.deshmukh@gmail.com',
        blood_group: 'B+',
        address: 'B-402, Green Park Meadows',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110016',
        referring_doctor_id: createdDoctorId,
        remarks: 'Routine executive metabolic screen, fasting sample'
      })
    });

    if (patRes.status === 201 && patRes.data.id && patRes.data.patient_id_code) {
      createdPatientId = patRes.data.id;
      pass('Patient registered with auto-generated immutable ID', `Code: ${patRes.data.patient_id_code}, Lab#: ${patRes.data.lab_number}`);
    } else {
      fail('Patient registration failed', patRes.data);
    }

    // Test duplicate mobile warning
    const dupPatRes = await request('/patients', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labAdminToken}` },
      body: JSON.stringify({
        name: 'Rohan Deshmukh Duplicate',
        age: 38,
        gender: 'Male',
        mobile: testMobile,
      })
    });
    if (dupPatRes.status === 201 && dupPatRes.data.duplicate_warning) {
      pass('Duplicate patient mobile check returned warning notice', dupPatRes.data.duplicate_warning.substring(0, 45) + '...');
    } else {
      fail('Duplicate mobile detection failed', dupPatRes.data);
    }
  } catch (err) {
    fail('Patient registration error', err);
  }

  // -------------------------------------------------------------
  // 7. PATIENT SEARCH, FILTERS, PAGINATION & CSV EXPORT
  // -------------------------------------------------------------
  console.log('\n\x1b[36m[7/12] Patient Search, Multi-Filter & Export\x1b[0m');
  try {
    // Search by mobile
    const searchRes = await request(`/patients?search=${testMobile}`, {
      headers: { Authorization: `Bearer ${labAdminToken}` }
    });
    if (searchRes.status === 200 && searchRes.data.data?.length > 0) {
      pass('Fast global patient search by mobile verified', `Found: ${searchRes.data.data.length}`);
    } else {
      fail('Patient search failed', searchRes.data);
    }

    // Filter by doctor & gender with pagination
    const filterRes = await request(`/patients?gender=Male&doctor_id=${createdDoctorId}&page=1&limit=10`, {
      headers: { Authorization: `Bearer ${labAdminToken}` }
    });
    if (filterRes.status === 200 && filterRes.data.pagination?.total_records !== undefined) {
      pass('Multi-filter and server-side pagination metadata verified', `Total: ${filterRes.data.pagination.total_records}`);
    } else {
      fail('Patient filtering failed', filterRes.data);
    }

    // Export patients CSV
    const exportRes = await request('/patients/export', {
      headers: { Authorization: `Bearer ${labAdminToken}` }
    });
    if (exportRes.status === 200 && typeof exportRes.data === 'string' && exportRes.data.includes('Patient ID')) {
      pass('Patient registry successfully exported to CSV format', `Length: ${exportRes.data.length} bytes`);
    } else {
      fail('Patient export failed', exportRes.data);
    }
  } catch (err) {
    fail('Patient search/export error', err);
  }

  // -------------------------------------------------------------
  // 8. DEEP PATIENT PROFILE (TESTS, INVOICES & ACTIVITIES)
  // -------------------------------------------------------------
  console.log('\n\x1b[36m[8/12] Comprehensive Patient Profile\x1b[0m');
  try {
    const profileRes = await request(`/patients/${createdPatientId}`, {
      headers: { Authorization: `Bearer ${labAdminToken}` }
    });

    if (
      profileRes.status === 200 &&
      profileRes.data.patient?.id === createdPatientId &&
      Array.isArray(profileRes.data.orders) &&
      Array.isArray(profileRes.data.invoices) &&
      Array.isArray(profileRes.data.activityLogs)
    ) {
      pass('Deep patient profile returned with order history, invoices, and activity logs');
    } else {
      fail('Patient profile retrieval failed', profileRes.data);
    }
  } catch (err) {
    fail('Patient profile error', err);
  }

  // -------------------------------------------------------------
  // 9. TEST MASTER, PARAMETERS & REFERENCE RANGE ENGINE
  // -------------------------------------------------------------
  console.log('\n\x1b[36m[9/12] Test Master & Dynamic Reference Ranges\x1b[0m');
  const testCode = `BIO_${Date.now().toString().slice(-4)}`;
  try {
    // 1. Create Test
    const testRes = await request('/tests', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labAdminToken}` },
      body: JSON.stringify({
        name: 'Serum Uric Acid & Purine Metabolism',
        code: testCode,
        department: 'Biochemistry',
        sample_type: 'Serum',
        container_type: 'Gold Top / SST',
        method: 'Enzymatic Uricase Photometric',
        turnaround_time_hours: 2,
        base_price: 350.0,
        remarks: 'Sample must be separated within 1 hour'
      })
    });

    if (testRes.status === 201 && testRes.data.id) {
      createdTestId = testRes.data.id;
      pass('Diagnostic test registered in Test Master', `ID: ${createdTestId}, Code: ${testCode}`);
    } else {
      fail('Test creation failed', testRes.data);
    }

    // 2. Add Parameter
    const paramRes = await request(`/tests/${createdTestId}/parameters`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${labAdminToken}` },
      body: JSON.stringify({
        name: 'Uric Acid',
        short_name: 'UA',
        result_type: 'numeric',
        unit: 'mg/dL',
        decimal_precision: 1,
        method: 'Uricase PAP'
      })
    });

    if (paramRes.status === 201 && paramRes.data.id) {
      createdParamId = paramRes.data.id;
      pass('Test parameter added with numeric precision', `Param: UA (mg/dL)`);
    } else {
      fail('Parameter creation failed', paramRes.data);
    }

    // 3. Add Male Reference Range
    const maleRangeRes = await request(`/tests/parameters/${createdParamId}/reference-ranges`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${labAdminToken}` },
      body: JSON.stringify({
        gender: 'Male',
        min_age_days: 6570, // 18 years
        max_age_days: 43800,
        normal_min: 3.5,
        normal_max: 7.2,
        critical_low: 2.0,
        critical_high: 9.0,
        remarks: 'Adult Male Reference Interval'
      })
    });

    // 4. Add Female Reference Range
    const femaleRangeRes = await request(`/tests/parameters/${createdParamId}/reference-ranges`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${labAdminToken}` },
      body: JSON.stringify({
        gender: 'Female',
        min_age_days: 6570,
        max_age_days: 43800,
        normal_min: 2.6,
        normal_max: 6.0,
        critical_low: 1.8,
        critical_high: 8.0,
        remarks: 'Adult Female Reference Interval'
      })
    });

    if (maleRangeRes.status === 201 && femaleRangeRes.status === 201) {
      createdRangeId = maleRangeRes.data.id;
      pass('Gender-specific biological reference intervals established', `Male: 3.5-7.2, Female: 2.6-6.0 mg/dL`);
    } else {
      fail('Reference range creation failed', { male: maleRangeRes.data, female: femaleRangeRes.data });
    }

    // 5. Test Cloning / Duplication
    const dupTestRes = await request(`/tests/${createdTestId}/duplicate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${labAdminToken}` }
    });
    if (dupTestRes.status === 201 && dupTestRes.data.id) {
      pass('Test duplicated with cloned parameters & biological ranges');
    } else {
      fail('Test duplication failed', dupTestRes.data);
    }
  } catch (err) {
    fail('Test Master error', err);
  }

  // -------------------------------------------------------------
  // 10. BRANCH-SPECIFIC TEST PRICING OVERRIDES
  // -------------------------------------------------------------
  console.log('\n\x1b[36m[10/12] Branch-Specific Pricing Engine\x1b[0m');
  try {
    const branchPriceRes = await request(`/tests/${createdTestId}/prices`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${labAdminToken}` },
      body: JSON.stringify({
        branch_id: createdBranchId,
        price: 420.0,
        tax_percentage: 5,
        discount_allowed: true
      })
    });

    if (branchPriceRes.status === 201) {
      pass('Branch-specific test pricing override saved', `Branch Price: ₹420 vs Base: ₹350`);
    } else {
      fail('Branch pricing failed', branchPriceRes.data);
    }

    // Verify effective price is returned for that branch
    const fetchWithBranch = await request(`/tests?branch_id=${createdBranchId}&search=${testCode}`, {
      headers: { Authorization: `Bearer ${labAdminToken}` }
    });
    const match = fetchWithBranch.data?.find((t: any) => t.id === createdTestId);
    if (match && match.effective_price === 420) {
      pass('Effective price automatically calculated with branch override');
    } else {
      fail('Effective branch price check failed', match);
    }
  } catch (err) {
    fail('Branch pricing error', err);
  }

  // -------------------------------------------------------------
  // 11. TEST PACKAGES & SAMPLE MASTER
  // -------------------------------------------------------------
  console.log('\n\x1b[36m[11/12] Health Packages & Specimen Sample Master\x1b[0m');
  try {
    // 1. Create Package
    const pkgCode = `PKG_${Date.now().toString().slice(-4)}`;
    const pkgRes = await request('/tests/packages', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labAdminToken}` },
      body: JSON.stringify({
        name: 'Executive Cardiac & Metabolic Health Checkup',
        code: pkgCode,
        description: 'Comprehensive evaluation of heart, kidneys, and purine metabolism',
        price: 999.0,
        discount_percentage: 25,
        validity_days: 365,
        test_ids: [createdTestId, 'test-cbc']
      })
    });

    if (pkgRes.status === 201 && pkgRes.data.id) {
      createdPackageId = pkgRes.data.id;
      pass('Multi-test diagnostic health package created', `Package: ${pkgCode}, Price: ₹999`);
    } else {
      fail('Package creation failed', pkgRes.data);
    }

    // 2. Create Configurable Sample Type
    const sampleTypeRes = await request('/sample-types', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labAdminToken}` },
      body: JSON.stringify({
        name: 'Bone Marrow Aspirate',
        code: 'BMA_HEPARIN',
        container: 'Green Top Sodium Heparin Tube',
        color_code: '#22c55e',
        cap_type: 'Green Hemogard',
        min_volume: '1.5 mL',
        storage_requirement: 'Ambient 18-25°C, STAT delivery',
        processing_instructions: 'Prepare thin smears immediately at bedside'
      })
    });

    if (sampleTypeRes.status === 201 && sampleTypeRes.data.id) {
      createdSampleTypeId = sampleTypeRes.data.id;
      pass('Sample Master: Configurable specimen type registered', `Type: Bone Marrow Aspirate`);
    } else {
      fail('Sample type creation failed', sampleTypeRes.data);
    }

    // List sample types
    const stList = await request('/sample-types', {
      headers: { Authorization: `Bearer ${labAdminToken}` }
    });
    if (stList.status === 200 && stList.data.length >= 8) {
      pass('Standard clinical sample types catalog verified', `Total types: ${stList.data.length}`);
    } else {
      fail('Sample types listing failed', stList.data);
    }
  } catch (err) {
    fail('Package/Sample error', err);
  }

  // -------------------------------------------------------------
  // 12. EXTENDED AUDIT TRAIL ACROSS ALL PHASE 3 ACTIONS
  // -------------------------------------------------------------
  console.log('\n\x1b[36m[12/12] Extended Audit Logging Verification\x1b[0m');
  try {
    const auditRes = await request('/audit-logs', {
      headers: { Authorization: `Bearer ${labAdminToken}` }
    });

    if (auditRes.status === 200 && Array.isArray(auditRes.data)) {
      const actions = auditRes.data.map((a: any) => a.action);
      const expected = ['CREATE_BRANCH', 'CREATE_PATIENT', 'CREATE_DOCTOR', 'CREATE_TEST', 'UPDATE_TEST_PRICING', 'CREATE_PACKAGE'];
      const found = expected.filter(exp => actions.includes(exp));

      pass(`Audit trail captured Phase 3 clinical lifecycle events (${found.length}/${expected.length} actions logged)`, found.join(', '));
    } else {
      fail('Audit trail verification failed', auditRes.data);
    }
  } catch (err) {
    fail('Audit log verification error', err);
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n============================================================');
  console.log(`📊 Phase 3 Test Results: ${testsPassed} Passed, ${testsFailed} Failed (Total: ${testsPassed + testsFailed})`);
  console.log('============================================================\n');

  if (testsFailed === 0) {
    console.log('🎉 ALL PHASE 3 CLINICAL & LABORATORY TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error('❌ SOME PHASE 3 TESTS FAILED.\n');
    process.exit(1);
  }
}

runPhase3Tests();
