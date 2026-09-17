import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, User, Shield, Building2, Check, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import api from '../../services/api';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, quickLoginAs, logout } = useAuth();
  const { info, success } = useNotification();
  const [branches, setBranches] = useState<any[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>(user?.branch_name || 'All Branches');
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    async function loadNotificationsCount() {
      if (user) {
        try {
          const res = await api.get('/notifications/unread-count');
          setUnreadCount(res.unread_count || 0);
        } catch (e) {
          // ignore
        }
      }
    }
    loadNotificationsCount();
    const interval = setInterval(loadNotificationsCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    async function loadBranches() {
      if (user?.lab_id) {
        try {
          const res = await api.get('/branches');
          setBranches(res);
        } catch (e) {
          // ignore
        }
      }
    }
    loadBranches();
  }, [user?.lab_id]);

  const handleRoleSwitch = async (role: any) => {
    setShowRoleMenu(false);
    info(`Switching demo session to ${role.toUpperCase()}...`);
    await quickLoginAs(role);
    success(`Signed in as ${role.toUpperCase()}`);
  };

  const getRoleBadge = (roleCode?: string) => {
    switch (roleCode) {
      case 'super_admin': return { label: 'Super Admin', bg: '#e0f2fe', color: '#0369a1' };
      case 'lab_admin': return { label: 'Lab Admin', bg: '#fef3c7', color: '#b45309' };
      case 'pathologist': return { label: 'Pathologist / MD', bg: '#ede9fe', color: '#6d28d9' };
      case 'lab_technician': return { label: 'Medical Technologist', bg: '#dcfce7', color: '#15803d' };
      case 'receptionist': return { label: 'Receptionist & Billing', bg: '#ffe4e6', color: '#be123c' };
      case 'accountant': return { label: 'Accountant', bg: '#f1f5f9', color: '#334155' };
      default: return { label: 'Staff', bg: '#f1f5f9', color: '#475569' };
    }
  };

  const roleBadge = getRoleBadge(user?.role_code);

  return (
    <header className="app-header">
      {/* Left section: Lab and branch info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Building2 size={18} color="#0284c7" />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
            {user?.lab_name || 'Global System Administration'}
          </span>
        </div>

        {branches.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: '#f1f5f9', borderRadius: 6 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>Branch:</span>
            <select
              value={currentBranch}
              onChange={(e) => {
                setCurrentBranch(e.target.value);
                info(`Active branch switched to ${e.target.value}`);
              }}
              style={{ background: 'transparent', border: 'none', fontSize: 12.5, fontWeight: 600, color: '#0f172a', outline: 'none', cursor: 'pointer' }}
            >
              <option value="All Branches">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right section: Demo Role Switcher, Notifications, and Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Instant 1-Click Role Switcher Pill (Great for pair programming and testing) */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: 20,
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 600,
              color: '#0369a1',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} />
            <span>Switch Role</span>
            <ChevronDown size={13} />
          </button>

          {showRoleMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 6,
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              width: 220,
              zIndex: 100,
              padding: 6,
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}>
              <div style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                Test As Role
              </div>
              {[
                { key: 'super_admin', label: 'Super Admin', desc: 'Full System Control' },
                { key: 'lab_admin', label: 'Lab Admin', desc: 'Apex Lab Director' },
                { key: 'pathologist', label: 'Pathologist', desc: 'Approvals & Signatures' },
                { key: 'lab_technician', label: 'Lab Technician', desc: 'Samples & Result Entry' },
                { key: 'receptionist', label: 'Receptionist', desc: 'Intake & Invoicing' },
                { key: 'accountant', label: 'Accountant', desc: 'Billing & Ledger' },
              ].map(r => (
                <button
                  key={r.key}
                  onClick={() => handleRoleSwitch(r.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: user?.role_code === r.key ? '#f0f9ff' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0f172a' }}>{r.label}</div>
                    <div style={{ fontSize: 10.5, color: '#64748b' }}>{r.desc}</div>
                  </div>
                  {user?.role_code === r.key && <Check size={14} color="#0284c7" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Icon */}
        <button
          onClick={() => navigate('/notifications')}
          title="System Notifications & Announcements"
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '1px solid #e2e8f0',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            cursor: 'pointer',
            position: 'relative'
          }}
        >
          <Bell size={17} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: -3,
              right: -3,
              minWidth: 17,
              height: 17,
              padding: '0 4px',
              borderRadius: 9,
              backgroundColor: '#ef4444',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #fff'
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Profile avatar */}
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '4px 8px',
              borderRadius: 8,
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 14
            }}>
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', lineHeight: 1.2 }}>
                {user?.name || 'Administrator'}
              </span>
              <span style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: roleBadge.color,
                backgroundColor: roleBadge.bg,
                padding: '1px 6px',
                borderRadius: 10,
                marginTop: 2,
                display: 'inline-block',
                width: 'fit-content'
              }}>
                {roleBadge.label}
              </span>
            </div>
            <ChevronDown size={14} color="#64748b" />
          </div>

          {showUserMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 6,
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              width: 180,
              zIndex: 100,
              padding: 6
            }}>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{user?.name}</div>
                <div style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
              </div>
              <button
                onClick={logout}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'transparent',
                  color: '#dc2626',
                  fontSize: 12.5,
                  fontWeight: 500,
                  cursor: 'pointer',
                  marginTop: 4
                }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
