/**
 * OrderRepository & SampleRepository — Database repositories for Order and Sample lifecycle
 */

import { BaseRepository } from './BaseRepository';

export class OrderRepository extends BaseRepository {
  public readonly moduleName = 'LIS_OPERATIONS.order';
  public readonly tablesOwned = [
    'test_orders',
    'order_items',
    'order_activity_logs'
  ];

  async findOrderById(orderId: string, labId?: string) {
    if (labId) {
      return this.queryOne(`SELECT * FROM test_orders WHERE id = $1 AND lab_id = $2`, [orderId, labId]);
    }
    return this.queryOne(`SELECT * FROM test_orders WHERE id = $1`, [orderId]);
  }

  async getOrderItems(orderId: string) {
    return this.query(`SELECT * FROM order_items WHERE order_id = $1`, [orderId]);
  }

  async updateOrderStatus(orderId: string, status: string) {
    this.validateTableAccess('test_orders', 'UPDATE');
    return this.execute(
      `UPDATE test_orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [status, orderId]
    );
  }
}

export class SampleRepository extends BaseRepository {
  public readonly moduleName = 'LIS_OPERATIONS.sample';
  public readonly tablesOwned = [
    'samples',
    'sample_barcodes',
    'sample_status_history'
  ];

  async findSampleById(sampleId: string) {
    return this.queryOne(`SELECT * FROM samples WHERE id = $1`, [sampleId]);
  }

  async findSampleByBarcode(barcode: string, labId: string) {
    return this.queryOne(
      `SELECT s.* FROM samples s
       JOIN test_orders o ON s.order_id = o.id
       WHERE s.barcode = $1 AND o.lab_id = $2`,
      [barcode, labId]
    );
  }

  async updateSampleStatus(sampleId: string, status: string) {
    this.validateTableAccess('samples', 'UPDATE');
    return this.execute(
      `UPDATE samples SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [status, sampleId]
    );
  }
}

export const orderRepository = new OrderRepository();
export const sampleRepository = new SampleRepository();
export default orderRepository;
