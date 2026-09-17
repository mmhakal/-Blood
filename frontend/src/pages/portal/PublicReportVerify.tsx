import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck, ShieldAlert, CheckCircle2, AlertCircle, Building2,
  Calendar, UserCheck, Stethoscope, Lock, ExternalLink
} from 'lucide-react';

export const PublicReportVerify: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Verification token missing');
      setLoading(false);
      return;
    }

    fetch(`/api/verify/${token}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Verification failed');
        setData(json);
      })
      .catch((err) => {
        setError(err.message || 'Unable to authenticate report token');
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f1f5f9',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 580,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* Top Header Ribbon */}
        <div style={{
          backgroundColor: data?.valid ? '#047857' : '#991b1b',
          color: '#ffffff',
          padding: '20px 24px',
          textAlign: 'center',
          position: 'relative'
        }}>
          <div style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            color: data?.valid ? '#059669' : '#dc2626',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}>
            {data?.valid ? <ShieldCheck size={36} /> : <ShieldAlert size={36} />}
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            {loading ? 'Validating Cryptographic Signature...' : data?.valid ? 'Official Diagnostic Report Verified' : 'Invalid or Revoked Report'}
          </h1>
          <p style={{ fontSize: 13, opacity: 0.9, marginTop: 4, margin: 0 }}>
            MediFlow Public Clinical Cryptographic Verification Engine
          </p>
        </div>

        {/* Content Body */}
        <div style={{ padding: '28px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              <div style={{ fontSize: 14 }}>Connecting to secure verification keystore...</div>
            </div>
          ) : error || !data?.valid ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 18px',
                backgroundColor: '#fee2e2',
                borderRadius: 8,
                color: '#991b1b',
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 16
              }}>
                <AlertCircle size={20} />
                <span>Verification Failed: {error || 'Signature does not match records'}</span>
              </div>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, maxWidth: 440, margin: '0 auto' }}>
                This QR verification token could not be verified in the national registry.
                The report may have expired, been invalidated, or tampered with.
                Please contact the issuing diagnostic laboratory immediately.
              </p>
            </div>
          ) : (
            <div>
              {/* Authenticity Certificate Box */}
              <div style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 10,
                padding: '14px 18px',
                marginBottom: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}>
                <CheckCircle2 size={24} color="#16a34a" />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#166534' }}>
                    Authentic Clinical Document
                  </div>
                  <div style={{ fontSize: 12, color: '#15803d' }}>
                    Digitally signed by accredited clinical pathologist and recorded in immutable laboratory ledger.
                  </div>
                </div>
              </div>

              {/* Data Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                    <Building2 size={13} />
                    <span>Issuing Laboratory</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{data.lab_name}</div>
                  <div style={{ fontSize: 11, color: '#0284c7', fontWeight: 600 }}>{data.branch_name || 'Central Diagnostic Hub'}</div>
                </div>

                <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                    <Calendar size={13} />
                    <span>Report Reference</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{data.report_number}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Order #{data.order_number}</div>
                </div>

                <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                    <UserCheck size={13} />
                    <span>Patient Safe Identifier</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{data.patient_safe_code}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Privacy Mask Applied</div>
                </div>

                <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                    <Stethoscope size={13} />
                    <span>Certified Approver</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{data.approved_by || 'Consultant Pathologist'}</div>
                  <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>Digital Signature Valid</div>
                </div>
              </div>

              {/* Privacy Notice Banner */}
              <div style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 8,
                padding: '12px 14px',
                fontSize: 12,
                color: '#1e40af',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                lineHeight: 1.5
              }}>
                <Lock size={15} style={{ marginTop: 2, flexShrink: 0 }} />
                <span>
                  <strong>Patient Confidentiality Guaranteed:</strong> In compliance with ISO 15189 and medical data privacy standards, clinical test values are not displayed on public verification scans.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#64748b'
        }}>
          <span>MediFlow LIS Enterprise v5.0</span>
          <Link to="/login" style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}>
            Laboratory Login →
          </Link>
        </div>
      </div>
    </div>
  );
};
