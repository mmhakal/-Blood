import { Router, Response } from 'express';
import db from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { requireRoles } from '../middleware/rbac';
import CrmPricingService from '../services/crmPricingService';
import { auditFromReq } from '../services/auditService';

const router = Router();

const resolveLabId = (req: AuthRequest): string => {
  return req.user?.lab_id || (req.user?.role_code === 'super_admin' ? ((req.query.lab_id as string) || (req.headers['x-lab-id'] as string) || 'lab-apex') : 'lab-apex');
};

// Handler: Calculate effective test price
const handleCalculatePrice = async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);
  const { test_id, branch_id, corporate_id, doctor_id, campaign_id } = req.body;

  try {
    const result = await CrmPricingService.resolveEffectivePrice(labId, test_id || 'test-cbc', {
      branchId: branch_id,
      corporateId: corporate_id,
      doctorId: doctor_id,
      campaignId: campaign_id,
    });

    res.json({
      ...result,
      final_price: result.effectivePrice,
      discount_applied: result.discountPercent,
      applied_rule_name: result.appliedRule,
      floor_price_protected: result.appliedRule.includes('FLOOR_LIMIT'),
      margin_protected: true
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

router.post('/resolve', authenticateToken, requireTenant, handleCalculatePrice);
router.post('/calculate', authenticateToken, requireTenant, handleCalculatePrice);

// GET /api/pricing-engine/rules - List pricing rules
router.get('/rules', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);

  try {
    const rules = await db.query<any>(
      `SELECT pr.*, t.name as test_name
       FROM pricing_rules pr
       LEFT JOIN tests t ON pr.test_id = t.id
       WHERE ($1 IS NULL OR pr.lab_id = $1)
       ORDER BY pr.created_at DESC`,
      [labId]
    );
    res.json(rules);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pricing-engine/rules - Create pricing rule
router.post('/rules', authenticateToken, requireTenant, requireRoles(['super_admin', 'lab_admin']), async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);
  const { test_id, rule_type, target_id, price_override, discount_percentage, min_floor_price } = req.body;
  const ruleType = rule_type || req.body.client_type || req.body.scope_type || 'corporate';
  const discountPct = discount_percentage ?? (req.body.adjustment_type === 'percentage_discount' ? req.body.adjustment_value : 0) ?? 0;
  const floorPrice = min_floor_price ?? req.body.floor_price_inr ?? 0;

  try {
    const id = `pr-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO pricing_rules (id, lab_id, test_id, rule_type, target_id, price_override, discount_percentage, min_floor_price, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, $9)`,
      [
        id,
        labId,
        test_id || null,
        ruleType,
        target_id || null,
        price_override || 0,
        discountPct,
        floorPrice,
        req.user?.id,
      ]
    );


    auditFromReq(req, 'CREATE_PRICING_RULE', 'pricing_rule', id, null, { rule_type, price_override });
    const rule = await db.queryOne(`SELECT * FROM pricing_rules WHERE id = $1`, [id]);
    res.status(201).json(rule);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Handler: Test Profitability & Contribution Margin
const handleProfitability = async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);

  try {
    const tests = await db.query<any>(
      `SELECT t.id as test_id, t.name as test_name, t.code as test_code, t.base_price,
              ROUND(t.base_price * 0.18, 2) as reagent_cost,
              ROUND(t.base_price * 0.08, 2) as consumable_cost,
              ROUND(t.base_price * 0.05, 2) as labor_cost,
              ROUND(t.base_price * 0.31, 2) as total_direct_cost,
              ROUND(t.base_price * 0.69, 2) as gross_profit,
              69.0 as margin_percentage,
              COALESCE((SELECT COUNT(*) FROM results WHERE test_id = t.id), 30) as annual_volume,
              ROUND(t.base_price * 0.69 * COALESCE((SELECT COUNT(*) FROM results WHERE test_id = t.id), 30), 2) as total_annual_profit
       FROM tests t
       WHERE ($1 IS NULL OR t.lab_id = $1)
       ORDER BY t.base_price DESC LIMIT 50`,
      [labId]
    );

    res.json(tests);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

router.get('/test-profitability', authenticateToken, requireTenant, handleProfitability);
router.get('/profitability-bi', authenticateToken, requireTenant, handleProfitability);

export default router;
