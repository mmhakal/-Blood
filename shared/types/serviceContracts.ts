/**
 * Service Contract Interfaces — Explicit Cross-Module API Contracts
 * MediFlow LIS & Multi-Tenant SaaS Platform
 */

// ============================================================================
// 1. RESULT SERVICE CONTRACT (Section 6)
// ============================================================================

export interface ResultParameterInput {
  parameter_id: string;
  parameter_name: string;
  value: string | number;
  unit?: string;
  flag?: 'normal' | 'low' | 'high' | 'critical_low' | 'critical_high' | 'abnormal';
  is_critical?: boolean;
  remarks?: string;
}

export interface ResultEntryInput {
  order_id: string;
  order_item_id: string;
  test_id: string;
  parameters: ResultParameterInput[];
  clinical_remarks?: string;
  impression?: string;
  submit_for_verification?: boolean;
  critical_acknowledged?: boolean;
  reason?: string;
}

export interface ResultCalculationContext {
  test_id: string;
  parameters: Record<string, any>;
  patient_age?: number;
  patient_gender?: string;
}

export interface ResultHistoryRecord {
  id: string;
  result_id: string;
  parameter_id: string;
  parameter_name?: string;
  previous_value: string | null;
  new_value: string;
  modified_by: string;
  modified_by_name?: string;
  modified_at: string;
  reason?: string | null;
  version: number;
  lab_id: string;
}

export interface ResultComparisonRecord {
  parameter_id: string;
  parameter_name: string;
  current_value: string | number;
  current_date: string;
  previous_value: string | number | null;
  previous_date: string | null;
  delta_difference: number | null;
  delta_percent: number | null;
  is_significant_shift: boolean;
}

export interface IResultService {
  createResult(input: ResultEntryInput, actor: { id: string; name: string; role: string; lab_id: string }): Promise<any>;
  updateResult(resultId: string, input: Partial<ResultEntryInput>, actor: { id: string; name: string; role: string; lab_id: string }): Promise<any>;
  saveDraftResult(input: ResultEntryInput, actor: { id: string; name: string; role: string; lab_id: string }): Promise<any>;
  calculateResult(context: ResultCalculationContext): Promise<Record<string, any>>;
  validateResult(resultId: string, actor: { id: string; name: string; role: string; lab_id: string }): Promise<{ valid: boolean; flags: string[]; errors: string[] }>;
  lockResult(resultId: string, reason: string, actor: { id: string; name: string; role: string; lab_id: string }): Promise<{ success: boolean; status: string }>;
  getResultHistory(resultId: string, labId: string): Promise<ResultHistoryRecord[]>;
  comparePreviousResults(patientId: string, testId: string, currentValues: Record<string, any>): Promise<ResultComparisonRecord[]>;
}

// ============================================================================
// 2. VERIFICATION CONTRACT (Section 7)
// ============================================================================

export interface VerificationInput {
  result_id: string;
  verifier_id: string;
  verifier_name: string;
  verifier_role: string;
  verification_type: 'technical' | 'clinical' | 'auto';
  status: 'verified' | 'recheck_requested' | 'rejected';
  notes?: string;
  lab_id: string;
}

export interface IVerificationService {
  verifyResult(input: VerificationInput): Promise<{ success: boolean; status: string; verification_id: string }>;
  reverifyResult(resultId: string, notes: string, actor: { id: string; name: string; role: string; lab_id: string }): Promise<{ success: boolean; status: string }>;
  getAutoValidationStatus(resultId: string, labId: string): Promise<{ auto_validatable: boolean; rules_checked: number; violations: string[] }>;
  getVerificationHistory(resultId: string, labId: string): Promise<any[]>;
}

// ============================================================================
// 3. APPROVAL CONTRACT (Section 8)
// ============================================================================

export interface ApprovalDecisionInput {
  report_id: string;
  approver_id: string;
  approver_name: string;
  approver_role: string;
  decision: 'approved' | 'rejected' | 'rework';
  notes?: string;
  lab_id: string;
}

export interface IApprovalService {
  approveReport(input: ApprovalDecisionInput): Promise<{ success: boolean; report_id: string; status: string; digital_signature_id?: string }>;
  rejectReport(input: ApprovalDecisionInput): Promise<{ success: boolean; status: string; rework_assigned_to?: string }>;
  getApprovalWorkflow(labId: string, workflowType?: string): Promise<any>;
  getPendingApprovals(labId: string, role?: string): Promise<any[]>;
}

// ============================================================================
// 4. REPORT SERVICE CONTRACT (Section 9)
// ============================================================================

export interface ReportGenerationOptions {
  order_id: string;
  lab_id: string;
  branch_id?: string;
  generated_by: string;
  template_id?: string;
}

export interface IReportService {
  generateReport(options: ReportGenerationOptions): Promise<{ report_id: string; report_number: string; status: string }>;
  getReportPdf(reportId: string, labId: string): Promise<Buffer>;
  releaseReport(reportId: string, actor: { id: string; name: string; role: string; lab_id: string }): Promise<{ success: boolean; status: string; qr_code_url: string }>;
  verifyReportPublic(token: string): Promise<{ valid: boolean; report_number: string; patient_name: string; approved_at: string }>;
  getReportHistory(reportId: string, labId: string): Promise<any[]>;
}

// ============================================================================
// 5. BILLING CONTRACT (Section 10)
// ============================================================================

export interface InvoiceCalculationInput {
  order_id: string;
  items: Array<{ test_id: string; item_name: string; unit_price: number; quantity: number }>;
  discount_type?: 'fixed' | 'percentage';
  discount_value?: number;
  tax_rate?: number;
  lab_id: string;
}

export interface PaymentInput {
  invoice_id: string;
  order_id: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'upi' | 'insurance' | 'cheque';
  transaction_ref?: string;
  notes?: string;
  received_by: string;
  lab_id: string;
}

export interface IBillingService {
  createInvoice(input: InvoiceCalculationInput, actorId: string): Promise<any>;
  calculateInvoice(input: InvoiceCalculationInput): Promise<{ gross_amount: number; discount_amount: number; tax_amount: number; net_amount: number }>;
  recordPayment(input: PaymentInput): Promise<{ receipt_number: string; balance_amount: number; payment_status: string }>;
  refundPayment(paymentId: string, reason: string, actorId: string, labId: string): Promise<{ refund_id: string; status: string }>;
  applyDiscount(invoiceId: string, discountType: 'fixed' | 'percentage', discountValue: number, actorId: string, labId: string): Promise<any>;
  getInvoice(invoiceId: string, labId: string): Promise<any>;
  getPaymentStatus(orderId: string, labId: string): Promise<{ invoice_id: string; net_amount: number; paid_amount: number; balance_amount: number; status: string }>;
}

// ============================================================================
// 6. INVENTORY CONTRACT (Section 12)
// ============================================================================

export interface StockOperationInput {
  item_id: string;
  lot_id?: string;
  quantity: number;
  reason: string;
  branch_id?: string;
  lab_id: string;
  actor_id: string;
}

export interface IInventoryService {
  reserveStock(input: StockOperationInput): Promise<{ reservation_id: string; remaining_stock: number }>;
  consumeStock(input: StockOperationInput): Promise<{ transaction_id: string; current_stock: number }>;
  releaseStock(reservationId: string, actorId: string): Promise<{ success: boolean; restored_quantity: number }>;
  adjustStock(input: StockOperationInput & { adjustment_type: 'increase' | 'decrease' | 'audit_reconciliation' }): Promise<any>;
  getStock(itemId: string, labId: string, branchId?: string): Promise<{ item_id: string; name: string; quantity_on_hand: number; min_stock_level: number; is_low: boolean }>;
  checkAvailability(itemIds: string[], quantities: number[], labId: string): Promise<{ available: boolean; shortages: Array<{ item_id: string; requested: number; available: number }> }>;
}

// ============================================================================
// 7. PROCUREMENT CONTRACT (Section 13)
// ============================================================================

export interface PurchaseOrderInput {
  supplier_id: string;
  lab_id: string;
  branch_id?: string;
  items: Array<{ item_id: string; item_name: string; quantity: number; unit_price: number }>;
  notes?: string;
  created_by: string;
}

export interface IProcurementService {
  createPurchaseOrder(input: PurchaseOrderInput): Promise<{ po_id: string; po_number: string; status: string }>;
  receiveGoods(poId: string, receivedItems: Array<{ item_id: string; received_quantity: number; lot_number: string; expiry_date: string }>, actorId: string, labId: string): Promise<{ receipt_id: string; inventory_updated: boolean }>;
  getPurchaseOrder(poId: string, labId: string): Promise<any>;
}

// ============================================================================
// 8. ANALYZER INTEGRATION CONTRACT (Section 14)
// ============================================================================

export interface AnalyzerRawResult {
  analyzer_id: string;
  sample_barcode: string;
  test_code: string;
  parameter_code: string;
  value: string | number;
  unit?: string;
  flags?: string;
  raw_message?: string;
  timestamp?: string;
}

export interface IAnalyzerIntegrationService {
  importAnalyzerResult(raw: AnalyzerRawResult, labId: string): Promise<{ success: boolean; result_id?: string; order_id?: string; action: string }>;
  getAnalyzerHealth(analyzerId: string): Promise<{ analyzer_id: string; status: 'online' | 'offline' | 'error'; last_communication: string }>;
}

// ============================================================================
// 9. QC CONTRACT (Section 15)
// ============================================================================

export interface QCRunInput {
  qc_material_id: string;
  analyzer_id: string;
  test_id: string;
  observed_value: number;
  run_by: string;
  lab_id: string;
}

export interface IQCService {
  recordQCRun(input: QCRunInput): Promise<{ run_id: string; status: 'passed' | 'warning' | 'failed'; rules_violated: string[]; z_score: number }>;
  getLeveyJenningsData(materialId: string, testId: string, days?: number): Promise<any>;
}

// ============================================================================
// 10. AI CLINICAL CONTRACT (Section 21)
// ============================================================================

export interface AISuggestionOutput<T = any> {
  is_ai_suggestion: true;
  ai_confidence: number;
  ai_source_data: any;
  ai_timestamp: string;
  ai_model_version: string;
  human_decision_required: true;
  payload: T;
}

export interface IAIService {
  analyzePatientTrends(patientId: string, testCategory: string): Promise<AISuggestionOutput<any>>;
  detectAnomalies(orderId: string, results: any[]): Promise<AISuggestionOutput<{ anomalies_detected: boolean; details: string[] }>>;
  predictReagentDepletion(labId: string): Promise<AISuggestionOutput<any>>;
}

// ============================================================================
// 11. SAAS ENTITLEMENT CONTRACT (Section 23)
// ============================================================================

export interface IEntitlementService {
  canAddBranch(labId: string): Promise<{ allowed: boolean; current: number; max: number }>;
  canAddUser(labId: string): Promise<{ allowed: boolean; current: number; max: number }>;
  canCreateOrder(labId: string): Promise<{ allowed: boolean; current_this_month: number; max_per_month: number }>;
  isFeatureEnabled(labId: string, featureCode: string): Promise<boolean>;
  getLabEntitlements(labId: string): Promise<Record<string, any>>;
}
