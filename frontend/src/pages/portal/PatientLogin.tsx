import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartPulse, ShieldCheck, Lock, Smartphone, AlertCircle, ArrowRight } from 'lucide-react';

export const PatientLogin: React.FC = () => {
  const [username, setUsername] = useState('9836240067');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/patient-portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('patient_portal_token', data.token);
      localStorage.setItem('patient_portal_user', JSON.stringify(data.patient));
      navigate('/patient/dashboard');
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
      background: 'linear-gradient(135deg, #064e3b 0%, #0f172a 60%, #064e3b 100%)',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(0,0,0,0) 70%)',
        bottom: '-10%',
        left: '-10%',
        pointerEvents: 'none'
      }} />

      <div style={{
        width: '100%',
        maxWidth: 440,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderRadius: 16,
        padding: '36px 32px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        zIndex: 1
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            marginBottom: 16,
            boxShadow: '0 8px 16px rgba(16, 185, 129, 0.3)'
          }}>
            <HeartPulse size={28} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
            Patient Health Records
          </h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            MediFlow Clinical LIS — Secure Patient Portal
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
              Registered Mobile Number or Patient ID
            </label>
            <div style={{ position: 'relative' }}>
              <Smartphone size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. 9836240067 or PID-2026-0001"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 14,
                  outline: 'none',
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
              backgroundColor: '#059669',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
            }}
          >
            {loading ? 'Accessing Records...' : (
              <>
                <span>Access My Health Records</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: 24, padding: '12px', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1', fontSize: 12, color: '#64748b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
            <ShieldCheck size={14} color="#10b981" />
            <span>Demo Patient Credentials</span>
          </div>
          <div>Mobile: <strong style={{ color: '#0f172a' }}>9836240067</strong> | Pass: <strong style={{ color: '#0f172a' }}>admin123</strong></div>
          <div style={{ marginTop: 4, fontSize: 11, color: '#94a3b8' }}>Patients have isolated, view-only access to their verified test history.</div>
        </div>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <a href="/login" style={{ fontSize: 12, color: '#059669', textDecoration: 'none', fontWeight: 500 }}>
            ← Return to Main Laboratory Staff Login
          </a>
        </div>
      </div>
    </div>
  );
};
