import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Building2, GitBranch, Users, CreditCard, Shield, Activity,
  ArrowLeft, CheckCircle2, AlertTriangle, Clock, MapPin, Mail, Phone,
  FileText, Plus, RefreshCw, Lock
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export const LaboratoryDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { error, success } = useNotification();

  const [data, setData] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [extendDays, setExtendDays] = useState(30);

  const fetchLabDetails = async () => {
    try {
      setLoading(true);
      const [labRes, plansRes] = await Promise.all([
        api.get(`/laboratories/${id}`),
        api.get('/subscriptions/plans')
      ]);
      setData(labRes);
      setPlans(plansRes);
      if (labRes.lab?.subscription_plan_id) {
        setSelectedPlanId(labRes.lab.subscription_plan_id);
      }
    } catch (err: any) {
      error(err.message || 'Failed to load laboratory details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabDetails();
  }, [id]);

  const handleStatusToggle = async (newStatus: string) => {
    try {
      await api.patch(`/laboratories/${id}/status`, { status: newStatus });
      success(`Laboratory status changed to ${newStatus.toUpperCase()}`);
      fetchLabDetails();
    } catch (err: any) {
      error(err.message || 'Failed to update status');
    }
  };

  const handleAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/subscriptions/assign', {
        lab_id: id,
        plan_id: selectedPlanId,
        duration_days: extendDays
      });
      success('Subscription plan successfully updated');
      setShowAssignModal(false);
      fetchLabDetails();
    } catch (err: any) {
      error(err.message || 'Failed to update subscription');
    }
  };

  const handleExtend = async (days: number) => {
    try {
      await api.post('/subscriptions/extend', {
        lab_id: id,
        extension_days: days
      });
      success(`Subscription extended by ${days} days`);
      fetchLabDetails();
    } catch (err: any) {
      error(err.message || 'Failed to extend subscription');
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading laboratory information...</div>;
  }

  if (!data?.lab) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h3>Laboratory Not Found</h3>
        <button onClick={() => navigate('/laboratories')} className="btn btn-secondary" style={{ marginTop: 16 }}>
          <ArrowLeft size={16} /> Back to Laboratories
        </button>
      </div>
    );
  }

  const { lab, branches, staff, subscription_history, stats } = data;
  const isSuspended = lab.status === 'suspended';
  const expiryDate = lab.subscription_end ? new Date(lab.subscription_end) : null;
  const isExpired = expiryDate ? new Date() > expiryDate : false;
  const daysLeft = expiryDate ? Math.ceil((expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : 0;

  return (
    <div>
      {/* Top Navigation & Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={() => navigate('/laboratories')} className="btn btn-outline btn-sm">
          <ArrowLeft size={14} /> Back to Laboratories
        </button>
        <span style={{ color: '#94a3b8' }}>/</span>
        <span style={{ fontSize: 13.5, color: '#64748b' }}>Facility Overview</span>
        <span style={{ color: '#94a3b8' }}>/</span>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a' }}>{lab.name}</span>
      </div>

      {/* Main Header Banner */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: 24,
        marginBottom: 24,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{
            width: 60,
            height: 60,
            borderRadius: 12,
            backgroundColor: isSuspended ? '#fee2e2' : '#e0f2fe',
            color: isSuspended ? '#dc2626' : '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <Building2 size={32} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{lab.name}</h1>
              <span className="badge badge-info" style={{ fontFamily: 'monospace', fontSize: 12 }}>
                {lab.code}
              </span>
              <span className={`badge ${lab.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                {lab.status.toUpperCase()}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, fontSize: 13, color: '#64748b' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Users size={14} /> Owner: <strong>{lab.owner_name}</strong>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Mail size={14} /> {lab.email}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Phone size={14} /> {lab.phone || 'N/A'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={14} /> {lab.city || 'N/A'}, {lab.state || 'India'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: 10 }}>
          {lab.status === 'active' ? (
            <button onClick={() => handleStatusToggle('suspended')} className="btn btn-outline" style={{ color: '#dc2626', borderColor: '#fca5a5' }}>
              <AlertTriangle size={15} /> Suspend Facility
            </button>
          ) : (
            <button onClick={() => handleStatusToggle('active')} className="btn btn-primary" style={{ backgroundColor: '#16a34a' }}>
              <CheckCircle2 size={15} /> Activate Facility
            </button>
          )}
          <button onClick={() => setShowAssignModal(true)} className="btn btn-primary">
            <CreditCard size={15} /> Manage Subscription
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
            <GitBranch size={22} />
          </div>
          <div>
            <div className="metric-value">{branches.length}</div>
            <div className="metric-label">Authorized Branches</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>
            <Users size={22} />
          </div>
          <div>
            <div className="metric-value">{staff.length}</div>
            <div className="metric-label">Staff Users</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>
            <Activity size={22} />
          </div>
          <div>
            <div className="metric-value">{stats?.total_patients || 0}</div>
            <div className="metric-label">Patients Registered</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#ede9fe', color: '#7c3aed' }}>
            <FileText size={22} />
          </div>
          <div>
            <div className="metric-value">{stats?.total_orders || 0}</div>
            <div className="metric-label">Diagnostic Orders</div>
          </div>
        </div>
      </div>

      {/* 2-Column Details: Subscription Status & Facility Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Subscription Card */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CreditCard size={18} color="#0284c7" />
              Active Subscription Tier
            </h3>
            <span className={`badge ${isExpired ? 'badge-danger' : daysLeft <= 15 ? 'badge-warning' : 'badge-success'}`}>
              {isExpired ? 'EXPIRED' : `${daysLeft} Days Left`}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, backgroundColor: '#f8fafc', padding: 14, borderRadius: 8, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Plan Name</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{lab.plan_name || 'Standard Plan'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Plan Price</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#16a34a' }}>₹{(lab.plan_price || 0).toLocaleString('en-IN')}/mo</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Start Date</div>
              <div style={{ fontSize: 13, color: '#334155' }}>{lab.subscription_start ? new Date(lab.subscription_start).toLocaleDateString() : 'N/A'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Expiry Date</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: isExpired ? '#dc2626' : '#334155' }}>
                {expiryDate ? expiryDate.toLocaleDateString() : 'Lifetime'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => handleExtend(30)} className="btn btn-outline btn-sm">
              + Extend 30 Days
            </button>
            <button onClick={() => handleExtend(90)} className="btn btn-outline btn-sm">
              + Extend 90 Days
            </button>
            <button onClick={() => setShowAssignModal(true)} className="btn btn-secondary btn-sm">
              Change Plan
            </button>
          </div>
        </div>

        {/* Legal & Profile Card */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={18} color="#0284c7" />
            Institutional Compliance & Details
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
              <span style={{ color: '#64748b' }}>GST / Tax Number</span>
              <strong>{lab.tax_number || '07AAAAA0000A1Z5'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
              <span style={{ color: '#64748b' }}>License / NABL Accreditation</span>
              <strong>{lab.license_number || 'NABL-MED-2026 / ISO 15189'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
              <span style={{ color: '#64748b' }}>Address</span>
              <span style={{ maxWidth: 220, textAlign: 'right' }}>{lab.address || 'Medical Enclave, Central Hub'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
              <span style={{ color: '#64748b' }}>Tenant ID Code</span>
              <code style={{ fontSize: 12 }}>{lab.id}</code>
            </div>
          </div>
        </div>
      </div>

      {/* Branches Table */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <GitBranch size={18} color="#0284c7" />
            Branches & Sample Collection Hubs ({branches.length})
          </h3>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Branch Name</th>
              <th>Code</th>
              <th>Manager</th>
              <th>Working Hours</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b: any) => (
              <tr key={b.id}>
                <td><strong>{b.name}</strong></td>
                <td><span className="badge badge-info">{b.code}</span></td>
                <td>{b.manager_name || 'Assigned Manager'}</td>
                <td>{b.working_hours || '24x7 Operations'}</td>
                <td>
                  <span className={`badge ${b.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                    {b.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Staff Table */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={18} color="#0284c7" />
          Authorized Diagnostic Staff ({staff.length})
        </h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Assigned Branch</th>
              <th>Last Login</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((u: any) => (
              <tr key={u.id}>
                <td><strong>{u.name}</strong></td>
                <td>{u.email}</td>
                <td><span className="badge badge-info">{u.role_name || u.role_code}</span></td>
                <td>{u.branch_name || 'All Branches'}</td>
                <td>{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}</td>
                <td>
                  <span className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                    {u.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: Assign / Upgrade Subscription */}
      {showAssignModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>Assign / Upgrade Subscription</h3>
              <button onClick={() => setShowAssignModal(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleAssignPlan} style={{ padding: 20 }}>
              <div className="form-group">
                <label className="form-label">Subscription Tier</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="form-input"
                  required
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (₹{p.price}/month - {p.max_branches} branches, {p.max_users} users)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Duration (Days)</label>
                <input
                  type="number"
                  min="7"
                  max="365"
                  value={extendDays}
                  onChange={(e) => setExtendDays(parseInt(e.target.value) || 30)}
                  className="form-input"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setShowAssignModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save & Apply Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
