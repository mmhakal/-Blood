import React, { useState, useEffect } from 'react';
import { Users, UserPlus, ShieldCheck, Mail, Phone, Building2 } from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export const UserList: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role_id: '',
    branch_id: ''
  });

  const { error, success } = useNotification();

  const loadData = async () => {
    try {
      setLoading(true);
      const [uRes, rRes, bRes] = await Promise.all([
        api.get('/users'),
        api.get('/users/roles'),
        api.get('/branches')
      ]);
      setUsers(uRes);
      setRoles(rRes.roles || []);
      setBranches(bRes);
      if (rRes.roles?.length > 0 && !formData.role_id) {
        setFormData(prev => ({ ...prev, role_id: rRes.roles[0].id }));
      }
    } catch (e: any) {
      error(e.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', formData);
      success(`User ${formData.name} added successfully`);
      setShowModal(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        role_id: roles[0]?.id || '',
        branch_id: ''
      });
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to add user');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Staff & Role Access Control</h1>
          <p style={{ fontSize: 13.5, color: '#64748b' }}>
            Manage laboratory staff credentials, role-based access permissions, and branch allocations.
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <UserPlus size={16} />
          <span>Add Staff Member</span>
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Staff Name</th>
              <th>Role & Clearance</th>
              <th>Assigned Branch</th>
              <th>Contact Info</th>
              <th>Last Active</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30 }}>Loading staff members...</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{u.email}</div>
                  </td>
                  <td>
                    <span className="badge badge-primary">{u.role_name || u.role_code}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12.5 }}>{u.branch_name || 'All Branches'}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12.5 }}>{u.phone || '-'}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: 11.5, color: '#64748b' }}>
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-normal">{u.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="card-title">
                <UserPlus size={18} color="#0284c7" />
                Add Staff Member
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                &times;
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Jennifer Cole"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="staff@apexlabs.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Assigned Role *</label>
                    <select
                      value={formData.role_id}
                      onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                      className="form-select"
                    >
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Primary Branch</label>
                    <select
                      value={formData.branch_id}
                      onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                      className="form-select"
                    >
                      <option value="">All Branches</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 00000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
