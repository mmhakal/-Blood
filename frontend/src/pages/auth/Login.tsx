import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Lock, Mail, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, quickLoginAs } = useAuth();
  const { error, success } = useNotification();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      success('Authentication successful');
      navigate('/dashboard');
    } catch (err: any) {
      error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const demoCredentials: Record<string, { email: string; pass: string; title: string }> = {
    super_admin: { email: 'admin@medilabs.com', pass: 'admin123', title: 'Super Admin' },
    lab_admin: { email: 'labadmin@apexlabs.com', pass: 'admin123', title: 'Lab Admin' },
    pathologist: { email: 'pathologist@apexlabs.com', pass: 'admin123', title: 'Pathologist MD' },
    lab_technician: { email: 'technician@apexlabs.com', pass: 'admin123', title: 'Lab Technician' },
    receptionist: { email: 'reception@apexlabs.com', pass: 'admin123', title: 'Receptionist' },
    accountant: { email: 'accountant@apexlabs.com', pass: 'admin123', title: 'Accountant' },
  };

  const handleQuickDemo = async (role: any) => {
    const cred = demoCredentials[role];
    if (cred) {
      setEmail(cred.email);
      setPassword(cred.pass);
    }
    setLoading(true);
    try {
      await quickLoginAs(role);
      success(`Signed in as ${cred ? cred.title : role.toUpperCase()}`);
      navigate('/dashboard');
    } catch (err: any) {
      error(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentialsOnly = (role: string) => {
    const cred = demoCredentials[role];
    if (cred) {
      setEmail(cred.email);
      setPassword(cred.pass);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      backgroundColor: '#0f172a',
      background: 'radial-gradient(ellipse at top right, #0369a1 0%, #0f172a 65%)'
    }}>
      {/* Left Column: Clinical Hero & Highlights */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '60px 80px',
        color: '#ffffff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.5)'
          }}>
            <Activity size={26} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>MediFlow LIS</h1>
            <p style={{ fontSize: 13, color: '#38bdf8' }}>Blood Diagnostic Laboratory Information System</p>
          </div>
        </div>

        <div style={{ maxWidth: 540 }}>
          <h2 style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.2, color: '#f8fafc', marginBottom: 20 }}>
            Next-Generation Multi-Tenant Pathology & LIS Management
          </h2>
          <p style={{ fontSize: 16, color: '#94a3b8', lineHeight: 1.6, marginBottom: 30 }}>
            Standardize your entire clinical diagnostic cycle from barcode phlebotomy intake and real-time abnormal flagging to consultant pathologist digital sign-off and certified A4 diagnostic reporting.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              'Complete Multi-Tenant Data Isolation',
              'Barcode Sample Tracking & Phlebotomy',
              'Pre-calibrated CBC, LFT, KFT Catalog',
              'Automated Critical Flag & Delta Alert',
              'Pathologist Digital Approval & Signing',
              'A4 Diagnostic Report PDF Engine',
            ].map((feature, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#cbd5e1' }}>
                <CheckCircle2 size={16} color="#38bdf8" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 12, color: '#64748b' }}>
          ISO 15189:2022 & NABL Standards Compliant Diagnostic Software
        </div>
      </div>

      {/* Right Column: Login Card & 1-Click Demo Profiles */}
      <div style={{
        width: 520,
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '50px 60px',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.2)'
      }}>
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Sign In to Workspace</h3>
          <p style={{ fontSize: 13.5, color: '#64748b', marginTop: 4 }}>
            Enter your diagnostic credentials or select a 1-click role demo account.
          </p>
        </div>

        {/* 1-Click Role Switcher Demo Buttons */}
        <div style={{ marginBottom: 24, padding: 14, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 10 }}>
            🚀 Instant 1-Click Role Login
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button type="button" onClick={() => handleQuickDemo('super_admin')} className="btn btn-outline btn-sm" style={{ justifyContent: 'flex-start', fontSize: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#0284c7', display: 'inline-block' }} />
              Super Admin
            </button>
            <button type="button" onClick={() => handleQuickDemo('lab_admin')} className="btn btn-outline btn-sm" style={{ justifyContent: 'flex-start', fontSize: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block' }} />
              Lab Admin
            </button>
            <button type="button" onClick={() => handleQuickDemo('pathologist')} className="btn btn-outline btn-sm" style={{ justifyContent: 'flex-start', fontSize: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#8b5cf6', display: 'inline-block' }} />
              Pathologist MD
            </button>
            <button type="button" onClick={() => handleQuickDemo('lab_technician')} className="btn btn-outline btn-sm" style={{ justifyContent: 'flex-start', fontSize: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
              Lab Technician
            </button>
            <button type="button" onClick={() => handleQuickDemo('receptionist')} className="btn btn-outline btn-sm" style={{ justifyContent: 'flex-start', fontSize: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ec4899', display: 'inline-block' }} />
              Receptionist
            </button>
            <button type="button" onClick={() => handleQuickDemo('accountant')} className="btn btn-outline btn-sm" style={{ justifyContent: 'flex-start', fontSize: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#64748b', display: 'inline-block' }} />
              Accountant
            </button>
          </div>
        </div>

        {/* Universal Password Banner */}
        <div style={{
          marginBottom: 20,
          padding: '12px 14px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <div style={{
            width: 30,
            height: 30,
            borderRadius: 6,
            backgroundColor: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Lock size={16} color="#ffffff" />
          </div>
          <div style={{ fontSize: 12.5, color: '#166534', lineHeight: 1.4 }}>
            <span>Naya Universal Password: </span>
            <strong style={{ fontFamily: 'monospace', fontSize: 13, backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: 4, color: '#14532d' }}>admin123</strong>
            <span style={{ color: '#15803d', marginLeft: 6 }}>(ya <strong>123456</strong>)</span>
            <div style={{ fontSize: 11.5, color: '#15803d', marginTop: 2 }}>
              Kissi bhi account me naye password se turant login karein.
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 11 }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. labadmin@apexlabs.com"
                className="form-input"
                style={{ paddingLeft: 36 }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 11 }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
                style={{ paddingLeft: 36 }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 8, height: 42, fontSize: 14 }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Laboratory'}
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
          Protected by role-based clinical security & audit logging.
        </div>
      </div>
    </div>
  );
};
