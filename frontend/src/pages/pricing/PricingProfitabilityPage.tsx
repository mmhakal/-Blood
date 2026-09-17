import React, { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, Calculator, ShieldCheck, Tag, Plus,
  RefreshCw, Percent, ArrowUpRight, BarChart3, AlertTriangle, Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface PricingRule {
  id: string;
  rule_name: string;
  client_type: string;
  scope_type: string;
  adjustment_type: string;
  adjustment_value: number;
  floor_price_inr?: number;
  priority: number;
  is_active: number | boolean;
}

interface TestProfitability {
  test_id: string;
  test_name: string;
  test_code: string;
  base_price: number;
  reagent_cost: number;
  consumable_cost: number;
  labor_cost: number;
  total_direct_cost: number;
  gross_profit: number;
  margin_percentage: number;
  annual_volume: number;
  total_annual_profit: number;
}

export const PricingProfitabilityPage: React.FC = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'rules' | 'calculator' | 'profitability'>('calculator');
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [profitability, setProfitability] = useState<TestProfitability[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Calculator State
  const [calcParams, setCalcParams] = useState({
    test_id: 'test-cbc',
    client_type: 'corporate',
    base_price: 450,
    corporate_id: '',
    doctor_id: ''
  });
  const [calcResult, setCalcResult] = useState<any>(null);

  // New Rule Modal State
  const [showRuleModal, setShowRuleModal] = useState<boolean>(false);
  const [newRule, setNewRule] = useState({
    rule_name: '',
    client_type: 'corporate',
    scope_type: 'global',
    adjustment_type: 'percentage_discount',
    adjustment_value: 20,
    floor_price_inr: 250,
    priority: 10
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rRes, pRes] = await Promise.all([
        fetch('/api/pricing-engine/rules', { credentials: 'omit', headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/pricing-engine/test-profitability', { credentials: 'omit', headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (rRes.ok) setRules(await rRes.json());
      if (pRes.ok) {
        const pData = await pRes.json();
        setProfitability(pData);
        if (pData.length > 0 && calcParams.test_id === 'test-cbc') {
          setCalcParams(prev => ({ ...prev, test_id: pData[0].test_id, base_price: pData[0].base_price }));
        }
      }
    } catch (err) {
      console.error('Failed to load pricing and profitability state', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleCalculatePrice = async () => {
    try {
      const res = await fetch('/api/pricing-engine/calculate', {
        method: 'POST',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          test_id: calcParams.test_id,
          client_type: calcParams.client_type,
          base_price: calcParams.base_price,
          corporate_id: calcParams.corporate_id || undefined,
          doctor_id: calcParams.doctor_id || undefined
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCalcResult(data);
      }
    } catch (err) {
      console.error('Error computing dynamic pricing', err);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/pricing-engine/rules', {
        method: 'POST',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newRule)
      });
      if (res.ok) {
        setShowRuleModal(false);
        setNewRule({
          rule_name: '',
          client_type: 'corporate',
          scope_type: 'global',
          adjustment_type: 'percentage_discount',
          adjustment_value: 20,
          floor_price_inr: 250,
          priority: 10
        });
        fetchData();
      }
    } catch (err) {
      console.error('Error creating pricing rule', err);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ padding: '4px 8px', background: '#ecfdf5', color: '#047857', borderRadius: '4px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>
              PROFITABILITY & DYNAMIC PRICING ENGINE
            </span>
            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>• Floor Price Protection Enforced</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a' }}>Dynamic Pricing & Test Contribution BI</h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '2px' }}>
            Multi-tier contract pricing, real-time discount resolution, margin preservation, and test direct-cost profitability
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              background: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#334155'
            }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>

          <button
            onClick={() => setShowRuleModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#047857',
              color: '#fff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(4,120,87,0.3)'
            }}
          >
            <Plus size={16} />
            New Pricing Tier Rule
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', gap: '8px' }}>
        <button
          onClick={() => setActiveTab('calculator')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'calculator' ? '2px solid #047857' : '2px solid transparent',
            color: activeTab === 'calculator' ? '#047857' : '#64748b',
            background: 'transparent',
            cursor: 'pointer'
          }}
        >
          Dynamic Price Calculator
        </button>
        <button
          onClick={() => setActiveTab('profitability')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'profitability' ? '2px solid #047857' : '2px solid transparent',
            color: activeTab === 'profitability' ? '#047857' : '#64748b',
            background: 'transparent',
            cursor: 'pointer'
          }}
        >
          Test Margin & Profitability BI ({profitability.length})
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'rules' ? '2px solid #047857' : '2px solid transparent',
            color: activeTab === 'rules' ? '#047857' : '#64748b',
            background: 'transparent',
            cursor: 'pointer'
          }}
        >
          Active Pricing Tier Rules ({rules.length})
        </button>
      </div>

      {/* Tab: Price Calculator */}
      {activeTab === 'calculator' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>Interactive Price Simulation</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              Evaluate dynamic discounts across branch locations, corporate contracts, and doctor tie-ups.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Select Diagnostic Test</label>
                <select
                  value={calcParams.test_id}
                  onChange={e => {
                    const sel = profitability.find(p => p.test_id === e.target.value);
                    setCalcParams({
                      ...calcParams,
                      test_id: e.target.value,
                      base_price: sel ? sel.base_price : calcParams.base_price
                    });
                  }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                >
                  {profitability.map(p => (
                    <option key={p.test_id} value={p.test_id}>{p.test_name} ({p.test_code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Customer Channel / Tier</label>
                <select
                  value={calcParams.client_type}
                  onChange={e => setCalcParams({ ...calcParams, client_type: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                >
                  <option value="walkin">Walk-in Direct Patient</option>
                  <option value="corporate">Corporate B2B Contract</option>
                  <option value="doctor_partner">Referring Doctor Partner</option>
                  <option value="branch">Branch Transfer Rate</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>List Base Price (₹)</label>
              <input
                type="number"
                value={calcParams.base_price}
                onChange={e => setCalcParams({ ...calcParams, base_price: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <button
              onClick={handleCalculatePrice}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                background: '#047857',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              <Calculator size={16} />
              Calculate Net Billed Price
            </button>
          </div>

          {/* Price Calculation Receipt Card */}
          <div style={{ background: '#0f172a', borderRadius: '12px', padding: '24px', color: '#fff' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#38bdf8', marginBottom: '16px' }}>
              Dynamic Pricing Resolution Trace
            </h4>

            {calcResult ? (
              <div>
                <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>FINAL NET BILLABLE AMOUNT</div>
                <div style={{ fontSize: '42px', fontWeight: 900, color: '#fff', margin: '4px 0 16px' }}>
                  ₹{calcResult.final_price?.toLocaleString('en-IN')}
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                    <span>Catalog List Price:</span>
                    <span>₹{calcResult.base_price?.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f87171' }}>
                    <span>Applied Discount:</span>
                    <span>- ₹{calcResult.discount_amount?.toLocaleString('en-IN')} ({calcResult.discount_percent || 0}%)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34d399' }}>
                    <span>Floor Price Guard:</span>
                    <span>₹{calcResult.floor_price?.toLocaleString('en-IN')} (Enforced)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#93c5fd' }}>
                    <span>Applied Rule:</span>
                    <span>{calcResult.matched_rule_name || 'Standard Tier Discount'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: '#64748b', fontSize: '13px', marginTop: '30px', textAlign: 'center' }}>
                Select test parameters and click "Calculate Net Billed Price" to inspect price resolution.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Test Contribution & Profitability BI */}
      {activeTab === 'profitability' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px' }}>Test Details</th>
                <th style={{ padding: '12px 16px' }}>List Price</th>
                <th style={{ padding: '12px 16px' }}>Reagent Cost</th>
                <th style={{ padding: '12px 16px' }}>Consumables & Labor</th>
                <th style={{ padding: '12px 16px' }}>Total Direct Cost</th>
                <th style={{ padding: '12px 16px' }}>Gross Margin (%)</th>
                <th style={{ padding: '12px 16px' }}>Gross Profit</th>
              </tr>
            </thead>
            <tbody>
              {profitability.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                    Loading profitability data...
                  </td>
                </tr>
              ) : (
                profitability.map(p => (
                  <tr key={p.test_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.test_name}</div>
                      <div style={{ color: '#64748b', fontSize: '11px', fontFamily: 'monospace' }}>{p.test_code}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>₹{p.base_price}</td>
                    <td style={{ padding: '12px 16px', color: '#dc2626' }}>₹{p.reagent_cost}</td>
                    <td style={{ padding: '12px 16px', color: '#dc2626' }}>₹{p.consumable_cost + p.labor_cost}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#dc2626' }}>₹{p.total_direct_cost}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: p.margin_percentage >= 70 ? '#ecfdf5' : '#eff6ff',
                        color: p.margin_percentage >= 70 ? '#047857' : '#1d4ed8'
                      }}>
                        {p.margin_percentage}%
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#047857' }}>
                      ₹{p.gross_profit}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Dynamic Pricing Rules */}
      {activeTab === 'rules' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
          {rules.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
              No tiered pricing rules registered yet.
            </div>
          ) : (
            rules.map(r => (
              <div key={r.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{r.rule_name}</h4>
                  <span style={{ background: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                    Active
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                  Tier: <strong style={{ color: '#0284c7', textTransform: 'capitalize' }}>{r.client_type.replace('_', ' ')}</strong>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', fontSize: '12px', color: '#334155', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Discount / Adjustment: <strong>{r.adjustment_value}%</strong></span>
                  <span>Floor Limit: <strong>₹{r.floor_price_inr || 0}</strong></span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal: New Pricing Rule */}
      {showRuleModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999
        }}>
          <div style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '500px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Create Pricing Tier Rule</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              Enforce volume discounts, partner commissions, and floor price protection.
            </p>

            <form onSubmit={handleCreateRule}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Rule Name *</label>
                <input
                  type="text"
                  required
                  value={newRule.rule_name}
                  onChange={e => setNewRule({ ...newRule, rule_name: e.target.value })}
                  placeholder="e.g. Standard Corporate Wellness 20% Discount"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Channel / Tier</label>
                  <select
                    value={newRule.client_type}
                    onChange={e => setNewRule({ ...newRule, client_type: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                  >
                    <option value="corporate">Corporate Client</option>
                    <option value="doctor_partner">Doctor Partner</option>
                    <option value="branch">Branch Internal</option>
                    <option value="walkin">Walk-in Special</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Discount (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newRule.adjustment_value}
                    onChange={e => setNewRule({ ...newRule, adjustment_value: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Floor Limit (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={newRule.floor_price_inr}
                    onChange={e => setNewRule({ ...newRule, floor_price_inr: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Priority (0-100)</label>
                  <input
                    type="number"
                    value={newRule.priority}
                    onChange={e => setNewRule({ ...newRule, priority: parseInt(e.target.value) || 10 })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '6px', background: '#047857', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Save Tier Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingProfitabilityPage;
