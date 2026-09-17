import React, { useState, useEffect } from 'react';
import {
  Sliders, ToggleLeft, ToggleRight, RotateCcw, ShieldCheck,
  CheckCircle, Plus, RefreshCw, Cpu, Layers, Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface FeatureFlag {
  id: string;
  name: string;
  code: string;
  description?: string;
  is_enabled: boolean;
  rollout_percentage: number;
  target_roles?: string;
}

interface ConfigVersion {
  id: string;
  version_number: number;
  config_snapshot: string;
  created_by_name?: string;
  reason?: string;
  created_at: string;
}

export const FeatureFlagsManager: React.FC = () => {
  const { token } = useAuth();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [versions, setVersions] = useState<ConfigVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchFlags = async () => {
    try {
      setLoading(true);
      const [fRes, vRes] = await Promise.all([
        fetch('/api/feature-flags', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/feature-flags/versions', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (fRes.ok) setFlags(await fRes.json());
      if (vRes.ok) setVersions(await vRes.json());
    } catch (err) {
      console.error('Failed to load feature flags', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const handleToggle = async (flag: FeatureFlag) => {
    try {
      const updatedStatus = !flag.is_enabled;
      const res = await fetch(`/api/feature-flags/${flag.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          is_enabled: updatedStatus
        })
      });
      if (res.ok) {
        setFlags(flags.map(f => f.id === flag.id ? { ...f, is_enabled: updatedStatus } : f));
        setActionNotice(`Feature flag "${flag.name}" toggled to ${updatedStatus ? 'ENABLED' : 'DISABLED'}.`);
        setTimeout(() => setActionNotice(null), 4000);
      }
    } catch (err) {
      console.error('Toggle flag error', err);
    }
  };

  const handleRolloutChange = async (flag: FeatureFlag, pct: number) => {
    try {
      const res = await fetch(`/api/feature-flags/${flag.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          rollout_percentage: pct
        })
      });
      if (res.ok) {
        setFlags(flags.map(f => f.id === flag.id ? { ...f, rollout_percentage: pct } : f));
      }
    } catch (err) {
      console.error('Rollout update error', err);
    }
  };

  const handleRollback = async (versionId: string) => {
    try {
      const res = await fetch(`/api/feature-flags/versions/${versionId}/rollback`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setActionNotice('System configuration safely restored from immutable snapshot.');
        fetchFlags();
        setTimeout(() => setActionNotice(null), 4000);
      }
    } catch (err) {
      console.error('Rollback error', err);
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Enterprise Feature Flags & Configuration Versioning
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Control dynamic feature toggles, staged rollout percentage thresholds, and one-click configuration snapshot rollback
          </p>
        </div>
      </div>

      {actionNotice && (
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
          <CheckCircle size={16} /> {actionNotice}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 24 }}>
        {/* Flags List */}
        <div className="card" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sliders size={18} color="#0284c7" /> Dynamic Enterprise Toggles
          </h3>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              Loading enterprise feature registry...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {flags.map((flag) => (
                <div key={flag.id} style={{
                  padding: 16,
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  background: flag.is_enabled ? '#ffffff' : '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{flag.name}</span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        background: '#f1f5f9',
                        color: '#475569',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontFamily: 'monospace'
                      }}>
                        {flag.code}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 8px', color: '#64748b', fontSize: 13 }}>
                      {flag.description}
                    </p>

                    {/* Staged Rollout Slider */}
                    {flag.is_enabled && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>Rollout:</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="10"
                          value={flag.rollout_percentage}
                          onChange={(e) => handleRolloutChange(flag, Number(e.target.value))}
                          style={{ width: 140, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#0284c7' }}>
                          {flag.rollout_percentage}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Toggle Button */}
                  <button
                    onClick={() => handleToggle(flag)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: flag.is_enabled ? '#0284c7' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {flag.is_enabled ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Configuration Rollback History */}
        <div className="card" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <RotateCcw size={18} color="#8b5cf6" /> Configuration Snapshots
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {versions.map((ver) => (
              <div key={ver.id} style={{
                padding: 14,
                borderRadius: 8,
                background: '#f8fafc',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>
                    Release Snapshot v{ver.version_number}.0
                  </span>
                  <button
                    onClick={() => handleRollback(ver.id)}
                    className="btn btn-secondary"
                    style={{ fontSize: 11, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <RotateCcw size={12} /> Rollback
                  </button>
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                  {ver.reason || 'System state checkpoint'}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  {new Date(ver.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureFlagsManager;
