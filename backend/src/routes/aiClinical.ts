import { Router, Response } from 'express';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import AIClinicalService from '../services/aiClinicalService';
import { auditFromReq } from '../services/auditService';

const router = Router();

// GET /api/ai/trends/:patientId - Patient historical result trend analysis
router.get('/trends/:patientId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';

  try {
    const trends = await AIClinicalService.analyzePatientTrends(req.params.patientId as string, labId);
    res.json({
      patient_id: req.params.patientId,
      disclaimer: 'AI-Generated Suggestion: Clinical correlation and professional verification mandatory.',
      trends
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/draft-report/:reportId - AI-assisted non-diagnostic report comment suggestions
router.post('/draft-report/:reportId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';

  try {
    const drafts = await AIClinicalService.draftReportAssistance(req.params.reportId as string, labId);
    res.json(drafts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai/anomalies - Real-time clinical, QC, and analyzer anomaly detection
router.get('/anomalies', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';

  try {
    const anomalies = await AIClinicalService.detectAnomalies(labId);
    res.json(anomalies);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai/tat-predictions - Predictive TAT and SLA risk modeling
router.get('/tat-predictions', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';

  try {
    const predictions = await AIClinicalService.predictTurnaroundTime(labId);
    res.json(predictions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai/inventory-forecasts - Predictive reagent demand and burn rate projections
router.get('/inventory-forecasts', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';

  try {
    const forecasts = await AIClinicalService.forecastInventory(labId);
    res.json(forecasts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai/governance - Complete AI governance audit trail & feedback logs
router.get('/governance', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';

  try {
    const events = await db.query(
      `SELECT ae.*, u.name as user_name
       FROM ai_events ae
       LEFT JOIN users u ON ae.user_id = u.id
       WHERE ae.lab_id = $1
       ORDER BY ae.created_at DESC LIMIT 50`,
      [labId]
    );

    const feedback = await db.query(
      `SELECT af.*, asug.suggestion_type, asug.content_text, u.name as reviewer_name
       FROM ai_feedback af
       JOIN ai_suggestions asug ON af.suggestion_id = asug.id
       JOIN users u ON af.user_id = u.id
       WHERE asug.lab_id = $1
       ORDER BY af.created_at DESC LIMIT 50`,
      [labId]
    );

    res.json({
      events_count: events.length,
      feedback_count: feedback.length,
      events,
      feedback
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/feedback - Record professional clinical decision on AI output
router.post('/feedback', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { suggestion_id, decision, edited_text, rejection_reason } = req.body;

  if (!suggestion_id || !decision) {
    res.status(400).json({ error: 'suggestion_id and decision are required' });
    return;
  }

  try {
    const feedbackId = await AIClinicalService.recordFeedback({
      suggestionId: suggestion_id,
      userId: req.user?.id || 'user-pathologist',
      decision,
      editedText: edited_text,
      rejectionReason: rejection_reason
    });

    auditFromReq(req, 'RECORD_AI_FEEDBACK', 'ai_feedback', feedbackId, null, { suggestion_id, decision });

    res.status(201).json({
      message: `AI suggestion ${decision} successfully`,
      feedback_id: feedbackId
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
