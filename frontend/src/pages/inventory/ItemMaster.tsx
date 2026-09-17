import React, { useState, useEffect } from 'react';
import { Plus, Search, Boxes, Filter, X, Edit, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import api from '../../services/api';

export const ItemMaster: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category_id: '',
    unit: 'Pieces',
    min_stock: '10',
    max_stock: '100',
    purchase_price: '0.00',
    storage_condition: '2-8°C Refrigerated',
    supplier_id: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadItems();
  }, [selectedCategory]);

  const loadItems = async () => {
    setLoading(true);
    try {
      let endpoint = '/inventory/items?';
      if (selectedCategory) endpoint += `category_id=${selectedCategory}&`;

      const [itemRes, catRes, suppRes] = await Promise.all([
        api.get(endpoint),
        api.get('/inventory/categories'),
        api.get('/inventory/suppliers'),
      ]);

      setItems(itemRes);
      setCategories(catRes);
      setSuppliers(suppRes);
      if (catRes?.length > 0 && !formData.category_id) {
        setFormData(prev => ({ ...prev, category_id: catRes[0].id }));
      }
    } catch (err) {
      console.error('Failed to load items', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) return;

    setSubmitting(true);
    try {
      await api.post('/inventory/items', {
        ...formData,
        min_stock: parseInt(formData.min_stock) || 0,
        max_stock: parseInt(formData.max_stock) || 0,
        purchase_price: parseFloat(formData.purchase_price) || 0,
      });
      setShowModal(false);
      setFormData({
        code: '',
        name: '',
        category_id: categories[0]?.id || '',
        unit: 'Pieces',
        min_stock: '10',
        max_stock: '100',
        purchase_price: '0.00',
        storage_condition: '2-8°C Refrigerated',
        supplier_id: '',
      });
      loadItems();
    } catch (err: any) {
      alert('Failed to register inventory item: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = items.filter(i =>
    (i.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.code || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Inventory Item Master Catalog</h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>Maintain diagnostic reagents, vacutainer tubes, rapid kits, calibrators and control vials</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={16} />
          <span>New Catalog Item</span>
        </button>
      </div>

      {/* Filter Row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', backgroundColor: '#fff', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 20, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search items by code or descriptive name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, backgroundColor: '#fff' }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <span style={{ fontSize: 13, color: '#64748b', marginLeft: 'auto' }}>
          {filtered.length} Items Listed
        </span>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading item catalog...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No inventory items found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 14px' }}>Item Code</th>
                  <th style={{ padding: '12px 14px' }}>Item Name</th>
                  <th style={{ padding: '12px 14px' }}>Category</th>
                  <th style={{ padding: '12px 14px' }}>Unit</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Current Stock</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Min / Max Threshold</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Cost (₹)</th>
                  <th style={{ padding: '12px 14px' }}>Storage</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const stock = item.current_stock || 0;
                  const isLow = stock <= (item.min_stock || 0);
                  const isOut = stock === 0;

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0284c7' }}>{item.code}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.name}</div>
                        {item.supplier_name && <div style={{ fontSize: 11, color: '#64748b' }}>Vendor: {item.supplier_name}</div>}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#475569' }}>{item.category_name || 'General'}</td>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>{item.unit}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: isOut ? '#dc2626' : isLow ? '#ea580c' : '#059669' }}>
                        {stock} {item.unit}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#64748b' }}>
                        {item.min_stock} / {item.max_stock}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600 }}>
                        ₹{Number(item.purchase_price).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748b', fontSize: 12 }}>
                        {item.storage_condition || 'Ambient'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: isOut ? '#fee2e2' : isLow ? '#fff7ed' : '#ecfdf5',
                          color: isOut ? '#dc2626' : isLow ? '#ea580c' : '#059669'
                        }}>
                          {isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Item Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{
            width: '100%',
            maxWidth: 540,
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 24,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Register Inventory Item</h2>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>SKU / Item Code</label>
                  <input
                    type="text"
                    placeholder="e.g. TUB-EDTA-4ML"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Item Name</label>
                  <input
                    type="text"
                    placeholder="e.g. K2-EDTA Lavender Cap Tubes (100s)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Unit of Measurement</label>
                  <input
                    type="text"
                    placeholder="e.g. Pack (100) or Kit or Vials"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Min Safety Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_stock}
                    onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Max Stock Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_stock}
                    onChange={(e) => setFormData({ ...formData, max_stock: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Cost Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Storage Condition</label>
                  <select
                    value={formData.storage_condition}
                    onChange={(e) => setFormData({ ...formData, storage_condition: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  >
                    <option value="2-8°C Refrigerated">2-8°C Refrigerated</option>
                    <option value="15-25°C Room Temperature">15-25°C Room Temperature</option>
                    <option value="-20°C Frozen">-20°C Frozen</option>
                    <option value="Protect from Light">Protect from Light</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Preferred Supplier</label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  >
                    <option value="">None / Open Market</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ padding: '8px 18px', fontSize: 13 }}
                >
                  {submitting ? 'Saving...' : 'Add Item to Master'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
