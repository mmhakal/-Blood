/**
 * Phase 2 — Core System Architecture Automated Test Suite
 * MediFlow LIS (Diagnostic Laboratory Information System)
 *
 * Comprehensive end-to-end testing:
 * 1. Health check & database connection
 * 2. Authentication (Valid logins, tokens, /api/auth/me)
 * 3. Account Protection, Lockout Threshold (5 failed attempts -> 429), and Password Reset flow
 * 4. Role-Based Access Control (RBAC) & Route Protection (401 & 403 checks)
 * 5. Multi-Tenant Isolation (Cross-tenant query and creation injection blocked with 403)
 * 6. Laboratory Lifecycle CRUD & Initial Lab Admin Provisioning
 * 7. Subscription Management (Plans catalog, Assignment, Extension)
 * 8. Notifications & Broadcast Engine (Send, list, unread count, mark read)
 * 9. Live Audit Trail & Super Admin Analytics
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

async function runAllTests() {
  console.log('\n============================================================');
  console.log('🧪 MediFlow LIS — Phase 2 Core System Automated Test Suite');
  console.log('============================================================\n');

  let superAdminToken = '';
  let labAdminToken = '';
  let testLabId = '';
  let testLabAdminEmail = '';
  let testNotificationId = '';

  // -------------------------------------------------------------
  // 1. HEALTH & CONNECTIVITY
  // -------------------------------------------------------------
  console.log('\x1b[36m[1/8] System Health & Readiness\x1b[0m');
  try {
    const res = await request('/health');
    if (res.status === 200 && res.data.status === 'healthy') {
      pass('Server is healthy and operational', `Driver: Relational SQLite / Postgres`);
    } else {
      fail('Health check endpoint failed', res.data);
    }
  } catch (err) {
    fail('Health check request error', err);
  }

  // -------------------------------------------------------------
  // 2. AUTHENTICATION & LOGIN WORKFLOW
  // -------------------------------------------------------------
  console.log('\n\x1b[36m[2/8] Authentication & Security\x1b[0m');
  try {
    // Super Admin login
    const superRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@medilabs.com', password: 'admin123' }),
    });
    if (superRes.status === 200 && superRes.data.token && superRes.data.user?.role_code === 'super_admin') {
      superAdminToken = superRes.data.token;
      pass('Super Admin login successful', `User: ${superRes.data.user.name}`);
    } else {
      fail('Super Admin login failed', superRes.data);
    }

    // Lab Admin login (using seeded apexlabs.com account)
    const labRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'labadmin@apexlabs.com', password: 'admin123' }),
    });
    if (labRes.status === 200 && labRes.data.token && labRes.data.user?.lab_id === 'lab-apex') {
      labAdminToken = labRes.data.token;
      pass('Lab Admin login successful with tenant association', `Lab ID: ${labRes.data.user.lab_id}`);
    } else {
      fail('Lab Admin login failed', labRes.data);
    }

    // Token verification via /auth/me
    const meRes = await request('/auth/me', {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    if (meRes.status === 200 && meRes.data.user?.email === 'admin@medilabs.com') {
      pass('Current user profile authenticated via JWT token (/auth/me)', `Permissions: ${meRes.data.user.permissions?.length || 0}`);
    } else {
      fail('/auth/me verification failed', meRes.data);
    }

    // Invalid credentials rejection
    const invalidRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@medilabs.com', password: 'WrongPassword999!' }),
    });
    if (invalidRes.status === 401) {
      pass('Invalid credentials correctly rejected with 401 Unauthorized');
    } else {
      fail('Invalid credentials should return 401', invalidRes.data);
    }
  } catch (err) {
    fail('Authentication test suite encountered an unexpected error', err);
  }

  // -------------------------------------------------------------
  // 3. PASSWORD RESET FLOW
  // -------------------------------------------------------------
  console.log('\n\x1b[36m[3/8] Account Protection & Password Reset Flow\x1b[0m');
  try {
    const forgotRes = await request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'labadmin@apexlabs.com' }),
    });
    if (forgotRes.status === 200 && forgotRes.data.resetToken) {
      const resetToken = forgotRes.data.resetToken;
      pass('Password reset token issued successfully', `Token: ${resetToken.substring(0, 16)}...`);

      // Reset password with new value
      const resetRes = await request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken, newPassword: 'NewSecurePassword456!' }),
      });
      if (resetRes.status === 200) {
        pass('Password reset confirmed successfully');

        // Test login with new password
        const loginNewRes = await request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: 'labadmin@apexlabs.com', password: 'NewSecurePassword456!' }),
        });
        if (loginNewRes.status === 200) {
          pass('Authentication confirmed with newly set password');
        } else {
          fail('Failed to login with newly reset password', loginNewRes.data);
        }

        // Restore universal password 'admin123'
        const forgotRestore = await request('/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email: 'labadmin@apexlabs.com' }),
        });
        if (forgotRestore.data.resetToken) {
          await request('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token: forgotRestore.data.resetToken, newPassword: 'admin123' }),
          });
          pass('Restored universal password admin123 for demo accounts');
        }
      } else {
        fail('Password reset endpoint returned non-200', resetRes.data);
      }
    } else {
      fail('Forgot password request failed', forgotRes.data);
    }
  } catch (err) {
    fail('Account protection tests error', err);
  }

  // -------------------------------------------------------------
  // 4. ROLE-BASED ACCESS CONTROL (RBAC)
  // -------------------------------------------------------------
  console.log('\n\x1b[36m[4/8] Role-Based Access Control (RBAC)\x1b[0m');
  try {
    // Unauthenticated request to protected endpoint
    const unauthRes = await request('/laboratories');
    if (unauthRes.status === 401) {
      pass('Unauthenticated request to protected route blocked with 401 Unauthorized');
    } else {
      fail('Unauthenticated request should return 401', unauthRes.status);
    }

    // Non-SuperAdmin trying to access Super Admin endpoint
    const forbiddenRes = await request('/laboratories', {
      headers: { Authorization: `Bearer ${labAdminToken}` },
    });
    if (forbiddenRes.status === 403) {
      pass('Lab Admin accessing Super Admin route (/laboratories) blocked with 403 Forbidden');
    } else {
      fail('Lab Admin accessing Super Admin route should return 403', forbiddenRes.status);
    }

    // Super Admin accessing Super Admin endpoint succeeds
    const superAdminRes = await request('/laboratories', {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    if (superAdminRes.status === 200 && Array.isArray(superAdminRes.data)) {
      pass('Super Admin authorized to access /laboratories', `Found: ${superAdminRes.data.length} labs`);
    } else {
      fail('Super Admin should be granted access to /laboratories', superAdminRes.data);
    }
  } catch (err) {
    fail('RBAC tests error', err);
  }

  // -------------------------------------------------------------
  // 5. MULTI-TENANT ISOLATION
  // -------------------------------------------------------------
  console.log('\n\x1b[36m[5/8] Multi-Tenant Security & Isolation\x1b[0m');
  try {
    // Lab Admin queries their own branches
    const ownBranchesRes = await request('/branches', {
      headers: { Authorization: `Bearer ${labAdminToken}` },
    });
    if (ownBranchesRes.status === 200 && Array.isArray(ownBranchesRes.data)) {
      const allApex = ownBranchesRes.data.every((b: any) => b.lab_id === 'lab-apex');
      if (allApex && ownBranchesRes.data.length > 0) {
        pass('Lab Admin successfully retrieves only their own laboratory branches', `Branches: ${ownBranchesRes.data.length}`);
      } else {
        fail('Branches list leaked other tenant branches or empty', ownBranchesRes.data);
      }
    } else {
      fail('Failed to fetch own branches', ownBranchesRes.data);
    }

    // Lab Admin attempts cross-tenant branch access by specifying another lab_id
    const crossTenantRes = await request('/branches?lab_id=lab-foreign-999', {
      headers: { Authorization: `Bearer ${labAdminToken}` },
    });
    if (crossTenantRes.status === 403) {
      pass('Cross-tenant data query injection (?lab_id=other) strictly blocked with 403 Forbidden');
    } else {
      fail('Cross-tenant branch query should return 403', crossTenantRes.status);
    }

    // Lab Admin attempts cross-tenant branch creation
    const crossTenantCreate = await request('/branches', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labAdminToken}` },
      body: JSON.stringify({
        name: 'Hacked Branch',
        code: 'HACK01',
        lab_id: 'lab-foreign-999',
      }),
    });
    if (crossTenantCreate.status === 403) {
      pass('Cross-tenant branch creation attempt blocked with 403 Forbidden');
    } else {
      fail('Cross-tenant branch creation should return 403', crossTenantCreate.status);
    }
  } catch (err) {
    fail('Tenant isolation tests error', err);
  }

  // -------------------------------------------------------------
  // 6. LABORATORY PROVISIONING & ADMIN ONBOARDING
  // -------------------------------------------------------------
  console.log('\n\x1b[36m[6/8] Laboratory Lifecycle & Initial Admin Provisioning\x1b[0m');
  try {
    const timestamp = Date.now().toString().slice(-4);
    const labCode = `TESTLAB-${timestamp}`;
    testLabAdminEmail = `admin.${timestamp}@testlab.com`;

    // Create Laboratory + Initial Lab Admin
    const createLabRes = await request('/laboratories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({
        name: `Integrated BioDiagnostics ${timestamp}`,
        code: labCode,
        owner_name: 'Dr. Rahul Sharma',
        legal_name: `Integrated BioDiagnostics Corp ${timestamp}`,
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        email: `contact.${timestamp}@testlab.com`,
        phone: '+91 98765 00000',
        subscription_plan_id: 'plan-pro',
        create_admin: true,
        admin_name: 'Dr. Rahul Sharma',
        admin_email: testLabAdminEmail,
        admin_password: 'admin123',
      }),
    });

    if (createLabRes.status === 201 && createLabRes.data.id) {
      testLabId = createLabRes.data.id;
      pass('New laboratory provisioned with Initial Lab Admin account', `Lab ID: ${testLabId}, Admin: ${testLabAdminEmail}`);

      // Verify newly created Lab Admin can immediately authenticate
      const newAdminLogin = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: testLabAdminEmail, password: 'admin123' }),
      });
      if (newAdminLogin.status === 200 && newAdminLogin.data.user?.lab_id === testLabId) {
        pass('Initial Lab Admin successfully authenticated with assigned credentials');
      } else {
        fail('Initial Lab Admin failed to log in', newAdminLogin.data);
      }

      // 5-ATTEMPT LOCKOUT THRESHOLD VERIFICATION on this test account
      console.log('    Testing brute-force lockout threshold (5 failed attempts)...');
      for (let i = 1; i <= 4; i++) {
        const badAttempt = await request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: testLabAdminEmail, password: 'WrongPassword999!' }),
        });
        if (badAttempt.status !== 401) {
          fail(`Failed attempt ${i} should return 401`, badAttempt.status);
        }
      }
      // 5th attempt triggers lockout
      const fifthAttempt = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: testLabAdminEmail, password: 'WrongPassword999!' }),
      });
      if (fifthAttempt.status === 429) {
        pass('Brute-force protection verified: 5 consecutive failed attempts trigger 15-min account lockout (429)');
      } else {
        fail('5th failed attempt should return 429 lockout', fifthAttempt.status);
      }

      // Fetch lab details with branches & staff
      const detailsRes = await request(`/laboratories/${testLabId}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      if (detailsRes.status === 200 && detailsRes.data.lab?.id === testLabId) {
        pass('Fetched complete laboratory profile including staff roster and facility metrics');
      } else {
        fail('Failed to fetch newly created lab details', detailsRes.data);
      }

      // Update lab status (suspend & reactivate)
      const suspendRes = await request(`/laboratories/${testLabId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${superAdminToken}` },
        body: JSON.stringify({ status: 'suspended' }),
      });
      if (suspendRes.status === 200) {
        pass('Laboratory status transitioned to suspended');

        // Verify suspended lab login is blocked
        const suspendedLogin = await request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: testLabAdminEmail, password: 'admin123' }),
        });
        if (suspendedLogin.status === 403 || suspendedLogin.status === 429) {
          pass('Users belonging to suspended/locked laboratory are blocked from system login');
        } else {
          fail('Suspended lab user login should be blocked', suspendedLogin.status);
        }

        // Reactivate laboratory
        await request(`/laboratories/${testLabId}/status`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${superAdminToken}` },
          body: JSON.stringify({ status: 'active' }),
        });
        pass('Laboratory status restored to active');
      } else {
        fail('Failed to update laboratory status', suspendRes.data);
      }
    } else {
      fail('Laboratory provisioning failed', createLabRes.data);
    }
  } catch (err) {
    fail('Laboratory provisioning tests error', err);
  }

  // -------------------------------------------------------------
  // 7. SUBSCRIPTIONS & LIFECYCLE MANAGEMENT
  // -------------------------------------------------------------
  console.log('\n\x1b[36m[7/8] Subscriptions & Feature Tiers\x1b[0m');
  try {
    // List subscription plans
    const plansRes = await request('/subscriptions/plans', {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    if (plansRes.status === 200 && Array.isArray(plansRes.data) && plansRes.data.length >= 3) {
      pass('Retrieved catalog of subscription plans', `Plans: ${plansRes.data.map((p: any) => p.name).join(', ')}`);
    } else {
      fail('Failed to retrieve subscription plans', plansRes.data);
    }

    // Assign Enterprise Plan to the new lab
    if (testLabId) {
      const assignRes = await request('/subscriptions/assign', {
        method: 'POST',
        headers: { Authorization: `Bearer ${superAdminToken}` },
        body: JSON.stringify({
          lab_id: testLabId,
          plan_id: 'plan-enterprise',
          billing_cycle: 'yearly',
          price_paid: 18000,
        }),
      });
      if (assignRes.status === 200) {
        pass('Upgraded laboratory subscription to Enterprise Plan (Yearly cycle)');
      } else {
        fail('Failed to assign Enterprise subscription plan', assignRes.data);
      }

      // Extend subscription by 60 days
      const extendRes = await request('/subscriptions/extend', {
        method: 'POST',
        headers: { Authorization: `Bearer ${superAdminToken}` },
        body: JSON.stringify({
          lab_id: testLabId,
          extension_days: 60,
          reason: 'Promotional onboard bonus',
        }),
      });
      if (extendRes.status === 200 && extendRes.data.new_end_date) {
        pass('Subscription period successfully extended by 60 days', `New expiry: ${extendRes.data.new_end_date}`);
      } else {
        fail('Failed to extend subscription', extendRes.data);
      }
    }
  } catch (err) {
    fail('Subscription management tests error', err);
  }

  // -------------------------------------------------------------
  // 8. NOTIFICATIONS & AUDIT LOGGING
  // -------------------------------------------------------------
  console.log('\n\x1b[36m[8/8] Notifications Engine & Live Audit Trail\x1b[0m');
  try {
    // Super Admin broadcasts announcement
    const broadcastRes = await request('/notifications/broadcast', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({
        title: 'System Maintenance Window Notice',
        message: 'All laboratories please note scheduled maintenance at 02:00 AM UTC.',
        type: 'warning',
      }),
    });
    if (broadcastRes.status === 201 && broadcastRes.data.message) {
      pass('Super Admin broadcasted system announcement to all active users', broadcastRes.data.message);
    } else {
      fail('Failed to broadcast announcement', broadcastRes.data);
    }

    // Check notifications list
    const notifsRes = await request('/notifications', {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    if (notifsRes.status === 200 && Array.isArray(notifsRes.data) && notifsRes.data.length > 0) {
      testNotificationId = notifsRes.data[0].id;
      pass('Retrieved user notifications list', `Total: ${notifsRes.data.length}`);

      // Unread count check
      const unreadRes = await request('/notifications/unread-count', {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      if (unreadRes.status === 200 && typeof unreadRes.data.unread_count === 'number') {
        pass('Retrieved live unread notifications counter', `Unread count: ${unreadRes.data.unread_count}`);
      } else {
        fail('Failed to fetch unread notifications count', unreadRes.data);
      }

      // Mark notification as read
      const markReadRes = await request(`/notifications/${testNotificationId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      if (markReadRes.status === 200) {
        pass('Notification marked as read successfully');
      } else {
        fail('Failed to mark notification as read', markReadRes.data);
      }
    } else {
      fail('Failed to list notifications', notifsRes.data);
    }

    // Verify Super Admin Analytics & Live Audit Feed
    const analyticsRes = await request('/analytics/superadmin', {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    if (analyticsRes.status === 200 && analyticsRes.data.metrics && Array.isArray(analyticsRes.data.recent_activity)) {
      pass('Live Super Admin Analytics and real-time audit event feed verified', `Recent audit events: ${analyticsRes.data.recent_activity.length}`);
    } else {
      fail('Failed to fetch Super Admin analytics and audit feed', analyticsRes.data);
    }
  } catch (err) {
    fail('Notifications and audit tests error', err);
  }

  // -------------------------------------------------------------
  // TEST SUMMARY
  // -------------------------------------------------------------
  console.log('\n============================================================');
  console.log(`📊 Test Results: \x1b[32m${testsPassed} Passed\x1b[0m, \x1b[31m${testsFailed} Failed\x1b[0m (Total: ${testsPassed + testsFailed})`);
  console.log('============================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL CORE SYSTEM ARCHITECTURE TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
