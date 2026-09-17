import React, { useState, useEffect } from 'react';
import {
  Bell, CheckCheck, Send, Info, AlertTriangle, CheckCircle2,
  AlertOctagon, Filter, Megaphone, Clock
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const { error, success } = useNotification();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastData, setBroadcastData] = useState({
    title: '',
    message: '',
    type: 'info'
  });

  const isSuperAdmin = user?.role_code === 'super_admin';

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/notifications?unread=${unreadOnly}`);
      setNotifications(res);
    } catch (e: any) {
      error(e.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [unreadOnly]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (e: any) {
      error(e.message || 'Failed to update notification');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      success('All notifications marked as read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (e: any) {
      error(e.message || 'Failed to mark all as read');
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/notifications/broadcast', broadcastData);
      success('Announcement broadcasted to all laboratories');
      setShowBroadcastModal(false);
      setBroadcastData({ title: '', message: '', type: 'info' });
      loadNotifications();
    } catch (err: any) {
      error(err.message || 'Failed to send broadcast');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle size={18} color="#d97706" />;
      case 'danger': return <AlertOctagon size={18} color="#dc2626" />;
      case 'success': return <CheckCircle2 size={18} color="#16a34a" />;
      default: return <Info size={18} color="#0284c7" />;
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Notification & Alert Center</h1>
          <p style={{ fontSize: 13.5, color: '#64748b' }}>
            Real-time diagnostic alerts, subscription notices, and institutional system announcements.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {isSuperAdmin && (
            <button onClick={() => setShowBroadcastModal(true)} className="btn btn-secondary">
              <Megaphone size={16} /> Broadcast Announcement
            </button>
          )}
          <button onClick={handleMarkAllRead} className="btn btn-outline">
            <CheckCheck size={16} /> Mark All as Read
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <button
          onClick={() => setUnreadOnly(false)}
          className={`btn btn-sm ${!unreadOnly ? 'btn-primary' : 'btn-outline'}`}
        >
          All Notifications
        </button>
        <button
          onClick={() => setUnreadOnly(true)}
          className={`btn btn-sm ${unreadOnly ? 'btn-primary' : 'btn-outline'}`}
        >
          Unread Only
        </button>
      </div>

      {/* Notification List Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 50,
            backgroundColor: '#fff',
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            color: '#64748b'
          }}>
            <Bell size={36} color="#cbd5e1" style={{ margin: '0 auto 12px auto' }} />
            <div style={{ fontSize: 15, fontWeight: 600 }}>No notifications to display</div>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>You are fully up to date with all clinical events.</div>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              style={{
                backgroundColor: n.is_read ? '#ffffff' : '#f0f9ff',
                border: n.is_read ? '1px solid #e2e8f0' : '1px solid #bae6fd',
                borderRadius: 10,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 16,
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: n.is_read ? '#f8fafc' : '#e0f2fe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {getTypeIcon(n.type)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: n.is_read ? 600 : 700, color: '#0f172a' }}>
                      {n.title}
                    </span>
                    {!n.is_read && (
                      <span style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: '#0284c7',
                        display: 'inline-block'
                      }} />
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: '#334155', margin: '4px 0 6px 0', lineHeight: 1.5 }}>
                    {n.message}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11.5, color: '#94a3b8' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} /> {new Date(n.created_at).toLocaleString()}
                    </span>
                    {n.link && (
                      <a href={n.link} style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}>
                        View Details &rarr;
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {!n.is_read && (
                <button
                  onClick={() => handleMarkAsRead(n.id)}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: 12, flexShrink: 0 }}
                >
                  Mark as Read
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal: Broadcast System Announcement */}
      {showBroadcastModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Megaphone size={18} color="#0284c7" />
                Broadcast System Announcement
              </h3>
              <button onClick={() => setShowBroadcastModal(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleBroadcast} style={{ padding: 20 }}>
              <div className="form-group">
                <label className="form-label">Alert Severity / Type</label>
                <select
                  value={broadcastData.type}
                  onChange={(e) => setBroadcastData({ ...broadcastData, type: e.target.value })}
                  className="form-input"
                >
                  <option value="info">Information (Blue)</option>
                  <option value="warning">Warning / Notice (Amber)</option>
                  <option value="danger">Critical / Maintenance (Red)</option>
                  <option value="success">Success / Feature Update (Green)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Announcement Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scheduled Maintenance Window"
                  value={broadcastData.title}
                  onChange={(e) => setBroadcastData({ ...broadcastData, title: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Message Content *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter the broadcast message visible to all laboratory staff..."
                  value={broadcastData.message}
                  onChange={(e) => setBroadcastData({ ...broadcastData, message: e.target.value })}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setShowBroadcastModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Send size={15} /> Send Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
