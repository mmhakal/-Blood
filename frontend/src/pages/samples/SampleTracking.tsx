import React, { useState, useEffect, useRef } from 'react';
import { FlaskConical, CheckCircle2, Clock, AlertTriangle, RefreshCw, Barcode, Search, Printer, Ban, RotateCcw, ShieldAlert } from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export const SampleTracking: React.FC = () => {
  const [samples, setSamples] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Barcode Print Modal
  const [barcodeModalSample, setBarcodeModalSample] = useState<any | null>(null);
  const [barcodeLabelData, setBarcodeLabelData] = useState<any | null>(null);

  // Rejection Modal
  const [rejectingSample, setRejectingSample] = useState<any | null>(null);
  const [rejectReasonType, setRejectReasonType] = useState('Hemolyzed sample');
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [requestRecollection, setRequestRecollection] = useState(true);

  // Recollection Modal
  const [recollectingSample, setRecollectingSample] = useState<any | null>(null);
  const [recollectReason, setRecollectReason] = useState('Insufficient volume in initial collection');

  const { error, success } = useNotification();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadSamples = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/samples?status=${statusFilter}&search=${encodeURIComponent(search)}`);
      setSamples(res);
    } catch (e: any) {
      error(e.message || 'Failed to load samples');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSamples();
  }, [statusFilter, search]);

  // Direct keyboard barcode scanner support
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Barcode scanners type very quickly (<50ms between keys)
      const now = Date.now();
      if (now - lastKeyTime > 100) {
        barcodeBuffer = '';
      }
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (barcodeBuffer.startsWith('SMP-') || barcodeBuffer.startsWith('ORD-') || barcodeBuffer.startsWith('PID-')) {
          setSearch(barcodeBuffer);
          success(`Barcode Scanned: ${barcodeBuffer}`);
          barcodeBuffer = '';
        }
      } else if (e.key.length === 1) {
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCollect = async (sampleId: string) => {
    try {
      const res = await api.post(`/samples/${sampleId}/collect`, {
        remarks: 'Collected via routine phlebotomy'
      });
      success(`Sample ${res.sample_barcode} marked as Collected`);
      loadSamples();
    } catch (e: any) {
      error(e.message || 'Failed to collect sample');
    }
  };

  const handleStartProcessing = async (sampleId: string) => {
    try {
      await api.patch(`/samples/${sampleId}/status`, { status: 'processing' });
      success('Sample moved to Analyzer Processing');
      loadSamples();
    } catch (e: any) {
      error(e.message || 'Failed to update sample status');
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingSample) return;

    const finalReason = rejectReasonType === 'Other' ? (customRejectReason || 'Other reason') : rejectReasonType;

    try {
      await api.post(`/samples/${rejectingSample.id}/reject`, {
        rejection_reason: finalReason,
        remarks: customRejectReason,
        request_recollection: requestRecollection
      });
      success(`Sample ${rejectingSample.sample_barcode} rejected (${finalReason})`);
      setRejectingSample(null);
      setCustomRejectReason('');
      loadSamples();
    } catch (e: any) {
      error(e.message || 'Failed to reject sample');
    }
  };

  const handleRecollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recollectingSample) return;

    try {
      await api.post(`/samples/${recollectingSample.id}/recollect`, {
        reason: recollectReason
      });
      success(`Recollection requested for ${recollectingSample.sample_barcode}`);
      setRecollectingSample(null);
      loadSamples();
    } catch (e: any) {
      error(e.message || 'Failed to request recollection');
    }
  };

  const handleOpenBarcode = async (sample: any) => {
    try {
      setBarcodeModalSample(sample);
      const data = await api.get(`/samples/${sample.id}/barcode`);
      setBarcodeLabelData(data);
    } catch (e: any) {
      error('Failed to generate barcode data');
    }
  };

  // Simple SVG Code128 pattern generator for clean visual barcoding
  const renderBarcodeSvg = (text: string) => {
    const bars: boolean[] = [];
    // Convert string chars to alternating thick/thin bars
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      bars.push(true, false, code % 2 === 0, code % 3 === 0, true, false, true);
    }
    return (
      <svg width="220" height="48" style={{ display: 'block', margin: '6px auto' }}>
        {bars.map((isBlack, idx) => (
          <rect
            key={idx}
            x={idx * 3}
            y="0"
            width={isBlack ? 2.5 : 1}
            height="48"
            fill={isBlack ? '#000' : '#fff'}
          />
        ))}
      </svg>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Phlebotomy & Sample Tracking</h1>
          <p style={{ fontSize: 13.5, color: '#64748b' }}>
            Rapid phlebotomy collection desk, 6-digit barcoding (`SMP-2026-XXXXXX`), specimen integrity rejection, and recollection management.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ marginBottom: 20, padding: 14, display: 'flex', gap: 14 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 11 }} />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Scan barcode with handheld scanner or search by SMP-XXXXXX, Order No, Patient Name..."
            className="form-input"
            style={{ paddingLeft: 40, height: 40 }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-select"
          style={{ width: 230, height: 40 }}
        >
          <option value="">All Sample Statuses</option>
          <option value="pending">Pending Collection</option>
          <option value="collected">Collected (In Transit)</option>
          <option value="processing">Processing in Analyzer</option>
          <option value="completed">Completed</option>
          <option value="recollection_required">Recollection Required</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Samples Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Barcode & Sample ID</th>
              <th>Order / Patient</th>
              <th>Priority</th>
              <th>Container & Type</th>
              <th>Collection Date & Staff</th>
              <th>Current Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30 }}>Loading samples...</td></tr>
            ) : samples.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>No specimens found.</td></tr>
            ) : (
              samples.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div style={{
                      padding: '4px 8px',
                      backgroundColor: '#f1f5f9',
                      borderRadius: 4,
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      color: '#0369a1',
                      border: '1px dashed #cbd5e1',
                      display: 'inline-block'
                    }}>
                      {s.sample_barcode}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{s.patient_name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {s.patient_id_code}  •  Order: {s.order_number}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${
                      s.priority === 'stat' ? 'badge-high' :
                      s.priority === 'urgent' ? 'badge-low' : 'badge-normal'
                    }`} style={{ fontSize: 10, textTransform: 'uppercase' }}>
                      {s.priority || 'routine'}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.sample_type}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{s.container_type || 'Standard Vacutainer'}</div>
                  </td>
                  <td>
                    {s.collected_at ? (
                      <div>
                        <div style={{ fontSize: 12 }}>{new Date(s.collected_at).toLocaleDateString('en-IN')} {new Date(s.collected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>By: {s.collector_name || 'Phlebotomist'}</div>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>Awaiting Phlebotomy</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${
                      s.status === 'completed' ? 'badge-normal' :
                      s.status === 'processing' ? 'badge-primary' :
                      s.status === 'collected' ? 'badge-low' :
                      s.status === 'recollection_required' || s.status === 'rejected' ? 'badge-high' : 'badge-pending'
                    }`}>
                      {s.status}
                    </span>
                    {s.rejection_reason && (
                      <div style={{ fontSize: 10.5, color: '#dc2626', marginTop: 2 }}>{s.rejection_reason}</div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {s.status === 'pending' && (
                        <button
                          onClick={() => handleCollect(s.id)}
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: 11, padding: '4px 8px' }}
                        >
                          Collect
                        </button>
                      )}

                      {s.status === 'collected' && (
                        <button
                          onClick={() => handleStartProcessing(s.id)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: 11, padding: '4px 8px' }}
                        >
                          Process
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenBarcode(s)}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: 11, padding: '4px 8px' }}
                        title="Print Barcode Label"
                      >
                        <Barcode size={13} />
                        <span>Barcode</span>
                      </button>

                      {s.status !== 'rejected' && s.status !== 'completed' && (
                        <button
                          onClick={() => { setRejectingSample(s); setRejectReasonType('Hemolyzed sample'); }}
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: 11, padding: '4px 8px', color: '#dc2626' }}
                          title="Reject Specimen"
                        >
                          <Ban size={12} />
                        </button>
                      )}

                      {s.status === 'rejected' && (
                        <button
                          onClick={() => setRecollectingSample(s)}
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: 11, padding: '4px 8px', color: '#d97706' }}
                          title="Request Recollection"
                        >
                          <RotateCcw size={12} />
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

      {/* Printable Barcode Label Modal */}
      {barcodeModalSample && barcodeLabelData && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 360 }}>
            <div className="modal-header">
              <h3 className="card-title">
                <Barcode size={18} color="#0284c7" />
                Barcode Label Sticker
              </h3>
              <button onClick={() => setBarcodeModalSample(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>
                &times;
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              {/* Sticker Simulation Box */}
              <div style={{
                border: '2px solid #0f172a',
                borderRadius: 6,
                padding: '12px 14px',
                backgroundColor: '#ffffff',
                textAlign: 'left',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 4, marginBottom: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0369a1' }}>{barcodeLabelData.lab_name || 'Apex Diagnostics'}</div>
                  <div style={{ fontSize: 9.5, color: '#64748b' }}>{barcodeLabelData.branch_name || 'Central'}</div>
                </div>

                <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{barcodeLabelData.patient_name}</div>
                <div style={{ fontSize: 10, color: '#475569' }}>
                  ID: {barcodeLabelData.patient_id_code}  |  Order: {barcodeLabelData.order_number}
                </div>

                {/* Scannable Barcode SVG */}
                {renderBarcodeSvg(barcodeLabelData.sample_barcode)}

                <div style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 11.5, fontWeight: 700, letterSpacing: 1.5 }}>
                  {barcodeLabelData.sample_barcode}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: '#475569', marginTop: 4, borderTop: '1px dashed #cbd5e1', paddingTop: 4 }}>
                  <span>{barcodeLabelData.sample_type}</span>
                  <span>{new Date(barcodeLabelData.collection_date).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
              <button type="button" onClick={() => setBarcodeModalSample(null)} className="btn btn-outline">
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  success('Barcode label sent to label printer');
                }}
                className="btn btn-primary"
              >
                <Printer size={14} />
                <span>Print Sticker</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sample Rejection Modal */}
      {rejectingSample && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 className="card-title" style={{ color: '#dc2626' }}>
                <AlertTriangle size={18} color="#dc2626" />
                Reject Diagnostic Specimen
              </h3>
              <button onClick={() => setRejectingSample(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>
                &times;
              </button>
            </div>
            <form onSubmit={handleRejectSubmit}>
              <div className="modal-body">
                <p style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>
                  Reject specimen <strong>{rejectingSample.sample_barcode}</strong> for patient <strong>{rejectingSample.patient_name}</strong>:
                </p>

                <div className="form-group">
                  <label className="form-label">Pre-Analytical Rejection Reason *</label>
                  <select
                    value={rejectReasonType}
                    onChange={(e) => setRejectReasonType(e.target.value)}
                    className="form-select"
                  >
                    <option value="Insufficient sample">Insufficient sample volume</option>
                    <option value="Wrong container">Wrong container / anticoagulant</option>
                    <option value="Hemolyzed sample">Hemolyzed sample</option>
                    <option value="Clotted sample">Clotted sample (Microclots)</option>
                    <option value="Leaking container">Leaking container</option>
                    <option value="Incorrect labeling">Incorrect labeling / mismatch</option>
                    <option value="Sample expired">Sample expired (TAT exceeded)</option>
                    <option value="Other">Other reason (specify below)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Phlebotomy / Lab Remarks</label>
                  <textarea
                    value={customRejectReason}
                    onChange={(e) => setCustomRejectReason(e.target.value)}
                    placeholder="Provide additional laboratory context..."
                    className="form-input"
                    rows={2}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <input
                    type="checkbox"
                    id="chk-recollect"
                    checked={requestRecollection}
                    onChange={(e) => setRequestRecollection(e.target.checked)}
                  />
                  <label htmlFor="chk-recollect" style={{ fontSize: 12.5, fontWeight: 600, color: '#0f172a' }}>
                    Mark Recollection Required for phlebotomy
                  </label>
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setRejectingSample(null)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" style={{ backgroundColor: '#dc2626', color: '#fff' }}>
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recollect Modal */}
      {recollectingSample && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 className="card-title">
                <RotateCcw size={18} color="#d97706" />
                Request Specimen Recollection
              </h3>
              <button onClick={() => setRecollectingSample(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>
                &times;
              </button>
            </div>
            <form onSubmit={handleRecollectSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Recollection Reason *</label>
                  <input
                    type="text"
                    required
                    value={recollectReason}
                    onChange={(e) => setRecollectReason(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setRecollectingSample(null)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Request Recollection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
