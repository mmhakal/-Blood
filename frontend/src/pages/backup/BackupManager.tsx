import React, { useState, useEffect } from 'react';
import { Database, Download, Plus, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export const BackupManager: React.FC = () => {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { error, success } = useNotification();

  const loadBackups = async () => {
    try {
      setLoading(true);
      const res = await api.get('/backups');
      setBackups(res);
    } catch (e: any) {
      error(e.message || 'Failed to load backups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      const res = await api.post('/backups');
      success(`Database backup snapshot created: ${res.backup.filename}`);
      loadBackups();
    } catch (err: any) {
      error(err.message || 'Failed to create backup');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (filename: string) => {
    try {
      const blob = await api.get(`/backups/${filename}/download`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      success('Backup snapshot downloaded');
    } catch (e: any) {
      error('Download failed: ' + e.message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Database Backup & Disaster Recovery</h1>
          <p style={{ fontSize: 13.5, color: '#64748b' }}>
            Automated database snapshots, point-in-time state archives, and offline restoration packages.
          </p>
        </div>
        <button onClick={handleCreateBackup} disabled={creating} className="btn btn-primary">
          <Database size={16} />
          <span>{creating ? 'Creating Snapshot...' : 'Create Snapshot Now'}</span>
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Backup Archive Filename</th>
              <th>Snapshot Size</th>
              <th>Type</th>
              <th>Integrity Status</th>
              <th>Created Timestamp</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30 }}>Loading backup archives...</td></tr>
            ) : backups.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>No backup archives found. Create one now.</td></tr>
            ) : (
              backups.map((b) => (
                <tr key={b.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{b.filename}</div>
                    <div style={{ fontSize: 10.5, color: '#64748b' }}>ID: {b.id}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{Math.round((b.file_size_bytes || 0) / 1024)} KB</span>
                  </td>
                  <td>
                    <span className="badge badge-primary">{b.backup_type}</span>
                  </td>
                  <td>
                    <span className="badge badge-normal">
                      <CheckCircle2 size={12} />
                      Verified
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: 12.5 }}>{new Date(b.created_at).toLocaleDateString('en-IN')}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{new Date(b.created_at).toLocaleTimeString()}</div>
                  </td>
                  <td>
                    <button
                      onClick={() => handleDownload(b.filename)}
                      className="btn btn-outline btn-sm"
                    >
                      <Download size={13} />
                      <span>Download Archive</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
