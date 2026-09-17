import React, { useState, useEffect } from 'react';
import { Clock, Search, Building2, AlertTriangle, CheckCircle2, Send, PhoneCall, ExternalLink } from 'lucide-react';
import api from '../../services/api';
import { Link } from 'react-router-dom';

export const ReceivablesManager: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadReceivables();
  }, [selectedBranch]);

  const loadReceivables = async () => {
    setLoading(true);
    try {
      let endpoint = '/accounting/receivables';
      if (selectedBranch) endpoint += `?branch_id=${selectedBranch}`;

      const [recvRes, branchRes] = await Promise.all([
        api.get(endpoint),
        api.get('/branches')
      ]);

      setData(recvRes);
      setBranches(branchRes);
    } catch (err) {
      console.error('Failed to load accounts receivables', err);
    } finally {
      setLoading(false);
    }
  };

  const aging = data?.aging_summary || {
    total_due: 0,
    current: 0,
    days_1_30: 0,
    days_31_60: 0,
    days_61_90: 0,
    days_90_plus: 0
  };

  const invoices = data?.invoices || [];
  const filtered = invoices.filter((i: any) =>
    (i.patient_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.invoice_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.mobile || '').includes(search)
  );

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Accounts Receivable & Aging Ledger</h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>Track outstanding diagnostic fees across aging brackets (1-30, 31-60, 61-90, 90+ days)</p>
        </div>

        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, backgroundColor: '#fff' }}
        >
          <option value="">All Laboratory Branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Aging Summary Buckets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 10, border: '1px solid #fee2e2' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', marginBottom: 6 }}>
            Total Receivables Due
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#dc2626' }}>
            ₹{Number(aging.total_due).toLocaleString()}
          </div>
          <span style={{ fontSize: 11, color: '#64748b' }}>All unpaid balances</span>
        </div>

        <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', marginBottom: 6 }}>
            Current / 0-30 Days
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#059669' }}>
            ₹{Number(aging.days_1_30 || aging.current || 0).toLocaleString()}
          </div>
          <span style={{ fontSize: 11, color: '#64748b' }}>Normal billing cycle</span>
        </div>

        <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 10, border: '1px solid #fed7aa' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#c2410c', textTransform: 'uppercase', marginBottom: 6 }}>
            31 - 60 Days Overdue
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#ea580c' }}>
            ₹{Number(aging.days_31_60 || 0).toLocaleString()}
          </div>
          <span style={{ fontSize: 11, color: '#64748b' }}>Follow-up required</span>
        </div>

        <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 10, border: '1px solid #fecaca' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', marginBottom: 6 }}>
            61 - 90 Days Overdue
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#dc2626' }}>
            ₹{Number(aging.days_61_90 || 0).toLocaleString()}
          </div>
          <span style={{ fontSize: 11, color: '#64748b' }}>High aging priority</span>
        </div>

        <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 10, border: '1px solid #f87171' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7f1d1d', textTransform: 'uppercase', marginBottom: 6 }}>
            90+ Days (Bad Debt Risk)
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#991b1b' }}>
            ₹{Number(aging.days_90_plus || 0).toLocaleString()}
          </div>
          <span style={{ fontSize: 11, color: '#64748b' }}>Critical recovery attention</span>
        </div>
      </div>

      {/* Filter and Invoices Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 340 }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by patient, phone or invoice #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
            />
          </div>

          <span style={{ fontSize: 13, color: '#64748b' }}>Showing {filtered.length} pending balances</span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading receivables aging...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#16a34a' }}>
            <CheckCircle2 size={36} style={{ margin: '0 auto 8px', color: '#16a34a' }} />
            <div>All invoices are fully settled! No outstanding receivables found.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 14px' }}>Invoice #</th>
                  <th style={{ padding: '12px 14px' }}>Patient Details</th>
                  <th style={{ padding: '12px 14px' }}>Branch</th>
                  <th style={{ padding: '12px 14px' }}>Invoice Date</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Total Billed</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Paid</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Outstanding Due</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Settlement</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv: any) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0284c7' }}>{inv.invoice_number}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{inv.patient_name}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{inv.patient_id_code} • {inv.mobile}</div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>{inv.branch_name || 'Central'}</td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>₹{Number(inv.total_amount).toLocaleString()}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#059669' }}>₹{Number(inv.paid_amount || 0).toLocaleString()}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                      ₹{Number(inv.due).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <Link
                        to={`/billing?search=${inv.invoice_number}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '4px 10px',
                          borderRadius: 6,
                          backgroundColor: '#0284c7',
                          color: '#fff',
                          textDecoration: 'none',
                          fontSize: 12,
                          fontWeight: 600
                        }}
                      >
                        <span>Settle</span>
                        <ExternalLink size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
