import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Search, CheckCircle2, AlertTriangle, Shield, CreditCard, Users, GitBranch, Eye, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export const LaboratoryList: React.FC = () => {
  const [laboratories, setLaboratories] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Form state including initial Lab Admin creation
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    owner_name: '',
    email: '',
    phone: '',
    address: '',
    city: 'New Delhi',
    state: 'Delhi',
    tax_number: '',
    license_number: '',
    subscription_plan_id: 'plan-basic',
    create_admin: true,
    admin_name: '',
    admin_email: '',
    admin_phone: '',
    admin_password: 'admin123'
  });

  const { error, success } = useNotification();
  const navigate = useNavigate();

  const loadLabs = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);

      const [lRes, pRes] = await Promise.all([
        api.get(`/laboratories?${queryParams.toString()}`),
        api.get('/subscriptions/plans')
      ]);
      setLaboratories(lRes);
      setPlans(pRes);
    } catch (e: any) {
      error(e.message || 'Failed to load laboratories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLabs();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLabs();
  };

  const handleStatusToggle = async (labId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await api.patch(`/laboratories/${labId}/status`, { status: newStatus });
      success(`Laboratory marked as ${newStatus.toUpperCase()}`);
      loadLabs();
    } catch (e: any) {
      error(e.message || 'Failed to update laboratory status');
    }
  };

  const handleDelete = async (labId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to deactivate and archive '${name}'?`)) return;
    try {
      await api.delete(`/laboratories/${labId}`);
      success('Laboratory archived successfully');
      loadLabs();
    } catch (e: any) {
      error(e.message || 'Failed to archive laboratory');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/laboratories', {
        ...formData,
        admin_name: formData.admin_name || formData.owner_name,
        admin_email: formData.admin_email || formData.email,
      });

      success(`Laboratory '${formData.name}' provisioned successfully!`);
      if (res.admin_user) {
        success(`Lab Admin account '${res.admin_user.email}' created with password: admin123`);
      }
      setShowModal(false);
      setFormData({
        name: '',
        code: '',
        owner_name: '',
        email: '',
        phone: '',
        address: '',
        city: 'New Delhi',
        state: 'Delhi',
        tax_number: '',
        license_number: '',
        subscription_plan_id: 'plan-basic',
        create_admin: true,
        admin_name: '',
        admin_email: '',
        admin_phone: '',
        admin_password: 'admin123'
      });
      loadLabs();
    } catch (err: any) {
      error(err.message || 'Failed to create laboratory');
    }
  };

  return (
    <div>
      {/* Header & Provision Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Laboratory Multi-Tenant Instances</h1>
          <p style={{ fontSize: 13.5, color: '#64748b' }}>
            Enterprise multi-tenant isolation, facility provisioning, and subscription tier allocation.
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus size={16} />
          <span>Provision New Laboratory</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: '12px 16px',
        borderRadius: 8,
        border: '1px solid #e2e8f0',
        marginBottom: 16
      }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, maxWidth: 450 }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 10 }} />
            <input
              type="text"
              placeholder="Search by laboratory name, code, city, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: 34, height: 36, fontSize: 13 }}
            />
          </div>
          <button type="submit" className="btn btn-secondary btn-sm" style={{ height: 36 }}>
            Search
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-input"
            style={{ height: 36, fontSize: 13, width: 140 }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended</option>
            <option value="deactivated">Deactivated</option>
          </select>
        </div>
      </div>

      {/* Laboratories Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Laboratory & Code</th>
              <th>Owner & Contact</th>
              <th>Location</th>
              <th>Branches / Staff</th>
              <th>Subscription Plan</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>
                  Loading laboratory records...
                </td>
              </tr>
            ) : laboratories.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                  No laboratory facilities match the search criteria.
                </td>
              </tr>
            ) : (
              laboratories.map((lab) => {
                const expiry = lab.subscription_end ? new Date(lab.subscription_end) : null;
                const isExpired = expiry ? new Date() > expiry : false;

                return (
                  <tr key={lab.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          backgroundColor: lab.status === 'active' ? '#e0f2fe' : '#fee2e2',
                          color: lab.status === 'active' ? '#0284c7' : '#dc2626',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700
                        }}>
                          <Building2 size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{lab.name}</div>
                          <code style={{ fontSize: 11, color: '#0284c7' }}>{lab.code}</code>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{lab.owner_name}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{lab.email}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>{lab.city || 'N/A'}, {lab.state || 'India'}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span className="badge badge-info" title="Authorized Branches">
                          <GitBranch size={12} style={{ marginRight: 3 }} /> {lab.branch_count || 1}
                        </span>
                        <span className="badge badge-secondary" title="Diagnostic Staff">
                          <Users size={12} style={{ marginRight: 3 }} /> {lab.user_count || 0}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div>
                        <span className="badge badge-info">{lab.plan_name || 'Standard'}</span>
                        <div style={{ fontSize: 10.5, color: isExpired ? '#dc2626' : '#64748b', marginTop: 2 }}>
                          {expiry ? (isExpired ? 'Expired' : `Expires: ${expiry.toLocaleDateString()}`) : 'Lifetime'}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${lab.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                        {lab.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          onClick={() => navigate(`/laboratories/${lab.id}`)}
                          className="btn btn-outline btn-sm"
                          title="View Details"
                        >
                          <Eye size={13} /> View
                        </button>
                        <button
                          onClick={() => handleStatusToggle(lab.id, lab.status)}
                          className={`btn btn-sm ${lab.status === 'active' ? 'btn-outline' : 'btn-primary'}`}
                          style={lab.status === 'active' ? { color: '#b45309', borderColor: '#fde68a' } : { backgroundColor: '#16a34a' }}
                        >
                          {lab.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDelete(lab.id, lab.name)}
                          className="btn btn-outline btn-sm"
                          style={{ color: '#dc2626', borderColor: '#fee2e2' }}
                          title="Archive"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Provision Laboratory & Optional Lab Admin */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={20} color="#0284c7" />
                Provision Diagnostic Laboratory Tenant
              </h3>
              <button onClick={() => setShowModal(false)} className="close-btn">&times;</button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: 22, maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0369a1', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                1. Institutional Profile
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Laboratory Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Metro Reference Labs"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unique Code (Uppercase) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. METRO-LAB"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Managing Director / Owner *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Arthur Bell"
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Official Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. admin@metrolabs.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">City & State</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input
                      type="text"
                      placeholder="City"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="form-input"
                    />
                    <input
                      type="text"
                      placeholder="State"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0369a1', margin: '18px 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                2. Subscription Tier Selection
              </div>
              <div className="form-group">
                <label className="form-label">Assigned Subscription Plan</label>
                <select
                  value={formData.subscription_plan_id}
                  onChange={(e) => setFormData({ ...formData, subscription_plan_id: e.target.value })}
                  className="form-input"
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code}) - ₹{p.price}/mo ({p.max_branches} Branches, {p.max_users} Staff)
                    </option>
                  ))}
                </select>
              </div>

              {/* Section 3: Initial Lab Admin Provisioning */}
              <div style={{
                marginTop: 18,
                padding: 14,
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13.5, color: '#0f172a', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.create_admin}
                    onChange={(e) => setFormData({ ...formData, create_admin: e.target.checked })}
                    style={{ width: 16, height: 16 }}
                  />
                  <span>Provision Initial Lab Admin Account</span>
                </label>
                <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 12px 24px' }}>
                  Creates an institutional administrator who can log in immediately to configure staff, tests, and branches.
                </p>

                {formData.create_admin && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingLeft: 8 }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: 12 }}>Admin Full Name</label>
                      <input
                        type="text"
                        placeholder={formData.owner_name || 'Admin Name'}
                        value={formData.admin_name}
                        onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: 12 }}>Admin Login Email</label>
                      <input
                        type="email"
                        placeholder={formData.email || 'admin@lab.com'}
                        value={formData.admin_email}
                        onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label" style={{ fontSize: 12 }}>Initial Password</label>
                      <input
                        type="text"
                        value={formData.admin_password}
                        onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                        className="form-input"
                      />
                      <span style={{ fontSize: 11, color: '#059669', display: 'block', marginTop: 3 }}>
                        Default: <code>admin123</code> (Universal system default for easy verification)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Provision Facility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
