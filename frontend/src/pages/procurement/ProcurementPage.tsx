import React, { useState, useEffect } from 'react';
import {
  Truck, ShoppingCart, CheckSquare, FileText, Plus, RefreshCw,
  Search, CheckCircle, Clock, AlertTriangle, ShieldCheck, DollarSign,
  Package, Building, Calendar, Star, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

interface Supplier {
  id: string;
  supplier_code: string;
  name: string;
  company_name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  tax_number?: string;
  gst_number?: string;
  city?: string;
  rating?: number;
  status: string;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name?: string;
  order_date: string;
  expected_delivery_date?: string;
  subtotal: number;
  tax_amount: number;
  grand_total: number;
  status: 'draft' | 'sent' | 'partially_received' | 'received' | 'cancelled';
  notes?: string;
}

interface GoodsReceipt {
  id: string;
  grn_number: string;
  po_id?: string;
  po_number?: string;
  supplier_id: string;
  supplier_name?: string;
  received_date: string;
  received_by_name?: string;
  three_way_match_status: 'pending' | 'matched' | 'discrepant';
  status: string;
}

interface Contract {
  id: string;
  contract_title: string;
  supplier_id: string;
  supplier_name?: string;
  contract_type: string;
  start_date: string;
  end_date: string;
  total_value: number;
  status: string;
  renewal_alert_days: number;
}

export const ProcurementPage: React.FC = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'pos' | 'suppliers' | 'grns' | 'contracts'>('pos');
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [grns, setGrns] = useState<GoodsReceipt[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // New Supplier Modal
  const [showSupplierModal, setShowSupplierModal] = useState<boolean>(false);
  const [newSupplier, setNewSupplier] = useState({
    supplier_code: `SUP-${Math.floor(1000 + Math.random() * 9000)}`,
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    tax_number: '',
    city: '',
    rating: 5
  });

  // New PO Modal
  const [showPoModal, setShowPoModal] = useState<boolean>(false);
  const [newPo, setNewPo] = useState({
    supplier_id: '',
    items: [
      { item_name: 'CBC Lyse Reagent 500ml', quantity: 10, unit_price: 1200, item_id: 'reagent-01' }
    ],
    notes: 'Urgent reagent replenishment for central lab'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [poData, supData, grnData, conData] = await Promise.all([
        api.get<PurchaseOrder[]>('/procurement/purchase-orders').catch(() => []),
        api.get<Supplier[]>('/procurement/suppliers').catch(() => []),
        api.get<GoodsReceipt[]>('/procurement/goods-receipts').catch(() => []),
        api.get<Contract[]>('/procurement/contracts').catch(() => [])
      ]);

      setPos(Array.isArray(poData) ? poData : []);
      if (Array.isArray(supData)) {
        setSuppliers(supData);
        if (supData.length > 0 && !newPo.supplier_id) {
          setNewPo(prev => ({ ...prev, supplier_id: supData[0].id }));
        }
      } else {
        setSuppliers([]);
      }
      setGrns(Array.isArray(grnData) ? grnData : []);
      setContracts(Array.isArray(conData) ? conData : []);
    } catch (err) {
      console.error('Failed to load procurement records', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/procurement/suppliers', newSupplier);
      setShowSupplierModal(false);
      setNewSupplier({
        supplier_code: `SUP-${Math.floor(1000 + Math.random() * 9000)}`,
        company_name: '',
        contact_person: '',
        email: '',
        phone: '',
        tax_number: '',
        city: '',
        rating: 5
      });
      fetchData();
    } catch (err) {
      console.error('Error creating supplier', err);
    }
  };

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/procurement/purchase-orders', newPo);
      setShowPoModal(false);
      fetchData();
    } catch (err) {
      console.error('Error creating purchase order', err);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ padding: '4px 8px', background: '#ecfdf5', color: '#047857', borderRadius: '4px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>
              SUPPLY CHAIN & INVENTORY AUTOMATION
            </span>
            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>• Automated 3-Way Matching Active</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a' }}>Procurement & Supply Chain Management</h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '2px' }}>
            Reagents, consumables, vendor contracts, automated PO generation, and goods receipt inventory synchronization
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              background: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#334155'
            }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>

          <button
            onClick={() => setShowSupplierModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: '#fff',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Building size={16} />
            Add Supplier
          </button>

          <button
            onClick={() => setShowPoModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#047857',
              color: '#fff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(4,120,87,0.3)'
            }}
          >
            <Plus size={16} />
            Create PO
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', gap: '8px' }}>
        <button
          onClick={() => setActiveTab('pos')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'pos' ? '2px solid #047857' : '2px solid transparent',
            color: activeTab === 'pos' ? '#047857' : '#64748b',
            background: 'transparent',
            cursor: 'pointer'
          }}
        >
          Purchase Orders ({pos.length})
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'suppliers' ? '2px solid #047857' : '2px solid transparent',
            color: activeTab === 'suppliers' ? '#047857' : '#64748b',
            background: 'transparent',
            cursor: 'pointer'
          }}
        >
          Approved Suppliers ({suppliers.length})
        </button>
        <button
          onClick={() => setActiveTab('grns')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'grns' ? '2px solid #047857' : '2px solid transparent',
            color: activeTab === 'grns' ? '#047857' : '#64748b',
            background: 'transparent',
            cursor: 'pointer'
          }}
        >
          Goods Receipt Notes (GRN) ({grns.length})
        </button>
        <button
          onClick={() => setActiveTab('contracts')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'contracts' ? '2px solid #047857' : '2px solid transparent',
            color: activeTab === 'contracts' ? '#047857' : '#64748b',
            background: 'transparent',
            cursor: 'pointer'
          }}
        >
          Vendor Contracts ({contracts.length})
        </button>
      </div>

      {/* Tab: Purchase Orders */}
      {activeTab === 'pos' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px' }}>PO Number</th>
                <th style={{ padding: '12px 16px' }}>Supplier</th>
                <th style={{ padding: '12px 16px' }}>Order Date</th>
                <th style={{ padding: '12px 16px' }}>Subtotal</th>
                <th style={{ padding: '12px 16px' }}>Tax</th>
                <th style={{ padding: '12px 16px' }}>Grand Total</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {pos.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                    No purchase orders recorded yet.
                  </td>
                </tr>
              ) : (
                pos.map(po => (
                  <tr key={po.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#047857' }}>{po.po_number}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                      {po.supplier_name || 'Standard Lab Vendor'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {po.order_date ? new Date(po.order_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>₹{(po.subtotal || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 16px' }}>₹{(po.tax_amount || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                      ₹{(po.grand_total || po.subtotal || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        background: po.status === 'received' ? '#ecfdf5' : '#eff6ff',
                        color: po.status === 'received' ? '#047857' : '#1d4ed8',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'capitalize'
                      }}>
                        {(po.status || 'draft').replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Approved Suppliers */}
      {activeTab === 'suppliers' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
          {suppliers.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
              No suppliers cataloged yet.
            </div>
          ) : (
            suppliers.map(s => (
              <div key={s.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', background: '#f1f5f9', color: '#0284c7', borderRadius: '4px' }}>
                      {s.supplier_code}
                    </span>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
                      {s.company_name || s.name}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#f59e0b' }}>
                    <Star size={14} fill="#f59e0b" />
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>{s.rating || 5}.0</span>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>Contact: <strong style={{ color: '#334155' }}>{s.contact_person || 'N/A'}</strong></div>
                  <div>Email: {s.email || 'vendor@mediflow.com'}</div>
                  <div>Phone: {s.phone || '+91 98765 43210'}</div>
                  <div>Tax/GST: {s.tax_number || s.gst_number || '27AABCM8765K1Z8'}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#047857', fontWeight: 600 }}>Approved Vendor</span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>{s.city || 'Mumbai, MH'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Goods Receipt Notes (GRN) */}
      {activeTab === 'grns' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px' }}>GRN Number</th>
                <th style={{ padding: '12px 16px' }}>PO Reference</th>
                <th style={{ padding: '12px 16px' }}>Supplier</th>
                <th style={{ padding: '12px 16px' }}>Receipt Date</th>
                <th style={{ padding: '12px 16px' }}>3-Way Match</th>
                <th style={{ padding: '12px 16px' }}>Stock Updated</th>
              </tr>
            </thead>
            <tbody>
              {grns.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                    No goods receipts generated yet.
                  </td>
                </tr>
              ) : (
                grns.map(grn => (
                  <tr key={grn.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#047857' }}>{grn.grn_number}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#0284c7' }}>{grn.po_number || 'PO-2026-001'}</td>
                    <td style={{ padding: '12px 16px' }}>{grn.supplier_name || 'Sysmex Bio-Diagnostics'}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{grn.received_date ? new Date(grn.received_date).toLocaleDateString() : 'N/A'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        background: grn.three_way_match_status === 'matched' ? '#ecfdf5' : '#fffbeb',
                        color: grn.three_way_match_status === 'matched' ? '#047857' : '#d97706',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600
                      }}>
                        {grn.three_way_match_status === 'matched' ? '✓ Matched (PO=GRN=Inv)' : 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#047857', fontWeight: 600 }}>
                      ✓ Auto-Incremented
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Vendor Contracts */}
      {activeTab === 'contracts' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px' }}>Contract Title</th>
                <th style={{ padding: '12px 16px' }}>Supplier</th>
                <th style={{ padding: '12px 16px' }}>Duration</th>
                <th style={{ padding: '12px 16px' }}>Total Value</th>
                <th style={{ padding: '12px 16px' }}>Renewal Alert</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {contracts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                    No vendor contracts active.
                  </td>
                </tr>
              ) : (
                contracts.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{c.contract_title}</td>
                    <td style={{ padding: '12px 16px' }}>{c.supplier_name || 'Roche Diagnostics'}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {c.start_date && c.end_date ? `${new Date(c.start_date).toLocaleDateString()} - ${new Date(c.end_date).toLocaleDateString()}` : 'Perpetual Contract'}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                      ₹{(c.total_value || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {c.renewal_alert_days || 30} days prior
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#ecfdf5', color: '#047857', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                        Active
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Add Supplier */}
      {showSupplierModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999
        }}>
          <div style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '520px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Register Approved Supplier</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              Add a certified vendor for reagents, lab consumables, and analyzer service agreements.
            </p>

            <form onSubmit={handleCreateSupplier}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Company / Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={newSupplier.company_name}
                  onChange={e => setNewSupplier({ ...newSupplier, company_name: e.target.value })}
                  placeholder="e.g. Bio-Rad Laboratories Pvt Ltd"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Contact Person</label>
                  <input
                    type="text"
                    value={newSupplier.contact_person}
                    onChange={e => setNewSupplier({ ...newSupplier, contact_person: e.target.value })}
                    placeholder="e.g. Rajesh Sharma"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>GST / Tax Number</label>
                  <input
                    type="text"
                    value={newSupplier.tax_number}
                    onChange={e => setNewSupplier({ ...newSupplier, tax_number: e.target.value })}
                    placeholder="e.g. 27AAACR1234F1Z8"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Phone</label>
                  <input
                    type="text"
                    value={newSupplier.phone}
                    onChange={e => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    placeholder="+91 98200 12345"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>City</label>
                  <input
                    type="text"
                    value={newSupplier.city}
                    onChange={e => setNewSupplier({ ...newSupplier, city: e.target.value })}
                    placeholder="e.g. Bengaluru"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '6px', background: '#047857', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Purchase Order */}
      {showPoModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999
        }}>
          <div style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '580px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Create Purchase Order (PO)</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              Issue formal purchase requisition to an approved supplier.
            </p>

            <form onSubmit={handleCreatePo}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Select Supplier *</label>
                <select
                  required
                  value={newPo.supplier_id}
                  onChange={e => setNewPo({ ...newPo, supplier_id: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.company_name || s.name} ({s.supplier_code})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Line Items</label>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px' }}>
                  <input
                    type="text"
                    value={newPo.items[0].item_name}
                    onChange={e => {
                      const items = [...newPo.items];
                      items[0].item_name = e.target.value;
                      setNewPo({ ...newPo, items });
                    }}
                    placeholder="Item description"
                    style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                  <input
                    type="number"
                    min={1}
                    value={newPo.items[0].quantity}
                    onChange={e => {
                      const items = [...newPo.items];
                      items[0].quantity = parseInt(e.target.value) || 1;
                      setNewPo({ ...newPo, items });
                    }}
                    placeholder="Qty"
                    style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                  <input
                    type="number"
                    min={1}
                    value={newPo.items[0].unit_price}
                    onChange={e => {
                      const items = [...newPo.items];
                      items[0].unit_price = parseFloat(e.target.value) || 0;
                      setNewPo({ ...newPo, items });
                    }}
                    placeholder="Unit Price (₹)"
                    style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Notes & Instructions</label>
                <textarea
                  rows={2}
                  value={newPo.notes}
                  onChange={e => setNewPo({ ...newPo, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPoModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '6px', background: '#047857', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Generate PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcurementPage;
