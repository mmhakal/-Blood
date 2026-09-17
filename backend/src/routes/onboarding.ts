import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { OnboardingService } from '../services/onboardingService';

const router = Router();

// GET /api/onboarding/status - Retrieve customer onboarding progress
router.get('/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';
  try {
    const progress = await OnboardingService.getProgress(labId);
    res.json(progress);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/onboarding/quick-starter - 1-Click Starter Kit Provisioning
router.post('/quick-starter', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';
  try {
    const result = await OnboardingService.provisionQuickStarter(labId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
