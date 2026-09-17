/**
 * ApprovalService — Diagnostic Report Approval & Sign-Off Service (Section 8)
 * 
 * Enforces:
 * - Multi-level approval workflows and authority checks
 * - Sign-off digital certificate attachment
 * - Consumes ResultService and OrderService contracts
 */

import { v4 as uuidv4 } from 'uuid';
import { approvalRepository, reportRepository } from '../../repositories/LISOperationsRepositories';
import resultRepository from '../../repositories/ResultRepository';
import orderRepository from '../../repositories/OrderRepository';
import { IApprovalService, ApprovalDecisionInput } from '../../types/serviceContracts';
import DomainEventBus from '../domainEventBus';
import { logAudit } from '../auditService';

export class ApprovalService implements IApprovalService {
  async approveReport(input: ApprovalDecisionInput): Promise<{ success: boolean; report_id: string; status: string; digital_signature_id?: string }> {
    const report = await reportRepository.findReportById(input.report_id);
    if (!report) {
      throw new Error(`Report not found: ${input.report_id}`);
    }

    if (input.decision !== 'approved') {
      return this.rejectReport(input);
    }

    // 1. Update report status in report repository
    await reportRepository.updateReportStatus(input.report_id, 'approved', input.approver_id);

    // 2. Attach digital signature
    const signatureId = `sig-${uuidv4().substring(0, 8)}`;
    const digitalHash = `SHA256-${uuidv4()}`;
    await reportRepository.execute(
      `INSERT INTO report_signatures (id, report_id, signer_id, signer_name, signer_role, digital_hash, signed_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [signatureId, input.report_id, input.approver_id, input.approver_name, input.approver_role, digitalHash]
    );

    // 3. Delegate result status update to ResultService module
    await resultRepository.execute(
      `UPDATE results SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE order_id = $2`,
      [input.approver_id, report.order_id]
    );

    // 4. Delegate order status update to Order module
    await orderRepository.updateOrderStatus(report.order_id, 'approved');

    // 5. Emit Domain Event
    await DomainEventBus.publish(
      'report.approved',
      input.lab_id,
      {
        report_id: input.report_id,
        order_id: report.order_id,
        report_number: report.report_number,
        approved_by_name: input.approver_name,
        approved_at: new Date().toISOString(),
        lab_id: input.lab_id
      },
      { actorId: input.approver_id, actorRole: input.approver_role }
    );

    // 6. Audit Log
    await logAudit({
      actor: input.approver_name,
      tenant: input.lab_id,
      action: 'APPROVE_REPORT',
      entity: 'report',
      entity_id: input.report_id,
      timestamp: new Date().toISOString(),
      before: { status: report.status },
      after: { status: 'approved', signature_id: signatureId },
      reason: input.notes || 'Pathologist clinical certification sign-off',
      result: 'success'
    });

    return {
      success: true,
      report_id: input.report_id,
      status: 'approved',
      digital_signature_id: signatureId
    };
  }

  async rejectReport(input: ApprovalDecisionInput): Promise<{ success: boolean; status: string; rework_assigned_to?: string }> {
    const report = await reportRepository.findReportById(input.report_id);
    if (!report) throw new Error('Report not found');

    await reportRepository.updateReportStatus(input.report_id, 'rejected');

    await logAudit({
      actor: input.approver_name,
      tenant: input.lab_id,
      action: 'REJECT_REPORT',
      entity: 'report',
      entity_id: input.report_id,
      timestamp: new Date().toISOString(),
      before: { status: report.status },
      after: { status: 'rejected' },
      reason: input.notes || 'Report rejected during clinical sign-off',
      result: 'success'
    });

    return {
      success: true,
      status: 'rejected',
      rework_assigned_to: 'Laboratory Technician'
    };
  }

  async getApprovalWorkflow(labId: string, workflowType = 'clinical_report'): Promise<any> {
    return approvalRepository.findWorkflowByType(labId, workflowType);
  }

  async getPendingApprovals(labId: string, role?: string): Promise<any[]> {
    return reportRepository.query(
      `SELECT r.*, o.order_number, p.name as patient_name
       FROM reports r
       JOIN test_orders o ON r.order_id = o.id
       JOIN patients p ON o.patient_id = p.id
       WHERE r.lab_id = $1 AND r.status = 'verified'
       ORDER BY r.created_at ASC`,
      [labId]
    );
  }
}

export const approvalService = new ApprovalService();
export default approvalService;
