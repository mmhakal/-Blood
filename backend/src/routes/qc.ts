import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditFromReq } from '../services/auditService';
import { evaluateWestgardRules } from '../services/validationEngineService';

const router = Router();

// GET /api/qc/dashboard - QC Operational Status & KPIs
router.get('/dashboard', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';

  try {
    const totalRuns = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM qc_results WHERE lab_id = $1`, [labId]);
    const passCount = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM qc_results WHERE lab_id = $1 AND status = 'pass'`, [labId]);
    const warnCount = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM qc_results WHERE lab_id = $1 AND status = 'warning'`, [labId]);
    const rejectCount = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM qc_results WHERE lab_id = $1 AND status = 'reject'`, [labId]);
    const openFailures = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM qc_failures WHERE lab_id = $1 AND status = 'open'`, [labId]);

    const activeLots = await db.query(
      `SELECT ql.*, qm.name as material_name, qm.manufacturer, qm.level
       FROM qc_lots ql
       JOIN qc_materials qm ON ql.material_id = qm.id
       WHERE ql.lab_id = $1 AND ql.is_active = 1
       ORDER BY ql.created_at DESC`,
      [labId]
    );

    const recentRuns = await db.query(
      `SELECT qr.*, tp.name as param_name, tp.unit, ql.lot_number, a.name as analyzer_name
       FROM qc_results qr
       JOIN test_parameters tp ON qr.parameter_id = tp.id
       JOIN qc_lots ql ON qr.lot_id = ql.id
       LEFT JOIN analyzers a ON qr.analyzer_id = a.id
       WHERE qr.lab_id = $1
       ORDER BY qr.run_time DESC LIMIT 10`,
      [labId]
    );

    res.json({
      total_runs: Number(totalRuns?.count || 0),
      passed_runs: Number(passCount?.count || 0),
      warning_runs: Number(warnCount?.count || 0),
      rejected_runs: Number(rejectCount?.count || 0),
      open_failures: Number(openFailures?.count || 0),
      active_lots: activeLots,
      recent_runs: recentRuns
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/qc/materials - List QC Materials
router.get('/materials', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';

  try {
    const materials = await db.query(
      `SELECT * FROM qc_materials WHERE lab_id = $1 ORDER BY name ASC`,
      [labId]
    );
    res.json(materials);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/qc/materials - Create QC Material
router.post('/materials', authenticateToken, requirePermission('manage_lab_settings'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';
  const { name, manufacturer, level, storage_temp, notes } = req.body;

  if (!name || !manufacturer || !level) {
    res.status(400).json({ error: 'Name, manufacturer, and control level are required' });
    return;
  }

  try {
    const id = `qcm-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO qc_materials (id, lab_id, name, manufacturer, level, storage_temp, notes, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1)`,
      [id, labId, name, manufacturer, level, storage_temp || '2-8 C', notes || null]
    );

    auditFromReq(req, 'CREATE_QC_MATERIAL', 'qc_material', id, null, { name, manufacturer, level });

    res.status(201).json({ message: 'QC Material registered successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/qc/lots - List QC Lots with Target Stats
router.get('/lots', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';

  try {
    const lots = await db.query(
      `SELECT ql.*, qm.name as material_name, qm.manufacturer, qm.level,
              (SELECT COUNT(*) FROM qc_targets WHERE lot_id = ql.id) as target_count,
              (SELECT COUNT(*) FROM qc_results WHERE lot_id = ql.id) as runs_count
       FROM qc_lots ql
       JOIN qc_materials qm ON ql.material_id = qm.id
       WHERE ql.lab_id = $1
       ORDER BY ql.created_at DESC`,
      [labId]
    );
    res.json(lots);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/qc/lots - Register QC Lot with Target Mean & SD
router.post('/lots', authenticateToken, requirePermission('manage_lab_settings'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';
  const { material_id, lot_number, expiry_date, targets } = req.body;

  if (!material_id || !lot_number || !expiry_date) {
    res.status(400).json({ error: 'material_id, lot_number, and expiry_date are required' });
    return;
  }

  try {
    const id = `qclot-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO qc_lots (id, lab_id, material_id, lot_number, expiry_date, is_active, opened_at)
       VALUES ($1, $2, $3, $4, $5, 1, CURRENT_TIMESTAMP)`,
      [id, labId, material_id, lot_number.trim(), expiry_date]
    );

    if (Array.isArray(targets)) {
      for (const t of targets) {
        if (!t.test_id || !t.parameter_id || !t.mean || !t.sd) continue;
        const targetId = `qctarg-${uuidv4().substring(0, 8)}`;
        const cv = Number(((t.sd / t.mean) * 100).toFixed(2));
        const minVal = Number((t.mean - 3 * t.sd).toFixed(2));
        const maxVal = Number((t.mean + 3 * t.sd).toFixed(2));

        await db.execute(
          `INSERT INTO qc_targets (id, lab_id, lot_id, analyzer_id, test_id, parameter_id, mean, sd, cv_percent, min_acceptable, max_acceptable)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [targetId, labId, id, t.analyzer_id || null, t.test_id, t.parameter_id, t.mean, t.sd, cv, minVal, maxVal]
        );
      }
    }

    auditFromReq(req, 'CREATE_QC_LOT', 'qc_lot', id, null, { lot_number, expiry_date });

    res.status(201).json({ message: `QC Lot ${lot_number} created successfully`, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/qc/chart-data - Levey-Jennings Chart Data Series
router.get('/chart-data', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';
  const { lot_id, parameter_id } = req.query;

  try {
    let target = null;
    if (lot_id && parameter_id) {
      target = await db.queryOne<{
        mean: number;
        sd: number;
        cv_percent: number;
        min_acceptable: number;
        max_acceptable: number;
        param_name: string;
        param_unit: string;
        test_name: string;
        lot_number: string;
      }>(
        `SELECT qt.*, tp.name as param_name, tp.unit as param_unit, t.name as test_name, ql.lot_number
         FROM qc_targets qt
         JOIN test_parameters tp ON qt.parameter_id = tp.id
         JOIN tests t ON qt.test_id = t.id
         JOIN qc_lots ql ON qt.lot_id = ql.id
         WHERE qt.lot_id = $1 AND qt.parameter_id = $2 LIMIT 1`,
        [lot_id, parameter_id]
      );
    } else {
      // Default to first target
      target = await db.queryOne<{
        lot_id: string;
        parameter_id: string;
        mean: number;
        sd: number;
        cv_percent: number;
        min_acceptable: number;
        max_acceptable: number;
        param_name: string;
        param_unit: string;
        test_name: string;
        lot_number: string;
      }>(
        `SELECT qt.*, tp.name as param_name, tp.unit as param_unit, t.name as test_name, ql.lot_number
         FROM qc_targets qt
         JOIN test_parameters tp ON qt.parameter_id = tp.id
         JOIN tests t ON qt.test_id = t.id
         JOIN qc_lots ql ON qt.lot_id = ql.id
         WHERE qt.lab_id = $1 LIMIT 1`,
        [labId]
      );
    }

    if (!target) {
      res.json({ target: null, points: [] });
      return;
    }

    const mean = Number(target.mean);
    const sd = Number(target.sd);

    const results = await db.query(
      `SELECT qr.*, u.name as entered_by_name
       FROM qc_results qr
       LEFT JOIN users u ON qr.entered_by = u.id
       WHERE qr.lot_id = $1 AND qr.parameter_id = $2
       ORDER BY qr.run_time ASC LIMIT 50`,
      [target.lot_id || lot_id, target.parameter_id || parameter_id]
    );

    const points = results.map((r) => ({
      id: r.id,
      run_time: r.run_time,
      value: Number(r.value),
      z_score: Number(r.z_score),
      status: r.status,
      rule_violations: typeof r.rule_violations === 'string' ? JSON.parse(r.rule_violations || '[]') : r.rule_violations,
      remarks: r.remarks,
      entered_by: r.entered_by_name || 'System Auto-QC'
    }));

    res.json({
      target: {
        lot_id: target.lot_id || lot_id,
        parameter_id: target.parameter_id || parameter_id,
        lot_number: target.lot_number,
        test_name: target.test_name,
        parameter_name: target.param_name,
        unit: target.param_unit,
        mean,
        sd,
        cv_percent: Number(target.cv_percent),
        plus_1sd: Number((mean + sd).toFixed(2)),
        minus_1sd: Number((mean - sd).toFixed(2)),
        plus_2sd: Number((mean + 2 * sd).toFixed(2)),
        minus_2sd: Number((mean - 2 * sd).toFixed(2)),
        plus_3sd: Number((mean + 3 * sd).toFixed(2)),
        minus_3sd: Number((mean - 3 * sd).toFixed(2))
      },
      points
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/qc/results - Record new QC run & evaluate Westgard Rules
router.post('/results', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';
  const { lot_id, analyzer_id, test_id, parameter_id, value, remarks } = req.body;

  if (!lot_id || !test_id || !parameter_id || value === undefined) {
    res.status(400).json({ error: 'lot_id, test_id, parameter_id, and numeric value are required' });
    return;
  }

  try {
    const target = await db.queryOne<{ mean: number; sd: number }>(
      `SELECT mean, sd FROM qc_targets WHERE lot_id = $1 AND parameter_id = $2 LIMIT 1`,
      [lot_id, parameter_id]
    );

    if (!target) {
      res.status(400).json({ error: 'No baseline target Mean/SD configured for this control lot and parameter' });
      return;
    }

    const numVal = parseFloat(value);
    const evaluation = await evaluateWestgardRules(lot_id, parameter_id, numVal, target.mean, target.sd);

    const resultId = `qcres-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO qc_results (id, lab_id, lot_id, analyzer_id, test_id, parameter_id, value, z_score, status, rule_violations, run_time, entered_by, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, $11, $12)`,
      [resultId, labId, lot_id, analyzer_id || null, test_id, parameter_id, numVal, evaluation.zScore, evaluation.status, JSON.stringify(evaluation.violations), req.user?.id || 'system', remarks || 'Routine QC Run']
    );

    // If rejected by Westgard rules, create a QC Failure incident for CAPA tracking
    if (evaluation.status === 'reject') {
      const failId = `qcfail-${uuidv4().substring(0, 8)}`;
      await db.execute(
        `INSERT INTO qc_failures (id, lab_id, qc_result_id, lot_id, analyzer_id, test_id, parameter_id, rule_violated, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open')`,
        [failId, labId, resultId, lot_id, analyzer_id || null, test_id, parameter_id, evaluation.violations.join('; ')]
      );
    }

    auditFromReq(req, 'RECORD_QC_RUN', 'qc_result', resultId, null, {
      lot_id,
      parameter_id,
      value: numVal,
      z_score: evaluation.zScore,
      status: evaluation.status,
      violations: evaluation.violations
    });

    res.status(201).json({
      message: `QC Result recorded (${evaluation.status.toUpperCase()})`,
      id: resultId,
      z_score: evaluation.zScore,
      status: evaluation.status,
      violations: evaluation.violations
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/qc/failures - List QC Failure incidents requiring CAPA
router.get('/failures', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';

  try {
    const failures = await db.query(
      `SELECT qf.*, tp.name as param_name, tp.unit, t.name as test_name, ql.lot_number, a.name as analyzer_name,
              u.name as resolved_by_name
       FROM qc_failures qf
       JOIN test_parameters tp ON qf.parameter_id = tp.id
       JOIN tests t ON qf.test_id = t.id
       JOIN qc_lots ql ON qf.lot_id = ql.id
       LEFT JOIN analyzers a ON qf.analyzer_id = a.id
       LEFT JOIN users u ON qf.resolved_by = u.id
       WHERE qf.lab_id = $1
       ORDER BY qf.created_at DESC`,
      [labId]
    );

    res.json(failures);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/qc/failures/:id/resolve - Resolve QC failure incident with CAPA workflow
router.post('/failures/:id/resolve', authenticateToken, async (req: AuthRequest, res: Response) => {
  const failureId = req.params.id;
  const { root_cause, corrective_action, preventive_action } = req.body;

  if (!root_cause || !corrective_action) {
    res.status(400).json({ error: 'Root cause and corrective action (CAPA) are required' });
    return;
  }

  try {
    await db.execute(
      `UPDATE qc_failures
       SET root_cause = $1, corrective_action = $2, preventive_action = $3, status = 'resolved', resolved_by = $4, resolved_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [root_cause, corrective_action, preventive_action || '', req.user?.id, failureId]
    );

    auditFromReq(req, 'RESOLVE_QC_FAILURE', 'qc_failure', failureId, null, { root_cause, corrective_action });

    res.json({ message: 'QC Failure resolved with CAPA documentation' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
