import React, { useState, useEffect } from 'react';
import {
  Users, Clock, Calendar, CheckCircle2, AlertCircle, Plus, RefreshCw,
  UserCheck, ShieldCheck, MapPin, Briefcase, FileText, ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AttendanceRecord {
  id: string;
  user_id: string;
  user_name: string;
  department?: string;
  check_in_time: string;
  check_out_time?: string;
  hours_worked?: number;
  status: 'on_time' | 'late' | 'half_day' | 'absent';
  punch_method: string;
  date: string;
}

interface ShiftTemplate {
  id: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  grace_period_mins: number;
  department: string;
}

export const WorkforcePage: React.FC = () => {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'attendance' | 'shifts'>('attendance');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [shifts, setShifts] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [punchedIn, setPunchedIn] = useState<boolean>(false);
  const [showShiftModal, setShowShiftModal] = useState<boolean>(false);
  const [newShift, setNewShift] = useState({
    shift_name: '',
    start_time: '08:00',
    end_time: '16:30',
    grace_period_mins: 15,
    department: 'laboratory'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [attRes, shfRes] = await Promise.all([
        fetch('/api/workforce/attendance', { credentials: 'omit', headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/workforce/shifts', { credentials: 'omit', headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (attRes.ok) {
        const attData = await attRes.json();
        setAttendance(attData);
        // Check if current user is clocked in today without checkout
        const myRecord = attData.find((r: any) => r.user_id === user?.id && !r.check_out_time);
        setPunchedIn(!!myRecord);
      }
      if (shfRes.ok) setShifts(await shfRes.json());
    } catch (err) {
      console.error('Failed to load workforce state', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handlePunch = async (punchType: 'IN' | 'OUT') => {
    try {
      const res = await fetch('/api/workforce/attendance/punch', {
        method: 'POST',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          punch_type: punchType,
          punch_method: 'web_portal'
        })
      });
      if (res.ok) {
        setPunchedIn(punchType === 'IN');
        fetchData();
      }
    } catch (err) {
      console.error('Error logging attendance punch', err);
    }
  };

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/workforce/shifts', {
        method: 'POST',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newShift)
      });
      if (res.ok) {
        setShowShiftModal(false);
        setNewShift({
          shift_name: '',
          start_time: '08:00',
          end_time: '16:30',
          grace_period_mins: 15,
          department: 'laboratory'
        });
        fetchData();
      }
    } catch (err) {
      console.error('Error creating shift template', err);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ padding: '4px 8px', background: '#f5f3ff', color: '#6d28d9', borderRadius: '4px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>
              WORKFORCE & ROSTERING INTELLIGENCE
            </span>
            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>• Shift Coverage Guard Active</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a' }}>Workforce Management & Attendance</h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '2px' }}>
            Biometric & web clock-in, clinical shift rostering, overtime tracking, and laboratory coverage analytics
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
            onClick={() => setShowShiftModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#6d28d9',
              color: '#fff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(109,40,217,0.3)'
            }}
          >
            <Plus size={16} />
            Create Shift Template
          </button>
        </div>
      </div>

      {/* Clock-In Banner */}
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: punchedIn ? '#ecfdf5' : '#f1f5f9',
            color: punchedIn ? '#047857' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Clock size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              {user?.name || 'Laboratory Staff'} - Shift Attendance Desk
            </h3>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Current Status: <strong style={{ color: punchedIn ? '#047857' : '#d97706' }}>
                {punchedIn ? 'CLOCKED IN (On Duty)' : 'CLOCKED OUT'}
              </strong>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {!punchedIn ? (
            <button
              onClick={() => handlePunch('IN')}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                background: '#047857',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(4,120,87,0.3)'
              }}
            >
              Punch In (Clock In)
            </button>
          ) : (
            <button
              onClick={() => handlePunch('OUT')}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(220,38,38,0.3)'
              }}
            >
              Punch Out (Shift End)
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', gap: '8px' }}>
        <button
          onClick={() => setActiveTab('attendance')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'attendance' ? '2px solid #6d28d9' : '2px solid transparent',
            color: activeTab === 'attendance' ? '#6d28d9' : '#64748b',
            background: 'transparent',
            cursor: 'pointer'
          }}
        >
          Today's Attendance Roster ({attendance.length})
        </button>
        <button
          onClick={() => setActiveTab('shifts')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'shifts' ? '2px solid #6d28d9' : '2px solid transparent',
            color: activeTab === 'shifts' ? '#6d28d9' : '#64748b',
            background: 'transparent',
            cursor: 'pointer'
          }}
        >
          Shift Templates ({shifts.length})
        </button>
      </div>

      {/* Tab: Attendance Roster */}
      {activeTab === 'attendance' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px' }}>Staff Member</th>
                <th style={{ padding: '12px 16px' }}>Department</th>
                <th style={{ padding: '12px 16px' }}>Clock In</th>
                <th style={{ padding: '12px 16px' }}>Clock Out</th>
                <th style={{ padding: '12px 16px' }}>Duration</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                    No attendance records logged for today yet.
                  </td>
                </tr>
              ) : (
                attendance.map(att => (
                  <tr key={att.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{att.user_name}</td>
                    <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: '#475569' }}>
                      {att.department || 'Clinical Laboratory'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#047857', fontWeight: 600 }}>
                      {new Date(att.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '12px 16px', color: att.check_out_time ? '#334155' : '#d97706' }}>
                      {att.check_out_time ? new Date(att.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active Shift'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {att.hours_worked ? `${att.hours_worked} hrs` : '--'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: att.status === 'on_time' ? '#ecfdf5' : '#fffbeb',
                        color: att.status === 'on_time' ? '#047857' : '#b45309'
                      }}>
                        {att.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Shift Templates */}
      {activeTab === 'shifts' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {shifts.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
              No shift templates configured.
            </div>
          ) : (
            shifts.map(shf => (
              <div key={shf.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>{shf.shift_name}</h4>
                <div style={{ fontSize: '13px', color: '#6d28d9', fontWeight: 600, marginBottom: '12px' }}>
                  {shf.start_time} - {shf.end_time}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                  <span>Grace Period: {shf.grace_period_mins || 15} mins</span>
                  <span style={{ textTransform: 'capitalize' }}>{shf.department}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal: Create Shift Template */}
      {showShiftModal && (
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
          <div style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '480px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Add Clinical Shift Template</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Define standard duty hours for technicians, phlebotomists, and pathologists.</p>

            <form onSubmit={handleCreateShift}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Shift Name *</label>
                <input
                  type="text"
                  required
                  value={newShift.shift_name}
                  onChange={e => setNewShift({ ...newShift, shift_name: e.target.value })}
                  placeholder="e.g. Morning Shift - Core Diagnostics"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Start Time</label>
                  <input
                    type="time"
                    required
                    value={newShift.start_time}
                    onChange={e => setNewShift({ ...newShift, start_time: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>End Time</label>
                  <input
                    type="time"
                    required
                    value={newShift.end_time}
                    onChange={e => setNewShift({ ...newShift, end_time: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowShiftModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '6px', background: '#6d28d9', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Save Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkforcePage;
