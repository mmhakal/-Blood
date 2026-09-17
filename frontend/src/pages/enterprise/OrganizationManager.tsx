import React, { useState, useEffect } from 'react';
import {
  Building2, Plus, Users, GitBranch, IndianRupee, Layers,
  ExternalLink, CheckCircle, ShieldCheck, ChevronRight,
  TrendingUp, BarChart2, RefreshCw, Globe, MapPin, Mail, Phone
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Organization {
  id: string;
  name: string;
  code: string;
  logo_url?: string;
  billing_currency: string;
  contact_email?: string;
  contact_phone?: string;
  headquarters_address?: string;
  status: string;
  lab_count: number;
  user_count: number;
}

interface ConsolidatedAnalytics {
  organization_id: string;
  total_member_labs: number;
  consolidated: {
    total_revenue_inr: number;
    total_orders_count: number;
    total_patients_count: number;
  };
  comparative: Array<{
    lab_id: string;
    lab_name: string;
    lab_code: string;
    revenue_inr: number;
    orders_count: number;
    patients_count: number;
  }>;
}

export const OrganizationManager: React.FC = () => {
  const { token, user } = useAuth();
  const isSuperAdmin = user?.role_code === 'super_admin';

  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [analytics, setAnalytics] = useState<ConsolidatedAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCurrency, setFormCurrency] = useState('INR');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/organizations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrgs(data);
        if (data.length > 0 && !selectedOrgId) {
          setSelectedOrgId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load organizations', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async (orgId: string) => {
    try {
      const res = await fetch(`/api/organizations/${orgId}/consolidated-analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Failed to load analytics', err);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrgId) {
      fetchAnalytics(selectedOrgId);
    }
  }, [selectedOrgId]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formCode) return;
    try {
      setSubmitting(true);
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formName,
          code: formCode,
          billing_currency: formCurrency,
          contact_email: formEmail,
          contact_phone: formPhone,
          headquarters_address: formAddress
        })
      });
      if (res.ok) {
        setShowCreateModal(false);
        setFormName('');
        setFormCode('');
        fetchOrganizations();
      }
    } catch (err) {
      console.error('Failed to create organization', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1600, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Enterprise Multi-Lab Hierarchy & Networks
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Manage parent organizations, consolidated billing groups, cross-lab administration & facility comparative performance
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Plus size={16} /> New Organization
          </button>
        )}
      </div>

      {/* Main Grid: Org Selector & Consolidated Comparative Analytics */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
        {/* Left Column: Organization Directory */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Healthcare Networks ({orgs.length})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {orgs.map((org) => {
                const isSelected = org.id === selectedOrgId;
                return (
                  <div
                    key={org.id}
                    onClick={() => setSelectedOrgId(org.id)}
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      cursor: 'pointer',
                      border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                      background: isSelected ? '#f0f9ff' : '#ffffff',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: isSelected ? '#0369a1' : '#1e293b' }}>
                        {org.name}
                      </span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        background: isSelected ? '#e0f2fe' : '#f1f5f9',
                        color: isSelected ? '#0284c7' : '#64748b',
                        padding: '2px 6px',
                        borderRadius: 4
                      }}>
                        {org.code}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12, color: '#64748b' }}>
                      <span><Building2 size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> {org.lab_count} Labs</span>
                      <span><Users size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> {org.user_count} Central Staff</span>
                      <span><IndianRupee size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> {org.billing_currency}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Consolidated Analytics & Member Labs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {analytics ? (
            <>
              {/* Consolidated KPIs */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16
              }}>
                <div className="card" style={{ padding: 18, borderLeft: '4px solid #0284c7' }}>
                  <div style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>CONSOLIDATED REVENUE</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 6 }}>
                    ₹{Number(analytics.consolidated.total_revenue_inr).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>Across all member laboratories</div>
                </div>

                <div className="card" style={{ padding: 18, borderLeft: '4px solid #8b5cf6' }}>
                  <div style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>TOTAL REQUISITIONS</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 6 }}>
                    {analytics.consolidated.total_orders_count} Orders
                  </div>
                  <div style={{ fontSize: 11, color: '#8b5cf6', marginTop: 4 }}>Network volume</div>
                </div>

                <div className="card" style={{ padding: 18, borderLeft: '4px solid #10b981' }}>
                  <div style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>CUMULATIVE PATIENTS</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 6 }}>
                    {analytics.consolidated.total_patients_count} Patients
                  </div>
                  <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>Shared master patient index</div>
                </div>

                <div className="card" style={{ padding: 18, borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>MEMBER LABORATORIES</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 6 }}>
                    {analytics.total_member_labs} Facilities
                  </div>
                  <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>Unified network</div>
                </div>
              </div>

              {/* Comparative Multi-Lab Performance Table */}
              <div className="card" style={{ padding: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                      Laboratory Comparative Breakdown
                    </h3>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 12 }}>
                      Benchmarking member laboratories by billing collections, requisition depth and patient demographics
                    </p>
                  </div>
                </div>

                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                      <th style={{ padding: '10px 14px' }}>LABORATORY</th>
                      <th style={{ padding: '10px 14px' }}>CODE</th>
                      <th style={{ padding: '10px 14px' }}>TOTAL REVENUE</th>
                      <th style={{ padding: '10px 14px' }}>ORDER VOLUME</th>
                      <th style={{ padding: '10px 14px' }}>PATIENTS</th>
                      <th style={{ padding: '10px 14px' }}>SHARE %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.comparative.map((lab) => {
                      const sharePct = analytics.consolidated.total_revenue_inr > 0
                        ? Math.round((lab.revenue_inr / analytics.consolidated.total_revenue_inr) * 100)
                        : 0;

                      return (
                        <tr key={lab.lab_id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: '#1e293b' }}>
                            {lab.lab_name}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#64748b' }}>
                            <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>
                              {lab.lab_code}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>
                            ₹{lab.revenue_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#475569' }}>
                            {lab.orders_count} orders
                          </td>
                          <td style={{ padding: '12px 14px', color: '#475569' }}>
                            {lab.patients_count}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${sharePct}%`, height: '100%', background: '#0284c7' }} />
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', width: 30 }}>{sharePct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              Select an organization to inspect consolidated comparative intelligence.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Organization */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 16
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, padding: 24, borderRadius: 14 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 16px', color: '#0f172a' }}>
              Register Enterprise Healthcare Organization
            </h2>

            <form onSubmit={handleCreateOrg} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                  ORGANIZATION NAME *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apollo Healthcare Diagnostics"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                    UNIQUE CODE *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. APOLLO-NET"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                    BILLING CURRENCY
                  </label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="AED">AED (د.إ)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                  CONTACT EMAIL
                </label>
                <input
                  type="email"
                  placeholder="admin@healthcarenetwork.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                  HEADQUARTERS ADDRESS
                </label>
                <input
                  type="text"
                  placeholder="Connaught Place, Central Wing, New Delhi"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? 'Creating...' : 'Provision Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationManager;
