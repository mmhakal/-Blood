import React, { useState, useEffect, useMemo } from 'react';
import {
  FileCheck, CheckCircle2, AlertTriangle, ShieldCheck, Eye, Download,
  XCircle, RotateCcw, Search, ArrowUpRight, ArrowDownRight,
  Clock, Lock, FileText, AlertOctagon, User, Stethoscope, ChevronRight
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { ReportPreviewModal } from '../../components/clinical/ReportPreviewModal';

interface RejectModalState {
  open: boolean;
  resultId: string;
  testName: string;
  reason: string;
  correctionNotes: string;
}

export const VerificationDesk: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reportDetail, setReportDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [previewModalId, setPreviewModalId] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'critical' | 'abnormal'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Rejection Modal state
  const [rejectModal, setRejectModal] = useState<RejectModalState>({
    open: false,
    resultId: '',
    testName: '',
    reason: 'suspected_hemolysis',
    correctionNotes: '',
  });

  const { error, success } = useNotification();

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports?status=draft');
      const data = Array.isArray(res) ? res : (res?.data || []);
      setReports(data);
      if (data.length > 0 && !selectedReportId) {
        setSelectedReportId(data[0].id);
      } else if (data.length === 0) {
        setSelectedReportId(null);
        setReportDetail(null);
      }
    } catch (e: any) {
      error(e.message || 'Failed to load pending verifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const loadDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      const detail = await api.get(`/reports/${id}`);
      setReportDetail(detail);
      setClinicalNotes(detail.testResults?.[0]?.clinical_remarks || '');
    } catch (e: any) {
      error(e.message || 'Failed to load report details');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (selectedReportId) {
      loadDetail(selectedReportId);
    }
  }, [selectedReportId]);

  // Check critical count in current report
  const criticalAlerts = useMemo(() => {
    if (!reportDetail?.testResults) return [];
    const criticals: any[] = [];
    reportDetail.testResults.forEach((t: any) => {
      t.parameters?.forEach((p: any) => {
        if (p.is_critical || p.flag === 'critical_high' || p.flag === 'critical_low') {
          criticals.push({ testName: t.test_name, paramName: p.param_name, value: p.value_numeric ?? p.value_text, flag: p.flag, unit: p.unit });
        }
      });
    });
    return criticals;
  }, [reportDetail]);

  const handleApprove = async () => {
    if (!selectedReportId) return;
    setApproving(true);
    try {
      await api.post(`/reports/${selectedReportId}/approve`, {
        clinical_notes: clinicalNotes,
      });
      success('Report clinically approved and digitally certified with pathologist signature!');
      setSelectedReportId(null);
      setReportDetail(null);
      await loadReports();
    } catch (err: any) {
      error(err.message || 'Failed to approve report');
    } finally {
      setApproving(false);
    }
  };

  const handleVerifyIndividual = async (resultId: string) => {
    try {
      await api.post(`/results/${resultId}/verify`, { remarks: clinicalNotes || 'Clinically verified by Pathologist' });
      success('Test result verified and locked!');
      if (selectedReportId) loadDetail(selectedReportId);
    } catch (err: any) {
      error(err.message || 'Failed to verify result');
    }
  };

  const handleOpenReject = (resultId: string, testName: string) => {
    setRejectModal({
      open: true,
      resultId,
      testName,
      reason: 'suspected_hemolysis',
      correctionNotes: '',
    });
  };

  const handleSubmitReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModal.correctionNotes.trim()) {
      error('Please provide specific correction instructions for the laboratory technician');
      return;
    }

    try {
      await api.post(`/results/${rejectModal.resultId}/reject`, {
        reason: rejectModal.reason,
        correction_requested: rejectModal.correctionNotes,
      });
      success(`Test "${rejectModal.testName}" returned to technician worklist for recorrection.`);
      setRejectModal({ open: false, resultId: '', testName: '', reason: 'suspected_hemolysis', correctionNotes: '' });
      if (selectedReportId) loadDetail(selectedReportId);
    } catch (err: any) {
      error(err.message || 'Failed to reject test result');
    }
  };

  const handleDownloadPdf = async (reportId: string, reportNum: string) => {
    try {
      const blob = await api.get(`/reports/${reportId}/pdf`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Diagnostic_Report_${reportNum}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      success('Official PDF report downloaded successfully');
    } catch (e: any) {
      error('Failed to download PDF report: ' + (e.message || 'Error'));
    }
  };

  const applyTemplate = (text: string) => {
    setClinicalNotes((prev) => (prev ? `${prev} ${text}` : text));
  };

  // Filter reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchesSearch =
        !searchQuery ||
        r.report_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.patient_id_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.order_number?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [reports, searchQuery]);

  return (
    <div>
      {/* Top Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Consultant Pathologist Verification & Sign-off Desk</h1>
          <p style={{ fontSize: 13.5, color: '#64748b' }}>
            Laboratory result validation, abnormal & critical panic flag scrutiny, delta check comparison, and legal digital certification.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => loadReports()} className="btn btn-outline btn-sm">
            <RotateCcw size={14} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Main Split Interface */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, alignItems: 'start' }}>
        
        {/* Left Column: Queue */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 className="card-title" style={{ fontSize: 15, margin: 0 }}>
              <FileCheck size={18} color="#0284c7" />
              <span>Pending Queue ({filteredReports.length})</span>
            </h3>
          </div>

          {/* Quick Search in Queue */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 10 }} />
            <input
              type="text"
              placeholder="Search queue (Report, Patient)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: 32, height: 34, fontSize: 12 }}
            />
          </div>

          {/* Queue List Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', paddingRight: 4 }}>
            {loading ? (
              <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: 20 }}>Loading pending verifications...</p>
            ) : filteredReports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: '#64748b' }}>
                <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, fontWeight: 600 }}>Verification Desk Clear</p>
                <p style={{ fontSize: 12, color: '#94a3b8' }}>All laboratory test results have been verified and signed off.</p>
              </div>
            ) : (
              filteredReports.map((r) => {
                const isSelected = selectedReportId === r.id;
                const isStat = r.priority === 'stat';
                const isUrgent = r.priority === 'urgent';
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedReportId(r.id)}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      border: `1.5px solid ${isSelected ? '#0284c7' : '#e2e8f0'}`,
                      backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 8px rgba(2, 132, 199, 0.12)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0284c7' }}>{r.report_number}</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {isStat && (
                          <span className="badge" style={{ backgroundColor: '#fee2e2', color: '#dc2626', fontSize: 10, fontWeight: 700 }}>
                            STAT
                          </span>
                        )}
                        {isUrgent && (
                          <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#d97706', fontSize: 10, fontWeight: 700 }}>
                            URGENT
                          </span>
                        )}
                        <span className="badge badge-low" style={{ fontSize: 10 }}>Ready</span>
                      </div>
                    </div>

                    <div style={{ fontWeight: 600, fontSize: 13.5, color: '#0f172a', marginTop: 4 }}>
                      {r.patient_name}
                    </div>

                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{r.patient_id_code} • {r.age} Y / {r.gender}</span>
                      <span>{r.branch_name || 'Main Lab'}</span>
                    </div>

                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Order: {r.order_number}</span>
                      <span>{new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Pathologist Detailed Review Desk */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {!selectedReportId || !reportDetail ? (
            <div style={{ padding: 80, textAlign: 'center', color: '#64748b' }}>
              <FileCheck size={48} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#334155' }}>Select a report from the queue</h3>
              <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                Review observed parameters, verify reference intervals, add clinical impressions, and authorize report release.
              </p>
            </div>
          ) : detailLoading ? (
            <div style={{ padding: 80, textAlign: 'center', color: '#64748b' }}>
              <p>Loading report validation data...</p>
            </div>
          ) : (
            <div>
              {/* Header Action Bar */}
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#0f172a' }}>
                      {reportDetail.report?.report_number}
                    </h3>
                    <span className="badge badge-primary" style={{ fontSize: 11 }}>
                      Order: {reportDetail.report?.order_number}
                    </span>
                    {reportDetail.report?.priority === 'stat' && (
                      <span className="badge" style={{ backgroundColor: '#dc2626', color: '#ffffff', fontSize: 11, fontWeight: 700 }}>
                        STAT EMERGENCY
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                    Patient: <strong style={{ color: '#0f172a' }}>{reportDetail.report?.patient_name}</strong> ({reportDetail.report?.patient_id_code}) • {reportDetail.report?.age} {reportDetail.report?.age_unit || 'Yrs'} / {reportDetail.report?.gender} • Ref: <strong>{reportDetail.report?.doctor_name || 'Self / OPD'}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setPreviewModalId(reportDetail.report?.id)}
                    className="btn btn-outline btn-sm"
                    title="Preview authoritative A4 diagnostic report"
                  >
                    <Eye size={14} />
                    <span>Live A4 Preview</span>
                  </button>

                  <button
                    onClick={() => handleDownloadPdf(reportDetail.report?.id, reportDetail.report?.report_number)}
                    className="btn btn-outline btn-sm"
                    title="Direct PDF download"
                  >
                    <Download size={14} />
                    <span>PDF</span>
                  </button>

                  <button
                    onClick={handleApprove}
                    disabled={approving}
                    className="btn btn-primary btn-sm"
                    style={{ backgroundColor: '#059669', borderColor: '#047857' }}
                  >
                    <ShieldCheck size={16} />
                    <span>{approving ? 'Digitally Certifying...' : 'Approve & Digitally Sign'}</span>
                  </button>
                </div>
              </div>

              {/* Critical Alert Warning Banner */}
              {criticalAlerts.length > 0 && (
                <div style={{
                  backgroundColor: '#fef2f2',
                  borderBottom: '1px solid #fecaca',
                  padding: '12px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <AlertOctagon size={24} color="#dc2626" style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: '#991b1b', fontSize: 13.5 }}>
                      CRITICAL PANIC VALUE ALERT ({criticalAlerts.length} parameters)
                    </strong>
                    <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 2 }}>
                      Immediate clinical correlation and telephonic notification to referring physician recommended:
                      {criticalAlerts.map((c, i) => (
                        <span key={i} style={{ fontWeight: 600, marginLeft: 6 }}>
                          • {c.paramName}: {c.value} {c.unit || ''} ({c.flag.toUpperCase()})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Patient Demographics Strip */}
              <div style={{ padding: '12px 20px', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, fontSize: 12 }}>
                <div>
                  <span style={{ color: '#64748b' }}>Laboratory:</span>{' '}
                  <strong style={{ color: '#0f172a' }}>{reportDetail.report?.lab_name || 'Apex Labs'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Branch / Location:</span>{' '}
                  <strong style={{ color: '#0f172a' }}>{reportDetail.report?.branch_name || 'Central Hub'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Contact Mobile:</span>{' '}
                  <strong style={{ color: '#0f172a' }}>{reportDetail.report?.mobile || 'N/A'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Order Registered:</span>{' '}
                  <strong style={{ color: '#0f172a' }}>
                    {new Date(reportDetail.report?.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </strong>
                </div>
              </div>

              {/* Test Results Scrutiny Body */}
              <div style={{ padding: 20, maxHeight: 'calc(100vh - 420px)', overflowY: 'auto' }}>
                {reportDetail.testResults?.map((test: any) => {
                  const isVerified = test.result_status === 'verified';
                  const isRejected = test.result_status === 'rejected';

                  return (
                    <div key={test.result_id} style={{
                      marginBottom: 24,
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      overflow: 'hidden',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}>
                      {/* Test Title Header */}
                      <div style={{
                        backgroundColor: '#f8fafc',
                        padding: '10px 16px',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 8
                      }}>
                        <div>
                          <span style={{ fontSize: 15, fontWeight: 700, color: '#0284c7' }}>
                            {test.test_name} ({test.test_code})
                          </span>
                          <span style={{ fontSize: 12, color: '#64748b', marginLeft: 10 }}>
                            Dept: {test.department || 'Clinical Pathology'} • Method: {test.method || 'Automated Flow / Spectrophotometry'}
                          </span>
                        </div>

                        {/* Test Status & Verification Action */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {isVerified ? (
                            <span className="badge badge-normal" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Lock size={12} />
                              <span>Verified</span>
                            </span>
                          ) : isRejected ? (
                            <span className="badge badge-pending" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                              Rejected for Correction
                            </span>
                          ) : (
                            <span className="badge badge-low">
                              Draft Review
                            </span>
                          )}

                          {!isVerified && (
                            <button
                              onClick={() => handleVerifyIndividual(test.result_id)}
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: 11, padding: '3px 8px' }}
                              title="Verify this specific test result"
                            >
                              <CheckCircle2 size={13} color="#10b981" />
                              <span>Verify Test</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenReject(test.result_id, test.test_name)}
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: 11, padding: '3px 8px', borderColor: '#fca5a5', color: '#b91c1c' }}
                            title="Request correction or reject back to technician"
                          >
                            <XCircle size={13} color="#dc2626" />
                            <span>Request Correction</span>
                          </button>
                        </div>
                      </div>

                      {/* Parameters Table */}
                      <table className="data-table" style={{ margin: 0 }}>
                        <thead>
                          <tr style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ width: '28%' }}>Parameter</th>
                            <th style={{ width: '18%' }}>Observed Value</th>
                            <th style={{ width: '14%' }}>Unit</th>
                            <th style={{ width: '22%' }}>Biological Reference Interval</th>
                            <th style={{ width: '18%' }}>Flag & Delta Check</th>
                          </tr>
                        </thead>
                        <tbody>
                          {test.parameters?.map((p: any) => {
                            const isCritical = p.is_critical || p.flag === 'critical_high' || p.flag === 'critical_low';
                            const isAbnormal = p.flag === 'high' || p.flag === 'low' || isCritical;
                            
                            // Delta check calculation if previous_value exists
                            let deltaDiff = null;
                            if (p.previous_value !== null && p.previous_value !== undefined && p.value_numeric !== null) {
                              const prevNum = parseFloat(p.previous_value);
                              if (!isNaN(prevNum) && prevNum > 0) {
                                const diff = p.value_numeric - prevNum;
                                const pct = ((diff / prevNum) * 100).toFixed(1);
                                deltaDiff = { diff, pct, increased: diff > 0 };
                              }
                            }

                            return (
                              <tr key={p.id} style={{ backgroundColor: isCritical ? '#fef2f2' : undefined }}>
                                <td>
                                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.param_name}</div>
                                  {p.short_name && <div style={{ fontSize: 10, color: '#94a3b8' }}>{p.short_name}</div>}
                                </td>
                                <td>
                                  <span style={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: isCritical ? '#dc2626' : (isAbnormal ? '#d97706' : '#0f172a'),
                                    backgroundColor: isCritical ? '#fee2e2' : undefined,
                                    padding: isCritical ? '2px 6px' : undefined,
                                    borderRadius: isCritical ? 4 : undefined
                                  }}>
                                    {p.value_numeric !== null ? p.value_numeric : (p.value_text || '-')}
                                  </span>
                                </td>
                                <td style={{ color: '#64748b', fontSize: 12 }}>
                                  {p.unit || '-'}
                                </td>
                                <td style={{ color: '#475569', fontSize: 12 }}>
                                  {p.reference_range_text || 'Standard'}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <div>
                                      <span className={`badge badge-${p.flag}`} style={{
                                        fontWeight: 700,
                                        fontSize: 10,
                                        backgroundColor: isCritical ? '#991b1b' : undefined,
                                        color: isCritical ? '#ffffff' : undefined
                                      }}>
                                        {p.flag ? p.flag.replace('_', ' ').toUpperCase() : 'NORMAL'}
                                      </span>
                                    </div>

                                    {/* Delta check pill */}
                                    {p.previous_value ? (
                                      <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span>Prev: {p.previous_value}</span>
                                        {deltaDiff && (
                                          <span style={{
                                            color: deltaDiff.increased ? '#dc2626' : '#0284c7',
                                            fontWeight: 600,
                                            display: 'inline-flex',
                                            alignItems: 'center'
                                          }}>
                                            {deltaDiff.increased ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                            {deltaDiff.pct}%
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span style={{ fontSize: 10, color: '#cbd5e1' }}>No delta history</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}

                {/* Pathologist Clinical Remarks & Impression Section */}
                <div style={{
                  padding: 16,
                  backgroundColor: '#f0fdf4',
                  borderRadius: 8,
                  border: '1px solid #bbf7d0',
                  marginTop: 10
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label className="form-label" style={{ color: '#166534', fontWeight: 700, margin: 0 }}>
                      Pathologist Clinical Impression & Diagnostic Remarks:
                    </label>
                    <div style={{ fontSize: 11, color: '#15803d' }}>
                      Embossed on final authorized report with digital signature
                    </div>
                  </div>

                  {/* Quick Impression Template Chips */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: '#475569', alignSelf: 'center' }}>Quick Templates:</span>
                    <button
                      type="button"
                      onClick={() => applyTemplate('Normocytic normochromic blood picture. Clinically correlate.')}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: 11, padding: '2px 6px', backgroundColor: '#ffffff' }}
                    >
                      + Normocytic Normochromic
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTemplate('Fasting blood glucose elevated. Glycemic evaluation advised.')}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: 11, padding: '2px 6px', backgroundColor: '#ffffff' }}
                    >
                      + Impaired Glucose
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTemplate('Renal function parameters within physiological biological limits.')}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: 11, padding: '2px 6px', backgroundColor: '#ffffff' }}
                    >
                      + Normal Renal
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTemplate('Lipid profile indicates moderate dyslipidemia.')}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: 11, padding: '2px 6px', backgroundColor: '#ffffff' }}
                    >
                      + Dyslipidemia
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    placeholder="Enter diagnostic impression or clinical correlation remarks..."
                    className="form-textarea"
                    style={{ backgroundColor: '#ffffff', borderColor: '#86efac' }}
                  />

                  {/* Digital Signature Notice */}
                  <div style={{
                    marginTop: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: '#ffffff',
                    borderRadius: 6,
                    border: '1px solid #dcfce7'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ShieldCheck size={18} color="#16a34a" />
                      <span style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>
                        Digital Certification: Approving applies cryptographic SHA-256 hash stamp & locks results against alteration.
                      </span>
                    </div>

                    <button
                      onClick={handleApprove}
                      disabled={approving}
                      className="btn btn-primary btn-sm"
                      style={{ backgroundColor: '#15803d', borderColor: '#166534' }}
                    >
                      <ShieldCheck size={15} />
                      <span>{approving ? 'Authorizing & Signing...' : 'Sign & Authorize Report'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rejection / Correction Request Modal */}
      {rejectModal.open && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b91c1c' }}>
                <XCircle size={20} color="#dc2626" />
                <span>Reject & Request Correction</span>
              </h3>
              <button
                onClick={() => setRejectModal({ ...rejectModal, open: false })}
                className="btn-close"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitReject}>
              <div className="modal-body">
                <p style={{ fontSize: 13, color: '#475569', marginBottom: 14 }}>
                  Test: <strong style={{ color: '#0f172a' }}>{rejectModal.testName}</strong>
                  <br />
                  This test will be marked as <strong>Rejected</strong> and sent back to the laboratory technician's worklist with your instructions.
                </p>

                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label">Clinical / Analytical Rejection Reason *</label>
                  <select
                    value={rejectModal.reason}
                    onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                    className="form-select"
                    required
                  >
                    <option value="suspected_hemolysis">Gross hemolysis / lipemic interference suspected</option>
                    <option value="clotted_sample">Clotted or micro-clotted specimen detected</option>
                    <option value="delta_check_failure">Delta check discrepancy exceeding physiological limit</option>
                    <option value="instrument_flag">Instrument analytical flag / out of linearity</option>
                    <option value="dilution_error">Suspected dilution or unit calculation error</option>
                    <option value="other">Other analytical / clinical discrepancy</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Specific Correction Instructions for Technician *</label>
                  <textarea
                    rows={4}
                    value={rejectModal.correctionNotes}
                    onChange={(e) => setRejectModal({ ...rejectModal, correctionNotes: e.target.value })}
                    placeholder="e.g. Please re-run test on fresh aliquot with 1:2 dilution, calibrate QC level 2..."
                    className="form-textarea"
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setRejectModal({ ...rejectModal, open: false })}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ backgroundColor: '#dc2626', borderColor: '#b91c1c' }}
                >
                  Submit Rejection to Technician
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live A4 Diagnostic Preview Modal */}
      {previewModalId && (
        <ReportPreviewModal reportId={previewModalId} onClose={() => setPreviewModalId(null)} />
      )}
    </div>
  );
};
