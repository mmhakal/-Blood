import React, { useState, useEffect } from 'react';
import {
  Boxes, AlertTriangle, Clock, ArrowDownLeft, ArrowUpRight,
  TrendingDown, Plus, RefreshCw, ShoppingCart, Truck, ShieldAlert
} from 'lucide-react';
import api from '../../services/api';
import { Link } from 'react-router-dom';

export const InventoryDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);
  const [expiryAlerts, setExpiryAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [dashData, lowData, expData] = await Promise.all([
        api.get('/inventory/dashboard'),
        api.get('/inventory/alerts/low-stock'),
        api.get('/inventory/alerts/expiry'),
      ]);
      setData(dashData);
      setLowStockAlerts(lowData);
      setExpiryAlerts(expData);
    } catch (err) {
      console.error('Failed to load inventory dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Laboratory Inventory & Consumables</h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>Reagent stock control, lot & batch expiry tracking, procurement and branch stock balancing</p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/inventory/items" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <Boxes size={16} />
            <span>Item Master Catalog</span>
          </Link>
          <Link to="/inventory/transactions" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <ShoppingCart size={16} />
            <span>Stock Entry / Issues</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ backgroundColor: '#fff', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Total Catalog Items</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Boxes size={18} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{data?.total_items || 0}</div>
          <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 500 }}>Active reagents & consumables</span>
        </div>

        <div style={{ backgroundColor: '#fff', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Stock Valuation</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart size={18} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>₹{(data?.stock_valuation || 0).toLocaleString()}</div>
          <span style={{ fontSize: 11, color: '#059669', fontWeight: 500 }}>Total asset value in inventory</span>
        </div>

        <div style={{ backgroundColor: '#fff', padding: 18, borderRadius: 12, border: '1px solid #fed7aa', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#c2410c' }}>Low Stock Warnings</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#ea580c' }}>{lowStockAlerts.length}</div>
          <span style={{ fontSize: 11, color: '#ea580c', fontWeight: 500 }}>Below minimum reorder level</span>
        </div>

        <div style={{ backgroundColor: '#fff', padding: 18, borderRadius: 12, border: '1px solid #fecaca', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#991b1b' }}>Near-Expiry / Expired Lots</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>{expiryAlerts.length}</div>
          <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 500 }}>Batches within 60 days or expired</span>
        </div>
      </div>

      {/* Quick Links Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <Link to="/inventory/items" style={{ textDecoration: 'none' }}>
          <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: '#eff6ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Boxes size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Item Master Catalog</h3>
                <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>Reagents, tubes, kits & controls</p>
              </div>
            </div>
          </div>
        </Link>

        <Link to="/inventory/transactions" style={{ textDecoration: 'none' }}>
          <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowDownLeft size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Stock Purchase & Usage</h3>
                <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>Receive batches & record consumption</p>
              </div>
            </div>
          </div>
        </Link>

        <Link to="/inventory/transfers" style={{ textDecoration: 'none' }}>
          <div style={{ backgroundColor: '#fff', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Truck size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Inter-Branch Transfers</h3>
                <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>Move supplies between lab facilities</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Two Column: Critical Inventory Alerts & Recent Movements */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Left Column: Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Low Stock Alerts */}
          <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #fed7aa', padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <AlertTriangle size={18} color="#ea580c" />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#9a3412', margin: 0 }}>Low Stock Reorder Triggers</h3>
            </div>

            {lowStockAlerts.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: '#16a34a', fontSize: 13 }}>
                All inventory items are currently above their safety thresholds.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lowStockAlerts.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#fff7ed', borderRadius: 8, border: '1px solid #ffedd5', fontSize: 12 }}>
                    <div>
                      <strong style={{ color: '#0f172a' }}>{item.name}</strong>
                      <div style={{ color: '#64748b' }}>Code: {item.code} • Min: {item.min_stock} {item.unit}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#ea580c', color: '#fff', fontWeight: 700 }}>
                        {item.current_stock || 0} {item.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expiry Alerts */}
          <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #fecaca', padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <ShieldAlert size={18} color="#dc2626" />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#991b1b', margin: 0 }}>Expiring Reagent Batches</h3>
            </div>

            {expiryAlerts.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: '#16a34a', fontSize: 13 }}>
                No batches are close to or past expiration dates.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {expiryAlerts.map((b) => (
                  <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#fef2f2', borderRadius: 8, border: '1px solid #fee2e2', fontSize: 12 }}>
                    <div>
                      <strong style={{ color: '#0f172a' }}>{b.item_name}</strong>
                      <div style={{ color: '#64748b' }}>Lot: {b.batch_number} • Qty: {b.quantity}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#dc2626', color: '#fff', fontWeight: 700 }}>
                        Expires: {new Date(b.expiry_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Stock Movements */}
        <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 18 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Recent Inventory Transactions</h3>
          {data?.recent_transactions?.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No transactions recorded yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data?.recent_transactions?.map((t: any) => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9', fontSize: 13 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        padding: '1px 6px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        backgroundColor: t.transaction_type === 'purchase' ? '#ecfdf5' : '#fef2f2',
                        color: t.transaction_type === 'purchase' ? '#059669' : '#dc2626'
                      }}>
                        {t.transaction_type?.toUpperCase()}
                      </span>
                      <strong style={{ color: '#0f172a' }}>{t.item_name}</strong>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{t.notes || 'Routine stock activity'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: t.transaction_type === 'purchase' ? '#059669' : '#dc2626' }}>
                      {t.transaction_type === 'purchase' ? `+${t.quantity}` : `-${t.quantity}`}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(t.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
