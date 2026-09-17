/**
 * ProcurementService — Purchasing, Suppliers & Goods Receipt (Section 13)
 * 
 * Enforces:
 * - Procurement module interacts with Inventory strictly via InventoryService contracts
 * - Goods Receipt triggers inventory stock updates and accounting ledger events
 * - No direct cross-module database mutation
 */

import { v4 as uuidv4 } from 'uuid';
import { procurementRepository } from '../../repositories/InventoryProcurementRepositories';
import inventoryService from './InventoryService';
import { IProcurementService, PurchaseOrderInput } from '../../types/serviceContracts';
import DomainEventBus from '../domainEventBus';
import { logAudit } from '../auditService';

export class ProcurementService implements IProcurementService {
  async createPurchaseOrder(input: PurchaseOrderInput): Promise<{ po_id: string; po_number: string; status: string }> {
    const poId = `po-${uuidv4().substring(0, 8)}`;
    const poNumber = `PO-${Date.now().toString().slice(-6)}`;

    let totalAmount = 0;
    for (const it of input.items) {
      totalAmount += (it.quantity || 1) * (it.unit_price || 0);
    }

    await procurementRepository.execute(
      `INSERT INTO purchase_orders (id, lab_id, branch_id, supplier_id, po_number, total_amount, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'submitted', $7)`,
      [poId, input.lab_id, input.branch_id || null, input.supplier_id, poNumber, totalAmount, input.created_by]
    );

    for (const it of input.items) {
      await procurementRepository.execute(
        `INSERT INTO purchase_order_items (id, po_id, item_id, item_name, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [`poi-${uuidv4().substring(0, 8)}`, poId, it.item_id, it.item_name, it.quantity, it.unit_price, (it.quantity || 1) * (it.unit_price || 0)]
      );
    }

    await DomainEventBus.publish(
      'purchase_order.created',
      input.lab_id,
      { po_id: poId, po_number: poNumber, supplier_id: input.supplier_id, total_amount: totalAmount },
      { actorId: input.created_by }
    );

    return { po_id: poId, po_number: poNumber, status: 'submitted' };
  }

  async receiveGoods(
    poId: string,
    receivedItems: Array<{ item_id: string; received_quantity: number; lot_number: string; expiry_date: string }>,
    actorId: string,
    labId: string
  ): Promise<{ receipt_id: string; inventory_updated: boolean }> {
    const po = await procurementRepository.findPurchaseOrderById(poId, labId);
    if (!po) throw new Error('Purchase order not found');

    const receiptId = `grn-${uuidv4().substring(0, 8)}`;
    const grnNumber = `GRN-${Date.now().toString().slice(-6)}`;

    await procurementRepository.execute(
      `INSERT INTO goods_receipts (id, lab_id, po_id, grn_number, received_by, status)
       VALUES ($1, $2, $3, $4, $5, 'verified')`,
      [receiptId, labId, poId, grnNumber, actorId]
    );

    // Update Inventory via InventoryService contract (NEVER direct SQL mutation)
    for (const it of receivedItems) {
      await inventoryService.adjustStock({
        item_id: it.item_id,
        quantity: it.received_quantity,
        adjustment_type: 'increase',
        reason: `Goods received against PO ${po.po_number} (GRN ${grnNumber})`,
        lab_id: labId,
        actor_id: actorId
      });
    }

    await procurementRepository.execute(
      `UPDATE purchase_orders SET status = 'received', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [poId]
    );

    // Emit domain event for accounting ledger
    await DomainEventBus.publish(
      'goods_receipt.completed',
      labId,
      { receipt_id: receiptId, po_id: poId, items_count: receivedItems.length },
      { actorId }
    );

    return { receipt_id: receiptId, inventory_updated: true };
  }

  async getPurchaseOrder(poId: string, labId: string): Promise<any> {
    return procurementRepository.findPurchaseOrderById(poId, labId);
  }
}

export const procurementService = new ProcurementService();
export default procurementService;
