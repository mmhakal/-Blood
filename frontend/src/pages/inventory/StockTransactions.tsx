import React, { useState, useEffect } from 'react';
import {
  ArrowDownLeft, ArrowUpRight, Plus, Search, Filter,
  Calendar, ShoppingCart, RefreshCw, X, CheckCircle2, AlertTriangle
} from 'lucide-react';
import api from '../../services/api';

export const StockTransactions: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  // Stock In Form
  const [stockInData, setStockInData] = useState({
    item_id: '',
    batch_number: '',
    expiry_date: '',
    quantity: '1',
    unit_cost: '0',
    supplier_id: '',
    invoice_number: '',
    notes: '',
  });

  // Adjust Form
  const [adjustData, setAdjustData] = useState({
    item_id: '',
    adjustment_type: 'consumption',
    quantity: '1',
    reason: '',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemRes, suppRes, dashRes] = await Promise.all([
        api.get('/inventory/items'),
        api.get('/inventory/suppliers'),
        api.get('/inventory/dashboard'),
      ]);
      setItems(itemRes);
      setSuppliers(suppRes);
      setTransactions(dashRes.recent_transactions || []);

      if (itemRes?.length > 0) {
        setStockInData(prev => ({ ...prev, item_id: itemRes[0].id }));
        setAdjustData(prev => ({ ...prev, item_id: itemRes[0].id }));
      }
    } catch (err) {
      console.error('Failed to load inventory transactions', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStockInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockInData.item_id || !stockInData.batch_number || !stockInData.expiry_date) return;

    setSubmitting(true);
    try {
      await api.post('/inventory/stock-in', {
        ...stockInData,
        quantity: parseInt(stockInData.quantity) || 1,
        unit_cost: parseFloat(stockInData.unit_cost) || 0,
      });
      setShowStockInModal(false);
      setStockInData({
        item_id: items[0]?.id || '',
        batch_number: '',
        expiry_date: '',
        quantity: '1',
        unit_cost: '0',
        supplier_id: '',
        invoice_number: '',
        notes: '',
      });
      loadData();
    } catch (err: any) {
      alert('Failed to receive stock batch: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustData.item_id || !adjustData.quantity) return;

    setSubmitting(true);
    try {
      await api.post('/inventory/adjustment', {
        ...adjustData,
        quantity: parseInt(adjustData.quantity) || 1,
      });
      setShowAdjustModal(false);
      setAdjustData({
        item_id: items[0]?.id || '',
        adjustment_type: 'consumption',
        quantity: '1',
        reason: '',
      });
      loadData();
    } catch (err: any) {
      alert('Failed to record stock adjustment: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Stock Transactions & Batch Receipts</h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>Record new batch lot shipments, test kit consumption, waste discards and adjustments</p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setShowStockInModal(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowDownLeft size={16} />
            <span>Receive Stock Batch</span>
          </button>

          <button
            onClick={() => setShowAdjustModal(true)}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowUpRight size={16} />
            <span>Issue / Adjust Stock</span>
          </button>
        </div>
      </div>

      {/* Transaction History Log */}
      <div style={{ backgroundColor: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Stock Movement Ledger</h3>
          <button onClick={loadData} style={{ border: 'none', background: 'transparent', color: '#0284c7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No inventory movements logged yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 14px' }}>Date</th>
                  <th style={{ padding: '12px 14px' }}>Item Details</th>
                  <th style={{ padding: '12px 14px' }}>Type</th>
                  <th style={{ padding: '12px 14px' }}>Reason / Notes</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => {
                  const isPositive = t.transaction_type === 'purchase' || t.transaction_type === 'transfer_in';
                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>
                        {new Date(t.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>
                        {t.item_name}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: isPositive ? '#ecfdf5' : '#fef2f2',
                          color: isPositive ? '#059669' : '#dc2626',
                          textTransform: 'uppercase'
                        }}>
                          {t.transaction_type}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#475569' }}>
                        {t.notes || t.reason || 'Operational stock transaction'}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: isPositive ? '#059669' : '#dc2626' }}>
                        {isPositive ? `+${t.quantity}` : `-${t.quantity}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: STOCK IN / PURCHASE ENTRY */}
      {showStockInModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20
        }}>
          <div style={{ width: '100%', maxWidth: 520, backgroundColor: '#fff', borderRadius: 12, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Receive Stock Lot / Batch</h2>
              <button onClick={() => setShowStockInModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleStockInSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Select Item</label>
                <select
                  value={stockInData.item_id}
                  onChange={(e) => setStockInData({ ...stockInData, item_id: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                >
                  {items.map(i => (
                    <option key={i.id} value={i.id}>{i.name} ({i.code})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Batch / Lot #</label>
                  <input
                    type="text"
                    placeholder="e.g. LOT-2026-X8"
                    value={stockInData.batch_number}
                    onChange={(e) => setStockInData({ ...stockInData, batch_number: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Expiry Date</label>
                  <input
                    type="date"
                    value={stockInData.expiry_date}
                    onChange={(e) => setStockInData({ ...stockInData, expiry_date: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Received Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={stockInData.quantity}
                    onChange={(e) => setStockInData({ ...stockInData, quantity: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Unit Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={stockInData.unit_cost}
                    onChange={(e) => setStockInData({ ...stockInData, unit_cost: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Supplier</label>
                  <select
                    value={stockInData.supplier_id}
                    onChange={(e) => setStockInData({ ...stockInData, supplier_id: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  >
                    <option value="">Vendor / Distributor</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Vendor Invoice #</label>
                  <input
                    type="text"
                    placeholder="e.g. PO-8912"
                    value={stockInData.invoice_number}
                    onChange={(e) => setStockInData({ ...stockInData, invoice_number: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowStockInModal(false)}
                  style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ padding: '8px 18px', fontSize: 13 }}
                >
                  {submitting ? 'Receiving...' : 'Confirm Stock Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADJUSTMENT / USAGE */}
      {showAdjustModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20
        }}>
          <div style={{ width: '100%', maxWidth: 460, backgroundColor: '#fff', borderRadius: 12, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Record Stock Issue / Usage</h2>
              <button onClick={() => setShowAdjustModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Select Item</label>
                <select
                  value={adjustData.item_id}
                  onChange={(e) => setAdjustData({ ...adjustData, item_id: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                >
                  {items.map(i => (
                    <option key={i.id} value={i.id}>{i.name} ({i.code}) — Stock: {i.current_stock || 0}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Adjustment Type</label>
                  <select
                    value={adjustData.adjustment_type}
                    onChange={(e) => setAdjustData({ ...adjustData, adjustment_type: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  >
                    <option value="consumption">Clinical Consumption</option>
                    <option value="damage">Damaged / Broken</option>
                    <option value="expiry">Expired Discard</option>
                    <option value="reconciliation">Audit Reconciliation</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Quantity to Deduct</label>
                  <input
                    type="number"
                    min="1"
                    value={adjustData.quantity}
                    onChange={(e) => setAdjustData({ ...adjustData, quantity: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Justification / Reason</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Consumed for 100 CBC Analyzer calibrator runs"
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ padding: '8px 18px', fontSize: 13 }}
                >
                  {submitting ? 'Applying...' : 'Apply Stock Deduction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
