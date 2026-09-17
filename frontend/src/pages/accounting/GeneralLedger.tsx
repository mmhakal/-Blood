import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Search, Filter, ArrowDownLeft, ArrowUpRight, Building2, Download } from 'lucide-react';
import api from '../../services/api';

export const GeneralLedger: React.FC = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [accountType, setAccountType] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadLedger();
  }, [selectedBranch, accountType]);

  const loadLedger = async () => {
    setLoading(true);
    try {
      let endpoint = '/accounting/ledger?';
      if (selectedBranch) endpoint += `branch_id=${selectedBranch}&`;
      if (accountType) endpoint += `account_type=${accountType}&`;

      const [ledgerRes, branchRes] = await Promise.all([
        api.get(endpoint),
        api.get('/branches')
      ]);
      setEntries(ledgerRes);
      setBranches(branchRes);
    } catch (err) {
      console.error('Failed to load ledger', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = entries.filter(e =>
    (e.description || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.reference_type || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.account_type || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalDebits = filtered.reduce((acc, curr) => acc + Number(curr.debit || 0), 0);
  const totalCredits = filtered.reduce((acc, curr) => acc + Number(curr.credit || 0), 0);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>General Accounting Ledger</h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>Double-entry audit trail of laboratory billing receipts, expense disbursements & adjustments</p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ padding: '8px 14px', backgroundColor: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe', fontSize: 13 }}>
            <span style={{ color: '#1e40af' }}>Total Debits: </span>
            <strong style={{ color: '#2563eb' }}>₹{totalDebits.toLocaleString()}</strong>
          </div>
          <div style={{ padding: '8px 14px', backgroundColor: '#ecfdf5', borderRadius: 8, border: '1px solid #a7f3d0', fontSize: 13 }}>
            <span style={{ color: '#065f46' }}>Total Credits: </span>
            <strong style={{ color: '#059669' }}>₹{totalCredits.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', backgroundColor: '#fff', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 20, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search ledger by narrative, reference or account..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
          />
        </div>

        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, backgroundColor: '#fff' }}
        >
          <option value="">All Branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <select
          value={accountType}
          onChange={(e) => setAccountType(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, backgroundColor: '#fff' }}
        >
          <option value="">All Account Classifications</option>
          <option value="revenue">Revenue</option>
          <option value="expense">Expense</option>
          <option value="asset">Asset / Cash</option>
          <option value="receivable">Accounts Receivable</option>
          <option value="liability">Liability</option>
        </select>
      </div>

      {/* Ledger Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Generating ledger statements...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No ledger transactions recorded for current criteria.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 14px' }}>Transaction Timestamp</th>
                  <th style={{ padding: '12px 14px' }}>Account Type</th>
                  <th style={{ padding: '12px 14px' }}>Ref / Trigger</th>
                  <th style={{ padding: '12px 14px' }}>Description / Narrative</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Debit (DR)</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Credit (CR)</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Closing Balance</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <tr key={entry.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', color: '#64748b', fontSize: 12 }}>
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        backgroundColor: entry.account_type === 'revenue' ? '#ecfdf5' : entry.account_type === 'expense' ? '#fef2f2' : '#eff6ff',
                        color: entry.account_type === 'revenue' ? '#059669' : entry.account_type === 'expense' ? '#dc2626' : '#2563eb',
                        textTransform: 'uppercase'
                      }}>
                        {entry.account_type}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569', fontSize: 12 }}>
                      {entry.reference_type || 'MANUAL'}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 500, color: '#0f172a' }}>
                      {entry.description}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: entry.debit > 0 ? '#2563eb' : '#94a3b8' }}>
                      {entry.debit > 0 ? `₹${Number(entry.debit).toLocaleString()}` : '-'}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: entry.credit > 0 ? '#059669' : '#94a3b8' }}>
                      {entry.credit > 0 ? `₹${Number(entry.credit).toLocaleString()}` : '-'}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      ₹{Number(entry.balance_after || 0).toLocaleString()}
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
