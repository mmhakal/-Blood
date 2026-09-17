/**
 * VerificationRepository, ApprovalRepository, ReportRepository
 * 
 * LIS Operations Specialized Repositories
 */

import { BaseRepository } from './BaseRepository';

export class VerificationRepository extends BaseRepository {
  public readonly moduleName = 'LIS_OPERATIONS.verification';
  public readonly tablesOwned = [
    'result_verifications',
    'result_validation_rules'
  ];

  async recordVerification(data: {
    id: string;
    result_id: string;
    verifier_id: string;
    verification_type: string;
    status: string;
    notes?: string;
  }) {
    this.validateTableAccess('result_verifications', 'INSERT');
    return this.execute(
      `INSERT INTO result_verifications (id, result_id, verifier_id, verification_type, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [data.id, data.result_id, data.verifier_id, data.verification_type, data.status, data.notes || null]
    );
  }

  async getVerificationsFor(resultId: string) {
    return this.query(
      `SELECT rv.*, u.name as verifier_name
       FROM result_verifications rv
       LEFT JOIN users u ON rv.verifier_id = u.id
       WHERE rv.result_id = $1
       ORDER BY rv.verified_at DESC`,
      [resultId]
    );
  }
}

export class ApprovalRepository extends BaseRepository {
  public readonly moduleName = 'LIS_OPERATIONS.approval';
  public readonly tablesOwned = [
    'approval_workflows',
    'approval_steps',
    'approval_requests'
  ];

  async findWorkflowByType(labId: string, workflowType: string) {
    return this.queryOne(
      `SELECT * FROM approval_workflows WHERE lab_id = $1 AND workflow_type = $2 AND is_active = 1`,
      [labId, workflowType]
    );
  }

  async getWorkflowSteps(workflowId: string) {
    return this.query(
      `SELECT * FROM approval_steps WHERE workflow_id = $1 ORDER BY step_order ASC`,
      [workflowId]
    );
  }

  async createApprovalRequest(data: {
    id: string;
    lab_id: string;
    workflow_id: string;
    target_id: string;
    target_type: string;
    requested_by: string;
    current_step: number;
    status: string;
  }) {
    this.validateTableAccess('approval_requests', 'INSERT');
    return this.execute(
      `INSERT INTO approval_requests (id, lab_id, workflow_id, target_id, target_type, requested_by, current_step, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [data.id, data.lab_id, data.workflow_id, data.target_id, data.target_type, data.requested_by, data.current_step, data.status]
    );
  }
}

export class ReportRepository extends BaseRepository {
  public readonly moduleName = 'LIS_OPERATIONS.report';
  public readonly tablesOwned = [
    'reports',
    'report_versions',
    'report_signatures',
    'report_templates'
  ];

  async findReportById(reportId: string, labId?: string) {
    if (labId) {
      return this.queryOne(`SELECT * FROM reports WHERE id = $1 AND lab_id = $2`, [reportId, labId]);
    }
    return this.queryOne(`SELECT * FROM reports WHERE id = $1`, [reportId]);
  }

  async findReportByOrderId(orderId: string) {
    return this.queryOne(`SELECT * FROM reports WHERE order_id = $1`, [orderId]);
  }

  async updateReportStatus(reportId: string, status: string, approverId?: string) {
    this.validateTableAccess('reports', 'UPDATE');
    return this.execute(
      `UPDATE reports SET status = $1, approved_by = COALESCE($2, approved_by), updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [status, approverId || null, reportId]
    );
  }
}

export const verificationRepository = new VerificationRepository();
export const approvalRepository = new ApprovalRepository();
export const reportRepository = new ReportRepository();
