import React, { useState, useEffect } from 'react';
import { Network, RefreshCw, Send, CheckCircle2, AlertCircle, Layers, FileCode } from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export const HL7Gateway: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rawHl7, setRawHl7] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [ackOutput, setAckOutput] = useState('');
  const { error, success } = useNotification();

  useEffect(() => {
    loadData();
    setRawHl7([
      'MSH|^~\\&|COBAS311|ROCHE|MEDIFLOW_LIS|APEX|20260914120000||ORU^R01|MSG-9021|P|2.5',
      'PID|1||PID-2026-0001||Miller^Johnathan',
      'OBR|1|ORD-2026-0001|SMP-2026-0001|^^^BIOCHEMISTRY',
      'OBX|1|NM|^^^GLUC^Glucose||98.5|mg/dL|70-100|N|||F',
      'OBX|2|NM|^^^CREA^Creatinine||1.05|mg/dL|0.7-1.3|N|||F'
    ].join('\r\n'));
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sRes, mRes] = await Promise.all([
        api.get('/hl7/dashboard'),
        api.get('/hl7/messages')
      ]);
      setStats(sRes);
      setMessages(mRes || []);
    } catch (err: any) {
      error(err.message || 'Failed to load HL7 gateway');
    } finally {
      setLoading(false);
    }
  };

  const handleIngest = async () => {
    if (!rawHl7.trim()) {
      error('Please provide an HL7 message frame');
      return;
    }

    setIngesting(true);
    setAckOutput('');
    try {
      const res = await fetch('http://localhost:5000/api/hl7/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: rawHl7
      });
      const ackText = await res.text();
      setAckOutput(ackText);
      success('HL7 message ingested and ACK generated');
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to ingest HL7');
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>HL7 v2.x Communication Gateway</h1>
          <p style={{ fontSize: 13.5, color: '#64748b', marginTop: 4 }}>
            Hospital Information System (HIS/EMR) & Analyzer Integration Engine (ORU_R01, OML_O21, ACK).
          </p>
        </div>
        <button onClick={loadData} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={15} /> Refresh Gateway
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="kpi-card" style={{ borderLeft: '4px solid #0284c7' }}>
          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Total Transactions</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', marginTop: 8 }}>{stats?.total_messages || 0}</div>
          <span style={{ fontSize: 12, color: '#64748b' }}>HL7 Messages Processed</span>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Successful ACKs</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981', marginTop: 8 }}>{stats?.successful_acks || 0}</div>
          <span style={{ fontSize: 12, color: '#10b981' }}>MSA|AA Acknowledgements</span>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #6366f1' }}>
          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>ORU Observations</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#6366f1', marginTop: 8 }}>{stats?.oru_observation_messages || 0}</div>
          <span style={{ fontSize: 12, color: '#6366f1' }}>Result Data Packets</span>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Avg Processing Latency</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b', marginTop: 8 }}>{stats?.average_processing_ms || 14} ms</div>
          <span style={{ fontSize: 12, color: '#f59e0b' }}>Real-time Parser Response</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Message Ingestion Panel */}
        <div className="card" style={{ padding: 24, borderRadius: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Manual HL7 Message Ingestion Desk</h3>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
            Input HL7 formatted string (segments separated by carriage return/newline) to test parsing and instant ACK generation.
          </p>

          <textarea
            rows={10}
            value={rawHl7}
            onChange={(e) => setRawHl7(e.target.value)}
            className="form-input"
            style={{ fontFamily: 'Consolas, monospace', fontSize: 12.5, lineHeight: 1.4, marginBottom: 14 }}
          />

          <button
            onClick={handleIngest}
            disabled={ingesting}
            className="btn-primary"
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 11 }}
          >
            <Send size={16} />
            <span>{ingesting ? 'Validating & Ingesting...' : 'Ingest HL7 & Generate ACK'}</span>
          </button>
        </div>

        {/* ACK Response Panel */}
        <div className="card" style={{ padding: 24, borderRadius: 12, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Generated HL7 ACK Response</h3>
          {ackOutput ? (
            <div style={{ flex: 1 }}>
              <div style={{ padding: 12, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontFamily: 'Consolas, monospace', fontSize: 12.5, whiteSpace: 'pre-wrap', color: '#0369a1' }}>
                {ackOutput}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontWeight: 600, fontSize: 13, marginTop: 14 }}>
                <CheckCircle2 size={16} /> HL7 v2.5 Standard ACK Transmitted
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', textAlign: 'center' }}>
              <FileCode size={36} strokeWidth={1.5} style={{ marginBottom: 10 }} />
              <p style={{ fontSize: 13 }}>Click "Ingest HL7" to inspect the generated HL7 ACK acknowledgement envelope.</p>
            </div>
          )}
        </div>
      </div>

      {/* HL7 Message History */}
      <div className="card" style={{ padding: 24, borderRadius: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>HL7 Transaction History</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: 10 }}>Timestamp</th>
                <th style={{ padding: 10 }}>Direction</th>
                <th style={{ padding: 10 }}>Message Type</th>
                <th style={{ padding: 10 }}>Control ID</th>
                <th style={{ padding: 10 }}>ACK Code</th>
                <th style={{ padding: 10 }}>Raw Segments Preview</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 10, color: '#64748b' }}>{new Date(m.created_at).toLocaleString()}</td>
                  <td style={{ padding: 10, fontWeight: 600 }}>{m.direction.toUpperCase()}</td>
                  <td style={{ padding: 10, color: '#0284c7', fontWeight: 700 }}>{m.message_type}</td>
                  <td style={{ padding: 10, fontFamily: 'monospace' }}>{m.control_id}</td>
                  <td style={{ padding: 10 }}>
                    <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d' }}>
                      {m.ack_code}
                    </span>
                  </td>
                  <td style={{ padding: 10, fontFamily: 'monospace', maxWidth: 350, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.raw_hl7}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
