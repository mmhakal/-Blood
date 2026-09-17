import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditFromReq } from '../services/auditService';

const router = Router();

// GET /api/results - list tests / results pending entry or verification
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const labId = req.user?.lab_id;
    const branchId = req.query.branch_id as string || req.user?.branch_id;
    const status = req.query.status as string; // draft, submitted, verified, approved
    const search = req.query.search as string;

    let query = `
      SELECT r.*,
             oi.item_name,
             t.name as test_name, t.code as test_code, t.department,
             o.order_number, o.lab_number, o.priority, o.created_at as order_date,
             p.name as patient_name, p.patient_id_code, p.age, p.gender,
             u_ent.name as entered_by_name,
             u_ver.name as verified_by_name
      FROM results r
      JOIN test_orders o ON r.order_id = o.id
      JOIN patients p ON o.patient_id = p.id
      JOIN tests t ON r.test_id = t.id
      JOIN order_items oi ON r.order_item_id = oi.id
      LEFT JOIN users u_ent ON r.entered_by = u_ent.id
      LEFT JOIN users u_ver ON r.verified_by = u_ver.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (labId) {
      params.push(labId);
      query += ` AND o.lab_id = $${params.length}`;
    }

    if (branchId) {
      params.push(branchId);
      query += ` AND o.branch_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND r.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const idx = params.length;
      query += ` AND (LOWER(p.name) LIKE $${idx} OR o.order_number LIKE $${idx} OR t.name LIKE $${idx} OR p.patient_id_code LIKE $${idx})`;
    }

    query += ` ORDER BY r.updated_at DESC LIMIT 100`;

    const results = await db.query(query, params);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/results/order/:orderId - get all tests and parameter entry grid for an order
router.get('/order/:orderId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const orderId = req.params.orderId;
    const order = await db.queryOne<{ id: string; lab_id: string; patient_id: string; status: string }>(
      `SELECT id, lab_id, patient_id, status FROM test_orders WHERE id = $1`,
      [orderId]
    );

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (req.user?.lab_id && order.lab_id !== req.user.lab_id) {
      res.status(403).json({ error: 'Access denied: Cannot view results for another laboratory' });
      return;
    }

    const items = await db.query(
      `SELECT oi.id as order_item_id, oi.test_id, oi.item_name, oi.status as item_status,
              t.code as test_code, t.name as test_name, t.department, t.sample_type, t.method
       FROM order_items oi
       JOIN tests t ON oi.test_id = t.id
       WHERE oi.order_id = $1`,
      [orderId]
    );

    const resultSections: any[] = [];

    for (const item of items) {
      const existingResult = await db.queryOne(
        `SELECT r.*, u_ent.name as entered_by_name, u_ver.name as verified_by_name, u_app.name as approved_by_name
         FROM results r
         LEFT JOIN users u_ent ON r.entered_by = u_ent.id
         LEFT JOIN users u_ver ON r.verified_by = u_ver.id
         LEFT JOIN users u_app ON r.approved_by = u_app.id
         WHERE r.order_item_id = $1`,
        [item.order_item_id]
      );

      const params = await db.query(
        `SELECT tp.id as parameter_id, tp.name as param_name, tp.short_name, tp.result_type,
                tp.unit, tp.decimal_precision, tp.display_order, tp.default_value,
                rr.normal_min, rr.normal_max, rr.critical_low, rr.critical_high, rr.text_range
         FROM test_parameters tp
         LEFT JOIN reference_ranges rr ON tp.id = rr.parameter_id
         WHERE tp.test_id = $1
         ORDER BY tp.display_order ASC`,
        [item.test_id]
      );

      const parametersWithValues: any[] = [];

      for (const p of params) {
        let currentValue = null;
        let currentFlag = 'normal';
        let currentIsCritical = 0;
        let currentRemarks = '';

        if (existingResult) {
          const rv = await db.queryOne(
            `SELECT * FROM result_values WHERE result_id = $1 AND parameter_id = $2`,
            [existingResult.id, p.parameter_id]
          );
          if (rv) {
            currentValue = rv.value_numeric !== null ? rv.value_numeric : rv.value_text;
            currentFlag = rv.flag;
            currentIsCritical = rv.is_critical;
            currentRemarks = rv.remarks || '';
          }
        }

        // Delta check: find previous historical value
        const prevRow = await db.queryOne(
          `SELECT rv.value_numeric, rv.value_text, rv.flag, o.created_at as visit_date
           FROM result_values rv
           JOIN results r ON rv.result_id = r.id
           JOIN test_orders o ON r.order_id = o.id
           WHERE o.patient_id = $1 AND rv.parameter_id = $2 AND o.id != $3 AND r.status IN ('verified', 'approved', 'released')
           ORDER BY o.created_at DESC LIMIT 1`,
          [order.patient_id, p.parameter_id, orderId]
        );

        let deltaDifference: number | null = null;
        const prevVal = prevRow ? (prevRow.value_numeric !== null ? prevRow.value_numeric : prevRow.value_text) : null;
        if (currentValue !== null && prevVal !== null && !isNaN(parseFloat(currentValue)) && !isNaN(parseFloat(prevVal))) {
          deltaDifference = Math.round((parseFloat(currentValue) - parseFloat(prevVal)) * 100) / 100;
        }

        parametersWithValues.push({
          ...p,
          value: currentValue !== null ? currentValue : (p.default_value || ''),
          flag: currentFlag,
          is_critical: currentIsCritical,
          remarks: currentRemarks,
          previous_value: prevVal,
          previous_date: prevRow?.visit_date || null,
          delta_difference: deltaDifference
        });
      }

      resultSections.push({
        order_item_id: item.order_item_id,
        test_id: item.test_id,
        test_code: item.test_code,
        test_name: item.test_name,
        department: item.department,
        sample_type: item.sample_type,
        method: item.method,
        result_id: existingResult?.id || null,
        status: existingResult?.status || 'draft',
        is_locked: Boolean(existingResult && (existingResult.status === 'verified' || existingResult.status === 'approved')),
        rejection_reason: existingResult?.rejection_reason || null,
        clinical_remarks: existingResult?.clinical_remarks || '',
        impression: existingResult?.impression || '',
        verified_by_name: existingResult?.verified_by_name || null,
        approved_by_name: existingResult?.approved_by_name || null,
        parameters: parametersWithValues
      });
    }

    res.json({ order_id: orderId, sections: resultSections });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to save results
async function saveResultData(body: any, req: AuthRequest, res: Response) {
  const { order_id, order_item_id, test_id, parameters, clinical_remarks, impression, submit_for_verification, critical_acknowledged } = body;

  if (!order_id || !order_item_id || !test_id || !Array.isArray(parameters)) {
    res.status(400).json({ error: 'Order ID, order item ID, test ID, and parameters array are required' });
    return;
  }

  const order = await db.queryOne<{ id: string; lab_id: string }>(`SELECT id, lab_id FROM test_orders WHERE id = $1`, [order_id]);
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  if (req.user?.lab_id && order.lab_id !== req.user.lab_id) {
    res.status(403).json({ error: 'Access denied: Cannot modify results for another laboratory' });
    return;
  }

  let result = await db.queryOne<{ id: string; status: string; version: number }>(
    `SELECT id, status, version FROM results WHERE order_item_id = $1`,
    [order_item_id]
  );

  // Result locking enforcement
  if (result && (result.status === 'verified' || result.status === 'approved')) {
    const role = req.user?.role_code;
    if (role !== 'pathologist' && role !== 'lab_admin' && role !== 'super_admin') {
      res.status(403).json({
        error: `Results are locked after verification (${result.status}). Only Pathologist or Lab Admin can reopen or modify verified results.`
      });
      return;
    }
  }

  // Strict immutable locking: If report is already released, direct edits are prohibited
  const releasedReport = await db.queryOne<{ id: string; report_number: string }>(
    `SELECT id, report_number FROM reports WHERE order_id = $1 AND status = 'released'`,
    [order_id]
  );
  if (releasedReport) {
    res.status(403).json({
      error: `Results are immutably locked because Diagnostic Report ${releasedReport.report_number} has already been released. Submit an authorized amendment request to issue a revised report version.`
    });
    return;
  }

  const newStatus = submit_for_verification ? 'submitted' : (result?.status === 'rejected' ? 'draft' : (result?.status || 'draft'));
  let resultId = result?.id;
  const oldResult = result ? { ...result } : null;

  if (!result) {
    resultId = `res-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO results (id, order_id, order_item_id, test_id, status, entered_by, entered_at, clinical_remarks, impression, version)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, $8, 1)`,
      [resultId, order_id, order_item_id, test_id, newStatus, req.user?.id, clinical_remarks || '', impression || '']
    );
  } else {
    await db.execute(
      `UPDATE results
       SET status = $1,
           entered_by = $2,
           clinical_remarks = COALESCE($3, clinical_remarks),
           impression = COALESCE($4, impression),
           version = version + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [newStatus, req.user?.id, clinical_remarks, impression, resultId]
    );
  }

  let hasCriticalValue = false;
  const criticalDetails: string[] = [];

  // Process parameter values
  for (const p of parameters) {
    if (p.value === undefined || p.value === null || p.value === '') continue;

    const paramMeta = await db.queryOne(
      `SELECT tp.unit, tp.name as param_name, rr.normal_min, rr.normal_max, rr.critical_low, rr.critical_high, rr.text_range
       FROM test_parameters tp
       LEFT JOIN reference_ranges rr ON tp.id = rr.parameter_id
       WHERE tp.id = $1`,
      [p.parameter_id]
    );

    let flag = 'normal';
    let isCritical = 0;
    let numericVal = null;
    let textVal = null;

    if (!isNaN(parseFloat(p.value))) {
      numericVal = parseFloat(p.value);
      if (paramMeta?.critical_low !== null && paramMeta?.critical_low !== undefined && numericVal <= paramMeta.critical_low) {
        flag = 'critical_low';
        isCritical = 1;
        hasCriticalValue = true;
        criticalDetails.push(`${paramMeta.param_name}: ${numericVal} (Critical Low <= ${paramMeta.critical_low})`);
      } else if (paramMeta?.critical_high !== null && paramMeta?.critical_high !== undefined && numericVal >= paramMeta.critical_high) {
        flag = 'critical_high';
        isCritical = 1;
        hasCriticalValue = true;
        criticalDetails.push(`${paramMeta.param_name}: ${numericVal} (Critical High >= ${paramMeta.critical_high})`);
      } else if (paramMeta?.normal_min !== null && paramMeta?.normal_min !== undefined && numericVal < paramMeta.normal_min) {
        flag = 'low';
      } else if (paramMeta?.normal_max !== null && paramMeta?.normal_max !== undefined && numericVal > paramMeta.normal_max) {
        flag = 'high';
      }
    } else {
      textVal = String(p.value);
      const lower = textVal.toLowerCase();
      flag = lower.includes('positive') || lower.includes('reactive') ? 'abnormal' : 'normal';
    }

    const refText = paramMeta?.text_range ||
      (paramMeta?.normal_min !== null && paramMeta?.normal_min !== undefined && paramMeta?.normal_max !== null && paramMeta?.normal_max !== undefined
        ? `${paramMeta.normal_min} - ${paramMeta.normal_max} ${paramMeta.unit || ''}`
        : '');

    const rvId = `rv-${resultId}-${p.parameter_id}`;
    await db.execute(
      `INSERT INTO result_values (id, result_id, parameter_id, value_numeric, value_text, unit, reference_range_text, flag, is_critical, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE
       SET value_numeric = EXCLUDED.value_numeric,
           value_text = EXCLUDED.value_text,
           flag = EXCLUDED.flag,
           is_critical = EXCLUDED.is_critical,
           remarks = EXCLUDED.remarks`,
      [rvId, resultId, p.parameter_id, numericVal, textVal, paramMeta?.unit || '', refText, flag, isCritical, p.remarks || '']
    );
  }

  // Update order items & test order status
  await db.execute(`UPDATE order_items SET status = $1 WHERE id = $2`, [newStatus === 'submitted' ? 'resulted' : 'processing', order_item_id]);
  await db.execute(`UPDATE test_orders SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [order_id]);

  // If critical values present, log alert event
  if (hasCriticalValue) {
    auditFromReq(req, 'CRITICAL_VALUE_ALERT', 'result', resultId, null, {
      order_id,
      critical_details: criticalDetails,
      acknowledged: Boolean(critical_acknowledged),
      user: req.user?.name
    });
  }

  auditFromReq(req, 'ENTER_RESULTS', 'result', resultId, oldResult, {
    order_id,
    test_id,
    status: newStatus,
    version: (result?.version || 0) + 1,
    has_critical: hasCriticalValue
  });

  res.json({
    message: submit_for_verification ? 'Results submitted for clinical verification' : 'Draft results saved successfully',
    result_id: resultId,
    status: newStatus,
    has_critical: hasCriticalValue,
    critical_details: criticalDetails
  });
}

// POST /api/results/save
router.post('/save', authenticateToken, requirePermission('enter_results'), async (req: AuthRequest, res: Response) => {
  try {
    await saveResultData(req.body, req, res);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/results
router.post('/', authenticateToken, requirePermission('enter_results'), async (req: AuthRequest, res: Response) => {
  try {
    await saveResultData(req.body, req, res);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/results/:id/submit - Technician submits draft for verification
router.post('/:id/submit', authenticateToken, requirePermission('enter_results'), async (req: AuthRequest, res: Response) => {
  const resultId = req.params.id;

  try {
    const result = await db.queryOne<{ id: string; order_id: string; order_item_id: string }>(
      `SELECT id, order_id, order_item_id FROM results WHERE id = $1`,
      [resultId]
    );

    if (!result) {
      res.status(404).json({ error: 'Result not found' });
      return;
    }

    await db.execute(`UPDATE results SET status = 'submitted', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [resultId]);
    await db.execute(`UPDATE order_items SET status = 'resulted' WHERE id = $1`, [result.order_item_id]);

    auditFromReq(req, 'SUBMIT_RESULTS_VERIFICATION', 'result', resultId, null, { order_id: result.order_id });

    res.json({ message: 'Results submitted for verification', status: 'submitted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/results/:id/verify - Pathologist verifies result
router.post('/:id/verify', authenticateToken, requirePermission('verify_results'), async (req: AuthRequest, res: Response) => {
  const resultId = req.params.id;
  const { remarks } = req.body;

  try {
    const result = await db.queryOne<{ id: string; order_id: string; order_item_id: string; status: string }>(
      `SELECT id, order_id, order_item_id, status FROM results WHERE id = $1`,
      [resultId]
    );

    if (!result) {
      res.status(404).json({ error: 'Result not found' });
      return;
    }

    await db.execute(
      `UPDATE results
       SET status = 'verified',
           verified_by = $1,
           verified_at = CURRENT_TIMESTAMP,
           clinical_remarks = COALESCE($2, clinical_remarks),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [req.user?.id, remarks || null, resultId]
    );

    await db.execute(`UPDATE order_items SET status = 'verified' WHERE id = $1`, [result.order_item_id]);

    // Record verification event
    await db.execute(
      `INSERT INTO result_verifications (id, result_id, verified_by, status, remarks)
       VALUES ($1, $2, $3, 'verified', $4)`,
      [`rv-${uuidv4().substring(0, 8)}`, resultId, req.user?.id, remarks || 'Clinically verified']
    );

    auditFromReq(req, 'VERIFY_RESULTS', 'result', resultId, { status: result.status }, { status: 'verified', verifier: req.user?.name });

    res.json({ message: 'Result verified and locked successfully', status: 'verified' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/results/:id/reject - Pathologist rejects result back to technician
router.post('/:id/reject', authenticateToken, requirePermission('verify_results'), async (req: AuthRequest, res: Response) => {
  const resultId = req.params.id;
  const { reason, correction_requested } = req.body;

  if (!reason && !correction_requested) {
    res.status(400).json({ error: 'Rejection reason or correction note is required' });
    return;
  }

  try {
    const result = await db.queryOne<{ id: string; order_id: string; order_item_id: string; status: string }>(
      `SELECT id, order_id, order_item_id, status FROM results WHERE id = $1`,
      [resultId]
    );

    if (!result) {
      res.status(404).json({ error: 'Result not found' });
      return;
    }

    const rejectionReason = reason || correction_requested;

    await db.execute(
      `UPDATE results
       SET status = 'draft',
           rejection_reason = $1,
           correction_notes = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [rejectionReason, correction_requested || null, resultId]
    );

    await db.execute(`UPDATE order_items SET status = 'processing' WHERE id = $1`, [result.order_item_id]);

    // Record verification rejection
    await db.execute(
      `INSERT INTO result_verifications (id, result_id, verified_by, status, remarks, correction_requested, rejection_reason)
       VALUES ($1, $2, $3, 'rejected', $4, $5, $6)`,
      [`rv-${uuidv4().substring(0, 8)}`, resultId, req.user?.id, rejectionReason, correction_requested || null, rejectionReason]
    );

    auditFromReq(req, 'REJECT_RESULTS', 'result', resultId, null, {
      rejection_reason: rejectionReason,
      order_id: result.order_id
    });

    res.json({ message: 'Result rejected for correction', status: 'draft', reason: rejectionReason });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
