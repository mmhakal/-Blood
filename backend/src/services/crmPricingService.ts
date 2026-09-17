import db from '../db/database';
import { v4 as uuidv4 } from 'uuid';

export interface PriceResolutionOptions {
  branchId?: string;
  corporateId?: string;
  doctorId?: string;
  campaignId?: string;
}

export class CrmPricingService {
  /**
   * Resolve effective test price applying multi-tier hierarchy & floor limits
   */
  public static async resolveEffectivePrice(
    labId: string,
    testId: string,
    options: PriceResolutionOptions = {}
  ): Promise<{ effectivePrice: number; basePrice: number; appliedRule: string; discountPercent: number }> {
    // 1. Base Test Price
    const test = await db.queryOne<{ base_price: number; name: string }>(
      `SELECT base_price, name FROM tests WHERE id = $1 AND lab_id = $2`,
      [testId, labId]
    );
    if (!test) throw new Error('Test not found in catalog');

    const basePrice = Number(test.base_price || 0);
    let resolvedPrice = basePrice;
    let appliedRule = 'DEFAULT_CATALOG_PRICE';
    let discountPercent = 0;
    let minFloorPrice = 0;

    // 2. Check Promotional Campaign Override
    if (options.campaignId) {
      const cmp = await db.queryOne<{ discount_percentage: number; status: string }>(
        `SELECT discount_percentage, status FROM campaigns WHERE id = $1 AND lab_id = $2 AND status = 'active'`,
        [options.campaignId, labId]
      );
      if (cmp && cmp.discount_percentage > 0) {
        discountPercent = Number(cmp.discount_percentage);
        resolvedPrice = basePrice - (basePrice * discountPercent) / 100;
        appliedRule = 'PROMOTIONAL_CAMPAIGN_DISCOUNT';
      }
    }

    // 3. Check Corporate B2B Account Override
    if (options.corporateId && appliedRule === 'DEFAULT_CATALOG_PRICE') {
      const corp = await db.queryOne<{ discount_percentage: number; status: string }>(
        `SELECT discount_percentage, status FROM corporate_accounts WHERE id = $1 AND lab_id = $2 AND status = 'active'`,
        [options.corporateId, labId]
      );
      if (corp && corp.discount_percentage > 0) {
        discountPercent = Number(corp.discount_percentage);
        resolvedPrice = basePrice - (basePrice * discountPercent) / 100;
        appliedRule = 'CORPORATE_CONTRACT_PRICING';
      }
    }

    // 4. Check Branch Specific Override
    if (options.branchId && appliedRule === 'DEFAULT_CATALOG_PRICE') {
      const branchPrice = await db.queryOne<{ price: number }>(
        `SELECT price FROM test_prices WHERE test_id = $1 AND branch_id = $2`,
        [testId, options.branchId]
      );
      if (branchPrice && branchPrice.price > 0) {
        resolvedPrice = Number(branchPrice.price);
        appliedRule = 'BRANCH_PRICE_OVERRIDE';
        discountPercent = basePrice > resolvedPrice ? Math.round(((basePrice - resolvedPrice) / basePrice) * 100) : 0;
      }
    }

    // 5. Check Explicit Pricing Rule
    const rule = await db.queryOne<{ price_override: number; discount_percentage: number; min_floor_price: number }>(
      `SELECT price_override, discount_percentage, min_floor_price 
       FROM pricing_rules 
       WHERE lab_id = $1 AND is_active = 1 
       AND (test_id = $2 OR test_id IS NULL)
       ORDER BY test_id DESC LIMIT 1`,
      [labId, testId]
    );

    if (rule) {
      minFloorPrice = Number(rule.min_floor_price || 0);
    }

    // Enforce Floor Limit
    if (minFloorPrice > 0 && resolvedPrice < minFloorPrice) {
      resolvedPrice = minFloorPrice;
      appliedRule += ' (ADJUSTED_TO_FLOOR_LIMIT)';
    }

    return {
      effectivePrice: Math.round(resolvedPrice * 100) / 100,
      basePrice,
      appliedRule,
      discountPercent,
    };
  }

  /**
   * Log doctor referral analytics record
   */
  public static async logReferral(labId: string, orderId: string, amount: number, doctorId?: string, corporateId?: string) {
    if (!doctorId && !corporateId) return;

    await db.execute(
      `INSERT INTO referral_records (id, lab_id, doctor_id, corporate_id, order_id, order_amount)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [`ref-${uuidv4().substring(0, 8)}`, labId, doctorId || null, corporateId || null, orderId, amount]
    );

    // Update corporate outstanding if applicable
    if (corporateId) {
      await db.execute(
        `UPDATE corporate_accounts SET current_outstanding = current_outstanding + $1 WHERE id = $2 AND lab_id = $3`,
        [amount, corporateId, labId]
      );
    }
  }

  /**
   * Record Customer Feedback & NPS
   */
  public static async recordFeedback(labId: string, data: any) {
    const id = `fb-${uuidv4().substring(0, 8)}`;
    const rating = Math.min(5, Math.max(1, Number(data.rating || 5)));
    const nps = data.nps_score !== undefined ? Math.min(10, Math.max(0, Number(data.nps_score))) : rating * 2;
    const sentiment = rating >= 4 ? 'positive' : (rating === 3 ? 'neutral' : 'negative');

    await db.execute(
      `INSERT INTO customer_feedback (id, lab_id, branch_id, patient_id, order_id, rating, nps_score, category, comments, sentiment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        labId,
        data.branch_id || null,
        data.patient_id || null,
        data.order_id || null,
        rating,
        nps,
        data.category || 'overall_service',
        data.comments || null,
        sentiment,
      ]
    );

    return db.queryOne(`SELECT * FROM customer_feedback WHERE id = $1`, [id]);
  }
}

export default CrmPricingService;
