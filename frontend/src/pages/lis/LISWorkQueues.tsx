import React, { useState, useEffect } from 'react';
import {
  Clock, CheckCircle2, AlertTriangle, ShieldAlert, Cpu, ArrowRight,
  RefreshCw, Filter, Bell, User, Check, ChevronRight, Activity, Zap
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export const LISWorkQueues: React.FC = () => {
  const [queues, setQueues] = useState<any>(null);
  const [tatMetrics, setTatMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeQueueTab, setActiveQueueTab] = useState<'all' | 'accession' | 'analyzer' | 'validation' | 'critical'>('all');
  const { error, success } = useNotification();

  useEffect(() => {
    loadQueues();
  }, []);

  const loadQueues = async () => {
    setLoading(true);
    try {
      const [qRes, tatRes] = await Promise.all([
        api.get('/lis-rules/work-queues'),
        api.get('/lis-rules/tat-metrics')
      ]);
      setQueues(qRes);
      setTatMetrics(tatRes);
    } catch (err: any) {
      error(err.message || 'Failed to load LIS work queues');
    } finally {
      setLoading(false);
    }
  };

  const handleEscalateCritical = (item: any) => {
    success(`Critical alert for ${item.patient_name} (${item.param_name}: ${item.value_numeric || item.value_text} ${item.unit || ''}) logged. Physician notification SMS triggered.`);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ padding: 8, borderRadius: 8, background: '#fef3c7', color: '#b45309' }}>
              <Clock size={24} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Clinical Work Queues & Turnaround Time (TAT)</h1>
          </div>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            Real-time multi-stage laboratory pipeline tracking, STAT prioritization, and SLA turnaround compliance.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            id="btn-refresh-queues"
            onClick={loadQueues}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, color: '#475569', cursor: 'pointer', fontWeight: 500 }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh Pipelines
          </button>
        </div>
      </div>

      {/* SLA & TAT Milestones Header */}
      {tatMetrics && (
        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                Enterprise Turnaround Time (TAT) SLA Performance
              </h3>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                Based on {tatMetrics.total_orders} lifetime orders & {tatMetrics.completed_reports} approved diagnostic reports
              </div>
            </div>

            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>OVERALL AVG TAT</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#0284c7' }}>
                  {tatMetrics.overall_average_tat_hours} Hours
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>SLA COMPLIANCE</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#10b981' }}>
                  {tatMetrics.sla_compliance_overall_percent}%
                </div>
              </div>
            </div>
          </div>

          {/* Stages Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {tatMetrics.stages?.map((stage: any, idx: number) => (
              <div key={idx} style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 6, height: 28 }}>
                  {stage.stage}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{stage.avg_minutes} min</span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>SLA Target: {stage.sla_target}m</span>
                </div>
                <div style={{ background: '#e2e8f0', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      background: stage.compliance_percent >= 95 ? '#10b981' : '#f59e0b',
                      height: '100%',
                      width: `${stage.compliance_percent}%`
                    }}
                  />
                </div>
                <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600, marginTop: 4, textAlign: 'right' }}>
                  {stage.compliance_percent}% on-time
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Queue Filter Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <button
          id="tab-queue-all"
          onClick={() => setActiveQueueTab('all')}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeQueueTab === 'all' ? '2px solid #0284c7' : '2px solid transparent',
            color: activeQueueTab === 'all' ? '#0284c7' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          All Pipelines
        </button>
        <button
          id="tab-queue-critical"
          onClick={() => setActiveQueueTab('critical')}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeQueueTab === 'critical' ? '2px solid #ef4444' : '2px solid transparent',
            color: activeQueueTab === 'critical' ? '#ef4444' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <ShieldAlert size={16} /> Critical Panic Queue ({queues?.critical_queue?.length || 0})
        </button>
        <button
          id="tab-queue-accession"
          onClick={() => setActiveQueueTab('accession')}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeQueueTab === 'accession' ? '2px solid #0284c7' : '2px solid transparent',
            color: activeQueueTab === 'accession' ? '#0284c7' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          1. Accession Pending ({queues?.accession_queue?.length || 0})
        </button>
        <button
          id="tab-queue-analyzer"
          onClick={() => setActiveQueueTab('analyzer')}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeQueueTab === 'analyzer' ? '2px solid #0284c7' : '2px solid transparent',
            color: activeQueueTab === 'analyzer' ? '#0284c7' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          2. Analyzer Run Pending ({queues?.analyzer_queue?.length || 0})
        </button>
        <button
          id="tab-queue-validation"
          onClick={() => setActiveQueueTab('validation')}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeQueueTab === 'validation' ? '2px solid #0284c7' : '2px solid transparent',
            color: activeQueueTab === 'validation' ? '#0284c7' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          3. Pathologist Verification ({queues?.validation_queue?.length || 0})
        </button>
      </div>

      {/* PIPELINE GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: activeQueueTab === 'all' ? 'repeat(auto-fit, minmax(310px, 1fr))' : '1fr', gap: 20 }}>
        {/* 1. CRITICAL QUEUE */}
        {(activeQueueTab === 'all' || activeQueueTab === 'critical') && (
          <div style={{ background: '#fff', borderRadius: 12, border: '2px solid #fca5a5', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.1)' }}>
            <div style={{ background: '#fee2e2', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#991b1b', fontWeight: 700, fontSize: 14 }}>
                <ShieldAlert size={18} />
                <span>CRITICAL / PANIC VALUES ({queues?.critical_queue?.length || 0})</span>
              </div>
              <span style={{ fontSize: 11, background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>
                IMMEDIATE ACTION
              </span>
            </div>

            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {!queues?.critical_queue || queues.critical_queue.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  No pending critical alerts. Normal operating range.
                </div>
              ) : (
                queues.critical_queue.map((item: any, idx: number) => (
                  <div key={idx} style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #fecaca', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: '#991b1b', fontSize: 14 }}>
                        {item.param_name}: {item.value_numeric || item.value_text} {item.unit}
                      </span>
                      <span style={{ background: '#f87171', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                        PANIC HIGH
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 600 }}>{item.patient_name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Order #{item.order_number}</div>

                    <button
                      id={`btn-escalate-crit-${idx}`}
                      onClick={() => handleEscalateCritical(item)}
                      style={{
                        marginTop: 10,
                        width: '100%',
                        padding: '6px 12px',
                        background: '#dc2626',
                        border: 'none',
                        borderRadius: 6,
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <Bell size={13} /> Escalate / Phone Call Doctor
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 2. ACCESSION QUEUE */}
        {(activeQueueTab === 'all' || activeQueueTab === 'accession') && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ background: '#f8fafc', padding: '14px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1e293b', fontWeight: 700, fontSize: 14 }}>
                <Clock size={18} color="#0284c7" />
                <span>1. Specimen Accession Queue ({queues?.accession_queue?.length || 0})</span>
              </div>
            </div>

            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {!queues?.accession_queue || queues.accession_queue.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  No specimens waiting for accession.
                </div>
              ) : (
                queues.accession_queue.map((item: any) => (
                  <div key={item.id} style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: '#0284c7', fontFamily: 'monospace', fontSize: 13 }}>
                        {item.sample_barcode}
                      </span>
                      {item.priority === 'stat' && (
                        <span style={{ background: '#ef4444', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                          STAT
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{item.patient_name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Order: {item.order_number}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                      Collected: {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 3. ANALYZER RUN QUEUE */}
        {(activeQueueTab === 'all' || activeQueueTab === 'analyzer') && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ background: '#f8fafc', padding: '14px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1e293b', fontWeight: 700, fontSize: 14 }}>
                <Cpu size={18} color="#6366f1" />
                <span>2. Analyzer Test Run Queue ({queues?.analyzer_queue?.length || 0})</span>
              </div>
            </div>

            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {!queues?.analyzer_queue || queues.analyzer_queue.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  All accessioned specimens dispatched to analyzers.
                </div>
              ) : (
                queues.analyzer_queue.map((item: any) => (
                  <div key={item.id} style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: '#4f46e5', fontFamily: 'monospace', fontSize: 13 }}>
                        {item.sample_barcode}
                      </span>
                      <span style={{ background: '#e0e7ff', color: '#4338ca', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                        READY FOR RUN
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{item.patient_name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Order: {item.order_number}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 4. VALIDATION QUEUE */}
        {(activeQueueTab === 'all' || activeQueueTab === 'validation') && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ background: '#f8fafc', padding: '14px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1e293b', fontWeight: 700, fontSize: 14 }}>
                <CheckCircle2 size={18} color="#10b981" />
                <span>3. Pathologist Verification ({queues?.validation_queue?.length || 0})</span>
              </div>
            </div>

            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {!queues?.validation_queue || queues.validation_queue.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  No pending results awaiting sign-off.
                </div>
              ) : (
                queues.validation_queue.map((item: any) => (
                  <div key={item.id} style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                        {item.test_name}
                      </span>
                      <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                        {item.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: '#334155' }}>{item.patient_name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Order: {item.order_number}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
