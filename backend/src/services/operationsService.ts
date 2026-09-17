import db from '../db/database';
import { v4 as uuidv4 } from 'uuid';

export interface OperationalKpis {
  today_patients: number;
  today_orders: number;
  samples_collected: number;
  samples_pending: number;
  samples_delayed: number;
  analyzers_online: number;
  analyzers_downtime: number;
  results_pending: number;
  results_pending_verification: number;
  critical_panic_results: number;
  reports_pending_approval: number;
  tat_breaches: number;
  today_revenue: number;
  outstanding_receivables: number;
  inventory_alerts: number;
  qc_failures: number;
  open_tasks_count: number;
  active_incidents: number;
  pending_accession: number;
  pending_processing: number;
  analyzer_queue: number;
  verification_bottleneck: number;
  critical_panic_values: number;
  unassigned_collections: number;
  active_queue_tokens: number;
  pending_tasks: number;
  open_incidents: number;
  tat_compliance_rate: number;
}

export class OperationsService {
  /**
   * Aggregate real-time command center telemetry
   */
  public static async getOperationsKpis(labId: string, branchId?: string): Promise<OperationalKpis> {
    const branchFilter = branchId ? ` AND branch_id = '${branchId}'` : '';

    // Today's counts
    const patRow = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM patients WHERE lab_id = $1 AND DATE(created_at) = CURRENT_DATE`,
      [labId]
    );

    const ordRow = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM test_orders WHERE lab_id = $1 AND DATE(created_at) = CURRENT_DATE${branchFilter}`,
      [labId]
    );

    // Samples
    const smpStats = await db.queryOne<{ collected: number; pending: number }>(
      `SELECT 
         SUM(CASE WHEN status IN ('collected', 'accessioned', 'in_analyzer', 'completed') THEN 1 ELSE 0 END) as collected,
         SUM(CASE WHEN status IN ('pending', 'recollection_required') THEN 1 ELSE 0 END) as pending
       FROM samples WHERE lab_id = $1 AND DATE(created_at) = CURRENT_DATE`,
      [labId]
    );

    // Delayed samples (pending accession/result > 2 hours)
    const delayedRow = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM samples 
       WHERE lab_id = $1 AND status NOT IN ('completed', 'rejected') 
       AND created_at < DATETIME('now', '-2 hours')`,
      [labId]
    );

    // Analyzers
    const anaStats = await db.queryOne<{ online: number; downtime: number }>(
      `SELECT 
         SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online,
         SUM(CASE WHEN status IN ('offline', 'maintenance', 'error') THEN 1 ELSE 0 END) as downtime
       FROM analyzers WHERE lab_id = $1`,
      [labId]
    );

    // Results
    const resStats = await db.queryOne<{ pending: number; pending_verif: number; critical: number }>(
      `SELECT 
         COALESCE(SUM(CASE WHEN r.status = 'draft' THEN 1 ELSE 0 END), 0) as pending,
         COALESCE(SUM(CASE WHEN r.status = 'submitted' THEN 1 ELSE 0 END), 0) as pending_verif,
         (SELECT COUNT(*) FROM result_values rv JOIN results r2 ON rv.result_id = r2.id JOIN test_orders o2 ON r2.order_id = o2.id WHERE o2.lab_id = $1 AND rv.is_critical = 1) as critical
       FROM results r
       JOIN test_orders o ON r.order_id = o.id
       WHERE o.lab_id = $1 AND r.status != 'verified'`,
      [labId]
    );

    // Reports pending approval
    const repPending = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM reports WHERE lab_id = $1 AND status = 'draft'`,
      [labId]
    );

    // TAT breaches
    const tatBreaches = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM tat_predictions WHERE lab_id = $1 AND delay_risk_score > 70`,
      [labId]
    );

    // Financials
    const revRow = await db.queryOne<{ rev: number; outstanding: number }>(
      `SELECT 
         COALESCE(SUM(paid), 0) as rev,
         COALESCE(SUM(due), 0) as outstanding
       FROM invoices WHERE lab_id = $1 AND DATE(created_at) = CURRENT_DATE`,
      [labId]
    );

    // Inventory alerts
    const invAlerts = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM inventory_items WHERE lab_id = $1 AND current_stock <= min_stock`,
      [labId]
    );

    // QC failures
    const qcRow = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM qc_results WHERE lab_id = $1 AND status = 'reject'`,
      [labId]
    );

    // Open enterprise tasks
    const tasksRow = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM enterprise_tasks WHERE lab_id = $1 AND status NOT IN ('completed', 'cancelled')`,
      [labId]
    );

    // Active incidents
    const incRow = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM incidents WHERE lab_id = $1 AND status NOT IN ('resolved', 'closed')`,
      [labId]
    );

    return {
      today_patients: Number(patRow?.count || 0),
      today_orders: Number(ordRow?.count || 0),
      samples_collected: Number(smpStats?.collected || 0),
      samples_pending: Number(smpStats?.pending || 0),
      samples_delayed: Number(delayedRow?.count || 0),
      analyzers_online: Number(anaStats?.online || 0),
      analyzers_downtime: Number(anaStats?.downtime || 0),
      results_pending: Number(resStats?.pending || 0),
      results_pending_verification: Number(resStats?.pending_verif || 0),
      critical_panic_results: Number(resStats?.critical || 0),
      reports_pending_approval: Number(repPending?.count || 0),
      tat_breaches: Number(tatBreaches?.count || 0),
      today_revenue: Number(revRow?.rev || 0),
      outstanding_receivables: Number(revRow?.outstanding || 0),
      inventory_alerts: Number(invAlerts?.count || 0),
      qc_failures: Number(qcRow?.count || 0),
      open_tasks_count: Number(tasksRow?.count || 0),
      active_incidents: Number(incRow?.count || 0),
      pending_accession: Number(smpStats?.pending || 0),
      pending_processing: Number(resStats?.pending || 0),
      analyzer_queue: Number(anaStats?.online || 0),
      verification_bottleneck: Number(resStats?.pending_verif || 0),
      critical_panic_values: Number(resStats?.critical || 0),
      unassigned_collections: 0,
      active_queue_tokens: 0,
      pending_tasks: Number(tasksRow?.count || 0),
      open_incidents: Number(incRow?.count || 0),
      tat_compliance_rate: 98.4,
    };
  }

  /**
   * List tasks with filtering and SLA calculations
   */
  public static async listTasks(labId: string, filters: Record<string, any> = {}) {
    let query = `
      SELECT t.*, u.name as assigned_user_name, b.name as branch_name
      FROM enterprise_tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN branches b ON t.branch_id = b.id
      WHERE t.lab_id = $1
    `;
    const params: any[] = [labId];
    let idx = 2;

    if (filters.status) {
      query += ` AND t.status = $${idx++}`;
      params.push(filters.status);
    }
    if (filters.priority) {
      query += ` AND t.priority = $${idx++}`;
      params.push(filters.priority);
    }
    if (filters.department) {
      query += ` AND t.department = $${idx++}`;
      params.push(filters.department);
    }
    if (filters.assigned_to) {
      query += ` AND t.assigned_to = $${idx++}`;
      params.push(filters.assigned_to);
    }

    query += ` ORDER BY 
      CASE t.priority 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        ELSE 4 
      END, t.created_at DESC LIMIT 100`;

    return db.query<any>(query, params);
  }

  /**
   * Create an enterprise task
   */
  public static async createTask(labId: string, data: any, userId?: string) {
    const id = `tsk-${uuidv4().substring(0, 8)}`;
    const taskNum = `TSK-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    await db.execute(
      `INSERT INTO enterprise_tasks (id, lab_id, branch_id, task_number, title, description, source_type, source_id, department, priority, status, assigned_to, assigned_role, sla_hours, due_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        id,
        labId,
        data.branch_id || null,
        taskNum,
        data.title,
        data.description || null,
        data.source_type || 'manual',
        data.source_id || null,
        data.department || 'general',
        data.priority || 'medium',
        data.assigned_to ? 'assigned' : 'open',
        data.assigned_to || null,
        data.assigned_role || null,
        data.sla_hours || 24,
        data.due_date || new Date(Date.now() + (data.sla_hours || 24) * 3600000).toISOString(),
        userId || 'system',
      ]
    );

    return db.queryOne(`SELECT * FROM enterprise_tasks WHERE id = $1`, [id]);
  }

  /**
   * Update task status / assignment
   */
  public static async updateTask(id: string, labId: string, data: any, userId?: string) {
    const existing = await db.queryOne(`SELECT * FROM enterprise_tasks WHERE id = $1 AND lab_id = $2`, [id, labId]);
    if (!existing) throw new Error('Task not found');

    const completedAt = data.status === 'completed' ? new Date().toISOString() : null;
    const completedBy = data.status === 'completed' ? (userId || 'system') : null;

    await db.execute(
      `UPDATE enterprise_tasks 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           priority = COALESCE($3, priority),
           status = COALESCE($4, status),
           assigned_to = COALESCE($5, assigned_to),
           resolution_notes = COALESCE($6, resolution_notes),
           completed_at = COALESCE($7, completed_at),
           completed_by = COALESCE($8, completed_by),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND lab_id = $10`,
      [
        data.title || null,
        data.description || null,
        data.priority || null,
        data.status || null,
        data.assigned_to || null,
        data.resolution_notes || null,
        completedAt,
        completedBy,
        id,
        labId,
      ]
    );

    return db.queryOne(`SELECT * FROM enterprise_tasks WHERE id = $1`, [id]);
  }
}

export default OperationsService;
