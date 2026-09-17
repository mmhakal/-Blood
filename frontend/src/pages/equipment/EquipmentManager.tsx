import React, { useState, useEffect } from 'react';
import {
  Wrench, Activity, CheckCircle2, AlertTriangle, XCircle, Plus, RefreshCw,
  Search, Filter, Calendar, DollarSign, Clock, ShieldCheck, MapPin, Phone,
  FileText, ArrowRight, Check, X
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export const EquipmentManager: React.FC = () => {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'assets' | 'logs'>('assets');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { error, success } = useNotification();

  // New Equipment Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingAsset, setSubmittingAsset] = useState(false);
  const [assetForm, setAssetForm] = useState({
    asset_id: '',
    name: '',
    category: 'Hematology',
    manufacturer: '',
    model: '',
    serial_number: '',
    location: 'Main Laboratory Floor',
    service_provider: '',
    contact_phone: '',
    next_maintenance_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  // Maintenance Log Modal
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [selectedEqId, setSelectedEqId] = useState('');
  const [submittingMaint, setSubmittingMaint] = useState(false);
  const [maintForm, setMaintForm] = useState({
    maintenance_type: 'preventive',
    scheduled_date: new Date().toISOString().split('T')[0],
    completed_date: new Date().toISOString().split('T')[0],
    performed_by_vendor: '',
    service_cost: '',
    downtime_hours: '1.5',
    work_summary: '',
    next_due_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'completed'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eqRes, maintRes] = await Promise.all([
        api.get('/equipment'),
        api.get('/equipment/maintenance')
      ]);
      setEquipment(eqRes || []);
      setMaintenanceLogs(maintRes || []);
    } catch (err: any) {
      error(err.message || 'Failed to load equipment catalog');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetForm.asset_id || !assetForm.name || !assetForm.manufacturer) {
      error('Asset ID, name, and manufacturer are required');
      return;
    }

    setSubmittingAsset(true);
    try {
      await api.post('/equipment', assetForm);
      success('Equipment registered successfully');
      setShowAddModal(false);
      setAssetForm({
        asset_id: '',
        name: '',
        category: 'Hematology',
        manufacturer: '',
        model: '',
        serial_number: '',
        location: 'Main Laboratory Floor',
        service_provider: '',
        contact_phone: '',
        next_maintenance_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to register equipment');
    } finally {
      setSubmittingAsset(false);
    }
  };

  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEqId) {
      error('Please select an equipment asset');
      return;
    }

    setSubmittingMaint(true);
    try {
      await api.post('/equipment/maintenance', {
        ...maintForm,
        equipment_id: selectedEqId,
        service_cost: parseFloat(maintForm.service_cost || '0'),
        downtime_hours: parseFloat(maintForm.downtime_hours || '0')
      });
      success('Maintenance record logged successfully');
      setShowMaintModal(false);
      setMaintForm({
        maintenance_type: 'preventive',
        scheduled_date: new Date().toISOString().split('T')[0],
        completed_date: new Date().toISOString().split('T')[0],
        performed_by_vendor: '',
        service_cost: '',
        downtime_hours: '1.5',
        work_summary: '',
        next_due_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'completed'
      });
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to log maintenance');
    } finally {
      setSubmittingMaint(false);
    }
  };

  const openLogMaintenanceForAsset = (eqId: string) => {
    setSelectedEqId(eqId);
    setShowMaintModal(true);
  };

  // Metrics
  const totalAssets = equipment.length;
  const operationalCount = equipment.filter(e => e.status === 'operational').length;
  const maintenanceCount = equipment.filter(e => e.status === 'maintenance' || e.status === 'in_maintenance').length;
  const totalCost = maintenanceLogs.reduce((sum, m) => sum + (parseFloat(m.service_cost) || 0), 0);

  const filteredEquipment = equipment.filter(e => {
    const matchesSearch = (e.name + ' ' + e.asset_id + ' ' + e.manufacturer + ' ' + (e.model || '')).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'all' || e.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const categories = Array.from(new Set(equipment.map(e => e.category).filter(Boolean)));

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ padding: 8, borderRadius: 8, background: '#e0e7ff', color: '#4f46e5' }}>
              <Wrench size={24} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Equipment & Asset Lifecycle</h1>
          </div>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            Enterprise maintenance schedules, asset registries, downtime tracking, and service contract governance.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            id="btn-refresh-eq"
            onClick={loadData}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, color: '#475569', cursor: 'pointer', fontWeight: 500 }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button
            id="btn-schedule-maint-open"
            onClick={() => { setSelectedEqId(equipment[0]?.id || ''); setShowMaintModal(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#4f46e5', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: 600, boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)' }}
          >
            <Wrench size={16} /> Log Maintenance
          </button>
          <button
            id="btn-add-asset-open"
            onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#0284c7', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: 600, boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)' }}
          >
            <Plus size={16} /> Register Asset
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>TOTAL ASSETS</span>
            <Activity size={18} color="#0284c7" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>{totalAssets}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Calibrated & managed analyzers</div>
        </div>

        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>OPERATIONAL</span>
            <CheckCircle2 size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981' }}>{operationalCount}</div>
          <div style={{ fontSize: 12, color: '#10b981', marginTop: 4 }}>
            {totalAssets ? Math.round((operationalCount / totalAssets) * 100) : 100}% Fleet uptime
          </div>
        </div>

        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>IN SERVICE / PM</span>
            <AlertTriangle size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b' }}>{maintenanceCount}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Scheduled or pending overhaul</div>
        </div>

        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>MAINTENANCE EXPENSE</span>
            <DollarSign size={18} color="#6366f1" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>
            ₹{totalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{maintenanceLogs.length} lifetime maintenance logs</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 20, gap: 16 }}>
        <button
          id="tab-assets"
          onClick={() => setActiveTab('assets')}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'assets' ? '2px solid #0284c7' : '2px solid transparent',
            color: activeTab === 'assets' ? '#0284c7' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Activity size={16} /> Asset Inventory ({filteredEquipment.length})
        </button>
        <button
          id="tab-maint-logs"
          onClick={() => setActiveTab('logs')}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'logs' ? '2px solid #0284c7' : '2px solid transparent',
            color: activeTab === 'logs' ? '#0284c7' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <FileText size={16} /> Maintenance History & Logs ({maintenanceLogs.length})
        </button>
      </div>

      {/* TAB 1: ASSETS */}
      {activeTab === 'assets' && (
        <>
          {/* Filters Bar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
              <input
                id="search-equipment"
                type="text"
                placeholder="Search by Asset ID, Model, or Manufacturer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14 }}
              />
            </div>

            <select
              id="filter-category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, background: '#fff', color: '#475569' }}
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Asset Table */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px' }}>Asset ID & Name</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Manufacturer / Model</th>
                  <th style={{ padding: '12px 16px' }}>Location</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Next Maintenance</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEquipment.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      No equipment found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEquipment.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{item.asset_id}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: '#f1f5f9', color: '#475569' }}>
                          {item.category}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ color: '#334155' }}>{item.manufacturer}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{item.model || 'N/A'} (SN: {item.serial_number || 'N/A'})</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#475569', fontSize: 13 }}>
                          <MapPin size={14} color="#94a3b8" />
                          {item.location || 'Central Floor'}
                        </div>
                        {item.branch_name && (
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.branch_name}</div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          background: item.status === 'operational' ? '#dcfce7' : item.status === 'maintenance' ? '#fef3c7' : '#fee2e2',
                          color: item.status === 'operational' ? '#15803d' : item.status === 'maintenance' ? '#b45309' : '#b91c1c'
                        }}>
                          {item.status === 'operational' ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                          {item.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155' }}>
                          <Calendar size={14} color="#64748b" />
                          {item.next_maintenance_date ? new Date(item.next_maintenance_date).toLocaleDateString() : 'Not scheduled'}
                        </div>
                        {item.last_maintenance_date && (
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>
                            Last: {new Date(item.last_maintenance_date).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          id={`btn-log-maint-${item.id}`}
                          onClick={() => openLogMaintenanceForAsset(item.id)}
                          style={{
                            padding: '6px 12px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#4f46e5',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <Wrench size={13} /> Log Service
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* TAB 2: MAINTENANCE HISTORY */}
      {activeTab === 'logs' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Equipment Asset</th>
                <th style={{ padding: '12px 16px' }}>Type</th>
                <th style={{ padding: '12px 16px' }}>Scheduled / Done</th>
                <th style={{ padding: '12px 16px' }}>Vendor / Performed By</th>
                <th style={{ padding: '12px 16px' }}>Downtime & Cost</th>
                <th style={{ padding: '12px 16px' }}>Summary</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {maintenanceLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    No maintenance logs recorded yet.
                  </td>
                </tr>
              ) : (
                maintenanceLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{log.equipment_name}</div>
                      <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{log.asset_id}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        background: log.maintenance_type === 'preventive' ? '#e0e7ff' : log.maintenance_type === 'corrective' ? '#fee2e2' : '#fef3c7',
                        color: log.maintenance_type === 'preventive' ? '#4338ca' : log.maintenance_type === 'corrective' ? '#b91c1c' : '#b45309'
                      }}>
                        {log.maintenance_type}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ color: '#334155' }}>
                        {log.completed_date ? new Date(log.completed_date).toLocaleDateString() : new Date(log.scheduled_date).toLocaleDateString()}
                      </div>
                      {log.next_due_date && (
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                          Next: {new Date(log.next_due_date).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#475569' }}>
                      {log.performed_by_vendor || 'In-house Biomedical'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        ₹{parseFloat(log.service_cost || 0).toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> {log.downtime_hours || 0} hrs downtime
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#475569', maxWidth: 280 }}>
                      <div style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.work_summary || 'Standard service checkup & filter replacement'}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        background: log.status === 'completed' ? '#dcfce7' : '#fef3c7',
                        color: log.status === 'completed' ? '#15803d' : '#b45309'
                      }}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: REGISTER ASSET */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: '600px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1e293b' }}>Register Equipment Asset</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAsset} style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Asset ID *</label>
                  <input
                    id="input-asset-id"
                    type="text"
                    required
                    placeholder="e.g. EQ-CBC-002"
                    value={assetForm.asset_id}
                    onChange={(e) => setAssetForm({ ...assetForm, asset_id: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Equipment Name *</label>
                  <input
                    id="input-asset-name"
                    type="text"
                    required
                    placeholder="e.g. Sysmex Automated Hematology"
                    value={assetForm.name}
                    onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Category *</label>
                  <select
                    id="input-asset-category"
                    value={assetForm.category}
                    onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, background: '#fff' }}
                  >
                    <option value="Hematology">Hematology</option>
                    <option value="Biochemistry">Biochemistry</option>
                    <option value="Immunology">Immunology</option>
                    <option value="Coagulation">Coagulation</option>
                    <option value="Centrifuge">Centrifuge</option>
                    <option value="Cold Storage">Cold Storage</option>
                    <option value="Microbiology">Microbiology</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Manufacturer *</label>
                  <input
                    id="input-asset-manufacturer"
                    type="text"
                    required
                    placeholder="e.g. Sysmex, Roche, Abbott"
                    value={assetForm.manufacturer}
                    onChange={(e) => setAssetForm({ ...assetForm, manufacturer: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Model</label>
                  <input
                    id="input-asset-model"
                    type="text"
                    placeholder="e.g. XN-550"
                    value={assetForm.model}
                    onChange={(e) => setAssetForm({ ...assetForm, model: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Serial Number</label>
                  <input
                    id="input-asset-serial"
                    type="text"
                    placeholder="e.g. SN-8924018"
                    value={assetForm.serial_number}
                    onChange={(e) => setAssetForm({ ...assetForm, serial_number: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Floor / Room Location</label>
                  <input
                    id="input-asset-location"
                    type="text"
                    placeholder="e.g. Main Lab Room 102"
                    value={assetForm.location}
                    onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Next Maintenance Date</label>
                  <input
                    id="input-asset-next-pm"
                    type="date"
                    value={assetForm.next_maintenance_date}
                    onChange={(e) => setAssetForm({ ...assetForm, next_maintenance_date: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '10px 18px', background: '#f1f5f9', border: 'none', borderRadius: 8, color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-asset"
                  type="submit"
                  disabled={submittingAsset}
                  style={{ padding: '10px 20px', background: '#0284c7', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  {submittingAsset ? 'Saving...' : 'Register Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOG MAINTENANCE */}
      {showMaintModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: '600px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1e293b' }}>Record Equipment Maintenance</h2>
              <button onClick={() => setShowMaintModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateMaintenance} style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Select Equipment Asset *</label>
                <select
                  id="select-maint-equipment"
                  value={selectedEqId}
                  onChange={(e) => setSelectedEqId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, background: '#fff' }}
                >
                  {equipment.map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.name} ({eq.asset_id}) - {eq.category}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Maintenance Type</label>
                  <select
                    id="select-maint-type"
                    value={maintForm.maintenance_type}
                    onChange={(e) => setMaintForm({ ...maintForm, maintenance_type: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, background: '#fff' }}
                  >
                    <option value="preventive">Preventive Maintenance (PM)</option>
                    <option value="corrective">Corrective Repair</option>
                    <option value="calibration">Calibration Overhaul</option>
                    <option value="inspection">Safety & Electrical Inspection</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Service Provider / Vendor</label>
                  <input
                    id="input-maint-vendor"
                    type="text"
                    placeholder="e.g. Sysmex Authorized Care"
                    value={maintForm.performed_by_vendor}
                    onChange={(e) => setMaintForm({ ...maintForm, performed_by_vendor: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Completed Date</label>
                  <input
                    id="input-maint-completed-date"
                    type="date"
                    value={maintForm.completed_date}
                    onChange={(e) => setMaintForm({ ...maintForm, completed_date: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Next Scheduled Due</label>
                  <input
                    id="input-maint-next-due"
                    type="date"
                    value={maintForm.next_due_date}
                    onChange={(e) => setMaintForm({ ...maintForm, next_due_date: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Service Cost (₹)</label>
                  <input
                    id="input-maint-cost"
                    type="number"
                    placeholder="e.g. 12000"
                    value={maintForm.service_cost}
                    onChange={(e) => setMaintForm({ ...maintForm, service_cost: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Downtime (Hours)</label>
                  <input
                    id="input-maint-downtime"
                    type="number"
                    step="0.5"
                    value={maintForm.downtime_hours}
                    onChange={(e) => setMaintForm({ ...maintForm, downtime_hours: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Work Summary & Parts Replaced</label>
                <textarea
                  id="input-maint-summary"
                  rows={3}
                  placeholder="Replaced peristaltic tubing, cleaned optical flow cells, ran 10-point precision checks."
                  value={maintForm.work_summary}
                  onChange={(e) => setMaintForm({ ...maintForm, work_summary: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => setShowMaintModal(false)}
                  style={{ padding: '10px 18px', background: '#f1f5f9', border: 'none', borderRadius: 8, color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-maint"
                  type="submit"
                  disabled={submittingMaint}
                  style={{ padding: '10px 20px', background: '#4f46e5', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  {submittingMaint ? 'Logging...' : 'Save Maintenance Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
