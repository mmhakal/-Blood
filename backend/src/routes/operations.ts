import { Router, Response } from 'express';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import OperationsService from '../services/operationsService';
import { auditFromReq } from '../services/auditService';

const router = Router();

const resolveLabId = (req: AuthRequest): string | undefined => {
  return req.user?.lab_id || (req.user?.role_code === 'super_admin' ? ((req.query.lab_id as string) || (req.headers['x-lab-id'] as string) || 'lab-apex') : undefined);
};

// GET /api/operations/kpis - Real-time command center telemetry
router.get('/kpis', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);
  if (!labId) {
    res.status(403).json({ error: 'Tenant context required' });
    return;
  }

  const branchId = req.query.branch_id as string | undefined;

  try {
    const kpis = await OperationsService.getOperationsKpis(labId, branchId);
    res.json(kpis);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/operations/tasks - Centralized task queue
router.get('/tasks', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);
  if (!labId) {
    res.status(403).json({ error: 'Tenant context required' });
    return;
  }

  try {
    const tasks = await OperationsService.listTasks(labId, req.query);
    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/operations/tasks - Create manual/operational task
router.post('/tasks', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);
  if (!labId) {
    res.status(403).json({ error: 'Tenant context required' });
    return;
  }

  if (!req.body.title) {
    res.status(400).json({ error: 'Task title is required' });
    return;
  }

  try {
    const task = await OperationsService.createTask(labId, req.body, req.user?.id);
    auditFromReq(req, 'CREATE_TASK', 'task', task?.id, null, { title: req.body.title });
    res.status(201).json(task);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/operations/tasks/:id - Update task status / assign / complete
router.put('/tasks/:id', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);
  if (!labId) {
    res.status(403).json({ error: 'Tenant context required' });
    return;
  }

  try {
    const task = await OperationsService.updateTask(req.params.id as string, labId, req.body, req.user?.id);
    auditFromReq(req, 'UPDATE_TASK', 'task', req.params.id, null, { status: req.body.status });
    res.json(task);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
