/**
 * InventoryRepository & ProcurementRepository
 */

import { BaseRepository } from './BaseRepository';

export class InventoryRepository extends BaseRepository {
  public readonly moduleName = 'INVENTORY_PROCUREMENT.inventory';
  public readonly tablesOwned = [
    'inventory_items',
    'inventory_categories',
    'stock_transactions',
    'stock_lots',
    'stock_transfers'
  ];

  async findItemById(itemId: string, labId: string) {
    return this.queryOne(`SELECT * FROM inventory_items WHERE id = $1 AND lab_id = $2`, [itemId, labId]);
  }

  async adjustStock(itemId: string, quantityDelta: number, labId: string) {
    this.validateTableAccess('inventory_items', 'UPDATE');
    return this.execute(
      `UPDATE inventory_items
       SET quantity_on_hand = quantity_on_hand + $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND lab_id = $3`,
      [quantityDelta, itemId, labId]
    );
  }

  async recordTransaction(data: {
    id: string;
    item_id: string;
    transaction_type: string;
    quantity: number;
    reason: string;
    created_by: string;
  }) {
    this.validateTableAccess('stock_transactions', 'INSERT');
    return this.execute(
      `INSERT INTO stock_transactions (id, item_id, transaction_type, quantity, reason, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [data.id, data.item_id, data.transaction_type, data.quantity, data.reason, data.created_by]
    );
  }
}

export class ProcurementRepository extends BaseRepository {
  public readonly moduleName = 'INVENTORY_PROCUREMENT.procurement';
  public readonly tablesOwned = [
    'suppliers',
    'purchase_orders',
    'purchase_order_items',
    'goods_receipts'
  ];

  async findSupplierById(supplierId: string, labId: string) {
    return this.queryOne(`SELECT * FROM suppliers WHERE id = $1 AND lab_id = $2`, [supplierId, labId]);
  }

  async findPurchaseOrderById(poId: string, labId: string) {
    return this.queryOne(`SELECT * FROM purchase_orders WHERE id = $1 AND lab_id = $2`, [poId, labId]);
  }
}

export const inventoryRepository = new InventoryRepository();
export const procurementRepository = new ProcurementRepository();
