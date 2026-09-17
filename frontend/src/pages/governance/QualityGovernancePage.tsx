import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, BookOpen, AlertOctagon, ShieldCheck, Award,
  Cpu, Plus, RefreshCw, CheckCircle2, Clock, FileText,
  AlertTriangle, Filter, Search, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SOP {
  id: string;
  sop_number: string;
  title: string;
  department: string;
  version: string;
  effective_date: string;
  review_date: string;
  status: 'draft' | 'active' | 'under_revision' | 'archived';
}

interface Incident {
  id: string;
  incident_number: string;
  incident_type: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  department: string;
  title: string;
  description: string;
  status: 'reported' | 'under_investigation' | 'capa_initiated' | 'closed';
  created_at: string;
}

interface CapaRecord {
  id: string;
  capa_number: string;
  incident_id?: string;
  root_cause: string;
  corrective_action: string;
  preventive_action: string;
  effectiveness_review?: string;
  status: 'open' | 'implemented' | 'verified_effective' | 'closed';
}

interface RiskItem {
  id: string;
  risk_title: string;
  category: string;
  likelihood: number;
  impact: number;
  risk_score: number;
  mitigation_plan: string;
  status: string;
}

interface RegulatoryLicense {
  id: string;
  license_name: string;
  authority: string;
  license_number: string;
  issue_date: string;
  expiry_date: string;
  status: string;
  renewal_alert_days: number;
}

export const QualityGovernancePage: React.FC = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'sops' | 'incidents' | 'capa' | 'risks' | 'licenses'>('sops');
  const [sops, setSops] = useState<SOP[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [capas, setCapas] = useState<CapaRecord[]>([]);
  const [risks, setRisks] = useState<RiskItem[]>([]);
  const [licenses, setLicenses] = useState<RegulatoryLicense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // New Incident Modal
  const [showIncidentModal, setShowIncidentModal] = useState<boolean>(false);
  const [newIncident, setNewIncident] = useState({
    incident_type: 'pre_analytical',
    severity: 'moderate',
    department: 'phlebotomy',
    title: '',
    description: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sopRes, incRes, capaRes, rskRes, licRes] = await Promise.all([
        fetch('/api/quality-governance/sops', { credentials: 'omit', headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/quality-governance/incidents', { credentials: 'omit', headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/quality-governance/capa', { credentials: 'omit', headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/quality-governance/risk-register', { credentials: 'omit', headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/quality-governance/licenses', { credentials: 'omit', headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (sopRes.ok) setSops(await sopRes.json());
      if (incRes.ok) setIncidents(await incRes.json());
      if (capaRes.ok) setCapas(await capaRes.json());
      if (rskRes.ok) setRisks(await rskRes.json());
      if (licRes.ok) setLicenses(await licRes.json());
    } catch (err) {
      console.error('Failed to load quality governance records', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/quality-governance/incidents', {
        method: 'POST',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newIncident)
      });
      if (res.ok) {
        setShowIncidentModal(false);
        setNewIncident({
          incident_type: 'pre_analytical',
          severity: 'moderate',
          department: 'phlebotomy',
          title: '',
          description: ''
        });
        fetchData();
      }
    } catch (err) {
      console.error('Error reporting incident', err);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical':
        return <span style={{ background: '#fef2f2', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>CRITICAL</span>;
      case 'major':
        return <span style={{ background: '#fff7ed', color: '#c2410c', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>MAJOR</span>;
      case 'moderate':
        return <span style={{ background: '#fefce8', color: '#a16207', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>MODERATE</span>;
      default:
        return <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>MINOR</span>;
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ padding: '4px 8px', background: '#ecfdf5', color: '#047857', borderRadius: '4px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>
              ISO 15189 / NABL COMPLIANCE QMS
            </span>
            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>• CAPA & Governance Active</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a' }}>Quality Governance & Enterprise QMS</h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '2px' }}>
            Standard Operating Procedures, incident investigation, root cause CAPA closure, risk register, and statutory licenses
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              background: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#334155'
            }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>

          <button
            onClick={() => setShowIncidentModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(220,38,38,0.3)'
            }}
          >
            <AlertOctagon size={16} />
            Report Incident
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', gap: '8px' }}>
        <button
          onClick={() => setActiveTab('sops')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'sops' ? '2px solid #0284c7' : '2px solid transparent',
            color: activeTab === 'sops' ? '#0284c7' : '#64748b',
            background: 'transparent',
            cursor: 'pointer'
          }}
        >
          SOP Library ({sops.length})
        </button>
        <button
          onClick={() => setActiveTab('incidents')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'incidents' ? '2px solid #0284c7' : '2px solid transparent',
            color: activeTab === 'incidents' ? '#0284c7' : '#64748b',
            background: 'transparent',
            cursor: 'pointer'
          }}
        >
          Incidents Log ({incidents.length})
        </button>
        <button
          onClick={() => setActiveTab('capa')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'capa' ? '2px solid #0284c7' : '2px solid transparent',
            color: activeTab === 'capa' ? '#0284c7' : '#64748b',
            background: 'transparent',
            cursor: 'pointer'
          }}
        >
          CAPA Tracking ({capas.length})
        </button>
        <button
          onClick={() => setActiveTab('risks')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'risks' ? '2px solid #0284c7' : '2px solid transparent',
            color: activeTab === 'risks' ? '#0284c7' : '#64748b',
            background: 'transparent',
            cursor: 'pointer'
          }}
        >
          Risk Matrix ({risks.length})
        </button>
        <button
          onClick={() => setActiveTab('licenses')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'licenses' ? '2px solid #0284c7' : '2px solid transparent',
            color: activeTab === 'licenses' ? '#0284c7' : '#64748b',
            background: 'transparent',
            cursor: 'pointer'
          }}
        >
          Statutory Licenses ({licenses.length})
        </button>
      </div>

      {/* Tab: SOP Library */}
      {activeTab === 'sops' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px' }}>SOP #</th>
                <th style={{ padding: '12px 16px' }}>Procedure Title</th>
                <th style={{ padding: '12px 16px' }}>Department</th>
                <th style={{ padding: '12px 16px' }}>Version</th>
                <th style={{ padding: '12px 16px' }}>Effective Date</th>
                <th style={{ padding: '12px 16px' }}>Next Review</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sops.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                    No Standard Operating Procedures cataloged.
                  </td>
                </tr>
              ) : (
                sops.map(sop => (
                  <tr key={sop.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0284c7' }}>{sop.sop_number}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{sop.title}</td>
                    <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: '#475569' }}>{sop.department}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{sop.version}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{new Date(sop.effective_date).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{new Date(sop.review_date).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#ecfdf5', color: '#047857', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                        {sop.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Incidents Log */}
      {activeTab === 'incidents' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px' }}>Incident #</th>
                <th style={{ padding: '12px 16px' }}>Title & Description</th>
                <th style={{ padding: '12px 16px' }}>Phase / Type</th>
                <th style={{ padding: '12px 16px' }}>Department</th>
                <th style={{ padding: '12px 16px' }}>Severity</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {incidents.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                    Zero quality incidents reported.
                  </td>
                </tr>
              ) : (
                incidents.map(inc => (
                  <tr key={inc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#dc2626' }}>{inc.incident_number}</td>
                    <td style={{ padding: '12px 16px', maxWidth: '350px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{inc.title}</div>
                      <div style={{ color: '#64748b', fontSize: '12px' }}>{inc.description}</div>
                    </td>
                    <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: '#475569' }}>
                      {inc.incident_type.replace('_', ' ')}
                    </td>
                    <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{inc.department}</td>
                    <td style={{ padding: '12px 16px' }}>{getSeverityBadge(inc.severity)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                        {inc.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: CAPA Tracking */}
      {activeTab === 'capa' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '16px' }}>
          {capas.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
              No Corrective and Preventive Action records initiated.
            </div>
          ) : (
            capas.map(capa => (
              <div key={capa.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, padding: '2px 8px', background: '#ecfdf5', color: '#047857', borderRadius: '4px' }}>
                    {capa.capa_number}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', background: '#eff6ff', color: '#1d4ed8' }}>
                    {capa.status.replace('_', ' ')}
                  </span>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', display: 'block' }}>ROOT CAUSE ANALYSIS:</span>
                  <p style={{ fontSize: '13px', color: '#334155' }}>{capa.root_cause}</p>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7', display: 'block' }}>CORRECTIVE ACTION:</span>
                  <p style={{ fontSize: '13px', color: '#334155' }}>{capa.corrective_action}</p>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#047857', display: 'block' }}>PREVENTIVE MEASURE:</span>
                  <p style={{ fontSize: '13px', color: '#334155' }}>{capa.preventive_action}</p>
                </div>

                {capa.effectiveness_review && (
                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', fontSize: '12px', color: '#475569', borderTop: '1px solid #f1f5f9' }}>
                    <strong>Effectiveness Review:</strong> {capa.effectiveness_review}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Risk Register */}
      {activeTab === 'risks' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px' }}>Risk Factor</th>
                <th style={{ padding: '12px 16px' }}>Category</th>
                <th style={{ padding: '12px 16px' }}>Likelihood (1-5)</th>
                <th style={{ padding: '12px 16px' }}>Impact (1-5)</th>
                <th style={{ padding: '12px 16px' }}>Risk Score</th>
                <th style={{ padding: '12px 16px' }}>Mitigation Plan</th>
              </tr>
            </thead>
            <tbody>
              {risks.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                    No risk items cataloged.
                  </td>
                </tr>
              ) : (
                risks.map(rsk => (
                  <tr key={rsk.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{rsk.risk_title}</td>
                    <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{rsk.category}</td>
                    <td style={{ padding: '12px 16px' }}>{rsk.likelihood} / 5</td>
                    <td style={{ padding: '12px 16px' }}>{rsk.impact} / 5</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '12px',
                        background: rsk.risk_score >= 15 ? '#fef2f2' : (rsk.risk_score >= 8 ? '#fffbeb' : '#f0fdf4'),
                        color: rsk.risk_score >= 15 ? '#dc2626' : (rsk.risk_score >= 8 ? '#b45309' : '#15803d')
                      }}>
                        {rsk.risk_score} (Score)
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', maxWidth: '300px' }}>{rsk.mitigation_plan}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Statutory Licenses */}
      {activeTab === 'licenses' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
          {licenses.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
              No statutory licenses recorded.
            </div>
          ) : (
            licenses.map(lic => (
              <div key={lic.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{lic.license_name}</h4>
                  <span style={{ background: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                    {lic.status}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                  Authority: <strong style={{ color: '#334155' }}>{lic.authority}</strong> • No: <strong>{lic.license_number}</strong>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', fontSize: '12px', color: '#334155', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Valid until: <strong>{new Date(lic.expiry_date).toLocaleDateString()}</strong></span>
                  <span style={{ color: '#047857', fontWeight: 600 }}>Valid ✓</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal: Report Incident */}
      {showIncidentModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999
        }}>
          <div style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '520px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Log Clinical / Operational Incident</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              Document deviations, specimen hemolyzation, labeling discrepancies or equipment alarms.
            </p>

            <form onSubmit={handleReportIncident}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Incident Summary *</label>
                <input
                  type="text"
                  required
                  value={newIncident.title}
                  onChange={e => setNewIncident({ ...newIncident, title: e.target.value })}
                  placeholder="e.g. Hemolyzed blood specimen delivered for K+ electrolyte analysis"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Phase</label>
                  <select
                    value={newIncident.incident_type}
                    onChange={e => setNewIncident({ ...newIncident, incident_type: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                  >
                    <option value="pre_analytical">Pre-Analytical</option>
                    <option value="analytical">Analytical</option>
                    <option value="post_analytical">Post-Analytical</option>
                    <option value="safety">Bio-Safety</option>
                    <option value="it_failure">LIS / IT Failure</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Severity</label>
                  <select
                    value={newIncident.severity}
                    onChange={e => setNewIncident({ ...newIncident, severity: e.target.value as any })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                  >
                    <option value="minor">Minor</option>
                    <option value="moderate">Moderate</option>
                    <option value="major">Major</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Department</label>
                  <select
                    value={newIncident.department}
                    onChange={e => setNewIncident({ ...newIncident, department: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                  >
                    <option value="phlebotomy">Phlebotomy</option>
                    <option value="hematology">Hematology</option>
                    <option value="biochemistry">Biochemistry</option>
                    <option value="microbiology">Microbiology</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Incident Details & Circumstances *</label>
                <textarea
                  rows={3}
                  required
                  value={newIncident.description}
                  onChange={e => setNewIncident({ ...newIncident, description: e.target.value })}
                  placeholder="Detail sample IDs, time of discovery, personnel involved, and initial containment actions taken..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowIncidentModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '6px', background: '#dc2626', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  File Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityGovernancePage;
