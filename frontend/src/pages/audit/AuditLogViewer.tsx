import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Eye, Filter, Clock, User } from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [actionFilter, setActionFilter] = useState('');
  const { error } = useNotification();

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/audit-logs?action=${actionFilter}`);
      setLogs(res);
    } catch (e: any) {
      error(e.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Security & Clinical Audit Trail</h1>
          <p style={{ fontSize: 13.5, color: '#64748b' }}>
            Tamper-evident logs of all patient registrations, test orders, result entries, and pathologist authorizations.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: 14 }}>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="form-select"
          style={{ maxWidth: 280 }}
        >
          <option value="">All Audited Actions</option>
          <option value="LOGIN">LOGIN</option>
          <option value="CREATE_PATIENT">CREATE_PATIENT</option>
          <option value="CREATE_ORDER">CREATE_ORDER</option>
          <option value="UPDATE_SAMPLE_STATUS">UPDATE_SAMPLE_STATUS</option>
          <option value="ENTER_RESULTS">ENTER_RESULTS</option>
          <option value="APPROVE_REPORT">APPROVE_REPORT</option>
          <option value="PRINT_REPORT_PDF">PRINT_REPORT_PDF</option>
          <option value="RECEIVE_PAYMENT">RECEIVE_PAYMENT</option>
        </select>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action Performed</th>
              <th>Operator / User</th>
              <th>Target Entity</th>
              <th>IP Address</th>
              <th>Diff Inspector</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30 }}>Loading audit records...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>No audit events found.</td></tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id}>
                  <td>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{new Date(l.created_at).toLocaleDateString('en-IN')}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{new Date(l.created_at).toLocaleTimeString()}</div>
                  </td>
                  <td>
                    <span className="badge badge-primary" style={{ fontFamily: 'monospace' }}>
                      {l.action}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 12.5 }}>{l.user_email || 'System'}</div>
                    <div style={{ fontSize: 10.5, color: '#64748b' }}>Role: {l.user_role || 'Auto'}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: 12.5 }}>{l.entity_type}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>ID: {l.entity_id || 'N/A'}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: 11.5, fontFamily: 'monospace' }}>{l.ip_address}</span>
                  </td>
                  <td>
                    {(l.new_values || l.old_values) && (
                      <button
                        onClick={() => setSelectedLog(l)}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: 11 }}
                      >
                        <Eye size={12} />
                        <span>Inspect Payload</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* State Payload Inspector Modal */}
      {selectedLog && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3 className="card-title">
                <ShieldCheck size={18} color="#0284c7" />
                Audit State Inspector: {selectedLog.action}
              </h3>
              <button onClick={() => setSelectedLog(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                &times;
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: 14, fontSize: 12.5, color: '#64748b' }}>
                Event ID: <code>{selectedLog.id}</code>  •  Operator: <strong>{selectedLog.user_email}</strong>  •  Timestamp: {new Date(selectedLog.created_at).toLocaleString()}
              </div>

              {selectedLog.new_values && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', marginBottom: 4 }}>Applied State Payload:</div>
                  <pre style={{ backgroundColor: '#0f172a', color: '#38bdf8', padding: 14, borderRadius: 6, fontSize: 11.5, overflowX: 'auto', maxHeight: 250 }}>
                    {JSON.stringify(JSON.parse(selectedLog.new_values), null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setSelectedLog(null)} className="btn btn-outline">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
