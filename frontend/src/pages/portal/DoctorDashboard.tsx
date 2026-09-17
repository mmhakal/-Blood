import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope, Users, ClipboardList, AlertTriangle, FileText, Download,
  Search, LogOut, ShieldCheck, Clock, CheckCircle2, ChevronRight, Activity, Bell
} from 'lucide-react';
import { doctorRequest } from '../../services/portalApi';

export const DoctorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<any>(null);
  const [kpis, setKpis] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'reports' | 'alerts' | 'patients'>('reports');
  const [reports, setReports] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const rawDoc = localStorage.getItem('doctor_portal_user');
    if (!rawDoc) {
      navigate('/doctor/login');
      return;
    }
    setDoctor(JSON.parse(rawDoc));
    loadData();
  }, [navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashData, repData, alertData, ptData] = await Promise.all([
        doctorRequest('/doctor-portal/dashboard'),
        doctorRequest('/doctor-portal/reports'),
        doctorRequest('/doctor-portal/critical-alerts'),
        doctorRequest('/doctor-portal/patients'),
      ]);
      setKpis(dashData);
      setReports(repData);
      setAlerts(alertData);
      setPatients(ptData);
    } catch (err) {
      console.error('Failed to load doctor portal data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async (reportId: string, reportNumber: string) => {
    try {
      setDownloadingId(reportId);
      const blob = await doctorRequest(`/doctor-portal/reports/${reportId}/pdf`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Report_${reportNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Error downloading report PDF: ' + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('doctor_portal_token');
    localStorage.removeItem('doctor_portal_user');
    navigate('/doctor/login');
  };

  const filteredReports = reports.filter(r =>
    (r.patient_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.report_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.patient_id_code || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a' }}>
      {/* Clinician Portal Header */}
      <header style={{
        backgroundColor: '#0f172a',
        color: '#fff',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #1e293b'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            backgroundColor: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <Stethoscope size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{doctor?.name || 'Doctor Portal'}</h1>
              <span style={{ fontSize: 11, backgroundColor: '#0369a1', color: '#e0f2fe', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                {doctor?.specialization || 'Consultant'}
              </span>
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8' }}>
              {doctor?.clinic_hospital || 'Affiliated Hospital'} • Partner: {doctor?.lab_name || 'MediFlow Diagnostics'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: 8 }}>
            <ShieldCheck size={16} />
            <span>Encrypted HIPAA/HL7 Bridge</span>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              backgroundColor: '#1e293b',
              color: '#f87171',
              border: '1px solid #334155',
              fontSize: 13,
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main style={{ maxWidth: 1300, margin: '0 auto', padding: '28px 24px' }}>
        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 28 }}>
          <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Referred Patients</span>
              <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={20} />
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>{kpis?.referred_patients ?? 0}</div>
            <span style={{ fontSize: 12, color: '#0284c7', fontWeight: 500 }}>Active patient portfolio</span>
          </div>

          <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Orders This Month</span>
              <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClipboardList size={20} />
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>{kpis?.orders_this_month ?? 0}</div>
            <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 500 }}>Diagnostic requisitions</span>
          </div>

          <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Pending Analyzer Runs</span>
              <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={20} />
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>{kpis?.pending_orders ?? 0}</div>
            <span style={{ fontSize: 12, color: '#ea580c', fontWeight: 500 }}>In processing / verification</span>
          </div>

          <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, border: '1px solid #fee2e2', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#991b1b', fontWeight: 600 }}>Panic / Critical Alerts</span>
              <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={20} />
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#dc2626' }}>{kpis?.critical_alerts ?? 0}</div>
            <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>Urgent clinical action needed</span>
          </div>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
          <button
            onClick={() => setActiveTab('reports')}
            style={{
              padding: '12px 18px',
              fontSize: 14,
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'reports' ? '3px solid #0284c7' : '3px solid transparent',
              color: activeTab === 'reports' ? '#0284c7' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <FileText size={18} />
            <span>Diagnostic Reports ({reports.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            style={{
              padding: '12px 18px',
              fontSize: 14,
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'alerts' ? '3px solid #dc2626' : '3px solid transparent',
              color: activeTab === 'alerts' ? '#dc2626' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <AlertTriangle size={18} />
            <span>Critical Panic Values ({alerts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('patients')}
            style={{
              padding: '12px 18px',
              fontSize: 14,
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'patients' ? '3px solid #0284c7' : '3px solid transparent',
              color: activeTab === 'patients' ? '#0284c7' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Users size={18} />
            <span>Referred Patients ({patients.length})</span>
          </button>
        </div>

        {/* TAB 1: REPORTS */}
        {activeTab === 'reports' && (
          <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ position: 'relative', width: 340 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Filter by patient name, PID or report #"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    outline: 'none'
                  }}
                />
              </div>
              <span style={{ fontSize: 13, color: '#64748b' }}>Showing {filteredReports.length} reports</span>
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading certified reports...</div>
            ) : filteredReports.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No reports found for referred patients.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '12px 14px' }}>Report #</th>
                      <th style={{ padding: '12px 14px' }}>Patient Details</th>
                      <th style={{ padding: '12px 14px' }}>Order #</th>
                      <th style={{ padding: '12px 14px' }}>Released Date</th>
                      <th style={{ padding: '12px 14px' }}>Status</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0284c7' }}>{r.report_number}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{r.patient_name}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{r.patient_id_code} • {r.age}y/{r.gender}</div>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475569' }}>{r.order_number}</td>
                        <td style={{ padding: '12px 14px', color: '#64748b' }}>
                          {r.released_at ? new Date(r.released_at).toLocaleDateString() : new Date(r.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            backgroundColor: r.status === 'released' ? '#ecfdf5' : '#e0f2fe',
                            color: r.status === 'released' ? '#059669' : '#0284c7',
                          }}>
                            {r.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleDownloadPdf(r.id, r.report_number)}
                            disabled={downloadingId === r.id}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 6,
                              backgroundColor: '#0284c7',
                              color: '#fff',
                              border: 'none',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6
                            }}
                          >
                            <Download size={14} />
                            <span>{downloadingId === r.id ? 'Downloading...' : 'PDF Report'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CRITICAL PANIC ALERTS */}
        {activeTab === 'alerts' && (
          <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #fee2e2', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#991b1b' }}>Critical Value Notification Stream</h3>
                <p style={{ fontSize: 12, color: '#b91c1c' }}>Parameters exceeding laboratory panic thresholds require prompt clinical evaluation</p>
              </div>
            </div>

            {alerts.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#16a34a' }}>
                <CheckCircle2 size={36} style={{ margin: '0 auto 10px', color: '#16a34a' }} />
                <div style={{ fontWeight: 600 }}>No active critical alerts</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>All patient diagnostic parameters are within acceptable clinical tolerances.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {alerts.map((al, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: 10,
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fca5a5'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: '#dc2626', color: '#fff', padding: '2px 8px', borderRadius: 4 }}>
                          CRITICAL {al.flag?.toUpperCase() || 'ALERT'}
                        </span>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{al.patient_name}</span>
                        <span style={{ fontSize: 12, color: '#64748b' }}>({al.patient_id_code} • {al.mobile})</span>
                      </div>
                      <div style={{ fontSize: 13, color: '#7f1d1d' }}>
                        <strong>{al.test_name}</strong>: {al.param_name} = <strong style={{ fontSize: 15, color: '#dc2626' }}>{al.value_numeric} {al.unit}</strong>
                      </div>
                    </div>
                    {al.report_id && (
                      <button
                        onClick={() => handleDownloadPdf(al.report_id, al.report_number || 'ALERT')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          backgroundColor: '#dc2626',
                          color: '#fff',
                          border: 'none',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Download size={14} />
                        <span>View Report</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PATIENTS */}
        {activeTab === 'patients' && (
          <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Referred Patients Directory</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '12px 14px' }}>Patient Code</th>
                    <th style={{ padding: '12px 14px' }}>Full Name</th>
                    <th style={{ padding: '12px 14px' }}>Demographics</th>
                    <th style={{ padding: '12px 14px' }}>Phone Number</th>
                    <th style={{ padding: '12px 14px' }}>Registered At</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0284c7' }}>{p.patient_id_code}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>{p.name}</td>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>{p.age} Years • {p.gender}</td>
                      <td style={{ padding: '12px 14px', color: '#475569' }}>{p.mobile}</td>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
