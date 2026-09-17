"use strict";
/**
 * Module Ownership & Dependency Architecture — Contracts & Domain Events
 * MediFlow LIS & Multi-Tenant SaaS Platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUSINESS_TRUTH_OWNERS = void 0;
// ============================================================================
// 2. AUTHORITATIVE BUSINESS TRUTH REGISTRY (Section 48)
// ============================================================================
exports.BUSINESS_TRUTH_OWNERS = {
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
};
