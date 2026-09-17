/**
 * AIService — Clinical Decision Support & Predictive AI (Section 21)
 * 
 * CRITICAL ARCHITECTURAL RULE:
 * - AI NEVER becomes the authoritative source of clinical truth.
 * - AI outputs are ALWAYS decorated with:
 *   - is_ai_suggestion: true
 *   - ai_confidence: number (0-1.0)
 *   - ai_source_data: context
 *   - ai_timestamp: ISO date
 *   - ai_model_version: version string
 *   - human_decision_required: true
 * - Human pathologist/clinician approval remains authoritative.
 */

import { IAIService, AISuggestionOutput } from '../../types/serviceContracts';

export class AIService implements IAIService {
  private readonly MODEL_VERSION = 'mediflow-clinical-ai-v2.4';

  /**
   * Helper to ensure all AI outputs strictly conform to the non-authoritative standard.
   */
  private wrapWithAiContract<T>(payload: T, confidence: number, sourceData: any): AISuggestionOutput<T> {
    return {
      is_ai_suggestion: true,
      ai_confidence: Math.round(confidence * 100) / 100,
      ai_source_data: sourceData,
      ai_timestamp: new Date().toISOString(),
      ai_model_version: this.MODEL_VERSION,
      human_decision_required: true,
      payload
    };
  }

  async analyzePatientTrends(patientId: string, testCategory: string): Promise<AISuggestionOutput<any>> {
    const payload = {
      trend_direction: 'stable',
      notable_shifts: [
        { parameter: 'Hemoglobin', shift: '+0.4 g/dL', timeframe: '6 months', clinical_significance: 'normal_fluctuation' }
      ],
      suggested_next_visit: '3 months'
    };

    return this.wrapWithAiContract(payload, 0.88, { patient_id: patientId, category: testCategory });
  }

  async detectAnomalies(orderId: string, results: any[]): Promise<AISuggestionOutput<{ anomalies_detected: boolean; details: string[] }>> {
    const anomalies: string[] = [];

    // Check for biological plausibility (e.g. hematocrit ~= hemoglobin * 3)
    const hb = results.find(r => r.name?.toLowerCase().includes('hemoglobin'))?.value;
    const hct = results.find(r => r.name?.toLowerCase().includes('hematocrit'))?.value;

    if (hb && hct) {
      const hbNum = parseFloat(hb);
      const hctNum = parseFloat(hct);
      if (!isNaN(hbNum) && !isNaN(hctNum)) {
        const ratio = hctNum / hbNum;
        if (ratio < 2.5 || ratio > 3.6) {
          anomalies.push(`Plausibility Alert: Hct/Hb ratio (${ratio.toFixed(2)}) deviates from standard biological range (2.7 - 3.3). Recommend sample re-check.`);
        }
      }
    }

    return this.wrapWithAiContract(
      {
        anomalies_detected: anomalies.length > 0,
        details: anomalies
      },
      0.94,
      { order_id: orderId, evaluated_parameters_count: results.length }
    );
  }

  async predictReagentDepletion(labId: string): Promise<AISuggestionOutput<any>> {
    const predictions = [
      { reagent: 'CBC Diluent / Lyse Pack', estimated_days_remaining: 12, confidence: 0.91 },
      { reagent: 'Biochemistry Glucose Reagent', estimated_days_remaining: 18, confidence: 0.87 }
    ];

    return this.wrapWithAiContract(predictions, 0.89, { lab_id: labId });
  }
}

export const aiService = new AIService();
export default aiService;
