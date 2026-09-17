/**
 * AnalyzerRepository, QCRepository, and EventIdempotencyRepository
 */

import { BaseRepository } from './BaseRepository';

export class AnalyzerRepository extends BaseRepository {
  public readonly moduleName = 'ANALYZER_QUALITY.analyzer';
  public readonly tablesOwned = [
    'analyzers',
    'analyzer_test_mappings',
    'analyzer_results',
    'analyzer_logs'
  ];

  async findAnalyzerById(id: string) {
    return this.queryOne(`SELECT * FROM analyzers WHERE id = $1`, [id]);
  }

  async recordAnalyzerLog(data: {
    id: string;
    analyzer_id: string;
    level: string;
    message: string;
    raw_payload?: string;
  }) {
    this.validateTableAccess('analyzer_logs', 'INSERT');
    return this.execute(
      `INSERT INTO analyzer_logs (id, analyzer_id, level, message, raw_payload)
       VALUES ($1, $2, $3, $4, $5)`,
      [data.id, data.analyzer_id, data.level, data.message, data.raw_payload || null]
    );
  }
}

export class QCRepository extends BaseRepository {
  public readonly moduleName = 'ANALYZER_QUALITY.qc';
  public readonly tablesOwned = [
    'qc_materials',
    'qc_lots',
    'qc_targets',
    'qc_runs',
    'qc_results',
    'qc_corrective_actions'
  ];

  async findMaterialById(id: string) {
    return this.queryOne(`SELECT * FROM qc_materials WHERE id = $1`, [id]);
  }

  async recordQCRun(data: {
    id: string;
    qc_material_id: string;
    analyzer_id: string;
    test_id: string;
    observed_value: number;
    run_by: string;
    status: string;
  }) {
    this.validateTableAccess('qc_runs', 'INSERT');
    return this.execute(
      `INSERT INTO qc_runs (id, qc_material_id, analyzer_id, test_id, observed_value, run_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [data.id, data.qc_material_id, data.analyzer_id, data.test_id, data.observed_value, data.run_by, data.status]
    );
  }
}

export class EventIdempotencyRepository extends BaseRepository {
  public readonly moduleName = 'SECURITY_GOVERNANCE.idempotency';
  public readonly tablesOwned = [
    'event_idempotency'
  ];

  /**
   * Check if an event has already been processed by a consumer.
   */
  async isProcessed(eventId: string, consumerId: string): Promise<boolean> {
    const row = await this.queryOne<{ id: string }>(
      `SELECT id FROM event_idempotency WHERE event_id = $1 AND consumer_id = $2`,
      [eventId, consumerId]
    );
    return Boolean(row);
  }

  /**
   * Mark an event as processed by a consumer.
   */
  async markProcessed(data: {
    id: string;
    eventId: string;
    consumerId: string;
    eventType: string;
    tenantId: string;
    status?: string;
  }): Promise<void> {
    this.validateTableAccess('event_idempotency', 'INSERT');
    await this.execute(
      `INSERT INTO event_idempotency (id, event_id, consumer_id, event_type, tenant_id, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (event_id, consumer_id) DO NOTHING`,
      [data.id, data.eventId, data.consumerId, data.eventType, data.tenantId, data.status || 'completed']
    );
  }
}

export const analyzerRepository = new AnalyzerRepository();
export const qcRepository = new QCRepository();
export const eventIdempotencyRepository = new EventIdempotencyRepository();
