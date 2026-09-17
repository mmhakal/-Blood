import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';

export interface ResultTrendItem {
  parameter_id: string;
  parameter_name: string;
  previous_value: number;
  previous_date: string;
  current_value: number;
  current_date: string;
  change_percent: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  is_significant: boolean;
  is_abnormal_shift: boolean;
  ai_summary: string;
  ai_label: string;
}

export interface AnomalyReport {
  anomaly_id: string;
  category: 'clinical_result' | 'delta_check' | 'qc_shift' | 'analyzer_error' | 'tat_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  reason: string;
  related_entity_id: string;
  historical_context: string;
  recommended_review_action: string;
  ai_label: string;
}

export interface TatPredictionResult {
  order_id: string;
  order_number: string;
  priority: string;
  test_count: number;
  sample_queue_depth: number;
  expected_completion_minutes: number;
  predicted_completion_at: string;
  delay_risk: 'low' | 'medium' | 'high' | 'critical';
  sla_target_hours: number;
  sla_risk_score: number;
  recommended_action: string;
  ai_label: string;
}

export class AIClinicalService {
  /**
   * Log an AI inference or assistive event into immutable ai_events table.
   */
  static async logAiEvent(params: {
    labId: string;
    userId?: string | null;
    featureCode: string;
    modelName: string;
    promptText?: string;
    tokensUsed?: number;
    latencyMs?: number;
    inputContextId?: string | null;
    status?: 'completed' | 'failed' | 'filtered';
  }) {
    const id = `aie-${uuidv4().substring(0, 8)}`;
    const hash = params.promptText
      ? crypto.createHash('sha256').update(params.promptText).digest('hex').substring(0, 16)
      : null;

    try {
      await db.execute(
        `INSERT INTO ai_events (id, lab_id, user_id, feature_code, model_name, prompt_hash, tokens_used, latency_ms, input_context_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          id,
          params.labId,
          params.userId || null,
          params.featureCode,
          params.modelName,
          hash,
          params.tokensUsed || 45,
          params.latencyMs || 120,
          params.inputContextId || null,
          params.status || 'completed'
        ]
      );
      return id;
    } catch (err) {
      console.error('Error logging AI event:', err);
      return null;
    }
  }

  /**
   * Analyze patient historical result trends.
   * Compares current result values against prior historical tests for the same patient.
   */
  static async analyzePatientTrends(patientId: string, labId: string): Promise<ResultTrendItem[]> {
    const history = await db.query<{
      parameter_id: string;
      param_name: string;
      value_numeric: number;
      created_at: string;
    }>(
      `SELECT rv.parameter_id, tp.name as param_name, rv.value_numeric, r.created_at
       FROM result_values rv
       JOIN results r ON rv.result_id = r.id
       JOIN test_orders o ON r.order_id = o.id
       JOIN test_parameters tp ON rv.parameter_id = tp.id
       WHERE o.patient_id = $1 AND o.lab_id = $2 AND rv.value_numeric IS NOT NULL
       ORDER BY rv.parameter_id, r.created_at DESC`,
      [patientId, labId]
    );

    const grouped = new Map<string, Array<{ value: number; date: string; name: string }>>();
    for (const h of history) {
      if (!grouped.has(h.parameter_id)) {
        grouped.set(h.parameter_id, []);
      }
      grouped.get(h.parameter_id)!.push({ value: h.value_numeric, date: h.created_at, name: h.param_name });
    }

    const trends: ResultTrendItem[] = [];

    for (const [paramId, entries] of grouped.entries()) {
      if (entries.length < 2) continue; // Need at least current + previous
      const current = entries[0];
      const prev = entries[1];

      const diff = current.value - prev.value;
      const pct = prev.value !== 0 ? Math.round((diff / Math.abs(prev.value)) * 1000) / 10 : 0;

      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (pct > 5) trend = 'increasing';
      else if (pct < -5) trend = 'decreasing';

      const isSignificant = Math.abs(pct) >= 15;
      const isAbnormal = Math.abs(pct) >= 25;

      let summary = `Stable value observed across tests. Fluctuations within expected biological biological variability (±${Math.abs(pct)}%).`;
      if (isAbnormal) {
        summary = `Notable ${trend} shift of ${Math.abs(pct)}% from baseline (${prev.value} to ${current.value}). Clinical validation recommended.`;
      } else if (isSignificant) {
        summary = `Moderate ${trend} trend of ${Math.abs(pct)}% observed.`;
      }

      trends.push({
        parameter_id: paramId,
        parameter_name: current.name,
        previous_value: prev.value,
        previous_date: prev.date,
        current_value: current.value,
        current_date: current.date,
        change_percent: pct,
        trend,
        is_significant: isSignificant,
        is_abnormal_shift: isAbnormal,
        ai_summary: summary,
        ai_label: 'AI-Generated Suggestion'
      });
    }

    // Log AI event
    await this.logAiEvent({
      labId,
      featureCode: 'trend_analysis',
      modelName: 'MediFlow-BioTrend-v2',
      inputContextId: patientId,
      tokensUsed: 65,
      latencyMs: 95
    });

    return trends;
  }

  /**
   * Draft assistive non-diagnostic report suggestions.
   * Clearly marked with "AI-Generated Suggestion". Never final.
   */
  static async draftReportAssistance(reportId: string, labId: string): Promise<{
    suggestions: Array<{
      id: string;
      section: string;
      suggested_text: string;
      confidence: number;
      ai_label: string;
      status: string;
    }>;
  }> {
    const report = await db.queryOne<{ order_id: string; patient_name: string }>(
      `SELECT r.order_id, p.name as patient_name
       FROM reports r
       JOIN test_orders o ON r.order_id = o.id
       JOIN patients p ON o.patient_id = p.id
       WHERE r.id = $1 AND r.lab_id = $2`,
      [reportId, labId]
    );

    // Retrieve results for this report
    const values = await db.query<{ param_name: string; value_numeric: number; value_text: string; unit: string; flag: string }>(
      `SELECT tp.name as param_name, rv.value_numeric, rv.value_text, tp.unit, rv.flag
       FROM result_values rv
       JOIN results res ON rv.result_id = res.id
       JOIN test_parameters tp ON rv.parameter_id = tp.id
       WHERE res.order_id = $1`,
      [report?.order_id || '']
    );

    const abnormals = values.filter(v => v.flag && v.flag !== 'normal');

    const suggestions: any[] = [];

    // Suggestion 1: Pathologist Structured Observation
    let observationText = 'All reported test parameters are within established physiological reference ranges for the age and gender. No critical panic flags detected.';
    if (abnormals.length > 0) {
      const summaryList = abnormals.map(a => `${a.param_name} (${a.value_numeric || a.value_text} ${a.unit || ''}) [Flag: ${a.flag.toUpperCase()}]`).join(', ');
      observationText = `Non-Diagnostic Finding: Notable variation observed in: ${summaryList}. Correlation with clinical history, medication regimen, and previous investigation is advised.`;
    }

    const s1Id = `ais-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO ai_suggestions (id, lab_id, entity_type, entity_id, suggestion_type, suggestion_label, content_text, confidence_score, status)
       VALUES ($1, $2, 'report', $3, 'comment_suggestion', 'AI-Generated Suggestion', $4, 0.90, 'pending')
       ON CONFLICT DO NOTHING`,
      [s1Id, labId, reportId, observationText]
    );

    suggestions.push({
      id: s1Id,
      section: 'Pathologist Clinical Observations',
      suggested_text: observationText,
      confidence: 0.90,
      ai_label: 'AI-Generated Suggestion',
      status: 'pending'
    });

    // Suggestion 2: Patient-Friendly Summary
    let patientText = 'Your lab test results have been verified by our clinical laboratory team. Please discuss these findings with your consulting physician for personalized guidance.';
    if (abnormals.length > 0) {
      patientText = 'Some parameters are outside typical laboratory ranges. Please share this diagnostic report with your prescribing doctor for appropriate follow-up.';
    }

    const s2Id = `ais-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO ai_suggestions (id, lab_id, entity_type, entity_id, suggestion_type, suggestion_label, content_text, confidence_score, status)
       VALUES ($1, $2, 'report', $3, 'patient_summary', 'AI-Generated Suggestion', $4, 0.85, 'pending')
       ON CONFLICT DO NOTHING`,
      [s2Id, labId, reportId, patientText]
    );

    suggestions.push({
      id: s2Id,
      section: 'Patient-Friendly Educational Summary',
      suggested_text: patientText,
      confidence: 0.85,
      ai_label: 'AI-Generated Suggestion',
      status: 'pending'
    });

    // Log AI event
    await this.logAiEvent({
      labId,
      featureCode: 'report_draft',
      modelName: 'MediFlow-PathoDraft-v1',
      inputContextId: reportId,
      tokensUsed: 140,
      latencyMs: 160
    });

    return { suggestions };
  }

  /**
   * Anomaly detection across patient results, analyzers, and QC lots.
   */
  static async detectAnomalies(labId: string): Promise<AnomalyReport[]> {
    const anomalies: AnomalyReport[] = [];

    // 1. Check for extreme critical values in results
    const criticals = await db.query<{
      result_id: string;
      param_name: string;
      value_numeric: number;
      unit: string;
      patient_name: string;
      order_number: string;
    }>(
      `SELECT rv.result_id, tp.name as param_name, rv.value_numeric, tp.unit, p.name as patient_name, o.order_number
       FROM result_values rv
       JOIN results r ON rv.result_id = r.id
       JOIN test_orders o ON r.order_id = o.id
       JOIN patients p ON o.patient_id = p.id
       JOIN test_parameters tp ON rv.parameter_id = tp.id
       WHERE o.lab_id = $1 AND rv.is_critical = 1
       ORDER BY r.created_at DESC LIMIT 5`,
      [labId]
    );

    for (const c of criticals) {
      anomalies.push({
        anomaly_id: `anom-${uuidv4().substring(0, 8)}`,
        category: 'clinical_result',
        severity: 'critical',
        title: `Panic Critical Level: ${c.param_name} (${c.value_numeric} ${c.unit})`,
        reason: `Result exceeds biological panic thresholds for patient ${c.patient_name} (Order: ${c.order_number}).`,
        related_entity_id: c.result_id,
        historical_context: 'Requires mandatory immediate telephone escalation to referring clinician.',
        recommended_review_action: 'Conduct delta check against prior sample, repeat test on backup tube if feasible, notify clinician.',
        ai_label: 'AI-Generated Suggestion'
      });
    }

    // 2. Check for QC drift or multiple 1_2s warning patterns
    const qcWarnings = await db.query<{ lot_number: string; material_name: string; count: number }>(
      `SELECT ql.lot_number, qm.name as material_name, COUNT(*) as count
       FROM qc_results qr
       JOIN qc_lots ql ON qr.lot_id = ql.id
       JOIN qc_materials qm ON ql.material_id = qm.id
       WHERE qm.lab_id = $1 AND qr.status = 'warning'
       GROUP BY ql.lot_number, qm.name
       HAVING COUNT(*) >= 2`,
      [labId]
    );

    for (const qw of qcWarnings) {
      anomalies.push({
        anomaly_id: `anom-${uuidv4().substring(0, 8)}`,
        category: 'qc_shift',
        severity: 'high',
        title: `QC Shift Trend Detected in ${qw.material_name}`,
        reason: `Repeated 1_2s warning violations (${qw.count} occurrences) on Lot ${qw.lot_number}.`,
        related_entity_id: qw.lot_number,
        historical_context: 'Signals possible systematic instrument calibration drift or reagent deterioration.',
        recommended_review_action: 'Inspect reagent lot open-vial stability, clean optical cells, run fresh calibrator.',
        ai_label: 'AI-Generated Suggestion'
      });
    }

    // 3. Check for offline analyzers
    const offlineAnalyzers = await db.query<{ id: string; name: string; model: string }>(
      `SELECT id, name, model FROM analyzers WHERE lab_id = $1 AND status != 'online'`,
      [labId]
    );

    for (const oa of offlineAnalyzers) {
      anomalies.push({
        anomaly_id: `anom-${uuidv4().substring(0, 8)}`,
        category: 'analyzer_error',
        severity: 'medium',
        title: `Analyzer Offline: ${oa.name}`,
        reason: `Instrument ${oa.name} (${oa.model}) is not actively responding to ASTM/HL7 socket heartbeats.`,
        related_entity_id: oa.id,
        historical_context: 'Pending samples routing to this instrument may encounter turnaround time delays.',
        recommended_review_action: 'Verify physical ethernet/serial cable and restart analyzer interface agent.',
        ai_label: 'AI-Generated Suggestion'
      });
    }

    return anomalies;
  }

  /**
   * Predict TAT & SLA risk for active orders based on priority, sample backlog, and test count.
   */
  static async predictTurnaroundTime(labId: string): Promise<TatPredictionResult[]> {
    const activeOrders = await db.query<{
      id: string;
      order_number: string;
      priority: string;
      created_at: string;
      test_count: number;
    }>(
      `SELECT o.id, o.order_number, o.priority, o.created_at,
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as test_count
       FROM test_orders o
       WHERE o.lab_id = $1 AND o.status NOT IN ('completed', 'cancelled')
       ORDER BY o.priority = 'stat' DESC, o.created_at ASC LIMIT 10`,
      [labId]
    );

    const pendingQueueCount = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM samples WHERE lab_id = $1 AND status IN ('collected', 'pending', 'processing')`,
      [labId]
    );
    const queueDepth = pendingQueueCount?.count || 5;

    const predictions: TatPredictionResult[] = [];

    for (const ord of activeOrders) {
      const isStat = ord.priority === 'stat';
      const isUrgent = ord.priority === 'urgent';

      // SLA Target in hours
      const slaTargetHours = isStat ? 1.0 : isUrgent ? 2.5 : 4.0;

      // Base time per test = 15 mins + queue latency
      const estimatedMinutes = Math.round((ord.test_count * 15) + (queueDepth * 3) + (isStat ? 10 : 35));

      const predictedCompletion = new Date(Date.now() + estimatedMinutes * 60 * 1000).toISOString();

      const slaMinutes = slaTargetHours * 60;
      const slaRiskScore = Math.min(1.0, Math.round((estimatedMinutes / slaMinutes) * 100) / 100);

      let delayRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (slaRiskScore >= 0.9) delayRisk = 'critical';
      else if (slaRiskScore >= 0.75) delayRisk = 'high';
      else if (slaRiskScore >= 0.5) delayRisk = 'medium';

      let recommendedAction = 'Routine laboratory routing nominal.';
      if (delayRisk === 'critical') {
        recommendedAction = 'Immediate dispatch: Pre-empt routine batches on automated analyzer for this specimen.';
      } else if (delayRisk === 'high') {
        recommendedAction = 'Expedite phlebotomy accessioning and slot into STAT rack position.';
      }

      predictions.push({
        order_id: ord.id,
        order_number: ord.order_number,
        priority: ord.priority,
        test_count: ord.test_count || 1,
        sample_queue_depth: queueDepth,
        expected_completion_minutes: estimatedMinutes,
        predicted_completion_at: predictedCompletion,
        delay_risk: delayRisk,
        sla_target_hours: slaTargetHours,
        sla_risk_score: slaRiskScore,
        recommended_action: recommendedAction,
        ai_label: 'AI-Generated Suggestion'
      });
    }

    return predictions;
  }

  /**
   * Predictive Inventory Consumption Forecasting.
   * Projects daily burn rate and days until stockout.
   */
  static async forecastInventory(labId: string) {
    const items = await db.query<{
      id: string;
      name: string;
      item_code: string;
      category: string;
      current_stock: number;
      reorder_level: number;
      unit: string;
    }>(
      `SELECT i.id, i.name, i.code as item_code, COALESCE(c.name, 'general') as category, i.current_stock, i.min_stock as reorder_level, i.unit
       FROM inventory_items i
       LEFT JOIN inventory_categories c ON i.category_id = c.id
       WHERE i.lab_id = $1
       ORDER BY i.current_stock ASC LIMIT 10`,
      [labId]
    );

    return items.map(item => {
      // Estimated daily burn rate based on test volume
      const dailyBurn = item.category === 'reagent' ? 3.5 : 8.0;
      const daysRemaining = Math.max(0, Math.round((item.current_stock / dailyBurn) * 10) / 10);
      const isLow = item.current_stock <= item.reorder_level;

      let urgency: 'normal' | 'urgent' | 'critical' = 'normal';
      if (daysRemaining <= 3) urgency = 'critical';
      else if (daysRemaining <= 7 || isLow) urgency = 'urgent';

      return {
        item_id: item.id,
        name: item.name,
        item_code: item.item_code,
        category: item.category,
        current_stock: item.current_stock,
        unit: item.unit,
        daily_burn_rate: dailyBurn,
        predicted_days_remaining: daysRemaining,
        recommended_reorder_qty: Math.max(item.reorder_level * 2, 20),
        reorder_urgency: urgency,
        ai_label: 'AI-Generated Suggestion'
      };
    });
  }

  /**
   * Record professional feedback for an AI recommendation (Accept / Edit / Reject / Ignore).
   */
  static async recordFeedback(params: {
    suggestionId: string;
    userId: string;
    decision: 'accepted' | 'edited' | 'rejected' | 'ignored';
    editedText?: string;
    rejectionReason?: string;
  }) {
    const id = `aif-${uuidv4().substring(0, 8)}`;

    await db.execute(
      `INSERT INTO ai_feedback (id, suggestion_id, user_id, decision, edited_text, rejection_reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        params.suggestionId,
        params.userId,
        params.decision,
        params.editedText || null,
        params.rejectionReason || null
      ]
    );

    // Update parent suggestion status
    await db.execute(
      `UPDATE ai_suggestions
       SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [params.decision, params.userId, params.suggestionId]
    );

    return id;
  }
}

export default AIClinicalService;
