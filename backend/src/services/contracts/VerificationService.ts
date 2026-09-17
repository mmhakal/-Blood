/**
 * VerificationService — Canonical Clinical Verification Service (Section 7)
 * 
 * Enforces:
 * - Technical verification and auto-validation
 * - Verification history tracking
 * - Consumes ResultService contracts, NEVER directly mutates results or result_values tables
 */

import { v4 as uuidv4 } from 'uuid';
import { verificationRepository } from '../../repositories/LISOperationsRepositories';
import resultRepository from '../../repositories/ResultRepository';
import { IVerificationService, VerificationInput } from '../../types/serviceContracts';
import DomainEventBus from '../domainEventBus';
import { logAudit } from '../auditService';

export class VerificationService implements IVerificationService {
  /**
   * Verify results by recording in verification table and calling ResultRepository status update.
   */
  async verifyResult(input: VerificationInput): Promise<{ success: boolean; status: string; verification_id: string }> {
    const result = await resultRepository.findResultById(input.result_id);
    if (!result) {
      throw new Error(`Result not found for verification: ${input.result_id}`);
    }

    const verificationId = `ver-${uuidv4().substring(0, 8)}`;
    const newStatus = input.status === 'verified' ? 'verified' : (input.status === 'rejected' ? 'rejected' : 'recheck_requested');

    // 1. Record verification in verification repository (owned by this module)
    await verificationRepository.recordVerification({
      id: verificationId,
      result_id: input.result_id,
      verifier_id: input.verifier_id,
      verification_type: input.verification_type,
      status: newStatus,
      notes: input.notes
    });

    // 2. Delegate result status update to Result module (clean boundary)
    await resultRepository.updateResultStatus(input.result_id, newStatus, input.verifier_id);

    // 3. Emit Domain Event
    await DomainEventBus.publish(
      'result.verified',
      input.lab_id,
      {
        result_id: input.result_id,
        verification_id: verificationId,
        status: newStatus,
        verifier_id: input.verifier_id,
        verification_type: input.verification_type
      },
      { actorId: input.verifier_id, actorRole: input.verifier_role }
    );

    // 4. Audit Log
    await logAudit({
      actor: input.verifier_name,
      tenant: input.lab_id,
      action: 'VERIFY_RESULT',
      entity: 'result_verification',
      entity_id: verificationId,
      timestamp: new Date().toISOString(),
      before: { status: result.status },
      after: { status: newStatus, verifier: input.verifier_name },
      reason: input.notes || 'Clinical result verification completed',
      result: 'success'
    });

    return {
      success: true,
      status: newStatus,
      verification_id: verificationId
    };
  }

  async reverifyResult(resultId: string, notes: string, actor: { id: string; name: string; role: string; lab_id: string }): Promise<{ success: boolean; status: string }> {
    return this.verifyResult({
      result_id: resultId,
      verifier_id: actor.id,
      verifier_name: actor.name,
      verifier_role: actor.role,
      verification_type: 'clinical',
      status: 'verified',
      notes: `Re-verification: ${notes}`,
      lab_id: actor.lab_id
    });
  }

  async getAutoValidationStatus(resultId: string, labId: string): Promise<{ auto_validatable: boolean; rules_checked: number; violations: string[] }> {
    const values = await resultRepository.getResultValues(resultId);
    const violations: string[] = [];

    for (const val of values) {
      if (val.is_critical || val.flag?.includes('critical')) {
        violations.push(`Critical value on parameter ${val.parameter_id} blocks auto-validation`);
      }
    }

    return {
      auto_validatable: violations.length === 0,
      rules_checked: values.length,
      violations
    };
  }

  async getVerificationHistory(resultId: string, labId: string): Promise<any[]> {
    return verificationRepository.getVerificationsFor(resultId);
  }
}

export const verificationService = new VerificationService();
export default verificationService;
