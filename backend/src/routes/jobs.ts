import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { QueueService, JobType, JobStatus } from '../services/queueService';

const router = Router();

// GET /api/jobs/metrics - Queue metrics
router.get('/metrics', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json(QueueService.getMetrics());
});

// GET /api/jobs - List background jobs
router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const type = req.query.type as JobType | undefined;
  const status = req.query.status as JobStatus | undefined;
  const jobs = QueueService.listJobs(type, status);
  res.json(jobs);
});

// GET /api/jobs/:id - Get specific job progress
router.get('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const job = QueueService.getJob(req.params.id as string);
  if (!job) {
    res.status(404).json({ error: 'Job not found in queue' });
    return;
  }
  res.json(job);
});

export default router;
