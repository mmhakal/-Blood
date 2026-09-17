import React, { useState, useEffect } from 'react';
import {
  Wallet, ShieldCheck, CheckCircle2, AlertTriangle, Clock,
  DollarSign, Building2, Calendar, FileText, RefreshCw
} from 'lucide-react';
import api from '../../services/api';

export const CashClosingDesk: React.FC = () => {
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [closings, setClosings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Reconciliation form
  const [openingCash, setOpeningCash] = useState<number | string>(500);
  const [actualCash, setActualCash] = useState<number | string>('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastReconciliation, setLastReconciliation] = useState<any>(null);

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      loadHistory();
    }
  }, [selectedBranch]);

  const loadBranches = async () => {
    try {
      const branchRes = await api.get('/branches');
      setBranches(branchRes);
      if (branchRes?.length > 0) {
        setSelectedBranch(branchRes[0].id);
      }
    } catch (err) {
      console.error('Failed to load branches', err);
    }
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/accounting/cash-closing?branch_id=${selectedBranch}`);
      setClosings(res);
    } catch (err) {
      console.error('Failed to load closing history', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch || actualCash === '') return;

    setSubmitting(true);
    try {
      const res = await api.post('/accounting/cash-closing', {
        branch_id: selectedBranch,
        opening_cash: Number(openingCash || 0),
        actual_cash: Number(actualCash),
        remarks: remarks || 'End of shift drawer reconciliation'
      });
      setLastReconciliation(res);
      setActualCash('');
      setRemarks('');
      loadHistory();
    } catch (err: any) {
      alert('Failed to reconcile cash drawer: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>End-of-Shift Cash Closing Desk</h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>Front-desk cash drawer reconciliation, physical count verification & variance auditing</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Facility Branch:</label>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, backgroundColor: '#fff' }}
          >
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Shift Close Form + Recent Variance Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, marginBottom: 28 }}>
        {/* Active Reconciliation Form */}
        <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>Register Shift Drawer Balance</h2>
              <span style={{ fontSize: 12, color: '#64748b' }}>Record physical cash on hand at end of reception shift</span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Opening Float Cash (₹)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  required
                  placeholder="500.00"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
                />
                <span style={{ fontSize: 11, color: '#64748b' }}>Starting change float in register</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Physical Counted Cash (₹)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  required
                  placeholder="Counted cash in drawer"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
                />
                <span style={{ fontSize: 11, color: '#64748b' }}>Total physical currency in till</span>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Handover Notes / Discrepancy Reason
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Shift 1 evening handover to cashier Priya. All physical bills verified."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting || actualCash === ''}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px 18px',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              <ShieldCheck size={18} />
              <span>{submitting ? 'Auditing & Closing...' : 'Submit & Close Cash Shift'}</span>
            </button>
          </form>
        </div>

        {/* Live / Last Reconciliation Summary */}
        <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>
            {lastReconciliation ? 'Latest Shift Closing Result' : 'Cash Drawer Policy'}
          </h2>

          {lastReconciliation ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                padding: '12px 16px',
                borderRadius: 8,
                backgroundColor: lastReconciliation.variance === 0 ? '#ecfdf5' : '#fff7ed',
                border: lastReconciliation.variance === 0 ? '1px solid #a7f3d0' : '1px solid #fed7aa',
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}>
                {lastReconciliation.variance === 0 ? (
                  <CheckCircle2 size={20} color="#059669" />
                ) : (
                  <AlertTriangle size={20} color="#ea580c" />
                )}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: lastReconciliation.variance === 0 ? '#065f46' : '#9a3412' }}>
                    {lastReconciliation.variance === 0 ? 'Cash Drawer Perfectly Balanced' : `Variance Detected: ₹${lastReconciliation.variance}`}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    Status: {lastReconciliation.status?.toUpperCase()}
                  </div>
                </div>
              </div>

              <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#64748b' }}>Opening Balance:</span>
                  <strong>₹{lastReconciliation.opening_cash}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#64748b' }}>Cash Collected in Shift:</span>
                  <strong style={{ color: '#059669' }}>+₹{lastReconciliation.system_cash_collected}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, borderTop: '1px solid #e2e8f0', paddingTop: 6 }}>
                  <span style={{ color: '#0f172a', fontWeight: 600 }}>Expected Drawer Cash:</span>
                  <strong>₹{lastReconciliation.expected_cash}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#0f172a', fontWeight: 600 }}>Actual Counted Cash:</span>
                  <strong style={{ color: '#0284c7' }}>₹{lastReconciliation.actual_cash}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 6 }}>
                  <span style={{ color: lastReconciliation.variance >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>Drawer Variance:</span>
                  <strong style={{ color: lastReconciliation.variance >= 0 ? '#16a34a' : '#dc2626' }}>
                    {lastReconciliation.variance >= 0 ? `+₹${lastReconciliation.variance}` : `-₹${Math.abs(lastReconciliation.variance)}`}
                  </strong>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
              <p style={{ marginBottom: 12 }}>
                The End-of-Shift Cash Closing desk guarantees complete front-office transparency between changing cashier shifts.
              </p>
              <ul style={{ paddingLeft: 18, marginBottom: 12 }}>
                <li>Opening float is verified at shift commencement.</li>
                <li>All cash payments recorded in billing are automatically aggregated.</li>
                <li>Any difference between the physical till count and expected cash is logged in the permanent audit ledger.</li>
              </ul>
              <div style={{ padding: '10px 12px', backgroundColor: '#eff6ff', borderRadius: 6, color: '#1e40af', fontSize: 12 }}>
                Select your facility branch, enter physical count, and submit to close the shift.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Historical Closings Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Shift Closing History & Audit Log</h3>
          <button onClick={loadHistory} style={{ border: 'none', background: 'transparent', color: '#0284c7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading closing records...</div>
        ) : closings.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No shift closings logged for this branch yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 14px' }}>Closing Date & Time</th>
                  <th style={{ padding: '12px 14px' }}>Cashier / User</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Opening Float</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Cash Collections</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Expected Total</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Counted Actual</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Variance</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {closings.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>
                      {new Date(c.closed_at || c.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>
                      {c.closed_by_name || 'Cashier / Admin'}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>₹{c.opening_cash}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', color: '#059669' }}>+₹{c.system_cash_collected}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600 }}>₹{c.expected_cash}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#0284c7' }}>₹{c.actual_cash}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: c.variance === 0 ? '#059669' : c.variance > 0 ? '#2563eb' : '#dc2626' }}>
                      {c.variance === 0 ? '₹0' : c.variance > 0 ? `+₹${c.variance}` : `-₹${Math.abs(c.variance)}`}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        backgroundColor: c.status === 'balanced' ? '#ecfdf5' : '#fff7ed',
                        color: c.status === 'balanced' ? '#059669' : '#ea580c'
                      }}>
                        {c.status?.toUpperCase()}
                      </span>
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
