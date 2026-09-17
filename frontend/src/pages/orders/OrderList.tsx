import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ClipboardList, CheckCircle2, Clock, Printer, Eye, DollarSign, Package as PackageIcon, TestTubes, XCircle, AlertTriangle, FileText, Ban } from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { ReportPreviewModal } from '../../components/clinical/ReportPreviewModal';

export const OrderList: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewReportId, setPreviewReportId] = useState<string | null>(null);

  // New order form
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [orderPriority, setOrderPriority] = useState<'routine' | 'urgent' | 'stat'>('routine');
  const [selectedItems, setSelectedItems] = useState<Array<{ id: string; name: string; price: number; type: 'test' | 'package' }>>([]);
  const [testSearch, setTestSearch] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [discountReason, setDiscountReason] = useState('Authorized concession');
  const [taxPercent, setTaxPercent] = useState('5');
  const [paidAmount, setPaidAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [clinicalNotes, setClinicalNotes] = useState('');

  // Cancel order modal
  const [cancelModalOrder, setCancelModalOrder] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // View order detail modal
  const [viewOrderData, setViewOrderData] = useState<any | null>(null);

  const { error, success } = useNotification();
  const navigate = useNavigate();

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/orders?search=${encodeURIComponent(search)}&status=${statusFilter}&priority=${priorityFilter}`);
      setOrders(res);
    } catch (e: any) {
      error(e.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [search, statusFilter, priorityFilter]);

  useEffect(() => {
    async function loadMasters() {
      try {
        const [pRes, dRes, tRes, pkgRes] = await Promise.all([
          api.get('/patients'),
          api.get('/doctors'),
          api.get('/tests'),
          api.get('/tests/packages'),
        ]);
        setPatients(Array.isArray(pRes) ? pRes : pRes.data || []);
        setDoctors(dRes);
        setTests(tRes);
        setPackages(pkgRes);
      } catch (e) {
        // ignore
      }
    }
    loadMasters();
  }, []);

  // Calculate pricing
  const subtotal = selectedItems.reduce((sum, item) => sum + item.price, 0);
  const discount = parseFloat(discountAmount || '0') || 0;
  const taxable = Math.max(0, subtotal - discount);
  const tax = Math.round((taxable * (parseFloat(taxPercent || '0') / 100)) * 100) / 100;
  const netTotal = Math.round((taxable + tax) * 100) / 100;
  const paid = parseFloat(paidAmount || '0') || 0;
  const due = Math.max(0, Math.round((netTotal - paid) * 100) / 100);

  const toggleTestItem = (test: any) => {
    const exists = selectedItems.find(i => i.id === test.id);
    if (exists) {
      setSelectedItems(selectedItems.filter(i => i.id !== test.id));
    } else {
      setSelectedItems([...selectedItems, {
        id: test.id,
        name: test.name,
        price: parseFloat(test.effective_price || test.base_price),
        type: 'test'
      }]);
    }
  };

  const togglePackageItem = (pkg: any) => {
    const exists = selectedItems.find(i => i.id === pkg.id);
    if (exists) {
      setSelectedItems(selectedItems.filter(i => i.id !== pkg.id));
    } else {
      setSelectedItems([...selectedItems, {
        id: pkg.id,
        name: pkg.name,
        price: parseFloat(pkg.price),
        type: 'package'
      }]);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || selectedItems.length === 0) {
      error('Please select a patient and at least one test or package');
      return;
    }

    try {
      const itemsPayload = selectedItems.map(item => ({
        ...(item.type === 'test' ? { test_id: item.id } : { package_id: item.id }),
        price: item.price
      }));

      const res = await api.post('/orders', {
        patient_id: selectedPatientId,
        referring_doctor_id: selectedDoctorId || null,
        priority: orderPriority,
        items: itemsPayload,
        discount_amount: discount,
        discount_reason: discountReason,
        tax_percent: parseFloat(taxPercent),
        paid_amount: paid,
        payment_method: paymentMethod,
        clinical_history: clinicalNotes,
      });

      success(`Order booked successfully: ${res.order_number}`);
      setShowCreateModal(false);
      setSelectedItems([]);
      setSelectedPatientId('');
      setSelectedDoctorId('');
      setPaidAmount('0');
      setDiscountAmount('0');
      setClinicalNotes('');
      loadOrders();
    } catch (err: any) {
      error(err.message || 'Failed to create order');
    }
  };

  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalOrder) return;
    try {
      await api.post(`/orders/${cancelModalOrder.id}/cancel`, {
        reason: cancelReason || 'Order cancelled by user request'
      });
      success(`Order ${cancelModalOrder.order_number} cancelled`);
      setCancelModalOrder(null);
      setCancelReason('');
      loadOrders();
    } catch (err: any) {
      error(err.message || 'Failed to cancel order');
    }
  };

  const handleViewDetails = async (orderId: string) => {
    try {
      const data = await api.get(`/orders/${orderId}`);
      setViewOrderData(data);
    } catch (err: any) {
      error(err.message || 'Failed to load order details');
    }
  };

  const filteredTests = tests.filter(t =>
    t.name.toLowerCase().includes(testSearch.toLowerCase()) ||
    t.code.toLowerCase().includes(testSearch.toLowerCase()) ||
    (t.department && t.department.toLowerCase().includes(testSearch.toLowerCase()))
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Diagnostic Test Orders</h1>
          <p style={{ fontSize: 13.5, color: '#64748b' }}>
            Book test orders, assign priority, generate 6-digit barcoded samples, track phlebotomy, and issue invoices.
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary" id="btn-book-order">
          <Plus size={16} />
          <span>New Test Order</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ marginBottom: 20, padding: 14, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 11 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Order ID (ORD-2026-XXXXXX), Lab Number, or Patient Name..."
            className="form-input"
            style={{ paddingLeft: 40, height: 40 }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-select"
          style={{ width: 190, height: 40 }}
        >
          <option value="">All Statuses</option>
          <option value="registered">Registered</option>
          <option value="sample_collected">Sample Collected</option>
          <option value="processing">Processing</option>
          <option value="approved">Approved</option>
          <option value="report_released">Report Released</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="form-select"
          style={{ width: 150, height: 40 }}
        >
          <option value="">All Priorities</option>
          <option value="routine">Routine</option>
          <option value="urgent">Urgent</option>
          <option value="stat">STAT / Emergency</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order ID / Lab No</th>
              <th>Patient Details</th>
              <th>Priority</th>
              <th>Ref. Doctor</th>
              <th>Billing & Due</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30 }}>Loading test orders...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>No test orders found.</td></tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#0284c7' }}>{o.order_number}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{o.lab_number}</div>
                    <div style={{ fontSize: 10.5, color: '#94a3b8' }}>
                      {new Date(o.created_at).toLocaleDateString('en-IN')} {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{o.patient_name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {o.patient_id_code}  •  {o.age} Y / {o.gender}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${
                      o.priority === 'stat' ? 'badge-high' :
                      o.priority === 'urgent' ? 'badge-low' : 'badge-normal'
                    }`} style={{ fontSize: 10.5, textTransform: 'uppercase' }}>
                      {o.priority || 'routine'}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: 12.5 }}>{o.doctor_name || 'Self / OPD'}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>₹{o.net_amount}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                      <span className={`badge ${o.payment_status === 'paid' ? 'badge-normal' : 'badge-high'}`} style={{ fontSize: 10 }}>
                        {o.payment_status}
                      </span>
                      {o.due_amount > 0 && <span style={{ fontSize: 10.5, color: '#dc2626' }}>Due: ₹{o.due_amount}</span>}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${
                      o.status === 'report_released' || o.status === 'completed' ? 'badge-normal' :
                      o.status === 'approved' ? 'badge-primary' :
                      o.status === 'processing' ? 'badge-low' :
                      o.status === 'cancelled' ? 'badge-high' : 'badge-pending'
                    }`}>
                      {o.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => handleViewDetails(o.id)}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: 11, padding: '4px 8px' }}
                        title="View Order Details"
                      >
                        <Eye size={12} />
                      </button>

                      {o.report_id ? (
                        <button
                          onClick={() => setPreviewReportId(o.report_id)}
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: 11, padding: '4px 8px' }}
                        >
                          Report
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/results?order_id=${o.id}`)}
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: 11, padding: '4px 8px' }}
                        >
                          Results
                        </button>
                      )}

                      {o.status !== 'cancelled' && o.status !== 'completed' && o.status !== 'report_released' && (
                        <button
                          onClick={() => { setCancelModalOrder(o); setCancelReason(''); }}
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: 11, padding: '4px 8px', color: '#dc2626' }}
                          title="Cancel Order"
                        >
                          <Ban size={12} />
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

      {/* Book Test Order Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-content-xl" style={{ maxHeight: '92vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 className="card-title">
                <ClipboardList size={18} color="#0284c7" />
                Book Diagnostic Test Order (6-Digit Sequence)
              </h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateOrder}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
                {/* Left Column: Patient, Doctor, Priority & Test Selection */}
                <div>
                  <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: '#0369a1', marginBottom: 12, fontWeight: 700 }}>
                    1. Patient & Priority Selection
                  </h4>

                  <div className="form-group">
                    <label className="form-label">Select Registered Patient *</label>
                    <select
                      required
                      value={selectedPatientId}
                      onChange={(e) => setSelectedPatientId(e.target.value)}
                      className="form-select"
                      id="select-patient"
                    >
                      <option value="">-- Choose Registered Patient --</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.patient_id_code} - {p.mobile})</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Referring Doctor</label>
                      <select
                        value={selectedDoctorId}
                        onChange={(e) => setSelectedDoctorId(e.target.value)}
                        className="form-select"
                      >
                        <option value="">Self / OPD / None</option>
                        {doctors.map(d => (
                          <option key={d.id} value={d.id}>{d.name} ({d.specialization || d.clinic_hospital})</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Order Priority *</label>
                      <select
                        value={orderPriority}
                        onChange={(e) => setOrderPriority(e.target.value as any)}
                        className="form-select"
                        id="select-priority"
                      >
                        <option value="routine">Routine (Standard TAT)</option>
                        <option value="urgent">Urgent (Priority Processing)</option>
                        <option value="stat">STAT / Emergency (Immediate)</option>
                      </select>
                    </div>
                  </div>

                  <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: '#0369a1', margin: '20px 0 8px', fontWeight: 700 }}>
                    2. Select Tests & Health Packages
                  </h4>

                  {/* Test Search Bar */}
                  <div style={{ position: 'relative', marginBottom: 12 }}>
                    <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 9 }} />
                    <input
                      type="text"
                      value={testSearch}
                      onChange={(e) => setTestSearch(e.target.value)}
                      placeholder="Search panels by name, code or department..."
                      className="form-input"
                      style={{ paddingLeft: 32, height: 32, fontSize: 12 }}
                    />
                  </div>

                  {/* Diagnostic Packages */}
                  {packages.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 6 }}>HEALTH PACKAGES (BUNDLED)</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {packages.map(pkg => {
                          const isSelected = selectedItems.some(i => i.id === pkg.id);
                          return (
                            <div
                              key={pkg.id}
                              onClick={() => togglePackageItem(pkg)}
                              style={{
                                padding: '8px 10px',
                                borderRadius: 6,
                                border: `1.5px solid ${isSelected ? '#0284c7' : '#e2e8f0'}`,
                                backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                            >
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 600 }}>{pkg.name}</div>
                                <div style={{ fontSize: 10.5, color: '#64748b' }}>Bundle</div>
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1' }}>₹{pkg.price}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Individual Tests */}
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 6 }}>INDIVIDUAL DIAGNOSTIC PANELS</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                      {filteredTests.map(t => {
                        const isSelected = selectedItems.some(i => i.id === t.id);
                        return (
                          <div
                            key={t.id}
                            onClick={() => toggleTestItem(t)}
                            style={{
                              padding: '8px 10px',
                              borderRadius: 6,
                              border: `1px solid ${isSelected ? '#0284c7' : '#e2e8f0'}`,
                              backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: 11.5, fontWeight: 600 }}>{t.name}</div>
                              <div style={{ fontSize: 10, color: '#64748b' }}>{t.department} • {t.sample_type}</div>
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>₹{t.effective_price || t.base_price}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Column: Order Summary & Invoicing */}
                <div style={{ backgroundColor: '#f8fafc', padding: 18, borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                  <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: '#0369a1', marginBottom: 14, fontWeight: 700 }}>
                    3. Order Summary & Invoicing
                  </h4>

                  <div style={{ flex: 1, minHeight: 120, maxHeight: 180, overflowY: 'auto', marginBottom: 14 }}>
                    {selectedItems.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#94a3b8', padding: 20, fontSize: 12 }}>
                        No items selected. Click tests or packages on the left.
                      </div>
                    ) : (
                      selectedItems.map((it, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #cbd5e1', fontSize: 12 }}>
                          <div>{it.name}</div>
                          <div style={{ fontWeight: 600 }}>₹{it.price}</div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Financial Fields */}
                  <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                      <span>Subtotal:</span>
                      <span style={{ fontWeight: 600 }}>₹{subtotal.toFixed(2)}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 11, color: '#64748b' }}>Discount (₹):</label>
                        <input
                          type="number"
                          value={discountAmount}
                          onChange={(e) => setDiscountAmount(e.target.value)}
                          className="form-input"
                          style={{ height: 32, fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: '#64748b' }}>Tax GST (%):</label>
                        <input
                          type="number"
                          value={taxPercent}
                          onChange={(e) => setTaxPercent(e.target.value)}
                          className="form-input"
                          style={{ height: 32, fontSize: 12 }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: '#0f172a', paddingTop: 4 }}>
                      <span>Net Total:</span>
                      <span style={{ color: '#0369a1' }}>₹{netTotal.toFixed(2)}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                      <div>
                        <label style={{ fontSize: 11, color: '#64748b' }}>Initial Paid (₹):</label>
                        <input
                          type="number"
                          value={paidAmount}
                          onChange={(e) => setPaidAmount(e.target.value)}
                          className="form-input"
                          style={{ height: 32, fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: '#64748b' }}>Payment Method:</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="form-select"
                          style={{ height: 32, fontSize: 12 }}
                        >
                          <option value="Cash">Cash</option>
                          <option value="UPI">UPI / QR</option>
                          <option value="Card">Credit/Debit Card</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: due > 0 ? '#dc2626' : '#10b981' }}>
                      <span>Balance Due:</span>
                      <span>₹{due.toFixed(2)}</span>
                    </div>

                    <div>
                      <label style={{ fontSize: 11, color: '#64748b' }}>Clinical History & Remarks:</label>
                      <input
                        type="text"
                        value={clinicalNotes}
                        onChange={(e) => setClinicalNotes(e.target.value)}
                        placeholder="e.g. Fasting 12 hrs, Diabetic follow-up..."
                        className="form-input"
                        style={{ height: 32, fontSize: 12 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-outline" style={{ flex: 1 }}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1.5 }}>
                      Confirm & Book
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {cancelModalOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 className="card-title" style={{ color: '#dc2626' }}>
                <AlertTriangle size={18} color="#dc2626" />
                Cancel Test Order
              </h3>
              <button onClick={() => setCancelModalOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>
                &times;
              </button>
            </div>
            <form onSubmit={handleCancelOrder}>
              <div className="modal-body">
                <p style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>
                  Are you sure you want to cancel order <strong>{cancelModalOrder.order_number}</strong> for <strong>{cancelModalOrder.patient_name}</strong>? Associated pending samples will be marked as cancelled.
                </p>
                <div className="form-group">
                  <label className="form-label">Cancellation Reason *</label>
                  <textarea
                    required
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Enter reason for cancelling order..."
                    className="form-input"
                    rows={3}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setCancelModalOrder(null)} className="btn btn-outline">
                  Keep Order
                </button>
                <button type="submit" className="btn btn-danger" style={{ backgroundColor: '#dc2626', color: '#fff' }}>
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Order Details Modal */}
      {viewOrderData && (
        <div className="modal-overlay">
          <div className="modal-content modal-content-lg" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 className="card-title">
                <FileText size={18} color="#0284c7" />
                Order Requisition & Summary: {viewOrderData.order.order_number}
              </h3>
              <button onClick={() => setViewOrderData(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>
                &times;
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Demographics */}
              <div style={{ backgroundColor: '#f8fafc', padding: 14, borderRadius: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12.5 }}>
                <div>
                  <div><strong>Patient:</strong> {viewOrderData.order.patient_name} ({viewOrderData.order.patient_id_code})</div>
                  <div><strong>Age / Gender:</strong> {viewOrderData.order.age} Y / {viewOrderData.order.gender}</div>
                  <div><strong>Mobile:</strong> {viewOrderData.order.patient_mobile || 'N/A'}</div>
                </div>
                <div>
                  <div><strong>Priority:</strong> <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>{viewOrderData.order.priority}</span></div>
                  <div><strong>Lab Number:</strong> {viewOrderData.order.lab_number}</div>
                  <div><strong>Ref Doctor:</strong> {viewOrderData.order.doctor_name || 'Self / General'}</div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 style={{ fontSize: 12.5, fontWeight: 700, color: '#0369a1', marginBottom: 6 }}>Ordered Diagnostic Tests</h4>
                <table className="data-table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>Test Item</th>
                      <th>Sample Type</th>
                      <th>Container</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewOrderData.items.map((it: any) => (
                      <tr key={it.id}>
                        <td>{it.item_name}</td>
                        <td>{it.sample_type || 'Blood'}</td>
                        <td>{it.container_type || 'Vacutainer'}</td>
                        <td>₹{it.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Samples */}
              <div>
                <h4 style={{ fontSize: 12.5, fontWeight: 700, color: '#0369a1', marginBottom: 6 }}>Sample Barcodes (SMP-YYYY-XXXXXX)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                  {viewOrderData.samples.map((s: any) => (
                    <div key={s.id} style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 6, backgroundColor: '#fff' }}>
                      <div style={{ fontWeight: 700, color: '#0284c7' }}>{s.sample_barcode}</div>
                      <div style={{ fontSize: 11, color: '#475569' }}>{s.sample_type} ({s.container_type})</div>
                      <div style={{ fontSize: 10.5, marginTop: 4 }}>
                        Status: <span className="badge badge-normal" style={{ fontSize: 10 }}>{s.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Invoice & Payments */}
              {viewOrderData.invoice && (
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Invoice Ref: {viewOrderData.invoice.invoice_number}</div>
                    <div style={{ fontSize: 12 }}>Net Total: ₹{viewOrderData.invoice.net_total}  |  Paid: ₹{viewOrderData.invoice.paid}  |  Due: ₹{viewOrderData.invoice.due}</div>
                  </div>
                  <button onClick={() => window.print()} className="btn btn-outline btn-sm">
                    <Printer size={13} />
                    <span>Print Requisition Slip</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Preview Modal */}
      {previewReportId && (
        <ReportPreviewModal reportId={previewReportId} onClose={() => setPreviewReportId(null)} />
      )}
    </div>
  );
};
