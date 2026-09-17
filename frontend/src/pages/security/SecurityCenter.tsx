import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, Lock, Smartphone, Laptop, AlertOctagon,
  RefreshCw, CheckCircle, Trash2, ShieldCheck, Activity, Globe, Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ActiveSession {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  device_type: 'desktop' | 'mobile' | 'tablet' | 'api';
  ip_address: string;
  user_agent: string;
  created_at: string;
  last_activity_at: string;
  is_revoked: boolean;
}

interface SecurityEvent {
  id: string;
  event_type: string;
  user_email?: string;
  ip_address: string;
  user_agent?: string;
  details?: string;
  created_at: string;
}

export const SecurityCenter: React.FC = () => {
  const { token, user } = useAuth();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      const [sessRes, evRes] = await Promise.all([
        fetch('/api/security-center/sessions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/security-center/events', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (sessRes.ok) setSessions(await sessRes.json());
      if (evRes.ok) setEvents(await evRes.json());
    } catch (err) {
      console.error('Failed to load security telemetry', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/security-center/sessions/${sessionId}/revoke`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setActionMessage(`Session terminated remotely.`);
        fetchSecurityData();
        setTimeout(() => setActionMessage(null), 4000);
      }
    } catch (err) {
      console.error('Revoke session error', err);
    }
  };

  const handleRevokeAllOther = async () => {
    try {
      const res = await fetch('/api/security-center/sessions/revoke-all-others', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setActionMessage('All concurrent user sessions have been terminated.');
        fetchSecurityData();
        setTimeout(() => setActionMessage(null), 4000);
      }
    } catch (err) {
      console.error('Revoke all error', err);
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Enterprise Security Center & Active Sessions
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Monitor concurrent user sessions, initiate remote token invalidation, and inspect security threat streams
          </p>
        </div>

        <button
          onClick={handleRevokeAllOther}
          className="btn"
          style={{
            background: '#ef4444',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            fontWeight: 700
          }}
        >
          <Lock size={15} /> Kill All Other Sessions
        </button>
      </div>

      {actionMessage && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          padding: '12px 18px',
          borderRadius: 8,
          marginBottom: 20,
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <CheckCircle size={16} /> {actionMessage}
        </div>
      )}

      {/* KPI Stream */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        <div className="card" style={{ padding: 18, borderLeft: '4px solid #0284c7' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>ACTIVE USER SESSIONS</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 6 }}>
            {sessions.length} Live Logins
          </div>
          <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>Valid JWT tokens</div>
        </div>

        <div className="card" style={{ padding: 18, borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>AUTHENTICATION PROTOCOL</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981', marginTop: 6 }}>
            SHA-256 JWT
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Role-based tenant isolation</div>
        </div>

        <div className="card" style={{ padding: 18, borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>SECURITY AUDIT EVENTS</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 6 }}>
            {events.length} Events
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Monitored audit stream</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
        {/* Active Sessions List */}
        <div className="card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Laptop size={18} color="#0284c7" /> Live Concurrent User Sessions
            </h3>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              Querying active session registry...
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              No active sessions found.
            </div>
          ) : (
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                  <th style={{ padding: '10px 14px' }}>USER</th>
                  <th style={{ padding: '10px 14px' }}>DEVICE / CLIENT</th>
                  <th style={{ padding: '10px 14px' }}>IP ADDRESS</th>
                  <th style={{ padding: '10px 14px' }}>LOGGED IN AT</th>
                  <th style={{ padding: '10px 14px' }}>LAST ACTIVITY</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((sess) => (
                  <tr key={sess.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{sess.user_name || 'System User'}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{sess.user_email || sess.user_id}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, textTransform: 'capitalize', fontWeight: 600 }}>
                        {sess.device_type === 'mobile' ? <Smartphone size={15} color="#0284c7" /> : <Laptop size={15} color="#475569" />}
                        {sess.device_type}
                      </div>
                      <div style={{ fontSize: 10, color: '#64748b', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sess.user_agent}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#475569' }}>
                      {sess.ip_address}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>
                      {new Date(sess.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#10b981', fontWeight: 600 }}>
                      {sess.last_activity_at ? new Date(sess.last_activity_at).toLocaleTimeString() : 'Active'}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleRevokeSession(sess.id)}
                        className="btn btn-secondary"
                        style={{
                          fontSize: 11,
                          padding: '5px 10px',
                          color: '#ef4444',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <Trash2 size={13} /> Kill Session
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Security Events Audit Stream */}
        <div className="card" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={18} color="#d97706" /> Security Events & Threat Audit Stream
          </h3>

          {events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748b', fontSize: 13 }}>
              No security incident alerts or failed login violations detected. System nominal.
            </div>
          ) : (
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                  <th style={{ padding: '10px 14px' }}>EVENT TYPE</th>
                  <th style={{ padding: '10px 14px' }}>USER / IDENTIFIER</th>
                  <th style={{ padding: '10px 14px' }}>IP ADDRESS</th>
                  <th style={{ padding: '10px 14px' }}>DETAILS</th>
                  <th style={{ padding: '10px 14px' }}>TIMESTAMP</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#dc2626' }}>
                      {ev.event_type}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#0f172a' }}>
                      {ev.user_email || 'Anonymous'}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace' }}>
                      {ev.ip_address}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>
                      {ev.details || '-'}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>
                      {new Date(ev.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecurityCenter;
