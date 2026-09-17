import React, { useState, useEffect } from 'react';
import {
  FileText, Copy, CheckCircle2, QrCode, ShieldCheck,
  Palette, Type, Sliders, RefreshCw, Eye, Star, Plus, X
} from 'lucide-react';
import api from '../../services/api';

export const ReportTemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cloning, setCloning] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/report-templates');
      setTemplates(res);
      if (res?.length > 0 && !selectedTemplate) {
        setSelectedTemplate(res[0]);
      }
    } catch (err) {
      console.error('Failed to load report templates', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    setSaving(true);
    try {
      await api.put(`/report-templates/${selectedTemplate.id}`, selectedTemplate);
      alert('Report design template updated and new version snapshot created!');
      loadTemplates();
    } catch (err: any) {
      alert('Error updating template: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClone = async () => {
    if (!selectedTemplate) return;
    setCloning(true);
    try {
      const res = await api.post(`/report-templates/${selectedTemplate.id}/clone`);
      alert(`Cloned successfully as "${res.name}"!`);
      loadTemplates();
    } catch (err: any) {
      alert('Error cloning template: ' + err.message);
    } finally {
      setCloning(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Diagnostic Report Designer & Templates</h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>Configure clinical letterhead, typography, colors, NABL accreditation logos, QR verify codes & digital pathologist signatures</p>
        </div>

        <button
          onClick={handleClone}
          disabled={cloning || !selectedTemplate}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Copy size={16} />
          <span>{cloning ? 'Cloning...' : 'Duplicate Selected Template'}</span>
        </button>
      </div>

      {/* Grid: Template Selector & Realtime Visual Settings */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
        {/* Left: Template Catalog Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Available Layouts ({templates.length})
          </h3>

          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>Loading designs...</div>
          ) : (
            templates.map((tpl) => (
              <div
                key={tpl.id}
                onClick={() => setSelectedTemplate(tpl)}
                style={{
                  padding: 16,
                  borderRadius: 10,
                  backgroundColor: '#fff',
                  border: selectedTemplate?.id === tpl.id ? '2px solid #0284c7' : '1px solid #e2e8f0',
                  boxShadow: selectedTemplate?.id === tpl.id ? '0 4px 12px rgba(2, 132, 199, 0.15)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <strong style={{ fontSize: 14, color: '#0f172a' }}>{tpl.name}</strong>
                  {tpl.is_default && (
                    <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: '#eff6ff', color: '#0284c7', padding: '2px 6px', borderRadius: 4 }}>
                      DEFAULT
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: tpl.primary_color || '#0284c7', display: 'inline-block' }} />
                  <span>Primary: {tpl.primary_color}</span>
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  Font: {tpl.font_family || 'Helvetica'} • Versions: {tpl.versions_count || 1}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right: Interactive Designer & Settings */}
        {selectedTemplate && (
          <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Design Settings: {selectedTemplate.name}</h2>
                <span style={{ fontSize: 12, color: '#64748b' }}>Customizing letterhead geometry and clinical report elements</span>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary"
                style={{ padding: '8px 20px', fontSize: 13 }}
              >
                {saving ? 'Publishing Version...' : 'Save & Deploy Layout'}
              </button>
            </div>

            <form onSubmit={handleSave}>
              {/* Template Name & Code */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Template Display Name</label>
                  <input
                    type="text"
                    value={selectedTemplate.name || ''}
                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, name: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Design Code</label>
                  <input
                    type="text"
                    value={selectedTemplate.code || ''}
                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, code: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
              </div>

              {/* Color Palettes & Fonts */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Primary Brand Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="color"
                      value={selectedTemplate.primary_color || '#0284c7'}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, primary_color: e.target.value })}
                      style={{ width: 36, height: 36, borderRadius: 6, border: 'none', cursor: 'pointer', padding: 0 }}
                    />
                    <input
                      type="text"
                      value={selectedTemplate.primary_color || '#0284c7'}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, primary_color: e.target.value })}
                      style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Secondary Accent Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="color"
                      value={selectedTemplate.secondary_color || '#0f172a'}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, secondary_color: e.target.value })}
                      style={{ width: 36, height: 36, borderRadius: 6, border: 'none', cursor: 'pointer', padding: 0 }}
                    />
                    <input
                      type="text"
                      value={selectedTemplate.secondary_color || '#0f172a'}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, secondary_color: e.target.value })}
                      style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Report Font Family</label>
                  <select
                    value={selectedTemplate.font_family || 'Helvetica'}
                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, font_family: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  >
                    <option value="Helvetica">Helvetica (Standard Clinical)</option>
                    <option value="Times-Roman">Times Roman (Traditional Formal)</option>
                    <option value="Courier">Courier (Monospace Laboratory)</option>
                  </select>
                </div>
              </div>

              {/* Margins & Dimensions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Letterhead Header Height (px)</label>
                  <input
                    type="number"
                    min="50"
                    max="250"
                    value={selectedTemplate.header_height || 110}
                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, header_height: parseInt(e.target.value) || 110 })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                  <span style={{ fontSize: 11, color: '#64748b' }}>Reserve clearance if using pre-printed letterhead stationary</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Footer Height (px)</label>
                  <input
                    type="number"
                    min="30"
                    max="180"
                    value={selectedTemplate.footer_height || 60}
                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, footer_height: parseInt(e.target.value) || 60 })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                  <span style={{ fontSize: 11, color: '#64748b' }}>Bottom clearance for signature stamps and accreditation seals</span>
                </div>
              </div>

              {/* Security & Feature Toggles */}
              <div style={{ backgroundColor: '#f8fafc', borderRadius: 10, padding: 16, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Certified Security & Clinical Badges</h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!selectedTemplate.show_qr_code}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, show_qr_code: e.target.checked })}
                      style={{ width: 16, height: 16, accentColor: '#0284c7' }}
                    />
                    <span>Print Cryptographic QR Verification Code</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!selectedTemplate.show_digital_signatures}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, show_digital_signatures: e.target.checked })}
                      style={{ width: 16, height: 16, accentColor: '#0284c7' }}
                    />
                    <span>Include Pathologist Digital Signatures</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!selectedTemplate.show_nabl_logo}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, show_nabl_logo: e.target.checked })}
                      style={{ width: 16, height: 16, accentColor: '#0284c7' }}
                    />
                    <span>Display NABL / ISO 15189 Quality Seal</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!selectedTemplate.show_barcode}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, show_barcode: e.target.checked })}
                      style={{ width: 16, height: 16, accentColor: '#0284c7' }}
                    />
                    <span>Print Specimen Barcode / Lab Number</span>
                  </label>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
