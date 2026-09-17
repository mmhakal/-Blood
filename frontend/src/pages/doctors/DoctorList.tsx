import React, { useState, useEffect } from 'react';
import {
  Stethoscope, Plus, Search, Phone, Mail, Building,
  Award, Edit2, CheckCircle2, XCircle, Users, ClipboardList
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export const DoctorList: React.FC = () => {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<any>(null);
  const [viewingDoctor, setViewingDoctor] = useState<any>(null);

  const initialFormState = {
    name: '',
    qualification: '',
    specialization: '',
    registration_number: '',
    clinic_hospital: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    commission_rate: 0,
    status: 'active'
  };
  const [formData, setFormData] = useState(initialFormState);

  const { error, success } = useNotification();

  const loadDoctors = async () => {
    try {
      setLoading(true);
      let url = `/doctors?search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      const res = await api.get(url);
      setDoctors(res);
    } catch (e: any) {
      error(e.message || 'Failed to load doctors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, [search, statusFilter]);

  const openCreateModal = () => {
    setEditingDoctor(null);
    setFormData(initialFormState);
    setShowCreateModal(true);
  };

  const openEditModal = (doc: any) => {
    setEditingDoctor(doc);
    setFormData({
      name: doc.name || '',
      qualification: doc.qualification || '',
      specialization: doc.specialization || '',
      registration_number: doc.registration_number || '',
      clinic_hospital: doc.clinic_hospital || '',
      phone: doc.phone || '',
      email: doc.email || '',
      address: doc.address || '',
      city: doc.city || '',
      state: doc.state || '',
      commission_rate: doc.commission_rate || 0,
      status: doc.status || 'active'
    });
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDoctor) {
        await api.put(`/doctors/${editingDoctor.id}`, formData);
        success(`Doctor '${formData.name}' updated successfully`);
      } else {
        await api.post('/doctors', formData);
        success(`Doctor '${formData.name}' registered successfully`);
      }
      setShowCreateModal(false);
      loadDoctors();
    } catch (err: any) {
      error(err.message || 'Failed to save doctor');
    }
  };

  const handleToggleStatus = async (doc: any) => {
    const newStatus = doc.status === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/doctors/${doc.id}/status`, { status: newStatus });
      success(`Doctor ${doc.name} status updated to ${newStatus}`);
      loadDoctors();
    } catch (err: any) {
      error(err.message || 'Failed to toggle status');
    }
  };

  const openViewDoctor = async (doc: any) => {
    try {
      const res = await api.get(`/doctors/${doc.id}`);
      setViewingDoctor(res);
    } catch (err: any) {
      error(err.message || 'Failed to load doctor profile');
    }
  };

  return (
    <div>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Referring Doctor Master</h1>
          <p style={{ fontSize: 13.5, color: '#64748b' }}>
            Physician relationships, medical registrations, referral metrics, and clinical outreach.
          </p>
        </div>
        <button onClick={openCreateModal} className="btn btn-primary">
          <Plus size={16} />
          <span>Add Referring Doctor</span>
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
            placeholder="Search doctors by Name, Specialization, Clinic/Hospital, Phone, or Registration Number..."
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

      {/* Doctor Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
        {loading ? (
          <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: 40, color: '#64748b' }}>
            Loading doctor master directory...
          </div>
        ) : doctors.length === 0 ? (
          <div className="card" style={{ gridColumn: 'span 3', textAlign: 'center', padding: 40, color: '#64748b' }}>
            No doctors found matching your criteria.
          </div>
        ) : (
          doctors.map((d) => (
            <div key={d.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{d.name}</h3>
                  <div style={{ fontSize: 12, color: '#0284c7', fontWeight: 600 }}>
                    {d.specialization || d.qualification || 'General Physician'}
                  </div>
                </div>
                <span className={`badge badge-${d.status === 'active' ? 'success' : 'normal'}`}>
                  {d.status}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, color: '#475569', marginBottom: 14 }}>
                {d.registration_number && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Award size={14} color="#64748b" />
                    <span>Reg: {d.registration_number}</span>
                  </div>
                )}
                {d.clinic_hospital && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Building size={14} color="#64748b" />
                    <span>{d.clinic_hospital}</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={14} color="#64748b" />
                  <span>{d.phone || 'Phone not set'}</span>
                </div>
                {d.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Mail size={14} color="#64748b" />
                    <span>{d.email}</span>
                  </div>
                )}
              </div>

              {/* Referral Metrics */}
              <div style={{
                display: 'flex', justifyContent: 'space-around',
                padding: '8px 10px', backgroundColor: '#f8fafc',
                borderRadius: 6, marginBottom: 14, textAlign: 'center', fontSize: 12
              }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#0284c7' }}>{d.referral_count || 0}</div>
                  <div style={{ color: '#64748b', fontSize: 11 }}>Orders</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#0284c7' }}>{d.patient_count || 0}</div>
                  <div style={{ color: '#64748b', fontSize: 11 }}>Patients</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#059669' }}>{d.commission_rate || 0}%</div>
                  <div style={{ color: '#64748b', fontSize: 11 }}>Terms</div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                <button onClick={() => openViewDoctor(d)} className="btn btn-outline btn-sm">
                  View Referrals
                </button>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => openEditModal(d)} className="btn btn-outline btn-sm">
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(d)}
                    className={`btn btn-sm ${d.status === 'active' ? 'btn-outline' : 'btn-primary'}`}
                    style={{ fontSize: 11, padding: '3px 8px' }}
                  >
                    {d.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Doctor Modal */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingDoctor ? 'Edit Doctor Record' : 'Register Referring Doctor'}</h2>
              <button onClick={() => setShowCreateModal(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Doctor Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="form-input"
                      placeholder="e.g. Dr. Ananya Roy, MD"
                    />
                  </div>
                  <div>
                    <label className="form-label">Registration Number</label>
                    <input
                      type="text"
                      value={formData.registration_number}
                      onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                      className="form-input"
                      placeholder="e.g. MCI-45892"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Qualification</label>
                    <input
                      type="text"
                      value={formData.qualification}
                      onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                      className="form-input"
                      placeholder="MBBS, MD (Medicine)"
                    />
                  </div>
                  <div>
                    <label className="form-label">Specialization</label>
                    <input
                      type="text"
                      value={formData.specialization}
                      onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                      className="form-input"
                      placeholder="Cardiologist, Diabetologist"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Clinic / Hospital Name</label>
                    <input
                      type="text"
                      value={formData.clinic_hospital}
                      onChange={(e) => setFormData({ ...formData, clinic_hospital: e.target.value })}
                      className="form-input"
                      placeholder="Apollo Spectra Clinic"
                    />
                  </div>
                  <div>
                    <label className="form-label">Commission Rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.commission_rate}
                      onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) || 0 })}
                      className="form-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Phone / Mobile</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="form-input"
                      placeholder="+91 98112 34567"
                    />
                  </div>
                  <div>
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="form-input"
                      placeholder="doctor@hospital.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Clinic Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="form-input"
                    placeholder="Suite 204, City Health Arcade"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingDoctor ? 'Update Doctor' : 'Register Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doctor Details / Referrals Modal */}
      {viewingDoctor && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">{viewingDoctor.doctor.name}</h2>
                <p style={{ fontSize: 12, color: '#64748b' }}>
                  {viewingDoctor.doctor.specialization || viewingDoctor.doctor.qualification} • {viewingDoctor.doctor.clinic_hospital}
                </p>
              </div>
              <button onClick={() => setViewingDoctor(null)} className="close-btn">&times;</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Summary Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="metric-card" style={{ padding: 12 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#0284c7' }}>{viewingDoctor.stats?.total_patients || 0}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Referred Patients</div>
                </div>
                <div className="metric-card" style={{ padding: 12 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#0284c7' }}>{viewingDoctor.stats?.total_orders || 0}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Completed Orders</div>
                </div>
              </div>

              {/* Referred Patients List */}
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Recently Referred Patients</h4>
                {(!viewingDoctor.patients || viewingDoctor.patients.length === 0) ? (
                  <p style={{ fontSize: 13, color: '#64748b' }}>No patients referred yet by this doctor.</p>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Patient ID</th>
                          <th>Name</th>
                          <th>Age / Gender</th>
                          <th>Mobile</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingDoctor.patients.map((p: any) => (
                          <tr key={p.id}>
                            <td><strong>{p.patient_id_code}</strong></td>
                            <td>{p.name}</td>
                            <td>{p.age} • {p.gender}</td>
                            <td>{p.mobile}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setViewingDoctor(null)} className="btn btn-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
