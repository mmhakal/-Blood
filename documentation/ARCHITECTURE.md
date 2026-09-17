# Blood Diagnostic LIS — Phase 2 Architecture Documentation

> 📘 **Canonical Module Ownership Specification**: For the definitive domain ownership, 8-layer dependency architecture, failure-isolation boundaries, and change-control rules, refer to [MODULE_OWNERSHIP_ARCHITECTURE.md](file:///c:/Users/User/Documents/blood/documentation/MODULE_OWNERSHIP_ARCHITECTURE.md).

## 1. High-Level Architecture
MediFlow LIS is an enterprise Blood Diagnostic Laboratory Information System built with a clean separation of concerns:
- **Frontend**: Modern Single-Page Application (SPA) with TypeScript, React, and modular clinical UI components.
- **Backend**: RESTful API service built with Express, TypeScript, JWT authentication, and multi-tenant security layers.
- **Database**: Relational storage supporting dual database drivers:
  - **PostgreSQL** for scalable production clustering.
  - **Embedded Relational SQLite** (with WAL journaling and foreign keys enabled) for instant zero-dependency local deployment and edge lab appliances.
- **Shared Types**: Strongly typed contracts (`shared/types/index.ts`) shared between frontend and backend.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MediFlow LIS Client (React)                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS + Bearer JWT
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Express Clinical Backend API                         │
│  ┌───────────────────┐ ┌───────────────────┐ ┌──────────────────────┐  │
│  │ AuthenticateToken │ │ RequireRole/Perm  │ │ RequireTenantAccess  │  │
│  └─────────┬─────────┘ └─────────┬─────────┘ └──────────┬───────────┘  │
│            │                     │                      │              │
│            ▼                     ▼                      ▼              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     Application Services                         │  │
│  │  • AuthService        • LaboratoryService   • SubscriptionService│  │
│  │  • NotificationService • AuditService        • AnalyticsService  │  │
│  └─────────────────────────────────┬────────────────────────────────┘  │
└────────────────────────────────────┼───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│             Relational Database Layer (PostgreSQL / SQLite)            │
│  Multi-Tenant Isolated: laboratories, branches, users, subscriptions,  │
│  patients, test_orders, samples, results, reports, invoices, audit_logs │
└────────────────────────────────────────────────────────────────────────┘
```

## 2. Multi-Tenant Isolation Model
1. **Tenant Identification**: Every diagnostic organization has a unique `laboratory_id` (`lab-xxxx` or UUID).
2. **Branch Hierarchy**: Each laboratory can manage multiple branches (`branch-xxxx`) such as Collection Centers and Processing Hubs.
3. **Database Guardrails**:
   - Every patient, order, sample, result, and invoice table contains `lab_id`.
   - The `requireTenantAccess` middleware intercepts all incoming requests. Non-superadmin users can **only** query records where `lab_id = req.user.lab_id`.
   - Any query attempting to pass another tenant's `lab_id` in headers, query parameters, or body is rejected with `403 Forbidden`.
   - Branch users are further constrained to their authorized branch IDs from `user_branches`.

## 3. Role-Based Access Control (RBAC) Matrix

| Permission Code | Description | Super Admin | Lab Admin | Pathologist | Technician | Receptionist | Accountant |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `manage_all_laboratories` | Global laboratory CRUD, suspend, activate | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `manage_subscriptions` | Subscription plans, assigns, renewals | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `manage_global_tests` | System test catalog templates | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `manage_system_settings` | System-wide configuration | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `view_system_analytics` | Global multi-lab financial & operational KPIs | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `view_all_audit_logs` | Cross-tenant compliance audit trail | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `manage_users` | Staff creation & role assignment | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `manage_lab` | Laboratory profile, header, footer | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `manage_branches` | Add & configure branches/collection hubs | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `manage_patients` | Patient intake, edit & history | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `manage_tests` | Lab custom test catalog & pricing | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `manage_results` | Numerical result entry & modification | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `verify_results` | Technical result verification | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `approve_report` | Pathologist sign-off & release | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `manage_billing` | Invoices, discounts & payments | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| `view_analytics` | Lab branch & financial analytics | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `view_audit_logs` | Lab-specific audit trails | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

## 4. Security & Audit Principles
- **Authentication**: JWT signed with secret, verifying active user status and latest permissions on each request.
- **Login Protection**: Tracks consecutive failed login attempts; locks account for 15 minutes after 5 failures.
- **Append-Only Auditing**: Every critical operation (`LOGIN`, `CREATE_LAB`, `SUSPEND_LAB`, `ASSIGN_PLAN`, `CREATE_USER`, `UPDATE_STATUS`) records user ID, IP address, user-agent, entity, old values, and new values.
- **Soft Deletion**: Sensitive entities (`laboratories`, `branches`, `users`, `plans`) support `deleted_at` to preserve clinical history and regulatory compliance.
