import React, { useState, useEffect } from 'react';
import { Receipt, DollarSign, Search, Plus, CheckCircle2, AlertCircle, Printer, Eye, RotateCcw, CreditCard } from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export const InvoiceList: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Payment modal state
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Invoice Detail & Print Modal
  const [viewInvoiceData, setViewInvoiceData] = useState<any | null>(null);

  // Receipt Modal
  const [receiptData, setReceiptData] = useState<any | null>(null);

  // Refund Modal
  const [refundPaymentData, setRefundPaymentData] = useState<any | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const { error, success } = useNotification();

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/billing/invoices?status=${statusFilter}&search=${encodeURIComponent(search)}`);
      setInvoices(res);
    } catch (e: any) {
      error(e.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [statusFilter, search]);

  const handleOpenPayment = (inv: any) => {
    setSelectedInvoice(inv);
    setPaymentAmount(String(inv.due));
    setTransactionRef('');
    setPaymentNotes('');
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    setSubmittingPayment(true);
    try {
      const res = await api.post('/billing/payments', {
        invoice_id: selectedInvoice.id,
        amount: parseFloat(paymentAmount),
        payment_method: paymentMethod,
        transaction_ref: transactionRef,
        notes: paymentNotes,
      });

      success(`Payment receipt generated: ${res.receipt_number}`);
      setSelectedInvoice(null);
      loadInvoices();

      // Show receipt
      const rec = await api.get(`/billing/receipts/${res.payment_id}`);
      setReceiptData(rec);
    } catch (err: any) {
      error(err.message || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleViewInvoice = async (invoiceId: string) => {
    try {
      const data = await api.get(`/billing/invoices/${invoiceId}`);
      setViewInvoiceData(data);
    } catch (e: any) {
      error('Failed to load invoice details');
    }
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundPaymentData) return;

    try {
      await api.post(`/billing/payments/${refundPaymentData.id}/refund`, {
        amount: parseFloat(refundAmount),
        reason: refundReason
      });
      success(`Refund of ₹${refundAmount} processed successfully`);
      setRefundPaymentData(null);
      if (viewInvoiceData) {
        handleViewInvoice(viewInvoiceData.invoice.id);
      }
      loadInvoices();
    } catch (err: any) {
      error(err.message || 'Failed to process refund');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Billing, Invoices & Payments</h1>
          <p style={{ fontSize: 13.5, color: '#64748b' }}>
            Patient invoices, GST tax computation, authorized discounts, multi-mode payment collection, receipts, and refunds.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ marginBottom: 20, padding: 14, display: 'flex', gap: 14 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 11 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Invoice Number (INV-2026-XXXXXX), Order ID, or Patient Name..."
            className="form-input"
            style={{ paddingLeft: 40, height: 40 }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-select"
          style={{ width: 200, height: 40 }}
        >
          <option value="">All Payment Statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partially Paid</option>
          <option value="paid">Paid in Full</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {/* Invoices Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice Number</th>
              <th>Order / Lab Ref</th>
              <th>Patient Details</th>
              <th>Net Total</th>
              <th>Paid & Due</th>
              <th>Payment Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30 }}>Loading billing ledger...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>No invoices found.</td></tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#0284c7' }}>{inv.invoice_number}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      {new Date(inv.created_at).toLocaleDateString('en-IN')}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{inv.order_number}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{inv.lab_number}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{inv.patient_name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{inv.patient_id_code}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>₹{inv.net_total}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Sub: ₹{inv.subtotal} | Disc: ₹{inv.discount}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: 12.5, color: '#10b981', fontWeight: 600 }}>Paid: ₹{inv.paid}</div>
                    {inv.due > 0 ? (
                      <div style={{ fontSize: 12.5, color: '#dc2626', fontWeight: 700 }}>Due: ₹{inv.due}</div>
                    ) : (
                      <div style={{ fontSize: 11, color: '#64748b' }}>Settled</div>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${
                      inv.status === 'paid' ? 'badge-normal' :
                      inv.status === 'partial' ? 'badge-low' :
                      inv.status === 'refunded' ? 'badge-high' : 'badge-pending'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => handleViewInvoice(inv.id)}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: 11, padding: '4px 8px' }}
                        title="View Full Invoice"
                      >
                        <Eye size={12} />
                        <span>Invoice</span>
                      </button>

                      {inv.due > 0 && (
                        <button
                          onClick={() => handleOpenPayment(inv)}
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: 11, padding: '4px 8px' }}
                          title="Record Payment"
                        >
                          <DollarSign size={12} />
                          <span>Pay Due</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Record Payment Modal */}
      {selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 className="card-title">
                <Receipt size={18} color="#0284c7" />
                Record Payment: {selectedInvoice.invoice_number}
              </h3>
              <button onClick={() => setSelectedInvoice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>
                &times;
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit}>
              <div className="modal-body">
                <div style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 6, marginBottom: 14, fontSize: 12.5 }}>
                  <div>Patient: <strong>{selectedInvoice.patient_name}</strong></div>
                  <div>Net Total: <strong>₹{selectedInvoice.net_total}</strong>  |  Current Due: <strong style={{ color: '#dc2626' }}>₹{selectedInvoice.due}</strong></div>
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="form-select"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / Digital QR</option>
                    <option value="Card">Credit / Debit Card</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="Online">Online Gateway</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Transaction / Cheque / UTR Ref</label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="e.g. UPI-984214, TXN-0012"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Accounting Notes</label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="e.g. Counter collection, token 44"
                    className="form-input"
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setSelectedInvoice(null)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={submittingPayment} className="btn btn-primary">
                  {submittingPayment ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Invoice Modal */}
      {viewInvoiceData && (
        <div className="modal-overlay">
          <div className="modal-content modal-content-lg" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 className="card-title">
                <Receipt size={18} color="#0284c7" />
                Tax Invoice: {viewInvoiceData.invoice.invoice_number}
              </h3>
              <button onClick={() => setViewInvoiceData(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>
                &times;
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Lab & Patient Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0284c7', paddingBottom: 12 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0369a1' }}>{viewInvoiceData.invoice.lab_name}</h2>
                  <div style={{ fontSize: 11, color: '#475569' }}>{viewInvoiceData.invoice.branch_name} • {viewInvoiceData.invoice.branch_address}</div>
                  <div style={{ fontSize: 10.5, color: '#64748b' }}>GST/Tax ID: {viewInvoiceData.invoice.tax_number || '07AAAAA0000A1Z5'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>TAX INVOICE</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0284c7' }}>{viewInvoiceData.invoice.invoice_number}</div>
                  <div style={{ fontSize: 10.5, color: '#64748b' }}>Date: {new Date(viewInvoiceData.invoice.created_at).toLocaleDateString('en-IN')}</div>
                </div>
              </div>

              {/* Patient details */}
              <div style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
                <div>
                  <div><strong>Patient:</strong> {viewInvoiceData.invoice.patient_name} ({viewInvoiceData.invoice.patient_id_code})</div>
                  <div><strong>Age / Gender:</strong> {viewInvoiceData.invoice.age} Y / {viewInvoiceData.invoice.gender}</div>
                  <div><strong>Phone:</strong> {viewInvoiceData.invoice.patient_mobile}</div>
                </div>
                <div>
                  <div><strong>Order Ref:</strong> {viewInvoiceData.invoice.order_number}</div>
                  <div><strong>Lab Number:</strong> {viewInvoiceData.invoice.lab_number}</div>
                  <div><strong>Payment Status:</strong> <span className="badge badge-normal" style={{ fontSize: 10 }}>{viewInvoiceData.invoice.status}</span></div>
                </div>
              </div>

              {/* Items Table */}
              <table className="data-table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Discount</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {viewInvoiceData.items.map((it: any, idx: number) => (
                    <tr key={idx}>
                      <td>{it.item_name}</td>
                      <td>{it.quantity || 1}</td>
                      <td>₹{it.unit_price}</td>
                      <td>₹{it.discount || 0}</td>
                      <td style={{ fontWeight: 600 }}>₹{it.total || it.unit_price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Summary */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: 240, fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subtotal:</span>
                    <span>₹{viewInvoiceData.invoice.subtotal}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                    <span>Discount:</span>
                    <span>- ₹{viewInvoiceData.invoice.discount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tax (GST):</span>
                    <span>₹{viewInvoiceData.invoice.tax}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, borderTop: '1px solid #cbd5e1', paddingTop: 6 }}>
                    <span>Grand Total:</span>
                    <span style={{ color: '#0369a1' }}>₹{viewInvoiceData.invoice.net_total}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                    <span>Paid Amount:</span>
                    <span>₹{viewInvoiceData.invoice.paid}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: viewInvoiceData.invoice.due > 0 ? '#dc2626' : '#10b981' }}>
                    <span>Balance Due:</span>
                    <span>₹{viewInvoiceData.invoice.due}</span>
                  </div>
                </div>
              </div>

              {/* Payment History & Receipts */}
              {viewInvoiceData.payments && viewInvoiceData.payments.length > 0 && (
                <div>
                  <h4 style={{ fontSize: 12.5, fontWeight: 700, color: '#0369a1', marginBottom: 6 }}>Payment Receipts Ledger</h4>
                  <table className="data-table" style={{ fontSize: 11.5 }}>
                    <thead>
                      <tr>
                        <th>Receipt No</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Date</th>
                        <th>Received By</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewInvoiceData.payments.map((p: any) => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600 }}>{p.receipt_number}</td>
                          <td style={{ fontWeight: 700, color: '#10b981' }}>₹{p.amount}</td>
                          <td>{p.payment_method} {p.transaction_ref ? `(${p.transaction_ref})` : ''}</td>
                          <td>{new Date(p.created_at).toLocaleString('en-IN')}</td>
                          <td>{p.received_by_name || 'Staff'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                onClick={async () => {
                                  const rec = await api.get(`/billing/receipts/${p.id}`);
                                  setReceiptData(rec);
                                }}
                                className="btn btn-outline btn-sm"
                                style={{ fontSize: 10.5, padding: '2px 6px' }}
                              >
                                Receipt
                              </button>
                              <button
                                onClick={() => {
                                  setRefundPaymentData(p);
                                  setRefundAmount(String(p.amount));
                                  setRefundReason('');
                                }}
                                className="btn btn-outline btn-sm"
                                style={{ fontSize: 10.5, padding: '2px 6px', color: '#dc2626' }}
                              >
                                Refund
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" onClick={() => setViewInvoiceData(null)} className="btn btn-outline">
                Close
              </button>
              <button type="button" onClick={() => window.print()} className="btn btn-primary">
                <Printer size={14} />
                <span>Print Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Receipt Modal */}
      {receiptData && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 className="card-title">
                <Receipt size={18} color="#10b981" />
                Payment Receipt: {receiptData.receipt_number}
              </h3>
              <button onClick={() => setReceiptData(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>
                &times;
              </button>
            </div>
            <div className="modal-body" style={{ fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ textAlign: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0369a1' }}>{receiptData.lab_name}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{receiptData.branch_name}</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>GST: {receiptData.tax_number || '07AAAAA0000A1Z5'}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Receipt Ref:</span>
                <span style={{ fontWeight: 700 }}>{receiptData.receipt_number}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Invoice Ref:</span>
                <span>{receiptData.invoice_number}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Patient:</span>
                <span style={{ fontWeight: 600 }}>{receiptData.patient_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Payment Mode:</span>
                <span>{receiptData.payment_method}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Payment Date:</span>
                <span>{new Date(receiptData.created_at).toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: 6, fontSize: 14 }}>
                <span style={{ fontWeight: 700 }}>Amount Paid:</span>
                <span style={{ fontWeight: 700, color: '#10b981' }}>₹{receiptData.amount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: receiptData.balance_due > 0 ? '#dc2626' : '#10b981' }}>
                <span>Remaining Due:</span>
                <span>₹{receiptData.balance_due}</span>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>
                Received by {receiptData.received_by_name || 'Staff'}. Thank you!
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" onClick={() => setReceiptData(null)} className="btn btn-outline">
                Close
              </button>
              <button type="button" onClick={() => window.print()} className="btn btn-primary">
                <Printer size={14} />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Process Refund Modal */}
      {refundPaymentData && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 className="card-title" style={{ color: '#dc2626' }}>
                <RotateCcw size={18} color="#dc2626" />
                Process Payment Refund
              </h3>
              <button onClick={() => setRefundPaymentData(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>
                &times;
              </button>
            </div>
            <form onSubmit={handleRefundSubmit}>
              <div className="modal-body">
                <p style={{ fontSize: 12.5, color: '#475569', marginBottom: 12 }}>
                  Issue refund for payment receipt <strong>{refundPaymentData.receipt_number}</strong> (Original Amount: ₹{refundPaymentData.amount}):
                </p>
                <div className="form-group">
                  <label className="form-label">Refund Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    max={refundPaymentData.amount}
                    required
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Refund Authorization Reason *</label>
                  <textarea
                    required
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="Provide reason for refund..."
                    className="form-input"
                    rows={2}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setRefundPaymentData(null)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" style={{ backgroundColor: '#dc2626', color: '#fff' }}>
                  Confirm Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
