import React, { useState, useEffect } from 'react';
import {
  Cpu, Sliders, Play, CheckCircle2, AlertTriangle, Plus, RefreshCw,
  Clock, ArrowRight, Zap, Shield, FileText, Check, X, Terminal, Filter
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger_event: string;
  conditions_json: string;
  actions_json: string;
  is_active: number | boolean;
  execution_count: number;
  last_executed_at?: string;
  created_at: string;
}

interface ScheduledJob {
  id: string;
  job_name: string;
  job_type: string;
  cron_schedule: string;
  timezone: string;
  recipient_emails?: string;
  delivery_channel: string;
  is_active: number | boolean;
  last_run_at?: string;
  next_run_at?: string;
}

interface ExecutionLog {
  id: string;
  rule_id: string;
  rule_name: string;
  trigger_event: string;
  entity_id: string;
  condition_matched: number | boolean;
  actions_taken_json: string;
  status: string;
  executed_at: string;
}

export const AutomationEnginePage: React.FC = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'rules' | 'jobs' | 'simulator' | 'history'>('rules');
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [executions, setExecutions] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // New Rule Modal State
  const [showRuleModal, setShowRuleModal] = useState<boolean>(false);
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    trigger_event: 'CRITICAL_VALUE_REPORTED',
    conditionField: 'value',
    conditionOperator: '>',
    conditionValue: '200',
    actionType: 'CREATE_TASK',
    actionDepartment: 'hematology',
    actionPriority: 'critical',
    actionTitle: 'Follow up immediately on critical panic value'
  });

  // Simulator State
  const [simRuleId, setSimRuleId] = useState<string>('');
  const [simPayload, setSimPayload] = useState<string>(
    JSON.stringify({ value: 245, parameter_code: 'GLU_R', panic_flag: true, department: 'biochemistry' }, null, 2)
  );
  const [simResult, setSimResult] = useState<any>(null);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const [rulesRes, jobsRes, execRes] = await Promise.all([
        fetch('/api/automation/rules', { credentials: 'omit', headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/automation/scheduled-jobs', { credentials: 'omit', headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/automation/executions', { credentials: 'omit', headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (rulesRes.ok) {
        const rData = await rulesRes.json();
        setRules(rData);
        if (rData.length > 0 && !simRuleId) {
          setSimRuleId(rData[0].id);
        }
      }
      if (jobsRes.ok) setJobs(await jobsRes.json());
      if (execRes.ok) setExecutions(await execRes.json());
    } catch (err) {
      console.error('Failed to load automation engine state', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [token]);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: newRule.name,
        description: newRule.description,
        trigger_event: newRule.trigger_event,
        conditions: [
          {
            field: newRule.conditionField,
            operator: newRule.conditionOperator,
            value: isNaN(Number(newRule.conditionValue)) ? newRule.conditionValue : Number(newRule.conditionValue)
          }
        ],
        actions: [
          {
            action_type: newRule.actionType,
            params: {
              title: newRule.actionTitle,
              department: newRule.actionDepartment,
              priority: newRule.actionPriority,
              sla_hours: 4
            }
          }
        ],
        is_active: true
      };

      const res = await fetch('/api/automation/rules', {
        method: 'POST',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowRuleModal(false);
        setNewRule({
          name: '',
          description: '',
          trigger_event: 'CRITICAL_VALUE_REPORTED',
          conditionField: 'value',
          conditionOperator: '>',
          conditionValue: '200',
          actionType: 'CREATE_TASK',
          actionDepartment: 'hematology',
          actionPriority: 'critical',
          actionTitle: 'Follow up immediately on critical panic value'
        });
        fetchRules();
      }
    } catch (err) {
      console.error('Failed to create automation rule', err);
    }
  };

  const handleRunSimulator = async () => {
    if (!simRuleId) return;
    try {
      const parsedContext = JSON.parse(simPayload);
      const res = await fetch(`/api/automation/rules/${simRuleId}/test`, {
        method: 'POST',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ context: parsedContext })
      });
      if (res.ok) {
        const data = await res.json();
        setSimResult(data);
      }
    } catch (err: any) {
      setSimResult({ error: `JSON Parse error or request error: ${err.message}` });
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ padding: '4px 8px', background: '#fdf4ff', color: '#a21caf', borderRadius: '4px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>
              ECA ENGINE (EVENT-CONDITION-ACTION)
            </span>
            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>• Active Automation Orchestrator</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a' }}>No-Code / Low-Code Automation Engine</h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '2px' }}>
            Build responsive operational workflows, scheduled cron digests, and automated safety triggers
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchRules}
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
              background: '#a21caf',
              color: '#fff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(162,28,175,0.3)'
            }}
          >
            <Plus size={16} />
            New ECA Rule
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', gap: '8px' }}>
        <button
          onClick={() => setActiveTab('rules')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'rules' ? '2px solid #a21caf' : '2px solid transparent',
            color: activeTab === 'rules' ? '#a21caf' : '#64748b',
            background: 'transparent',
            cursor: 'pointer'
          }}
        >
          Event Rules ({rules.length})
        </button>
        <button
          onClick={() => setActiveTab('jobs')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'jobs' ? '2px solid #a21caf' : '2px solid transparent',
            color: activeTab === 'jobs' ? '#a21caf' : '#64748b',
            background: 'transparent',
            cursor: 'pointer'
          }}
        >
          Scheduled Cron Jobs ({jobs.length})
        </button>
        <button
          onClick={() => setActiveTab('simulator')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'simulator' ? '2px solid #a21caf' : '2px solid transparent',
            color: activeTab === 'simulator' ? '#a21caf' : '#64748b',
            background: 'transparent',
            cursor: 'pointer'
          }}
        >
          Rule Dry-Run Simulator
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'history' ? '2px solid #a21caf' : '2px solid transparent',
            color: activeTab === 'history' ? '#a21caf' : '#64748b',
            background: 'transparent',
            cursor: 'pointer'
          }}
        >
          Execution History
        </button>
      </div>

      {/* Tab Content: Rules List */}
      {activeTab === 'rules' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: '16px' }}>
          {rules.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
              No automation rules configured yet. Click "New ECA Rule" to add one.
            </div>
          ) : (
            rules.map(rule => {
              let conditions = [];
              let actions = [];
              try {
                conditions = JSON.parse(rule.conditions_json || '[]');
                actions = JSON.parse(rule.actions_json || '[]');
              } catch (e) {}

              return (
                <div key={rule.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', textTransform: 'uppercase' }}>
                        {rule.trigger_event}
                      </span>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>{rule.name}</h3>
                    </div>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: rule.is_active ? '#ecfdf5' : '#f1f5f9',
                      color: rule.is_active ? '#047857' : '#64748b'
                    }}>
                      {rule.is_active ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </div>

                  <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                    {rule.description || 'Automated rule triggers on system events.'}
                  </p>

                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', marginBottom: '14px' }}>
                    <div style={{ marginBottom: '6px', color: '#334155' }}>
                      <span style={{ fontWeight: 700, color: '#0284c7' }}>WHEN:</span> {rule.trigger_event}
                    </div>
                    <div style={{ marginBottom: '6px', color: '#334155' }}>
                      <span style={{ fontWeight: 700, color: '#d97706' }}>CONDITION:</span> {conditions.length > 0 ? (
                        conditions.map((c: any, i: number) => (
                          <span key={i} style={{ background: '#fff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', marginLeft: '4px' }}>
                            {c.field} {c.operator} {String(c.value)}
                          </span>
                        ))
                      ) : 'Always Execute'}
                    </div>
                    <div style={{ color: '#334155' }}>
                      <span style={{ fontWeight: 700, color: '#10b981' }}>THEN:</span> {actions.map((a: any, i: number) => (
                        <span key={i} style={{ background: '#ecfdf5', color: '#047857', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, marginLeft: '4px' }}>
                          {a.action_type}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                    <span>Executed: {rule.execution_count} times</span>
                    <span>Last run: {rule.last_executed_at ? new Date(rule.last_executed_at).toLocaleString() : 'Never'}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab Content: Scheduled Jobs */}
      {activeTab === 'jobs' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px' }}>Job Name</th>
                <th style={{ padding: '12px 16px' }}>Type</th>
                <th style={{ padding: '12px 16px' }}>Cron Schedule</th>
                <th style={{ padding: '12px 16px' }}>Channel</th>
                <th style={{ padding: '12px 16px' }}>Recipients</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                    No recurring scheduled jobs found.
                  </td>
                </tr>
              ) : (
                jobs.map(job => (
                  <tr key={job.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{job.job_name}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                        {job.job_type}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#0284c7' }}>{job.cron_schedule}</td>
                    <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{job.delivery_channel}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{job.recipient_emails || 'Default Lab Admins'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#ecfdf5', color: '#047857', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                        Active
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab Content: Rule Simulator */}
      {activeTab === 'simulator' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>Test Event Simulator</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
              Select a rule and pass a mock event payload to simulate condition satisfaction.
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Target Rule</label>
              <select
                value={simRuleId}
                onChange={e => setSimRuleId(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
              >
                {rules.map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({r.trigger_event})</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Event Context (JSON Payload)</label>
              <textarea
                rows={9}
                value={simPayload}
                onChange={e => setSimPayload(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '12px' }}
              />
            </div>

            <button
              onClick={handleRunSimulator}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '8px',
                background: '#0284c7',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              <Play size={15} />
              Evaluate Conditions
            </button>
          </div>

          <div style={{ background: '#0f172a', borderRadius: '12px', padding: '24px', color: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Terminal size={18} color="#38bdf8" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Evaluation Output</h3>
            </div>
            {simResult ? (
              <div>
                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: simResult.condition_matched ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: simResult.condition_matched ? '1px solid #10b981' : '1px solid #ef4444',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontWeight: 700, color: simResult.condition_matched ? '#34d399' : '#f87171' }}>
                    {simResult.condition_matched ? '✓ CONDITION MET (Action Triggered)' : '✗ CONDITION NOT MET'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
                    {simResult.message}
                  </div>
                </div>
                <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '6px', overflowX: 'auto', fontSize: '12px', color: '#93c5fd' }}>
                  {JSON.stringify(simResult, null, 2)}
                </pre>
              </div>
            ) : (
              <div style={{ color: '#64748b', fontSize: '13px', marginTop: '40px', textAlign: 'center' }}>
                Run an evaluation on the left panel to inspect decision trace and action output here.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Execution History */}
      {activeTab === 'history' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px' }}>Rule Name</th>
                <th style={{ padding: '12px 16px' }}>Event Trigger</th>
                <th style={{ padding: '12px 16px' }}>Entity ID</th>
                <th style={{ padding: '12px 16px' }}>Condition</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Executed At</th>
              </tr>
            </thead>
            <tbody>
              {executions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                    No automated execution logs recorded yet.
                  </td>
                </tr>
              ) : (
                executions.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{log.rule_name || log.rule_id}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                        {log.trigger_event}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#0284c7' }}>{log.entity_id}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {log.condition_matched ? (
                        <span style={{ color: '#047857', fontWeight: 600, fontSize: '12px' }}>Satisfied</span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '12px' }}>Skipped</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#ecfdf5', color: '#047857', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {new Date(log.executed_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Create Rule */}
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
          <div style={{
            background: '#fff',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '560px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Design Automation Rule</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              Define event listeners, conditional gates, and resulting clinical/operational actions.
            </p>

            <form onSubmit={handleCreateRule}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Rule Name *</label>
                <input
                  type="text"
                  required
                  value={newRule.name}
                  onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                  placeholder="e.g., Auto-Hold Analyzer on 3 Consecutive Westgard Alerts"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Trigger Event *</label>
                <select
                  value={newRule.trigger_event}
                  onChange={e => setNewRule({ ...newRule, trigger_event: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                >
                  <option value="CRITICAL_VALUE_REPORTED">CRITICAL_VALUE_REPORTED (Panic Value Flagged)</option>
                  <option value="QC_RULE_VIOLATION">QC_RULE_VIOLATION (Westgard Failure)</option>
                  <option value="INVENTORY_BELOW_REORDER">INVENTORY_BELOW_REORDER (Reagent Under Threshold)</option>
                  <option value="TAT_BREACH_DETECTED">TAT_BREACH_DETECTED (SLA Overdue)</option>
                  <option value="EQUIPMENT_MAINTENANCE_DUE">EQUIPMENT_MAINTENANCE_DUE (Preventive Service)</option>
                  <option value="PAYMENT_OVERDUE">PAYMENT_OVERDUE (Credit Limit Reached)</option>
                </select>
              </div>

              {/* Condition Builder */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>IF (Condition)</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Field name (e.g. value)"
                    value={newRule.conditionField}
                    onChange={e => setNewRule({ ...newRule, conditionField: e.target.value })}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                  <select
                    value={newRule.conditionOperator}
                    onChange={e => setNewRule({ ...newRule, conditionOperator: e.target.value })}
                    style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                  >
                    <option value=">">&gt;</option>
                    <option value=">=">&gt;=</option>
                    <option value="<">&lt;</option>
                    <option value="<=">&lt;=</option>
                    <option value="=">=</option>
                    <option value="!=">!=</option>
                    <option value="contains">contains</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Value (e.g. 200)"
                    value={newRule.conditionValue}
                    onChange={e => setNewRule({ ...newRule, conditionValue: e.target.value })}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Action Builder */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>THEN (Action)</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <select
                    value={newRule.actionType}
                    onChange={e => setNewRule({ ...newRule, actionType: e.target.value })}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                  >
                    <option value="CREATE_TASK">CREATE_TASK (Dispatch Task)</option>
                    <option value="NOTIFY_USER">NOTIFY_USER (In-App Alert)</option>
                    <option value="HOLD_ANALYZER_WORKFLOW">HOLD_ANALYZER_WORKFLOW (Lock Instrument)</option>
                  </select>
                  <select
                    value={newRule.actionPriority}
                    onChange={e => setNewRule({ ...newRule, actionPriority: e.target.value })}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="critical">Critical Priority</option>
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="Action Description / Task Title"
                  value={newRule.actionTitle}
                  onChange={e => setNewRule({ ...newRule, actionTitle: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
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
                  style={{ padding: '8px 18px', borderRadius: '6px', background: '#a21caf', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Save & Activate Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationEnginePage;
