import React, { useState, useEffect } from 'react';
import {
  LogIn, LogOut, Search, Bell, Shield, ChevronRight,
  FlaskConical, UserPlus, FileText, CheckCircle, AlertTriangle, HelpCircle
} from 'lucide-react';
import { SessionData, ExtensionNotification } from '../types';
import { authService } from '../services/auth/authService';
import { notificationService } from '../services/notifications/notificationService';
import { lisIntegration } from '../services/integration/lisIntegration';
import { sendRuntimeMessage } from '../services/messaging/messagePassing';
import ExtensionHeader from '../components/layout/ExtensionHeader';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Avatar from '../components/common/Avatar';
import { t, i18n } from '../services/i18n';

export const PopupApp: React.FC = () => {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [notifications, setNotifications] = useState<ExtensionNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Subscribe to auth changes & language updates
  useEffect(() => {
    const unsubAuth = authService.onSessionChange((newSession) => {
      setSession(newSession);
    });

    const unsubLang = i18n.subscribe(() => {
      // Force rerender on language change
      setSession((prev) => (prev ? { ...prev } : null));
    });

    // Initial load
    authService.getSession().then(async (s) => {
      setSession(s);
      setLoading(false);
      if (s) {
        loadMetrics();
      }
    });

    return () => {
      unsubAuth();
      unsubLang();
    };
  }, []);

  const loadMetrics = async () => {
    const count = await notificationService.getUnreadCount();
    setUnreadCount(count);
    const notifs = await notificationService.getNotifications(false, 3);
    setNotifications(notifs);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      setAuthSubmitting(true);
      setAuthError('');
      await authService.login(email, password);
      loadMetrics();
    } catch (err: any) {
      setAuthError(err.userMessage || err.message || 'Login failed');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('admin123');
    try {
      setAuthSubmitting(true);
      setAuthError('');
      await authService.login(demoEmail, 'admin123');
      loadMetrics();
    } catch (err: any) {
      setAuthError(err.userMessage || err.message || 'Demo login failed');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setSession(null);
  };

  const openOptionsPage = () => {
    if (typeof chrome !== 'undefined' && chrome?.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('/options/index.html', '_blank');
    }
  };

  const openSidePanel = async () => {
    await sendRuntimeMessage('OPEN_SIDE_PANEL', {});
    // If not supported natively via message, fallback to web app sidepanel or alert
    if (typeof chrome !== 'undefined' && chrome?.sidePanel?.open) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.sidePanel.open({ tabId: tabs[0].id });
        }
      });
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading MediFlow LIS...</span>
      </div>
    );
  }

  // --- UNAUTHENTICATED SCREEN ---
  if (!session) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <ExtensionHeader session={null} onOpenSettings={openOptionsPage} />
        <div style={{ padding: 18 }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
              {t('extension.login')}
            </h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Secure Clinical LIS Assistant & Companion
            </p>
          </div>

          {authError && (
            <div style={{ padding: '8px 12px', background: 'var(--danger-light)', borderRadius: 6, color: 'var(--danger)', fontSize: 11, marginBottom: 12 }}>
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Input
              label="Email Address"
              type="email"
              placeholder="admin@apex.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" loading={authSubmitting} icon={<LogIn size={14} />} style={{ marginTop: 6 }}>
              {t('extension.login')}
            </Button>
          </form>

          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
              {t('extension.demoAccounts')}:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <Button size="sm" variant="secondary" onClick={() => handleDemoLogin('admin@medilabs.com')}>
                Super Admin
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleDemoLogin('labadmin@apexlabs.com')}>
                Lab Admin
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleDemoLogin('pathologist@apexlabs.com')}>
                Pathologist
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleDemoLogin('technician@apexlabs.com')}>
                Technician
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- AUTHENTICATED SCREEN ---
  const user = session.user;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <ExtensionHeader session={session} onOpenSettings={openOptionsPage} />

      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* User Card */}
        <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name={user.name} size={36} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                {user.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Badge variant="primary">{user.role_code.replace('_', ' ').toUpperCase()}</Badge>
                {user.lab_name && (
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{user.lab_name}</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title={t('extension.logout')}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
          >
            <LogOut size={16} />
          </button>
        </Card>

        {/* Branch Selector */}
        {session.authorizedBranches && session.authorizedBranches.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {t('extension.activeBranch')}:
            </span>
            <select
              value={session.activeBranchId || ''}
              onChange={(e) => {
                const target = session.authorizedBranches.find(b => b.id === e.target.value);
                if (target) {
                  authService.switchBranch(target.id, target.name);
                }
              }}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--primary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {session.authorizedBranches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Primary Action: Open Side Panel */}
        <Button
          variant="primary"
          onClick={openSidePanel}
          icon={<Search size={14} />}
          style={{ width: '100%', justifyContent: 'space-between', padding: '10px 14px' }}
        >
          <span>{t('extension.openSidepanel')}</span>
          <ChevronRight size={16} />
        </Button>

        {/* Live Lab Metrics */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
            {t('extension.quickStats')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Card style={{ padding: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>24</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t('extension.pendingTests')}</div>
            </Card>
            <Card style={{ padding: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: unreadCount > 0 ? 'var(--danger)' : 'var(--success)' }}>
                {unreadCount}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t('extension.notifications')}</div>
            </Card>
          </div>
        </div>

        {/* Quick Access Actions */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Clinical Shortcuts
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              onClick={() => lisIntegration.openWebApp('/orders')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FlaskConical size={14} color="var(--primary)" />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Order & Sample Accessioning</span>
              </div>
              <ChevronRight size={14} color="var(--text-muted)" />
            </button>
            <button
              onClick={() => lisIntegration.openWebApp('/patients')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserPlus size={14} color="var(--accent)" />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Register New Patient</span>
              </div>
              <ChevronRight size={14} color="var(--text-muted)" />
            </button>
            <button
              onClick={() => lisIntegration.openWebApp('/reports')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={14} color="var(--success)" />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Diagnostic Reports Release</span>
              </div>
              <ChevronRight size={14} color="var(--text-muted)" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer
        style={{
          marginTop: 'auto',
          padding: '8px 14px',
          borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 10,
          color: 'var(--text-muted)'
        }}
      >
        <span>MediFlow LIS v1.0.0 (MV3)</span>
        <button
          onClick={() => lisIntegration.openWebApp('/docs')}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <HelpCircle size={12} /> Help
        </button>
      </footer>
    </div>
  );
};

export default PopupApp;
