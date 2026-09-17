import React, { useState, useEffect } from 'react';
import {
  Activity, ShieldAlert, Cpu, AlertTriangle, CheckCircle, RefreshCw,
  Building2, Users, FileText, IndianRupee, Layers, ShieldCheck,
  ArrowUpRight, Clock, Check, HardDrive, AlertOctagon,
  Lock, ArrowRight, Gauge, Radio
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

interface CommandData {
  selected_lab_id: string;
  timestamp: string;
  overview: {
    total_laboratories: number;
    active_laboratories: number;
    total_branches: number;
    total_patients: number;
    total_orders: number;
    total_revenue_inr: number;
  };
  analyzers: {
    total: number;
    online: number;
    offline: number;
    fleet: Array<{
      id: string;
      name: string;
      model: string;
      status: string;
      last_ping_at?: string;
      total_tests_imported: number;
    }>;
  };
  workload: {
    accession_pending: number;
    analyzer_pending: number;
    verification_pending: number;
    critical_panic_alerts: number;
  };
  quality_control: {
    active_lots: number;
    westgard_alerts: number;
    compliance_percent: number;
  };
  equipment: {
    total_assets: number;
    operational: number;
    uptime_percent: number;
  };
  inventory: {
    low_stock_items: number;
  };
  governance: {
    pending_approvals: number;
    security_alerts: number;
    active_sessions: number;
  };
  organizations: Array<{
    id: string;
    name: string;
    code: string;
  }>;
}

export const EnterpriseCommandCenter: React.FC = () => {
  const { token, user } = useAuth();
  const [data, setData] = useState<CommandData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedLabId, setSelectedLabId] = useState<string>(user?.lab_id || 'lab-apex');
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [filterDept, setFilterDept] = useState<string>('all');

  const fetchCommandData = async (labId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/command-center?lab_id=${labId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastRefreshed(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Failed to fetch command center data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommandData(selectedLabId);
    const interval = setInterval(() => {
      fetchCommandData(selectedLabId);
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedLabId]);

  return (
    <div className="command-center-container" style={{ padding: '24px 32px', maxWidth: 1600, margin: '0 auto' }}>
      {/* Top Telemetry Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        padding: '24px 30px',
        borderRadius: 16,
        color: '#fff',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
          }}>
            <Activity size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Enterprise Command Center
              </h1>
              <span style={{
                background: 'rgba(14, 165, 233, 0.2)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                padding: '3px 10px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}>
                <Radio size={12} className="animate-pulse" /> LIVE TELEMETRY
              </span>
            </div>
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 13 }}>
              Aggregating 18 operational dimensions across laboratory networks, automated analyzers, QC lots & clinical queues
            </p>
          </div>
        </div>

        {/* Global Multi-Lab Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>OPERATIONAL NODE</span>
            <select
              value={selectedLabId}
              onChange={(e) => setSelectedLabId(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="lab-apex" style={{ background: '#1e293b' }}>Apex Diagnostics (Central Hub)</option>
              {data?.organizations?.map(org => (
                <option key={org.id} value={org.id} style={{ background: '#1e293b' }}>
                  {org.name} ({org.code})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>DEPARTMENT</span>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 600,
                outline: 'none'
              }}
            >
              <option value="all" style={{ background: '#1e293b' }}>All Departments</option>
              <option value="hematology" style={{ background: '#1e293b' }}>Hematology</option>
              <option value="biochemistry" style={{ background: '#1e293b' }}>Biochemistry</option>
              <option value="immunology" style={{ background: '#1e293b' }}>Immunology</option>
            </select>
          </div>

          <button
            onClick={() => fetchCommandData(selectedLabId)}
            disabled={loading}
            style={{
              marginTop: 18,
              background: '#0284c7',
              border: 'none',
              color: '#fff',
              padding: '9px 14px',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* 18 Dimensions Grid */}
      {loading && !data ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <p>Synchronizing enterprise operational telemetry...</p>
        </div>
      ) : data ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Section 1: Consolidated High-Level Network KPIs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 16
          }}>
            <div className="card" style={{ padding: 18, borderLeft: '4px solid #0284c7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 12, fontWeight: 600 }}>
                <span>NETWORK LABS</span>
                <Building2 size={18} color="#0284c7" />
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8, color: '#0f172a' }}>
                {data.overview.active_laboratories} <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>/ {data.overview.total_laboratories}</span>
              </div>
              <div style={{ fontSize: 12, color: '#10b981', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Check size={14} /> 100% Operational Nodes
              </div>
            </div>

            <div className="card" style={{ padding: 18, borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 12, fontWeight: 600 }}>
                <span>COLLECTION BRANCHES</span>
                <Layers size={18} color="#8b5cf6" />
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8, color: '#0f172a' }}>
                {data.overview.total_branches}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                Active Phlebotomy Hubs
              </div>
            </div>

            <div className="card" style={{ padding: 18, borderLeft: '4px solid #06b6d4' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 12, fontWeight: 600 }}>
                <span>PATIENT ENROLLMENTS</span>
                <Users size={18} color="#06b6d4" />
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8, color: '#0f172a' }}>
                {data.overview.total_patients}
              </div>
              <div style={{ fontSize: 12, color: '#0284c7', marginTop: 4 }}>
                Universal Master Patients
              </div>
            </div>

            <div className="card" style={{ padding: 18, borderLeft: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 12, fontWeight: 600 }}>
                <span>TOTAL REQUISITIONS</span>
                <FileText size={18} color="#f59e0b" />
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8, color: '#0f172a' }}>
                {data.overview.total_orders}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                Cumulative Test Orders
              </div>
            </div>

            <div className="card" style={{ padding: 18, borderLeft: '4px solid #10b981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 12, fontWeight: 600 }}>
                <span>COLLECTED REVENUE</span>
                <IndianRupee size={18} color="#10b981" />
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8, color: '#0f172a' }}>
                ₹{Number(data.overview.total_revenue_inr).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div style={{ fontSize: 12, color: '#10b981', marginTop: 4 }}>
                Settled Invoiced Receipts
              </div>
            </div>
          </div>

          {/* Section 2: Clinical Workload & Panic Telemetry */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 20
          }}>
            {/* Real-Time Clinical Queues */}
            <div className="card" style={{ padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Gauge size={18} color="#0284c7" /> Clinical Workload Queues
                </h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>Last sync {lastRefreshed}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, color: '#475569' }}>Accession Desk Pending</span>
                    <span style={{ fontWeight: 800, color: '#0284c7' }}>{data.workload.accession_pending} Specimens</span>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, data.workload.accession_pending * 4)}%`,
                      height: '100%',
                      background: '#0284c7',
                      borderRadius: 4
                    }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, color: '#475569' }}>Analyzer Runs In-Progress</span>
                    <span style={{ fontWeight: 800, color: '#8b5cf6' }}>{data.workload.analyzer_pending} In-Flight</span>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, data.workload.analyzer_pending * 5)}%`,
                      height: '100%',
                      background: '#8b5cf6',
                      borderRadius: 4
                    }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, color: '#475569' }}>Pathologist Verification Desk</span>
                    <span style={{ fontWeight: 800, color: '#f59e0b' }}>{data.workload.verification_pending} Awaiting Sign-off</span>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, data.workload.verification_pending * 3)}%`,
                      height: '100%',
                      background: '#f59e0b',
                      borderRadius: 4
                    }} />
                  </div>
                </div>

                {/* Panic Alert Banner */}
                <div style={{
                  marginTop: 10,
                  background: data.workload.critical_panic_alerts > 0 ? '#fef2f2' : '#f0fdf4',
                  border: data.workload.critical_panic_alerts > 0 ? '1px solid #fca5a5' : '1px solid #bbf7d0',
                  padding: '12px 16px',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <AlertTriangle size={20} color={data.workload.critical_panic_alerts > 0 ? '#dc2626' : '#16a34a'} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: data.workload.critical_panic_alerts > 0 ? '#991b1b' : '#166534' }}>
                        {data.workload.critical_panic_alerts} Panic Critical Results
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {data.workload.critical_panic_alerts > 0 ? 'Immediate telephone escalation required' : 'No biological panic values active'}
                      </div>
                    </div>
                  </div>
                  <Link
                    to="/results"
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#dc2626',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    View Queue <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            </div>

            {/* Analyzer Fleet Live Health */}
            <div className="card" style={{ padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Cpu size={18} color="#0d9488" /> Analyzer Fleet Status
                </h3>
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#10b981',
                  background: '#ecfdf5',
                  padding: '3px 8px',
                  borderRadius: 12
                }}>
                  {data.analyzers.online} / {data.analyzers.total} Online
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 230, overflowY: 'auto' }}>
                {data.analyzers.fleet.map((analyzer) => (
                  <div key={analyzer.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: '#f8fafc',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: analyzer.status === 'online' ? '#10b981' : '#ef4444'
                      }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{analyzer.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{analyzer.model}</div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 10,
                        backgroundColor: analyzer.status === 'online' ? '#ecfdf5' : '#fef2f2',
                        color: analyzer.status === 'online' ? '#166534' : '#991b1b'
                      }}>
                        {analyzer.status.toUpperCase()}
                      </span>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {analyzer.total_tests_imported} tests imported
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14, textAlign: 'right' }}>
                <Link to="/analyzers" style={{ fontSize: 12, fontWeight: 600, color: '#0284c7', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Manage Telemetry & ASTM Mappings <ArrowRight size={13} />
                </Link>
              </div>
            </div>

            {/* Quality Control & Facility Equipment */}
            <div className="card" style={{ padding: 22 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} color="#10b981" /> Quality & Facility Telemetry
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>QC ACTIVE LOTS</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                    {data.quality_control.active_lots} Lots
                  </div>
                  <div style={{ fontSize: 11, color: '#10b981', marginTop: 2 }}>
                    {data.quality_control.compliance_percent}% Compliance
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>WESTGARD VIOLATIONS</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: data.quality_control.westgard_alerts > 0 ? '#f59e0b' : '#10b981', marginTop: 4 }}>
                    {data.quality_control.westgard_alerts} Alerts
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    Levey-Jennings Shifts
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>FACILITY ASSETS</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                    {data.equipment.operational} / {data.equipment.total_assets}
                  </div>
                  <div style={{ fontSize: 11, color: '#10b981', marginTop: 2 }}>
                    {data.equipment.uptime_percent}% Equipment Uptime
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>REAGENT SHORTAGE</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: data.inventory.low_stock_items > 0 ? '#dc2626' : '#10b981', marginTop: 4 }}>
                    {data.inventory.low_stock_items} SKUs
                  </div>
                  <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>
                    Below Minimum Stock
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <Link to="/quality-control" className="btn btn-secondary" style={{ flex: 1, fontSize: 12, textAlign: 'center' }}>
                  QC Charts
                </Link>
                <Link to="/equipment" className="btn btn-secondary" style={{ flex: 1, fontSize: 12, textAlign: 'center' }}>
                  Assets Roster
                </Link>
              </div>
            </div>
          </div>

          {/* Section 3: Governance, Tiered Approvals & Security Alerts */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16
          }}>
            <div className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: '#e0f2fe',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Lock size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>ACTIVE USER SESSIONS</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{data.governance.active_sessions} Active</div>
                <Link to="/security-center" style={{ fontSize: 11, color: '#0284c7', fontWeight: 600 }}>
                  Audit Concurrent Logins →
                </Link>
              </div>
            </div>

            <div className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AlertOctagon size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>TIERED WORKFLOW APPROVALS</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{data.governance.pending_approvals} Pending</div>
                <Link to="/approvals" style={{ fontSize: 11, color: '#d97706', fontWeight: 600 }}>
                  Review Discounts & Refunds →
                </Link>
              </div>
            </div>

            <div className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: '#ecfdf5',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShieldAlert size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>SECURITY AUDIT STREAM</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{data.governance.security_alerts} Critical</div>
                <Link to="/security-center" style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>
                  Open Threat Center →
                </Link>
              </div>
            </div>
          </div>

        </div>
      ) : null}
    </div>
  );
};

export default EnterpriseCommandCenter;
