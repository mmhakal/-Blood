/**
 * MediFlow LIS — Clinical Validation & Decision Support Engine
 * Implements:
 * 1. Delta Check Engine (Historical Patient Variation Detection)
 * 2. Westgard Multirules Engine for Statistical Quality Control
 * 3. Clinical Calculation Formula Engine
 * 4. Configurable Auto-Validation Engine
 * 5. Reflex Secondary Testing Engine
 */

import db from '../db/database';

export interface DeltaCheckResult {
  hasRule: boolean;
  violated: boolean;
  previousValue: number | null;
  previousDate: string | null;
  currentValue: number;
  percentageChange: number | null;
  absoluteChange: number | null;
  action: string;
  message?: string;
}

export interface WestgardEvaluation {
  zScore: number;
  status: 'pass' | 'warning' | 'reject';
  violations: string[];
}

/**
 * 1. DELTA CHECK EVALUATOR
 * Compares current test result against patient's previous historical results.
 */
export async function evaluateDeltaCheck(
  labId: string,
  patientId: string,
  parameterId: string,
  currentValue: number
): Promise<DeltaCheckResult> {
  const rule = await db.queryOne<{
    max_percent_change: number;
    max_absolute_change: number;
    lookback_days: number;
    action: string;
  }>(
    `SELECT max_percent_change, max_absolute_change, lookback_days, action
     FROM delta_check_rules
     WHERE lab_id = $1 AND parameter_id = $2 AND is_active = 1`,
    [labId, parameterId]
  );

  if (!rule) {
    return {
      hasRule: false,
      violated: false,
      previousValue: null,
      previousDate: null,
      currentValue,
      percentageChange: null,
      absoluteChange: null,
      action: 'normal'
    };
  }

  const lookback = rule.lookback_days || 30;

  // Find previous verified result value for this patient & parameter
  const prevRecord = await db.queryOne<{
    numeric_value: number;
    created_at: string;
  }>(
    `SELECT rv.value_numeric as numeric_value, r.created_at
     FROM result_values rv
     JOIN results r ON rv.result_id = r.id
     JOIN test_orders o ON r.order_id = o.id
     WHERE o.patient_id = $1
       AND rv.parameter_id = $2
       AND rv.value_numeric IS NOT NULL
       AND r.status IN ('verified', 'approved', 'released')
       AND r.created_at >= date('now', '-' || $3 || ' days')
     ORDER BY r.created_at DESC LIMIT 1`,
    [patientId, parameterId, lookback]
  );

  if (!prevRecord || prevRecord.numeric_value === null || prevRecord.numeric_value === undefined) {
    return {
      hasRule: true,
      violated: false,
      previousValue: null,
      previousDate: null,
      currentValue,
      percentageChange: null,
      absoluteChange: null,
      action: 'normal',
      message: 'No previous historical results found in lookback window.'
    };
  }

  const prevVal = Number(prevRecord.numeric_value);
  const absChange = Math.abs(currentValue - prevVal);
  const pctChange = prevVal !== 0 ? Math.abs((currentValue - prevVal) / prevVal) * 100 : 0;

  let violated = false;
  const violationReasons: string[] = [];

  if (rule.max_absolute_change && absChange > rule.max_absolute_change) {
    violated = true;
    violationReasons.push(`Absolute shift of ${absChange.toFixed(2)} exceeds threshold (${rule.max_absolute_change})`);
  }

  if (rule.max_percent_change && pctChange > rule.max_percent_change) {
    violated = true;
    violationReasons.push(`Percentage variation of ${pctChange.toFixed(1)}% exceeds threshold (${rule.max_percent_change}%)`);
  }

  return {
    hasRule: true,
    violated,
    previousValue: prevVal,
    previousDate: prevRecord.created_at,
    currentValue,
    percentageChange: Number(pctChange.toFixed(1)),
    absoluteChange: Number(absChange.toFixed(2)),
    action: violated ? (rule.action || 'flag') : 'pass',
    message: violated ? violationReasons.join('; ') : 'Within historical delta boundaries'
  };
}

/**
 * 2. WESTGARD MULTIRULES QC EVALUATOR
 * Rules:
 * - 1_2s (Warning): 1 point exceeds +/- 2 SD
 * - 1_3s (Reject): 1 point exceeds +/- 3 SD
 * - 2_2s (Reject): 2 consecutive points exceed +/- 2 SD on same side of mean
 * - R_4s (Reject): 1 point > +2 SD and next point < -2 SD (range exceeds 4 SD)
 * - 4_1s (Reject): 4 consecutive points exceed +/- 1 SD on same side of mean
 * - 10_x (Reject): 10 consecutive points on same side of mean
 */
export async function evaluateWestgardRules(
  lotId: string,
  parameterId: string,
  currentValue: number,
  mean: number,
  sd: number
): Promise<WestgardEvaluation> {
  if (sd <= 0) {
    return { zScore: 0, status: 'pass', violations: [] };
  }

  const currentZ = Number(((currentValue - mean) / sd).toFixed(2));
  const violations: string[] = [];
  let status: 'pass' | 'warning' | 'reject' = 'pass';

  // Fetch previous 10 QC runs for this lot & parameter
  const history = await db.query<{ z_score: number; value: number }>(
    `SELECT z_score, value FROM qc_results
     WHERE lot_id = $1 AND parameter_id = $2
     ORDER BY run_time DESC LIMIT 10`,
    [lotId, parameterId]
  );

  const prevZScores = history.map((h) => Number(h.z_score || 0));
  const series = [currentZ, ...prevZScores];

  // Rule 1: 1_3s (Reject)
  if (Math.abs(currentZ) >= 3.0) {
    violations.push('1_3s (Result exceeds 3 SD limit)');
    status = 'reject';
  }

  // Rule 2: 1_2s (Warning)
  if (Math.abs(currentZ) >= 2.0 && status !== 'reject') {
    violations.push('1_2s (Result exceeds 2 SD warning boundary)');
    status = 'warning';
  }

  // Rule 3: 2_2s (Reject)
  if (series.length >= 2) {
    const p1 = series[0];
    const p2 = series[1];
    if ((p1 >= 2.0 && p2 >= 2.0) || (p1 <= -2.0 && p2 <= -2.0)) {
      violations.push('2_2s (Two consecutive runs exceed 2 SD on the same side of mean)');
      status = 'reject';
    }
  }

  // Rule 4: R_4s (Reject)
  if (series.length >= 2) {
    const p1 = series[0];
    const p2 = series[1];
    if (Math.abs(p1 - p2) >= 4.0) {
      violations.push('R_4s (Range between consecutive control points exceeds 4 SD)');
      status = 'reject';
    }
  }

  // Rule 5: 4_1s (Reject)
  if (series.length >= 4) {
    const first4 = series.slice(0, 4);
    const allHigh = first4.every((z) => z >= 1.0);
    const allLow = first4.every((z) => z <= -1.0);
    if (allHigh || allLow) {
      violations.push('4_1s (Four consecutive runs exceed 1 SD on the same side of mean)');
      status = 'reject';
    }
  }

  // Rule 6: 10_x (Reject / Systematic Shift)
  if (series.length >= 10) {
    const first10 = series.slice(0, 10);
    const allPositive = first10.every((z) => z > 0);
    const allNegative = first10.every((z) => z < 0);
    if (allPositive || allNegative) {
      violations.push('10_x (Ten consecutive runs fall on the same side of mean - Systematic Shift)');
      status = 'reject';
    }
  }

  return {
    zScore: currentZ,
    status,
    violations
  };
}

/**
 * 3. CLINICAL CALCULATION FORMULA EVALUATOR
 * Dynamically computes derived parameters (e.g. Friedewald LDL = Total Chol - HDL - Trig/5)
 */
export function evaluateFormula(
  expression: string,
  variables: Record<string, number>,
  precision: number = 2
): number | null {
  try {
    // Sanitize expression to only allow arithmetic tokens and variable names
    if (!/^[a-zA-Z0-9_+\-*/().\s]+$/.test(expression)) {
      return null;
    }

    let compiled = expression;
    for (const [vName, vVal] of Object.entries(variables)) {
      if (typeof vVal !== 'number' || isNaN(vVal)) {
        return null;
      }
      const regex = new RegExp(`\\b${vName}\\b`, 'g');
      compiled = compiled.replace(regex, String(vVal));
    }

    // Evaluate mathematical expression safely
    const fn = new Function(`return (${compiled});`);
    const res = fn();
    if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
      return Number(res.toFixed(precision));
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 4. AUTO-VALIDATION RULE CHECKER
 */
export async function checkAutoValidationEligibility(
  labId: string,
  branchId: string | undefined,
  testId: string,
  resultsList: Array<{ numericValue: number | null; flag: string; isCritical: boolean; deltaViolated: boolean }>
): Promise<{ eligible: boolean; reason?: string }> {
  const rule = await db.queryOne<{
    allow_auto_validate: boolean;
    require_in_range: boolean;
    require_qc_pass: boolean;
    require_no_delta: boolean;
  }>(
    `SELECT allow_auto_validate, require_in_range, require_qc_pass, require_no_delta
     FROM auto_validation_rules
     WHERE lab_id = $1 AND test_id = $2 AND is_active = 1`,
    [labId, testId]
  );

  if (!rule || !rule.allow_auto_validate) {
    return { eligible: false, reason: 'Auto-validation is not enabled for this diagnostic test.' };
  }

  for (const r of resultsList) {
    if (r.isCritical) {
      return { eligible: false, reason: 'Critical panic value detected; mandatory clinical pathologist review required.' };
    }
    if (rule.require_in_range && r.flag !== 'normal') {
      return { eligible: false, reason: `Parameter is abnormal (${r.flag}); requires manual pathologist verification.` };
    }
    if (rule.require_no_delta && r.deltaViolated) {
      return { eligible: false, reason: 'Delta check violation detected compared to historical patient baseline.' };
    }
  }

  // Check if active QC is in rejected status for this test
  if (rule.require_qc_pass) {
    const recentQcReject = await db.queryOne<{ id: string }>(
      `SELECT id FROM qc_results
       WHERE lab_id = $1 AND test_id = $2 AND status = 'reject'
         AND run_time >= datetime('now', '-24 hours') LIMIT 1`,
      [labId, testId]
    );
    if (recentQcReject) {
      return { eligible: false, reason: 'Analyzer QC run failed within past 24 hours; auto-validation held.' };
    }
  }

  return { eligible: true };
}

/**
 * 5. REFLEX TESTING ENGINE
 * Checks if parameter trigger triggers a secondary test order
 */
export async function evaluateReflexTriggers(
  labId: string,
  testId: string,
  parameterId: string,
  value: number,
  flag: string
): Promise<Array<{ reflexTestId: string; reflexTestName: string; autoOrder: boolean; reason: string }>> {
  const rules = await db.query<{
    reflex_test_id: string;
    condition_operator: string;
    threshold_low: number;
    threshold_high: number;
    auto_order: boolean;
    reflex_test_name: string;
  }>(
    `SELECT rtr.*, t.name as reflex_test_name
     FROM reflex_test_rules rtr
     JOIN tests t ON rtr.reflex_test_id = t.id
     WHERE rtr.lab_id = $1 AND rtr.trigger_test_id = $2 AND rtr.trigger_parameter_id = $3 AND rtr.is_active = 1`,
    [labId, testId, parameterId]
  );

  const matched: Array<{ reflexTestId: string; reflexTestName: string; autoOrder: boolean; reason: string }> = [];

  for (const r of rules) {
    let triggered = false;
    let msg = '';

    if (r.condition_operator === 'abnormal' && (flag === 'high' || flag === 'low' || flag === 'abnormal')) {
      triggered = true;
      msg = `Triggered by abnormal flag (${flag})`;
    } else if (r.condition_operator === 'critical' && (flag.includes('critical'))) {
      triggered = true;
      msg = `Triggered by critical panic value`;
    } else if (r.condition_operator === 'gt' && r.threshold_high !== null && value > r.threshold_high) {
      triggered = true;
      msg = `Value ${value} exceeded reflex threshold (${r.threshold_high})`;
    } else if (r.condition_operator === 'lt' && r.threshold_low !== null && value < r.threshold_low) {
      triggered = true;
      msg = `Value ${value} fell below reflex threshold (${r.threshold_low})`;
    }

    if (triggered) {
      matched.push({
        reflexTestId: r.reflex_test_id,
        reflexTestName: r.reflex_test_name,
        autoOrder: Boolean(r.auto_order),
        reason: msg
      });
    }
  }

  return matched;
}
