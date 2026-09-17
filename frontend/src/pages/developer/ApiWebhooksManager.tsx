import React, { useState, useEffect } from 'react';
import {
  Code, Key, Webhook, RefreshCw, Plus, Trash2, Send, CheckCircle2,
  AlertTriangle, Copy, Check, ShieldCheck, Eye, EyeOff, X, Globe, Terminal
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export const ApiWebhooksManager: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'keys' | 'webhooks' | 'logs'>('keys');
  const { error, success } = useNotification();

  // Create Key Modal
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [rateLimit, setRateLimit] = useState('120');
  const [ipWhitelist, setIpWhitelist] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['orders:read', 'results:read']);
  const [creatingKey, setCreatingKey] = useState(false);

  // Secret Key Revealed Modal
  const [newlyCreatedSecret, setNewlyCreatedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Create Webhook Modal
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookName, setWebhookName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['order.created', 'result.imported', 'report.released']);
  const [creatingWebhook, setCreatingWebhook] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [keysRes, hooksRes, logsRes] = await Promise.all([
        api.get('/developer/keys').catch(() => []),
        api.get('/developer/webhooks').catch(() => []),
        api.get('/developer/logs').catch(() => ({ deliveries: [] }))
      ]);
      setApiKeys(keysRes || []);
      setWebhooks(hooksRes || []);
      setDeliveries(logsRes?.deliveries || []);
    } catch (err: any) {
      error(err.message || 'Failed to load developer portal');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName) return;

    setCreatingKey(true);
    try {
      const res = await api.post('/developer/keys', {
        name: keyName,
        permissions: selectedScopes,
        rate_limit_rpm: parseInt(rateLimit || '120', 10),
        ip_whitelist: ipWhitelist || null
      });

      setShowKeyModal(false);
      setNewlyCreatedSecret(res.api_key);
      setKeyName('');
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to generate API key');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!window.confirm('Are you sure you want to revoke this API key? Applications using it will be blocked immediately.')) return;

    try {
      await api.delete(`/developer/keys/${id}`);
      success('API Key revoked successfully');
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to revoke key');
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookName || !webhookUrl) return;

    setCreatingWebhook(true);
    try {
      await api.post('/developer/webhooks', {
        name: webhookName,
        target_url: webhookUrl,
        subscribed_events: selectedEvents
      });
      success('Webhook endpoint registered successfully');
      setShowWebhookModal(false);
      setWebhookName('');
      setWebhookUrl('');
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to register webhook');
    } finally {
      setCreatingWebhook(false);
    }
  };

  const handleTestWebhook = async (id: string) => {
    try {
      const res = await api.post(`/developer/webhooks/${id}/test`);
      success(res.message || 'Test HMAC-SHA256 ping sent');
      setTimeout(loadData, 500);
    } catch (err: any) {
      error(err.message || 'Failed to send test webhook');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleScope = (scope: string) => {
    if (selectedScopes.includes(scope)) {
      setSelectedScopes(selectedScopes.filter(s => s !== scope));
    } else {
      setSelectedScopes([...selectedScopes, scope]);
    }
  };

  const toggleEvent = (event: string) => {
    if (selectedEvents.includes(event)) {
      setSelectedEvents(selectedEvents.filter(e => e !== event));
    } else {
      setSelectedEvents([...selectedEvents, event]);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ padding: 8, borderRadius: 8, background: '#ede9fe', color: '#7c3aed' }}>
              <Code size={24} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Developer API & Webhooks Engine</h1>
          </div>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            RESTful API keys with rate-limiting, HMAC-SHA256 webhook dispatch, and integration delivery logs.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            id="btn-refresh-developer"
            onClick={loadData}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, color: '#475569', cursor: 'pointer', fontWeight: 500 }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button
            id="btn-create-webhook-open"
            onClick={() => setShowWebhookModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, color: '#475569', cursor: 'pointer', fontWeight: 600 }}
          >
            <Webhook size={16} /> Add Webhook
          </button>
          <button
            id="btn-generate-key-open"
            onClick={() => setShowKeyModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#7c3aed', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: 600, boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)' }}
          >
            <Key size={16} /> Generate API Key
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 20, gap: 16 }}>
        <button
          id="tab-dev-keys"
          onClick={() => setActiveTab('keys')}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'keys' ? '2px solid #7c3aed' : '2px solid transparent',
            color: activeTab === 'keys' ? '#7c3aed' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Key size={16} /> API Keys ({apiKeys.length})
        </button>
        <button
          id="tab-dev-webhooks"
          onClick={() => setActiveTab('webhooks')}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'webhooks' ? '2px solid #7c3aed' : '2px solid transparent',
            color: activeTab === 'webhooks' ? '#7c3aed' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Webhook size={16} /> Webhook Subscriptions ({webhooks.length})
        </button>
        <button
          id="tab-dev-logs"
          onClick={() => setActiveTab('logs')}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'logs' ? '2px solid #7c3aed' : '2px solid transparent',
            color: activeTab === 'logs' ? '#7c3aed' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Terminal size={16} /> Delivery Logs ({deliveries.length})
        </button>
      </div>

      {/* TAB 1: API KEYS */}
      {activeTab === 'keys' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Key Name</th>
                <th style={{ padding: '12px 16px' }}>Key Prefix</th>
                <th style={{ padding: '12px 16px' }}>Permissions & Scopes</th>
                <th style={{ padding: '12px 16px' }}>Rate Limit</th>
                <th style={{ padding: '12px 16px' }}>Created</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    No API keys active. Generate a key to integrate external EMR or LIMS software.
                  </td>
                </tr>
              ) : (
                apiKeys.map((key) => {
                  let scopes: string[] = [];
                  try {
                    scopes = typeof key.permissions === 'string' ? JSON.parse(key.permissions) : key.permissions;
                  } catch {
                    scopes = ['orders:read'];
                  }

                  return (
                    <tr key={key.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{key.name}</div>
                        <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>Active Token</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <code style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 6, fontSize: 12, color: '#475569' }}>
                          {key.api_key_prefix}••••••••••••••••
                        </code>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {scopes.map(s => (
                            <span key={s} style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#ede9fe', color: '#6d28d9' }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#475569' }}>
                        {key.rate_limit_rpm || 120} req/min
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748b' }}>
                        {new Date(key.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          id={`btn-revoke-key-${key.id}`}
                          onClick={() => handleRevokeKey(key.id)}
                          style={{
                            padding: '6px 12px',
                            background: '#fee2e2',
                            border: 'none',
                            borderRadius: 6,
                            color: '#b91c1c',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <Trash2 size={13} /> Revoke
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: WEBHOOKS */}
      {activeTab === 'webhooks' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Webhook Name & URL</th>
                <th style={{ padding: '12px 16px' }}>Subscribed Event Triggers</th>
                <th style={{ padding: '12px 16px' }}>Signature Secret</th>
                <th style={{ padding: '12px 16px' }}>Total Deliveries</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    No webhooks subscribed. Register an HTTPS endpoint to receive push notifications on result release.
                  </td>
                </tr>
              ) : (
                webhooks.map((hook) => {
                  let events: string[] = [];
                  try {
                    events = typeof hook.subscribed_events === 'string' ? JSON.parse(hook.subscribed_events) : hook.subscribed_events;
                  } catch {
                    events = [];
                  }

                  return (
                    <tr key={hook.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{hook.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{hook.target_url}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {events.map(ev => (
                            <span key={ev} style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: '#eff6ff', color: '#1d4ed8' }}>
                              {ev}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <code style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: 6, fontSize: 11, color: '#64748b' }}>
                          HMAC-SHA256 (sec_••••)
                        </code>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#334155' }}>
                        {hook.total_deliveries || 0} events
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          id={`btn-test-hook-${hook.id}`}
                          onClick={() => handleTestWebhook(hook.id)}
                          style={{
                            padding: '6px 12px',
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#475569',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <Send size={12} /> Test Ping
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: LOGS */}
      {activeTab === 'logs' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Event Name</th>
                <th style={{ padding: '12px 16px' }}>Target Webhook</th>
                <th style={{ padding: '12px 16px' }}>Status Code</th>
                <th style={{ padding: '12px 16px' }}>Response Time</th>
                <th style={{ padding: '12px 16px' }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    No webhook dispatch logs recorded.
                  </td>
                </tr>
              ) : (
                deliveries.map((del) => (
                  <tr key={del.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>
                      {del.event_name}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#475569' }}>
                      {del.webhook_name}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        background: del.response_status >= 200 && del.response_status < 300 ? '#dcfce7' : '#fee2e2',
                        color: del.response_status >= 200 && del.response_status < 300 ? '#15803d' : '#b91c1c'
                      }}>
                        {del.response_status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748b' }}>
                      {del.response_time_ms || 42} ms
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748b', fontSize: 13 }}>
                      {new Date(del.sent_at).toLocaleTimeString()} ({new Date(del.sent_at).toLocaleDateString()})
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: CREATE API KEY */}
      {showKeyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: '540px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1e293b' }}>Generate Developer API Key</h2>
              <button onClick={() => setShowKeyModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateKey} style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Key Description / Application Name *</label>
                <input
                  id="input-key-name"
                  type="text"
                  required
                  placeholder="e.g. Hospital HIS Integration"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Rate Limit (req/min)</label>
                  <input
                    id="input-key-rate-limit"
                    type="number"
                    value={rateLimit}
                    onChange={(e) => setRateLimit(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>IP Whitelist (Optional)</label>
                  <input
                    id="input-key-ip-whitelist"
                    type="text"
                    placeholder="e.g. 192.168.1.50 or blank"
                    value={ipWhitelist}
                    onChange={(e) => setIpWhitelist(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>API Scopes & Permissions</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {['orders:read', 'orders:write', 'results:read', 'results:write', 'reports:read', 'webhooks:manage'].map(scope => (
                    <label key={scope} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes(scope)}
                        onChange={() => toggleScope(scope)}
                      />
                      <span>{scope}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  style={{ padding: '10px 18px', background: '#f1f5f9', border: 'none', borderRadius: 8, color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-create-key"
                  type="submit"
                  disabled={creatingKey}
                  style={{ padding: '10px 20px', background: '#7c3aed', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  {creatingKey ? 'Generating...' : 'Generate Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEWLY CREATED SECRET KEY REVEAL */}
      {newlyCreatedSecret && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: '580px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ background: '#fef3c7', padding: '18px 24px', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={22} color="#b45309" />
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#92400e', margin: 0 }}>
                  Save Your Secret API Key
                </h3>
                <div style={{ fontSize: 12, color: '#b45309' }}>
                  This secret key will <strong>NEVER</strong> be displayed again. Store it securely in your credentials vault.
                </div>
              </div>
            </div>

            <div style={{ padding: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
                Live Production Key
              </label>

              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <input
                  id="input-revealed-secret"
                  type="text"
                  readOnly
                  value={newlyCreatedSecret}
                  style={{ flex: 1, padding: '12px 14px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, fontFamily: 'monospace', color: '#0f172a' }}
                />
                <button
                  id="btn-copy-secret"
                  onClick={() => copyToClipboard(newlyCreatedSecret)}
                  style={{
                    padding: '12px 18px',
                    background: copied ? '#10b981' : '#7c3aed',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  id="btn-close-revealed-secret"
                  onClick={() => setNewlyCreatedSecret(null)}
                  style={{ padding: '10px 24px', background: '#1e293b', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  I Have Copied the Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE WEBHOOK */}
      {showWebhookModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: '540px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1e293b' }}>Register Webhook Endpoint</h2>
              <button onClick={() => setShowWebhookModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateWebhook} style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Webhook Name *</label>
                <input
                  id="input-webhook-name"
                  type="text"
                  required
                  placeholder="e.g. Clinic Notification Endpoint"
                  value={webhookName}
                  onChange={(e) => setWebhookName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Target HTTPS URL *</label>
                <input
                  id="input-webhook-url"
                  type="url"
                  required
                  placeholder="https://your-domain.com/webhooks/mediflow"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>Trigger Events</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {['order.created', 'sample.accessioned', 'result.imported', 'report.released', 'critical.alert'].map(ev => (
                    <label key={ev} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(ev)}
                        onChange={() => toggleEvent(ev)}
                      />
                      <span>{ev}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => setShowWebhookModal(false)}
                  style={{ padding: '10px 18px', background: '#f1f5f9', border: 'none', borderRadius: 8, color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-create-webhook"
                  type="submit"
                  disabled={creatingWebhook}
                  style={{ padding: '10px 20px', background: '#0284c7', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  {creatingWebhook ? 'Registering...' : 'Register Webhook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
