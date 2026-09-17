import React, { useState, useEffect } from 'react';
import {
  Activity, CheckCircle2, AlertTriangle, XCircle, Plus, RefreshCw,
  Calendar, Layers, Filter, ShieldAlert, FileText, Check
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export const QualityControlDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<any>(null);
  const [lots, setLots] = useState<any[]>([]);
  const [selectedLot, setSelectedLot] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [failures, setFailures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chart' | 'failures' | 'lots'>('chart');
  const { error, success } = useNotification();

  // Record Run Modal
  const [showRunModal, setShowRunModal] = useState(false);
  const [newRunValue, setNewRunValue] = useState('');
  const [newRunRemarks, setNewRunRemarks] = useState('');
  const [recording, setRecording] = useState(false);

  // CAPA Modal
  const [selectedFailure, setSelectedFailure] = useState<any>(null);
  const [rootCause, setRootCause] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [preventiveAction, setPreventiveAction] = useState('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [dRes, lRes, fRes] = await Promise.all([
        api.get('/qc/dashboard'),
        api.get('/qc/lots'),
        api.get('/qc/failures').catch(() => [])
      ]);
      setDashboard(dRes);
      setLots(lRes || []);
      setFailures(fRes || []);

      if (lRes?.length > 0) {
        setSelectedLot(lRes[0]);
        loadChart(lRes[0].id);
      }
    } catch (err: any) {
      error(err.message || 'Failed to load QC system');
    } finally {
      setLoading(false);
    }
  };

  const loadChart = async (lotId?: string, paramId?: string) => {
    try {
      let query = '';
      if (lotId) query += `?lot_id=${lotId}`;
      if (paramId) query += `&parameter_id=${paramId}`;
      const res = await api.get(`/qc/chart-data${query}`);
      setChartData(res);
    } catch (err: any) {
      error('Failed to load Levey-Jennings chart');
    }
  };

  const handleRecordRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chartData?.target || !newRunValue) return;

    setRecording(true);
    try {
      const res = await api.post('/qc/results', {
        lot_id: chartData.target.lot_id,
        test_id: 'test-cbc',
        parameter_id: chartData.target.parameter_id,
        value: parseFloat(newRunValue),
        remarks: newRunRemarks || 'Scheduled QC Run'
      });

      if (res.status === 'reject') {
        error(`Westgard Violation: ${res.violations?.join(', ')}`);
      } else if (res.status === 'warning') {
        error(`Westgard Warning: ${res.violations?.join(', ')}`);
      } else {
        success('QC run passed within acceptable statistical limits');
      }

      setShowRunModal(false);
      setNewRunValue('');
      setNewRunRemarks('');
      loadChart(chartData.target.lot_id, chartData.target.parameter_id);
      loadDashboard();
    } catch (err: any) {
      error(err.message || 'Failed to record QC run');
    } finally {
      setRecording(false);
    }
  };

  const handleResolveFailure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFailure || !rootCause || !correctiveAction) return;

    setResolving(true);
    try {
      await api.post(`/qc/failures/${selectedFailure.id}/resolve`, {
        root_cause: rootCause,
        corrective_action: correctiveAction,
        preventive_action: preventiveAction
      });
      success('QC Failure incident resolved with CAPA documentation');
      setSelectedFailure(null);
      loadDashboard();
    } catch (err: any) {
      error(err.message || 'Failed to resolve failure');
    } finally {
      setResolving(false);
    }
  };

  // SVG Levey-Jennings Dimensions & Scaling
  const target = chartData?.target;
  const points = chartData?.points || [];

  const svgWidth = 800;
  const svgHeight = 320;
  const margin = { top: 20, right: 60, bottom: 40, left: 60 };
  const innerWidth = svgWidth - margin.left - margin.right;
  const innerHeight = svgHeight - margin.top - margin.bottom;

  // Scale Y based on Target Mean +/- 4 SD
  const mean = target?.mean || 10;
  const sd = target?.sd || 1;
  const yMin = mean - 3.8 * sd;
  const yMax = mean + 3.8 * sd;

  const scaleY = (val: number) => {
    const ratio = (val - yMin) / (yMax - yMin);
    return innerHeight - ratio * innerHeight + margin.top;
  };

  const scaleX = (idx: number, total: number) => {
    if (total <= 1) return margin.left + innerWidth / 2;
    return margin.left + (idx / (total - 1)) * innerWidth;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Statistical Quality Control & Levey-Jennings</h1>
          <p style={{ fontSize: 13.5, color: '#64748b', marginTop: 4 }}>
            Multi-rule Westgard evaluation (1₂s, 1₃s, 2₂s, R₄s, 4₁s, 10x), Levey-Jennings charts, and CAPA corrective actions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setShowRunModal(true)}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <Plus size={15} /> Record Control Run
          </button>
          <button onClick={loadDashboard} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <RefreshCw size={15} /> Refresh QC
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="kpi-card" style={{ borderLeft: '4px solid #0284c7' }}>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Total Control Runs</span>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', marginTop: 8 }}>{dashboard?.total_runs || 0}</div>
          <span style={{ fontSize: 12, color: '#64748b' }}>Recorded Observations</span>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #10b981' }}>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Acceptable (In Control)</span>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981', marginTop: 8 }}>{dashboard?.passed_runs || 0}</div>
          <span style={{ fontSize: 12, color: '#10b981' }}>Within ±2 SD Limits</span>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Westgard Warnings (1₂s)</span>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b', marginTop: 8 }}>{dashboard?.warning_runs || 0}</div>
          <span style={{ fontSize: 12, color: '#f59e0b' }}>Between 2 SD and 3 SD</span>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Westgard Out of Control</span>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#ef4444', marginTop: 8 }}>{dashboard?.rejected_runs || 0}</div>
          <span style={{ fontSize: 12, color: '#ef4444' }}>Rejection Rules Triggered</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab('chart')}
          className={`tab-btn ${activeTab === 'chart' ? 'active' : ''}`}
          style={{ padding: '10px 18px', fontWeight: 600, borderBottom: activeTab === 'chart' ? '2px solid #0284c7' : 'none', color: activeTab === 'chart' ? '#0284c7' : '#64748b' }}
        >
          Levey-Jennings Chart
        </button>
        <button
          onClick={() => setActiveTab('failures')}
          className={`tab-btn ${activeTab === 'failures' ? 'active' : ''}`}
          style={{ padding: '10px 18px', fontWeight: 600, borderBottom: activeTab === 'failures' ? '2px solid #0284c7' : 'none', color: activeTab === 'failures' ? '#0284c7' : '#64748b' }}
        >
          QC Incidents & CAPA ({failures.length})
        </button>
        <button
          onClick={() => setActiveTab('lots')}
          className={`tab-btn ${activeTab === 'lots' ? 'active' : ''}`}
          style={{ padding: '10px 18px', fontWeight: 600, borderBottom: activeTab === 'lots' ? '2px solid #0284c7' : 'none', color: activeTab === 'lots' ? '#0284c7' : '#64748b' }}
        >
          QC Control Lots ({lots.length})
        </button>
      </div>

      {/* TAB 1: LEVEY-JENNINGS CHART */}
      {activeTab === 'chart' && (
        <div className="card" style={{ padding: 24, borderRadius: 12 }}>
          {/* Target Info Bar */}
          {target && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 14, padding: 14, backgroundColor: '#f8fafc', borderRadius: 8 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>Active QC Profile</span>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{target.test_name} — {target.parameter_name} ({target.lot_number})</h3>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                <div><span style={{ color: '#64748b' }}>Mean:</span> <strong>{target.mean} {target.unit}</strong></div>
                <div><span style={{ color: '#64748b' }}>1 SD:</span> <strong>{target.sd}</strong></div>
                <div><span style={{ color: '#64748b' }}>CV%:</span> <strong>{target.cv_percent}%</strong></div>
                <div><span style={{ color: '#64748b' }}>+2SD Limit:</span> <strong style={{ color: '#f59e0b' }}>{target.plus_2sd}</strong></div>
                <div><span style={{ color: '#64748b' }}>+3SD Limit:</span> <strong style={{ color: '#ef4444' }}>{target.plus_3sd}</strong></div>
              </div>
            </div>
          )}

          {/* SVG Levey-Jennings Chart */}
          <div style={{ width: '100%', overflowX: 'auto', textAlign: 'center' }}>
            <svg width={svgWidth} height={svgHeight} style={{ backgroundColor: '#fff', borderRadius: 8, border: '1px solid #f1f5f9' }}>
              {/* Reference SD Bands */}
              {/* +3 SD */}
              <line x1={margin.left} y1={scaleY(target?.plus_3sd || mean + 3 * sd)} x2={svgWidth - margin.right} y2={scaleY(target?.plus_3sd || mean + 3 * sd)} stroke="#ef4444" strokeWidth="1.5" />
              <text x={svgWidth - margin.right + 8} y={scaleY(target?.plus_3sd || mean + 3 * sd) + 4} fill="#ef4444" fontSize="10" fontWeight="700">+3 SD ({target?.plus_3sd})</text>

              {/* +2 SD */}
              <line x1={margin.left} y1={scaleY(target?.plus_2sd || mean + 2 * sd)} x2={svgWidth - margin.right} y2={scaleY(target?.plus_2sd || mean + 2 * sd)} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3" />
              <text x={svgWidth - margin.right + 8} y={scaleY(target?.plus_2sd || mean + 2 * sd) + 4} fill="#f59e0b" fontSize="10" fontWeight="600">+2 SD ({target?.plus_2sd})</text>

              {/* +1 SD */}
              <line x1={margin.left} y1={scaleY(target?.plus_1sd || mean + sd)} x2={svgWidth - margin.right} y2={scaleY(target?.plus_1sd || mean + sd)} stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />

              {/* Mean Line (Target Baseline) */}
              <line x1={margin.left} y1={scaleY(mean)} x2={svgWidth - margin.right} y2={scaleY(mean)} stroke="#0284c7" strokeWidth="2" />
              <text x={svgWidth - margin.right + 8} y={scaleY(mean) + 4} fill="#0284c7" fontSize="11" fontWeight="700">Mean ({mean})</text>

              {/* -1 SD */}
              <line x1={margin.left} y1={scaleY(target?.minus_1sd || mean - sd)} x2={svgWidth - margin.right} y2={scaleY(target?.minus_1sd || mean - sd)} stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />

              {/* -2 SD */}
              <line x1={margin.left} y1={scaleY(target?.minus_2sd || mean - 2 * sd)} x2={svgWidth - margin.right} y2={scaleY(target?.minus_2sd || mean - 2 * sd)} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3" />
              <text x={svgWidth - margin.right + 8} y={scaleY(target?.minus_2sd || mean - 2 * sd) + 4} fill="#f59e0b" fontSize="10" fontWeight="600">-2 SD ({target?.minus_2sd})</text>

              {/* -3 SD */}
              <line x1={margin.left} y1={scaleY(target?.minus_3sd || mean - 3 * sd)} x2={svgWidth - margin.right} y2={scaleY(target?.minus_3sd || mean - 3 * sd)} stroke="#ef4444" strokeWidth="1.5" />
              <text x={svgWidth - margin.right + 8} y={scaleY(target?.minus_3sd || mean - 3 * sd) + 4} fill="#ef4444" fontSize="10" fontWeight="700">-3 SD ({target?.minus_3sd})</text>

              {/* Connecting Line between control points */}
              {points.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  points={points.map((p: any, idx: number) => `${scaleX(idx, points.length)},${scaleY(p.value)}`).join(' ')}
                />
              )}

              {/* Control Data Points */}
              {points.map((p: any, idx: number) => {
                const cx = scaleX(idx, points.length);
                const cy = scaleY(p.value);
                const isReject = p.status === 'reject';
                const isWarn = p.status === 'warning';
                const color = isReject ? '#ef4444' : (isWarn ? '#f59e0b' : '#10b981');

                return (
                  <g key={p.id || idx}>
                    <circle cx={cx} cy={cy} r={isReject ? 6 : 4.5} fill={color} stroke="#fff" strokeWidth="1.5">
                      <title>{`Run #${idx + 1}: ${p.value} (Z: ${p.z_score})\nStatus: ${p.status.toUpperCase()}\n${p.rule_violations?.join(', ') || 'In Control'}`}</title>
                    </circle>
                    <text x={cx} y={svgHeight - 12} fill="#64748b" fontSize="9" textAnchor="middle">#{idx + 1}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* TAB 2: QC FAILURES & CAPA WORKFLOW */}
      {activeTab === 'failures' && (
        <div className="card" style={{ padding: 24, borderRadius: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Westgard Quality Control Incidents & CAPA Actions</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                  <th style={{ padding: 10 }}>Date</th>
                  <th style={{ padding: 10 }}>Test & Parameter</th>
                  <th style={{ padding: 10 }}>Control Lot</th>
                  <th style={{ padding: 10 }}>Westgard Violation</th>
                  <th style={{ padding: 10 }}>Status</th>
                  <th style={{ padding: 10 }}>Root Cause & Resolution</th>
                  <th style={{ padding: 10 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {failures.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>No active Westgard violations recorded. System in statistical control.</td>
                  </tr>
                ) : (
                  failures.map((f) => (
                    <tr key={f.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: 10, color: '#64748b' }}>{new Date(f.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: 10, fontWeight: 600 }}>{f.test_name} — {f.param_name}</td>
                      <td style={{ padding: 10, color: '#0284c7' }}>{f.lot_number}</td>
                      <td style={{ padding: 10, color: '#ef4444', fontWeight: 700 }}>{f.rule_violated}</td>
                      <td style={{ padding: 10 }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                          backgroundColor: f.status === 'resolved' ? '#dcfce7' : '#fee2e2',
                          color: f.status === 'resolved' ? '#15803d' : '#b91c1c'
                        }}>
                          {f.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: 10, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.corrective_action || 'Pending Investigation'}
                      </td>
                      <td style={{ padding: 10 }}>
                        {f.status !== 'resolved' && (
                          <button
                            onClick={() => { setSelectedFailure(f); setRootCause(''); setCorrectiveAction(''); }}
                            className="btn-secondary"
                            style={{ fontSize: 11, padding: '4px 8px' }}
                          >
                            Resolve CAPA
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LOTS */}
      {activeTab === 'lots' && (
        <div className="card" style={{ padding: 24, borderRadius: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Control Materials & Lot Roster</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {lots.map((l) => (
              <div key={l.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, backgroundColor: '#f8fafc' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>{l.level}</span>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{l.lot_number}</h4>
                <p style={{ fontSize: 12, color: '#64748b' }}>{l.material_name} ({l.manufacturer})</p>
                <div style={{ marginTop: 12, fontSize: 12, color: '#334155' }}>
                  <div>Expiry: <strong>{new Date(l.expiry_date).toLocaleDateString()}</strong></div>
                  <div>Targets: <strong>{l.target_count || 1} Parameters</strong></div>
                  <div>Runs: <strong>{l.runs_count || 0} QC Runs</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Record QC Run */}
      {showRunModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, width: 440, maxWidth: '90%' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Record Quality Control Run</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              {target?.test_name} — {target?.parameter_name} (Mean: {target?.mean} {target?.unit})
            </p>

            <form onSubmit={handleRecordRun}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Observed Control Value ({target?.unit})</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={newRunValue}
                  onChange={(e) => setNewRunValue(e.target.value)}
                  placeholder={`e.g. ${target?.mean}`}
                  className="form-input"
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Remarks / Shift</label>
                <input
                  type="text"
                  value={newRunRemarks}
                  onChange={(e) => setNewRunRemarks(e.target.value)}
                  placeholder="Morning Shift Routine QC"
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setShowRunModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={recording} className="btn-primary">
                  {recording ? 'Evaluating Westgard...' : 'Save & Evaluate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Resolve CAPA */}
      {selectedFailure && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, width: 480, maxWidth: '90%' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>CAPA Corrective Action Desk</h3>
            <p style={{ fontSize: 13, color: '#ef4444', fontWeight: 600, marginBottom: 16 }}>
              Violation: {selectedFailure.rule_violated} ({selectedFailure.test_name} — {selectedFailure.param_name})
            </p>

            <form onSubmit={handleResolveFailure}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Root Cause Analysis</label>
                <textarea
                  rows={3}
                  required
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  placeholder="e.g. Reagent pack temperature excursion or optical sensor drift"
                  className="form-input"
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Corrective Action Taken</label>
                <textarea
                  rows={3}
                  required
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                  placeholder="e.g. Cleaned flow cell, replaced diluent lot, re-ran 3 levels of QC"
                  className="form-input"
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Preventive Action</label>
                <input
                  type="text"
                  value={preventiveAction}
                  onChange={(e) => setPreventiveAction(e.target.value)}
                  placeholder="e.g. Scheduled weekly optical clean cycle"
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setSelectedFailure(null)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={resolving} className="btn-primary">
                  {resolving ? 'Submitting CAPA...' : 'Approve & Close Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
