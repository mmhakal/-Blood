import React, { useState, useEffect } from 'react';
import {
  Search, UserPlus, FileText, Phone, Calendar, ArrowRight,
  UserCheck, Stethoscope, Download, Filter, MapPin, AlertCircle,
  Receipt, Clock, CheckCircle2, ChevronLeft, ChevronRight, X, Activity
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { ReportPreviewModal } from '../../components/clinical/ReportPreviewModal';

export const PatientList: React.FC = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination State
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Modals & Profile State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientProfile, setPatientProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState('overview');
  const [previewReportId, setPreviewReportId] = useState<string | null>(null);

  // New Patient Form
  const initialForm = {
    name: '',
    age: '',
    age_unit: 'years',
    dob: '',
    gender: 'Male',
    mobile: '',
    alternate_mobile: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    referring_doctor_id: '',
    clinic_hospital: '',
    blood_group: '',
    emergency_contact: '',
    remarks: '',
    branch_id: ''
  };
  const [formData, setFormData] = useState(initialForm);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const { error, success } = useNotification();

  const loadPatients = async () => {
    try {
      setLoading(true);
      let query = `/patients?page=${currentPage}&limit=20`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (branchFilter) query += `&branch_id=${branchFilter}`;
      if (doctorFilter) query += `&doctor_id=${doctorFilter}`;
      if (genderFilter) query += `&gender=${genderFilter}`;
      if (fromDate) query += `&from_date=${fromDate}`;
      if (toDate) query += `&to_date=${toDate}`;

      const res = await api.get(query);
      if (res.data) {
        setPatients(res.data);
        setTotalPages(res.pagination?.total_pages || 1);
        setTotalRecords(res.pagination?.total_records || 0);
      } else {
        setPatients(res);
      }
    } catch (e: any) {
      error(e.message || 'Failed to fetch patients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, [currentPage, search, branchFilter, doctorFilter, genderFilter, fromDate, toDate]);

  useEffect(() => {
    async function loadMasters() {
      try {
        const [docsRes, branchRes] = await Promise.all([
          api.get('/doctors'),
          api.get('/branches')
        ]);
        setDoctors(docsRes);
        setBranches(branchRes);
        if (branchRes.length > 0 && !formData.branch_id) {
          setFormData(prev => ({ ...prev, branch_id: branchRes[0].id }));
        }
      } catch (e) {
        // ignore
      }
    }
    loadMasters();
  }, []);

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData({ ...formData, mobile: val });
    if (val.length >= 10) {
      const match = patients.find(p => p.mobile === val);
      if (match) {
        setDuplicateWarning(`Warning: Mobile ${val} is already registered under '${match.name}' (${match.patient_id_code})`);
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/patients', {
        ...formData,
        age: parseInt(formData.age, 10) || 0
      });
      success(`Patient registered successfully: ${res.patient_id_code}`);
      setShowRegisterModal(false);
      setFormData(initialForm);
      setDuplicateWarning(null);
      loadPatients();
    } catch (err: any) {
      error(err.message || 'Failed to register patient');
    }
  };

  const handleViewProfile = async (patient: any) => {
    setSelectedPatient(patient);
    setActiveProfileTab('overview');
    setProfileLoading(true);
    try {
      const profile = await api.get(`/patients/${patient.id}`);
      setPatientProfile(profile);
    } catch (e: any) {
      error(e.message || 'Failed to load patient profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/patients/export');
      const blob = new Blob([res], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `patients_registry_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      success('Patient registry exported successfully');
    } catch (err: any) {
      error(err.message || 'Export failed');
    }
  };

  return (
    <div>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Patient Master Directory</h1>
          <p style={{ fontSize: 13.5, color: '#64748b' }}>
            Comprehensive demographic records, diagnostic visit timelines, clinical trend tracking, and ledger.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleExportCSV} className="btn btn-outline">
            <Download size={15} />
            <span>Export CSV</span>
          </button>
          <button onClick={() => setShowRegisterModal(true)} className="btn btn-primary">
            <UserPlus size={16} />
            <span>Register New Patient</span>
          </button>
        </div>
      </div>

      {/* Global Search & Multi-Filter Bar */}
      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 11 }} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Search by Patient ID (PID-XXXX), Lab Number, Name, Mobile, Email, Doctor..."
              className="form-input"
              style={{ paddingLeft: 40, height: 40 }}
            />
          </div>
          <button
            onClick={() => {
              setSearch(''); setBranchFilter(''); setDoctorFilter('');
              setGenderFilter(''); setFromDate(''); setToDate(''); setCurrentPage(1);
            }}
            className="btn btn-outline btn-sm"
          >
            Clear Filters
          </button>
        </div>

        {/* Filter Controls Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          <div>
            <label className="form-label" style={{ fontSize: 11 }}>Branch</label>
            <select
              value={branchFilter}
              onChange={(e) => { setBranchFilter(e.target.value); setCurrentPage(1); }}
              className="form-input"
              style={{ height: 36, fontSize: 12 }}
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 11 }}>Referring Doctor</label>
            <select
              value={doctorFilter}
              onChange={(e) => { setDoctorFilter(e.target.value); setCurrentPage(1); }}
              className="form-input"
              style={{ height: 36, fontSize: 12 }}
            >
              <option value="">All Doctors</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 11 }}>Gender</label>
            <select
              value={genderFilter}
              onChange={(e) => { setGenderFilter(e.target.value); setCurrentPage(1); }}
              className="form-input"
              style={{ height: 36, fontSize: 12 }}
            >
              <option value="">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 11 }}>From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
              className="form-input"
              style={{ height: 36, fontSize: 12 }}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 11 }}>To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
              className="form-input"
              style={{ height: 36, fontSize: 12 }}
            />
          </div>
        </div>
      </div>

      {/* Patient Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Patient ID / Lab No</th>
              <th>Patient Demographics</th>
              <th>Contact Info</th>
              <th>Referring Doctor</th>
              <th>Branch</th>
              <th>Visits</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 30 }}>Loading patients...</td>
              </tr>
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>
                  No patients found matching your search and filter criteria.
                </td>
              </tr>
            ) : (
              patients.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#0284c7' }}>{p.patient_id_code}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{p.lab_number || 'N/A'}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {p.age} {p.age_unit || 'years'}  •  {p.gender} {p.blood_group ? ` •  ${p.blood_group}` : ''}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                      <Phone size={13} color="#64748b" />
                      <span>{p.mobile}</span>
                    </div>
                    {p.city && <div style={{ fontSize: 11, color: '#64748b' }}>{p.city}</div>}
                  </td>
                  <td>
                    {p.doctor_name ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                        <Stethoscope size={13} color="#0284c7" />
                        <span>{p.doctor_name}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>Self / Direct</span>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-primary" style={{ fontSize: 11 }}>
                      {p.branch_name || 'Central Hub'}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.total_orders || 0} Orders</div>
                    {p.last_visit_date && (
                      <div style={{ fontSize: 10.5, color: '#64748b' }}>
                        {new Date(p.last_visit_date).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => handleViewProfile(p)}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: 12, padding: '4px 10px' }}
                    >
                      View Profile
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontSize: 13, color: '#64748b' }}>
        <div>
          Showing {patients.length} of {totalRecords} patients
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="btn btn-outline btn-sm"
          >
            <ChevronLeft size={14} />
            <span>Previous</span>
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className="btn btn-outline btn-sm"
          >
            <span>Next</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Patient Registration Modal */}
      {showRegisterModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 750 }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Register New Diagnostic Patient</h2>
                <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Auto-generates unique Patient ID and Lab sequence</p>
              </div>
              <button onClick={() => setShowRegisterModal(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleRegister}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {duplicateWarning && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', backgroundColor: '#fef3c7',
                    border: '1px solid #fde68a', borderRadius: 6,
                    color: '#92400e', fontSize: 12.5
                  }}>
                    <AlertCircle size={16} />
                    <span>{duplicateWarning}</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Full Patient Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="form-input"
                      placeholder="e.g. Rahul Sharma"
                    />
                  </div>
                  <div>
                    <label className="form-label">Age *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="120"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      className="form-input"
                      placeholder="e.g. 35"
                    />
                  </div>
                  <div>
                    <label className="form-label">Unit</label>
                    <select
                      value={formData.age_unit}
                      onChange={(e) => setFormData({ ...formData, age_unit: e.target.value })}
                      className="form-input"
                    >
                      <option value="years">Years</option>
                      <option value="months">Months</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Gender *</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="form-input"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Blood Group</label>
                    <select
                      value={formData.blood_group}
                      onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                      className="form-input"
                    >
                      <option value="">Unknown</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      value={formData.mobile}
                      onChange={handleMobileChange}
                      className="form-input"
                      placeholder="10-digit mobile number"
                    />
                  </div>
                  <div>
                    <label className="form-label">Alternate Mobile</label>
                    <input
                      type="tel"
                      value={formData.alternate_mobile}
                      onChange={(e) => setFormData({ ...formData, alternate_mobile: e.target.value })}
                      className="form-input"
                      placeholder="Optional emergency phone"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="form-input"
                      placeholder="patient@example.com"
                    />
                  </div>
                  <div>
                    <label className="form-label">Operating Branch *</label>
                    <select
                      required
                      value={formData.branch_id}
                      onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                      className="form-input"
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Referring Doctor</label>
                    <select
                      value={formData.referring_doctor_id}
                      onChange={(e) => setFormData({ ...formData, referring_doctor_id: e.target.value })}
                      className="form-input"
                    >
                      <option value="">Self / OPD Walk-in</option>
                      {doctors.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.specialization || d.clinic_hospital})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Hospital / Clinic Reference</label>
                    <input
                      type="text"
                      value={formData.clinic_hospital}
                      onChange={(e) => setFormData({ ...formData, clinic_hospital: e.target.value })}
                      className="form-input"
                      placeholder="e.g. Fortis Healthcare OPD"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="form-input"
                    placeholder="Residential street address"
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
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="form-label">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="form-input"
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <label className="form-label">Pincode</label>
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className="form-input"
                      placeholder="Pincode"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Clinical Remarks</label>
                  <input
                    type="text"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    className="form-input"
                    placeholder="e.g. Fasting sample required, diabetic history"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowRegisterModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save & Register Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deep Patient Profile Drawer / Modal */}
      {selectedPatient && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 850 }}>
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge badge-primary">{selectedPatient.patient_id_code}</span>
                  <span className="badge badge-normal">{selectedPatient.lab_number || 'N/A'}</span>
                </div>
                <h2 className="modal-title" style={{ marginTop: 4 }}>{selectedPatient.name}</h2>
              </div>
              <button onClick={() => setSelectedPatient(null)} className="close-btn">&times;</button>
            </div>

            {/* Profile Tabs Navigation */}
            <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', padding: '0 20px' }}>
              {[
                { key: 'overview', label: 'Overview' },
                { key: 'orders', label: `Test Orders (${patientProfile?.orders?.length || 0})` },
                { key: 'results', label: 'Results & Trends' },
                { key: 'invoices', label: `Invoices (${patientProfile?.invoices?.length || 0})` },
                { key: 'activity', label: 'Activity Trail' }
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveProfileTab(t.key)}
                  style={{
                    padding: '10px 14px', border: 'none', background: 'transparent',
                    borderBottom: activeProfileTab === t.key ? '2px solid #0284c7' : '2px solid transparent',
                    color: activeProfileTab === t.key ? '#0284c7' : '#64748b',
                    fontWeight: activeProfileTab === t.key ? 700 : 500,
                    cursor: 'pointer', fontSize: 13
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="modal-body" style={{ minHeight: 320 }}>
              {profileLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                  Loading patient medical record...
                </div>
              ) : (
                <>
                  {/* TAB 1: OVERVIEW & DEMOGRAPHICS */}
                  {activeProfileTab === 'overview' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, backgroundColor: '#f8fafc', padding: 14, borderRadius: 6, fontSize: 13 }}>
                        <div><strong>Age / Gender:</strong> {selectedPatient.age} {selectedPatient.age_unit || 'years'} • {selectedPatient.gender}</div>
                        <div><strong>Blood Group:</strong> {selectedPatient.blood_group || 'Unknown'}</div>
                        <div><strong>Date of Birth:</strong> {selectedPatient.dob || 'Not set'}</div>
                        <div><strong>Mobile:</strong> {selectedPatient.mobile}</div>
                        <div><strong>Alternate Phone:</strong> {selectedPatient.alternate_mobile || 'N/A'}</div>
                        <div><strong>Email:</strong> {selectedPatient.email || 'N/A'}</div>
                        <div><strong>Referring Doctor:</strong> {patientProfile?.patient?.doctor_name || 'Self'}</div>
                        <div><strong>Branch:</strong> {patientProfile?.patient?.branch_name || 'Central'}</div>
                        <div><strong>Registration Date:</strong> {new Date(selectedPatient.created_at).toLocaleDateString()}</div>
                      </div>

                      <div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Address Information</h4>
                        <p style={{ fontSize: 13, color: '#475569' }}>
                          {selectedPatient.address || 'Address not specified'}{selectedPatient.city ? `, ${selectedPatient.city}` : ''}{selectedPatient.state ? ` (${selectedPatient.state})` : ''} {selectedPatient.pincode}
                        </p>
                      </div>

                      {selectedPatient.remarks && (
                        <div>
                          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Clinical Remarks</h4>
                          <p style={{ fontSize: 13, color: '#b45309', backgroundColor: '#fef3c7', padding: '8px 12px', borderRadius: 6 }}>
                            {selectedPatient.remarks}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: TEST ORDER HISTORY */}
                  {activeProfileTab === 'orders' && (
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Order #</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Amount</th>
                            <th>Payment</th>
                            <th>Report</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(!patientProfile?.orders || patientProfile.orders.length === 0) ? (
                            <tr>
                              <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                                No test orders recorded for this patient.
                              </td>
                            </tr>
                          ) : (
                            patientProfile.orders.map((o: any) => (
                              <tr key={o.id}>
                                <td><strong>{o.order_number}</strong></td>
                                <td>{new Date(o.created_at).toLocaleDateString()}</td>
                                <td><span className="badge badge-primary">{o.status}</span></td>
                                <td>₹{o.net_amount}</td>
                                <td><span className="badge badge-normal">{o.payment_status}</span></td>
                                <td>
                                  {o.report_number ? (
                                    <button
                                      onClick={() => setPreviewReportId(o.id)}
                                      className="btn btn-outline btn-sm"
                                      style={{ padding: '2px 8px', fontSize: 11 }}
                                    >
                                      Preview PDF
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: 12, color: '#94a3b8' }}>Pending</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* TAB 3: CLINICAL PARAMETERS TRENDS */}
                  {activeProfileTab === 'results' && (
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Test / Parameter</th>
                            <th>Result Value</th>
                            <th>Flag</th>
                            <th>Date Recorded</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(!patientProfile?.recentResults || patientProfile.recentResults.length === 0) ? (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                                No released lab results found for historical trend comparison.
                              </td>
                            </tr>
                          ) : (
                            patientProfile.recentResults.map((r: any, i: number) => (
                              <tr key={i}>
                                <td>
                                  <div style={{ fontWeight: 600 }}>{r.param_name}</div>
                                  <div style={{ fontSize: 11, color: '#64748b' }}>{r.test_name}</div>
                                </td>
                                <td>
                                  <strong style={{ fontSize: 13.5 }}>{r.value_numeric ?? r.value_text}</strong> {r.unit}
                                </td>
                                <td>
                                  <span className={`badge badge-${r.flag === 'normal' ? 'success' : 'danger'}`}>
                                    {r.flag || 'normal'}
                                  </span>
                                </td>
                                <td>{new Date(r.created_at).toLocaleDateString()}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* TAB 4: BILLING & INVOICES */}
                  {activeProfileTab === 'invoices' && (
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Invoice #</th>
                            <th>Date</th>
                            <th>Total</th>
                            <th>Paid</th>
                            <th>Due Balance</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(!patientProfile?.invoices || patientProfile.invoices.length === 0) ? (
                            <tr>
                              <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                                No invoices generated yet.
                              </td>
                            </tr>
                          ) : (
                            patientProfile.invoices.map((inv: any) => (
                              <tr key={inv.id}>
                                <td><strong>{inv.invoice_number}</strong></td>
                                <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                                <td>₹{inv.net_total}</td>
                                <td><span style={{ color: '#059669', fontWeight: 600 }}>₹{inv.paid}</span></td>
                                <td>
                                  <span style={{ color: inv.due > 0 ? '#dc2626' : '#64748b', fontWeight: 600 }}>
                                    ₹{inv.due}
                                  </span>
                                </td>
                                <td>
                                  <span className={`badge badge-${inv.status === 'paid' ? 'success' : inv.status === 'partial' ? 'warning' : 'danger'}`}>
                                    {inv.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* TAB 5: ACTIVITY TIMELINE */}
                  {activeProfileTab === 'activity' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {(!patientProfile?.activityLogs || patientProfile.activityLogs.length === 0) ? (
                        <p style={{ color: '#64748b', textAlign: 'center', padding: 24 }}>No audit logs recorded for this patient.</p>
                      ) : (
                        patientProfile.activityLogs.map((log: any) => (
                          <div key={log.id} style={{
                            padding: '10px 14px', backgroundColor: '#f8fafc',
                            borderRadius: 6, borderLeft: '3px solid #0284c7', fontSize: 13
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ color: '#0f172a' }}>{log.action}</strong>
                              <span style={{ fontSize: 11, color: '#64748b' }}>{new Date(log.created_at).toLocaleString()}</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                              Performed by: {log.user_email || 'System'} ({log.user_role || 'user'})
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setSelectedPatient(null)} className="btn btn-primary">
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Report Modal */}
      {previewReportId && (
        <ReportPreviewModal
          reportId={previewReportId}
          onClose={() => setPreviewReportId(null)}
        />
      )}
    </div>
  );
};
