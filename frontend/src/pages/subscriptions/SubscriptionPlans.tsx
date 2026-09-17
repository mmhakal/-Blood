import React, { useState, useEffect } from 'react';
import {
  CreditCard, CheckCircle2, Plus, Shield, Building2,
  Clock, AlertTriangle, Check, RefreshCw, XCircle, ChevronRight
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export const SubscriptionPlans: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [laboratories, setLaboratories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'plans' | 'subscribers'>('plans');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [selectedLab, setSelectedLab] = useState<any>(null);
  const [extendDays, setExtendDays] = useState(30);

  const [newPlan, setNewPlan] = useState({
    name: '',
    code: '',
    description: '',
    price: 3999,
    duration_days: 30,
    max_branches: 3,
    max_users: 10,
    max_patients_per_month: 1500,
    max_reports_per_month: 1500,
    storage_limit_mb: 5120,
    features: ['patients', 'orders', 'results', 'reports', 'billing', 'analytics']
  });

  const { error, success } = useNotification();

  const loadData = async () => {
    try {
      setLoading(true);
      const [pRes, lRes] = await Promise.all([
        api.get('/subscriptions/plans?all=true'),
        api.get('/subscriptions/laboratories')
      ]);
      setPlans(pRes);
      setLaboratories(lRes);
    } catch (e: any) {
      error(e.message || 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/subscriptions/plans', newPlan);
      success(`Subscription plan '${newPlan.name}' created successfully`);
      setShowCreateModal(false);
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to create plan');
    }
  };

  const handleTogglePlan = async (planId: string, currentActive: boolean) => {
    try {
      await api.patch(`/subscriptions/plans/${planId}/status`, { is_active: !currentActive });
      success(`Plan ${!currentActive ? 'Activated' : 'Deactivated'}`);
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to update plan status');
    }
  };

  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLab) return;
    try {
      await api.post('/subscriptions/extend', {
        lab_id: selectedLab.id,
        extension_days: extendDays
      });
      success(`Extended ${selectedLab.name} subscription by ${extendDays} days`);
      setShowExtendModal(false);
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to extend subscription');
    }
  };

  const handleRenew = async (labId: string) => {
    try {
      await api.post('/subscriptions/renew', { lab_id: labId });
      success('Subscription renewed successfully');
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to renew subscription');
    }
  };

  const handleSuspend = async (labId: string) => {
    if (!window.confirm('Suspend this laboratory subscription?')) return;
    try {
      await api.post('/subscriptions/suspend', { lab_id: labId, reason: 'Super Admin manual suspension' });
      success('Laboratory subscription suspended');
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to suspend subscription');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Subscription & Quota Management</h1>
          <p style={{ fontSize: 13.5, color: '#64748b' }}>
            Configure diagnostic SaaS pricing tiers, feature gates, branch quotas, and facility subscriber renewals.
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          <Plus size={16} /> Create Plan Tier
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab('plans')}
          className={`btn ${activeTab === 'plans' ? 'btn-primary' : 'btn-outline'}`}
        >
          <CreditCard size={16} /> Plan Tier Catalog ({plans.length})
        </button>
        <button
          onClick={() => setActiveTab('subscribers')}
          className={`btn ${activeTab === 'subscribers' ? 'btn-primary' : 'btn-outline'}`}
        >
          <Building2 size={16} /> Enrolled Facilities ({laboratories.length})
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading subscription data...</div>
      ) : activeTab === 'plans' ? (
        /* TAB 1: PLANS CATALOG */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {plans.map((p) => {
            const isInactive = p.is_active === 0 || p.is_active === false;
            return (
              <div
                key={p.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  opacity: isInactive ? 0.7 : 1,
                  border: isInactive ? '1px dashed #cbd5e1' : '1px solid #e2e8f0'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <span className="badge badge-primary" style={{ marginBottom: 6 }}>{p.code}</span>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{p.name}</h3>
                  </div>
                  <button
                    onClick={() => handleTogglePlan(p.id, !isInactive)}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: 11, padding: '2px 8px' }}
                  >
                    {isInactive ? 'Enable' : 'Disable'}
                  </button>
                </div>

                <p style={{ fontSize: 12, color: '#64748b', minHeight: 36, marginBottom: 14 }}>{p.description}</p>

                <div style={{ marginBottom: 16 }}>
                  <span style={{ fontSize: 26, fontWeight: 800, color: '#0284c7' }}>₹{p.price.toLocaleString('en-IN')}</span>
                  <span style={{ fontSize: 12, color: '#64748b' }}> / {p.duration_days} days</span>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5, color: '#334155', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={14} color="#059669" />
                    <span>Branches: <strong>{p.max_branches}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={14} color="#059669" />
                    <span>Staff Accounts: <strong>{p.max_users}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={14} color="#059669" />
                    <span>Patients/mo: <strong>{p.max_patients_per_month}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={14} color="#059669" />
                    <span>Storage: <strong>{p.storage_limit_mb} MB</strong></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TAB 2: ACTIVE SUBSCRIBER LABORATORIES */
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Laboratory</th>
                <th>Plan Tier</th>
                <th>Status</th>
                <th>Expiry Date</th>
                <th>Days Remaining</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {laboratories.map((l) => {
                const isExpired = l.subscription_state === 'expired';
                const isExpiring = l.subscription_state === 'expiring_soon';

                return (
                  <tr key={l.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{l.name}</div>
                      <code style={{ fontSize: 11, color: '#0284c7' }}>{l.code}</code>
                    </td>
                    <td>
                      <span className="badge badge-info">{l.plan_name || 'Trial'}</span>
                    </td>
                    <td>
                      <span className={`badge ${l.subscription_state === 'active' ? 'badge-success' : isExpiring ? 'badge-warning' : 'badge-danger'}`}>
                        {l.subscription_state.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {l.subscription_end ? new Date(l.subscription_end).toLocaleDateString() : 'N/A'}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: isExpired ? '#dc2626' : isExpiring ? '#d97706' : '#15803d' }}>
                        {isExpired ? 'Expired' : `${l.days_remaining} day(s)`}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          onClick={() => { setSelectedLab(l); setShowExtendModal(true); }}
                          className="btn btn-outline btn-sm"
                        >
                          + Extend
                        </button>
                        <button
                          onClick={() => handleRenew(l.id)}
                          className="btn btn-secondary btn-sm"
                        >
                          <RefreshCw size={12} /> Renew
                        </button>
                        {l.lab_status === 'active' && (
                          <button
                            onClick={() => handleSuspend(l.id)}
                            className="btn btn-outline btn-sm"
                            style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Create Subscription Plan */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Create New Subscription Plan</h3>
              <button onClick={() => setShowCreateModal(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleCreatePlan} style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Plan Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hospital Diagnostic Core"
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Plan Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HOSPITAL"
                    value={newPlan.code}
                    onChange={(e) => setNewPlan({ ...newPlan, code: e.target.value.toUpperCase() })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={newPlan.price}
                    onChange={(e) => setNewPlan({ ...newPlan, price: parseFloat(e.target.value) || 0 })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration (Days)</label>
                  <input
                    type="number"
                    value={newPlan.duration_days}
                    onChange={(e) => setNewPlan({ ...newPlan, duration_days: parseInt(e.target.value) || 30 })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Branches</label>
                  <input
                    type="number"
                    value={newPlan.max_branches}
                    onChange={(e) => setNewPlan({ ...newPlan, max_branches: parseInt(e.target.value) || 1 })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Staff Users</label>
                  <input
                    type="number"
                    value={newPlan.max_users}
                    onChange={(e) => setNewPlan({ ...newPlan, max_users: parseInt(e.target.value) || 5 })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Patients / mo</label>
                  <input
                    type="number"
                    value={newPlan.max_patients_per_month}
                    onChange={(e) => setNewPlan({ ...newPlan, max_patients_per_month: parseInt(e.target.value) || 500 })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Storage (MB)</label>
                  <input
                    type="number"
                    value={newPlan.storage_limit_mb}
                    onChange={(e) => setNewPlan({ ...newPlan, storage_limit_mb: parseInt(e.target.value) || 1024 })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 10 }}>
                <label className="form-label">Description</label>
                <input
                  type="text"
                  placeholder="Target lab size and core capabilities"
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Extend Subscription */}
      {showExtendModal && selectedLab && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Extend Facility Subscription</h3>
              <button onClick={() => setShowExtendModal(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleExtendSubmit} style={{ padding: 20 }}>
              <p style={{ fontSize: 13.5, color: '#334155', marginBottom: 14 }}>
                Extend active subscription for <strong>{selectedLab.name}</strong> ({selectedLab.code}).
              </p>
              <div className="form-group">
                <label className="form-label">Additional Days</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={extendDays}
                  onChange={(e) => setExtendDays(parseInt(e.target.value) || 30)}
                  className="form-input"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setShowExtendModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Extension
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
