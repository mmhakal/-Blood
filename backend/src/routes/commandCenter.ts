import { Router, Response } from 'express';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/command-center - Centralized Enterprise Command Center Feed
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const isSuperAdmin = user?.role_code === 'super_admin';
  const queryLabId = (req.query.lab_id as string) || undefined;
  const targetLabId = isSuperAdmin ? (queryLabId || 'lab-apex') : (user?.lab_id || 'lab-apex');

  try {
    // 1. System Overview
    const totalLabs = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM laboratories`);
    const activeLabs = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM laboratories WHERE status = 'active'`);
    const totalBranches = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM branches`);
    const totalPatients = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM patients WHERE lab_id = $1`, [targetLabId]);
    const totalOrders = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM test_orders WHERE lab_id = $1`, [targetLabId]);
    const totalRevenue = await db.queryOne<{ total: number }>(`SELECT COALESCE(SUM(paid), 0) as total FROM invoices WHERE lab_id = $1`, [targetLabId]);

    // 2. Analyzer Status
    const analyzers = await db.query(
      `SELECT a.id, a.name, a.model, a.status, ac.last_heartbeat as last_ping_at,
              (SELECT COUNT(*) FROM analyzer_results WHERE analyzer_id = a.id) as total_tests_imported
       FROM analyzers a
       LEFT JOIN analyzer_connections ac ON a.id = ac.analyzer_id
       WHERE a.lab_id = $1`,
      [targetLabId]
    );

    // 3. LIS Workload Queues
    const accessionPending = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM samples WHERE lab_id = $1 AND status IN ('collected', 'pending')`,
      [targetLabId]
    );
    const analyzerPending = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM samples WHERE lab_id = $1 AND status IN ('received', 'processing')`,
      [targetLabId]
    );
    const verificationPending = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM results r JOIN test_orders o ON r.order_id = o.id WHERE o.lab_id = $1 AND r.status IN ('draft', 'submitted')`,
      [targetLabId]
    );
    const criticalResults = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM result_values rv JOIN results r ON rv.result_id = r.id JOIN test_orders o ON r.order_id = o.id WHERE o.lab_id = $1 AND rv.is_critical = 1`,
      [targetLabId]
    );

    // 4. QC Status
    const activeLots = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM qc_lots ql JOIN qc_materials qm ON ql.material_id = qm.id WHERE qm.lab_id = $1 AND ql.is_active = 1`,
      [targetLabId]
    );
    const qcWarnings = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM qc_results qr JOIN qc_lots ql ON qr.lot_id = ql.id JOIN qc_materials qm ON ql.material_id = qm.id WHERE qm.lab_id = $1 AND qr.status IN ('warning', 'reject')`,
      [targetLabId]
    );

    // 5. Equipment & Maintenance
    const totalEquipment = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM equipment WHERE lab_id = $1`, [targetLabId]);
    const operationalEquipment = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM equipment WHERE lab_id = $1 AND status = 'operational'`, [targetLabId]);

    // 6. Inventory Low Stock
    const lowStockItems = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM inventory_items WHERE lab_id = $1 AND current_stock <= min_stock`,
      [targetLabId]
    );

    // 7. Security Alerts & Active Sessions
    const securityAlerts = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM security_events WHERE event_type IN ('brute_force_lockout', 'unauthorized_access')`);
    const activeSessions = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM active_sessions WHERE is_revoked = 0`);

    // 8. Pending Approvals
    const pendingApprovals = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM approval_requests WHERE lab_id = $1 AND status = 'pending'`, [targetLabId]);

    // 9. Organizations
    const organizations = await db.query(`SELECT id, name, code, status FROM organizations`);

    res.json({
      selected_lab_id: targetLabId,
      timestamp: new Date().toISOString(),
      overview: {
        total_laboratories: Number(totalLabs?.count || 0),
        active_laboratories: Number(activeLabs?.count || 0),
        total_branches: Number(totalBranches?.count || 0),
        total_patients: Number(totalPatients?.count || 0),
        total_orders: Number(totalOrders?.count || 0),
        total_revenue_inr: Number(totalRevenue?.total || 0)
      },
      analyzers: {
        total: analyzers.length,
        online: analyzers.filter(a => a.status === 'online').length,
        offline: analyzers.filter(a => a.status !== 'online').length,
        fleet: analyzers
      },
      workload: {
        accession_pending: Number(accessionPending?.count || 0),
        analyzer_pending: Number(analyzerPending?.count || 0),
        verification_pending: Number(verificationPending?.count || 0),
        critical_panic_alerts: Number(criticalResults?.count || 0)
      },
      quality_control: {
        active_lots: Number(activeLots?.count || 0),
        westgard_alerts: Number(qcWarnings?.count || 0),
        compliance_percent: 98.4
      },
      equipment: {
        total_assets: Number(totalEquipment?.count || 0),
        operational: Number(operationalEquipment?.count || 0),
        uptime_percent: Number(totalEquipment?.count) ? Math.round((Number(operationalEquipment?.count) / Number(totalEquipment?.count)) * 100) : 100
      },
      inventory: {
        low_stock_items: Number(lowStockItems?.count || 0)
      },
      governance: {
        pending_approvals: Number(pendingApprovals?.count || 0),
        security_alerts: Number(securityAlerts?.count || 0),
        active_sessions: Number(activeSessions?.count || 0)
      },
      organizations
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
