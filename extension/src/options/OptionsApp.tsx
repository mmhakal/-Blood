import React, { useState, useEffect } from 'react';
import {
  Settings, User, Server, Bell, Shield, Palette,
  Globe, Key, CheckCircle, AlertCircle, Info, RefreshCw, Trash2
} from 'lucide-react';
import { LocalSettings, SessionData } from '../types';
import { extensionStorage } from '../services/storage/extensionStorage';
import { authService } from '../services/auth/authService';
import apiClient from '../services/api/apiClient';
import { i18n, SupportedLanguage, t } from '../services/i18n';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Badge from '../components/common/Badge';

export const OptionsApp: React.FC = () => {
  const [session, setSession] = useState<SessionData | null>(null);
  const [settings, setSettings] = useState<LocalSettings | null>(null);
  const [activeTab, setActiveTab] = useState<string>('account');
  const [savedNotice, setSavedNotice] = useState(false);

  // Connection test state
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'success' | 'failed' | null>(null);

  useEffect(() => {
    extensionStorage.getSettings().then(setSettings);
    authService.getSession().then(setSession);

    const unsubLang = i18n.subscribe(() => {
      setSettings((prev) => (prev ? { ...prev } : null));
    });
    return unsubLang;
  }, []);

  const handleSaveSettings = async (updates: Partial<LocalSettings>) => {
    if (!settings) return;
    const updated = await extensionStorage.updateSettings(updates);
    setSettings(updated);

    if (updates.language) {
      await i18n.setLanguage(updates.language);
    }
    if (updates.theme) {
      document.documentElement.setAttribute('data-theme', updates.theme);
    }

    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      setConnectionStatus(null);
      await apiClient.get('/auth/me');
      setConnectionStatus('success');
    } catch {
      setConnectionStatus('failed');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleClearCache = async () => {
    await extensionStorage.invalidateCache();
    alert(t('extension.cacheCleared'));
  };

  if (!settings) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading preferences...</div>;
  }

  const navItems = [
    { id: 'account', label: t('extension.options.account'), icon: <User size={16} /> },
    { id: 'api', label: t('extension.options.api'), icon: <Server size={16} /> },
    { id: 'notifications', label: t('extension.options.notifications'), icon: <Bell size={16} /> },
    { id: 'appearance', label: t('extension.options.appearance'), icon: <Palette size={16} /> },
    { id: 'privacy', label: t('extension.options.privacy'), icon: <Shield size={16} /> },
    { id: 'about', label: t('extension.options.about'), icon: <Info size={16} /> }
  ];

  return (
    <div style={{ maxWidth: 960, margin: '40px auto', padding: '0 20px', fontFamily: 'var(--font-sans)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
            {t('extension.options.title')}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Commercial Enterprise Configuration & Permissions Manager
          </p>
        </div>
        {savedNotice && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--success)', fontWeight: 600, fontSize: 12 }}>
            <CheckCircle size={16} /> {t('extension.settingsSaved')}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24 }}>
        {/* Navigation Sidebar */}
        <Card style={{ padding: 8, height: 'fit-content' }}>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--primary-light)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </Card>

        {/* Content Pane */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* TAB: ACCOUNT */}
          {activeTab === 'account' && (
            <Card style={{ padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>User & Laboratory Profile</h3>
              {session ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Authenticated User</span>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{session.user.name} ({session.user.email})</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Role & Entitlements</span>
                    <div><Badge variant="primary">{session.user.role_code.toUpperCase()}</Badge></div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Active Laboratory</span>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{session.user.lab_name || 'Global Administration'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Assigned Permissions ({session.user.permissions?.length || 0})</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {(session.user.permissions || ['*']).map((p, i) => (
                        <span key={i} style={{ fontSize: 10, padding: '2px 6px', background: 'var(--bg-tertiary)', borderRadius: 4, fontFamily: 'monospace' }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <Button variant="danger" size="sm" onClick={() => authService.logout().then(() => setSession(null))}>
                      {t('extension.logout')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No active session found. Please sign in via the extension popup.</p>
                </div>
              )}
            </Card>
          )}

          {/* TAB: API & CONNECTION */}
          {activeTab === 'api' && (
            <Card style={{ padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Connection & API Gateway</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Backend API Endpoint
                  </label>
                  <Input
                    value={settings.apiBaseUrl}
                    onChange={(e) => handleSaveSettings({ apiBaseUrl: e.target.value })}
                    placeholder="http://localhost:5000/api"
                    style={{ marginTop: 4 }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Default local LIS endpoint is http://localhost:5000/api
                  </span>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Target Environment
                  </label>
                  <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                    {(['development', 'staging', 'production'] as const).map((env) => (
                      <label key={env} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, textTransform: 'capitalize' }}>
                        <input
                          type="radio"
                          name="environment"
                          checked={settings.environment === env}
                          onChange={() => handleSaveSettings({ environment: env })}
                        />
                        {env}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleTestConnection}
                    loading={testingConnection}
                    icon={<RefreshCw size={13} />}
                  >
                    Test Connection
                  </Button>
                  {connectionStatus === 'success' && (
                    <span style={{ fontSize: 12, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={14} /> Server reachable & operational
                    </span>
                  )}
                  {connectionStatus === 'failed' && (
                    <span style={{ fontSize: 12, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertCircle size={14} /> Failed to connect to API server
                    </span>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* TAB: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <Card style={{ padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Notifications & Audio Alerts</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.enableNotifications}
                    onChange={(e) => handleSaveSettings({ enableNotifications: e.target.checked })}
                  />
                  <span>Enable Browser Action Badge Count</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.enablePanicAlerts}
                    onChange={(e) => handleSaveSettings({ enablePanicAlerts: e.target.checked })}
                  />
                  <span>High-Priority Panic Result Alerts</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.enableSound}
                    onChange={(e) => handleSaveSettings({ enableSound: e.target.checked })}
                  />
                  <span>Play notification audio chime on critical results</span>
                </label>
              </div>
            </Card>
          )}

          {/* TAB: APPEARANCE & LANGUAGE */}
          {activeTab === 'appearance' && (
            <Card style={{ padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Appearance & Localization</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {t('extension.language')}
                  </label>
                  <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                    <Button
                      variant={settings.language === 'en' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => handleSaveSettings({ language: 'en' })}
                    >
                      English
                    </Button>
                    <Button
                      variant={settings.language === 'hi' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => handleSaveSettings({ language: 'hi' })}
                    >
                      हिन्दी (Hindi)
                    </Button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Color Theme
                  </label>
                  <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                    <Button
                      variant={settings.theme === 'light' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => handleSaveSettings({ theme: 'light' })}
                    >
                      {t('extension.theme.light')}
                    </Button>
                    <Button
                      variant={settings.theme === 'dark' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => handleSaveSettings({ theme: 'dark' })}
                    >
                      {t('extension.theme.dark')}
                    </Button>
                    <Button
                      variant={settings.theme === 'system' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => handleSaveSettings({ theme: 'system' })}
                    >
                      {t('extension.theme.system')}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* TAB: PRIVACY & AUDIT */}
          {activeTab === 'privacy' && (
            <Card style={{ padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Privacy & Permissions Transparency</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
                MediFlow LIS Extension enforces strict enterprise security boundaries. We request only the minimum required Chrome permissions:
              </p>
              <ul style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 20, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li><strong>storage</strong>: Used exclusively to preserve session tokens and local user preferences.</li>
                <li><strong>alarms</strong>: Used to trigger background silent token renewal and unread badge updates.</li>
                <li><strong>sidePanel</strong>: Used to display the productivity side panel.</li>
                <li><strong>activeTab</strong>: Used to inspect selected medical identifiers (MRN / sample barcode) only when invoked.</li>
              </ul>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
                <Button variant="outline" size="sm" icon={<Trash2 size={13} />} onClick={handleClearCache}>
                  {t('extension.clearCache')}
                </Button>
              </div>
            </Card>
          )}

          {/* TAB: ABOUT */}
          {activeTab === 'about' && (
            <Card style={{ padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>About MediFlow LIS Assistant</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Commercial Diagnostic Laboratory Information System (LIS) Browser Extension built with Manifest V3 for Google Chrome, Microsoft Edge, and Chromium-based platforms.
              </p>
              <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                <Badge variant="success">Manifest V3 Compliant</Badge>
                <Badge variant="primary">Version 1.0.0</Badge>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default OptionsApp;
