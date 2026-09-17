import React, { useState, useEffect } from 'react';
import {
  CheckCircle, XCircle, Clock, AlertOctagon, UserCheck,
  ShieldCheck, FileText, IndianRupee, Layers, ChevronRight, MessageSquare
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ApprovalRequest {
  id: string;
  workflow_id: string;
  workflow_name?: string;
  entity_type: string;
  entity_id: string;
  current_step_order: number;
  total_steps: number;
  step_role_code: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_by_name?: string;
  payload?: any;
  created_at: string;
}

export const ApprovalCenter: React.FC = () => {
  const { token } = useAuth();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<ApprovalRequest | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/approvals/requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error('Failed to load approval requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    if (!selectedReq) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/approvals/requests/${selectedReq.id}/decide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          decision,
          notes: decisionNotes || `${decision.toUpperCase()} by authorized reviewer.`
        })
      });
      if (res.ok) {
        setSelectedReq(null);
        setDecisionNotes('');
        fetchRequests();
      }
    } catch (err) {
      console.error('Decision error', err);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = requests.filter(r => r.status === statusFilter);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Enterprise Multi-Step Approval Center
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Tiered approval workflows for commercial discounts, billing refunds, report amendments & stock write-offs
          </p>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 8 }}>
          {(['pending', 'approved', 'rejected'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                border: 'none',
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                background: statusFilter === status ? '#ffffff' : 'transparent',
                color: statusFilter === status ? '#0284c7' : '#64748b',
                boxShadow: statusFilter === status ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
                textTransform: 'capitalize'
              }}
            >
              {status} ({requests.filter(r => r.status === status).length})
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table */}
      <div className="card" style={{ padding: 22 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
            Loading tiered approval queues...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#64748b' }}>
            <CheckCircle size={36} color="#10b981" style={{ margin: '0 auto 12px' }} />
            <p>No {statusFilter} approval items in this queue.</p>
          </div>
        ) : (
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                <th style={{ padding: '10px 14px' }}>WORKFLOW & ENTITY</th>
                <th style={{ padding: '10px 14px' }}>TARGET ID</th>
                <th style={{ padding: '10px 14px' }}>CURRENT STEP</th>
                <th style={{ padding: '10px 14px' }}>REQUIRED ROLE</th>
                <th style={{ padding: '10px 14px' }}>REQUESTED BY</th>
                <th style={{ padding: '10px 14px' }}>SUBMITTED AT</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((req) => (
                <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>
                      {req.workflow_name || 'Standard Governance Flow'}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', textTransform: 'capitalize' }}>
                      Category: {req.entity_type}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#0284c7', fontWeight: 600 }}>
                    {req.entity_id}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      background: '#e0f2fe',
                      color: '#0369a1',
                      padding: '3px 8px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 700
                    }}>
                      Step {req.current_step_order} of {req.total_steps || 2}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#475569', fontWeight: 600 }}>
                    {req.step_role_code}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#475569' }}>
                    {req.requested_by_name || 'Authorized Staff'}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#64748b' }}>
                    {new Date(req.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    {req.status === 'pending' ? (
                      <button
                        onClick={() => setSelectedReq(req)}
                        className="btn btn-primary"
                        style={{ fontSize: 12, padding: '5px 12px' }}
                      >
                        Review Step
                      </button>
                    ) : (
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: req.status === 'approved' ? '#ecfdf5' : '#fef2f2',
                        color: req.status === 'approved' ? '#166534' : '#991b1b',
                        textTransform: 'uppercase'
                      }}>
                        {req.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Review Modal */}
      {selectedReq && (
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
          <div className="card" style={{ width: '100%', maxWidth: 500, padding: 24, borderRadius: 14 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 12px', color: '#0f172a' }}>
              Multi-Step Approval Review
            </h2>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: 13 }}>
              Evaluating step {selectedReq.current_step_order} of {selectedReq.total_steps || 2} for entity <code>{selectedReq.entity_id}</code>.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                AUDITED DECISION REMARKS *
              </label>
              <textarea
                rows={3}
                placeholder="Specify clinical or administrative rationale for approval or rejection..."
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                className="input"
                style={{ width: '100%', resize: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setSelectedReq(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDecision('rejected')}
                disabled={submitting}
                className="btn"
                style={{ background: '#ef4444', color: '#fff' }}
              >
                Reject Request
              </button>
              <button
                type="button"
                onClick={() => handleDecision('approved')}
                disabled={submitting}
                className="btn btn-primary"
              >
                Approve Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalCenter;
