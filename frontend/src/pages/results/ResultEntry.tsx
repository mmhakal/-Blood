import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { TestTubes, Save, Send, AlertCircle, ArrowLeft, History, CheckCircle2, ShieldAlert, Lock, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export const ResultEntry: React.FC = () => {
  const [searchParams] = useSearchParams();
  const orderIdFromUrl = searchParams.get('order_id');

  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orderIdFromUrl || '');
  const [orderData, setOrderData] = useState<any>(null);
  const [resultSections, setResultSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Critical Value Modal state
  const [criticalValuesToConfirm, setCriticalValuesToConfirm] = useState<any[] | null>(null);
  const [criticalAcknowledged, setCriticalAcknowledged] = useState(false);
  const [pendingSubmitAction, setPendingSubmitAction] = useState<boolean>(false);

  const { error, success } = useNotification();
  const navigate = useNavigate();

  // Load active orders
  useEffect(() => {
    async function loadActiveOrders() {
      try {
        const res = await api.get('/orders');
        setOrders(res);
        if (!selectedOrderId && res.length > 0) {
          const pending = res.find((o: any) => o.status === 'processing' || o.status === 'sample_collected') || res[0];
          setSelectedOrderId(pending.id);
        }
      } catch (e) {
        // ignore
      }
    }
    loadActiveOrders();
  }, []);

  // Load result entry grid
  useEffect(() => {
    async function loadGrid() {
      if (!selectedOrderId) return;
      setLoading(true);
      try {
        const [ordRes, resData] = await Promise.all([
          api.get(`/orders/${selectedOrderId}`),
          api.get(`/results/order/${selectedOrderId}`)
        ]);
        setOrderData(ordRes);
        setResultSections(resData.sections || []);
      } catch (err: any) {
        error(err.message || 'Failed to load result entry grid');
      } finally {
        setLoading(false);
      }
    }
    loadGrid();
  }, [selectedOrderId]);

  // Update a parameter value and recalculate flag live
  const handleValueChange = (sectionIdx: number, paramIdx: number, val: string) => {
    const updated = [...resultSections];
    const param = updated[sectionIdx].parameters[paramIdx];
    param.value = val;

    const num = parseFloat(val);
    if (!isNaN(num)) {
      if (param.critical_low !== null && param.critical_low !== undefined && num <= param.critical_low) {
        param.flag = 'critical_low';
        param.is_critical = 1;
      } else if (param.critical_high !== null && param.critical_high !== undefined && num >= param.critical_high) {
        param.flag = 'critical_high';
        param.is_critical = 1;
      } else if (param.normal_min !== null && param.normal_min !== undefined && num < param.normal_min) {
        param.flag = 'low';
        param.is_critical = 0;
      } else if (param.normal_max !== null && param.normal_max !== undefined && num > param.normal_max) {
        param.flag = 'high';
        param.is_critical = 0;
      } else {
        param.flag = 'normal';
        param.is_critical = 0;
      }

      // Delta calculation
      if (param.previous_value !== null && param.previous_value !== undefined && !isNaN(parseFloat(param.previous_value))) {
        param.delta_difference = Math.round((num - parseFloat(param.previous_value)) * 100) / 100;
      }
    } else {
      const lower = String(val).toLowerCase();
      param.flag = lower.includes('positive') || lower.includes('reactive') ? 'abnormal' : 'normal';
      param.is_critical = 0;
    }

    setResultSections(updated);
  };

  const handleRemarkChange = (sectionIdx: number, field: 'clinical_remarks' | 'impression', val: string) => {
    const updated = [...resultSections];
    updated[sectionIdx][field] = val;
    setResultSections(updated);
  };

  const handleTriggerSave = (submitForVerification = false) => {
    // Check if any entered value is critical
    const criticalList: any[] = [];
    resultSections.forEach(sec => {
      sec.parameters.forEach((p: any) => {
        if (p.is_critical || p.flag === 'critical_high' || p.flag === 'critical_low') {
          criticalList.push({
            test_name: sec.test_name,
            param_name: p.param_name,
            value: p.value,
            unit: p.unit,
            flag: p.flag,
            critical_high: p.critical_high,
            critical_low: p.critical_low
          });
        }
      });
    });

    if (criticalList.length > 0 && !criticalAcknowledged) {
      setCriticalValuesToConfirm(criticalList);
      setPendingSubmitAction(submitForVerification);
      return;
    }

    executeSave(submitForVerification);
  };

  const executeSave = async (submitForVerification = false) => {
    setSaving(true);
    try {
      for (const sec of resultSections) {
        await api.post('/results/save', {
          order_id: selectedOrderId,
          order_item_id: sec.order_item_id,
          test_id: sec.test_id,
          parameters: sec.parameters.map((p: any) => ({
            parameter_id: p.parameter_id,
            value: p.value,
            remarks: p.remarks,
          })),
          clinical_remarks: sec.clinical_remarks,
          impression: sec.impression,
          submit_for_verification: submitForVerification,
          critical_acknowledged: true
        });
      }

      success(submitForVerification ? 'Results submitted to Pathologist for verification!' : 'Draft results saved successfully');
      setCriticalValuesToConfirm(null);
      setCriticalAcknowledged(false);

      if (submitForVerification) {
        navigate('/verification');
      }
    } catch (err: any) {
      error(err.message || 'Failed to save results');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Clinical Result Entry Desk</h1>
          <p style={{ fontSize: 13.5, color: '#64748b' }}>
            Enter numerical & qualitative parameters, live biological reference checks, critical alerts, and delta comparisons.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => handleTriggerSave(false)}
            disabled={saving || loading}
            className="btn btn-outline"
            id="btn-save-draft"
          >
            <Save size={16} />
            <span>Save Draft</span>
          </button>
          <button
            onClick={() => handleTriggerSave(true)}
            disabled={saving || loading}
            className="btn btn-primary"
            id="btn-submit-verification"
          >
            <Send size={16} />
            <span>Submit for Verification</span>
          </button>
        </div>
      </div>

      {/* Select Order Card */}
      <div className="card" style={{ marginBottom: 20, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Select Target Order:</span>
          <select
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            className="form-select"
            style={{ maxWidth: 480 }}
          >
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.order_number} — {o.patient_name} [{o.status}] ({o.priority || 'routine'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Patient & Specimen Info Banner */}
      {orderData && (
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: '14px 20px',
          marginBottom: 24,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div>
            <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Patient Demographics</span>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{orderData.order?.patient_name}</div>
            <div style={{ fontSize: 12, color: '#475569' }}>{orderData.order?.patient_id_code}  •  {orderData.order?.age}Y / {orderData.order?.gender}</div>
          </div>

          <div>
            <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Order ID & Lab No</span>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0284c7' }}>{orderData.order?.order_number}</div>
            <div style={{ fontSize: 12, color: '#475569' }}>{orderData.order?.lab_number}</div>
          </div>

          <div>
            <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Referring Physician</span>
            <div style={{ fontWeight: 600, fontSize: 13.5, color: '#0f172a' }}>{orderData.order?.doctor_name || 'Self / General OPD'}</div>
            <div style={{ fontSize: 11.5, color: '#64748b' }}>Branch: {orderData.order?.branch_name || 'Central Hub'}</div>
          </div>

          <div>
            <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Workflow Status</span>
            <div>
              <span className={`badge ${orderData.order?.status === 'completed' || orderData.order?.status === 'approved' ? 'badge-normal' : 'badge-primary'}`} style={{ marginTop: 2 }}>
                {orderData.order?.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Result Entry Panels */}
      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>Loading result entry grid...</div>
      ) : resultSections.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
          No tests found for this order.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {resultSections.map((sec, sIdx) => (
            <div key={sec.order_item_id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Panel Header */}
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '12px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0369a1', margin: 0 }}>
                    {sec.test_name} ({sec.test_code})
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#64748b' }}>
                    Dept: {sec.department}  |  Sample: {sec.sample_type}  {sec.method ? `|  Method: ${sec.method}` : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {sec.is_locked ? (
                    <span className="badge badge-normal" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Lock size={12} />
                      <span>Verified & Locked</span>
                    </span>
                  ) : (
                    <span className={`badge ${sec.status === 'submitted' ? 'badge-primary' : 'badge-low'}`}>
                      {sec.status}
                    </span>
                  )}
                </div>
              </div>

              {/* Parameters Table */}
              <div style={{ padding: '16px 20px' }}>
                <table className="data-table" style={{ fontSize: 12.5 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '25%' }}>Parameter Name</th>
                      <th style={{ width: '20%' }}>Observed Result</th>
                      <th style={{ width: '10%' }}>Unit</th>
                      <th style={{ width: '20%' }}>Biological Ref Interval</th>
                      <th style={{ width: '10%' }}>Flag Status</th>
                      <th style={{ width: '15%' }}>Previous Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sec.parameters.map((p: any, pIdx: number) => {
                      const isCritical = p.is_critical || p.flag === 'critical_high' || p.flag === 'critical_low';
                      return (
                        <tr key={p.parameter_id} style={{ backgroundColor: isCritical ? '#fef2f2' : undefined }}>
                          <td>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.param_name}</div>
                            {p.short_name && <div style={{ fontSize: 10.5, color: '#64748b' }}>{p.short_name}</div>}
                          </td>

                          <td>
                            {/* Render appropriate input type */}
                            {p.result_type === 'positive_negative' ? (
                              <select
                                disabled={sec.is_locked}
                                value={p.value || ''}
                                onChange={(e) => handleValueChange(sIdx, pIdx, e.target.value)}
                                className="form-select"
                                style={{ height: 32, fontSize: 12 }}
                              >
                                <option value="">-- Select --</option>
                                <option value="Negative">Negative</option>
                                <option value="Positive">Positive</option>
                              </select>
                            ) : p.result_type === 'reactive_nonreactive' ? (
                              <select
                                disabled={sec.is_locked}
                                value={p.value || ''}
                                onChange={(e) => handleValueChange(sIdx, pIdx, e.target.value)}
                                className="form-select"
                                style={{ height: 32, fontSize: 12 }}
                              >
                                <option value="">-- Select --</option>
                                <option value="Non-Reactive">Non-Reactive</option>
                                <option value="Reactive">Reactive</option>
                              </select>
                            ) : (
                              <input
                                disabled={sec.is_locked}
                                type={p.result_type === 'numeric' ? 'number' : 'text'}
                                step={p.decimal_precision ? `0.${'0'.repeat(p.decimal_precision - 1)}1` : 'any'}
                                value={p.value || ''}
                                onChange={(e) => handleValueChange(sIdx, pIdx, e.target.value)}
                                placeholder="Enter value..."
                                className="form-input"
                                style={{
                                  height: 32,
                                  fontSize: 12.5,
                                  fontWeight: 600,
                                  borderColor: isCritical ? '#dc2626' : p.flag === 'high' || p.flag === 'low' ? '#f59e0b' : undefined,
                                  backgroundColor: isCritical ? '#fee2e2' : undefined
                                }}
                              />
                            )}
                          </td>

                          <td style={{ color: '#475569', fontWeight: 500 }}>
                            {p.unit || '—'}
                          </td>

                          <td style={{ fontSize: 11.5, color: '#334155' }}>
                            {p.text_range || (p.normal_min !== null && p.normal_max !== null ? `${p.normal_min} - ${p.normal_max}` : 'Normal')}
                          </td>

                          <td>
                            {p.flag === 'critical_high' ? (
                              <span className="badge badge-high" style={{ backgroundColor: '#991b1b', color: '#fff', fontSize: 10 }}>CRIT HIGH</span>
                            ) : p.flag === 'critical_low' ? (
                              <span className="badge badge-high" style={{ backgroundColor: '#991b1b', color: '#fff', fontSize: 10 }}>CRIT LOW</span>
                            ) : p.flag === 'high' ? (
                              <span className="badge badge-high" style={{ fontSize: 10 }}>HIGH</span>
                            ) : p.flag === 'low' ? (
                              <span className="badge badge-low" style={{ fontSize: 10 }}>LOW</span>
                            ) : p.flag === 'abnormal' ? (
                              <span className="badge badge-high" style={{ fontSize: 10 }}>ABNORMAL</span>
                            ) : (
                              <span className="badge badge-normal" style={{ fontSize: 10 }}>NORMAL</span>
                            )}
                          </td>

                          <td>
                            {p.previous_value !== null && p.previous_value !== undefined ? (
                              <div>
                                <span style={{ fontWeight: 600 }}>{p.previous_value}</span>
                                {p.delta_difference !== null && p.delta_difference !== undefined && (
                                  <span style={{ fontSize: 10.5, color: p.delta_difference > 0 ? '#dc2626' : '#10b981', marginLeft: 4 }}>
                                    ({p.delta_difference > 0 ? `+${p.delta_difference}` : p.delta_difference})
                                  </span>
                                )}
                                <div style={{ fontSize: 9.5, color: '#94a3b8' }}>{new Date(p.previous_date).toLocaleDateString('en-IN')}</div>
                              </div>
                            ) : (
                              <span style={{ fontSize: 11, color: '#94a3b8' }}>First visit</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Remarks & Impression */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#475569' }}>Technician Clinical Remarks</label>
                    <input
                      disabled={sec.is_locked}
                      type="text"
                      value={sec.clinical_remarks || ''}
                      onChange={(e) => handleRemarkChange(sIdx, 'clinical_remarks', e.target.value)}
                      placeholder="e.g. Repeated in duplicate; analyzer calibrated"
                      className="form-input"
                      style={{ height: 32, fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#475569' }}>Clinical Impression / Notes</label>
                    <input
                      disabled={sec.is_locked}
                      type="text"
                      value={sec.impression || ''}
                      onChange={(e) => handleRemarkChange(sIdx, 'impression', e.target.value)}
                      placeholder="e.g. Microcytic hypochromic picture"
                      className="form-input"
                      style={{ height: 32, fontSize: 12 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Critical Value Warning Modal */}
      {criticalValuesToConfirm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="card-title" style={{ color: '#dc2626' }}>
                <ShieldAlert size={20} color="#dc2626" />
                CRITICAL VALUE WARNING ALERT
              </h3>
              <button onClick={() => setCriticalValuesToConfirm(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>
                The following entered parameter values exceed configured <strong>panic/critical limits</strong>. As per laboratory quality protocol, immediate physician notification is advised:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {criticalValuesToConfirm.map((crit, idx) => (
                  <div key={idx} style={{
                    padding: '8px 12px',
                    border: '1.5px solid #f87171',
                    borderRadius: 6,
                    backgroundColor: '#fef2f2',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#991b1b', fontSize: 12.5 }}>{crit.param_name}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{crit.test_name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#991b1b' }}>{crit.value} {crit.unit}</div>
                      <div style={{ fontSize: 10, color: '#dc2626', fontWeight: 600 }}>{crit.flag.toUpperCase()}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                <input
                  type="checkbox"
                  id="chk-crit-ack"
                  checked={criticalAcknowledged}
                  onChange={(e) => setCriticalAcknowledged(e.target.checked)}
                />
                <label htmlFor="chk-crit-ack" style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
                  I confirm these panic values have been re-tested and verified on analyzer.
                </label>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setCriticalValuesToConfirm(null)} className="btn btn-outline">
                Review Values
              </button>
              <button
                type="button"
                disabled={!criticalAcknowledged}
                onClick={() => executeSave(pendingSubmitAction)}
                className="btn btn-danger"
                style={{ backgroundColor: '#dc2626', color: '#fff' }}
              >
                Acknowledge & Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
