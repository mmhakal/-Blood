import React, { useState, useEffect } from 'react';
import {
  GitBranch, Plus, Search, Building2, Phone, Mail, Clock,
  User, ShieldCheck, Edit2, CheckCircle2, XCircle, Users,
  MapPin, FileText, ChevronRight, X
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

export const BranchList: React.FC = () => {
  const [branches, setBranches] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [viewingBranch, setViewingBranch] = useState<any>(null);
  const [branchStaffModal, setBranchStaffModal] = useState<any>(null);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isPrimaryAssign, setIsPrimaryAssign] = useState(false);

  // Form State
  const initialFormState = {
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    phone: '',
    alternate_phone: '',
    email: '',
    manager_name: '',
    working_hours: '7:00 AM - 9:00 PM',
    tax_number: '',
    registration_number: '',
    logo_url: '',
    report_header: '',
    report_footer: '',
    status: 'active'
  };
  const [formData, setFormData] = useState(initialFormState);

  const { error, success } = useNotification();
  const { user } = useAuth();

  const loadBranches = async () => {
    try {
      setLoading(true);
      let url = `/branches?search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      const res = await api.get(url);
      setBranches(res);
    } catch (e: any) {
      error(e.message || 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, [search, statusFilter]);

  const openCreateModal = () => {
    setEditingBranch(null);
    setFormData(initialFormState);
    setShowCreateModal(true);
  };

  const openEditModal = (branch: any) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name || '',
      code: branch.code || '',
      address: branch.address || '',
      city: branch.city || '',
      state: branch.state || '',
      country: branch.country || 'India',
      pincode: branch.pincode || '',
      phone: branch.phone || '',
      alternate_phone: branch.alternate_phone || '',
      email: branch.email || '',
      manager_name: branch.manager_name || '',
      working_hours: branch.working_hours || '7:00 AM - 9:00 PM',
      tax_number: branch.tax_number || '',
      registration_number: branch.registration_number || '',
      logo_url: branch.logo_url || '',
      report_header: branch.report_header || '',
      report_footer: branch.report_footer || '',
      status: branch.status || 'active'
    });
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBranch) {
        await api.put(`/branches/${editingBranch.id}`, formData);
        success(`Branch '${formData.name}' updated successfully`);
      } else {
        await api.post('/branches', formData);
        success(`Branch '${formData.name}' created successfully`);
      }
      setShowCreateModal(false);
      loadBranches();
    } catch (err: any) {
      error(err.message || 'Failed to save branch');
    }
  };

  const handleToggleStatus = async (branch: any) => {
    const newStatus = branch.status === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/branches/${branch.id}/status`, { status: newStatus });
      success(`Branch ${branch.name} is now ${newStatus}`);
      loadBranches();
    } catch (err: any) {
      error(err.message || 'Failed to toggle status');
    }
  };

  const openViewDetails = async (branch: any) => {
    try {
      const res = await api.get(`/branches/${branch.id}`);
      setViewingBranch(res);
    } catch (err: any) {
      error(err.message || 'Failed to load branch details');
    }
  };

  const openStaffModal = async (branch: any) => {
    try {
      const [staffRes, allUsersRes] = await Promise.all([
        api.get(`/branches/${branch.id}/users`),
        api.get('/users')
      ]);
      setBranchStaffModal({ branch, staff: staffRes });
      setAvailableUsers(allUsersRes);
    } catch (err: any) {
      error(err.message || 'Failed to load staff list');
    }
  };

  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !branchStaffModal) return;

    try {
      await api.post(`/branches/${branchStaffModal.branch.id}/users`, {
        user_id: selectedUserId,
        is_primary: isPrimaryAssign
      });
      success('Staff member assigned to branch');
      const updatedStaff = await api.get(`/branches/${branchStaffModal.branch.id}/users`);
      setBranchStaffModal({ ...branchStaffModal, staff: updatedStaff });
      setSelectedUserId('');
      setIsPrimaryAssign(false);
      loadBranches();
    } catch (err: any) {
      error(err.message || 'Failed to assign staff');
    }
  };

  const handleUnassignStaff = async (userId: string) => {
    if (!branchStaffModal) return;
    try {
      await api.delete(`/branches/${branchStaffModal.branch.id}/users/${userId}`);
      success('Staff unassigned from branch');
      const updatedStaff = await api.get(`/branches/${branchStaffModal.branch.id}/users`);
      setBranchStaffModal({ ...branchStaffModal, staff: updatedStaff });
      loadBranches();
    } catch (err: any) {
      error(err.message || 'Failed to unassign staff');
    }
  };

  return (
    <div>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Laboratory Branches & Collection Centers</h1>
          <p style={{ fontSize: 13.5, color: '#64748b' }}>
            Multi-branch infrastructure, phlebotomy centers, and staff operational assignments.
          </p>
        </div>
        <button onClick={openCreateModal} className="btn btn-primary">
          <Plus size={16} />
          <span>Add New Branch</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="card" style={{ marginBottom: 20, padding: 14, display: 'flex', gap: 14 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 11 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search branches by Name, Branch Code, or City..."
            className="form-input"
            style={{ paddingLeft: 40, height: 40 }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-input"
          style={{ width: 160, height: 40 }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Branch Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
        {loading ? (
          <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: 40, color: '#64748b' }}>
            Loading laboratory branches...
          </div>
        ) : branches.length === 0 ? (
          <div className="card" style={{ gridColumn: 'span 2', textAlign: 'center', padding: 40, color: '#64748b' }}>
            No branches found matching your search.
          </div>
        ) : (
          branches.map((b) => (
            <div key={b.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <span className="badge badge-primary" style={{ marginBottom: 6, display: 'inline-block' }}>{b.code}</span>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{b.name}</h3>
                </div>
                <span className={`badge badge-${b.status === 'active' ? 'success' : 'normal'}`}>
                  {b.status}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#475569', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={14} color="#64748b" />
                  <span>{b.address || 'Address not specified'}{b.city ? `, ${b.city}` : ''}{b.state ? ` (${b.state})` : ''}</span>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Phone size={14} color="#64748b" />
                    <span>{b.phone || 'N/A'}</span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User size={14} color="#64748b" />
                    <span>Manager: {b.manager_name || 'Unassigned'}</span>
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={14} color="#64748b" />
                  <span>Working Hours: {b.working_hours || '7:00 AM - 9:00 PM'}</span>
                </div>
                {b.tax_number && (
                  <div style={{ fontSize: 11.5, color: '#64748b' }}>
                    GST/Tax: {b.tax_number}
                  </div>
                )}
              </div>

              {/* Branch Metrics Counters */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
                padding: '10px 12px', backgroundColor: '#f8fafc',
                borderRadius: 6, marginBottom: 16, textAlign: 'center'
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0284c7' }}>{b.user_count || 0}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Staff</div>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0284c7' }}>{b.patient_count || 0}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Patients</div>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0284c7' }}>{b.order_count || 0}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Orders</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openViewDetails(b)} className="btn btn-outline btn-sm">
                    Details
                  </button>
                  <button onClick={() => openStaffModal(b)} className="btn btn-secondary btn-sm">
                    <Users size={14} />
                    <span>Staff ({b.user_count || 0})</span>
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openEditModal(b)} className="btn btn-outline btn-sm">
                    <Edit2 size={13} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleToggleStatus(b)}
                    className={`btn btn-sm ${b.status === 'active' ? 'btn-outline' : 'btn-primary'}`}
                  >
                    {b.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Branch Modal */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingBranch ? 'Edit Laboratory Branch' : 'Add New Laboratory Branch'}</h2>
              <button onClick={() => setShowCreateModal(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Branch Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="form-input"
                      placeholder="e.g. Apex South Metropolis Center"
                    />
                  </div>
                  <div>
                    <label className="form-label">Branch Code *</label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="form-input"
                      placeholder="e.g. DEL-STH"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Branch Manager Name</label>
                    <input
                      type="text"
                      value={formData.manager_name}
                      onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                      className="form-input"
                      placeholder="e.g. Dr. Suresh Kumar"
                    />
                  </div>
                  <div>
                    <label className="form-label">Branch Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="form-input"
                      placeholder="branch@medilabs.com"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Phone Number</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="form-input"
                      placeholder="+91 11 2689 4400"
                    />
                  </div>
                  <div>
                    <label className="form-label">Alternate Phone</label>
                    <input
                      type="text"
                      value={formData.alternate_phone}
                      onChange={(e) => setFormData({ ...formData, alternate_phone: e.target.value })}
                      className="form-input"
                      placeholder="+91 11 2689 4401"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Physical Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="form-input"
                    placeholder="Plot 42, Health Arcade, Ring Road"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="form-input"
                      placeholder="New Delhi"
                    />
                  </div>
                  <div>
                    <label className="form-label">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="form-input"
                      placeholder="Delhi"
                    />
                  </div>
                  <div>
                    <label className="form-label">Pincode</label>
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className="form-input"
                      placeholder="110017"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">GST / Tax Number</label>
                    <input
                      type="text"
                      value={formData.tax_number}
                      onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                      className="form-input"
                      placeholder="07AAAAA0000A1Z5"
                    />
                  </div>
                  <div>
                    <label className="form-label">Registration / License Info</label>
                    <input
                      type="text"
                      value={formData.registration_number}
                      onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                      className="form-input"
                      placeholder="DEL/CLINIC/2026/089"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Working Hours</label>
                  <input
                    type="text"
                    value={formData.working_hours}
                    onChange={(e) => setFormData({ ...formData, working_hours: e.target.value })}
                    className="form-input"
                    placeholder="7:00 AM - 9:00 PM (Monday - Sunday)"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Report Header Text</label>
                    <input
                      type="text"
                      value={formData.report_header}
                      onChange={(e) => setFormData({ ...formData, report_header: e.target.value })}
                      className="form-input"
                      placeholder="Header info on printed test reports"
                    />
                  </div>
                  <div>
                    <label className="form-label">Report Footer Text</label>
                    <input
                      type="text"
                      value={formData.report_footer}
                      onChange={(e) => setFormData({ ...formData, report_footer: e.target.value })}
                      className="form-input"
                      placeholder="Footer helpline on reports"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingBranch ? 'Update Branch' : 'Save Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Branch Details Drawer / Modal */}
      {viewingBranch && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <div>
                <span className="badge badge-primary">{viewingBranch.branch.code}</span>
                <h2 className="modal-title" style={{ marginTop: 4 }}>{viewingBranch.branch.name}</h2>
              </div>
              <button onClick={() => setViewingBranch(null)} className="close-btn">&times;</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Stats overview */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, textAlign: 'center' }}>
                <div className="metric-card" style={{ padding: 12 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#0284c7' }}>{viewingBranch.stats?.patient_count || 0}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Registered Patients</div>
                </div>
                <div className="metric-card" style={{ padding: 12 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#0284c7' }}>{viewingBranch.stats?.order_count || 0}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Diagnostic Orders</div>
                </div>
                <div className="metric-card" style={{ padding: 12 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#059669' }}>₹{(viewingBranch.stats?.total_revenue || 0).toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Branch Collections</div>
                </div>
              </div>

              {/* Information Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13, backgroundColor: '#f8fafc', padding: 14, borderRadius: 6 }}>
                <div><strong>Address:</strong> {viewingBranch.branch.address || 'N/A'}</div>
                <div><strong>City / State:</strong> {viewingBranch.branch.city || 'N/A'}, {viewingBranch.branch.state || ''}</div>
                <div><strong>Phone:</strong> {viewingBranch.branch.phone || 'N/A'}</div>
                <div><strong>Alternate Phone:</strong> {viewingBranch.branch.alternate_phone || 'N/A'}</div>
                <div><strong>Email:</strong> {viewingBranch.branch.email || 'N/A'}</div>
                <div><strong>Manager:</strong> {viewingBranch.branch.manager_name || 'N/A'}</div>
                <div><strong>GST / Tax:</strong> {viewingBranch.branch.tax_number || 'N/A'}</div>
                <div><strong>Registration:</strong> {viewingBranch.branch.registration_number || 'N/A'}</div>
                <div><strong>Hours:</strong> {viewingBranch.branch.working_hours || 'N/A'}</div>
                <div><strong>Status:</strong> <span className={`badge badge-${viewingBranch.branch.status === 'active' ? 'success' : 'normal'}`}>{viewingBranch.branch.status}</span></div>
              </div>

              {/* Assigned Staff Roster */}
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>
                  Assigned Staff Roster ({viewingBranch.staff?.length || 0})
                </h4>
                {(!viewingBranch.staff || viewingBranch.staff.length === 0) ? (
                  <p style={{ fontSize: 13, color: '#64748b' }}>No staff members currently assigned to this branch.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {viewingBranch.staff.map((s: any) => (
                      <div key={s.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6
                      }}>
                        <div>
                          <strong style={{ fontSize: 13, color: '#0f172a' }}>{s.name}</strong>
                          <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>({s.role_name || s.role_code})</span>
                          {s.is_primary ? <span className="badge badge-primary" style={{ marginLeft: 8, fontSize: 10 }}>Primary Hub</span> : null}
                        </div>
                        <span style={{ fontSize: 12, color: '#64748b' }}>{s.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setViewingBranch(null)} className="btn btn-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Branch Staff Assignment Modal */}
      {branchStaffModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Branch Staff Assignment</h2>
                <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{branchStaffModal.branch.name} ({branchStaffModal.branch.code})</p>
              </div>
              <button onClick={() => setBranchStaffModal(null)} className="close-btn">&times;</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Form to assign staff */}
              <form onSubmit={handleAssignStaff} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', backgroundColor: '#f8fafc', padding: 12, borderRadius: 6 }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: 12 }}>Select Staff Member</label>
                  <select
                    required
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="form-input"
                  >
                    <option value="">-- Choose User --</option>
                    {availableUsers.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role_name || u.role_code}) - {u.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <input
                    type="checkbox"
                    id="primary_branch_check"
                    checked={isPrimaryAssign}
                    onChange={(e) => setIsPrimaryAssign(e.target.checked)}
                  />
                  <label htmlFor="primary_branch_check" style={{ fontSize: 12, color: '#475569', cursor: 'pointer' }}>
                    Primary
                  </label>
                </div>
                <button type="submit" className="btn btn-primary btn-sm" style={{ height: 38 }}>
                  <Plus size={14} />
                  <span>Assign</span>
                </button>
              </form>

              {/* Current assigned staff */}
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Currently Assigned Users</h4>
                {(!branchStaffModal.staff || branchStaffModal.staff.length === 0) ? (
                  <p style={{ fontSize: 13, color: '#64748b' }}>No users assigned to this branch.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {branchStaffModal.staff.map((u: any) => (
                      <div key={u.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6
                      }}>
                        <div>
                          <strong style={{ fontSize: 13, color: '#0f172a' }}>{u.name}</strong>
                          <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>({u.role_name || u.role_code})</span>
                          {u.is_primary ? <span className="badge badge-primary" style={{ marginLeft: 8, fontSize: 10 }}>Primary</span> : null}
                        </div>
                        <button
                          onClick={() => handleUnassignStaff(u.id)}
                          className="btn btn-outline btn-sm"
                          style={{ color: '#ef4444', borderColor: '#fca5a5', padding: '2px 8px', fontSize: 11 }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setBranchStaffModal(null)} className="btn btn-primary">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
