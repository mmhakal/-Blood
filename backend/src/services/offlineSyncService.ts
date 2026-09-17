import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';

export interface OfflineTransactionInput {
  id: string; // client-generated UUID
  action_type: 'sample_collection' | 'barcode_scan' | 'basic_order' | 'status_update';
  payload: Record<string, any>;
  queued_at: string;
}

export interface SyncBatchResult {
  device_id: string;
  processed_count: number;
  success_count: number;
  conflict_count: number;
  failed_count: number;
  conflicts: any[];
  synced_at: string;
}

export class OfflineSyncService {
  /**
   * Process a batch of offline transactions from a registered mobile device.
   */
  static async processSyncBatch(
    labId: string,
    deviceId: string,
    branchId: string | null,
    transactions: OfflineTransactionInput[]
  ): Promise<SyncBatchResult> {
    let successCount = 0;
    let conflictCount = 0;
    let failedCount = 0;
    const conflicts: any[] = [];

    for (const tx of transactions) {
      try {
        const payloadStr = typeof tx.payload === 'object' ? JSON.stringify(tx.payload) : String(tx.payload);

        // Record incoming transaction into offline_transactions queue
        await db.execute(
          `INSERT INTO offline_transactions (id, lab_id, branch_id, device_id, action_type, payload_json, status, queued_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'syncing', $7)
           ON CONFLICT (id) DO NOTHING`,
          [tx.id, labId, branchId, deviceId, tx.action_type, payloadStr, tx.queued_at]
        );

        // Conflict check & operation handling
        if (tx.action_type === 'sample_collection') {
          const sampleBarcode = tx.payload.sample_barcode;
          if (sampleBarcode) {
            const currentSample = await db.queryOne<{ id: string; status: string; updated_at?: string }>(
              `SELECT id, status, created_at FROM samples WHERE sample_barcode = $1 AND lab_id = $2`,
              [sampleBarcode, labId]
            );

            if (currentSample) {
              if (currentSample.status === 'verified' || currentSample.status === 'cancelled') {
                // Conflict! Sample already progressed past collection
                const conflictId = `conf-${uuidv4().substring(0, 8)}`;
                await db.execute(
                  `INSERT INTO sync_conflicts (id, transaction_id, entity_type, entity_id, server_version_json, client_version_json, conflict_field, status)
                   VALUES ($1, $2, 'sample', $3, $4, $5, 'status', 'unresolved')`,
                  [
                    conflictId,
                    tx.id,
                    currentSample.id,
                    JSON.stringify({ status: currentSample.status }),
                    JSON.stringify({ status: 'collected', phlebotomist: tx.payload.phlebotomist }),
                  ]
                );

                await db.execute(`UPDATE offline_transactions SET status = 'conflict' WHERE id = $1`, [tx.id]);
                conflictCount++;
                conflicts.push({
                  conflict_id: conflictId,
                  transaction_id: tx.id,
                  entity: 'sample',
                  reason: `Sample ${sampleBarcode} has already progressed to '${currentSample.status}' on server.`
                });
                continue;
              } else {
                // Apply update
                await db.execute(
                  `UPDATE samples SET status = 'collected', collected_at = $1 WHERE id = $2`,
                  [tx.queued_at || new Date().toISOString(), currentSample.id]
                );
              }
            }
          }
        } else if (tx.action_type === 'status_update') {
          const { entity_id, table_name, new_status } = tx.payload;
          if (table_name === 'samples' && entity_id) {
            await db.execute(`UPDATE samples SET status = $1 WHERE id = $2 AND lab_id = $3`, [new_status, entity_id, labId]);
          }
        }

        // Mark as completed
        await db.execute(
          `UPDATE offline_transactions SET status = 'completed', synced_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [tx.id]
        );
        successCount++;
      } catch (err: any) {
        failedCount++;
        await db.execute(
          `UPDATE offline_transactions SET status = 'failed', error_message = $1 WHERE id = $2`,
          [err.message || 'Processing failed', tx.id]
        );
      }
    }

    // Update mobile device last sync timestamp
    await db.execute(
      `UPDATE mobile_devices SET last_sync_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [deviceId]
    );

    return {
      device_id: deviceId,
      processed_count: transactions.length,
      success_count: successCount,
      conflict_count: conflictCount,
      failed_count: failedCount,
      conflicts,
      synced_at: new Date().toISOString()
    };
  }

  /**
   * Resolve a synchronization conflict.
   */
  static async resolveConflict(conflictId: string, strategy: 'server_wins' | 'client_wins', resolvedBy: string) {
    const conflict = await db.queryOne<{ transaction_id: string; client_version_json: string; entity_id: string }>(
      `SELECT transaction_id, client_version_json, entity_id FROM sync_conflicts WHERE id = $1`,
      [conflictId]
    );

    if (!conflict) throw new Error('Conflict record not found');

    if (strategy === 'client_wins') {
      try {
        const clientData = JSON.parse(conflict.client_version_json);
        if (clientData.status) {
          await db.execute(`UPDATE samples SET status = $1 WHERE id = $2`, [clientData.status, conflict.entity_id]);
        }
      } catch (e) {
        console.error('Error applying client wins resolution:', e);
      }
    }

    await db.execute(
      `UPDATE sync_conflicts
       SET resolution_strategy = $1, status = 'resolved', resolved_by = $2, resolved_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [strategy, resolvedBy, conflictId]
    );

    await db.execute(
      `UPDATE offline_transactions SET status = 'completed' WHERE id = $1`,
      [conflict.transaction_id]
    );

    return { message: `Conflict resolved using strategy: ${strategy}` };
  }
}

export default OfflineSyncService;
