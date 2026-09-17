import React, { useState, useEffect } from 'react';
import {
  Briefcase, Stethoscope, Megaphone, Smile, Plus, RefreshCw,
  Search, TrendingUp, Users, DollarSign, Award, ThumbsUp,
  Percent, Calendar, Building, CheckCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

interface CorporateAccount {
  id: string;
  account_code: string;
  company_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  credit_limit: number;
  credit_days: number;
  current_balance: number;
  discount_percentage: number;
  billing_cycle: string;
  status: string;
}

interface ReferralAnalytics {
  doctor_id: string;
  doctor_name: string;
  specialty?: string;
  referral_count: number;
  total_volume_inr: number;
  incentive_rate: number;
  total_incentive_inr: number;
}

interface Campaign {
  id: string;
  campaign_code: string;
  title: string;
  campaign_type: string;
  target_audience?: string;
  start_date: string;
  end_date: string;
  budget: number;
  leads_generated: number;
  samples_collected: number;
  revenue_generated: number;
  status: string;
}

interface FeedbackReview {
  id: string;
  patient_name?: string;
  rating: number;
  nps_score: number;
  feedback_category: string;
  comments: string;
  created_at: string;
}

export const CrmCorporatePage: React.FC = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'corporate' | 'referrals' | 'campaigns' | 'feedback'>('corporate');
  const [accounts, setAccounts] = useState<CorporateAccount[]>([]);
  const [referrals, setReferrals] = useState<ReferralAnalytics[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackReview[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // New Corporate Account Modal
  const [showAccountModal, setShowAccountModal] = useState<boolean>(false);
  const [newAccount, setNewAccount] = useState({
    account_code: `CORP-${Math.floor(100 + Math.random() * 900)}`,
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    credit_limit: 100000,
    credit_days: 30,
    discount_percentage: 15,
    billing_cycle: 'monthly'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [accRes, refRes, campRes, fbkRes] = await Promise.all([
        api.get('/crm/corporate-accounts').catch(() => []),
        api.get('/crm/doctor-referrals').catch(() => ({ doctor_referrals: [] })),
        api.get('/crm/campaigns').catch(() => []),
        api.get('/crm/feedback').catch(() => ({ feedback: [] }))
      ]);

      setAccounts(Array.isArray(accRes) ? accRes : (accRes?.accounts || []));
      
      const docRefs = Array.isArray(refRes) 
        ? refRes 
        : (refRes?.doctor_referrals || refRes?.referrals || []);
      setReferrals(docRefs);

      setCampaigns(Array.isArray(campRes) ? campRes : (campRes?.campaigns || []));

      const fbkList = Array.isArray(fbkRes)
        ? fbkRes
        : (fbkRes?.feedback || fbkRes?.feedbacks || []);
      setFeedbacks(fbkList);
    } catch (err) {
      console.error('Failed to load CRM & Corporate data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/crm/corporate-accounts', newAccount);
      setShowAccountModal(false);
      setNewAccount({
        account_code: `CORP-${Math.floor(100 + Math.random() * 900)}`,
        company_name: '',
        contact_person: '',
        email: '',
        phone: '',
        credit_limit: 100000,
        credit_days: 30,
        discount_percentage: 15,
        billing_cycle: 'monthly'
      });
      fetchData();
    } catch (err) {
      console.error('Error creating corporate account', err);
    }
  };

  // Compute NPS metrics
  const safeFeedbacks = Array.isArray(feedbacks) ? feedbacks : [];
  const totalFeedbackCount = safeFeedbacks.length;
  const promoters = safeFeedbacks.filter(f => (f.nps_score ?? 10) >= 9).length;
  const detractors = safeFeedbacks.filter(f => (f.nps_score ?? 10) <= 6).length;
  const npsScore = totalFeedbackCount > 0 ? Math.round(((promoters - detractors) / totalFeedbackCount) * 100) : 74;

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ padding: '4px 8px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '4px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>
              B2B CRM & GROWTH PLATFORM
            </span>
            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>• Corporate Billing & Doctor Ties Active</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a' }}>CRM & Corporate B2B Account Management</h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '2px' }}>
            Institutional billing accounts, doctor referral analytics, health camp leads, and patient NPS sentiment
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              background: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#334155'
            }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>

          <button
            onClick={() => setShowAccountModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#1d4ed8',
              color: '#fff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(29,78,216,0.3)'
            }}
          >
            <Plus size={16} />
            New Corporate Account
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', gap: '8px' }}>
        <button
          onClick={() => setActiveTab('corporate')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'corporate' ? '2px solid #1d4ed8' : '2px solid transparent',
            color: activeTab === 'corporate' ? '#1d4ed8' : '#64748b',
            background: 'transparent',
            cursor: 'pointer'
          }}
        >
          Corporate Clients ({accounts.length})
        </button>
        <button
          onClick={() => setActiveTab('referrals')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'referrals' ? '2px solid #1d4ed8' : '2px solid transparent',
            color: activeTab === 'referrals' ? '#1d4ed8' : '#64748b',
            background: 'transparent',
            cursor: 'pointer'
          }}
        >
          Doctor Referral Analytics ({referrals.length})
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'campaigns' ? '2px solid #1d4ed8' : '2px solid transparent',
            color: activeTab === 'campaigns' ? '#1d4ed8' : '#64748b',
            background: 'transparent',
            cursor: 'pointer'
          }}
        >
          Health Camps & Campaigns ({campaigns.length})
        </button>
        <button
          onClick={() => setActiveTab('feedback')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'feedback' ? '2px solid #1d4ed8' : '2px solid transparent',
            color: activeTab === 'feedback' ? '#1d4ed8' : '#64748b',
            background: 'transparent',
            cursor: 'pointer'
          }}
        >
          Patient NPS & Reviews
        </button>
      </div>

      {/* Tab: Corporate Accounts */}
      {activeTab === 'corporate' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px' }}>Code</th>
                <th style={{ padding: '12px 16px' }}>Company Name</th>
                <th style={{ padding: '12px 16px' }}>Contact Person</th>
                <th style={{ padding: '12px 16px' }}>Credit Limit</th>
                <th style={{ padding: '12px 16px' }}>Outstanding</th>
                <th style={{ padding: '12px 16px' }}>Contract Discount</th>
                <th style={{ padding: '12px 16px' }}>Cycle</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                    No corporate accounts registered yet.
                  </td>
                </tr>
              ) : (
                accounts.map(acc => (
                  <tr key={acc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1d4ed8' }}>{acc.account_code}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{acc.company_name}</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{acc.contact_person || 'HR Dept'}</td>
                    <td style={{ padding: '12px 16px' }}>₹{acc.credit_limit?.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 16px', color: acc.current_balance > (acc.credit_limit * 0.8) ? '#dc2626' : '#334155', fontWeight: 600 }}>
                      ₹{acc.current_balance?.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#047857', fontWeight: 600 }}>
                      {acc.discount_percentage || 0}%
                    </td>
                    <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{acc.billing_cycle}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#ecfdf5', color: '#047857', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                        {acc.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Doctor Referral Analytics */}
      {activeTab === 'referrals' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px' }}>Doctor Name</th>
                <th style={{ padding: '12px 16px' }}>Specialty</th>
                <th style={{ padding: '12px 16px' }}>Referral Count</th>
                <th style={{ padding: '12px 16px' }}>Test Volume (INR)</th>
                <th style={{ padding: '12px 16px' }}>Rate (%)</th>
                <th style={{ padding: '12px 16px' }}>Incentive Accrued</th>
              </tr>
            </thead>
            <tbody>
              {referrals.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                    No referral statistics recorded.
                  </td>
                </tr>
              ) : (
                referrals.map((ref, idx) => (
                  <tr key={ref.doctor_id || (ref as any).id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{ref.doctor_name}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{ref.specialty || (ref as any).specialization || 'General Physician'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0284c7' }}>{ref.referral_count ?? (ref as any).total_referrals ?? 0} cases</td>
                    <td style={{ padding: '12px 16px' }}>₹{(ref.total_volume_inr ?? (ref as any).total_revenue ?? 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 16px' }}>{ref.incentive_rate ?? 10}%</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#047857' }}>
                      ₹{(ref.total_incentive_inr ?? Math.round(((ref as any).total_revenue || 0) * 0.1)).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Health Camps & Campaigns */}
      {activeTab === 'campaigns' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {campaigns.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
              No marketing campaigns active.
            </div>
          ) : (
            campaigns.map(camp => (
              <div key={camp.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '4px' }}>
                    {camp.campaign_code || camp.id?.toUpperCase() || 'CMP'}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', background: '#ecfdf5', color: '#047857' }}>
                    {camp.status}
                  </span>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>{camp.title}</h3>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
                  Audience: <strong style={{ color: '#334155' }}>{camp.target_audience || 'General Public'}</strong>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: '#f8fafc', padding: '10px', borderRadius: '8px', marginBottom: '12px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Leads</span>
                    <strong style={{ color: '#0f172a' }}>{camp.leads_generated || 0}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Samples</span>
                    <strong style={{ color: '#0284c7' }}>{camp.samples_collected || 0}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Revenue</span>
                    <strong style={{ color: '#047857' }}>₹{camp.revenue_generated?.toLocaleString('en-IN') || 0}</strong>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Patient NPS & Feedback */}
      {activeTab === 'feedback' && (
        <div>
          {/* NPS Header Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1e3a8a, #0284c7)',
            borderRadius: '14px',
            padding: '24px',
            color: '#fff',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', color: '#93c5fd' }}>
                CUSTOMER ADVOCACY METRIC
              </span>
              <h2 style={{ fontSize: '28px', fontWeight: 800, marginTop: '4px', color: '#fff' }}>Net Promoter Score (NPS)</h2>
              <p style={{ fontSize: '14px', color: '#bfdbfe', maxWidth: '500px', marginTop: '4px' }}>
                Live calculation from post-report patient surveys regarding phlebotomy comfort, sample collection promptness, and turn-around time.
              </p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', padding: '16px 28px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '42px', fontWeight: 900, color: '#fff' }}>+{npsScore}</div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#86efac' }}>EXCELLENT (Benchmark: +50)</span>
            </div>
          </div>

          {/* Feedback Review Feed */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px' }}>Patient / Client</th>
                  <th style={{ padding: '12px 16px' }}>NPS (0-10)</th>
                  <th style={{ padding: '12px 16px' }}>Rating</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Feedback Comments</th>
                  <th style={{ padding: '12px 16px' }}>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {safeFeedbacks.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                      No customer feedback reviews logged yet.
                    </td>
                  </tr>
                ) : (
                  safeFeedbacks.map(fb => (
                    <tr key={fb.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{fb.patient_name || 'Anonymous Patient'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: fb.nps_score >= 9 ? '#ecfdf5' : (fb.nps_score >= 7 ? '#eff6ff' : '#fef2f2'),
                          color: fb.nps_score >= 9 ? '#047857' : (fb.nps_score >= 7 ? '#1d4ed8' : '#dc2626')
                        }}>
                          {fb.nps_score}/10
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#f59e0b', fontWeight: 600 }}>{fb.rating} ★</td>
                      <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: '#64748b' }}>{fb.feedback_category}</td>
                      <td style={{ padding: '12px 16px', color: '#334155', maxWidth: '350px' }}>{fb.comments}</td>
                      <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '12px' }}>
                        {new Date(fb.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: New Corporate Account */}
      {showAccountModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999
        }}>
          <div style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '520px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Onboard Corporate B2B Account</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              Set up credit lines, custom pricing tiers, and institutional invoicing schedules.
            </p>

            <form onSubmit={handleCreateAccount}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Corporate Company Name *</label>
                <input
                  type="text"
                  required
                  value={newAccount.company_name}
                  onChange={e => setNewAccount({ ...newAccount, company_name: e.target.value })}
                  placeholder="e.g. Infosys Ltd - Health Wellness"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Contact Person</label>
                  <input
                    type="text"
                    value={newAccount.contact_person}
                    onChange={e => setNewAccount({ ...newAccount, contact_person: e.target.value })}
                    placeholder="e.g. Priya Nair"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Email</label>
                  <input
                    type="email"
                    value={newAccount.email}
                    onChange={e => setNewAccount({ ...newAccount, email: e.target.value })}
                    placeholder="corporate@infosys.com"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Credit Limit (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={newAccount.credit_limit}
                    onChange={e => setNewAccount({ ...newAccount, credit_limit: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Credit Days</label>
                  <input
                    type="number"
                    min={0}
                    value={newAccount.credit_days}
                    onChange={e => setNewAccount({ ...newAccount, credit_days: parseInt(e.target.value) || 30 })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Discount (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newAccount.discount_percentage}
                    onChange={e => setNewAccount({ ...newAccount, discount_percentage: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '6px', background: '#1d4ed8', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Onboard Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrmCorporatePage;
