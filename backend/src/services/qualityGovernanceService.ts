import db from '../db/database';
import { v4 as uuidv4 } from 'uuid';

export class QualityGovernanceService {
  /**
   * Log an incident and automatically generate CAPA tracking ID
   */
  public static async logIncident(labId: string, data: any, reportedBy: string) {
    const incId = `inc-${uuidv4().substring(0, 8)}`;
    const incNum = `INC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    await db.execute(
      `INSERT INTO incidents (id, lab_id, branch_id, incident_number, incident_type, severity, department, description, immediate_containment_action, reported_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        incId,
        labId,
        data.branch_id || null,
        incNum,
        data.incident_type,
        data.severity || 'medium',
        data.department || 'laboratory',
        data.description,
        data.immediate_containment_action || null,
        reportedBy,
        data.requires_capa ? 'capa_initiated' : 'reported',
      ]
    );

    let capa = null;
    if (data.requires_capa || data.severity === 'high' || data.severity === 'critical') {
      const capaId = `capa-${uuidv4().substring(0, 8)}`;
      const capaNum = `CAPA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      await db.execute(
        `INSERT INTO capa_records (id, lab_id, incident_id, capa_number, root_cause_analysis, root_cause_category, corrective_action, preventive_action, assigned_to, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open')`,
        [
          capaId,
          labId,
          incId,
          capaNum,
          data.root_cause_analysis || 'Root cause investigation pending',
          data.root_cause_category || 'procedure_gap',
          data.corrective_action || 'Immediate containment action executed',
          data.preventive_action || 'Staff training and process SOP update',
          data.assigned_to || reportedBy,
        ]
      );
      capa = await db.queryOne(`SELECT * FROM capa_records WHERE id = $1`, [capaId]);
    }

    const incident = await db.queryOne(`SELECT * FROM incidents WHERE id = $1`, [incId]);
    return { incident, capa };
  }

  /**
   * Close a CAPA with effectiveness verification
   */
  public static async closeCapa(capaId: string, labId: string, verifiedBy: string, notes: string) {
    await db.execute(
      `UPDATE capa_records
       SET status = 'closed',
           effectiveness_review_notes = $1,
           verified_by = $2,
           verified_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND lab_id = $4`,
      [notes, verifiedBy, capaId, labId]
    );

    // Update parent incident to closed
    const capa = await db.queryOne<any>(`SELECT incident_id FROM capa_records WHERE id = $1`, [capaId]);
    if (capa?.incident_id) {
      await db.execute(
        `UPDATE incidents SET status = 'closed', resolved_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [capa.incident_id]
      );
    }

    return db.queryOne(`SELECT * FROM capa_records WHERE id = $1`, [capaId]);
  }

  /**
   * Evaluate upcoming license expiries (30, 60, 90 day alerts)
   */
  public static async checkExpiringLicenses(labId: string) {
    const licenses = await db.query<any>(
      `SELECT *,
         CAST((JULIANDAY(expiry_date) - JULIANDAY('now')) AS INTEGER) as days_remaining
       FROM licenses
       WHERE lab_id = $1
       ORDER BY expiry_date ASC`,
      [labId]
    );

    for (const lic of licenses) {
      let newStatus = lic.status;
      if (lic.days_remaining <= 0) {
        newStatus = 'expired';
      } else if (lic.days_remaining <= (lic.reminder_period_days || 60)) {
        newStatus = 'expiring_soon';
      } else {
        newStatus = 'active';
      }

      if (newStatus !== lic.status) {
        await db.execute(`UPDATE licenses SET status = $1 WHERE id = $2`, [newStatus, lic.id]);
        lic.status = newStatus;
      }
    }

    return licenses;
  }
}

export default QualityGovernanceService;
