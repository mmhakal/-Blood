import React, { useState, useEffect } from 'react';
import {
  CheckCircle2, Circle, ArrowRight, Sparkles, Building2,
  Users, TestTubes, FileText, Bell, Layers, RefreshCw, Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

interface OnboardingStep {
  id: string;
  order: number;
  title: string;
  description: string;
  category: 'account' | 'facility' | 'clinical' | 'operational';
  is_completed: boolean;
  action_url: string;
}

interface OnboardingStatus {
  lab_id: string;
  completed_count: number;
  total_steps: number;
  progress_percentage: number;
  is_ready_to_operate: boolean;
  steps: OnboardingStep[];
}

export const OnboardingWizard: React.FC = () => {
  const { token } = useAuth();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/onboarding/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to load onboarding status', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleQuickStarter = async () => {
    try {
      setProvisioning(true);
      const res = await fetch('/api/onboarding/quick-starter', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotice('Starter kit assets successfully provisioned (Default Branch & NABL Template).');
        fetchStatus();
        setTimeout(() => setNotice(null), 5000);
      }
    } catch (err) {
      console.error('Starter kit provisioning error', err);
    } finally {
      setProvisioning(false);
    }
  };

  const filteredSteps = status?.steps.filter(s => {
    if (activeCategory === 'all') return true;
    return s.category === activeCategory;
  }) || [];

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
        padding: '24px 30px',
        borderRadius: 16,
        color: '#fff',
        marginBottom: 24,
        boxShadow: '0 10px 25px -5px rgba(2, 132, 199, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>
                Laboratory SaaS Onboarding & Activation Hub
              </h1>
              <span style={{
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '3px 10px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700
              }}>
                SELF-SERVICE
              </span>
            </div>
            <p style={{ margin: '6px 0 0', color: '#e0f2fe', fontSize: 13 }}>
              Step-by-step guidance to commission facility master catalogs, branch networks, report templates and billing
            </p>
          </div>

          <button
            onClick={handleQuickStarter}
            disabled={provisioning}
            className="btn"
            style={{
              background: '#ffffff',
              color: '#0284c7',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
          >
            <Zap size={16} />
            {provisioning ? 'Provisioning Starter Pack...' : '1-Click Starter Kit Provision'}
          </button>
        </div>

        {/* Overall Progress Bar */}
        {status && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <span>Onboarding Readiness</span>
              <span style={{ fontWeight: 800 }}>{status.progress_percentage}% Complete ({status.completed_count}/{status.total_steps} Milestones)</span>
            </div>
            <div style={{ height: 10, background: 'rgba(255, 255, 255, 0.25)', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{
                width: `${status.progress_percentage}%`,
                height: '100%',
                background: '#ffffff',
                borderRadius: 5,
                transition: 'width 0.4s ease'
              }} />
            </div>
          </div>
        )}
      </div>

      {notice && (
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
          <CheckCircle2 size={16} /> {notice}
        </div>
      )}

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['all', 'account', 'facility', 'clinical', 'operational'].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              border: activeCategory === cat ? 'none' : '1px solid #e2e8f0',
              background: activeCategory === cat ? '#0284c7' : '#ffffff',
              color: activeCategory === cat ? '#ffffff' : '#475569',
              textTransform: 'capitalize'
            }}
          >
            {cat} Milestones
          </button>
        ))}
      </div>

      {/* Steps List */}
      <div className="card" style={{ padding: 22 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
            Evaluating laboratory configuration milestones...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredSteps.map((step) => (
              <div
                key={step.id}
                style={{
                  padding: '16px 20px',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  background: step.is_completed ? '#f0fdf4' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {step.is_completed ? (
                    <CheckCircle2 size={24} color="#16a34a" style={{ flexShrink: 0 }} />
                  ) : (
                    <Circle size={24} color="#cbd5e1" style={{ flexShrink: 0 }} />
                  )}

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>
                        Step {step.order}: {step.title}
                      </span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: '#f1f5f9',
                        color: '#64748b',
                        textTransform: 'uppercase'
                      }}>
                        {step.category}
                      </span>
                    </div>
                    <p style={{ margin: '3px 0 0', fontSize: 13, color: '#64748b' }}>
                      {step.description}
                    </p>
                  </div>
                </div>

                <Link
                  to={step.action_url}
                  className="btn btn-secondary"
                  style={{ fontSize: 12, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {step.is_completed ? 'Review' : 'Configure'} <ArrowRight size={13} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingWizard;
