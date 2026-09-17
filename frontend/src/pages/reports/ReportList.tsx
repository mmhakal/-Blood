import React, { useState, useEffect } from 'react';
import {
  FileText, Eye, Download, CheckCircle2, Search, Send,
  History, Edit3, ShieldCheck, AlertCircle, AlertTriangle,
  RotateCcw, Clock, Lock, Sparkles, Filter
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { ReportPreviewModal } from '../../components/clinical/ReportPreviewModal';

interface VersionItem {
  id: string;
  report_id: string;
  version_number: number;
  snapshot_data: string;
  changed_by: string;
  changed_by_name?: string;
  reason: string;
  created_at: string;
}

export const ReportList: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [previewReportId, setPreviewReportId] = useState<string | null>(null);

  // Version History Modal state
  const [versionModal, setVersionModal] = useState<{
    open: boolean;
    report: any | null;
    versions: VersionItem[];
    loading: boolean;
  }>({
    open: false,
    report: null,
    versions: [],
    loading: false,
  });

  // Amend Modal state
  const [amendModal, setAmendModal] = useState<{
    open: boolean;
    report: any | null;
    reason: string;
    submitting: boolean;
  }>({
    open: false,
    report: null,
    reason: '',
    submitting: false,
  });

  const { error, success } = useNotification();

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/reports?status=${statusFilter}&search=${encodeURIComponent(search)}`);
      const data = Array.isArray(res) ? res : (res?.data || []);
      setReports(data);
    } catch (e: any) {
      error(e.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [statusFilter, search]);

  const handleRelease = async (reportId: string) => {
    try {
      await api.post(`/reports/${reportId}/release`);
      success('Report released for patient delivery');
      loadReports();
    } catch (e: any) {
      error(e.message || 'Failed to release report');
    }
  };

  const handleDownloadPdf = async (reportId: string, repNum: string) => {
    try {
      const blob = await api.get(`/reports/${reportId}/pdf`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Diagnostic_Report_${repNum}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      success('Official PDF downloaded successfully');
    } catch (e: any) {
      error('Failed to download PDF: ' + (e.message || 'Error'));
    }
  };

  const handleOpenVersions = async (report: any) => {
    setVersionModal({ open: true, report, versions: [], loading: true });
    try {
      const versions = await api.get(`/reports/${report.id}/versions`);
      setVersionModal({
        open: true,
        report,
        versions: Array.isArray(versions) ? versions : [],
        loading: false,
      });
    } catch (err: any) {
      error('Failed to load report version history: ' + (err.message || 'Error'));
      setVersionModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleOpenAmend = (report: any) => {
    setAmendModal({
      open: true,
      report,
      reason: '',
      submitting: false,
    });
  };

  const handleSubmitAmend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amendModal.reason.trim()) {
      error('Please provide a specific clinical reason for amending the verified report');
      return;
    }

    setAmendModal((prev) => ({ ...prev, submitting: true }));
    try {
      await api.post(`/reports/${amendModal.report.id}/amend`, {
        amendment_reason: amendModal.reason,
      });
      success(`Report ${amendModal.report.report_number} amended. A new version record has been generated.`);
      setAmendModal({ open: false, report: null, reason: '', submitting: false });
      loadReports();
    } catch (err: any) {
      error('Failed to amend report: ' + (err.message || 'Error'));
      setAmendModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Diagnostic Reports Repository</h1>
          <p style={{ fontSize: 13.5, color: '#64748b' }}>
            Authoritative certified clinical diagnostic reports repository with A4 PDF export, versioning audit trail, and release workflow.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => loadReports()} className="btn btn-outline btn-sm">
            <RotateCcw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ marginBottom: 20, padding: 14, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 11 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Report No (RPT-XXXX), Patient Name, Patient ID, or Order ID..."
            className="form-input"
            style={{ paddingLeft: 40, height: 40 }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-select"
          style={{ width: 220, height: 40 }}
        >
          <option value="">All Report Statuses</option>
          <option value="draft">Draft (In Progress)</option>
          <option value="approved">Approved by Pathologist</option>
          <option value="released">Released for Dispatch</option>
          <option value="amended">Amended Reports</option>
        </select>
      </div>

      {/* Reports Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '18%' }}>Report & Order</th>
              <th style={{ width: '20%' }}>Patient Demographics</th>
              <th style={{ width: '15%' }}>Referring Doctor</th>
              <th style={{ width: '12%' }}>Branch</th>
              <th style={{ width: '15%' }}>Clinical Sign-off</th>
              <th style={{ width: '10%' }}>Status</th>
              <th style={{ width: '10%' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 36, color: '#94a3b8' }}>Loading diagnostic reports...</td></tr>
            ) : reports.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No diagnostic reports found matching criteria.</td></tr>
            ) : (
              reports.map((r) => {
                const isAmended = r.is_amended || r.status === 'amended' || (r.version_number && r.version_number > 1);
                const isApproved = r.status === 'approved';
                const isReleased = r.status === 'released';
                const isStat = r.priority === 'stat';
                const isUrgent = r.priority === 'urgent';

                return (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 700, color: '#0284c7' }}>{r.report_number}</span>
                        {isAmended && (
                          <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#b45309', fontSize: 10, fontWeight: 700 }}>
                            v{r.version_number || 2} Amended
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#475569', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>Order: <strong>{r.order_number}</strong></span>
                        {isStat && <span className="badge badge-stat" style={{ fontSize: 9 }}>STAT</span>}
                        {isUrgent && <span className="badge badge-urgent" style={{ fontSize: 9 }}>URGENT</span>}
                      </div>
                      <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 1 }}>
                        {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{r.patient_name}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {r.patient_id_code} • {r.age} Y / {r.gender}
                      </div>
                      {r.patient_mobile && (
                        <div style={{ fontSize: 10.5, color: '#94a3b8' }}>Ph: {r.patient_mobile}</div>
                      )}
                    </td>

                    <td>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: '#334155' }}>{r.doctor_name || 'Self / OPD'}</div>
                    </td>

                    <td>
                      <span className="badge badge-primary" style={{ fontSize: 10.5 }}>{r.branch_name || 'Central Hub'}</span>
                    </td>

                    <td>
                      {r.approved_by_name ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                            <ShieldCheck size={14} color="#059669" />
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{r.approved_by_name}</span>
                          </div>
                          <div style={{ fontSize: 10.5, color: '#10b981', marginTop: 2 }}>
                            Digitally Certified
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11.5, color: '#d97706', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} />
                          <span>Pending Pathologist</span>
                        </span>
                      )}

                      {r.released_by_name && (
                        <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 3 }}>
                          Released: {r.released_by_name}
                        </div>
                      )}
                    </td>

                    <td>
                      <span className={`badge ${
                        isReleased ? 'badge-normal' :
                        isApproved ? 'badge-low' :
                        isAmended ? 'badge-urgent' : 'badge-pending'
                      }`} style={{ textTransform: 'uppercase', fontSize: 10.5 }}>
                        {r.status}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setPreviewReportId(r.id)}
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: 11, padding: '4px 7px' }}
                          title="Preview live A4 report"
                        >
                          <Eye size={12} />
                          <span>Preview</span>
                        </button>

                        <button
                          onClick={() => handleDownloadPdf(r.id, r.report_number)}
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: 11, padding: '4px 7px' }}
                          title="Download official PDF report"
                        >
                          <Download size={12} />
                          <span>PDF</span>
                        </button>

                        {isApproved && !isReleased && (
                          <button
                            onClick={() => handleRelease(r.id)}
                            className="btn btn-success btn-sm"
                            style={{ fontSize: 11, padding: '4px 7px' }}
                            title="Release report to patient"
                          >
                            <Send size={12} />
                            <span>Release</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenVersions(r)}
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: 11, padding: '4px 7px' }}
                          title="View amendment and version history"
                        >
                          <History size={12} />
                          <span>Versions</span>
                        </button>

                        {(isApproved || isReleased) && (
                          <button
                            onClick={() => handleOpenAmend(r)}
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: 11, padding: '4px 7px', borderColor: '#fed7aa', color: '#c2410c' }}
                            title="Amend this authorized report"
                          >
                            <Edit3 size={12} />
                            <span>Amend</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Version History Modal */}
      {versionModal.open && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <History size={20} color="#0284c7" />
                <span>Audit Trail & Version History - {versionModal.report?.report_number}</span>
              </h3>
              <button
                onClick={() => setVersionModal({ ...versionModal, open: false })}
                className="btn-close"
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: 14, padding: 12, backgroundColor: '#f8fafc', borderRadius: 6, fontSize: 12 }}>
                <div>Patient: <strong>{versionModal.report?.patient_name}</strong> ({versionModal.report?.patient_id_code})</div>
                <div>Current Report Status: <strong style={{ textTransform: 'uppercase' }}>{versionModal.report?.status}</strong> • Version: <strong>v{versionModal.report?.version_number || 1}</strong></div>
              </div>

              {versionModal.loading ? (
                <p style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>Loading versions...</p>
              ) : versionModal.versions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b' }}>
                  <p>Initial release (v1). No amendments or revision snapshots logged yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {versionModal.versions.map((ver) => (
                    <div key={ver.id} style={{
                      padding: 12,
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                      backgroundColor: '#ffffff'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#0284c7', fontSize: 13 }}>
                          Version {ver.version_number}
                        </span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>
                          {new Date(ver.created_at).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div style={{ fontSize: 12, color: '#334155', marginTop: 4 }}>
                        Reason: <em>"{ver.reason || 'Report signed and authorized'}"</em>
                      </div>

                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                        Authorized by: <strong>{ver.changed_by_name || 'System / Pathologist'}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setVersionModal({ ...versionModal, open: false })}
                className="btn btn-outline"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Amend Report Modal */}
      {amendModal.open && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#c2410c' }}>
                <Edit3 size={20} color="#ea580c" />
                <span>Amend Diagnostic Report</span>
              </h3>
              <button
                onClick={() => setAmendModal({ ...amendModal, open: false })}
                className="btn-close"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitAmend}>
              <div className="modal-body">
                <div style={{ padding: 12, backgroundColor: '#fff7ed', borderRadius: 6, border: '1px solid #ffedd5', marginBottom: 14 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <AlertTriangle size={18} color="#ea580c" />
                    <strong style={{ color: '#9a3412', fontSize: 13 }}>Clinical Amendment Notice</strong>
                  </div>
                  <p style={{ fontSize: 12, color: '#c2410c', marginTop: 4, margin: 0 }}>
                    Amending report <strong>{amendModal.report?.report_number}</strong> will create a new audited version (v{(amendModal.report?.version_number || 1) + 1}), preserve previous snapshots in the audit log, and watermark future PDF prints as "AMENDED REPORT".
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">Mandatory Amendment Reason *</label>
                  <textarea
                    rows={4}
                    value={amendModal.reason}
                    onChange={(e) => setAmendModal({ ...amendModal, reason: e.target.value })}
                    placeholder="Provide specific clinical reason (e.g. Reagent re-standardization, additional clinical impression added, reference range adjusted)..."
                    className="form-textarea"
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setAmendModal({ ...amendModal, open: false })}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={amendModal.submitting}
                  className="btn btn-primary"
                  style={{ backgroundColor: '#ea580c', borderColor: '#c2410c' }}
                >
                  {amendModal.submitting ? 'Creating Revision...' : 'Confirm Amendment & New Version'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live A4 Diagnostic Preview Modal */}
      {previewReportId && (
        <ReportPreviewModal reportId={previewReportId} onClose={() => setPreviewReportId(null)} />
      )}
    </div>
  );
};
