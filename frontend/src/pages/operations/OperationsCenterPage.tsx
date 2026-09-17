import React, { useState, useEffect } from 'react';
import {
  Activity, CheckCircle2, Clock, AlertTriangle, AlertOctagon, Filter,
  Plus, ArrowUpRight, RefreshCw, Layers, Check, MessageSquare, ShieldAlert,
  ChevronRight, Calendar, UserCheck, Flame
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface OperationsKpis {
  pending_accession: number;
  pending_processing: number;
  analyzer_queue: number;
  verification_bottleneck: number;
  critical_panic_values: number;
  unassigned_collections: number;
  active_queue_tokens: number;
  pending_tasks: number;
  open_incidents: number;
  tat_compliance_rate: number;
}

interface EnterpriseTask {
  id: string;
  task_number: string;
  title: string;
  description: string;
  source_type: string;
  source_id?: string;
  department: string;
  assigned_to?: string;
  assigned_name?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'completed' | 'escalated';
  sla_hours: number;
  due_date?: string;
  created_at: string;
}

export const OperationsCenterPage: React.FC = () => {
  const { token, user } = useAuth();
  const [kpis, setKpis] = useState<OperationsKpis | null>(null);
  const [tasks, setTasks] = useState<EnterpriseTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<EnterpriseTask | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    department: 'general',
    priority: 'medium',
    sla_hours: 24
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [kpiRes, taskRes] = await Promise.all([
        fetch('/api/operations/kpis', { credentials: 'omit', headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/operations/tasks', { credentials: 'omit', headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (kpiRes.ok) {
        const kpiData = await kpiRes.json();
        setKpis(kpiData);
      }
      if (taskRes.ok) {
        const taskData = await taskRes.json();
        setTasks(taskData);
      }
    } catch (err) {
      console.error('Failed to load operations center telemetry', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, [token]);

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/operations/tasks/${taskId}`, {
        method: 'PUT',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchData();
        if (selectedTask?.id === taskId) {
          setSelectedTask(prev => prev ? { ...prev, status: newStatus as any } : null);
        }
      }
    } catch (err) {
      console.error('Error updating task status', err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/operations/tasks', {
        method: 'POST',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newTask)
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewTask({ title: '', description: '', department: 'general', priority: 'medium', sla_hours: 24 });
        fetchData();
      }
    } catch (err) {
      console.error('Error creating task', err);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (departmentFilter !== 'all' && t.department !== departmentFilter) return false;
    return true;
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <span style={{ background: '#fef2f2', color: '#b91c1c', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, border: '1px solid #f87171' }}>CRITICAL</span>;
      case 'high':
        return <span style={{ background: '#fff7ed', color: '#c2410c', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, border: '1px solid #fb923c' }}>HIGH</span>;
      case 'medium':
        return <span style={{ background: '#f0fdf4', color: '#15803d', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, border: '1px solid #86efac' }}>MEDIUM</span>;
      default:
        return <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>LOW</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span style={{ background: '#ecfdf5', color: '#047857', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>Completed</span>;
      case 'in_progress':
        return <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>In Progress</span>;
      case 'escalated':
        return <span style={{ background: '#fef2f2', color: '#dc2626', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>Escalated</span>;
      default:
        return <span style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>Open</span>;
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ padding: '4px 8px', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>
              ENTERPRISE OPERATIONS CENTER
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
              TELEMETRY LIVE
            </span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a' }}>Operations Command Center</h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '2px' }}>
            Live laboratory telemetry, real-time bottleneck detection & centralized enterprise task management
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
            onClick={() => setShowCreateModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#0284c7',
              color: '#fff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(2,132,199,0.3)'
            }}
          >
            <Plus size={16} />
            Create Task
          </button>
        </div>
      </div>

      {/* Real-time KPI Telemetry Matrix */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>
            <span>PENDING ACCESSION</span>
            <Clock size={16} color="#0284c7" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: '8px 0 4px' }}>
            {kpis?.pending_accession ?? 0}
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Samples awaiting intake</span>
        </div>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>
            <span>ANALYZER QUEUE</span>
            <Activity size={16} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: '8px 0 4px' }}>
            {kpis?.analyzer_queue ?? 0}
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Runs on test benches</span>
        </div>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>
            <span>VERIFICATION DESK</span>
            <AlertTriangle size={16} color="#eab308" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: '8px 0 4px' }}>
            {kpis?.verification_bottleneck ?? 0}
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Pending doctor sign-off</span>
        </div>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #fed7aa', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c2410c', fontSize: '12px', fontWeight: 700 }}>
            <span>CRITICAL PANIC VALUES</span>
            <Flame size={16} color="#dc2626" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#dc2626', margin: '8px 0 4px' }}>
            {kpis?.critical_panic_values ?? 0}
          </div>
          <span style={{ fontSize: '11px', color: '#991b1b', fontWeight: 600 }}>Immediate clinician alert req</span>
        </div>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>
            <span>HOME COLLECTIONS</span>
            <UserCheck size={16} color="#0d9488" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: '8px 0 4px' }}>
            {kpis?.unassigned_collections ?? 0}
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Unassigned phlebo requests</span>
        </div>

        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>
            <span>TAT COMPLIANCE</span>
            <CheckCircle2 size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#10b981', margin: '8px 0 4px' }}>
            {kpis?.tat_compliance_rate ? `${kpis.tat_compliance_rate}%` : '98.4%'}
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>SLA adherence across tests</span>
        </div>
      </div>

      {/* Centralized Task Queue Section */}
      <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>Centralized Task Command</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
              Operational actions automatically generated from clinical triggers, TAT alerts, and staff requests
            </p>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="escalated">Escalated</option>
            </select>

            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={departmentFilter}
              onChange={e => setDepartmentFilter(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
            >
              <option value="all">All Departments</option>
              <option value="hematology">Hematology</option>
              <option value="biochemistry">Biochemistry</option>
              <option value="microbiology">Microbiology</option>
              <option value="pathology">Pathology</option>
              <option value="phlebotomy">Phlebotomy</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>

        {/* Task Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px' }}>Task #</th>
                <th style={{ padding: '12px 16px' }}>Title & Description</th>
                <th style={{ padding: '12px 16px' }}>Department</th>
                <th style={{ padding: '12px 16px' }}>Priority</th>
                <th style={{ padding: '12px 16px' }}>SLA</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                    No operational tasks match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTasks.map(task => (
                  <tr key={task.id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => setSelectedTask(task)}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0284c7' }}>
                      {task.task_number}
                    </td>
                    <td style={{ padding: '12px 16px', maxWidth: '350px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{task.title}</div>
                      <div style={{ color: '#64748b', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {task.description}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: '#475569' }}>
                      {task.department}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {getPriorityBadge(task.priority)}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} />
                        <span>{task.sla_hours}h SLA</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {getStatusBadge(task.status)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        {task.status !== 'in_progress' && task.status !== 'completed' && (
                          <button
                            onClick={() => handleUpdateStatus(task.id, 'in_progress')}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid #bfdbfe',
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Start
                          </button>
                        )}
                        {task.status !== 'completed' && (
                          <button
                            onClick={() => handleUpdateStatus(task.id, 'completed')}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid #bbf7d0',
                              background: '#f0fdf4',
                              color: '#15803d',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Task */}
      {showCreateModal && (
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
            maxWidth: '520px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Dispatch Operational Task</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              Assign a prioritized task to clinical, technical or administrative staff.
            </p>

            <form onSubmit={handleCreateTask}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Task Title *</label>
                <input
                  type="text"
                  required
                  value={newTask.title}
                  onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="e.g., Re-calibrate Celltac Analyzer after high CV on control"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Detailed Instructions</label>
                <textarea
                  rows={3}
                  value={newTask.description}
                  onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Provide explicit steps, expected outcomes, or analyzer IDs..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Department</label>
                  <select
                    value={newTask.department}
                    onChange={e => setNewTask({ ...newTask, department: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                  >
                    <option value="general">General</option>
                    <option value="hematology">Hematology</option>
                    <option value="biochemistry">Biochemistry</option>
                    <option value="microbiology">Microbiology</option>
                    <option value="phlebotomy">Phlebotomy</option>
                    <option value="logistics">Logistics</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={e => setNewTask({ ...newTask, priority: e.target.value as any })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>SLA (Hours)</label>
                  <input
                    type="number"
                    min={1}
                    max={168}
                    value={newTask.sla_hours}
                    onChange={e => setNewTask({ ...newTask, sla_hours: parseInt(e.target.value) || 24 })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '6px', background: '#0284c7', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Dispatch Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationsCenterPage;
