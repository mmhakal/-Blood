# MediFlow LIS — Module Ownership & Dependency Architecture

> **Canonical Architectural Specification**  
> **Status**: ACTIVE & ENFORCED  
> **Scope**: Blood Diagnostic Laboratory Information System (LIS) + Multi-Tenant SaaS Platform  
> **Rule**: One Module → One Clear Owner → One Source of Truth → Explicit Dependencies → Controlled Contracts → Auditable Changes.

---

## 1. Core Ownership Model

To eliminate business logic duplication and ensure strict accountability, the entire platform is divided into 15 domain owners. Every module has **one primary owner**, clearly defined inputs/outputs, and explicit upstream/downstream dependencies.

| Domain Area | Primary Owner | Responsibilities & Scope |
| :--- | :--- | :--- |
| **Platform Core** | `PLATFORM_CORE` | Tenant context, organization hierarchy, authentication, authorization, users, roles, permissions, feature flags, system configuration, audit framework, event framework, global IDs, API conventions. |
| **Master Data** | `MASTER_DATA` | Patients, doctors, tests, parameters, reference ranges, packages, pricing, departments, sample types, units. |
| **LIS Operations** | `LIS_OPERATIONS` | Test orders, order items, samples, accession, barcode, sample lifecycle, result entry, verification, approval, report release. |
| **Finance** | `FINANCE` | Invoices, invoice items, payments, refunds, discounts, taxes, accounting, corporate billing. |
| **Inventory & Procurement** | `INVENTORY_PROCUREMENT` | Inventory, consumables, reagents, lots, suppliers, purchase orders, goods receiving, stock movements, expiry. |
| **Analyzer & Quality** | `ANALYZER_QUALITY` | Analyzers, analyzer mappings, ASTM, HL7, result import, QC, calibration, maintenance, delta checks, auto-validation. |
| **Customer & Business Ops** | `CUSTOMER_OPERATIONS` | CRM, appointments, queue, home collection, phlebotomists, campaigns, health camps, corporate clients, loyalty, feedback, support. |
| **Communication** | `COMMUNICATION` | Email, SMS, WhatsApp, push notifications, in-app notifications, templates, delivery, retries. |
| **Reporting & Analytics** | `REPORTING_ANALYTICS` | Dashboards, BI, Turn-Around-Time (TAT), profitability, operational analytics, enterprise reporting. |
| **Artificial Intelligence** | `AI` | AI clinical copilot, suggestions, anomaly detection, predictive analytics, AI audit, AI governance. *AI must never become the owner of authoritative clinical results.* |
| **SaaS Platform** | `SAAS_PLATFORM` | Subscriptions, plans, usage quotas, SaaS billing, marketplace, customer onboarding, tenant lifecycle. |
| **Integration Platform** | `INTEGRATION_PLATFORM` | External APIs, webhooks, OAuth, API keys, developer portal, integration lifecycle. |
| **Security & Governance** | `SECURITY_GOVERNANCE` | Security policies, privacy, retention, security events, privileged access, compliance controls, governance. |
| **DevOps & Reliability** | `DEVOPS_RELIABILITY` | Deployment, CI/CD, infrastructure, monitoring, logging, backups, disaster recovery, system health. |
| **Mobile** | `MOBILE` | Mobile applications, mobile sessions, device registration, offline cache, synchronization. *Mobile consumes backend domain services rather than recreating business rules.* |

---

## 2. Module Dependency Layers

Lower layers must **never** depend on higher-level modules. Dependencies flow strictly downwards:

```
┌────────────────────────────────────────────────────────────────────────┐
│ LAYER 7: Reliability & Release                                         │
│ Security • Monitoring • Backup • Disaster Recovery • CI/CD • Go-Live   │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │
┌───────────────────────────────────┴────────────────────────────────────┐
│ LAYER 6: Advanced Platform Services                                    │
│ AI • Developer API • Marketplace • Mobile • SaaS Billing • Governance  │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │
┌───────────────────────────────────┴────────────────────────────────────┐
│ LAYER 5: Business Services                                             │
│ Billing • Accounting • Notifications • Portals • Analytics • Support   │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │
┌───────────────────────────────────┴────────────────────────────────────┐
│ LAYER 4: Specialized Clinical / Operational Services                   │
│ Analyzer • QC • Calibration • Automation • Inventory • Field Services  │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │
┌───────────────────────────────────┴────────────────────────────────────┐
│ LAYER 3: LIS Operations                                                │
│ Orders • Samples • Barcode • Result Entry • Verification • Reports     │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │
┌───────────────────────────────────┴────────────────────────────────────┐
│ LAYER 2: Master Data                                                   │
│ Patient • Doctor • Test Catalog • Parameter • Ranges • Pricing         │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │
┌───────────────────────────────────┴────────────────────────────────────┐
│ LAYER 1: Platform Core                                                 │
│ Authentication • Tenant Context • Organization • RBAC • Audit          │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │
┌───────────────────────────────────┴────────────────────────────────────┐
│ LAYER 0: Infrastructure                                                │
│ PostgreSQL / SQLite • Cache • Queue • Object Storage • Observability   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Platform Core Specifications

### 3.1 Authentication
- **Owns**: User login, logout, password hashing, MFA, sessions, refresh tokens, account lockout.
- **Dependencies**: Layer 0 (Database), Tenant Context, Security.
- **Used by**: Every protected route and module in the system.

### 3.2 Tenant Context
- **Owns**: Organization ID, laboratory ID, branch ID, active user scope.
- **Rule**: Every backend request must establish tenant context before accessing tenant-owned data.
- **Dependencies**: Authentication, Organization.
- **Used by**: All business modules across the platform.

### 3.3 RBAC (Role-Based Access Control)
- **Owns**: Roles, permissions, role assignments, permission evaluation.
- **Rule**: No business module may implement its own independent authorization system. Centralized authorization is mandatory.

---

## 4–11. Master Data & Operations Specifications

### 4. Organization Module
- **Owns**: Organizations, laboratories, branches, collection centers, departments, hierarchy, tenant branding settings.
- **Dependencies**: Authentication, RBAC, Tenant Context, Audit.

### 5. Patient Module
- **Owns**: Patient identity, patient demographics, unique Patient ID (`PID-YYYY-XXXXXX`), contact information, patient history references.
- **Boundary Restriction**: The Patient module **must not own** test results, invoices, or analyzer data. Those belong exclusively to their respective domains.

### 6. Doctor Module
- **Owns**: Doctor profile, medical registration numbers, specialty, referral relationships, contact channels.
- **Consumed by**: Orders, referrals, diagnostic reports, CRM, doctor portal.

### 7. Test Master Module
- **Owns**: Tests, categories, parameters, measurement units, specimen requirements, methodology, biological reference ranges, panic/critical ranges.
- **Criticality**: High-dependency module. Changes to tests, parameters, and reference ranges require strict audit and versioning.

### 8. Pricing & Package Module
- **Owns**: Base test pricing, branch price overrides, health check packages, discount authorization rules.
- **Dependencies**: Test Master, Organization, Branch.

### 9. Order Module
- **Owns**: Test orders, order items, priority (`STAT`/`Routine`), order lifecycle status.
- **Dependencies**: Patient, Doctor, Test Master, Package, Pricing, Organization, Branch.
- **Emits**: `order.created`, `order.updated`, `order.cancelled`.

### 10. Sample Module
- **Owns**: Specimen accessioning, collection status, aliquots, laboratory routing, sample rejection criteria.
- **Dependencies**: Order, Patient, Test Master, Branch.
- **Emits**: `sample.collected`, `sample.received`, `sample.rejected`.

### 11. Barcode Module
- **Owns**: Specimen tube barcode generation (`SMP-YYYY-XXXXXX`), Code128/QR validation, label printing payloads.
- **Boundary Restriction**: Barcode labels must not contain unnecessary patient-sensitive PII.

---

## 12–15. Clinical Results, Verification & Reports

### 12. Result Engine
- **Owns**: Numeric/text observation values, calculated parameters (e.g. Friedewald LDL), abnormal flags, panic alerts, delta checks against patient historical baseline.
- **Dependencies**: Test Master, Parameter, Reference Range, Sample, Analyzer, QC.
- **Emits**: `result.entered`, `result.updated`, `critical.result.detected`.

### 13. Verification Module
- **Owns**: Technical verification, plausibility validation, delta check approval, re-run requests.
- **Rule**: Must not bypass professional authorization.

### 14. Approval Module
- **Owns**: Clinical pathologist approval, digital signatures, legal certification, amendment justification.
- **Emits**: `report.approved`, `report.amended`.

### 15. Report Engine
- **Owns**: NABL/ISO A4 PDF layout rendering, report versioning, public verification QR tokens, report release gating.
- **Boundary Restriction**: The Report Engine consumes approved clinical information. It must **never** independently modify clinical results.

---

## 16–23. Finance, Supply Chain & Automation

### 16. Billing Module
- **Owns**: Invoices, invoice line items, payments (Cash, UPI, Card, Net Banking), refunds, discount limits, tax calculations.
- **Emits**: `invoice.created`, `payment.completed`, `payment.failed`, `refund.completed`.

### 17. Accounting Module
- **Owns**: General ledger, chart of accounts, revenue, expenses, accounts receivable aging, GST reports.
- **Rule**: Billing must not directly implement accounting ledger logic. Accounting consumes billing events.

### 18. Inventory Module
- **Owns**: Reagent and consumable stock balances, lot numbers, expiration dates, minimum reorder thresholds.
- **Emits**: `stock.low`, `stock.expiring`.

### 19. Procurement Module
- **Owns**: Supplier directory, purchase requests, purchase orders (PO), goods receiving notes (GRN), vendor invoices.

### 20. Analyzer Module
- **Owns**: Analyzer registry, hardware driver configs, test code mappings, ASTM/HL7 parsers, raw message telemetry.

### 21. Quality Control (QC) Module
- **Owns**: QC control materials, daily QC runs, Levey-Jennings charts, Westgard multi-rules (1-3s, 2-2s, R-4s), corrective actions.
- **Rule**: QC status may influence result verification, but must not directly alter patient results.

### 22. Automation Engine
- **Owns**: Event-driven rules, triggers, conditions, and actions.
- **Rule**: Automation executes actions across modules, but must not own business domain data.

### 23. Notification Module
- **Owns**: Notification templates, delivery channels (SMS, WhatsApp, Email, Push), delivery status, retry queues.
- **Rule**: Notification delivery failures must **never** roll back or corrupt clinical transactions.

---

## 24–36. Operations, Portals, AI & Platform Services

### 24. Appointments & 25. Home Collection
- **Owns**: Phlebotomist route dispatch, collection slots, home address coordinates, field collection status.

### 26. CRM & Corporate Operations
- **Owns**: Corporate contracts, health camps, doctor relationship tracking, client feedback. CRM must not own clinical data.

### 27. Analytics & BI
- **Rule**: Analytics consumes domain events and read models rather than tightly coupling to transactional tables. Analytics must not mutate clinical data.

### 28. Portals (Doctor & Patient)
- Presentation and application layers consuming domain services. Portals must not duplicate backend business logic.

### 29. AI Module
- **Core Governance Rule**: AI produces suggestions, summaries, anomaly indicators, and demand forecasts. AI output must pass through human authorization and governance controls.
- **Prohibitions**: AI can **never** release reports, approve results, overwrite observations, modify reference ranges, or issue refunds without explicit authorized user action.

### 30. Mobile Module
- Mobile applications consume backend domain services. Mobile must not contain authoritative copies of clinical business rules. Server-side clinical truth always prevails.

### 31. SaaS Platform & 32. Marketplace
- **Owns**: Plans, subscriptions, quotas, feature entitlements, third-party apps, OAuth scopes.
- **Rule**: SaaS entitlement checks are separate from RBAC permissions. Both checks must pass for access.

### 33. Developer API & 34. Security & 35. Privacy
- Cross-cutting security, privileged access monitoring, HMAC webhook delivery, and GDPR/clinical data retention controls.

### 36. Audit Module
- Immutable append-only audit trail recording:
  ```json
  {
    "actor": "user-uuid",
    "tenant": "lab-uuid",
    "branch": "branch-uuid",
    "action": "APPROVE_REPORT",
    "entity": "report",
    "entity_id": "rep-uuid",
    "timestamp": "2026-09-16T22:00:00Z",
    "request_id": "req-uuid",
    "before": { "status": "draft" },
    "after": { "status": "approved" },
    "reason": "Clinical review verified",
    "result": "success"
  }
  ```

---

## 37. Domain Event Ownership Specification

Domain events decouple system modules. The module that owns the entity owns its events:

| Event Name | Owning Domain | Key Payload Attributes |
| :--- | :--- | :--- |
| `patient.created` | `MASTER_DATA.patient` | `patient_id`, `name`, `mobile`, `dob`, `gender` |
| `order.created` | `LIS_OPERATIONS.order` | `order_id`, `patient_id`, `test_ids`, `total_amount` |
| `sample.collected` | `LIS_OPERATIONS.sample` | `sample_id`, `order_id`, `barcode`, `sample_type` |
| `sample.rejected` | `LIS_OPERATIONS.sample` | `sample_id`, `rejection_reason`, `rejection_category` |
| `result.entered` | `LIS_OPERATIONS.result` | `order_id`, `test_id`, `parameter_id`, `value` |
| `critical.result.detected`| `LIS_OPERATIONS.result` | `order_id`, `parameter_name`, `observed_value`, `flag` |
| `report.approved` | `LIS_OPERATIONS.approval` | `report_id`, `order_id`, `approved_by`, `signed_at` |
| `report.released` | `LIS_OPERATIONS.approval` | `report_id`, `report_number`, `token`, `patient_id` |
| `invoice.created` | `FINANCE.billing` | `invoice_id`, `order_id`, `net_amount`, `patient_id` |
| `payment.completed` | `FINANCE.billing` | `payment_id`, `invoice_id`, `amount`, `payment_method` |
| `stock.low` | `INVENTORY_PROCUREMENT` | `item_id`, `current_stock`, `minimum_level` |
| `qc.failed` | `ANALYZER_QUALITY.qc` | `analyzer_id`, `test_id`, `rule_violated`, `sd` |
| `subscription.created` | `SAAS_PLATFORM` | `tenant_id`, `plan_id`, `quota_limit`, `valid_until` |

---

## 38. Synchronous vs Asynchronous Communication

| Mechanism | Permitted Use Cases | Guarantees |
| :--- | :--- | :--- |
| **Synchronous** (Direct Call) | Authentication, permission checks, patient lookup, test catalog lookup, order booking validation, pricing calculation, report authorization. | Immediate consistency, transactional atomicity. |
| **Asynchronous** (Domain Event / Queue) | SMS/WhatsApp/Email notifications, analytics rollups, webhook delivery, AI analysis, large report exports, backup creation, background offline sync. | Eventual consistency, failure isolation, retry handling. |

---

## 39. Database Ownership Rules

Each domain owns its own database tables. **No module may directly mutate another domain's tables:**

```
Billing       ──owns──> invoices, invoice_items, payments, refunds
Order         ──owns──> test_orders, order_items
Result        ──owns──> test_results, result_verifications
Inventory     ──owns──> inventory_items, stock_batches, stock_transactions
Patient       ──owns──> patients, patient_identities
Test Master   ──owns──> tests, parameters, reference_ranges
```

*Data retrieval across domains must occur via domain services, public read views, or published domain events.*

---

## 40. Frontend Ownership Structure

The frontend architecture mirrors backend domain boundaries:

```
frontend/src/
├── pages/
│   ├── auth/            # PLATFORM_CORE
│   ├── laboratories/    # PLATFORM_CORE
│   ├── patients/        # MASTER_DATA
│   ├── doctors/         # MASTER_DATA
│   ├── tests/           # MASTER_DATA
│   ├── orders/          # LIS_OPERATIONS
│   ├── samples/         # LIS_OPERATIONS
│   ├── results/         # LIS_OPERATIONS
│   ├── reports/         # LIS_OPERATIONS
│   ├── billing/         # FINANCE
│   ├── accounting/      # FINANCE
│   ├── inventory/       # INVENTORY_PROCUREMENT
│   ├── procurement/     # INVENTORY_PROCUREMENT
│   ├── analyzers/       # ANALYZER_QUALITY
│   ├── qc/              # ANALYZER_QUALITY
│   ├── field/           # CUSTOMER_OPERATIONS
│   ├── crm/             # CUSTOMER_OPERATIONS
│   ├── analytics/       # REPORTING_ANALYTICS
│   ├── ai/              # AI
│   ├── subscriptions/   # SAAS_PLATFORM
│   ├── developer/       # INTEGRATION_PLATFORM
│   ├── security/        # SECURITY_GOVERNANCE
│   └── backup/          # DEVOPS_RELIABILITY
```

---

## 41. Dependency Direction Rule

```
Allowed:  UI ──> Application Service ──> Domain Service ──> Repository / Infrastructure
Blocked:  Patient ──> Report ──> Patient ──> Billing ──> Patient  (Circular Dependency)
```

If two modules require each other, resolve the circularity by:
1. Emitting a **Domain Event**
2. Creating an **Application Service** coordinator
3. Publishing a **Shared Contract**

---

## 42–44. Change Control, High-Risk Modules & Contract Standard

### 42. 10-Step Change Control Workflow
When modifying any module:
1. Identify owner domain.
2. Identify consumer modules.
3. Identify database schema dependencies.
4. Identify API contract dependencies.
5. Identify event consumers.
6. Identify permission dependencies.
7. Identify subscription entitlement impacts.
8. Run affected unit tests.
9. Run end-to-end integration test suites.
10. Update canonical architecture documentation.

### 43. High-Risk Modules
The following modules require mandatory peer review and regression testing before merging changes:
- Authentication & Tenant Isolation
- RBAC & Centralized Permissions
- Patient Demographics & Identity
- Test Master & Biological Reference Ranges
- Result Entry & Verification Desk
- Pathologist Approval & Report Release
- Billing Invoices & Payment Ledger
- Analyzer ASTM/HL7 Integrations
- Database Migrations

---

## 45. Complete Dependency Matrix

| Module | Layer | Directly Depends On | Primary Consumers |
| :--- | :---: | :--- | :--- |
| **Auth** | 1 | Infrastructure | All modules |
| **Tenant Context** | 1 | Auth, Organization | All modules |
| **RBAC** | 1 | Auth, Tenant | All modules |
| **Organization** | 1 | Auth, Tenant, RBAC | Patients, Orders, Billing, Inventory |
| **Audit** | 1 | Auth, Tenant | Cross-cutting (All modules) |
| **Patient** | 2 | Tenant, RBAC, Audit | Orders, Reports, Portals, CRM |
| **Doctor** | 2 | Tenant, RBAC, Audit | Orders, Reports, Doctor Portal |
| **Test Master** | 2 | Tenant, RBAC, Audit | Orders, Results, Analyzers, QC, Pricing |
| **Pricing** | 2 | Test Master, Organization | Orders, Billing, CRM |
| **Orders** | 3 | Patient, Doctor, Test Master, Pricing | Samples, Billing, Analytics |
| **Samples** | 3 | Orders, Patient, Test Master | Barcode, Analyzers, Results, TAT |
| **Barcode** | 3 | Samples | Collection, Mobile, Phlebotomy |
| **Results** | 3 | Test Master, Samples | Verification, Reports, AI |
| **Verification** | 3 | Results, QC, Test Master | Approval Desk |
| **Approval** | 3 | Verification, RBAC, Reports | Report Release |
| **Reports** | 3 | Results, Approval, Patient, Doctor | Portals, Notifications, Public QR |
| **Analyzers** | 4 | Test Master, Samples | Results, QC |
| **QC** | 4 | Analyzers, Test Master | Verification Desk |
| **Inventory** | 4 | Organization, Tests | Procurement, QC, Operations |
| **Procurement** | 4 | Inventory, Organization | Accounting |
| **Field Services** | 4 | Patient, Orders, Tenant | Samples, Billing |
| **CRM** | 4 | Patient, Doctor, Orders | Marketing, Analytics |
| **Automation** | 4 | DomainEventBus | All permitted domains |
| **Billing** | 5 | Orders, Pricing, Tenant | Accounting, SaaS |
| **Accounting** | 5 | Billing, Procurement | Analytics, Management |
| **Notifications** | 5 | DomainEventBus | Patients, Doctors, Staff |
| **Analytics** | 5 | DomainEventBus | Dashboards, Executive BI |
| **AI Clinical** | 6 | Results, QC, Analytics | Pathologists, Technicians |
| **Subscriptions** | 6 | Organization, Billing | Feature Entitlements |
| **Developer API** | 6 | Auth, Tenant, DomainEventBus | External Integrations |
| **Mobile Sync** | 6 | Auth, Patient, Samples | Field Phlebotomists |
| **Security Center**| 7 | Auth, Tenant, Audit | System Operators |
| **Backup & DR** | 7 | Infrastructure | System Reliability |

---

## 46. Critical Dependency Chains

### 1. Clinical Processing Chain
$$\text{Patient} \longrightarrow \text{Order} \longrightarrow \text{Sample} \longrightarrow \text{Analyzer} \longrightarrow \text{Result} \longrightarrow \text{QC/Delta Check} \longrightarrow \text{Verification} \longrightarrow \text{Approval} \longrightarrow \text{Report Release}$$

### 2. Financial Accounting Chain
$$\text{Test/Pricing} \longrightarrow \text{Order} \longrightarrow \text{Invoice} \longrightarrow \text{Payment} \longrightarrow \text{Journal Ledger} \longrightarrow \text{Financial BI}$$

### 3. SaaS Subscription Chain
$$\text{Organization} \longrightarrow \text{Plan} \longrightarrow \text{Subscription} \longrightarrow \text{Feature Quota} \longrightarrow \text{Tenant Access} \longrightarrow \text{Renewal/Suspension}$$

### 4. Procurement Supply Chain
$$\text{Reagent Consumption} \longrightarrow \text{Low Stock Alert} \longrightarrow \text{Purchase Order} \longrightarrow \text{Goods Receipt (GRN)} \longrightarrow \text{Batch Stock} \longrightarrow \text{Vendor Invoice}$$

### 5. Integration Chain
$$\text{External System / Analyzer} \longrightarrow \text{HL7/ASTM/API} \longrightarrow \text{Parser Sandbox} \longrightarrow \text{Domain Service} \longrightarrow \text{Domain Event} \longrightarrow \text{LIS Core}$$

---

## 47. Failure Isolation Architecture

Failures in auxiliary or higher-level modules **must never halt unrelated or core clinical operations:**

- **SMS / WhatsApp Outage**: Fails gracefully with retry queue; report release completes without interruption.
- **Email Gateway Failure**: Fails gracefully; orders and payments complete normally.
- **Analytics Query Timeout**: Serves cached rollup; write-path transactions proceed unhindered.
- **AI Service Unavailability**: Standard technical verification and pathologist review operate without degradation.
- **Webhook Delivery Failure**: Placed in dead-letter retry; diagnostic database commit is preserved.
- **Marketplace App Failure**: Isolated by sandbox; core LIS remains 100% operational.
- **Payment Gateway Downtime**: Invoices remain in pending payment status; clinical accessioning can be authorized by policy.
- **Mobile Sync Disconnection**: Offline queue stored locally on device; server clinical truth remains intact.

---

## 48. Authoritative Sources of Business Truth

| Business Entity / State | Authoritative Owner | Non-Authoritative Consumers |
| :--- | :--- | :--- |
| **User Identity & Password** | `PLATFORM_CORE.auth` | Sessions, Mobile, Portals |
| **Access Permission** | `PLATFORM_CORE.rbac` | Every business module |
| **Organization & Branches** | `PLATFORM_CORE.organization`| All modules |
| **Patient Identity & Demographics** | `MASTER_DATA.patient` | Orders, Invoices, CRM, Portals |
| **Doctor Profile** | `MASTER_DATA.doctor` | Orders, CRM, Doctor Portal |
| **Test Catalog & Ref Ranges** | `MASTER_DATA.test_master` | Orders, Results, Analyzers, QC |
| **Test Price & Packages** | `MASTER_DATA.pricing` | Orders, Invoices, Portals |
| **Order State** | `LIS_OPERATIONS.order` | Samples, Billing, Analytics |
| **Sample Barcode & Status** | `LIS_OPERATIONS.sample` | Analyzers, Work Queues, Mobile |
| **Analyzer Raw Message** | `ANALYZER_QUALITY.analyzer`| Result Parser |
| **Clinical Observation Value** | `LIS_OPERATIONS.result` | Reports, AI, Analytics |
| **Technical Verification** | `LIS_OPERATIONS.verification`| Approval Desk |
| **Pathologist Approval** | `LIS_OPERATIONS.approval` | Report Release |
| **Released PDF Diagnostic Report**| `LIS_OPERATIONS.report` | Portals, Notifications, Patients |
| **Invoice Balance & Discount** | `FINANCE.billing` | Accounting, Portals |
| **Payment Receipt** | `FINANCE.billing` | Accounting, Patients |
| **Stock & Reagent Lot** | `INVENTORY_PROCUREMENT.inventory`| Procurement, QC |
| **Supplier & Purchase Order** | `INVENTORY_PROCUREMENT.procurement`| Accounting |
| **QC Run & Westgard Evaluation** | `ANALYZER_QUALITY.qc` | Verification Desk |
| **Subscription Plan & Quotas** | `SAAS_PLATFORM.subscriptions` | Tenant Feature Access |
| **AI Suggestion** | `AI.clinical_ai` | *Advisory only (Requires human verification)* |
| **Audit Log** | `SECURITY_GOVERNANCE.audit` | Compliance, Telemetry |
| **Security Incident** | `SECURITY_GOVERNANCE.security`| System Operator |

---

## 49. 13-Point Governance Checklist for New Features

Before creating or approving any new feature, pull request, or service, verify:
1. **Owner Domain**: Which single module owns this feature?
2. **Data Ownership**: Which module owns the underlying database tables?
3. **Permissions**: Which RBAC permission codes are required?
4. **Subscription Quotas**: Which SaaS plan entitlement is required?
5. **Dependencies**: Which upstream modules does this depend on?
6. **Events Produced**: What domain events are emitted?
7. **Events Consumed**: What domain events are listened to?
8. **Failure Behavior**: If an external dependency fails, does the core workflow isolate the failure?
9. **Audit Trail**: What audit action and entity tracking are recorded?
10. **Security & Privacy**: What tenant isolation and PII protection rules apply?
11. **API Surface**: What endpoints are added or updated?
12. **Portals & Mobile**: Does this affect Doctor Portal, Patient Portal, or Mobile sync?
13. **Automated Tests**: Which test suite verifies this module's contract?

---

## 50. Final Architectural Invariants

$$\text{One Module} \longrightarrow \text{One Clear Owner} \longrightarrow \text{One Source of Truth} \longrightarrow \text{Explicit Dependencies} \longrightarrow \text{Controlled Contracts} \longrightarrow \text{Auditable Changes}$$

The LIS Core must remain strictly independent from:
- AI Services
- CRM & Marketing
- Marketplace Plugins
- Analytics Rollups
- Mobile Applications
- External Integrations & Webhooks
- Third-party Notification Gateways

Advanced services extend the LIS platform, but must **never** compromise the clinical integrity of patient care, sample accessioning, result verification, or report release.
