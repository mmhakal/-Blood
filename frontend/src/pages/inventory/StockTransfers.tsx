import React, { useState, useEffect } from 'react';
import { Truck, Plus, CheckCircle2, XCircle, Search, X, ArrowRight, Building2 } from 'lucide-react';
import api from '../../services/api';

export const StockTransfers: React.FC = () => {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    from_branch_id: '',
    to_branch_id: '',
    item_id: '',
    quantity: '1',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [trfRes, brRes, itRes] = await Promise.all([
        api.get('/inventory/transfers'),
        api.get('/branches'),
        api.get('/inventory/items'),
      ]);
      setTransfers(trfRes);
      setBranches(brRes);
      setItems(itRes);

      if (brRes?.length >= 2) {
        setFormData(prev => ({
          ...prev,
          from_branch_id: brRes[0].id,
          to_branch_id: brRes[1].id,
        }));
      }
      if (itRes?.length > 0) {
        setFormData(prev => ({ ...prev, item_id: itRes[0].id }));
      }
    } catch (err) {
      console.error('Failed to load stock transfers', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.from_branch_id || !formData.to_branch_id || !formData.item_id) return;
    if (formData.from_branch_id === formData.to_branch_id) {
      alert('Source and destination branches must be different');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/inventory/transfers', {
        ...formData,
        quantity: parseInt(formData.quantity) || 1,
      });
      setShowModal(false);
      setFormData(prev => ({ ...prev, quantity: '1', notes: '' }));
      loadData();
    } catch (err: any) {
      alert('Failed to initiate stock transfer: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'completed' | 'cancelled') => {
    try {
      await api.put(`/inventory/transfers/${id}/status`, { status });
      loadData();
    } catch (err: any) {
      alert('Error updating transfer status: ' + err.message);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Inter-Branch Stock Transfers</h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>Dispatch and balance reagent stock across satellite laboratories and collection hubs</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={16} />
          <span>New Stock Transfer</span>
        </button>
      </div>

      {/* Transfers Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading transfers...</div>
        ) : transfers.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No inter-branch transfers on record.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 14px' }}>Date</th>
                  <th style={{ padding: '12px 14px' }}>Item Transferred</th>
                  <th style={{ padding: '12px 14px' }}>Source → Destination Branch</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Quantity</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>
                      {t.item_name}
                      {t.notes && <div style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>{t.notes}</div>}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#475569' }}>{t.from_branch_name}</span>
                        <ArrowRight size={14} color="#0284c7" />
                        <strong style={{ color: '#0284c7' }}>{t.to_branch_name}</strong>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      {t.quantity}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        backgroundColor: t.status === 'completed' ? '#ecfdf5' : t.status === 'cancelled' ? '#fee2e2' : '#fff7ed',
                        color: t.status === 'completed' ? '#059669' : t.status === 'cancelled' ? '#dc2626' : '#ea580c',
                        textTransform: 'uppercase'
                      }}>
                        {t.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      {t.status === 'pending' || t.status === 'in_transit' ? (
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            onClick={() => handleUpdateStatus(t.id, 'completed')}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 4,
                              backgroundColor: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #a7f3d0',
                              fontSize: 11,
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >
                            Receive
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(t.id, 'cancelled')}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 4,
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              border: '1px solid #fca5a5',
                              fontSize: 11,
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>Archived</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Transfer Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20
        }}>
          <div style={{ width: '100%', maxWidth: 500, backgroundColor: '#fff', borderRadius: 12, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Initiate Inter-Branch Transfer</h2>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>From Branch (Origin)</label>
                  <select
                    value={formData.from_branch_id}
                    onChange={(e) => setFormData({ ...formData, from_branch_id: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>To Branch (Destination)</label>
                  <select
                    value={formData.to_branch_id}
                    onChange={(e) => setFormData({ ...formData, to_branch_id: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Inventory Item</label>
                  <select
                    value={formData.item_id}
                    onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  >
                    {items.map(i => (
                      <option key={i.id} value={i.id}>{i.name} ({i.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Transfer Notes / Urgency</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Urgent replenishment for satellite facility morning OPD"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  {submitting ? 'Dispatching...' : 'Dispatch Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
