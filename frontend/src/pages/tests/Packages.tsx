import React, { useState, useEffect } from 'react';
import {
  Package, Plus, CheckCircle2, TestTubes, Edit2,
  Calendar, Check, AlertCircle, Percent, DollarSign
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export const Packages: React.FC = () => {
  const [packages, setPackages] = useState<any[]>([]);
  const [availableTests, setAvailableTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any>(null);

  // Form
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number | ''>(999);
  const [validityDays, setValidityDays] = useState(365);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);

  const { error, success } = useNotification();

  const loadData = async () => {
    try {
      setLoading(true);
      const [pkgRes, testsRes] = await Promise.all([
        api.get('/tests/packages'),
        api.get('/tests')
      ]);
      setPackages(pkgRes);
      setAvailableTests(testsRes);
    } catch (e: any) {
      error(e.message || 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingPackage(null);
    setName('');
    setCode('');
    setDescription('');
    setPrice(999);
    setValidityDays(365);
    setSelectedTestIds(availableTests.slice(0, 2).map(t => t.id));
    setShowModal(true);
  };

  const openEditModal = (pkg: any) => {
    setEditingPackage(pkg);
    setName(pkg.name);
    setCode(pkg.code);
    setDescription(pkg.description || '');
    setPrice(pkg.price);
    setValidityDays(pkg.validity_days || 365);
    setSelectedTestIds(pkg.tests?.map((t: any) => t.id) || []);
    setShowModal(true);
  };

  const toggleTestSelection = (testId: string) => {
    if (selectedTestIds.includes(testId)) {
      setSelectedTestIds(selectedTestIds.filter(id => id !== testId));
    } else {
      setSelectedTestIds([...selectedTestIds, testId]);
    }
  };

  // Calculate sum of individual tests
  const individualSum = selectedTestIds.reduce((sum, id) => {
    const t = availableTests.find(item => item.id === id);
    return sum + (t?.base_price || 0);
  }, 0);

  const discountPercent = individualSum > 0 && typeof price === 'number' && price < individualSum
    ? Math.round(((individualSum - price) / individualSum) * 100)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTestIds.length === 0) {
      error('Please select at least one diagnostic test for this package');
      return;
    }

    try {
      const payload = {
        name,
        code: code.toUpperCase(),
        description,
        price: parseFloat(String(price)),
        discount_percentage: discountPercent,
        validity_days: validityDays,
        test_ids: selectedTestIds
      };

      if (editingPackage) {
        await api.put(`/tests/packages/${editingPackage.id}`, payload);
        success(`Package '${name}' updated successfully`);
      } else {
        await api.post('/tests/packages', payload);
        success(`Package '${name}' created successfully`);
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to save package');
    }
  };

  const handleToggleStatus = async (pkg: any) => {
    const newStatus = pkg.status === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/tests/packages/${pkg.id}/status`, { status: newStatus });
      success(`Package status changed to ${newStatus}`);
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to toggle package status');
    }
  };

  return (
    <div>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Diagnostic Health Packages</h1>
          <p style={{ fontSize: 13.5, color: '#64748b' }}>
            Pre-bundled multi-test diagnostic panels offering discounted patient pricing and multi-department evaluations.
          </p>
        </div>
        <button onClick={openCreateModal} className="btn btn-primary">
          <Plus size={16} />
          <span>Create New Package</span>
        </button>
      </div>

      {/* Package Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {loading ? (
          <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: 40, color: '#64748b' }}>
            Loading packages...
          </div>
        ) : packages.length === 0 ? (
          <div className="card" style={{ gridColumn: 'span 3', textAlign: 'center', padding: 40, color: '#64748b' }}>
            No health packages created yet. Click "Create New Package" to bundle tests.
          </div>
        ) : (
          packages.map((pkg) => {
            const indTotal = pkg.total_base_price || pkg.tests?.reduce((sum: number, t: any) => sum + (t.base_price || 0), 0) || pkg.price;
            const savings = Math.max(0, indTotal - pkg.price);
            const savingsPct = indTotal > 0 ? Math.round((savings / indTotal) * 100) : 0;

            return (
              <div key={pkg.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <span className="badge badge-primary" style={{ marginBottom: 6 }}>{pkg.code}</span>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{pkg.name}</h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#0284c7' }}>
                      ₹{pkg.price}
                    </div>
                    {indTotal > pkg.price && (
                      <div style={{ fontSize: 11, color: '#94a3b8', textDecoration: 'line-through' }}>
                        ₹{indTotal}
                      </div>
                    )}
                  </div>
                </div>

                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, marginBottom: 14 }}>
                  {pkg.description || 'Routine multi-parameter health package'}
                </p>

                {savingsPct > 0 && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', backgroundColor: '#ecfdf5',
                    borderRadius: 4, color: '#059669', fontSize: 12, fontWeight: 700, marginBottom: 14
                  }}>
                    <span>Save {savingsPct}% (Save ₹{savings})</span>
                  </div>
                )}

                {/* Included Tests */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, flex: 1, marginBottom: 16 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#334155', marginBottom: 8, textTransform: 'uppercase' }}>
                    Bundled Diagnostic Tests ({pkg.tests?.length || 0})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {pkg.tests?.map((t: any) => (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CheckCircle2 size={13} color="#10b981" />
                          <span>{t.name}</span>
                        </div>
                        <span style={{ fontSize: 11, color: '#64748b' }}>₹{t.base_price}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                  <span className={`badge badge-${pkg.status === 'active' ? 'success' : 'normal'}`}>
                    {pkg.status}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEditModal(pkg)} className="btn btn-outline btn-sm">
                      <Edit2 size={13} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleToggleStatus(pkg)}
                      className={`btn btn-sm ${pkg.status === 'active' ? 'btn-outline' : 'btn-primary'}`}
                      style={{ fontSize: 11, padding: '3px 8px' }}
                    >
                      {pkg.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingPackage ? 'Edit Diagnostic Package' : 'Create New Health Package'}</h2>
              <button onClick={() => setShowModal(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Package Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="form-input"
                      placeholder="e.g. Executive Full Body Checkup"
                    />
                  </div>
                  <div>
                    <label className="form-label">Package Code *</label>
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      className="form-input"
                      placeholder="e.g. FULL_BODY_CHK"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Package Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="form-input"
                    placeholder="Brief description of included clinical panels"
                  />
                </div>

                {/* Test Selection Checkbox List */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Select Bundled Tests ({selectedTestIds.length} chosen)</label>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Individual Sum: <strong>₹{individualSum}</strong></span>
                  </div>
                  <div style={{
                    maxHeight: 180, overflowY: 'auto', border: '1px solid #e2e8f0',
                    borderRadius: 6, padding: 8, display: 'flex', flexDirection: 'column', gap: 6,
                    backgroundColor: '#f8fafc'
                  }}>
                    {availableTests.map((t) => {
                      const isChecked = selectedTestIds.includes(t.id);
                      return (
                        <div
                          key={t.id}
                          onClick={() => toggleTestSelection(t.id)}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '6px 10px', backgroundColor: isChecked ? '#e0f2fe' : '#ffffff',
                            borderRadius: 4, cursor: 'pointer', border: isChecked ? '1px solid #7dd3fc' : '1px solid #f1f5f9'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              style={{ cursor: 'pointer' }}
                            />
                            <strong>{t.name}</strong>
                            <span style={{ fontSize: 11, color: '#64748b' }}>({t.code})</span>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#0369a1' }}>₹{t.base_price}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pricing & Discount Controls */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Package Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Calculated Discount (%)</label>
                    <input
                      type="text"
                      readOnly
                      value={`${discountPercent}%`}
                      className="form-input"
                      style={{ backgroundColor: '#f1f5f9', fontWeight: 700, color: '#059669' }}
                    />
                  </div>
                  <div>
                    <label className="form-label">Validity (Days)</label>
                    <input
                      type="number"
                      value={validityDays}
                      onChange={(e) => setValidityDays(parseInt(e.target.value, 10) || 365)}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingPackage ? 'Update Package' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
