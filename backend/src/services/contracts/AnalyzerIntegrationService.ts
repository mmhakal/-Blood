/**
 * AnalyzerIntegrationService — Laboratory Instrumentation & Interfacing (Section 14)
 * 
 * Enforces:
 * - Analyzer connections, ASTM/HL7 packet parsing, test mapping
 * - Critical Rule: Analyzer results enter LIS strictly through ResultService contracts.
 * - External analyzer systems NEVER directly write clinical result tables.
 */

import { v4 as uuidv4 } from 'uuid';
import { analyzerRepository } from '../../repositories/AnalyzerQCIdempotencyRepositories';
import { sampleRepository } from '../../repositories/OrderRepository';
import resultService from './ResultService';
import { IAnalyzerIntegrationService, AnalyzerRawResult } from '../../types/serviceContracts';
import DomainEventBus from '../domainEventBus';
import Logger from '../logger';

export class AnalyzerIntegrationService implements IAnalyzerIntegrationService {
  async importAnalyzerResult(raw: AnalyzerRawResult, labId: string): Promise<{ success: boolean; result_id?: string; order_id?: string; action: string }> {
    // 1. Log incoming payload
    const logId = `alog-${uuidv4().substring(0, 8)}`;
    await analyzerRepository.recordAnalyzerLog({
      id: logId,
      analyzer_id: raw.analyzer_id,
      level: 'INFO',
      message: `Received result for barcode ${raw.sample_barcode}, test ${raw.test_code}`,
      raw_payload: raw.raw_message
    });

    // 2. Identify Sample and Order via SampleRepository contract
    const sample = await sampleRepository.findSampleByBarcode(raw.sample_barcode, labId);
    if (!sample) {
      Logger.warn(`[AnalyzerIntegration] Barcode not found: ${raw.sample_barcode} for analyzer ${raw.analyzer_id}`);
      return { success: false, action: 'barcode_not_found' };
    }

    // 3. Enter results via ResultService contract (NEVER direct SQL to results table)
    const resultResponse = await resultService.createResult({
      order_id: sample.order_id,
      order_item_id: sample.order_item_id || sample.id,
      test_id: raw.test_code,
      parameters: [
        {
          parameter_id: raw.parameter_code,
          parameter_name: raw.parameter_code,
          value: raw.value,
          unit: raw.unit,
          flag: (raw.flags?.toLowerCase() as any) || 'normal'
        }
      ],
      submit_for_verification: false, // Save as draft/pending verification
      reason: `Automated import from analyzer ${raw.analyzer_id}`
    }, {
      id: raw.analyzer_id,
      name: `Analyzer Interfacing Gateway (${raw.analyzer_id})`,
      role: 'technician',
      lab_id: labId
    });

    // 4. Emit Domain Event
    await DomainEventBus.publish(
      'analyzer.result_imported',
      labId,
      {
        analyzer_id: raw.analyzer_id,
        sample_barcode: raw.sample_barcode,
        order_id: sample.order_id,
        result_id: resultResponse.result_id
      },
      { actorId: raw.analyzer_id }
    );

    return {
      success: true,
      result_id: resultResponse.result_id,
      order_id: sample.order_id,
      action: 'imported_to_result_service'
    };
  }

  async getAnalyzerHealth(analyzerId: string): Promise<{ analyzer_id: string; status: 'online' | 'offline' | 'error'; last_communication: string }> {
    const analyzer = await analyzerRepository.findAnalyzerById(analyzerId);
    if (!analyzer) {
      return { analyzer_id: analyzerId, status: 'offline', last_communication: new Date().toISOString() };
    }
    return {
      analyzer_id: analyzerId,
      status: analyzer.status || 'online',
      last_communication: analyzer.last_seen || new Date().toISOString()
    };
  }
}

export const analyzerIntegrationService = new AnalyzerIntegrationService();
export default analyzerIntegrationService;
