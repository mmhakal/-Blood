import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { auditFromReq } from '../services/auditService';

const router = Router();

// GET /api/approvals/workflows - List approval workflows
router.get('/workflows', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';

  try {
    const workflows = await db.query(
      `SELECT aw.*,
              (SELECT json_group_array(json_object('step_order', step_order, 'required_role', required_role, 'step_name', step_name))
               FROM approval_steps WHERE workflow_id = aw.id) as steps_json
       FROM approval_workflows aw
       WHERE aw.lab_id = $1
       ORDER BY aw.created_at ASC`,
      [labId]
    );

    res.json(workflows.map(w => ({
      ...w,
      steps: typeof w.steps_json === 'string' ? JSON.parse(w.steps_json) : w.steps_json || []
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/approvals/workflows - Create approval workflow
router.post('/workflows', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';
  const { workflow_type, name, description, steps } = req.body;

  if (!workflow_type || !name || !Array.isArray(steps) || steps.length === 0) {
    res.status(400).json({ error: 'workflow_type, name, and steps array are required' });
    return;
  }

  try {
    const id = `wf-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO approval_workflows (id, lab_id, workflow_type, name, description, steps_count, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, 1)`,
      [id, labId, workflow_type, name, description || '', steps.length]
    );

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepId = `step-${uuidv4().substring(0, 8)}`;
      await db.execute(
        `INSERT INTO approval_steps (id, workflow_id, step_order, required_role, step_name, approval_mode)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [stepId, id, i + 1, step.required_role || 'lab_admin', step.step_name || `Step ${i + 1}`, step.approval_mode || 'single']
      );
    }

    auditFromReq(req, 'CREATE_APPROVAL_WORKFLOW', 'approval_workflow', id, null, { name, workflow_type });
    res.status(201).json({ message: 'Approval workflow configured successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/approvals/requests - List approval requests
router.get('/requests', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';
  const status = (req.query.status as string) || undefined;

  try {
    let query = `
      SELECT ar.*, aw.name as workflow_name, aw.workflow_type, aw.steps_count, u.name as requester_name
      FROM approval_requests ar
      JOIN approval_workflows aw ON ar.workflow_id = aw.id
      JOIN users u ON ar.requested_by = u.id
      WHERE ar.lab_id = $1
    `;
    const params: any[] = [labId];

    if (status && status !== 'all') {
      params.push(status);
      query += ` AND ar.status = $${params.length}`;
    }

    query += ` ORDER BY ar.created_at DESC`;

    const requests = await db.query(query, params);
    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/approvals/requests/:id/action - Approve or reject request
router.post('/requests/:id/action', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { decision, notes } = req.body; // approved, rejected

  if (!decision || !['approved', 'rejected'].includes(decision)) {
    res.status(400).json({ error: 'Valid decision (approved or rejected) is required' });
    return;
  }

  try {
    const request = await db.queryOne<{ id: string; current_step: number; workflow_id: string; history_json: string }>(
      `SELECT ar.*, aw.steps_count
       FROM approval_requests ar
       JOIN approval_workflows aw ON ar.workflow_id = aw.id
       WHERE ar.id = $1`,
      [req.params.id]
    );

    if (!request) {
      res.status(404).json({ error: 'Approval request not found' });
      return;
    }

    const totalSteps = (request as any).steps_count || 1;
    let newStatus = request.current_step >= totalSteps ? decision : (decision === 'rejected' ? 'rejected' : 'pending');
    let nextStep = decision === 'approved' && request.current_step < totalSteps ? request.current_step + 1 : request.current_step;

    let history: any[] = [];
    try {
      history = JSON.parse(request.history_json || '[]');
    } catch {
      history = [];
    }

    history.push({
      step: request.current_step,
      decision,
      decided_by: req.user?.name || 'Administrator',
      role: req.user?.role_code,
      notes: notes || '',
      timestamp: new Date().toISOString()
    });

    await db.execute(
      `UPDATE approval_requests
       SET status = $1, current_step = $2, decision_notes = $3, history_json = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [newStatus, nextStep, notes || '', JSON.stringify(history), req.params.id]
    );

    auditFromReq(req, 'DECIDE_APPROVAL_REQUEST', 'approval_request', req.params.id, null, { decision, step: request.current_step });

    res.json({
      message: `Request step ${decision}. Overall status: ${newStatus}`,
      status: newStatus,
      current_step: nextStep
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
