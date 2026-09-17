import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HeartPulse, FileText, Download, TrendingUp, Receipt, Clock,
  CheckCircle2, LogOut, ShieldCheck, Activity, Calendar, AlertCircle
} from 'lucide-react';
import { patientRequest } from '../../services/portalApi';

export const PatientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [patient, setPatient] = useState<any>(null);
  const [kpis, setKpis] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'reports' | 'trends' | 'orders' | 'invoices'>('reports');
  const [reports, setReports] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const rawPt = localStorage.getItem('patient_portal_user');
    if (!rawPt) {
      navigate('/patient/login');
      return;
    }
    setPatient(JSON.parse(rawPt));
    loadData();
  }, [navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashData, repData, trendData, ordData, invData] = await Promise.all([
        patientRequest('/patient-portal/dashboard'),
        patientRequest('/patient-portal/reports'),
        patientRequest('/patient-portal/trends'),
        patientRequest('/patient-portal/orders'),
        patientRequest('/patient-portal/invoices'),
      ]);
      setKpis(dashData);
      setReports(repData);
      setTrends(trendData);
      setOrders(ordData);
      setInvoices(invData);
    } catch (err) {
      console.error('Failed to load patient portal data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async (reportId: string, reportNumber: string) => {
    try {
      setDownloadingId(reportId);
      const blob = await patientRequest(`/patient-portal/reports/${reportId}/pdf`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Diagnostic_Report_${reportNumber}.pdf`;
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
    localStorage.removeItem('patient_portal_token');
    localStorage.removeItem('patient_portal_user');
    navigate('/patient/login');
  };

  // Group trends by parameter
  const groupedTrends: Record<string, any[]> = {};
  trends.forEach((t) => {
    const pName = t.param_name || 'General Parameter';
    if (!groupedTrends[pName]) groupedTrends[pName] = [];
    groupedTrends[pName].push(t);
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a' }}>
      {/* Patient Header */}
      <header style={{
        backgroundColor: '#064e3b',
        color: '#fff',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #047857'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            backgroundColor: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <HeartPulse size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{patient?.name || 'Patient Portal'}</h1>
              <span style={{ fontSize: 11, backgroundColor: '#047857', color: '#d1fae5', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                {patient?.patient_id_code || 'Patient'}
              </span>
            </div>
            <p style={{ fontSize: 12, color: '#a7f3d0' }}>
              Laboratory Provider: {patient?.lab_name || 'Apex Diagnostics & Reference Laboratory'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#a7f3d0', background: 'rgba(255, 255, 255, 0.1)', padding: '6px 12px', borderRadius: 8 }}>
            <ShieldCheck size={16} />
            <span>Encrypted Health Record Storage</span>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              backgroundColor: '#047857',
              color: '#fca5a5',
              border: '1px solid #059669',
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
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>
        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 28 }}>
          <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Total Orders / Visits</span>
              <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={20} />
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>{kpis?.total_orders ?? 0}</div>
            <span style={{ fontSize: 12, color: '#059669', fontWeight: 500 }}>Lifetime diagnostic visits</span>
          </div>

          <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Available Reports</span>
              <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={20} />
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>{kpis?.available_reports ?? 0}</div>
            <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 500 }}>Certified & ready for download</span>
          </div>

          <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Pending Processing</span>
              <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={20} />
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>{kpis?.pending_orders ?? 0}</div>
            <span style={{ fontSize: 12, color: '#ea580c', fontWeight: 500 }}>Currently in laboratory</span>
          </div>

          <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Tracked Parameters</span>
              <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={20} />
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>{Object.keys(groupedTrends).length}</div>
            <span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 500 }}>Bio-markers logged over time</span>
          </div>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
          <button
            onClick={() => setActiveTab('reports')}
            style={{
              padding: '12px 18px',
              fontSize: 14,
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'reports' ? '3px solid #059669' : '3px solid transparent',
              color: activeTab === 'reports' ? '#059669' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <FileText size={18} />
            <span>My Certified Reports ({reports.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('trends')}
            style={{
              padding: '12px 18px',
              fontSize: 14,
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'trends' ? '3px solid #059669' : '3px solid transparent',
              color: activeTab === 'trends' ? '#059669' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <TrendingUp size={18} />
            <span>Health Parameter Trends ({Object.keys(groupedTrends).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            style={{
              padding: '12px 18px',
              fontSize: 14,
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'orders' ? '3px solid #059669' : '3px solid transparent',
              color: activeTab === 'orders' ? '#059669' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Calendar size={18} />
            <span>Order History ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            style={{
              padding: '12px 18px',
              fontSize: 14,
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'invoices' ? '3px solid #059669' : '3px solid transparent',
              color: activeTab === 'invoices' ? '#059669' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Receipt size={18} />
            <span>Invoices & Statements ({invoices.length})</span>
          </button>
        </div>

        {/* TAB 1: REPORTS */}
        {activeTab === 'reports' && (
          <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Available Diagnostic Reports</h3>
            {reports.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                No verified reports released yet. Pending reports will appear here automatically once certified by the pathologist.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {reports.map((r) => (
                  <div key={r.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderRadius: 10,
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={24} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Report #{r.report_number}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: 6 }}>
                            AUTHENTICATED
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                          Order #{r.order_number} • Released on {new Date(r.released_at || r.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownloadPdf(r.id, r.report_number)}
                      disabled={downloadingId === r.id}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        backgroundColor: '#059669',
                        color: '#fff',
                        border: 'none',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)'
                      }}
                    >
                      <Download size={16} />
                      <span>{downloadingId === r.id ? 'Preparing...' : 'Download Official PDF'}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PARAMETER TRENDS */}
        {activeTab === 'trends' && (
          <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Longitudinal Health Marker History</h3>
              <p style={{ fontSize: 12, color: '#64748b' }}>Track progression of key biomarker values across diagnostic evaluations</p>
            </div>

            {Object.keys(groupedTrends).length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No historical parameter readings recorded yet.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
                {Object.entries(groupedTrends).map(([pName, points]) => (
                  <div key={pName} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, backgroundColor: '#fafafa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{pName}</span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{points[0]?.unit}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {points.map((pt, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: '#fff', borderRadius: 6, border: '1px solid #f1f5f9', fontSize: 12 }}>
                          <span style={{ color: '#64748b' }}>{new Date(pt.test_date).toLocaleDateString()}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <strong style={{
                              color: pt.flag === 'critical_high' || pt.flag === 'critical_low' ? '#dc2626'
                                   : pt.flag === 'high' ? '#ea580c'
                                   : pt.flag === 'low' ? '#2563eb'
                                   : '#059669'
                            }}>
                              {pt.value_numeric} {pt.unit}
                            </strong>
                            {pt.flag && pt.flag !== 'normal' && (
                              <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: 600 }}>
                                {pt.flag.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ORDERS */}
        {activeTab === 'orders' && (
          <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Requisition & Order Timeline</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '12px 14px' }}>Order #</th>
                    <th style={{ padding: '12px 14px' }}>Branch</th>
                    <th style={{ padding: '12px 14px' }}>Date</th>
                    <th style={{ padding: '12px 14px' }}>Priority</th>
                    <th style={{ padding: '12px 14px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#059669' }}>{o.order_number}</td>
                      <td style={{ padding: '12px 14px', color: '#475569' }}>{o.branch_name || 'Central Hub'}</td>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '12px 14px', textTransform: 'capitalize' }}>{o.priority}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: o.status === 'report_released' || o.status === 'approved' ? '#ecfdf5' : '#fff7ed',
                          color: o.status === 'report_released' || o.status === 'approved' ? '#059669' : '#ea580c',
                        }}>
                          {o.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: INVOICES */}
        {activeTab === 'invoices' && (
          <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Financial Invoices & Receipts</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '12px 14px' }}>Invoice #</th>
                    <th style={{ padding: '12px 14px' }}>Order #</th>
                    <th style={{ padding: '12px 14px' }}>Total Amount</th>
                    <th style={{ padding: '12px 14px' }}>Paid</th>
                    <th style={{ padding: '12px 14px' }}>Outstanding Due</th>
                    <th style={{ padding: '12px 14px' }}>Payment Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>{inv.invoice_number}</td>
                      <td style={{ padding: '12px 14px', color: '#475569' }}>{inv.order_number}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>₹{inv.total_amount}</td>
                      <td style={{ padding: '12px 14px', color: '#059669' }}>₹{inv.paid_amount}</td>
                      <td style={{ padding: '12px 14px', color: inv.due > 0 ? '#dc2626' : '#64748b' }}>₹{inv.due}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: inv.status === 'paid' ? '#ecfdf5' : '#fee2e2',
                          color: inv.status === 'paid' ? '#059669' : '#dc2626',
                        }}>
                          {inv.status.toUpperCase()}
                        </span>
                      </td>
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
