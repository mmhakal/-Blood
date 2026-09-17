import db from '../db/database';
import { v4 as uuidv4 } from 'uuid';

export class FieldOperationsService {
  /**
   * Book a home collection request
   */
  public static async bookHomeCollection(labId: string, data: any) {
    const id = `hc-${uuidv4().substring(0, 8)}`;
    const reqNum = `HC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    await db.execute(
      `INSERT INTO home_collection_requests (id, lab_id, branch_id, request_number, patient_name, mobile, address, area_pincode, scheduled_date, scheduled_time_slot, tests_requested, collection_fee, assigned_phlebotomist_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        id,
        labId,
        data.branch_id || null,
        reqNum,
        data.patient_name,
        data.mobile,
        data.address,
        data.area_pincode || null,
        data.scheduled_date || new Date().toISOString().split('T')[0],
        data.scheduled_time_slot,
        data.tests_requested || null,
        data.collection_fee || 150.0,
        data.assigned_phlebotomist_id || null,
        data.assigned_phlebotomist_id ? 'assigned' : 'requested',
      ]
    );

    return db.queryOne(`SELECT * FROM home_collection_requests WHERE id = $1`, [id]);
  }

  /**
   * Update home collection status and phlebotomist telemetry
   */
  public static async updateHomeCollectionStatus(id: string, labId: string, status: string, meta: any = {}) {
    const existing = await db.queryOne(`SELECT * FROM home_collection_requests WHERE id = $1 AND lab_id = $2`, [id, labId]);
    if (!existing) throw new Error('Home collection request not found');

    const collectedAt = status === 'sample_collected' ? new Date().toISOString() : null;
    const receivedAtLabAt = status === 'received_at_lab' ? new Date().toISOString() : null;

    await db.execute(
      `UPDATE home_collection_requests
       SET status = $1,
           collected_sample_barcode = COALESCE($2, collected_sample_barcode),
           assigned_phlebotomist_id = COALESCE($3, assigned_phlebotomist_id),
           cancellation_reason = COALESCE($4, cancellation_reason),
           collected_at = COALESCE($5, collected_at),
           received_at_lab_at = COALESCE($6, received_at_lab_at)
       WHERE id = $7 AND lab_id = $8`,
      [
        status,
        meta.barcode || null,
        meta.phlebotomist_id || null,
        meta.cancellation_reason || null,
        collectedAt,
        receivedAtLabAt,
        id,
        labId,
      ]
    );

    // If collected, increment phlebotomist total collections
    if (status === 'sample_collected' && existing.assigned_phlebotomist_id) {
      await db.execute(
        `UPDATE phlebotomists SET total_collections = total_collections + 1 WHERE id = $1`,
        [existing.assigned_phlebotomist_id]
      );
    }

    return db.queryOne(`SELECT * FROM home_collection_requests WHERE id = $1`, [id]);
  }

  /**
   * Issue Next Queue Token for Laboratory Reception
   */
  public static async issueQueueToken(labId: string, branchId: string, category: string, patientName?: string) {
    const id = `qtok-${uuidv4().substring(0, 8)}`;
    const prefix = category === 'billing' ? 'B' : (category === 'doctor_consult' ? 'D' : 'A');

    // Count today's tokens in category for branch
    const countRow = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM queue_tokens 
       WHERE lab_id = $1 AND branch_id = $2 AND token_category = $3 AND DATE(issued_at) = CURRENT_DATE`,
      [labId, branchId, category]
    );
    const seq = Number(countRow?.count || 0) + 1;
    const tokenNumber = `${prefix}-${seq < 10 ? '0' + seq : seq}`;

    await db.execute(
      `INSERT INTO queue_tokens (id, lab_id, branch_id, token_number, token_category, patient_name, status, counter_room)
       VALUES ($1, $2, $3, $4, $5, $6, 'waiting', $7)`,
      [
        id,
        labId,
        branchId,
        tokenNumber,
        category,
        patientName || 'Patient',
        category === 'billing' ? 'Counter 1' : 'Phlebotomy Room 1',
      ]
    );

    return db.queryOne(`SELECT * FROM queue_tokens WHERE id = $1`, [id]);
  }
}

export default FieldOperationsService;
