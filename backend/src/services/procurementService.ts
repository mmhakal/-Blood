import db from '../db/database';
import { v4 as uuidv4 } from 'uuid';

export class ProcurementService {
  /**
   * Create Purchase Order with automated PO sequence
   */
  public static async createPurchaseOrder(labId: string, data: any, userId: string) {
    const poId = `po-${uuidv4().substring(0, 8)}`;
    const poNum = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    let subtotal = 0;
    let taxAmount = 0;

    for (const item of data.items || []) {
      const lineSub = Number(item.quantity || 0) * Number(item.unit_price || 0);
      const lineTax = (lineSub * Number(item.tax_percentage || 0)) / 100;
      subtotal += lineSub;
      taxAmount += lineTax;
    }

    const discountAmount = Number(data.discount_amount || 0);
    const totalAmount = subtotal + taxAmount - discountAmount;

    await db.execute(
      `INSERT INTO purchase_orders (id, lab_id, branch_id, po_number, supplier_id, request_id, po_date, expected_delivery_date, subtotal, tax_amount, discount_amount, total_amount, payment_terms, notes, approval_status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        poId,
        labId,
        data.branch_id || null,
        poNum,
        data.supplier_id,
        data.request_id || null,
        data.po_date || new Date().toISOString().split('T')[0],
        data.expected_delivery_date || null,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        data.payment_terms || 'net_30',
        data.notes || null,
        data.approval_status || 'draft',
        userId,
      ]
    );

    // Insert line items
    for (const item of data.items || []) {
      const linePrice = Number(item.quantity || 0) * Number(item.unit_price || 0);
      await db.execute(
        `INSERT INTO purchase_order_items (id, po_id, item_id, item_name, sku, quantity, received_quantity, unit_price, tax_percentage, total_price)
         VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9)`,
        [
          `poi-${uuidv4().substring(0, 8)}`,
          poId,
          item.item_id || null,
          item.item_name,
          item.sku || null,
          item.quantity,
          item.unit_price,
          item.tax_percentage || 0,
          linePrice,
        ]
      );
    }

    return this.getPurchaseOrder(poId, labId);
  }

  /**
   * Retrieve Purchase Order with line items
   */
  public static async getPurchaseOrder(poId: string, labId: string) {
    const po = await db.queryOne<any>(
      `SELECT po.*, s.company_name as supplier_name, s.supplier_code, b.name as branch_name
       FROM purchase_orders po
       JOIN suppliers s ON po.supplier_id = s.id
       LEFT JOIN branches b ON po.branch_id = b.id
       WHERE po.id = $1 AND po.lab_id = $2`,
      [poId, labId]
    );
    if (!po) return null;

    const items = await db.query<any>(
      `SELECT * FROM purchase_order_items WHERE po_id = $1`,
      [poId]
    );

    return { ...po, grand_total: po.total_amount, items };
  }

  /**
   * Process Goods Receipt Note (GRN) and automatically update inventory stock & batches
   */
  public static async processGoodsReceipt(labId: string, data: any, userId: string) {
    const grnId = `grn-${uuidv4().substring(0, 8)}`;
    const grnNum = `GRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    await db.execute(
      `INSERT INTO goods_receipts (id, lab_id, branch_id, grn_number, po_id, supplier_id, receipt_date, invoice_delivery_challan_no, received_by, status, qc_passed, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        grnId,
        labId,
        data.branch_id || null,
        grnNum,
        data.po_id,
        data.supplier_id,
        data.receipt_date || new Date().toISOString().split('T')[0],
        data.invoice_delivery_challan_no || null,
        userId,
        data.status || 'verified',
        data.qc_passed !== undefined ? (data.qc_passed ? 1 : 0) : 1,
        data.notes || null,
      ]
    );

    const receivedItems = data.items || data.received_items || [];
    for (const item of receivedItems) {
      const griId = `gri-${uuidv4().substring(0, 8)}`;
      const recQty = Number(item.received_quantity ?? item.quantity_received ?? 1);
      const accQty = Number(item.accepted_quantity ?? recQty);
      const batchNum = item.batch_lot_number || item.batch_number || `LOT-${Date.now()}`;

      await db.execute(
        `INSERT INTO goods_receipt_items (id, grn_id, po_item_id, item_id, item_name, received_quantity, accepted_quantity, damaged_rejected_quantity, batch_lot_number, expiry_date, storage_location)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          griId,
          grnId,
          item.po_item_id || null,
          item.item_id || null,
          item.item_name || 'Standard Reagent / Consumable',
          recQty,
          accQty,
          item.damaged_rejected_quantity || 0,
          batchNum,
          item.expiry_date || null,
          item.storage_location || 'Main Storage',
        ]
      );

      // Auto-update PO line received quantity
      if (item.po_item_id) {
        await db.execute(
          `UPDATE purchase_order_items 
           SET received_quantity = received_quantity + $1 
           WHERE id = $2`,
          [item.accepted_quantity, item.po_item_id]
        );
      }

      // Auto-increment inventory stock if matched to inventory_items
      if (item.item_id && item.accepted_quantity > 0) {
        await db.execute(
          `UPDATE inventory_items 
           SET current_stock = current_stock + $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2 AND lab_id = $3`,
          [item.accepted_quantity, item.item_id, labId]
        );

        // Record batch in inventory_batches
        await db.execute(
          `INSERT INTO inventory_batches (id, item_id, batch_number, expiry_date, quantity_received, quantity_remaining, purchase_price)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            `bat-${uuidv4().substring(0, 8)}`,
            item.item_id,
            item.batch_lot_number || `LOT-${Date.now()}`,
            item.expiry_date || null,
            item.accepted_quantity,
            item.accepted_quantity,
            item.unit_price || 0,
          ]
        );
      }
    }

    // Check if PO is fully received
    if (data.po_id) {
      const poItems = await db.query<any>(
        `SELECT quantity, received_quantity FROM purchase_order_items WHERE po_id = $1`,
        [data.po_id]
      );
      const allReceived = poItems.every(i => i.received_quantity >= i.quantity);
      const anyReceived = poItems.some(i => i.received_quantity > 0);

      const newPoStatus = allReceived ? 'fully_received' : (anyReceived ? 'partially_received' : 'approved');
      await db.execute(
        `UPDATE purchase_orders SET approval_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [newPoStatus, data.po_id]
      );
    }

    return {
      grn_id: grnId,
      grn_number: grnNum,
      status: 'verified',
      stock_updated: true,
    };
  }
}

export default ProcurementService;
