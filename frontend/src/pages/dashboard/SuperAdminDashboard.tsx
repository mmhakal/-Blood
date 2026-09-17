import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, CreditCard, Activity, DollarSign,
  AlertTriangle, ShieldCheck, ArrowUpRight, Plus, CheckCircle2,
  Clock, GitBranch, Bell, ShieldAlert, BarChart3, RefreshCw
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export const SuperAdminDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { error } = useNotification();
  const navigate = useNavigate();

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/analytics/superadmin');
      setData(res);
    } catch (err: any) {
      error(err.message || 'Failed to load system metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading system metrics...</div>;
  }

  const metrics = data?.metrics || {
    total_laboratories: data?.total_laboratories || 0,
    active_laboratories: data?.active_laboratories || 0,
    suspended_laboratories: data?.suspended_laboratories || 0,
    total_branches: data?.total_branches || 0,
    total_users: data?.total_users || 0,
    total_patients: data?.total_patients || 0,
    total_orders: data?.total_orders || 0,
    active_subscriptions: data?.active_subscriptions || 0,
    expiring_subscriptions: 1,
    expired_subscriptions: data?.expired_subscriptions || 0,
    total_revenue: data?.subscription_revenue || 0
  };

  const recentActivity = data?.recent_activity || [];
  const recentLabs = data?.recent_laboratories || [];
  const planDistribution = data?.charts?.plan_distribution || [];

  return (
    <div>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Super Admin Enterprise Dashboard</h1>
          <p style={{ fontSize: 13.5, color: '#64748b' }}>
            System-wide multi-tenant governance, subscription monitoring, and laboratory health.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => navigate('/laboratories')} className="btn btn-primary">
            <Plus size={16} />
            <span>Add Laboratory</span>
          </button>
          <button onClick={() => navigate('/subscriptions')} className="btn btn-secondary">
            <CreditCard size={16} />
            <span>Manage Plans</span>
          </button>
          <button onClick={fetchStats} className="btn btn-outline" title="Refresh Metrics">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid (4 Columns) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, marginBottom: 24 }}>
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
            <Building2 size={24} />
          </div>
          <div>
            <div className="metric-value">{metrics.total_laboratories}</div>
            <div className="metric-label">Total Laboratories</div>
            <div style={{ fontSize: 11, color: '#059669', fontWeight: 600, marginTop: 2 }}>
              {metrics.active_laboratories} Active ({metrics.suspended_laboratories} Suspended)
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div className="metric-value">₹{(metrics.total_revenue || 0).toLocaleString('en-IN')}</div>
            <div className="metric-label">Subscription Revenue</div>
            <div style={{ fontSize: 11, color: '#0284c7', fontWeight: 600, marginTop: 2 }}>
              {metrics.active_subscriptions} Active Subscriptions
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>
            <Users size={24} />
          </div>
          <div>
            <div className="metric-value">{metrics.total_users}</div>
            <div className="metric-label">System Users</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              Across {metrics.total_branches} Branches
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#ede9fe', color: '#7c3aed' }}>
            <Activity size={24} />
          </div>
          <div>
            <div className="metric-value">{metrics.total_patients}</div>
            <div className="metric-label">Total Patients</div>
            <div style={{ fontSize: 11, color: '#059669', fontWeight: 600, marginTop: 2 }}>
              {metrics.total_orders} Diagnostic Orders
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Alert Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
        marginBottom: 24
      }}>
        <div style={{
          backgroundColor: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: 10,
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>Active Subscriptions</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#065f46' }}>{metrics.active_subscriptions}</div>
          </div>
          <CheckCircle2 size={28} color="#059669" />
        </div>

        <div style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: 10,
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>Expiring Soon (&le; 15 Days)</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#92400e' }}>{metrics.expiring_subscriptions}</div>
          </div>
          <AlertTriangle size={28} color="#d97706" />
        </div>

        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 10,
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase' }}>Expired / Suspended</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#991b1b' }}>{metrics.suspended_laboratories + metrics.expired_subscriptions}</div>
          </div>
          <ShieldAlert size={28} color="#dc2626" />
        </div>
      </div>

      {/* Main Grid: Laboratories List & Recent Activity Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: 24, marginBottom: 24 }}>
        {/* Recent Registered Laboratories */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Building2 size={18} color="#0284c7" />
              Recent Laboratories Onboarded
            </h3>
            <button onClick={() => navigate('/laboratories')} className="btn btn-outline btn-sm">
              View All
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Laboratory</th>
                  <th>City</th>
                  <th>Plan Tier</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentLabs.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
                      No laboratories recorded.
                    </td>
                  </tr>
                ) : (
                  recentLabs.map((lab: any) => (
                    <tr
                      key={lab.id}
                      onClick={() => navigate(`/laboratories/${lab.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{lab.name}</div>
                        <code style={{ fontSize: 11, color: '#0284c7' }}>{lab.code}</code>
                      </td>
                      <td>{lab.city || 'Delhi'}</td>
                      <td>
                        <span className="badge badge-info">{lab.plan_name || 'Enterprise'}</span>
                      </td>
                      <td>
                        <span className={`badge ${lab.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                          {lab.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Audit Activity Feed */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Clock size={18} color="#0284c7" />
              Live Audit & Security Feed
            </h3>
            <button onClick={() => navigate('/audit-logs')} className="btn btn-outline btn-sm">
              Full Logs
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentActivity.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
                No recent audit activities.
              </div>
            ) : (
              recentActivity.slice(0, 6).map((item: any) => (
                <div
                  key={item.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    backgroundColor: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12.5
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="badge badge-info" style={{ fontSize: 10, padding: '1px 6px' }}>
                        {item.action}
                      </span>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.user_email || 'System'}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      {item.entity_type} {item.lab_name ? `• ${item.lab_name}` : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Subscription Plans Distribution */}
      {planDistribution.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3 className="card-title">
              <BarChart3 size={18} color="#0284c7" />
              Subscription Plan Distribution Across Network
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {planDistribution.map((p: any) => (
              <div key={p.code} style={{ padding: 14, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1' }}>{p.plan_name}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>{p.count}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Assigned Laboratories</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
