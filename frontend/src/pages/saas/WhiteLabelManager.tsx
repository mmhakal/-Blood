import React, { useState, useEffect } from 'react';
import {
  Palette, Globe, ShieldCheck, CheckCircle, RefreshCw,
  ExternalLink, Eye, Save, Plus, AlertCircle, Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface WhiteLabelSettings {
  id?: string;
  brand_name: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  report_header_html: string;
  report_footer_html: string;
  custom_css?: string;
}

interface CustomDomain {
  id: string;
  domain_name: string;
  verification_token: string;
  is_verified: boolean;
  ssl_status: 'pending' | 'active' | 'failed';
  created_at: string;
}

export const WhiteLabelManager: React.FC = () => {
  const { token } = useAuth();
  const [settings, setSettings] = useState<WhiteLabelSettings>({
    brand_name: 'Apex Diagnostics Enterprise LIS',
    logo_url: '',
    favicon_url: '',
    primary_color: '#0284c7',
    secondary_color: '#0f172a',
    accent_color: '#38bdf8',
    report_header_html: 'Apex Diagnostics & Reference Laboratory — NABL Accredited',
    report_footer_html: 'ISO 15189:2022 Certified Medical Diagnostic Facility'
  });

  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New domain form
  const [newDomain, setNewDomain] = useState('');
  const [addingDomain, setAddingDomain] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [wlRes, cdRes] = await Promise.all([
        fetch('/api/white-label', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/white-label/custom-domains', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (wlRes.ok) {
        const wl = await wlRes.json();
        if (wl && wl.brand_name) setSettings(wl);
      }
      if (cdRes.ok) {
        const cd = await cdRes.json();
        setDomains(cd);
      }
    } catch (err) {
      console.error('Failed to load white-label data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/white-label', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (err) {
      console.error('Save white label error', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain) return;
    try {
      setAddingDomain(true);
      const res = await fetch('/api/white-label/custom-domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ domain_name: newDomain })
      });
      if (res.ok) {
        setNewDomain('');
        fetchData();
      }
    } catch (err) {
      console.error('Add domain error', err);
    } finally {
      setAddingDomain(false);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    try {
      const res = await fetch(`/api/white-label/custom-domains/${domainId}/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Verify domain error', err);
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1600, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>
          White-Label SaaS Branding & Custom Vanity Domains
        </h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
          Customize diagnostic laboratory branding palettes, report headers, patient portal identity and vanity CNAME routing
        </p>
      </div>

      {saveSuccess && (
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
          <CheckCircle size={16} /> White-label branding theme saved and propagated.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 24 }}>
        {/* Left Column: Branding Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <form onSubmit={handleSaveSettings} className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Palette size={18} color="#0284c7" /> Visual Design System Tokens
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                  ORGANIZATION / BRAND NAME
                </label>
                <input
                  type="text"
                  required
                  value={settings.brand_name}
                  onChange={(e) => setSettings({ ...settings, brand_name: e.target.value })}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Color Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                    PRIMARY BRAND COLOR
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="color"
                      value={settings.primary_color}
                      onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                      style={{ width: 40, height: 38, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 0 }}
                    />
                    <input
                      type="text"
                      value={settings.primary_color}
                      onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                      className="input"
                      style={{ flex: 1, fontFamily: 'monospace' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                    SECONDARY COLOR
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="color"
                      value={settings.secondary_color}
                      onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                      style={{ width: 40, height: 38, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 0 }}
                    />
                    <input
                      type="text"
                      value={settings.secondary_color}
                      onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                      className="input"
                      style={{ flex: 1, fontFamily: 'monospace' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                    ACCENT COLOR
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="color"
                      value={settings.accent_color}
                      onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                      style={{ width: 40, height: 38, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 0 }}
                    />
                    <input
                      type="text"
                      value={settings.accent_color}
                      onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                      className="input"
                      style={{ flex: 1, fontFamily: 'monospace' }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                  REPORT HEADER BRANDING TEXT
                </label>
                <input
                  type="text"
                  value={settings.report_header_html}
                  onChange={(e) => setSettings({ ...settings, report_header_html: e.target.value })}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                  REPORT FOOTER ACCREDITATION TEXT
                </label>
                <input
                  type="text"
                  value={settings.report_footer_html}
                  onChange={(e) => setSettings({ ...settings, report_footer_html: e.target.value })}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ textAlign: 'right', marginTop: 10 }}>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  <Save size={16} />
                  {saving ? 'Saving Changes...' : 'Save Branding Identity'}
                </button>
              </div>
            </div>
          </form>

          {/* Custom Domains Manager */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Globe size={18} color="#0d9488" /> Custom Vanity Domains (CNAME)
            </h3>

            <form onSubmit={handleAddDomain} style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
              <input
                type="text"
                placeholder="portal.yourlaboratory.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                className="input"
                style={{ flex: 1 }}
              />
              <button
                type="submit"
                disabled={addingDomain}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={16} /> Add Domain
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {domains.map((dom) => (
                <div key={dom.id} style={{
                  padding: 14,
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{dom.domain_name}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      Points to: <code style={{ color: '#0284c7' }}>cname.mediflow.io</code>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 12,
                      background: dom.ssl_status === 'active' ? '#ecfdf5' : '#fffbeb',
                      color: dom.ssl_status === 'active' ? '#166534' : '#b45309'
                    }}>
                      SSL {dom.ssl_status.toUpperCase()}
                    </span>

                    {!dom.is_verified && (
                      <button
                        onClick={() => handleVerifyDomain(dom.id)}
                        className="btn btn-primary"
                        style={{ fontSize: 11, padding: '4px 10px' }}
                      >
                        Verify DNS
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Branding Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: 22 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Eye size={16} color="#64748b" /> Real-Time Brand Preview
            </h3>

            {/* Simulated Report Header */}
            <div style={{
              border: '2px dashed #e2e8f0',
              borderRadius: 12,
              padding: 18,
              background: '#ffffff'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                borderBottom: `2px solid ${settings.primary_color}`,
                paddingBottom: 14,
                marginBottom: 14
              }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  background: settings.primary_color,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 18
                }}>
                  {settings.brand_name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: settings.secondary_color }}>
                    {settings.brand_name}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    {settings.report_header_html}
                  </div>
                </div>
              </div>

              {/* Sample Report Row */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: '#475569' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Patient: Johnathan Miller (46Y / M)</span>
                  <span style={{ fontWeight: 700, color: settings.primary_color }}>Order #ORD-2026-0001</span>
                </div>
                <div style={{ padding: 10, background: '#f8fafc', borderRadius: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span>Hemoglobin (HGB)</span>
                    <span style={{ color: '#16a34a', fontWeight: 800 }}>14.2 g/dL</span>
                  </div>
                </div>
              </div>

              {/* Simulated Report Footer */}
              <div style={{
                marginTop: 18,
                borderTop: '1px solid #e2e8f0',
                paddingTop: 10,
                fontSize: 10,
                color: '#64748b',
                textAlign: 'center'
              }}>
                {settings.report_footer_html}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhiteLabelManager;
