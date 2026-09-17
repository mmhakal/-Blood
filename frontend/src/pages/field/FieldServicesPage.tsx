import React, { useState, useEffect } from 'react';
import {
  Navigation, Bike, Users, Clock, Plus, RefreshCw,
  MapPin, CheckCircle, AlertCircle, Phone, Calendar,
  ArrowRight, Shield, Zap, Ticket
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HomeCollection {
  id: string;
  request_number: string;
  patient_name: string;
  patient_phone: string;
  collection_address: string;
  scheduled_slot: string;
  phlebotomist_id?: string;
  phlebotomist_name?: string;
  status: 'requested' | 'assigned' | 'en_route' | 'sample_collected' | 'delivered_to_lab' | 'cancelled';
  test_names?: string;
  notes?: string;
}

interface Phlebotomist {
  id: string;
  name: string;
  phone: string;
  vehicle_number?: string;
  current_status: 'available' | 'on_trip' | 'off_duty';
  zone?: string;
  active_trips_count: number;
}

interface QueueToken {
  id: string;
  token_number: string;
  counter_number?: string;
  department: string;
  status: 'waiting' | 'called' | 'in_service' | 'completed' | 'no_show';
  created_at: string;
}

export const FieldServicesPage: React.FC = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'collections' | 'fleet' | 'queue'>('collections');
  const [collections, setCollections] = useState<HomeCollection[]>([]);
  const [phlebotomists, setPhlebotomists] = useState<Phlebotomist[]>([]);
  const [tokens, setTokens] = useState<QueueToken[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // New Booking Modal
  const [showBookingModal, setShowBookingModal] = useState<boolean>(false);
  const [newBooking, setNewBooking] = useState({
    patient_name: '',
    patient_phone: '',
    collection_address: '',
    scheduled_slot: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    phlebotomist_id: '',
    notes: 'Please bring pediatric micro-containers'
  });

  // New Token Modal
  const [showTokenModal, setShowTokenModal] = useState<boolean>(false);
  const [tokenDept, setTokenDept] = useState<string>('Phlebotomy');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [colRes, phlebRes, tokRes] = await Promise.all([
        fetch('/api/field-services/home-collections', { credentials: 'omit', headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/field-services/phlebotomists', { credentials: 'omit', headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/field-services/queue-tokens', { credentials: 'omit', headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (colRes.ok) setCollections(await colRes.json());
      if (phlebRes.ok) {
        const phData = await phlebRes.json();
        setPhlebotomists(phData);
        if (phData.length > 0 && !newBooking.phlebotomist_id) {
          setNewBooking(prev => ({ ...prev, phlebotomist_id: phData[0].id }));
        }
      }
      if (tokRes.ok) setTokens(await tokRes.json());
    } catch (err) {
      console.error('Failed to load field services state', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleUpdateCollectionStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/field-services/home-collections/${id}/status`, {
        method: 'PATCH',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error('Error updating collection status', err);
    }
  };

  const handleBookCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/field-services/home-collections', {
        method: 'POST',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newBooking)
      });
      if (res.ok) {
        setShowBookingModal(false);
        setNewBooking({
          patient_name: '',
          patient_phone: '',
          collection_address: '',
          scheduled_slot: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
          phlebotomist_id: phlebotomists[0]?.id || '',
          notes: ''
        });
        fetchData();
      }
    } catch (err) {
      console.error('Error booking home collection', err);
    }
  };

  const handleGenerateToken = async () => {
    try {
      const res = await fetch('/api/field-services/queue-tokens', {
        method: 'POST',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ department: tokenDept })
      });
      if (res.ok) {
        setShowTokenModal(false);
        fetchData();
      }
    } catch (err) {
      console.error('Error dispensing token', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered_to_lab':
        return <span style={{ background: '#ecfdf5', color: '#047857', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>Delivered to Lab</span>;
      case 'sample_collected':
        return <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>Sample Collected</span>;
      case 'en_route':
        return <span style={{ background: '#fffbeb', color: '#b45309', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>En Route</span>;
      case 'assigned':
        return <span style={{ background: '#f5f3ff', color: '#6d28d9', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>Assigned</span>;
      default:
        return <span style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>Pending Dispatch</span>;
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ padding: '4px 8px', background: '#f0fdfa', color: '#0f766e', borderRadius: '4px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>
              FIELD LOGISTICS & ACCESSION DISPATCH
            </span>
            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>• Real-Time Phlebotomist Tracking</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a' }}>Field Services & Smart Reception Queue</h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '2px' }}>
            Home sample collection dispatch, phlebotomy mobile fleet orchestration, and automated counter token management
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
            onClick={() => setShowTokenModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: '#fff',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Ticket size={16} />
            Dispense Token
          </button>

          <button
            onClick={() => setShowBookingModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#0f766e',
              color: '#fff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(15,118,110,0.3)'
            }}
          >
            <Plus size={16} />
            Schedule Home Visit
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', gap: '8px' }}>
        <button
          onClick={() => setActiveTab('collections')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'collections' ? '2px solid #0f766e' : '2px solid transparent',
            color: activeTab === 'collections' ? '#0f766e' : '#64748b',
            background: 'transparent',
            cursor: 'pointer'
          }}
        >
          Home Collections ({collections.length})
        </button>
        <button
          onClick={() => setActiveTab('fleet')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'fleet' ? '2px solid #0f766e' : '2px solid transparent',
            color: activeTab === 'fleet' ? '#0f766e' : '#64748b',
            background: 'transparent',
            cursor: 'pointer'
          }}
        >
          Phlebotomist Fleet ({phlebotomists.length})
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeTab === 'queue' ? '2px solid #0f766e' : '2px solid transparent',
            color: activeTab === 'queue' ? '#0f766e' : '#64748b',
            background: 'transparent',
            cursor: 'pointer'
          }}
        >
          Reception & Token Queue ({tokens.length})
        </button>
      </div>

      {/* Tab: Home Collections */}
      {activeTab === 'collections' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px' }}>Request #</th>
                <th style={{ padding: '12px 16px' }}>Patient Details</th>
                <th style={{ padding: '12px 16px' }}>Address</th>
                <th style={{ padding: '12px 16px' }}>Scheduled Slot</th>
                <th style={{ padding: '12px 16px' }}>Phlebotomist</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Workflow Action</th>
              </tr>
            </thead>
            <tbody>
              {collections.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                    No home collection visits requested today.
                  </td>
                </tr>
              ) : (
                collections.map(col => (
                  <tr key={col.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f766e' }}>{col.request_number}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{col.patient_name}</div>
                      <div style={{ color: '#64748b', fontSize: '12px' }}>{col.patient_phone}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', maxWidth: '280px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                        <MapPin size={14} style={{ marginTop: '2px', flexShrink: 0, color: '#0f766e' }} />
                        <span>{col.collection_address}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>
                      {new Date(col.scheduled_slot).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                      {col.phlebotomist_name || 'Unassigned'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {getStatusBadge(col.status)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {col.status === 'requested' && (
                        <button
                          onClick={() => handleUpdateCollectionStatus(col.id, 'en_route')}
                          style={{ padding: '4px 8px', borderRadius: '4px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Dispatch
                        </button>
                      )}
                      {col.status === 'en_route' && (
                        <button
                          onClick={() => handleUpdateCollectionStatus(col.id, 'sample_collected')}
                          style={{ padding: '4px 8px', borderRadius: '4px', background: '#f5f3ff', border: '1px solid #ddd6fe', color: '#6d28d9', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Mark Collected
                        </button>
                      )}
                      {col.status === 'sample_collected' && (
                        <button
                          onClick={() => handleUpdateCollectionStatus(col.id, 'delivered_to_lab')}
                          style={{ padding: '4px 8px', borderRadius: '4px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Handover to Lab
                        </button>
                      )}
                      {col.status === 'delivered_to_lab' && (
                        <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>Accessioned ✓</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Phlebotomist Fleet */}
      {activeTab === 'fleet' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {phlebotomists.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
              No phlebotomist profiles active.
            </div>
          ) : (
            phlebotomists.map(phleb => (
              <div key={phleb.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f0fdfa', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                      <Bike size={18} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{phleb.name}</h4>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{phleb.phone}</span>
                    </div>
                  </div>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: phleb.current_status === 'available' ? '#ecfdf5' : '#fffbeb',
                    color: phleb.current_status === 'available' ? '#047857' : '#b45309'
                  }}>
                    {phleb.current_status.replace('_', ' ')}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#f8fafc', padding: '10px', borderRadius: '8px', marginTop: '14px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Vehicle #</span>
                    <strong style={{ color: '#0f172a' }}>{phleb.vehicle_number || 'MH-02-EE-8890'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>Zone</span>
                    <strong style={{ color: '#0f766e' }}>{phleb.zone || 'North Zone'}</strong>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Reception & Token Queue */}
      {activeTab === 'queue' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
          {/* Active Serving Token Highlight */}
          <div style={{ background: '#0f172a', borderRadius: '14px', padding: '24px', color: '#fff', textAlign: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', color: '#38bdf8' }}>NOW SERVING</span>
            <div style={{ fontSize: '56px', fontWeight: 900, color: '#fff', margin: '14px 0' }}>
              {tokens.find(t => t.status === 'in_service')?.token_number || tokens[0]?.token_number || 'A-101'}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px', fontSize: '13px', color: '#cbd5e1' }}>
              Counter 02 • Blood Accession & Billing Desk
            </div>
            <button
              onClick={handleGenerateToken}
              style={{
                width: '100%',
                marginTop: '24px',
                padding: '12px',
                borderRadius: '8px',
                background: '#0284c7',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Issue New Walk-In Token
            </button>
          </div>

          {/* Waiting Queue Table */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: '#0f172a' }}>
              Tokens in Waiting Queue
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 16px' }}>Token #</th>
                  <th style={{ padding: '10px 16px' }}>Department / Desk</th>
                  <th style={{ padding: '10px 16px' }}>Status</th>
                  <th style={{ padding: '10px 16px' }}>Issued At</th>
                </tr>
              </thead>
              <tbody>
                {tokens.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                      No patients currently waiting in queue.
                    </td>
                  </tr>
                ) : (
                  tokens.map(tok => (
                    <tr key={tok.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 16px', fontWeight: 700, color: '#0f766e' }}>{tok.token_number}</td>
                      <td style={{ padding: '10px 16px' }}>{tok.department}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, background: '#eff6ff', color: '#1d4ed8' }}>
                          {tok.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', color: '#64748b' }}>{new Date(tok.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Book Home Collection */}
      {showBookingModal && (
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
          <div style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '520px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Dispatch Home Sample Collection</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              Assign a phlebotomist to collect blood samples at the patient's residence.
            </p>

            <form onSubmit={handleBookCollection}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Patient Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newBooking.patient_name}
                    onChange={e => setNewBooking({ ...newBooking, patient_name: e.target.value })}
                    placeholder="e.g. Ramesh Kulkarni"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Patient Phone *</label>
                  <input
                    type="tel"
                    required
                    value={newBooking.patient_phone}
                    onChange={e => setNewBooking({ ...newBooking, patient_phone: e.target.value })}
                    placeholder="+91 98201 55442"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Complete Home Address *</label>
                <textarea
                  rows={2}
                  required
                  value={newBooking.collection_address}
                  onChange={e => setNewBooking({ ...newBooking, collection_address: e.target.value })}
                  placeholder="Flat 402, Sunshine Heights, MG Road, Mumbai"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Scheduled Date/Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newBooking.scheduled_slot}
                    onChange={e => setNewBooking({ ...newBooking, scheduled_slot: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Assign Phlebotomist</label>
                  <select
                    value={newBooking.phlebotomist_id}
                    onChange={e => setNewBooking({ ...newBooking, phlebotomist_id: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                  >
                    {phlebotomists.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.current_status})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '6px', background: '#0f766e', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Dispatch Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Dispense Token */}
      {showTokenModal && (
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
          <div style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '400px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Dispense Token</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Select desk category for walk-in patient.</p>
            <div style={{ marginBottom: '20px' }}>
              <select
                value={tokenDept}
                onChange={e => setTokenDept(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff' }}
              >
                <option value="Phlebotomy">Phlebotomy (Blood Draw)</option>
                <option value="Billing">Billing & Test Registration</option>
                <option value="Report Collection">Report Handover Desk</option>
                <option value="Consultation">Pathologist Consultation</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowTokenModal(false)}
                style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateToken}
                style={{ padding: '8px 16px', borderRadius: '6px', background: '#0f766e', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                Print Token
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldServicesPage;
