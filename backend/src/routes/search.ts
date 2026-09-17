import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import IntelligentSearchService from '../services/intelligentSearchService';

const router = Router();

// GET /api/search?q=... - Global intelligent search
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const query = (req.query.q as string) || '';
  const labId = req.user?.lab_id || 'lab-apex';

  if (!query || query.trim().length === 0) {
    res.json({
      query: '',
      total_results: 0,
      results: []
    });
    return;
  }

  try {
    const results = await IntelligentSearchService.search(query, labId, req.user?.role_code);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
