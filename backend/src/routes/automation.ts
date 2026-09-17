import { Router, Response } from 'express';
import db from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { requireRoles } from '../middleware/rbac';
import AutomationEngineService from '../services/automationEngineService';
import { auditFromReq } from '../services/auditService';

const router = Router();

const resolveLabId = (req: AuthRequest): string | undefined => {
  return req.user?.lab_id || (req.user?.role_code === 'super_admin' ? ((req.query.lab_id as string) || (req.headers['x-lab-id'] as string) || 'lab-apex') : undefined);
};

// GET /api/automation/rules - List rules
router.get('/rules', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);
  if (!labId) {
    res.status(403).json({ error: 'Tenant context required' });
    return;
  }

  try {
    const rules = await db.query<any>(
      `SELECT * FROM automation_rules WHERE lab_id = $1 ORDER BY created_at DESC`,
      [labId]
    );
    res.json(rules);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/automation/rules - Create automation rule
router.post('/rules', authenticateToken, requireTenant, requireRoles(['super_admin', 'lab_admin']), async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);
  if (!labId) {
    res.status(403).json({ error: 'Tenant context required' });
    return;
  }

  const { name, description, trigger_event, conditions, actions, is_active } = req.body;
  if (!name || !trigger_event) {
    res.status(400).json({ error: 'Rule name and trigger_event are required' });
    return;
  }

  try {
    const id = `rule-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO automation_rules (id, lab_id, name, description, trigger_event, conditions_json, actions_json, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        labId,
        name,
        description || null,
        trigger_event,
        JSON.stringify(conditions || []),
        JSON.stringify(actions || []),
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        req.user?.id,
      ]
    );

    auditFromReq(req, 'CREATE_AUTOMATION_RULE', 'automation_rule', id, null, { name, trigger_event });
    const rule = await db.queryOne(`SELECT * FROM automation_rules WHERE id = $1`, [id]);
    res.status(201).json(rule);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/automation/rules/:id/test - Test rule condition evaluation
router.post('/rules/:id/test', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);
  const ruleId = req.params.id as string;

  try {
    const rule = await db.queryOne<any>(
      `SELECT * FROM automation_rules WHERE id = $1 AND ($2 IS NULL OR lab_id = $2)`,
      [ruleId, labId]
    );
    if (!rule) {
      res.status(404).json({ error: 'Rule not found' });
      return;
    }

    const conditions = JSON.parse(rule.conditions_json || '[]');
    const testContext = req.body.context || {};
    const conditionMatched = AutomationEngineService.evaluateConditions(conditions, testContext);

    res.json({
      rule_id: rule.id,
      rule_name: rule.name,
      test_context: testContext,
      condition_matched: conditionMatched,
      message: conditionMatched ? 'Conditions satisfied. Actions would execute.' : 'Conditions evaluated to false.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/automation/executions - Recent execution history
router.get('/executions', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);

  try {
    const logs = await db.query<any>(
      `SELECT e.*, r.name as rule_name
       FROM automation_executions e
       JOIN automation_rules r ON e.rule_id = r.id
       WHERE ($1 IS NULL OR e.lab_id = $1)
       ORDER BY e.executed_at DESC LIMIT 50`,
      [labId]
    );
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/automation/scheduled-jobs - List scheduled jobs
router.get('/scheduled-jobs', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);

  try {
    const jobs = await db.query<any>(
      `SELECT * FROM scheduled_jobs WHERE ($1 IS NULL OR lab_id = $1) ORDER BY created_at DESC`,
      [labId]
    );
    res.json(jobs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/automation/scheduled-jobs - Register scheduled job
router.post('/scheduled-jobs', authenticateToken, requireTenant, requireRoles(['super_admin', 'lab_admin']), async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);
  const { job_name, job_type, cron_schedule, timezone, recipient_emails, delivery_channel } = req.body;

  if (!job_name || !job_type || !cron_schedule) {
    res.status(400).json({ error: 'job_name, job_type, and cron_schedule are required' });
    return;
  }

  try {
    const id = `job-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO scheduled_jobs (id, lab_id, job_name, job_type, cron_schedule, timezone, recipient_emails, delivery_channel, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)`,
      [
        id,
        labId,
        job_name,
        job_type,
        cron_schedule,
        timezone || 'Asia/Kolkata',
        recipient_emails || null,
        delivery_channel || 'email',
      ]
    );

    auditFromReq(req, 'CREATE_SCHEDULED_JOB', 'scheduled_job', id, null, { job_name, job_type });
    const job = await db.queryOne(`SELECT * FROM scheduled_jobs WHERE id = $1`, [id]);
    res.status(201).json(job);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
