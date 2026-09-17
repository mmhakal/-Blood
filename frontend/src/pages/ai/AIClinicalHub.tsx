import React, { useState, useEffect } from 'react';
import {
  Sparkles, TrendingUp, AlertTriangle, Clock, Boxes, ShieldCheck,
  CheckCircle, XCircle, Edit3, ArrowRight, RefreshCw, FileText,
  HelpCircle, UserCheck, AlertOctagon, Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface TrendItem {
  parameter_id: string;
  parameter_name: string;
  previous_value: number;
  previous_date: string;
  current_value: number;
  current_date: string;
  change_percent: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  is_significant: boolean;
  is_abnormal_shift: boolean;
  ai_summary: string;
  ai_label: string;
}

interface Anomaly {
  anomaly_id: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  reason: string;
  related_entity_id: string;
  historical_context: string;
  recommended_review_action: string;
  ai_label: string;
}

interface TatPrediction {
  order_id: string;
  order_number: string;
  priority: string;
  test_count: number;
  sample_queue_depth: number;
  expected_completion_minutes: number;
  predicted_completion_at: string;
  delay_risk: 'low' | 'medium' | 'high' | 'critical';
  sla_target_hours: number;
  sla_risk_score: number;
  recommended_action: string;
  ai_label: string;
}

interface InventoryForecast {
  item_id: string;
  name: string;
  item_code: string;
  category: string;
  current_stock: number;
  unit: string;
  daily_burn_rate: number;
  predicted_days_remaining: number;
  recommended_reorder_qty: number;
  reorder_urgency: 'normal' | 'urgent' | 'critical';
  ai_label: string;
}

interface GovernanceData {
  events_count: number;
  feedback_count: number;
  events: Array<{
    id: string;
    feature_code: string;
    model_name: string;
    tokens_used: number;
    latency_ms: number;
    status: string;
    created_at: string;
  }>;
}

export const AIClinicalHub: React.FC = () => {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'trends' | 'drafts' | 'anomalies' | 'tat' | 'inventory' | 'governance'>('anomalies');

  // State
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [tatPredictions, setTatPredictions] = useState<TatPrediction[]>([]);
  const [forecasts, setForecasts] = useState<InventoryForecast[]>([]);
  const [governance, setGovernance] = useState<GovernanceData | null>(null);

  // Draft report state
  const [sampleReportId, setSampleReportId] = useState<string>('rep-demo-01');
  const [draftObservations, setDraftObservations] = useState<any[]>([]);
  const [drafting, setDrafting] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  // Fetch active tab data
  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'anomalies') {
        const res = await fetch('/api/ai/anomalies', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setAnomalies(await res.json());
      } else if (activeTab === 'trends') {
        const res = await fetch('/api/ai/trends/pid-2026-0001', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setTrends(data.trends || []);
        }
      } else if (activeTab === 'tat') {
        const res = await fetch('/api/ai/tat-predictions', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setTatPredictions(await res.json());
      } else if (activeTab === 'inventory') {
        const res = await fetch('/api/ai/inventory-forecasts', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setForecasts(await res.json());
      } else if (activeTab === 'governance') {
        const res = await fetch('/api/ai/governance', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setGovernance(await res.json());
      }
    } catch (err) {
      console.error('Failed to load AI hub data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleGenerateDraft = async () => {
    setDrafting(true);
    try {
      const res = await fetch(`/api/ai/draft-report/${sampleReportId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDraftObservations(data.suggestions || []);
      }
    } catch (err) {
      console.error('Failed to draft report observations', err);
    } finally {
      setDrafting(false);
    }
  };

  const handleFeedback = async (suggestionId: string, decision: 'accepted' | 'edited' | 'rejected') => {
    try {
      const res = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          suggestion_id: suggestionId,
          decision,
          edited_text: decision === 'accepted' ? 'Accepted without modifications by Clinician.' : 'Flagged for re-run.'
        })
      });
      if (res.ok) {
        setFeedbackSuccess(`Feedback logged: ${decision.toUpperCase()}. Recorded in permanent audit trail.`);
        setTimeout(() => setFeedbackSuccess(null), 4000);
      }
    } catch (err) {
      console.error('Feedback error', err);
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1600, margin: '0 auto' }}>
      {/* Header & Clinical AI Disclaimer Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        borderRadius: 16,
        padding: '24px 30px',
        color: '#fff',
        marginBottom: 24,
        boxShadow: '0 10px 25px -5px rgba(49, 46, 129, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(129, 140, 248, 0.4)'
            }}>
              <Sparkles size={28} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
                  Assistive AI Clinical Intelligence & Governance
                </h1>
                <span style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.05em'
                }}>
                  ASSISTIVE ONLY
                </span>
              </div>
              <p style={{ margin: '4px 0 0', color: '#c7d2fe', fontSize: 13 }}>
                Explainable clinical trend analysis, report drafting assistance, real-time anomalies & TAT prediction
              </p>
            </div>
          </div>
        </div>

        {/* Mandatory Regulatory Disclaimer */}
        <div style={{
          marginTop: 16,
          background: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 8,
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 12,
          color: '#e0e7ff'
        }}>
          <Info size={18} color="#a5b4fc" style={{ flexShrink: 0 }} />
          <span>
            <strong>Clinical Safety Notice:</strong> All insights generated by the AI Clinical Layer are strictly assistive suggestions.
            AI models never finalize, sign, or automatically release diagnostic reports. All diagnostic determinations remain with authorized laboratory pathologists.
          </span>
        </div>
      </div>

      {feedbackSuccess && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          padding: '12px 18px',
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <CheckCircle size={16} /> {feedbackSuccess}
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab('anomalies')}
          className={`btn ${activeTab === 'anomalies' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        >
          <AlertTriangle size={15} /> Real-Time Anomalies ({anomalies.length})
        </button>

        <button
          onClick={() => setActiveTab('trends')}
          className={`btn ${activeTab === 'trends' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        >
          <TrendingUp size={15} /> Historical Trend Analysis
        </button>

        <button
          onClick={() => setActiveTab('drafts')}
          className={`btn ${activeTab === 'drafts' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        >
          <FileText size={15} /> Report Draft Assistant
        </button>

        <button
          onClick={() => setActiveTab('tat')}
          className={`btn ${activeTab === 'tat' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        >
          <Clock size={15} /> Predictive TAT & SLA Risk
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`btn ${activeTab === 'inventory' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        >
          <Boxes size={15} /> Reagent Demand Forecast
        </button>

        <button
          onClick={() => setActiveTab('governance')}
          className={`btn ${activeTab === 'governance' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        >
          <ShieldCheck size={15} /> AI Governance Audit
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 10px' }} />
          <p>Processing neural inference & clinical statistical rules...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: CLINICAL ANOMALIES */}
          {activeTab === 'anomalies' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {anomalies.map((anom) => (
                <div key={anom.anomaly_id} className="card" style={{
                  padding: 20,
                  borderLeft: anom.severity === 'critical' ? '5px solid #dc2626' : anom.severity === 'high' ? '5px solid #f97316' : '5px solid #0284c7'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: anom.severity === 'critical' ? '#fef2f2' : '#eff6ff',
                          color: anom.severity === 'critical' ? '#dc2626' : '#0284c7',
                          textTransform: 'uppercase'
                        }}>
                          {anom.severity} SEVERITY
                        </span>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          background: '#f1f5f9',
                          color: '#475569',
                          padding: '2px 6px',
                          borderRadius: 4
                        }}>
                          {anom.ai_label}
                        </span>
                      </div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: '8px 0 4px', color: '#0f172a' }}>
                        {anom.title}
                      </h3>
                      <p style={{ margin: 0, color: '#475569', fontSize: 13 }}>
                        {anom.reason}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleFeedback(anom.anomaly_id, 'accepted')}
                        className="btn btn-secondary"
                        style={{ fontSize: 12, padding: '6px 12px', color: '#16a34a' }}
                      >
                        <CheckCircle size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> Acknowledge
                      </button>
                      <button
                        onClick={() => handleFeedback(anom.anomaly_id, 'rejected')}
                        className="btn btn-secondary"
                        style={{ fontSize: 12, padding: '6px 12px', color: '#dc2626' }}
                      >
                        <XCircle size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> Dismiss
                      </button>
                    </div>
                  </div>

                  <div style={{
                    marginTop: 14,
                    background: '#f8fafc',
                    padding: '12px 16px',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#334155',
                    border: '1px solid #e2e8f0'
                  }}>
                    <strong>Recommended Review Protocol:</strong> {anom.recommended_review_action}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: RESULT TRENDS */}
          {activeTab === 'trends' && (
            <div className="card" style={{ padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                    Patient Longitudinal Parameter Trajectory
                  </h3>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 12 }}>
                    Comparing current result against prior baseline runs for early biological shift identification
                  </p>
                </div>
              </div>

              {trends.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  No longitudinal records available with $\ge 2$ consecutive test runs for this patient.
                </div>
              ) : (
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                      <th style={{ padding: '10px 14px' }}>PARAMETER</th>
                      <th style={{ padding: '10px 14px' }}>BASELINE VALUE</th>
                      <th style={{ padding: '10px 14px' }}>CURRENT VALUE</th>
                      <th style={{ padding: '10px 14px' }}>SHIFT %</th>
                      <th style={{ padding: '10px 14px' }}>BIOLOGICAL TRAJECTORY</th>
                      <th style={{ padding: '10px 14px' }}>EXPLAINABLE SUMMARY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trends.map((t) => (
                      <tr key={t.parameter_id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#1e293b' }}>
                          {t.parameter_name}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#64748b' }}>
                          {t.previous_value} <span style={{ fontSize: 10 }}>({new Date(t.previous_date).toLocaleDateString()})</span>
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>
                          {t.current_value}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 4,
                            background: t.is_abnormal_shift ? '#fef2f2' : t.is_significant ? '#fffbeb' : '#f0fdf4',
                            color: t.is_abnormal_shift ? '#dc2626' : t.is_significant ? '#d97706' : '#16a34a'
                          }}>
                            {t.change_percent > 0 ? `+${t.change_percent}%` : `${t.change_percent}%`}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textTransform: 'capitalize', fontWeight: 600 }}>
                          {t.trend}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475569', fontSize: 12 }}>
                          {t.ai_summary}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 3: REPORT DRAFT ASSISTANT */}
          {activeTab === 'drafts' && (
            <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>
                  Select Diagnostic Report
                </h3>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                  REPORT IDENTIFIER
                </label>
                <input
                  type="text"
                  value={sampleReportId}
                  onChange={(e) => setSampleReportId(e.target.value)}
                  className="input"
                  style={{ width: '100%', marginBottom: 16 }}
                />
                <button
                  onClick={handleGenerateDraft}
                  disabled={drafting}
                  className="btn btn-primary"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <Sparkles size={16} />
                  {drafting ? 'Analyzing Parameters...' : 'Generate Assistive Draft'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {draftObservations.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                    <FileText size={32} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
                    <p>Click "Generate Assistive Draft" to draft non-diagnostic observations and educational explanations.</p>
                  </div>
                ) : (
                  draftObservations.map((obs) => (
                    <div key={obs.id} className="card" style={{ padding: 20, borderLeft: '4px solid #8b5cf6' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: '#312e81' }}>{obs.section}</span>
                          <span style={{ fontSize: 11, background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                            {obs.ai_label}
                          </span>
                        </div>
                        <span style={{ fontSize: 12, color: '#64748b' }}>Confidence: {Math.round(obs.confidence * 100)}%</span>
                      </div>

                      <div style={{
                        background: '#f8fafc',
                        padding: 14,
                        borderRadius: 8,
                        fontSize: 13,
                        lineHeight: 1.6,
                        color: '#1e293b',
                        border: '1px solid #e2e8f0',
                        marginBottom: 14
                      }}>
                        {obs.suggested_text}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button
                          onClick={() => handleFeedback(obs.id, 'accepted')}
                          className="btn btn-primary"
                          style={{ fontSize: 12, padding: '6px 14px' }}
                        >
                          <CheckCircle size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> Adopt into Report Draft
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: TAT & WORKLOAD RISK */}
          {activeTab === 'tat' && (
            <div className="card" style={{ padding: 22 }}>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                  Active Requisitions SLA & TAT Risk Predictions
                </h3>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 12 }}>
                  Dynamically projecting completion minutes based on accession queue depth and STAT priorities
                </p>
              </div>

              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                    <th style={{ padding: '10px 14px' }}>ORDER #</th>
                    <th style={{ padding: '10px 14px' }}>PRIORITY</th>
                    <th style={{ padding: '10px 14px' }}>ESTIMATED TIME</th>
                    <th style={{ padding: '10px 14px' }}>DELAY RISK</th>
                    <th style={{ padding: '10px 14px' }}>SLA RISK SCORE</th>
                    <th style={{ padding: '10px 14px' }}>ACTION PROTOCOL</th>
                  </tr>
                </thead>
                <tbody>
                  {tatPredictions.map((tp) => (
                    <tr key={tp.order_id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>
                        {tp.order_number}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: tp.priority === 'stat' ? '#fef2f2' : tp.priority === 'urgent' ? '#fff7ed' : '#eff6ff',
                          color: tp.priority === 'stat' ? '#dc2626' : tp.priority === 'urgent' ? '#ea580c' : '#0284c7'
                        }}>
                          {tp.priority.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700 }}>
                        {tp.expected_completion_minutes} mins
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: tp.delay_risk === 'critical' ? '#fef2f2' : tp.delay_risk === 'high' ? '#fff7ed' : '#f0fdf4',
                          color: tp.delay_risk === 'critical' ? '#dc2626' : tp.delay_risk === 'high' ? '#ea580c' : '#16a34a'
                        }}>
                          {tp.delay_risk.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {Math.round(tp.sla_risk_score * 100)}%
                      </td>
                      <td style={{ padding: '12px 14px', color: '#475569', fontSize: 12 }}>
                        {tp.recommended_action}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 5: INVENTORY DEMAND FORECAST */}
          {activeTab === 'inventory' && (
            <div className="card" style={{ padding: 22 }}>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                  Reagent & Consumable Depletion Projections
                </h3>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 12 }}>
                  Machine learning burn rate modeling projecting days until stockout and automatic restock batches
                </p>
              </div>

              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                    <th style={{ padding: '10px 14px' }}>ITEM & SKU</th>
                    <th style={{ padding: '10px 14px' }}>CURRENT STOCK</th>
                    <th style={{ padding: '10px 14px' }}>DAILY CONSUMPTION</th>
                    <th style={{ padding: '10px 14px' }}>DAYS REMAINING</th>
                    <th style={{ padding: '10px 14px' }}>REORDER URGENCY</th>
                    <th style={{ padding: '10px 14px' }}>RECOMMENDED ORDER</th>
                  </tr>
                </thead>
                <tbody>
                  {forecasts.map((f) => (
                    <tr key={f.item_id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#1e293b' }}>{f.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{f.item_code}</div>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 800 }}>
                        {f.current_stock} {f.unit}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#475569' }}>
                        {f.daily_burn_rate} {f.unit}/day
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700 }}>
                        {f.predicted_days_remaining} Days
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: f.reorder_urgency === 'critical' ? '#fef2f2' : f.reorder_urgency === 'urgent' ? '#fffbeb' : '#f0fdf4',
                          color: f.reorder_urgency === 'critical' ? '#dc2626' : f.reorder_urgency === 'urgent' ? '#d97706' : '#16a34a'
                        }}>
                          {f.reorder_urgency.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0284c7' }}>
                        +{f.recommended_reorder_qty} {f.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 6: GOVERNANCE AUDIT */}
          {activeTab === 'governance' && governance && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <div className="card" style={{ padding: 18, borderLeft: '4px solid #0284c7' }}>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>TOTAL INFERENCES AUDITED</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 6 }}>
                    {governance.events_count}
                  </div>
                  <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>Full cryptographically hashed trail</div>
                </div>

                <div className="card" style={{ padding: 18, borderLeft: '4px solid #10b981' }}>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>HUMAN CLINICIAN REVIEWS</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 6 }}>
                    {governance.feedback_count}
                  </div>
                  <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>Accept / Edit / Reject decisions</div>
                </div>
              </div>

              <div className="card" style={{ padding: 22 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>
                  Immutable Neural Inferences Stream (ai_events)
                </h3>

                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                      <th style={{ padding: '10px 14px' }}>EVENT ID</th>
                      <th style={{ padding: '10px 14px' }}>FEATURE CODE</th>
                      <th style={{ padding: '10px 14px' }}>MODEL</th>
                      <th style={{ padding: '10px 14px' }}>TOKENS</th>
                      <th style={{ padding: '10px 14px' }}>LATENCY</th>
                      <th style={{ padding: '10px 14px' }}>STATUS</th>
                      <th style={{ padding: '10px 14px' }}>TIMESTAMP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {governance.events.map((ev) => (
                      <tr key={ev.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 12 }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#64748b' }}>
                          {ev.id}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1e293b' }}>
                          {ev.feature_code}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#475569' }}>
                          {ev.model_name}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {ev.tokens_used} tokens
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {ev.latency_ms} ms
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ background: '#ecfdf5', color: '#166534', padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                            {ev.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>
                          {new Date(ev.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AIClinicalHub;
