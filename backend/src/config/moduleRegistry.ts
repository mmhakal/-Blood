/**
 * MediFlow LIS — Canonical Module Ownership & Dependency Registry
 * 
 * Formal implementation of the 8-Layer Module Ownership & Dependency Architecture.
 * Enforces one owner per domain, explicit dependencies, and failure-isolation boundaries.
 */

import { ModuleContract, DependencyLayer, ModuleDomain, BUSINESS_TRUTH_OWNERS } from '../types/moduleContracts';

export const MODULE_REGISTRY: Record<string, ModuleContract> = {
  // --------------------------------------------------------------------------
  // LAYER 1: PLATFORM CORE
  // --------------------------------------------------------------------------
  auth: {
    moduleName: 'Authentication',
    owner: 'PLATFORM_CORE',
    layer: 1,
    purpose: 'Identity verification, credentials, tokens, session management, and lockout protection',
    responsibilities: ['login', 'logout', 'password hashing', 'MFA', 'sessions', 'refresh tokens', 'account lockout'],
    tablesOwned: ['users', 'refresh_tokens', 'login_attempts'],
    apisOwned: ['/api/auth/login', '/api/auth/logout', '/api/auth/refresh', '/api/auth/mfa'],
    eventsProduced: ['security.alert_triggered'],
    eventsConsumed: [],
    dependencies: ['Infrastructure'],
    permissions: [],
    subscriptionEntitlements: [],
    failureBehavior: 'Block unauthorized requests with 401/403',
    auditRequirements: ['LOGIN_SUCCESS', 'LOGIN_FAILURE', 'PASSWORD_RESET', 'MFA_CHALLENGE'],
    securityRequirements: ['bcrypt hashing (cost 10)', 'JWT RS256/HS256', 'account lockout after 5 attempts'],
    testSuite: 'test:security'
  },

  tenant: {
    moduleName: 'Tenant Context',
    owner: 'PLATFORM_CORE',
    layer: 1,
    purpose: 'Enforce strict multi-tenant boundary and branch scoping across all transactions',
    responsibilities: ['lab isolation', 'branch scoping', 'tenant header simulation for super admin'],
    tablesOwned: ['laboratories', 'branches', 'user_branches'],
    apisOwned: ['/api/laboratories', '/api/branches'],
    eventsProduced: [],
    eventsConsumed: [],
    dependencies: ['auth'],
    permissions: ['manage_all_laboratories', 'manage_branches'],
    subscriptionEntitlements: [],
    failureBehavior: 'Strict 403 Forbidden on cross-tenant access attempt',
    auditRequirements: ['CREATE_LAB', 'UPDATE_LAB', 'SUSPEND_LAB', 'CREATE_BRANCH'],
    securityRequirements: ['Intercept all queries; verify req.user.lab_id matches target resource'],
    testSuite: 'test:core'
  },

  rbac: {
    moduleName: 'Role-Based Access Control',
    owner: 'PLATFORM_CORE',
    layer: 1,
    purpose: 'Centralized permissions, roles, and granular capability evaluation',
    responsibilities: ['role definitions', 'permissions matrix', 'role assignments'],
    tablesOwned: ['roles', 'permissions', 'role_permissions', 'user_roles'],
    apisOwned: ['/api/users/roles', '/api/users/permissions'],
    eventsProduced: [],
    eventsConsumed: [],
    dependencies: ['auth', 'tenant'],
    permissions: ['manage_users'],
    subscriptionEntitlements: [],
    failureBehavior: '403 Forbidden with exact missing permission code',
    auditRequirements: ['ASSIGN_ROLE', 'REVOKE_ROLE', 'UPDATE_PERMISSIONS'],
    securityRequirements: ['No independent authorization in downstream modules'],
    testSuite: 'test:core'
  },

  organization: {
    moduleName: 'Organization Hierarchy',
    owner: 'PLATFORM_CORE',
    layer: 1,
    purpose: 'Manage lab organizations, branches, collection centers, and departments',
    responsibilities: ['organization tree', 'department catalog', 'branch configurations'],
    tablesOwned: ['organizations', 'departments'],
    apisOwned: ['/api/organizations'],
    eventsProduced: [],
    eventsConsumed: [],
    dependencies: ['auth', 'tenant', 'rbac'],
    permissions: ['manage_lab', 'manage_branches'],
    subscriptionEntitlements: [],
    failureBehavior: 'Fallback to default parent lab settings',
    auditRequirements: ['CREATE_ORGANIZATION', 'UPDATE_DEPARTMENT'],
    securityRequirements: ['Lab ID tenant bounding on every operation'],
    testSuite: 'test:core'
  },

  audit: {
    moduleName: 'Audit Framework',
    owner: 'SECURITY_GOVERNANCE',
    layer: 1,
    purpose: 'Immutable append-only audit trail recording every state change and access across all tenants',
    responsibilities: ['audit logging', 'before/after diffs', 'actor tracking', 'compliance export'],
    tablesOwned: ['audit_logs'],
    apisOwned: ['/api/audit', '/api/audit/export'],
    eventsProduced: [],
    eventsConsumed: ['*'],
    dependencies: ['auth', 'tenant'],
    permissions: ['view_all_audit_logs', 'view_audit_logs'],
    subscriptionEntitlements: [],
    failureBehavior: 'Log write failure to secondary emergency log; never block caller',
    auditRequirements: ['System events self-logged'],
    securityRequirements: ['Append-only, no update or delete operations permitted'],
    testSuite: 'test:core'
  },

  // --------------------------------------------------------------------------
  // LAYER 2: MASTER DATA
  // --------------------------------------------------------------------------
  patient: {
    moduleName: 'Patient Master',
    owner: 'MASTER_DATA',
    layer: 2,
    purpose: 'Authoritative patient demographics, identification, and medical records index',
    responsibilities: ['patient identity', 'unique patient ID (PID)', 'demographics', 'contact deduplication'],
    tablesOwned: ['patients', 'patient_identities', 'patient_insurance'],
    apisOwned: ['/api/patients', '/api/patients/search', '/api/patients/:id'],
    eventsProduced: ['patient.created', 'patient.updated'],
    eventsConsumed: [],
    dependencies: ['tenant', 'rbac', 'audit'],
    permissions: ['manage_patients', 'view_patients'],
    subscriptionEntitlements: [],
    failureBehavior: 'Reject invalid demographic payload with validation error',
    auditRequirements: ['CREATE_PATIENT', 'UPDATE_PATIENT', 'MERGE_PATIENT'],
    securityRequirements: ['PII encryption, tenant isolation by lab_id'],
    testSuite: 'test:core'
  },

  doctor: {
    moduleName: 'Doctor Master',
    owner: 'MASTER_DATA',
    layer: 2,
    purpose: 'Referring doctor roster, commissions, qualifications, and communication channels',
    responsibilities: ['doctor profiles', 'referral partnerships', 'contact directory'],
    tablesOwned: ['doctors', 'doctor_commissions'],
    apisOwned: ['/api/doctors', '/api/doctors/:id'],
    eventsProduced: ['doctor.created', 'doctor.updated'],
    eventsConsumed: [],
    dependencies: ['tenant', 'rbac', 'audit'],
    permissions: ['manage_lab', 'view_patients'],
    subscriptionEntitlements: [],
    failureBehavior: 'Default referral to Self / Walk-in if doctor missing',
    auditRequirements: ['CREATE_DOCTOR', 'UPDATE_DOCTOR'],
    securityRequirements: ['Tenant isolation by lab_id'],
    testSuite: 'test:core'
  },

  test_master: {
    moduleName: 'Test & Parameter Master',
    owner: 'MASTER_DATA',
    layer: 2,
    purpose: 'Diagnostic test catalog, parameters, biological reference intervals, and critical ranges',
    responsibilities: ['test catalog', 'parameters', 'reference ranges by age/gender', 'critical alert bounds'],
    tablesOwned: ['tests', 'parameters', 'reference_ranges', 'test_categories', 'sample_types'],
    apisOwned: ['/api/tests', '/api/tests/categories', '/api/sample-types'],
    eventsProduced: ['test.created', 'test.updated'],
    eventsConsumed: [],
    dependencies: ['tenant', 'rbac', 'audit'],
    permissions: ['manage_tests', 'manage_global_tests'],
    subscriptionEntitlements: [],
    failureBehavior: 'Strict schema validation; prevent ordering inactive tests',
    auditRequirements: ['CREATE_TEST', 'UPDATE_REFERENCE_RANGE', 'UPDATE_CRITICAL_RANGE'],
    securityRequirements: ['Versioned changes to biological ranges'],
    testSuite: 'test:core'
  },

  pricing: {
    moduleName: 'Pricing & Package Engine',
    owner: 'MASTER_DATA',
    layer: 2,
    purpose: 'Test pricing, branch price schedules, health packages, and promotional discounts',
    responsibilities: ['base pricing', 'branch fee schedules', 'health check packages', 'discount ceilings'],
    tablesOwned: ['test_packages', 'package_tests', 'branch_pricing', 'pricing_rules'],
    apisOwned: ['/api/pricing-engine/calculate', '/api/pricing-engine/test-profitability'],
    eventsProduced: [],
    eventsConsumed: ['test.updated'],
    dependencies: ['test_master', 'organization'],
    permissions: ['manage_tests', 'manage_billing'],
    subscriptionEntitlements: [],
    failureBehavior: 'Fallback to test base_price if branch override missing',
    auditRequirements: ['UPDATE_TEST_PRICE', 'CREATE_PACKAGE', 'UPDATE_BRANCH_PRICE'],
    securityRequirements: ['Discount limits enforced by user role'],
    testSuite: 'test:phase9'
  },

  // --------------------------------------------------------------------------
  // LAYER 3: LIS OPERATIONS
  // --------------------------------------------------------------------------
  order: {
    moduleName: 'Test Order Engine',
    owner: 'LIS_OPERATIONS',
    layer: 3,
    purpose: 'Clinical order intake, test selections, priority tracking, and accessioning triggers',
    responsibilities: ['order booking', 'order items', 'priority (STAT/Routine)', 'status transitions'],
    tablesOwned: ['test_orders', 'order_items'],
    apisOwned: ['/api/orders', '/api/orders/:id', '/api/orders/:id/status'],
    eventsProduced: ['order.created', 'order.updated', 'order.cancelled'],
    eventsConsumed: [],
    dependencies: ['patient', 'doctor', 'test_master', 'pricing', 'tenant'],
    permissions: ['create_order', 'view_orders'],
    subscriptionEntitlements: [],
    failureBehavior: 'Rollback order if mandatory patient or test invalid',
    auditRequirements: ['CREATE_ORDER', 'CANCEL_ORDER', 'UPDATE_ORDER_PRIORITY'],
    securityRequirements: ['Tenant isolation, sequential order numbers (ORD-YYYY-XXXXXX)'],
    testSuite: 'test:core'
  },

  sample: {
    moduleName: 'Sample & Specimen Lifecycle',
    owner: 'LIS_OPERATIONS',
    layer: 3,
    purpose: 'Specimen accessioning, tube collection, routing, aliquots, and rejection tracking',
    responsibilities: ['sample accession', 'collection status', 'rejection reasons', 'tube routing'],
    tablesOwned: ['samples', 'sample_rejections', 'sample_tracking_events'],
    apisOwned: ['/api/samples', '/api/samples/collect', '/api/samples/reject', '/api/samples/receive'],
    eventsProduced: ['sample.collected', 'sample.received', 'sample.rejected'],
    eventsConsumed: ['order.created'],
    dependencies: ['order', 'patient', 'test_master'],
    permissions: ['collect_sample', 'enter_results'],
    subscriptionEntitlements: [],
    failureBehavior: 'Block downstream processing if sample status is rejected',
    auditRequirements: ['COLLECT_SAMPLE', 'REJECT_SAMPLE', 'TRANSFER_SAMPLE'],
    securityRequirements: ['Barcode integrity, specimen chain of custody'],
    testSuite: 'test:core'
  },

  barcode: {
    moduleName: 'Barcode Engine',
    owner: 'LIS_OPERATIONS',
    layer: 3,
    purpose: 'Specimen tube barcode generation, validation, Code128 / QR rendering, and scan tracking',
    responsibilities: ['barcode format (SMP-YYYY-XXXXXX)', 'barcode label payload', 'scan events'],
    tablesOwned: [],
    apisOwned: ['/api/samples/barcode/:barcode'],
    eventsProduced: [],
    eventsConsumed: ['sample.collected'],
    dependencies: ['sample'],
    permissions: ['collect_sample'],
    subscriptionEntitlements: [],
    failureBehavior: 'Reject malformed or duplicate barcodes',
    auditRequirements: ['PRINT_BARCODE'],
    securityRequirements: ['No sensitive patient PII embedded in tube barcode'],
    testSuite: 'test:core'
  },

  result: {
    moduleName: 'Result Observation Engine',
    owner: 'LIS_OPERATIONS',
    layer: 3,
    purpose: 'Clinical numerical/text results, formula calculations, delta checks, and panic flags',
    responsibilities: ['result entry', 'auto calculations (e.g. LDL)', 'delta check vs baseline', 'panic range flagging'],
    tablesOwned: ['test_results'],
    apisOwned: ['/api/results', '/api/results/batch', '/api/results/:id'],
    eventsProduced: ['result.entered', 'result.updated', 'critical.result.detected'],
    eventsConsumed: ['sample.collected'],
    dependencies: ['test_master', 'sample'],
    permissions: ['enter_results', 'manage_results'],
    subscriptionEntitlements: [],
    failureBehavior: 'Flag abnormal/critical observations immediately; save draft for review',
    auditRequirements: ['ENTER_RESULT', 'EDIT_RESULT_VALUE', 'TRIGGER_CRITICAL_ALERT'],
    securityRequirements: ['Once verified, direct result modification is locked'],
    testSuite: 'test:core'
  },

  verification: {
    moduleName: 'Technical Verification Desk',
    owner: 'LIS_OPERATIONS',
    layer: 3,
    purpose: 'Technical validation of observed results against QC, delta history, and plausibility rules',
    responsibilities: ['technical review', 'delta verification', 'QC validation correlation'],
    tablesOwned: ['result_verifications'],
    apisOwned: ['/api/results/verify', '/api/results/batch-verify'],
    eventsProduced: ['result.verified'],
    eventsConsumed: ['result.entered', 'qc.failed'],
    dependencies: ['result', 'test_master'],
    permissions: ['verify_results'],
    subscriptionEntitlements: [],
    failureBehavior: 'Reject verification if associated QC run is invalid or pending',
    auditRequirements: ['VERIFY_RESULTS', 'REJECT_RESULTS_TO_RERUN'],
    securityRequirements: ['Only authorized Technicians/Pathologists can verify'],
    testSuite: 'test:core'
  },

  approval: {
    moduleName: 'Pathologist Approval & Release',
    owner: 'LIS_OPERATIONS',
    layer: 3,
    purpose: 'Clinical sign-off, digital signature binding, report certification, and clinical amendments',
    responsibilities: ['pathologist review', 'digital signature', 'report certification', 'amendment notes'],
    tablesOwned: ['reports', 'report_amendments'],
    apisOwned: ['/api/reports/approve', '/api/reports/amend'],
    eventsProduced: ['report.approved', 'report.released', 'report.amended'],
    eventsConsumed: ['result.verified'],
    dependencies: ['verification', 'rbac'],
    permissions: ['approve_report'],
    subscriptionEntitlements: [],
    failureBehavior: 'Approval blocked if any mandatory parameter result is missing',
    auditRequirements: ['APPROVE_REPORT', 'AMEND_REPORT'],
    securityRequirements: ['Digital signature verification token, immutable released version'],
    testSuite: 'test:core'
  },

  report: {
    moduleName: 'Diagnostic Report Engine',
    owner: 'LIS_OPERATIONS',
    layer: 3,
    purpose: 'NABL/ISO PDF rendering, template customization, public QR verification, and distribution',
    responsibilities: ['PDF layout rendering', 'NABL compliance header/footer', 'QR cryptographic token', 'release gating'],
    tablesOwned: ['report_templates'],
    apisOwned: ['/api/reports/:id/pdf', '/api/reports/preview', '/api/verify/:token'],
    eventsProduced: [],
    eventsConsumed: ['report.approved'],
    dependencies: ['patient', 'doctor', 'order', 'result', 'approval', 'tenant'],
    permissions: ['print_report'],
    subscriptionEntitlements: [],
    failureBehavior: 'Serve unreleased watermark if report is not yet approved by Pathologist',
    auditRequirements: ['DOWNLOAD_REPORT', 'PUBLIC_QR_VERIFICATION'],
    securityRequirements: ['Cryptographic verification token; zero clinical result mutation during rendering'],
    testSuite: 'test:core'
  },

  // --------------------------------------------------------------------------
  // LAYER 4: SPECIALIZED CLINICAL & OPERATIONAL SERVICES
  // --------------------------------------------------------------------------
  analyzer: {
    moduleName: 'Analyzer Integration',
    owner: 'ANALYZER_QUALITY',
    layer: 4,
    purpose: 'Bidirectional analyzer interfacing, ASTM / HL7 protocols, and automated result importation',
    responsibilities: ['analyzer driver registry', 'message parsing', 'barcode mapping', 'raw communication logs'],
    tablesOwned: ['analyzers', 'analyzer_mappings', 'analyzer_raw_logs'],
    apisOwned: ['/api/analyzers', '/api/hl7/v2/message'],
    eventsProduced: ['analyzer.connected', 'analyzer.disconnected', 'analyzer.result_imported'],
    eventsConsumed: [],
    dependencies: ['test_master', 'sample'],
    permissions: ['manage_lab'],
    subscriptionEntitlements: [],
    failureBehavior: 'Buffer incoming analyzer messages to dead-letter storage during outages',
    auditRequirements: ['REGISTER_ANALYZER', 'IMPORT_ANALYZER_RESULTS'],
    securityRequirements: ['Isolated parser sandbox, checksum validation'],
    testSuite: 'test:core'
  },

  qc: {
    moduleName: 'Quality Control (QC)',
    owner: 'ANALYZER_QUALITY',
    layer: 4,
    purpose: 'Internal Quality Control, Levey-Jennings charts, Westgard multi-rules, and lot validation',
    responsibilities: ['QC lots & levels', 'daily QC runs', 'Westgard evaluation (1-3s, 2-2s, R-4s)', 'corrective actions'],
    tablesOwned: ['qc_materials', 'qc_runs', 'qc_corrective_actions'],
    apisOwned: ['/api/qc/materials', '/api/qc/runs', '/api/qc/levey-jennings'],
    eventsProduced: ['qc.failed'],
    eventsConsumed: ['analyzer.result_imported'],
    dependencies: ['analyzer', 'test_master'],
    permissions: ['manage_lab', 'enter_results'],
    subscriptionEntitlements: [],
    failureBehavior: 'Raise automated alert and flag analyzer when Westgard violation occurs',
    auditRequirements: ['LOG_QC_RUN', 'RECORD_CORRECTIVE_ACTION'],
    securityRequirements: ['Immutable QC historical log'],
    testSuite: 'test:phase4'
  },

  inventory: {
    moduleName: 'Inventory & Reagents',
    owner: 'INVENTORY_PROCUREMENT',
    layer: 4,
    purpose: 'Reagents and consumables stock tracking, lot tracking, expiry alerts, and auto-consumption',
    responsibilities: ['stock balance', 'lot expiration tracking', 'test consumption deduction', 'minimum stock threshold'],
    tablesOwned: ['inventory_items', 'stock_batches', 'stock_transactions'],
    apisOwned: ['/api/inventory', '/api/inventory/batches', '/api/inventory/consume'],
    eventsProduced: ['stock.low', 'stock.expiring'],
    eventsConsumed: ['test.updated'],
    dependencies: ['organization'],
    permissions: ['manage_lab'],
    subscriptionEntitlements: [],
    failureBehavior: 'Allow emergency override with warning if stock depleted during test',
    auditRequirements: ['RECEIVE_STOCK', 'ADJUST_STOCK', 'DISCARD_EXPIRED_STOCK'],
    securityRequirements: ['FIFO lot enforcement'],
    testSuite: 'test:phase5'
  },

  procurement: {
    moduleName: 'Procurement & Purchase Orders',
    owner: 'INVENTORY_PROCUREMENT',
    layer: 4,
    purpose: 'Supplier registry, purchase requests, purchase orders, and goods receipt verification',
    responsibilities: ['supplier directory', 'purchase orders (PO)', 'goods receipts note (GRN)', 'supplier invoices'],
    tablesOwned: ['suppliers', 'purchase_orders', 'purchase_order_items', 'goods_receipts'],
    apisOwned: ['/api/procurement/suppliers', '/api/procurement/orders', '/api/procurement/goods-receipt'],
    eventsProduced: ['purchase_order.created', 'goods_receipt.completed'],
    eventsConsumed: ['stock.low'],
    dependencies: ['inventory', 'organization'],
    permissions: ['manage_lab'],
    subscriptionEntitlements: [],
    failureBehavior: 'Hold PO for manager authorization if amount exceeds branch limit',
    auditRequirements: ['CREATE_PO', 'APPROVE_PO', 'COMPLETE_GRN'],
    securityRequirements: ['Dual-authorization for procurement spend'],
    testSuite: 'test:phase9'
  },

  field_services: {
    moduleName: 'Home Collection & Field Services',
    owner: 'CUSTOMER_OPERATIONS',
    layer: 4,
    purpose: 'Home sample collection scheduling, phlebotomist route dispatch, and field kit accessioning',
    responsibilities: ['home collection booking', 'phlebotomist assignment', 'slot allocation', 'field collection verification'],
    tablesOwned: ['home_collection_requests', 'phlebotomists'],
    apisOwned: ['/api/field-services/home-collection', '/api/field-services/home-collection/:id/status'],
    eventsProduced: ['home_collection.requested', 'home_collection.completed'],
    eventsConsumed: ['order.created'],
    dependencies: ['patient', 'order', 'tenant'],
    permissions: ['create_order', 'collect_sample'],
    subscriptionEntitlements: [],
    failureBehavior: 'Reschedule slot if phlebotomist unavailable',
    auditRequirements: ['BOOK_HOME_COLLECTION', 'ASSIGN_PHLEBOTOMIST', 'COMPLETE_FIELD_COLLECTION'],
    securityRequirements: ['Patient address privacy, phlebotomist authentication'],
    testSuite: 'test:phase9'
  },

  crm: {
    moduleName: 'CRM & Corporate Client Management',
    owner: 'CUSTOMER_OPERATIONS',
    layer: 4,
    purpose: 'Corporate wellness accounts, health camp campaigns, doctor relationship tracking, and lead retention',
    responsibilities: ['corporate contracts', 'health camps', 'referral campaigns', 'client feedback'],
    tablesOwned: ['corporate_clients', 'health_camps', 'doctor_engagements'],
    apisOwned: ['/api/crm/corporate-clients', '/api/crm/health-camps'],
    eventsProduced: [],
    eventsConsumed: ['order.created', 'patient.created'],
    dependencies: ['patient', 'doctor'],
    permissions: ['manage_lab'],
    subscriptionEntitlements: [],
    failureBehavior: 'CRM failures do not impact laboratory diagnostics or billing',
    auditRequirements: ['CREATE_CORPORATE_CLIENT', 'LAUNCH_CAMPAIGN'],
    securityRequirements: ['Corporate employee list isolation'],
    testSuite: 'test:phase9'
  },

  automation: {
    moduleName: 'Automation Engine',
    owner: 'ANALYZER_QUALITY',
    layer: 4,
    purpose: 'Configurable event-driven rule execution, critical result escalation, auto-validation, and alerts',
    responsibilities: ['trigger-condition-action rules', 'critical alert broadcast', 'scheduled job execution'],
    tablesOwned: ['automation_rules', 'automation_execution_logs'],
    apisOwned: ['/api/automation/rules', '/api/automation/evaluate'],
    eventsProduced: [],
    eventsConsumed: ['critical.result.detected', 'order.created', 'stock.low', 'qc.failed'],
    dependencies: ['DomainEventBus'],
    permissions: ['manage_lab'],
    subscriptionEntitlements: [],
    failureBehavior: 'Log rule failure without halting primary business transaction',
    auditRequirements: ['CREATE_AUTOMATION_RULE', 'TRIGGER_ACTION'],
    securityRequirements: ['Execution sandbox with timeout limit'],
    testSuite: 'test:phase9'
  },

  // --------------------------------------------------------------------------
  // LAYER 5: BUSINESS SERVICES
  // --------------------------------------------------------------------------
  billing: {
    moduleName: 'Clinical Billing & Invoicing',
    owner: 'FINANCE',
    layer: 5,
    purpose: 'Patient invoicing, itemized test pricing, payments, refunds, discounts, and payment gateways',
    responsibilities: ['invoice generation', 'multi-mode payments (Cash, UPI, Card)', 'refund processing', 'discount verification'],
    tablesOwned: ['invoices', 'invoice_items', 'payments', 'refunds'],
    apisOwned: ['/api/billing/invoices', '/api/billing/payments', '/api/billing/refunds'],
    eventsProduced: ['invoice.created', 'payment.completed', 'payment.failed', 'refund.completed'],
    eventsConsumed: ['order.created'],
    dependencies: ['order', 'pricing', 'tenant'],
    permissions: ['manage_billing', 'receive_payments'],
    subscriptionEntitlements: [],
    failureBehavior: 'Maintain unpaid invoice state if payment fails; never cancel order automatically',
    auditRequirements: ['GENERATE_INVOICE', 'PROCESS_PAYMENT', 'ISSUE_REFUND', 'APPLY_DISCOUNT'],
    securityRequirements: ['Immutable payment receipt sequence, payment gateway webhook signature check'],
    testSuite: 'test:core'
  },

  accounting: {
    moduleName: 'Financial Accounting & General Ledger',
    owner: 'FINANCE',
    layer: 5,
    purpose: 'Double-entry accounting, receivables aging, branch expense ledger, and GST tax statements',
    responsibilities: ['chart of accounts', 'journal entries', 'accounts receivable aging', 'GST reports'],
    tablesOwned: ['accounting_accounts', 'journal_entries', 'expense_records'],
    apisOwned: ['/api/accounting/ledger', '/api/accounting/expenses', '/api/accounting/ar-aging'],
    eventsProduced: [],
    eventsConsumed: ['invoice.created', 'payment.completed', 'goods_receipt.completed'],
    dependencies: ['billing', 'procurement'],
    permissions: ['manage_billing'],
    subscriptionEntitlements: [],
    failureBehavior: 'Asynchronous journal batch post; retry on database lock',
    auditRequirements: ['RECORD_JOURNAL_ENTRY', 'CLOSE_FINANCIAL_PERIOD'],
    securityRequirements: ['Balanced debits and credits required for all entries'],
    testSuite: 'test:phase6'
  },

  notification: {
    moduleName: 'Communication & Notifications',
    owner: 'COMMUNICATION',
    layer: 5,
    purpose: 'Multi-channel messaging via SMS, WhatsApp, and Email with delivery status and retries',
    responsibilities: ['message templates', 'gateway integrations (Msg91, WhatsApp Cloud, SMTP)', 'retry queue'],
    tablesOwned: ['notification_logs', 'communication_templates'],
    apisOwned: ['/api/communication/send', '/api/notifications'],
    eventsProduced: [],
    eventsConsumed: ['order.created', 'critical.result.detected', 'report.released', 'payment.completed'],
    dependencies: ['DomainEventBus'],
    permissions: ['manage_lab'],
    subscriptionEntitlements: [],
    failureBehavior: 'Queue retry up to 3 times; notification failure NEVER aborts clinical actions',
    auditRequirements: ['DISPATCH_NOTIFICATION', 'UPDATE_DELIVERY_STATUS'],
    securityRequirements: ['Mask patient PII in SMS/WhatsApp previews'],
    testSuite: 'test:core'
  },

  analytics: {
    moduleName: 'Reporting & Operational Analytics',
    owner: 'REPORTING_ANALYTICS',
    layer: 5,
    purpose: 'Operational dashboards, turn-around-time (TAT) analysis, revenue BI, and compliance reports',
    responsibilities: ['KPI rollups', 'TAT tracking by department', 'test volume BI', 'branch comparison'],
    tablesOwned: ['analytics_snapshots'],
    apisOwned: ['/api/analytics/dashboard', '/api/analytics/reports/catalog', '/api/analytics/tat'],
    eventsProduced: [],
    eventsConsumed: ['*'],
    dependencies: ['DomainEventBus'],
    permissions: ['view_analytics', 'view_system_analytics'],
    subscriptionEntitlements: [],
    failureBehavior: 'Serve cached rollup if live query times out; never block write path',
    auditRequirements: ['EXPORT_ANALYTICS_REPORT'],
    securityRequirements: ['Strict tenant isolation; read-only operations'],
    testSuite: 'test:core'
  },

  // --------------------------------------------------------------------------
  // LAYER 6: ADVANCED PLATFORM SERVICES
  // --------------------------------------------------------------------------
  ai_clinical: {
    moduleName: 'AI Clinical & Predictive Hub',
    owner: 'AI',
    layer: 6,
    purpose: 'Non-authoritative clinical suggestions, delta anomaly detection, and reagent demand forecasting',
    responsibilities: ['anomaly detection', 'clinical impression suggestions', 'workload prediction'],
    tablesOwned: ['ai_insights', 'ai_audit_logs'],
    apisOwned: ['/api/ai/suggest', '/api/ai/analyze-results', '/api/ai/predict-demand'],
    eventsProduced: [],
    eventsConsumed: ['result.entered', 'stock.low'],
    dependencies: ['result', 'qc'],
    permissions: ['manage_results', 'approve_report'],
    subscriptionEntitlements: ['ai_clinical_copilot'],
    failureBehavior: 'AI unavailability has ZERO impact on standard clinical workflow',
    auditRequirements: ['GENERATE_AI_SUGGESTION', 'ACCEPT_AI_SUGGESTION', 'REJECT_AI_SUGGESTION'],
    securityRequirements: ['AI NEVER releases or approves reports; suggestions marked explicitly'],
    testSuite: 'test:phase7'
  },

  subscriptions: {
    moduleName: 'SaaS Platform & Subscriptions',
    owner: 'SAAS_PLATFORM',
    layer: 6,
    purpose: 'Tenant subscription plans, feature quotas, license renewals, and quota enforcement',
    responsibilities: ['plan tiers', 'feature gating', 'monthly test quota tracking', 'tenant suspension'],
    tablesOwned: ['subscription_plans', 'subscriptions', 'plan_features', 'tenant_usage'],
    apisOwned: ['/api/subscriptions', '/api/subscriptions/plans', '/api/subscriptions/assign'],
    eventsProduced: ['subscription.created', 'subscription.expiring', 'subscription.suspended'],
    eventsConsumed: ['payment.completed'],
    dependencies: ['organization', 'billing'],
    permissions: ['manage_subscriptions'],
    subscriptionEntitlements: [],
    failureBehavior: 'Grace period enforcement before suspending tenant operations',
    auditRequirements: ['CREATE_PLAN', 'ASSIGN_SUBSCRIPTION', 'SUSPEND_TENANT'],
    securityRequirements: ['Super admin only for plan provisioning'],
    testSuite: 'test:billing'
  },

  developer_api: {
    moduleName: 'Integration Platform & Developer API',
    owner: 'INTEGRATION_PLATFORM',
    layer: 6,
    purpose: 'External REST APIs, API keys, webhook subscriptions, and OAuth client management',
    responsibilities: ['API key generation', 'rate limiting by key', 'webhook delivery engine', 'signature verification'],
    tablesOwned: ['api_keys', 'webhook_endpoints', 'webhook_deliveries'],
    apisOwned: ['/api/developer/keys', '/api/developer/webhooks', '/api/v1/*'],
    eventsProduced: [],
    eventsConsumed: ['order.created', 'report.released', 'critical.result.detected'],
    dependencies: ['auth', 'tenant'],
    permissions: ['manage_lab'],
    subscriptionEntitlements: ['developer_api_access'],
    failureBehavior: 'Webhook delivery retry with exponential backoff; dead-letter queue on failure',
    auditRequirements: ['GENERATE_API_KEY', 'REVOKE_API_KEY', 'CREATE_WEBHOOK'],
    securityRequirements: ['HMAC SHA-256 signatures on webhooks; hashed API keys in database'],
    testSuite: 'test:phase7'
  },

  mobile_sync: {
    moduleName: 'Mobile Offline & Sync Center',
    owner: 'MOBILE',
    layer: 6,
    purpose: 'Offline data caching, mobile session registration, delta syncing, and conflict resolution',
    responsibilities: ['device registry', 'offline sync queue', 'delta synchronization', 'conflict resolution'],
    tablesOwned: ['mobile_devices', 'mobile_sync_events'],
    apisOwned: ['/api/mobile/sync', '/api/mobile/devices'],
    eventsProduced: [],
    eventsConsumed: [],
    dependencies: ['auth', 'patient', 'sample'],
    permissions: ['collect_sample'],
    subscriptionEntitlements: [],
    failureBehavior: 'Server-side clinical truth wins on conflict',
    auditRequirements: ['REGISTER_DEVICE', 'SYNC_OFFLINE_BATCH'],
    securityRequirements: ['Encrypted local storage on device; remote wipe capability'],
    testSuite: 'test:phase7'
  },

  // --------------------------------------------------------------------------
  // LAYER 7: RELIABILITY & GOVERNANCE
  // --------------------------------------------------------------------------
  security: {
    moduleName: 'Security & Compliance Center',
    owner: 'SECURITY_GOVERNANCE',
    layer: 7,
    purpose: 'Security posture telemetry, IP whitelisting, suspicious login detection, and compliance auditing',
    responsibilities: ['security incident tracking', 'failed login analysis', 'session revocations'],
    tablesOwned: ['security_incidents', 'ip_whitelist'],
    apisOwned: ['/api/security-center/posture', '/api/security-center/incidents'],
    eventsProduced: ['security.alert_triggered'],
    eventsConsumed: ['*'],
    dependencies: ['auth', 'tenant', 'audit'],
    permissions: ['manage_system_settings'],
    subscriptionEntitlements: [],
    failureBehavior: 'Lock account automatically upon 5 failed attempts in 15 minutes',
    auditRequirements: ['RESOLVE_INCIDENT', 'UPDATE_SECURITY_POLICY'],
    securityRequirements: ['Zero trust principles; encrypted secrets at rest'],
    testSuite: 'test:security'
  },

  backup_dr: {
    moduleName: 'DevOps, Backup & Disaster Recovery',
    owner: 'DEVOPS_RELIABILITY',
    layer: 7,
    purpose: 'Scheduled and on-demand database snapshots, snapshot validation, and restore workflows',
    responsibilities: ['backup creation', 'integrity validation', 'disaster recovery restore', 'storage retention'],
    tablesOwned: ['system_backups'],
    apisOwned: ['/api/backup', '/api/backup/create', '/api/backup/:id/restore'],
    eventsProduced: [],
    eventsConsumed: [],
    dependencies: ['Infrastructure'],
    permissions: ['manage_backup', 'manage_system_settings'],
    subscriptionEntitlements: [],
    failureBehavior: 'Alert system operator immediately if scheduled backup fails',
    auditRequirements: ['CREATE_BACKUP', 'RESTORE_BACKUP'],
    securityRequirements: ['Encrypted backup snapshots; verify checksum before restore'],
    testSuite: 'test:core'
  }
};

// ============================================================================
// ENRICH MANIFESTS WITH SECTION 2 MODULE BOUNDARY STANDARDS
// ============================================================================

for (const [key, mod] of Object.entries(MODULE_REGISTRY)) {
  mod.moduleId = key;
  mod.businessPurpose = mod.businessPurpose || mod.purpose || '';
  mod.nonResponsibilities = mod.nonResponsibilities || [
    'No direct mutation of foreign module tables',
    'No cross-module business logic duplication',
    'No unversioned breaking changes'
  ];
  mod.tablesReadIndirectly = mod.tablesReadIndirectly || [];
  mod.apisExposed = mod.apisExposed || mod.apisOwned || [];
  mod.apisConsumed = mod.apisConsumed || [];
  mod.validationRules = mod.validationRules || [
    'Strict input schema validation',
    'Tenant boundary bounding',
    'RBAC permission enforcement'
  ];
  mod.retryBehavior = mod.retryBehavior || 'Exponential backoff (max 3 retries, initial delay 200ms)';
  mod.transactionBoundaries = mod.transactionBoundaries || 'Single local domain transaction with domain event dispatch';
  mod.testRequirements = mod.testRequirements || 'Automated contract, unit, and isolation test coverage';
  mod.versioningStrategy = mod.versioningStrategy || 'Semantic versioning (/api/v1/ with deprecation headers)';
  mod.healthStatus = mod.healthStatus || 'healthy';
}

/**
 * Validates whether a proposed dependency from dependentModule -> targetModule
 * conforms to the dependency layer direction rule (Lower layer must never depend on higher layer).
 */
export function validateDependencyDirection(dependentKey: string, targetKey: string): { valid: boolean; reason?: string } {
  const dependent = MODULE_REGISTRY[dependentKey];
  const target = MODULE_REGISTRY[targetKey];

  if (!dependent) return { valid: false, reason: `Unknown dependent module: ${dependentKey}` };
  if (!target) return { valid: false, reason: `Unknown target module: ${targetKey}` };

  if (dependent.layer < target.layer) {
    return {
      valid: false,
      reason: `Architectural Violation: Layer ${dependent.layer} module '${dependent.moduleName}' cannot depend on Layer ${target.layer} module '${target.moduleName}'. Lower layers must never depend on higher layers.`
    };
  }

  return { valid: true };
}

/**
 * Validates that every table in the system is owned by exactly ONE module (Section 1 & 48).
 */
export function validateSingleTableOwnership(): { valid: boolean; duplicates: Array<{ table: string; owner1: string; owner2: string }> } {
  const tableMap = new Map<string, string>();
  const duplicates: Array<{ table: string; owner1: string; owner2: string }> = [];

  for (const [key, mod] of Object.entries(MODULE_REGISTRY)) {
    for (const table of mod.tablesOwned || []) {
      const cleanTable = table.trim().toLowerCase();
      if (tableMap.has(cleanTable)) {
        duplicates.push({ table: cleanTable, owner1: tableMap.get(cleanTable)!, owner2: key });
      } else {
        tableMap.set(cleanTable, key);
      }
    }
  }

  return {
    valid: duplicates.length === 0,
    duplicates
  };
}

/**
 * Get all registered module manifests as an array.
 */
export function getAllModuleManifests(): ModuleContract[] {
  return Object.values(MODULE_REGISTRY);
}

/**
 * Get module manifest by ID.
 */
export function getModuleManifest(moduleId: string): ModuleContract | undefined {
  return MODULE_REGISTRY[moduleId];
}

