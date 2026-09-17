import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, FlaskConical, FileCheck, CheckCircle2, DollarSign,
  Clock, Plus, ArrowRight, UserPlus, ClipboardList, TestTubes, Receipt,
  GitBranch, ShieldAlert, BarChart3, TrendingUp, ChevronRight
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { ReportPreviewModal } from '../../components/clinical/ReportPreviewModal';

export const LabAdminDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [previewReportId, setPreviewReportId] = useState<string | null>(null);
  const [workQueues, setWorkQueues] = useState<any>(null);
  const { error } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [res, qRes] = await Promise.all([
          api.get('/analytics/dashboard'),
          api.get('/analytics/work-queues').catch(() => null)
        ]);
        setData(res);
        setWorkQueues(qRes);
      } catch (err: any) {
        error(err.message || 'Failed to load dashboard metrics');
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40, border: '3px solid #e0f2fe',
          borderTopColor: '#0284c7', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
        }} />
        <p style={{ color: '#64748b' }}>Loading laboratory command center...</p>
      </div>
    );
  }

  const charts = data?.charts || {};

  return (
    <div>
      {/* Top Banner & Quick Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Laboratory Command Center</h1>
          <p style={{ fontSize: 13.5, color: '#64748b', marginTop: 4 }}>
            Real-time multi-branch operations, diagnostic pipeline tracking, and revenue analytics.
          </p>
        </div>

        {/* 6 Quick Action Buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/patients')} className="btn btn-outline btn-sm">
            <UserPlus size={15} />
            <span>New Patient</span>
          </button>
          <button onClick={() => navigate('/orders')} className="btn btn-primary btn-sm">
            <Plus size={15} />
            <span>New Test Order</span>
          </button>
          <button onClick={() => navigate('/samples')} className="btn btn-secondary btn-sm">
            <FlaskConical size={15} />
            <span>Sample Collection</span>
          </button>
          <button onClick={() => navigate('/results')} className="btn btn-secondary btn-sm">
            <TestTubes size={15} />
            <span>Enter Results</span>
          </button>
          <button onClick={() => navigate('/verification')} className="btn btn-secondary btn-sm">
            <FileCheck size={15} />
            <span>Pending Reports</span>
          </button>
          <button onClick={() => navigate('/billing')} className="btn btn-outline btn-sm">
            <Receipt size={15} />
            <span>Billing</span>
          </button>
        </div>
      </div>

      {/* 12 Clinical KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {/* Card 1: Total Patients */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
            <Users size={22} />
          </div>
          <div>
            <div className="metric-value">{data?.total_patients || 0}</div>
            <div className="metric-label">Total Patients</div>
            <div style={{ fontSize: 11, color: '#0284c7', marginTop: 2, fontWeight: 600 }}>
              +{data?.today_patients || 0} registered today
            </div>
          </div>
        </div>

        {/* Card 2: Today's Patients */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
            <UserPlus size={22} />
          </div>
          <div>
            <div className="metric-value">{data?.today_patients || 0}</div>
            <div className="metric-label">Today's Patient Visits</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              Walk-in & home collections
            </div>
          </div>
        </div>

        {/* Card 3: Today's Orders */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#eff6ff', color: '#3b82f6' }}>
            <ClipboardList size={22} />
          </div>
          <div>
            <div className="metric-value">{data?.today_orders || 0}</div>
            <div className="metric-label">Today's Test Orders</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              Diagnostic requisitions
            </div>
          </div>
        </div>

        {/* Card 4: Pending Samples */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
            <FlaskConical size={22} />
          </div>
          <div>
            <div className="metric-value">{data?.pending_samples || 0}</div>
            <div className="metric-label">Pending Samples</div>
            <div style={{ fontSize: 11, color: '#d97706', marginTop: 2, fontWeight: 600 }}>
              Awaiting phlebotomy
            </div>
          </div>
        </div>

        {/* Card 5: Processing Samples */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#e0e7ff', color: '#4f46e5' }}>
            <TestTubes size={22} />
          </div>
          <div>
            <div className="metric-value">{data?.processing_samples || 0}</div>
            <div className="metric-label">Processing Samples</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              In analyzer queue
            </div>
          </div>
        </div>

        {/* Card 6: Pending Results */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
            <Clock size={22} />
          </div>
          <div>
            <div className="metric-value">{data?.pending_results || 0}</div>
            <div className="metric-label">Pending Results</div>
            <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2, fontWeight: 600 }}>
              Awaiting entry / sync
            </div>
          </div>
        </div>

        {/* Card 7: Awaiting Verification */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#f3e8ff', color: '#9333ea' }}>
            <FileCheck size={22} />
          </div>
          <div>
            <div className="metric-value">{data?.awaiting_verification || 0}</div>
            <div className="metric-label">Reports Awaiting Verification</div>
            <div style={{ fontSize: 11, color: '#9333ea', marginTop: 2, fontWeight: 600 }}>
              Pathologist review queue
            </div>
          </div>
        </div>

        {/* Card 8: Completed Reports */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="metric-value">{data?.completed_reports || 0}</div>
            <div className="metric-label">Completed Reports Released</div>
            <div style={{ fontSize: 11, color: '#15803d', marginTop: 2, fontWeight: 600 }}>
              Delivered to patients
            </div>
          </div>
        </div>

        {/* Card 9: Today's Revenue */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div className="metric-value">₹{(data?.today_revenue || 0).toLocaleString('en-IN')}</div>
            <div className="metric-label">Today's Revenue</div>
            <div style={{ fontSize: 11, color: '#059669', marginTop: 2 }}>
              Total ₹{(data?.total_revenue || 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Card 10: Outstanding Payments */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#fff1f2', color: '#e11d48' }}>
            <Receipt size={22} />
          </div>
          <div>
            <div className="metric-value">₹{(data?.outstanding_payments || 0).toLocaleString('en-IN')}</div>
            <div className="metric-label">Outstanding Payments</div>
            <div style={{ fontSize: 11, color: '#e11d48', marginTop: 2, fontWeight: 600 }}>
              Pending collections
            </div>
          </div>
        </div>

        {/* Card 11: Active Branches */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
            <GitBranch size={22} />
          </div>
          <div>
            <div className="metric-value">{data?.active_branches || 0}</div>
            <div className="metric-label">Active Branches</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              Phlebotomy & hubs
            </div>
          </div>
        </div>

        {/* Card 12: Active Staff */}
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>
            <Users size={22} />
          </div>
          <div>
            <div className="metric-value">{data?.active_staff || 0}</div>
            <div className="metric-label">Active Staff</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              Technicians & doctors
            </div>
          </div>
        </div>
      </div>

      {/* Operational Pipeline Work Queues */}
      {workQueues && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <TestTubes size={18} color="#0284c7" />
              <span>Real-time Departmental Work Queues</span>
            </h3>
            <span style={{ fontSize: 12, color: '#64748b' }}>Live bottlenecks & pending tasks across operational desks</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {/* Queue 1: Reception & Billing */}
            <div
              onClick={() => navigate('/orders')}
              className="card"
              style={{ padding: 14, cursor: 'pointer', transition: 'all 0.2s ease', borderLeft: '4px solid #0284c7' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0284c7' }}>Reception & Orders</span>
                <ChevronRight size={16} color="#94a3b8" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Pending Orders:</span>
                  <strong style={{ color: '#0f172a' }}>{workQueues.reception?.pending_orders || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Unpaid Invoices:</span>
                  <strong style={{ color: '#dc2626' }}>{workQueues.reception?.unpaid_invoices || 0}</strong>
                </div>
              </div>
            </div>

            {/* Queue 2: Phlebotomy Desk */}
            <div
              onClick={() => navigate('/samples')}
              className="card"
              style={{ padding: 14, cursor: 'pointer', transition: 'all 0.2s ease', borderLeft: '4px solid #d97706' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#d97706' }}>Phlebotomy Desk</span>
                <ChevronRight size={16} color="#94a3b8" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Pending Collection:</span>
                  <strong style={{ color: '#0f172a' }}>{workQueues.phlebotomy?.pending_collections || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>STAT / Urgent:</span>
                  <strong style={{ color: '#dc2626' }}>{workQueues.phlebotomy?.urgent_samples || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Recollection Needed:</span>
                  <strong style={{ color: '#b45309' }}>{workQueues.phlebotomy?.rejected_samples || 0}</strong>
                </div>
              </div>
            </div>

            {/* Queue 3: Laboratory Testing Desk */}
            <div
              onClick={() => navigate('/results')}
              className="card"
              style={{ padding: 14, cursor: 'pointer', transition: 'all 0.2s ease', borderLeft: '4px solid #4f46e5' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5' }}>Testing Worklist</span>
                <ChevronRight size={16} color="#94a3b8" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Pending Results:</span>
                  <strong style={{ color: '#0f172a' }}>{workQueues.technician?.pending_results || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Critical Alerts:</span>
                  <strong style={{ color: '#dc2626' }}>{workQueues.technician?.critical_alerts || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Re-runs / Corrections:</span>
                  <strong style={{ color: '#d97706' }}>{workQueues.technician?.rejected_results || 0}</strong>
                </div>
              </div>
            </div>

            {/* Queue 4: Pathologist Desk */}
            <div
              onClick={() => navigate('/verification')}
              className="card"
              style={{ padding: 14, cursor: 'pointer', transition: 'all 0.2s ease', borderLeft: '4px solid #059669' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>Pathologist Sign-off</span>
                <ChevronRight size={16} color="#94a3b8" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Awaiting Sign-off:</span>
                  <strong style={{ color: '#0f172a' }}>{workQueues.pathologist?.awaiting_verification || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Critical Reports:</span>
                  <strong style={{ color: '#dc2626' }}>{workQueues.pathologist?.critical_reports || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Approved (Unreleased):</span>
                  <strong style={{ color: '#059669' }}>{workQueues.pathologist?.approved_unreleased || 0}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visual Charts & Trends Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Left Column: Trend Curves */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Daily Patient & Test Volume Trends */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Diagnostic Volume & Registrations Trend</h3>
                <p style={{ fontSize: 12, color: '#64748b' }}>Daily patient registrations vs. ordered clinical tests over last 7 days</p>
              </div>
              <span className="badge badge-primary">Past 7 Days</span>
            </div>

            <div style={{ height: 160, display: 'flex', alignItems: 'flex-end', gap: 14, paddingTop: 20, borderBottom: '1px solid #f1f5f9' }}>
              {(charts.daily_registrations || []).map((item: any, i: number) => {
                const maxVal = Math.max(10, ...(charts.daily_registrations || []).map((d: any) => d.count));
                const heightPct = Math.round((item.count / maxVal) * 100);
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0284c7' }}>{item.count}</span>
                    <div style={{
                      width: '100%',
                      maxWidth: 36,
                      height: `${Math.max(12, heightPct)}%`,
                      backgroundColor: '#38bdf8',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease'
                    }} />
                    <span style={{ fontSize: 10, color: '#64748b' }}>{item.date?.slice(5) || `D${i + 1}`}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Revenue Inflow Trend */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Daily Revenue Inflow Trend</h3>
                <p style={{ fontSize: 12, color: '#64748b' }}>Daily payment receipts and diagnostic collections</p>
              </div>
              <span className="badge badge-success">Collections</span>
            </div>

            <div style={{ height: 140, display: 'flex', alignItems: 'flex-end', gap: 14, paddingTop: 16, borderBottom: '1px solid #f1f5f9' }}>
              {(charts.revenue_trend || []).map((item: any, i: number) => {
                const maxRev = Math.max(1000, ...(charts.revenue_trend || []).map((r: any) => r.amount));
                const hPct = Math.round((item.amount / maxRev) * 100);
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#059669' }}>₹{Math.round(item.amount / 100) * 100}</span>
                    <div style={{
                      width: '100%',
                      maxWidth: 36,
                      height: `${Math.max(12, hPct)}%`,
                      backgroundColor: '#34d399',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease'
                    }} />
                    <span style={{ fontSize: 10, color: '#64748b' }}>{item.date?.slice(5) || `D${i + 1}`}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Branch Distribution & Popular Tests */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Top Popular Tests */}
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Popular Diagnostic Tests</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(charts.popular_tests || []).map((test: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: '50%',
                      backgroundColor: '#f1f5f9', color: '#0284c7',
                      fontSize: 11, fontWeight: 700, display: 'flex',
                      alignItems: 'center', justifyContent: 'center'
                    }}>
                      {idx + 1}
                    </span>
                    <span style={{ fontWeight: 600, color: '#334155' }}>{test.name}</span>
                  </div>
                  <span className="badge badge-primary">{test.count} Orders</span>
                </div>
              ))}
            </div>
          </div>

          {/* Branch-wise Patient Statistics */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Branch Operations</h3>
              <button onClick={() => navigate('/branches')} className="btn btn-outline btn-sm" style={{ padding: '3px 8px', fontSize: 11 }}>
                View All
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(charts.branch_stats || []).map((b: any) => (
                <div key={b.id} style={{
                  padding: '10px 12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: 6,
                  border: '1px solid #f1f5f9'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <strong style={{ fontSize: 13, color: '#0f172a' }}>{b.name}</strong>
                    <span className="badge badge-normal" style={{ fontSize: 10 }}>{b.code}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#64748b' }}>
                    <span>{b.patient_count || 0} Patients</span>
                    <span>{b.order_count || 0} Orders</span>
                    <span style={{ color: '#059669', fontWeight: 600 }}>₹{(b.total_collected || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Diagnostic Orders Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Recent Diagnostic Requisitions</h3>
            <p style={{ fontSize: 12, color: '#64748b' }}>Latest active patient test orders and reports</p>
          </div>
          <button onClick={() => navigate('/orders')} className="btn btn-outline btn-sm">
            <span>View All Orders</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Patient</th>
                <th>Status</th>
                <th>Net Amount</th>
                <th>Payment</th>
                <th>Report</th>
              </tr>
            </thead>
            <tbody>
              {(!data?.recent_orders || data.recent_orders.length === 0) ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                    No recent diagnostic orders found.
                  </td>
                </tr>
              ) : (
                data.recent_orders.map((o: any) => (
                  <tr key={o.id}>
                    <td>
                      <strong style={{ color: '#0284c7' }}>{o.order_number}</strong>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{new Date(o.created_at).toLocaleDateString()}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{o.patient_name}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{o.patient_id_code}</div>
                    </td>
                    <td>
                      <span className={`badge badge-${o.status === 'completed' ? 'success' : o.status === 'processing' ? 'warning' : 'normal'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td><strong>₹{o.net_amount}</strong></td>
                    <td>
                      <span className={`badge badge-${o.payment_status === 'paid' ? 'success' : o.payment_status === 'partial' ? 'warning' : 'danger'}`}>
                        {o.payment_status}
                      </span>
                    </td>
                    <td>
                      {o.report_number ? (
                        <button
                          onClick={() => setPreviewReportId(o.id)}
                          className="btn btn-outline btn-sm"
                          style={{ padding: '2px 8px', fontSize: 11 }}
                        >
                          View Report
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
      </div>

      {/* PDF Report Preview Modal */}
      {previewReportId && (
        <ReportPreviewModal
          reportId={previewReportId}
          onClose={() => setPreviewReportId(null)}
        />
      )}
    </div>
  );
};
