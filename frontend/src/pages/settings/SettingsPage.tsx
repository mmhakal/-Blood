import React, { useState, useEffect } from 'react';
import {
  Settings, Save, CheckCircle2, FileText, Building2, ShieldCheck,
  Globe, Sliders, Database, Bell, Lock, Smartphone, Receipt, TestTubes
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role_code === 'super_admin';
  const { error, success } = useNotification();
  const [activeTab, setActiveTab] = useState<'lab' | 'branch' | 'system' | 'report'>('lab');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Laboratory Settings State
  const [labSettings, setLabSettings] = useState({
    auto_numbering: true,
    patient_id_prefix: 'PID',
    duplicate_mobile_check: 'warning',
    barcode_format: 'Code128',
    sample_id_prefix: 'SMP',
    default_tax_pct: 5,
    currency_symbol: '₹',
    allow_partial_payments: true,
    auto_lock_verified: true,
    critical_alert_sms: true,
  });

  // Branch Settings State
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [branchSettings, setBranchSettings] = useState({
    operating_hours: '07:00 AM - 09:00 PM',
    local_receipt_header: 'Apex Diagnostics & Reference Laboratory',
    contact_phone: '+91 98765 43210',
    emergency_phlebotomy: true,
  });

  // System Settings State (Super Admin)
  const [systemSettings, setSystemSettings] = useState({
    default_currency: 'INR',
    date_format: 'DD/MM/YYYY',
    session_timeout_minutes: 60,
    maintenance_mode: false,
  });

  // A4 Report Template
  const [template, setTemplate] = useState({
    header_html: 'Apex Diagnostics & Reference Laboratory',
    footer_html: 'Computer generated diagnostic report. For clinical correlation, please consult referring physician.',
    watermark_text: 'APEX DIAGNOSTICS',
    show_logo: true,
    show_qr: true,
    show_barcode: true,
    show_doctor_signature: true,
    show_technician_signature: true,
  });

  useEffect(() => {
    loadAllSettings();
  }, []);

  const loadAllSettings = async () => {
    setLoading(true);
    try {
      const [labRes, brRes, sysRes, tplRes] = await Promise.all([
        api.get('/settings/laboratory').catch(() => ({})),
        api.get('/branches').catch(() => []),
        isSuperAdmin ? api.get('/settings/system').catch(() => ({})) : Promise.resolve({}),
        api.get('/settings').catch(() => ({})),
      ]);

      if (labRes) {
        setLabSettings(prev => ({ ...prev, ...labRes }));
      }

      setBranches(brRes);
      if (brRes?.length > 0) {
        setSelectedBranchId(brRes[0].id);
      }

      if (sysRes) {
        setSystemSettings(prev => ({ ...prev, ...sysRes }));
      }

      if (tplRes?.template) {
        setTemplate(prev => ({ ...prev, ...tplRes.template }));
      }
    } catch (e: any) {
      console.error('Settings load error', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLabSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/settings/laboratory', {
        category: 'general',
        settings: labSettings,
      });
      success('Laboratory settings saved successfully');
    } catch (err: any) {
      error(err.message || 'Failed to save laboratory settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBranchSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) return;
    setSaving(true);
    try {
      await api.post(`/settings/branch/${selectedBranchId}`, {
        settings: branchSettings,
      });
      success('Branch facility settings updated');
    } catch (err: any) {
      error(err.message || 'Failed to update branch settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/settings/system', {
        settings: systemSettings,
      });
      success('System-wide enterprise parameters updated');
    } catch (err: any) {
      error(err.message || 'Failed to update system settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/settings/template', template);
      success('Report template layout updated');
    } catch (err: any) {
      error(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Multi-Tier Configuration & Settings Hub</h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            Manage diagnostic operational rules, facility branch parameters, system governance & printable stationary
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab('lab')}
          style={{
            padding: '12px 18px',
            fontSize: 14,
            fontWeight: 600,
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'lab' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'lab' ? '#0284c7' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Building2 size={18} />
          <span>Laboratory Operational Rules</span>
        </button>

        <button
          onClick={() => setActiveTab('branch')}
          style={{
            padding: '12px 18px',
            fontSize: 14,
            fontWeight: 600,
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'branch' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'branch' ? '#0284c7' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Sliders size={18} />
          <span>Branch Facility Preferences</span>
        </button>

        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('system')}
            style={{
              padding: '12px 18px',
              fontSize: 14,
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'system' ? '3px solid #7c3aed' : '3px solid transparent',
              color: activeTab === 'system' ? '#7c3aed' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <ShieldCheck size={18} />
            <span>Enterprise System Governance</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('report')}
          style={{
            padding: '12px 18px',
            fontSize: 14,
            fontWeight: 600,
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'report' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'report' ? '#0284c7' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <FileText size={18} />
          <span>Report Stationery & Signatures</span>
        </button>
      </div>

      {/* TAB 1: LABORATORY OPERATIONAL SETTINGS */}
      {activeTab === 'lab' && (
        <form onSubmit={handleSaveLabSettings} style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24, maxWidth: 800 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
            Clinical & Patient Workflow Automation
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Patient ID Prefix
              </label>
              <input
                type="text"
                value={labSettings.patient_id_prefix}
                onChange={(e) => setLabSettings({ ...labSettings, patient_id_prefix: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
              <span style={{ fontSize: 11, color: '#64748b' }}>e.g. PID-2026-XXXX</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Duplicate Mobile Number Policy
              </label>
              <select
                value={labSettings.duplicate_mobile_check}
                onChange={(e) => setLabSettings({ ...labSettings, duplicate_mobile_check: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              >
                <option value="warning">Warning notice (allow family members)</option>
                <option value="block">Strict block (must be unique)</option>
                <option value="ignore">Ignore check</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Specimen Barcode Format
              </label>
              <select
                value={labSettings.barcode_format}
                onChange={(e) => setLabSettings({ ...labSettings, barcode_format: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              >
                <option value="Code128">Code 128 (Standard Diagnostic)</option>
                <option value="Code39">Code 39</option>
                <option value="EAN13">EAN-13</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Sample ID Sequence Prefix
              </label>
              <input
                type="text"
                value={labSettings.sample_id_prefix}
                onChange={(e) => setLabSettings({ ...labSettings, sample_id_prefix: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Standard Diagnostic Tax / GST (%)
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={labSettings.default_tax_pct}
                onChange={(e) => setLabSettings({ ...labSettings, default_tax_pct: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Currency Symbol
              </label>
              <input
                type="text"
                value={labSettings.currency_symbol}
                onChange={(e) => setLabSettings({ ...labSettings, currency_symbol: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={labSettings.auto_lock_verified}
                onChange={(e) => setLabSettings({ ...labSettings, auto_lock_verified: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: '#0284c7' }}
              />
              <span><strong>Result Locking:</strong> Automatically lock test results against technician edits once pathologist verifies</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={labSettings.critical_alert_sms}
                onChange={(e) => setLabSettings({ ...labSettings, critical_alert_sms: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: '#0284c7' }}
              />
              <span><strong>Panic Alerts:</strong> Trigger instant high-priority SMS/WhatsApp dispatch when critical panic limits are breached</span>
            </label>
          </div>

          <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: '10px 20px' }}>
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Laboratory Settings'}</span>
          </button>
        </form>
      )}

      {/* TAB 2: BRANCH SETTINGS */}
      {activeTab === 'branch' && (
        <form onSubmit={handleSaveBranchSettings} style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24, maxWidth: 800 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Facility Branch Local Preferences
            </h3>

            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Local Billing Receipt Header Text
            </label>
            <input
              type="text"
              value={branchSettings.local_receipt_header}
              onChange={(e) => setBranchSettings({ ...branchSettings, local_receipt_header: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Facility Operating Hours
              </label>
              <input
                type="text"
                value={branchSettings.operating_hours}
                onChange={(e) => setBranchSettings({ ...branchSettings, operating_hours: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Direct Hotline / Phone
              </label>
              <input
                type="text"
                value={branchSettings.contact_phone}
                onChange={(e) => setBranchSettings({ ...branchSettings, contact_phone: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: '10px 20px' }}>
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Update Branch Settings'}</span>
          </button>
        </form>
      )}

      {/* TAB 3: SYSTEM GOVERNANCE (SUPER ADMIN) */}
      {activeTab === 'system' && isSuperAdmin && (
        <form onSubmit={handleSaveSystemSettings} style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #7c3aed', padding: 24, maxWidth: 800 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <ShieldCheck size={20} color="#7c3aed" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#5b21b6', margin: 0 }}>
              Super Admin System Governance & Global Policies
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                System Base Currency
              </label>
              <input
                type="text"
                value={systemSettings.default_currency}
                onChange={(e) => setSystemSettings({ ...systemSettings, default_currency: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Standard System Date Format
              </label>
              <select
                value={systemSettings.date_format}
                onChange={(e) => setSystemSettings({ ...systemSettings, date_format: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (Indian Standard)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (US Standard)</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              JWT Session Inactivity Timeout (Minutes)
            </label>
            <input
              type="number"
              min="15"
              max="720"
              value={systemSettings.session_timeout_minutes}
              onChange={(e) => setSystemSettings({ ...systemSettings, session_timeout_minutes: parseInt(e.target.value) || 60 })}
              style={{ width: '100%', maxWidth: 300, padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
            />
          </div>

          <button type="submit" disabled={saving} className="btn" style={{ padding: '10px 20px', backgroundColor: '#7c3aed', color: '#fff' }}>
            <Save size={16} />
            <span>{saving ? 'Updating System...' : 'Apply Global Governance Settings'}</span>
          </button>
        </form>
      )}

      {/* TAB 4: REPORT STATIONERY & SIGNATURES */}
      {activeTab === 'report' && (
        <form onSubmit={handleSaveTemplate} style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24, maxWidth: 800 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
            A4 Diagnostic Report Template & Digital Signatures
          </h3>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Report Header Title
            </label>
            <input
              type="text"
              value={template.header_html}
              onChange={(e) => setTemplate({ ...template, header_html: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Report Footer Clinical Advisory
            </label>
            <textarea
              rows={3}
              value={template.footer_html}
              onChange={(e) => setTemplate({ ...template, footer_html: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Watermark Background Label
            </label>
            <input
              type="text"
              value={template.watermark_text}
              onChange={(e) => setTemplate({ ...template, watermark_text: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
            />
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={template.show_qr}
                onChange={(e) => setTemplate({ ...template, show_qr: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: '#0284c7' }}
              />
              <span>Print Authenticity QR Code</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={template.show_barcode}
                onChange={(e) => setTemplate({ ...template, show_barcode: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: '#0284c7' }}
              />
              <span>Print Barcode Identifier</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={template.show_doctor_signature}
                onChange={(e) => setTemplate({ ...template, show_doctor_signature: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: '#0284c7' }}
              />
              <span>Pathologist Digital Signature</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={template.show_technician_signature}
                onChange={(e) => setTemplate({ ...template, show_technician_signature: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: '#0284c7' }}
              />
              <span>Lab Technician Initials</span>
            </label>
          </div>

          <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: '10px 20px' }}>
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Template Settings'}</span>
          </button>
        </form>
      )}
    </div>
  );
};
