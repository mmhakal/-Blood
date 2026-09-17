import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, ShieldCheck, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

export const DoctorLogin: React.FC = () => {
  const [username, setUsername] = useState('dr.arthur');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/doctor-portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('doctor_portal_token', data.token);
      localStorage.setItem('doctor_portal_user', JSON.stringify(data.doctor));
      navigate('/doctor/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #090e17 0%, #111c2e 50%, #0c192c 100%)',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, rgba(0,0,0,0) 70%)',
        top: '-10%',
        right: '-10%',
        pointerEvents: 'none'
      }} />

      <div style={{
        width: '100%',
        maxWidth: 440,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderRadius: 16,
        padding: '36px 32px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        zIndex: 1
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            marginBottom: 16,
            boxShadow: '0 8px 16px rgba(2, 132, 199, 0.3)'
          }}>
            <Stethoscope size={28} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
            Doctor & Clinician Portal
          </h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            MediFlow Clinical LIS — Referring Physician Workspace
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            color: '#b91c1c',
            fontSize: 13,
            marginBottom: 20
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Username or Registered Email
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. dr.arthur or doctor@hospital.org"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 8,
              backgroundColor: '#0284c7',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
              transition: 'background-color 0.2s'
            }}
          >
            {loading ? 'Authenticating...' : (
              <>
                <span>Sign In to Doctor Portal</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: 24, padding: '12px', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1', fontSize: 12, color: '#64748b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
            <ShieldCheck size={14} color="#0284c7" />
            <span>Demo Clinician Credentials</span>
          </div>
          <div>User: <strong style={{ color: '#0f172a' }}>dr.arthur</strong> | Pass: <strong style={{ color: '#0f172a' }}>admin123</strong></div>
          <div style={{ marginTop: 4, fontSize: 11, color: '#94a3b8' }}>Strict isolation: Clinicians can only view referred patients.</div>
        </div>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <a href="/login" style={{ fontSize: 12, color: '#0284c7', textDecoration: 'none', fontWeight: 500 }}>
            ← Return to Main Laboratory Staff Login
          </a>
        </div>
      </div>
    </div>
  );
};
