import React, { useState, useEffect } from 'react';
import {
  Sliders, Activity, CheckCircle2, AlertTriangle, Plus, RefreshCw,
  Search, Calculator, GitFork, ShieldCheck, Zap, X, Check, FileText, ArrowRight
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export const LISRulesManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'delta' | 'autovalidate' | 'reflex' | 'formulas'>('delta');
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<any[]>([]);
  const { error, success } = useNotification();

  // Rule Lists
  const [deltaRules, setDeltaRules] = useState<any[]>([]);
  const [autoValRules, setAutoValRules] = useState<any[]>([]);
  const [reflexRules, setReflexRules] = useState<any[]>([]);
  const [formulas, setFormulas] = useState<any[]>([]);

  // Modals
  const [showDeltaModal, setShowDeltaModal] = useState(false);
  const [deltaForm, setDeltaForm] = useState({
    test_id: '',
    parameter_id: '',
    max_percent_change: '25',
    max_absolute_change: '',
    lookback_days: '30',
    action: 'flag'
  });

  const [showAutoValModal, setShowAutoValModal] = useState(false);
  const [autoValForm, setAutoValForm] = useState({
    test_id: '',
    department: 'Hematology',
    allow_auto_validate: true,
    require_in_range: true,
    require_qc_pass: true,
    require_no_delta: true
  });

  const [showReflexModal, setShowReflexModal] = useState(false);
  const [reflexForm, setReflexForm] = useState({
    trigger_test_id: '',
    trigger_parameter_id: '',
    condition_operator: '>',
    threshold_low: '',
    threshold_high: '5.0',
    reflex_test_id: '',
    auto_order: true
  });

  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [formulaForm, setFormulaForm] = useState({
    test_id: '',
    target_parameter_id: '',
    formula_name: '',
    formula_expression: '',
    formula_variables: '{"TC": "param-tc", "HDL": "param-hdl", "TG": "param-tg"}',
    decimal_precision: 2
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAllRules();
  }, []);

  const loadAllRules = async () => {
    setLoading(true);
    try {
      const [testsRes, dRes, avRes, refRes, formRes] = await Promise.all([
        api.get('/tests').catch(() => []),
        api.get('/lis-rules/delta-check').catch(() => []),
        api.get('/lis-rules/auto-validation').catch(() => []),
        api.get('/lis-rules/reflex-tests').catch(() => []),
        api.get('/lis-rules/formulas').catch(() => [])
      ]);
      setTests(testsRes || []);
      setDeltaRules(dRes || []);
      setAutoValRules(avRes || []);
      setReflexRules(refRes || []);
      setFormulas(formRes || []);

      if (testsRes?.length > 0) {
        if (!deltaForm.test_id) setDeltaForm(prev => ({ ...prev, test_id: testsRes[0].id }));
        if (!autoValForm.test_id) setAutoValForm(prev => ({ ...prev, test_id: testsRes[0].id }));
        if (!reflexForm.trigger_test_id) setReflexForm(prev => ({ ...prev, trigger_test_id: testsRes[0].id, reflex_test_id: testsRes[1]?.id || testsRes[0].id }));
        if (!formulaForm.test_id) setFormulaForm(prev => ({ ...prev, test_id: testsRes[0].id }));
      }
    } catch (err: any) {
      error(err.message || 'Failed to load LIS rules');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDelta = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/lis-rules/delta-check', {
        ...deltaForm,
        max_percent_change: deltaForm.max_percent_change ? parseFloat(deltaForm.max_percent_change) : null,
        max_absolute_change: deltaForm.max_absolute_change ? parseFloat(deltaForm.max_absolute_change) : null,
        lookback_days: parseInt(deltaForm.lookback_days || '30', 10)
      });
      success('Delta check rule configured successfully');
      setShowDeltaModal(false);
      loadAllRules();
    } catch (err: any) {
      error(err.message || 'Failed to save delta rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAutoVal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/lis-rules/auto-validation', autoValForm);
      success('Auto-validation rule saved');
      setShowAutoValModal(false);
      loadAllRules();
    } catch (err: any) {
      error(err.message || 'Failed to save auto-validation rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateReflex = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/lis-rules/reflex-tests', {
        ...reflexForm,
        threshold_low: reflexForm.threshold_low ? parseFloat(reflexForm.threshold_low) : null,
        threshold_high: reflexForm.threshold_high ? parseFloat(reflexForm.threshold_high) : null
      });
      success('Reflex test trigger created');
      setShowReflexModal(false);
      loadAllRules();
    } catch (err: any) {
      error(err.message || 'Failed to create reflex rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateFormula = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let vars = {};
      try {
        vars = JSON.parse(formulaForm.formula_variables);
      } catch {
        vars = {};
      }

      await api.post('/lis-rules/formulas', {
        ...formulaForm,
        formula_variables: vars,
        decimal_precision: parseInt(String(formulaForm.decimal_precision || 2), 10)
      });
      success('Clinical calculation formula registered');
      setShowFormulaModal(false);
      loadAllRules();
    } catch (err: any) {
      error(err.message || 'Failed to save formula');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ padding: 8, borderRadius: 8, background: '#fdf2f8', color: '#db2777' }}>
              <Sliders size={24} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Clinical Validation Rules Engine</h1>
          </div>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            Automated patient baseline delta checks, auto-verification criteria, reflex test triggers, and Friedewald/eGFR clinical formulas.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            id="btn-refresh-rules"
            onClick={loadAllRules}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, color: '#475569', cursor: 'pointer', fontWeight: 500 }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh Rules
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <button
          id="tab-rule-delta"
          onClick={() => setActiveTab('delta')}
          style={{
            padding: '12px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'delta' ? '2px solid #db2777' : '2px solid transparent',
            color: activeTab === 'delta' ? '#db2777' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Activity size={16} /> Delta Checks ({deltaRules.length})
        </button>
        <button
          id="tab-rule-autovalidate"
          onClick={() => setActiveTab('autovalidate')}
          style={{
            padding: '12px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'autovalidate' ? '2px solid #db2777' : '2px solid transparent',
            color: activeTab === 'autovalidate' ? '#db2777' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <ShieldCheck size={16} /> Auto-Validation ({autoValRules.length})
        </button>
        <button
          id="tab-rule-reflex"
          onClick={() => setActiveTab('reflex')}
          style={{
            padding: '12px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'reflex' ? '2px solid #db2777' : '2px solid transparent',
            color: activeTab === 'reflex' ? '#db2777' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <GitFork size={16} /> Reflex Testing ({reflexRules.length})
        </button>
        <button
          id="tab-rule-formulas"
          onClick={() => setActiveTab('formulas')}
          style={{
            padding: '12px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'formulas' ? '2px solid #db2777' : '2px solid transparent',
            color: activeTab === 'formulas' ? '#db2777' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <Calculator size={16} /> Calculation Formulas ({formulas.length})
        </button>
      </div>

      {/* TAB 1: DELTA CHECKS */}
      {activeTab === 'delta' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                Patient Historical Delta Checks
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                Compares new patient results with prior history within N days. Flags sudden shifts indicative of sample mix-up or acute clinical events.
              </p>
            </div>
            <button
              id="btn-add-delta-rule-open"
              onClick={() => setShowDeltaModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#db2777', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer' }}
            >
              <Plus size={16} /> Add Delta Rule
            </button>
          </div>

          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px' }}>Parameter Name</th>
                  <th style={{ padding: '12px 16px' }}>Test Parent</th>
                  <th style={{ padding: '12px 16px' }}>Max % Allowed Change</th>
                  <th style={{ padding: '12px 16px' }}>Max Absolute Change</th>
                  <th style={{ padding: '12px 16px' }}>Lookback Window</th>
                  <th style={{ padding: '12px 16px' }}>Enforcement Action</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {deltaRules.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      No delta check rules configured yet.
                    </td>
                  </tr>
                ) : (
                  deltaRules.map((rule) => (
                    <tr key={rule.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>
                        {rule.param_name}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#475569' }}>
                        {rule.test_name}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {rule.max_percent_change ? (
                          <span style={{ fontWeight: 700, color: '#db2777' }}>±{rule.max_percent_change}%</span>
                        ) : 'N/A'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#334155' }}>
                        {rule.max_absolute_change ? `±${rule.max_absolute_change} ${rule.unit || ''}` : 'N/A'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#475569' }}>
                        {rule.lookback_days || 30} Days
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', background: '#fee2e2', color: '#b91c1c' }}>
                          {rule.action || 'FLAG'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ color: '#16a34a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={14} /> Active
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: AUTO-VALIDATION */}
      {activeTab === 'autovalidate' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                Test Auto-Validation & Release Criteria
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                Results matching all normal boundaries, QC compliance, and clean delta checks bypass manual review queues.
              </p>
            </div>
            <button
              id="btn-add-autoval-rule-open"
              onClick={() => setShowAutoValModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#0284c7', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer' }}
            >
              <Plus size={16} /> Configure Auto-Validation
            </button>
          </div>

          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px' }}>Test Name</th>
                  <th style={{ padding: '12px 16px' }}>Department</th>
                  <th style={{ padding: '12px 16px' }}>Auto-Validation Enabled</th>
                  <th style={{ padding: '12px 16px' }}>Require In-Range</th>
                  <th style={{ padding: '12px 16px' }}>Require QC Pass</th>
                  <th style={{ padding: '12px 16px' }}>Require No Delta</th>
                </tr>
              </thead>
              <tbody>
                {autoValRules.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      No auto-validation rules configured.
                    </td>
                  </tr>
                ) : (
                  autoValRules.map((rule) => (
                    <tr key={rule.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>
                        {rule.test_name}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#475569' }}>
                        {rule.department || 'General Diagnostic'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: rule.allow_auto_validate ? '#dcfce7' : '#fee2e2', color: rule.allow_auto_validate ? '#15803d' : '#b91c1c' }}>
                          {rule.allow_auto_validate ? 'YES' : 'NO'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#334155' }}>
                        {rule.require_in_range ? '✓ Mandatory Normal' : 'Optional'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#334155' }}>
                        {rule.require_qc_pass ? '✓ Active Passing Lot' : 'Optional'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#334155' }}>
                        {rule.require_no_delta ? '✓ No Delta Flag' : 'Optional'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: REFLEX TESTING */}
      {activeTab === 'reflex' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                Conditional Reflex Testing Rules
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                Automatically orders follow-up confirmation or secondary diagnostic tests when primary results exceed threshold.
              </p>
            </div>
            <button
              id="btn-add-reflex-rule-open"
              onClick={() => setShowReflexModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#4f46e5', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer' }}
            >
              <Plus size={16} /> Add Reflex Rule
            </button>
          </div>

          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px' }}>Trigger Test & Parameter</th>
                  <th style={{ padding: '12px 16px' }}>Condition Operator</th>
                  <th style={{ padding: '12px 16px' }}>Threshold Limit</th>
                  <th style={{ padding: '12px 16px' }}>Reflex Target Test</th>
                  <th style={{ padding: '12px 16px' }}>Auto-Dispatch Order</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {reflexRules.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      No reflex testing triggers defined.
                    </td>
                  </tr>
                ) : (
                  reflexRules.map((rule) => (
                    <tr key={rule.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{rule.trigger_param_name}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>Test: {rule.trigger_test_name}</div>
                      </td>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#4f46e5' }}>
                        {rule.condition_operator}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0f172a' }}>
                        {rule.threshold_high || rule.threshold_low}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#15803d', fontWeight: 600 }}>
                          <ArrowRight size={14} />
                          <span>{rule.reflex_test_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: rule.auto_order ? '#dcfce7' : '#f1f5f9', color: rule.auto_order ? '#15803d' : '#475569' }}>
                          {rule.auto_order ? 'AUTO ORDER' : 'REQUIRE APPROVAL'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#16a34a', fontWeight: 600 }}>
                        Active
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CALCULATION FORMULAS */}
      {activeTab === 'formulas' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                Clinical Calculation Formulas
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                Evaluates secondary parameters dynamically when primary analytes are imported or entered.
              </p>
            </div>
            <button
              id="btn-add-formula-open"
              onClick={() => setShowFormulaModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#059669', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer' }}
            >
              <Plus size={16} /> Register Formula
            </button>
          </div>

          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px' }}>Formula Name</th>
                  <th style={{ padding: '12px 16px' }}>Calculated Target</th>
                  <th style={{ padding: '12px 16px' }}>Mathematical Expression</th>
                  <th style={{ padding: '12px 16px' }}>Precision</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {formulas.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      No calculation formulas registered.
                    </td>
                  </tr>
                ) : (
                  formulas.map((f) => (
                    <tr key={f.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>
                        {f.formula_name}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#059669' }}>{f.target_param_name}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>Test: {f.test_name}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <code style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 6, fontSize: 13, color: '#0f172a' }}>
                          {f.formula_expression}
                        </code>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#475569' }}>
                        {f.decimal_precision || 2} Decimals
                      </td>
                      <td style={{ padding: '14px 16px', color: '#16a34a', fontWeight: 600 }}>
                        Active
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: DELTA CHECK */}
      {showDeltaModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: '520px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1e293b' }}>New Delta Check Rule</h2>
              <button onClick={() => setShowDeltaModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateDelta} style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Parent Test *</label>
                <select
                  id="select-delta-test"
                  value={deltaForm.test_id}
                  onChange={(e) => setDeltaForm({ ...deltaForm, test_id: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, background: '#fff' }}
                >
                  {tests.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Parameter ID / Code *</label>
                <input
                  id="input-delta-param"
                  type="text"
                  required
                  placeholder="e.g. param-hgb or param-crea"
                  value={deltaForm.parameter_id}
                  onChange={(e) => setDeltaForm({ ...deltaForm, parameter_id: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Max % Shift</label>
                  <input
                    id="input-delta-pct"
                    type="number"
                    value={deltaForm.max_percent_change}
                    onChange={(e) => setDeltaForm({ ...deltaForm, max_percent_change: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Lookback (Days)</label>
                  <input
                    id="input-delta-lookback"
                    type="number"
                    value={deltaForm.lookback_days}
                    onChange={(e) => setDeltaForm({ ...deltaForm, lookback_days: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => setShowDeltaModal(false)}
                  style={{ padding: '10px 18px', background: '#f1f5f9', border: 'none', borderRadius: 8, color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-delta"
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '10px 20px', background: '#db2777', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  {submitting ? 'Saving...' : 'Save Delta Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FORMULA REGISTRATION */}
      {showFormulaModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: '560px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1e293b' }}>Register Clinical Formula</h2>
              <button onClick={() => setShowFormulaModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateFormula} style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Formula Name *</label>
                <input
                  id="input-formula-name"
                  type="text"
                  required
                  placeholder="e.g. Friedewald LDL or Albumin/Globulin Ratio"
                  value={formulaForm.formula_name}
                  onChange={(e) => setFormulaForm({ ...formulaForm, formula_name: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Target Test *</label>
                  <select
                    id="select-formula-test"
                    value={formulaForm.test_id}
                    onChange={(e) => setFormulaForm({ ...formulaForm, test_id: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, background: '#fff' }}
                  >
                    {tests.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Target Parameter ID *</label>
                  <input
                    id="input-formula-target-param"
                    type="text"
                    required
                    placeholder="e.g. param-ldl"
                    value={formulaForm.target_parameter_id}
                    onChange={(e) => setFormulaForm({ ...formulaForm, target_parameter_id: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Formula Mathematical Expression *
                </label>
                <input
                  id="input-formula-expr"
                  type="text"
                  required
                  placeholder="e.g. TC - HDL - (TG / 5)"
                  value={formulaForm.formula_expression}
                  onChange={(e) => setFormulaForm({ ...formulaForm, formula_expression: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Variable Mapping (JSON)
                </label>
                <textarea
                  id="input-formula-vars-json"
                  rows={2}
                  value={formulaForm.formula_variables}
                  onChange={(e) => setFormulaForm({ ...formulaForm, formula_variables: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => setShowFormulaModal(false)}
                  style={{ padding: '10px 18px', background: '#f1f5f9', border: 'none', borderRadius: 8, color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-formula"
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '10px 20px', background: '#059669', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  {submitting ? 'Saving...' : 'Register Formula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
