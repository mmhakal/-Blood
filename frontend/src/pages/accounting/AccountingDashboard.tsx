import React, { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, Clock, ShieldCheck,
  CreditCard, ArrowUpRight, ArrowDownRight, Wallet, PieChart,
  FileSpreadsheet, Filter, Plus, Calendar
} from 'lucide-react';
import api from '../../services/api';
import { Link } from 'react-router-dom';

export const AccountingDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    loadDashboard();
  }, [branchFilter]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      let endpoint = '/accounting/dashboard';
      if (branchFilter) endpoint += `?branch_id=${branchFilter}`;
      const res = await api.get(endpoint);
      setData(res);
    } catch (err) {
      console.error('Failed to load accounting dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Financial Management & Accounting</h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>Real-time revenue recognition, expense ledger, receivables aging & cash closings</p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              backgroundColor: '#fff'
            }}
          >
            <option value="">All Laboratory Branches</option>
            {data?.branches?.map((b: any) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <Link
            to="/accounting/expenses"
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            <Plus size={16} />
            <span>Record Expense</span>
          </Link>
        </div>
      </div>

      {/* Main KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Gross Billing */}
        <div style={{ backgroundColor: '#fff', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Total Gross Billing</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>₹{(data?.total_billing || 0).toLocaleString()}</div>
          <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 500 }}>Diagnostic service invoices</span>
        </div>

        {/* Collections */}
        <div style={{ backgroundColor: '#fff', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Collections Received</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowDownRight size={18} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>₹{(data?.total_collected || 0).toLocaleString()}</div>
          <span style={{ fontSize: 11, color: '#059669', fontWeight: 500 }}>Paid into lab accounts</span>
        </div>

        {/* Total Expenses */}
        <div style={{ backgroundColor: '#fff', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Operating Expenses</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>₹{(data?.total_expenses || 0).toLocaleString()}</div>
          <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 500 }}>Reagents, kits & overheads</span>
        </div>

        {/* Net Profit / Revenue */}
        <div style={{ backgroundColor: '#fff', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Net Operating Margin</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={18} />
            </div>
          </div>
          <div style={{
            fontSize: 24,
            fontWeight: 700,
            color: (data?.net_revenue || 0) >= 0 ? '#16a34a' : '#b91c1c'
          }}>
            ₹{(data?.net_revenue || 0).toLocaleString()}
          </div>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Collected minus Expenses</span>
        </div>

        {/* Accounts Receivable */}
        <div style={{ backgroundColor: '#fff', padding: 18, borderRadius: 12, border: '1px solid #fee2e2', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#991b1b' }}>Total Outstanding Due</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>₹{(data?.total_outstanding || 0).toLocaleString()}</div>
          <Link to="/accounting/receivables" style={{ fontSize: 11, color: '#dc2626', textDecoration: 'none', fontWeight: 600 }}>
            View Aging Buckets →
          </Link>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
        <Link to="/accounting/expenses" style={{ textDecoration: 'none' }}>
          <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0', transition: 'box-shadow 0.2s', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingDown size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Expense Manager</h3>
                <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>Track purchases, supplies & vouchers</p>
              </div>
            </div>
          </div>
        </Link>

        <Link to="/accounting/ledger" style={{ textDecoration: 'none' }}>
          <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0', transition: 'box-shadow 0.2s', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>General Ledger</h3>
                <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>Audit debit / credit transactions</p>
              </div>
            </div>
          </div>
        </Link>

        <Link to="/accounting/receivables" style={{ textDecoration: 'none' }}>
          <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0', transition: 'box-shadow 0.2s', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Receivables Aging</h3>
                <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>30, 60, 90+ days overdue analysis</p>
              </div>
            </div>
          </div>
        </Link>

        <Link to="/accounting/cash-closing" style={{ textDecoration: 'none' }}>
          <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0', transition: 'box-shadow 0.2s', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Shift Cash Closing</h3>
                <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>Front-desk drawer reconciliation</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Two Column Layout: Payment Modes Breakdown & Recent Expenses */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Payment Modes Breakdown */}
        <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Collections by Payment Method</h3>
          {data?.payment_modes?.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No payment collection records available.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data?.payment_modes?.map((pm: any) => {
                const pct = data.total_collected > 0 ? ((pm.total / data.total_collected) * 100).toFixed(1) : 0;
                return (
                  <div key={pm.payment_method}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: '#334155' }}>{pm.payment_method}</span>
                      <span><strong>₹{pm.total.toLocaleString()}</strong> ({pct}%)</span>
                    </div>
                    <div style={{ width: '100%', height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#0284c7', borderRadius: 4 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Expenses List */}
        <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Recent Expense Entries</h3>
            <Link to="/accounting/expenses" style={{ fontSize: 12, color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}>
              View All →
            </Link>
          </div>

          {data?.recent_expenses?.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No expenses recorded yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data?.recent_expenses?.slice(0, 5).map((exp: any) => (
                <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{exp.title}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{exp.category_name} • {exp.payee || 'Direct'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>-₹{exp.amount}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(exp.expense_date).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
