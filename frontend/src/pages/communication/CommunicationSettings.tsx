import React, { useState, useEffect } from 'react';
import {
  MessageSquare, Mail, Smartphone, Send, ShieldCheck,
  CheckCircle2, AlertCircle, RefreshCw, Radio, Terminal, Settings, Clock
} from 'lucide-react';
import api from '../../services/api';

export const CommunicationSettings: React.FC = () => {
  const [providers, setProviders] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'providers' | 'templates' | 'logs'>('providers');
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);

  // Dispatch Test State
  const [testDispatch, setTestDispatch] = useState({
    channel: 'sms',
    recipient: '+91 98765 43210',
    subject: 'Verification Ping',
    message: 'Apex Diagnostics: Your test notification connection is active.'
  });
  const [dispatching, setDispatching] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [provRes, tplRes, logRes] = await Promise.all([
        api.get('/communication/providers'),
        api.get('/communication/templates'),
        api.get('/communication/logs'),
      ]);
      setProviders(provRes);
      setTemplates(tplRes);
      setLogs(logRes);
    } catch (err) {
      console.error('Failed to load communication settings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestHandshake = async (id: string, name: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await api.post(`/communication/providers/${id}/test`);
      setTestResult({
        id,
        success: res.success,
        message: `${name}: Handshake successful (${res.latency_ms}ms) — Gateway operational.`
      });
    } catch (err: any) {
      setTestResult({
        id,
        success: false,
        message: `${name}: Handshake failed — ${err.message}`
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleSendDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setDispatching(true);
    try {
      await api.post('/communication/send', testDispatch);
      alert('Notification dispatched successfully and logged in delivery audit trail!');
      loadData();
    } catch (err: any) {
      alert('Dispatch failed: ' + err.message);
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Communication & Notification Gateway</h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>Provider-independent dispatch engine: In-App, Email/SMTP, Healthcare SMS (DLT) & WhatsApp Business API</p>
        </div>

        <button onClick={loadData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Handshake Result Alert */}
      {testResult && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 20,
          backgroundColor: testResult.success ? '#ecfdf5' : '#fef2f2',
          border: testResult.success ? '1px solid #a7f3d0' : '1px solid #fecaca',
          color: testResult.success ? '#065f46' : '#991b1b',
          fontSize: 13
        }}>
          {testResult.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{testResult.message}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab('providers')}
          style={{
            padding: '12px 18px',
            fontSize: 14,
            fontWeight: 600,
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'providers' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'providers' ? '#0284c7' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Radio size={18} />
          <span>Configured Gateways ({providers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          style={{
            padding: '12px 18px',
            fontSize: 14,
            fontWeight: 600,
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'templates' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'templates' ? '#0284c7' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <MessageSquare size={18} />
          <span>Clinical Event Templates ({templates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          style={{
            padding: '12px 18px',
            fontSize: 14,
            fontWeight: 600,
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'logs' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'logs' ? '#0284c7' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Clock size={18} />
          <span>Dispatch Delivery Logs ({logs.length})</span>
        </button>
      </div>

      {/* TAB 1: PROVIDERS */}
      {activeTab === 'providers' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
          {/* Provider Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {providers.map((p) => (
              <div key={p.id} style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                padding: 20,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: p.channel === 'whatsapp' ? '#dcfce7' : p.channel === 'sms' ? '#eff6ff' : '#fef3c7',
                      color: p.channel === 'whatsapp' ? '#16a34a' : p.channel === 'sms' ? '#2563eb' : '#d97706',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {p.channel === 'whatsapp' ? <MessageSquare size={22} /> : p.channel === 'sms' ? <Smartphone size={22} /> : <Mail size={22} />}
                    </div>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>{p.provider_name}</h3>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        Channel: <strong style={{ textTransform: 'uppercase' }}>{p.channel}</strong> • Provider Code: {p.provider_code}
                      </div>
                    </div>
                  </div>

                  <span style={{
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    backgroundColor: p.is_active ? '#ecfdf5' : '#fee2e2',
                    color: p.is_active ? '#059669' : '#dc2626'
                  }}>
                    {p.is_active ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>API Credentials Encrypted (AES-256)</span>
                  <button
                    onClick={() => handleTestHandshake(p.id, p.provider_name)}
                    disabled={testingId === p.id}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 6,
                      backgroundColor: '#f1f5f9',
                      color: '#0284c7',
                      border: '1px solid #cbd5e1',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Terminal size={14} />
                    <span>{testingId === p.id ? 'Pinging Gateway...' : 'Test Connection'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Test Dispatch Form */}
          <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Test Multi-Channel Dispatch</h3>

            <form onSubmit={handleSendDispatch}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Channel</label>
                <select
                  value={testDispatch.channel}
                  onChange={(e) => setTestDispatch({ ...testDispatch, channel: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                >
                  <option value="sms">SMS Gateway</option>
                  <option value="whatsapp">WhatsApp Business Cloud API</option>
                  <option value="email">Email / SMTP</option>
                  <option value="in_app">In-App Notification</option>
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Recipient Phone or Email</label>
                <input
                  type="text"
                  value={testDispatch.recipient}
                  onChange={(e) => setTestDispatch({ ...testDispatch, recipient: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Message Content</label>
                <textarea
                  rows={3}
                  value={testDispatch.message}
                  onChange={(e) => setTestDispatch({ ...testDispatch, message: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <button
                type="submit"
                disabled={dispatching}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                <Send size={16} />
                <span>{dispatching ? 'Dispatching Message...' : 'Send Live Test Message'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: TEMPLATES */}
      {activeTab === 'templates' && (
        <div style={{ backgroundColor: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Configured Clinical Event Message Templates
            </h3>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Dynamic placeholder tags: {'{{patient_name}}, {{order_number}}, {{param_name}}, {{value}}, {{unit}}, {{download_url}}'}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 14px' }}>Event Trigger</th>
                  <th style={{ padding: '12px 14px' }}>Channel</th>
                  <th style={{ padding: '12px 14px' }}>Template Header / Title</th>
                  <th style={{ padding: '12px 14px' }}>Message Body</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((tpl) => (
                  <tr key={tpl.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0284c7' }}>
                      {tpl.event}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        backgroundColor: '#f1f5f9',
                        color: '#334155',
                        textTransform: 'uppercase'
                      }}>
                        {tpl.channel}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>
                      {tpl.title}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569', fontSize: 12 }}>
                      {tpl.body}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DISPATCH LOGS */}
      {activeTab === 'logs' && (
        <div style={{ backgroundColor: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Outgoing Delivery Audit Trail
            </h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 14px' }}>Timestamp</th>
                  <th style={{ padding: '12px 14px' }}>Channel</th>
                  <th style={{ padding: '12px 14px' }}>Recipient</th>
                  <th style={{ padding: '12px 14px' }}>Event</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>
                      No messages dispatched in this session yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>
                        {new Date(l.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 14px', textTransform: 'uppercase', fontWeight: 600, color: '#334155' }}>
                        {l.channel}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>
                        {l.recipient}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#475569' }}>
                        {l.event || 'custom_alert'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor: l.status === 'delivered' || l.status === 'sent' ? '#ecfdf5' : '#fee2e2',
                          color: l.status === 'delivered' || l.status === 'sent' ? '#059669' : '#dc2626'
                        }}>
                          {l.status?.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
