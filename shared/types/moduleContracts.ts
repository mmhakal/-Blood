/**
 * Module Ownership & Dependency Architecture — Contracts & Domain Events
 * MediFlow LIS & Multi-Tenant SaaS Platform
 */

// ============================================================================
// 1. MODULE DOMAIN & LAYER DEFINITIONS
// ============================================================================

export type ModuleDomain =
  | 'PLATFORM_CORE'
  | 'MASTER_DATA'
  | 'LIS_OPERATIONS'
  | 'FINANCE'
  | 'INVENTORY_PROCUREMENT'
  | 'ANALYZER_QUALITY'
  | 'CUSTOMER_OPERATIONS'
  | 'COMMUNICATION'
  | 'REPORTING_ANALYTICS'
  | 'AI'
  | 'SAAS_PLATFORM'
  | 'INTEGRATION_PLATFORM'
  | 'SECURITY_GOVERNANCE'
  | 'DEVOPS_RELIABILITY'
  | 'MOBILE';

export type DependencyLayer =
  | 0 // Layer 0: Infrastructure
  | 1 // Layer 1: Platform Core
  | 2 // Layer 2: Master Data
  | 3 // Layer 3: LIS Operations
  | 4 // Layer 4: Specialized Clinical/Operational Services
  | 5 // Layer 5: Business Services
  | 6 // Layer 6: Advanced Platform Services
  | 7; // Layer 7: Reliability & Release

// ============================================================================
// 2. AUTHORITATIVE BUSINESS TRUTH REGISTRY (Section 48)
// ============================================================================

export const BUSINESS_TRUTH_OWNERS = {
  USER_IDENTITY: 'PLATFORM_CORE.auth',
  ACCESS_PERMISSION: 'PLATFORM_CORE.rbac',
  ORGANIZATION: 'PLATFORM_CORE.organization',
  PATIENT_IDENTITY: 'MASTER_DATA.patient',
  DOCTOR_IDENTITY: 'MASTER_DATA.doctor',
  TEST_DEFINITION: 'MASTER_DATA.test_master',
  PRICE: 'MASTER_DATA.pricing',
  ORDER: 'LIS_OPERATIONS.order',
  SAMPLE_STATUS: 'LIS_OPERATIONS.sample',
  ANALYZER_RESULT: 'ANALYZER_QUALITY.analyzer',
  CLINICAL_RESULT: 'LIS_OPERATIONS.result',
  VERIFICATION: 'LIS_OPERATIONS.verification',
  APPROVAL: 'LIS_OPERATIONS.approval',
  RELEASED_REPORT: 'LIS_OPERATIONS.report',
  INVOICE: 'FINANCE.billing',
  PAYMENT: 'FINANCE.billing',
  STOCK: 'INVENTORY_PROCUREMENT.inventory',
  SUPPLIER: 'INVENTORY_PROCUREMENT.procurement',
  QC_RESULT: 'ANALYZER_QUALITY.qc',
  SUBSCRIPTION: 'SAAS_PLATFORM.subscriptions',
  AI_SUGGESTION: 'AI.clinical_ai',
  AUDIT_EVENT: 'SECURITY_GOVERNANCE.audit',
  SECURITY_EVENT: 'SECURITY_GOVERNANCE.security',
} as const;

export type BusinessTruthKey = keyof typeof BUSINESS_TRUTH_OWNERS;
export type BusinessTruthOwner = typeof BUSINESS_TRUTH_OWNERS[BusinessTruthKey];

// ============================================================================
// 3. DOMAIN EVENTS SPECIFICATION (Section 26, 37)
// ============================================================================

export type DomainEventType =
  | '*' // Wildcard subscription (Audit / Telemetry stream)
  // Master Data Events
  | 'patient.created'
  | 'patient.updated'
  | 'doctor.created'
  | 'doctor.updated'
  | 'test.created'
  | 'test.updated'
  // LIS Operations Events
  | 'order.created'
  | 'order.updated'
  | 'order.cancelled'
  | 'order.status_changed'
  | 'sample.collected'
  | 'sample.received'
  | 'sample.rejected'
  | 'result.entered'
  | 'result.updated'
  | 'result.draft_saved'
  | 'result.verified'
  | 'result.locked'
  | 'critical.result.detected'
  | 'report.generated'
  | 'report.approved'
  | 'report.released'
  | 'report.amended'
  // Finance Events
  | 'invoice.created'
  | 'invoice.updated'
  | 'payment.completed'
  | 'payment.failed'
  | 'refund.completed'
  | 'discount.applied'
  // Accounting Events
  | 'ledger.entry_recorded'
  | 'cash_closing.completed'
  // Inventory & Procurement Events
  | 'stock.reserved'
  | 'stock.consumed'
  | 'stock.released'
  | 'stock.adjusted'
  | 'stock.low'
  | 'stock.expiring'
  | 'purchase_order.created'
  | 'goods_receipt.completed'
  // Analyzer & QC Events
  | 'analyzer.connected'
  | 'analyzer.disconnected'
  | 'analyzer.result_imported'
  | 'qc.passed'
  | 'qc.failed'
  // Customer & Field Operations
  | 'appointment.booked'
  | 'appointment.cancelled'
  | 'home_collection.requested'
  | 'home_collection.assigned'
  | 'home_collection.completed'
  // SaaS Events
  | 'subscription.created'
  | 'subscription.expiring'
  | 'subscription.suspended'
  | 'subscription.renewed'
  | 'entitlement.exceeded'
  // Integration & Security Events
  | 'ticket.created'
  | 'incident.created'
  | 'security.alert_triggered'
  | 'user.permission_changed';

/**
 * Standard 13-field Domain Event contract (Section 26) with backwards-compatibility aliases
 */
export interface DomainEvent<T = any> {
  eventId: string;
  eventType: DomainEventType;
  eventVersion: string;
  tenantId: string;
  organizationId?: string | null;
  branchId?: string | null;
  aggregateId: string;
  aggregateType: string;
  actorId?: string | null;
  timestamp: string;
  correlationId: string;
  causationId?: string | null;
  payload: T;

  // Backwards compatibility aliases
  id?: string;
  type?: DomainEventType;
  tenant_id?: string;
  branch_id?: string | null;
  actor_id?: string | null;
  actor_role?: string | null;
  correlation_id?: string;
  data?: T;
  metadata?: Record<string, any>;
}

// Typed payload contracts for core events
export interface OrderCreatedPayload {
  order_id: string;
  order_number: string;
  patient_id: string;
  patient_name: string;
  total_amount: number;
  test_ids: string[];
  branch_id?: string;
}

export interface SampleCollectedPayload {
  sample_id: string;
  order_id: string;
  barcode: string;
  sample_type: string;
  collected_by: string;
  collected_at: string;
}

export interface CriticalResultDetectedPayload {
  order_id: string;
  patient_id: string;
  patient_name: string;
  patient_mobile?: string;
  doctor_name?: string;
  test_name: string;
  parameter_name: string;
  observed_value: string | number;
  critical_range: string;
  flag: 'critical_high' | 'critical_low';
  lab_id: string;
}

export interface ReportApprovedPayload {
  report_id: string;
  order_id: string;
  patient_id: string;
  patient_name: string;
  report_number: string;
  approved_by_name: string;
  approved_at: string;
  lab_id: string;
}

export interface InvoiceCreatedPayload {
  invoice_id: string;
  invoice_number: string;
  order_id: string;
  patient_id: string;
  gross_amount: number;
  discount_amount: number;
  tax_amount: number;
  net_amount: number;
  paid_amount: number;
  balance_amount: number;
}

export interface QCFailedPayload {
  qc_run_id: string;
  analyzer_id: string;
  test_id: string;
  rule_violated: string; // e.g., '1-3s', '2-2s', 'R-4s'
  observed_value: number;
  mean: number;
  sd: number;
}

// ============================================================================
// 4. MODULE CONTRACT STANDARD (Section 2, 41)
// ============================================================================

export interface ModuleContract {
  moduleId?: string;
  moduleName: string;
  owner: ModuleDomain;
  layer: DependencyLayer;
  purpose?: string;
  businessPurpose?: string;
  responsibilities: string[];
  nonResponsibilities?: string[];
  tablesOwned: string[];
  tablesReadIndirectly?: string[];
  apisOwned?: string[];
  apisExposed?: string[];
  apisConsumed?: string[];
  eventsProduced: DomainEventType[];
  eventsConsumed: DomainEventType[];
  dependencies: string[];
  permissions: string[];
  subscriptionEntitlements: string[];
  externalIntegrations?: string[];
  validationRules?: string[];
  auditRequirements: string[];
  securityRequirements: string[];
  failureBehavior: string;
  retryBehavior?: string;
  transactionBoundaries?: string;
  testRequirements?: string;
  testSuite: string;
  versioningStrategy?: string;
  healthStatus?: 'healthy' | 'degraded' | 'offline';
}

// ============================================================================
// 5. AUDIT EVENT PAYLOAD STANDARD (Section 36, 37)
// ============================================================================

export interface StandardAuditPayload {
  actor: string;
  tenant: string;
  branch?: string | null;
  action: string;
  entity: string;
  entity_id: string;
  timestamp: string;
  request_id?: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  reason?: string;
  result: 'success' | 'failure';
}

// ============================================================================
// 6. API RESPONSE STANDARD (Section 24)
// ============================================================================

export interface StandardApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  message?: string;
  requestId: string;
  metadata?: {
    tenantId?: string;
    organizationId?: string;
    branchId?: string;
    userId?: string;
    timestamp: string;
    apiVersion: string;
    durationMs?: number;
  };
}
