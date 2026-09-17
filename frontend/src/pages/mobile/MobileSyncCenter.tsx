import React, { useState, useEffect } from 'react';
import {
  Smartphone, RefreshCw, CheckCircle, AlertTriangle, ArrowRight,
  Shield, Layers, Wifi, WifiOff, HardDrive, Check, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

interface MobileDevice {
  id: string;
  device_name: string;
  device_uid: string;
  platform: 'android' | 'ios' | 'windows_tablet';
  app_version: string;
  user_name?: string;
  last_sync_at?: string;
  status: 'active' | 'revoked';
}

export const MobileSyncCenter: React.FC = () => {
  const { token } = useAuth();
  const [devices, setDevices] = useState<MobileDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const data = await api.get<MobileDevice[]>('/mobile/devices');
      setDevices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load mobile devices', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [token]);

  const handleSimulateSync = async () => {
    if (devices.length === 0) return;
    try {
      setSyncing(true);
      const data = await api.post<any>('/mobile/sync/batch', {
        device_id: devices[0].id,
        transactions: [
          {
            id: `tx-sync-${Date.now()}`,
            action_type: 'barcode_scan',
            payload: { barcode: 'SMP-2026-000030', location: 'Mobile Van 1', phleb_id: 'phleb-01' },
            queued_at: new Date().toISOString()
          }
        ]
      });
      if (data) {
        setSyncResult(`Batch sync successful: Processed ${data.processed_count || 1} transaction with 0 conflicts.`);
        fetchDevices();
        setTimeout(() => setSyncResult(null), 5000);
      }
    } catch (err) {
      console.error('Batch sync error', err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Mobile Fleet & Offline-First Synchronization
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Manage handheld phlebotomy scanners, home collection tablets, offline transaction queues & conflict reconciliation
          </p>
        </div>

        <button
          onClick={handleSimulateSync}
          disabled={syncing || devices.length === 0}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Reconciling Queues...' : 'Trigger Batch Sync Reconciliation'}
        </button>
      </div>

      {syncResult && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          padding: '12px 18px',
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <CheckCircle size={16} /> {syncResult}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        <div className="card" style={{ padding: 18, borderLeft: '4px solid #0284c7' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>REGISTERED HANDHELDS</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 6 }}>
            {devices.length} Devices
          </div>
          <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>Fleet authorized</div>
        </div>

        <div className="card" style={{ padding: 18, borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>SYNC HEALTH PROTOCOL</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981', marginTop: 6 }}>
            Operational
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Bidirectional incremental sync</div>
        </div>

        <div className="card" style={{ padding: 18, borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>UNRESOLVED CONFLICTS</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 6 }}>
            0 Conflicts
          </div>
          <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>Clean state ledger</div>
        </div>
      </div>

      {/* Registered Devices List */}
      <div className="card" style={{ padding: 22 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>
          Registered Mobile Scanner Fleet
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
            Loading mobile fleet status...
          </div>
        ) : (
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                <th style={{ padding: '10px 14px' }}>DEVICE NAME</th>
                <th style={{ padding: '10px 14px' }}>PLATFORM</th>
                <th style={{ padding: '10px 14px' }}>DEVICE UID</th>
                <th style={{ padding: '10px 14px' }}>APP VERSION</th>
                <th style={{ padding: '10px 14px' }}>ASSIGNED OPERATOR</th>
                <th style={{ padding: '10px 14px' }}>LAST RECONCILED</th>
                <th style={{ padding: '10px 14px' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((dev) => (
                <tr key={dev.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>
                    <Smartphone size={16} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 6, color: '#0284c7' }} />
                    {dev.device_name}
                  </td>
                  <td style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: 11, fontWeight: 700, color: '#475569' }}>
                    {dev.platform}
                  </td>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>
                    {dev.device_uid || dev.id?.toUpperCase() || 'DEV-UID'}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#475569' }}>
                    v{dev.app_version}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#0f172a', fontWeight: 600 }}>
                    {dev.user_name || 'Phlebotomist Pool'}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#64748b' }}>
                    {dev.last_sync_at ? new Date(dev.last_sync_at).toLocaleString() : 'Never'}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: dev.status === 'active' || !dev.status ? '#ecfdf5' : '#fef2f2',
                      color: dev.status === 'active' || !dev.status ? '#166534' : '#991b1b'
                    }}>
                      {(dev.status || 'active').toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default MobileSyncCenter;
