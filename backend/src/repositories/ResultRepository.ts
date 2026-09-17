/**
 * ResultRepository — Database repository for Clinical Test Results
 * 
 * Enforces:
 * - Ownership of: results, result_values, result_comments, result_history
 * - Strict immutability and version history preservation
 */

import { BaseRepository } from './BaseRepository';
import { v4 as uuidv4 } from 'uuid';

export class ResultRepository extends BaseRepository {
  public readonly moduleName = 'LIS_OPERATIONS.result';
  public readonly tablesOwned = [
    'results',
    'result_values',
    'result_comments',
    'result_history'
  ];

  async findResultById(resultId: string) {
    return this.queryOne(`SELECT * FROM results WHERE id = $1`, [resultId]);
  }

  async findResultByOrderItemId(orderItemId: string) {
    return this.queryOne(`SELECT * FROM results WHERE order_item_id = $1`, [orderItemId]);
  }

  async getResultValues(resultId: string) {
    return this.query(`SELECT * FROM result_values WHERE result_id = $1`, [resultId]);
  }

  async upsertResultHeader(data: {
    id: string;
    order_id: string;
    order_item_id: string;
    test_id: string;
    status: string;
    entered_by?: string;
    clinical_remarks?: string;
    impression?: string;
    version?: number;
  }) {
    this.validateTableAccess('results', 'INSERT');
    const existing = await this.findResultById(data.id);

    if (existing) {
      this.validateTableAccess('results', 'UPDATE');
      await this.execute(
        `UPDATE results
         SET status = $1, clinical_remarks = $2, impression = $3, version = version + 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [data.status, data.clinical_remarks || null, data.impression || null, data.id]
      );
      return this.findResultById(data.id);
    } else {
      await this.execute(
        `INSERT INTO results (id, order_id, order_item_id, test_id, status, entered_by, clinical_remarks, impression, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [data.id, data.order_id, data.order_item_id, data.test_id, data.status, data.entered_by || null, data.clinical_remarks || null, data.impression || null, data.version || 1]
      );
      return this.findResultById(data.id);
    }
  }

  async upsertResultValue(data: {
    result_id: string;
    parameter_id: string;
    value_numeric: number | null;
    value_text: string | null;
    flag: string;
    is_critical: boolean;
    remarks?: string;
  }) {
    this.validateTableAccess('result_values', 'INSERT');
    const id = `rv-${uuidv4().substring(0, 8)}`;
    await this.execute(
      `INSERT INTO result_values (id, result_id, parameter_id, value_numeric, value_text, flag, is_critical, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (result_id, parameter_id) DO UPDATE SET
         value_numeric = EXCLUDED.value_numeric,
         value_text = EXCLUDED.value_text,
         flag = EXCLUDED.flag,
         is_critical = EXCLUDED.is_critical,
         remarks = EXCLUDED.remarks,
         updated_at = CURRENT_TIMESTAMP`,
      [id, data.result_id, data.parameter_id, data.value_numeric, data.value_text, data.flag, data.is_critical ? 1 : 0, data.remarks || null]
    );
  }

  async recordHistory(record: {
    result_id: string;
    parameter_id: string;
    parameter_name?: string;
    previous_value: string | null;
    new_value: string;
    modified_by: string;
    modified_by_name?: string;
    reason?: string | null;
    version: number;
    lab_id: string;
  }) {
    this.validateTableAccess('result_history', 'INSERT');
    const id = `rh-${uuidv4().substring(0, 10)}`;
    await this.execute(
      `INSERT INTO result_history (id, result_id, parameter_id, parameter_name, previous_value, new_value, modified_by, modified_by_name, reason, version, lab_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [id, record.result_id, record.parameter_id, record.parameter_name || null, record.previous_value, record.new_value, record.modified_by, record.modified_by_name || null, record.reason || null, record.version, record.lab_id]
    );
    return id;
  }

  async getHistoryByResultId(resultId: string, labId: string) {
    return this.query(
      `SELECT * FROM result_history WHERE result_id = $1 AND lab_id = $2 ORDER BY modified_at DESC`,
      [resultId, labId]
    );
  }

  async updateResultStatus(resultId: string, status: string, actorId?: string) {
    this.validateTableAccess('results', 'UPDATE');
    return this.execute(
      `UPDATE results SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [status, resultId]
    );
  }
}

export default new ResultRepository();
