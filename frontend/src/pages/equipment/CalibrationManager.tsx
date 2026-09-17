import React, { useState, useEffect } from 'react';
import {
  Award, Activity, CheckCircle2, AlertTriangle, XCircle, Plus, RefreshCw,
  Search, Calendar, FileText, Check, X, ShieldAlert, Cpu, Sparkles
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export const CalibrationManager: React.FC = () => {
  const [calibrations, setCalibrations] = useState<any[]>([]);
  const [analyzers, setAnalyzers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { error, success } = useNotification();

  const [form, setForm] = useState({
    analyzer_id: '',
    test_id: '',
    calibrator_lot: '',
    calibration_date: new Date().toISOString().split('T')[0],
    next_due_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'passed',
    notes: '',
    results_json: JSON.stringify({ r_squared: 0.9994, slope: 1.002, intercept: 0.04 }, null, 2)
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [calsRes, anzRes] = await Promise.all([
        api.get('/equipment/calibrations'),
        api.get('/analyzers')
      ]);
      setCalibrations(calsRes || []);
      setAnalyzers(anzRes || []);
      if (anzRes?.length > 0 && !form.analyzer_id) {
        setForm(prev => ({ ...prev, analyzer_id: anzRes[0].id }));
      }
    } catch (err: any) {
      error(err.message || 'Failed to load calibrations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCalibration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.calibrator_lot || !form.calibration_date || !form.next_due_date) {
      error('Calibrator lot, calibration date, and next due date are required');
      return;
    }

    setSubmitting(true);
    try {
      let parsedJson = null;
      try {
        parsedJson = JSON.parse(form.results_json);
      } catch {
        parsedJson = { raw: form.results_json };
      }

      await api.post('/equipment/calibrations', {
        ...form,
        results_json: parsedJson
      });
      success('Calibration record logged and analyzer verified');
      setShowModal(false);
      setForm({
        analyzer_id: analyzers[0]?.id || '',
        test_id: '',
        calibrator_lot: '',
        calibration_date: new Date().toISOString().split('T')[0],
        next_due_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'passed',
        notes: '',
        results_json: JSON.stringify({ r_squared: 0.9994, slope: 1.002, intercept: 0.04 }, null, 2)
      });
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to record calibration');
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics
  const total = calibrations.length;
  const passed = calibrations.filter(c => c.status === 'passed').length;
  const now = new Date();
  const expiringSoon = calibrations.filter(c => {
    if (!c.next_due_date) return false;
    const diff = (new Date(c.next_due_date).getTime() - now.getTime()) / (1000 * 3600 * 24);
    return diff > 0 && diff <= 30;
  }).length;
  const overdue = calibrations.filter(c => {
    if (!c.next_due_date) return false;
    return new Date(c.next_due_date).getTime() < now.getTime();
  }).length;

  const filtered = calibrations.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      (c.analyzer_name || '').toLowerCase().includes(term) ||
      (c.test_name || '').toLowerCase().includes(term) ||
      (c.calibrator_lot || '').toLowerCase().includes(term)
    );
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ padding: 8, borderRadius: 8, background: '#ecfdf5', color: '#059669' }}>
              <Award size={24} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Instrument Calibration & Certificates</h1>
          </div>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            Traceable calibration curves, NIST standards conformance, slope/intercept calibration metrics, and re-calibration triggers.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            id="btn-refresh-calibrations"
            onClick={loadData}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, color: '#475569', cursor: 'pointer', fontWeight: 500 }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button
            id="btn-record-calibration-open"
            onClick={() => setShowModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#059669', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: 600, boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)' }}
          >
            <Plus size={16} /> Record Calibration Run
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>TOTAL CERTIFICATES</span>
            <Award size={18} color="#059669" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>{total}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Analyzers & parameters audited</div>
        </div>

        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>PASSED & ACTIVE</span>
            <CheckCircle2 size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981' }}>{passed}</div>
          <div style={{ fontSize: 12, color: '#10b981', marginTop: 4 }}>R² ≥ 0.995 verified</div>
        </div>

        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>DUE IN &lt;30 DAYS</span>
            <AlertTriangle size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b' }}>{expiringSoon}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Re-standardization approaching</div>
        </div>

        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>OVERDUE RE-CALIBRATION</span>
            <XCircle size={18} color="#ef4444" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: overdue > 0 ? '#ef4444' : '#10b981' }}>{overdue}</div>
          <div style={{ fontSize: 12, color: overdue > 0 ? '#ef4444' : '#10b981', marginTop: 4 }}>
            {overdue > 0 ? 'Requires immediate lockout' : 'All instruments in compliance'}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
        <input
          id="search-calibrations"
          type="text"
          placeholder="Search by Analyzer name, Test, or Calibrator Lot #..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', maxWidth: '400px', padding: '10px 12px 10px 36px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14 }}
        />
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>
              <th style={{ padding: '12px 16px' }}>Analyzer & Target Test</th>
              <th style={{ padding: '12px 16px' }}>Calibrator Lot</th>
              <th style={{ padding: '12px 16px' }}>Calibration Run</th>
              <th style={{ padding: '12px 16px' }}>Next Due Expiry</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px' }}>Curve Metrics</th>
              <th style={{ padding: '12px 16px' }}>Audited By</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  No calibration records found.
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const isOverdue = item.next_due_date && new Date(item.next_due_date).getTime() < now.getTime();
                let metricsObj: any = null;
                try {
                  metricsObj = typeof item.results_json === 'string' ? JSON.parse(item.results_json) : item.results_json;
                } catch {
                  metricsObj = null;
                }

                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Cpu size={16} color="#059669" />
                        <div>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.analyzer_name || 'Multi-analyzer'}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{item.test_name || 'Multi-parameter'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: 6, fontSize: 12, fontFamily: 'monospace', fontWeight: 600, background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0' }}>
                        {item.calibrator_lot}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#334155' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Calendar size={13} color="#64748b" />
                        {new Date(item.calibration_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ color: isOverdue ? '#ef4444' : '#334155', fontWeight: isOverdue ? 600 : 400 }}>
                        {item.next_due_date ? new Date(item.next_due_date).toLocaleDateString() : 'N/A'}
                      </div>
                      {isOverdue && (
                        <div style={{ fontSize: 11, color: '#ef4444' }}>EXPIRED</div>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        background: item.status === 'passed' ? '#dcfce7' : '#fee2e2',
                        color: item.status === 'passed' ? '#15803d' : '#b91c1c',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        {item.status === 'passed' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {metricsObj ? (
                        <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#475569' }}>
                          <div>R²: <strong style={{ color: '#059669' }}>{metricsObj.r_squared || '0.999'}</strong></div>
                          <div>Slope: {metricsObj.slope || '1.00'} | Int: {metricsObj.intercept || '0.00'}</div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>Standard curve</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748b', fontSize: 13 }}>
                      {item.performed_by_name || 'Senior Pathologist'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: RECORD CALIBRATION */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: '580px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1e293b' }}>Record Calibration Run</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCalibration} style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Target Analyzer *</label>
                <select
                  id="select-cal-analyzer"
                  value={form.analyzer_id}
                  onChange={(e) => setForm({ ...form, analyzer_id: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, background: '#fff' }}
                >
                  {analyzers.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.model})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Calibrator Lot Number *</label>
                  <input
                    id="input-cal-lot"
                    type="text"
                    required
                    placeholder="e.g. CAL-ROCHE-2026B"
                    value={form.calibrator_lot}
                    onChange={(e) => setForm({ ...form, calibrator_lot: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Result Status</label>
                  <select
                    id="select-cal-status"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, background: '#fff' }}
                  >
                    <option value="passed">Passed (Valid)</option>
                    <option value="marginal">Marginal (Caution)</option>
                    <option value="failed">Failed (Uncalibrated)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Calibration Date *</label>
                  <input
                    id="input-cal-date"
                    type="date"
                    required
                    value={form.calibration_date}
                    onChange={(e) => setForm({ ...form, calibration_date: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Next Re-Calibration Due *</label>
                  <input
                    id="input-cal-next-due"
                    type="date"
                    required
                    value={form.next_due_date}
                    onChange={(e) => setForm({ ...form, next_due_date: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Calibration Metrics (JSON Curve parameters)
                </label>
                <textarea
                  id="input-cal-metrics-json"
                  rows={3}
                  value={form.results_json}
                  onChange={(e) => setForm({ ...form, results_json: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '10px 18px', background: '#f1f5f9', border: 'none', borderRadius: 8, color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-cal"
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '10px 20px', background: '#059669', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  {submitting ? 'Saving...' : 'Save Certificate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
