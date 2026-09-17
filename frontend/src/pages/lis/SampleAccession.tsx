import React, { useState, useEffect } from 'react';
import {
  Scan, TestTube2, Layers, Snowflake, Thermometer, Plus, RefreshCw,
  Search, CheckCircle2, AlertCircle, Printer, Split, MapPin, Barcode,
  Check, X, Grid, ShieldAlert
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export const SampleAccession: React.FC = () => {
  const [samples, setSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSample, setSelectedSample] = useState<any>(null);
  const { error, success } = useNotification();

  // Slotting state
  const [selectedRack, setSelectedRack] = useState('Rack-A');
  const [selectedPosition, setSelectedPosition] = useState<number>(1);
  const [selectedStorage, setSelectedStorage] = useState('Cold Storage Unit 1');
  const [selectedTemp, setSelectedTemp] = useState('2-8°C');
  const [accessioning, setAccessioning] = useState(false);

  // Aliquot modal
  const [showAliquotModal, setShowAliquotModal] = useState(false);
  const [aliquotSample, setAliquotSample] = useState<any>(null);
  const [aliquotVolume, setAliquotVolume] = useState('1.0');
  const [aliquotTube, setAliquotTube] = useState('Microtube 1.5 mL');
  const [generatingAliquot, setGeneratingAliquot] = useState(false);
  const [createdAliquots, setCreatedAliquots] = useState<any[]>([]);

  useEffect(() => {
    loadSamples();
  }, []);

  const loadSamples = async (query?: string) => {
    setLoading(true);
    try {
      const url = query ? `/lis-rules/accession?barcode=${encodeURIComponent(query)}` : '/lis-rules/accession';
      const res = await api.get(url);
      setSamples(res || []);
      if (res?.length > 0 && !selectedSample) {
        setSelectedSample(res[0]);
      }
    } catch (err: any) {
      error(err.message || 'Failed to load samples for accession');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadSamples(searchQuery);
  };

  const handleAccessionSubmit = async () => {
    if (!selectedSample) {
      error('Please select a sample to accession');
      return;
    }

    setAccessioning(true);
    try {
      await api.post('/lis-rules/accession', {
        sample_id: selectedSample.id,
        rack_number: selectedRack,
        position_in_rack: selectedPosition,
        storage_refrigerator: selectedStorage,
        storage_temp: selectedTemp,
        status: 'processing'
      });
      success(`Sample ${selectedSample.sample_barcode} accessioned into ${selectedRack} [Slot #${selectedPosition}]`);
      loadSamples(searchQuery);
    } catch (err: any) {
      error(err.message || 'Failed to accession sample');
    } finally {
      setAccessioning(false);
    }
  };

  const handleCreateAliquot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aliquotSample) return;

    setGeneratingAliquot(true);
    try {
      const res = await api.post('/lis-rules/aliquots', {
        parent_sample_id: aliquotSample.id,
        aliquot_type: 'serum_aliquot',
        volume_ml: parseFloat(aliquotVolume || '1.0'),
        tube_type: aliquotTube
      });
      success(`Aliquot barcode generated: ${res.aliquot_barcode}`);
      setCreatedAliquots(prev => [res, ...prev]);
      setShowAliquotModal(false);
      loadSamples(searchQuery);
    } catch (err: any) {
      error(err.message || 'Failed to generate aliquot');
    } finally {
      setGeneratingAliquot(false);
    }
  };

  const openAliquotFor = (sample: any) => {
    setAliquotSample(sample);
    setShowAliquotModal(true);
  };

  // Build rack occupancy map for selectedRack
  const occupiedSlots = new Set<number>();
  samples.forEach(s => {
    if (s.rack_number === selectedRack && s.position_in_rack) {
      occupiedSlots.add(Number(s.position_in_rack));
    }
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ padding: 8, borderRadius: 8, background: '#e0f2fe', color: '#0284c7' }}>
              <Scan size={24} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Sample Accession & Specimen Slotting</h1>
          </div>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            Barcode intake, physical rack & grid well allocation, cold-chain temperature verification, and child aliquoting.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            id="btn-refresh-accession"
            onClick={() => loadSamples(searchQuery)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, color: '#475569', cursor: 'pointer', fontWeight: 500 }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Barcode Search Intake */}
      <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0284c7', fontWeight: 600 }}>
            <Barcode size={22} />
            <span>Specimen Intake:</span>
          </div>
          <input
            id="input-accession-barcode-search"
            type="text"
            placeholder="Scan tube barcode (e.g. SMP-82910) or Order #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, minWidth: '280px', padding: '10px 16px', border: '2px solid #cbd5e1', borderRadius: 8, fontSize: 15, fontFamily: 'monospace' }}
          />
          <button
            id="btn-search-accession"
            type="submit"
            style={{ padding: '10px 20px', background: '#0284c7', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Search size={16} /> Scan / Locate
          </button>
        </form>
      </div>

      {/* Main 2-Column Accession Workbench */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1fr) 2fr', gap: 24, marginBottom: 24 }}>
        {/* Left Column: Specimen Details & Storage Assignment */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TestTube2 size={18} color="#0284c7" /> Selected Specimen
          </h3>

          {selectedSample ? (
            <div>
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                    {selectedSample.sample_barcode}
                  </span>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    background: selectedSample.status === 'processing' ? '#dbeafe' : '#fef3c7',
                    color: selectedSample.status === 'processing' ? '#1d4ed8' : '#b45309'
                  }}>
                    {selectedSample.status}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#334155', fontWeight: 600 }}>{selectedSample.patient_name}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {selectedSample.gender}, {selectedSample.age}y | Order: {selectedSample.order_number}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Sample Type: <strong style={{ color: '#334155' }}>{selectedSample.sample_type || 'Serum / Whole Blood'}</strong>
                </div>
              </div>

              {/* Physical Location Selector */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Target Storage Unit
                </label>
                <select
                  id="select-storage-unit"
                  value={selectedStorage}
                  onChange={(e) => setSelectedStorage(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, background: '#fff', marginBottom: 12 }}
                >
                  <option value="Cold Storage Unit 1">Cold Storage Unit 1 (Central)</option>
                  <option value="Deep Freeze Unit -20C">Deep Freeze Unit -20°C</option>
                  <option value="Ambient Specimen Rack">Ambient Specimen Rack (18-25°C)</option>
                </select>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                      Target Rack
                    </label>
                    <select
                      id="select-rack-id"
                      value={selectedRack}
                      onChange={(e) => setSelectedRack(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, background: '#fff' }}
                    >
                      <option value="Rack-A">Rack A (Hematology)</option>
                      <option value="Rack-B">Rack B (Biochemistry)</option>
                      <option value="Rack-C">Rack C (Immunology)</option>
                      <option value="Rack-STAT">Rack STAT (Emergency)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                      Storage Temp
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#f1f5f9', borderRadius: 8, fontSize: 13, color: '#334155' }}>
                      <Thermometer size={16} color="#0284c7" />
                      <span>{selectedTemp}</span>
                    </div>
                  </div>
                </div>

                <div style={{ padding: 12, background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#1e40af', fontWeight: 600, marginBottom: 4 }}>
                    Current Well Target:
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1d4ed8' }}>
                    {selectedRack} — Well Position #{selectedPosition}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    id="btn-confirm-accession"
                    onClick={handleAccessionSubmit}
                    disabled={accessioning}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: '#0284c7',
                      border: 'none',
                      borderRadius: 8,
                      color: '#fff',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <Check size={16} /> {accessioning ? 'Slotting...' : 'Slot & Accession'}
                  </button>

                  <button
                    id="btn-open-aliquot"
                    onClick={() => openAliquotFor(selectedSample)}
                    style={{
                      padding: '10px 14px',
                      background: '#fff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      color: '#475569',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Split size={15} /> Aliquot
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
              Select a specimen from the list to view accession properties.
            </div>
          )}
        </div>

        {/* Right Column: Interactive Visual Rack Grid */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Grid size={18} color="#0284c7" /> Visual Rack Layout: {selectedRack}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#e2e8f0' }}></div>
                <span style={{ color: '#64748b' }}>Empty Well</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }}></div>
                <span style={{ color: '#64748b' }}>Occupied</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#0284c7' }}></div>
                <span style={{ color: '#0284c7', fontWeight: 600 }}>Selected Well</span>
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(10, 1fr)',
            gap: 10,
            padding: 16,
            background: '#f8fafc',
            borderRadius: 12,
            border: '1px solid #e2e8f0'
          }}>
            {Array.from({ length: 40 }, (_, idx) => {
              const pos = idx + 1;
              const isOccupied = occupiedSlots.has(pos);
              const isSelected = selectedPosition === pos;

              return (
                <button
                  key={pos}
                  id={`rack-pos-${pos}`}
                  onClick={() => !isOccupied && setSelectedPosition(pos)}
                  disabled={isOccupied}
                  style={{
                    aspectRatio: '1',
                    borderRadius: '50%',
                    border: isSelected ? '3px solid #0284c7' : '1px solid #cbd5e1',
                    background: isSelected ? '#0284c7' : isOccupied ? '#fee2e2' : '#fff',
                    color: isSelected ? '#fff' : isOccupied ? '#b91c1c' : '#475569',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: isOccupied ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isSelected ? '0 0 10px rgba(2, 132, 199, 0.4)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                  title={isOccupied ? `Slot ${pos} (Occupied)` : `Slot ${pos} (Available)`}
                >
                  {pos}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontSize: 13, color: '#64748b' }}>
            <span>Capacity: <strong>40 Wells</strong></span>
            <span>Occupied: <strong style={{ color: '#b91c1c' }}>{occupiedSlots.size}</strong></span>
            <span>Available: <strong style={{ color: '#16a34a' }}>{40 - occupiedSlots.size}</strong></span>
          </div>
        </div>
      </div>

      {/* Accessioned Samples Feed */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#1e293b' }}>
            Accession Activity Stream ({samples.length})
          </h3>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>
              <th style={{ padding: '12px 16px' }}>Sample Barcode</th>
              <th style={{ padding: '12px 16px' }}>Patient & Order</th>
              <th style={{ padding: '12px 16px' }}>Current Location</th>
              <th style={{ padding: '12px 16px' }}>Temperature</th>
              <th style={{ padding: '12px 16px' }}>Aliquots</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {samples.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  No samples in accession queue.
                </td>
              </tr>
            ) : (
              samples.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setSelectedSample(s)}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    background: selectedSample?.id === s.id ? '#f0f9ff' : '#fff'
                  }}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#0284c7', fontFamily: 'monospace' }}>{s.sample_barcode}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.sample_type}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{s.patient_name}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Order: {s.order_number}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {s.rack_number ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155' }}>
                        <MapPin size={14} color="#0284c7" />
                        <span style={{ fontWeight: 600 }}>{s.rack_number}</span>
                        <span style={{ fontSize: 12, color: '#64748b' }}>[Slot #{s.position_in_rack}]</span>
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Pending Slotting</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Snowflake size={14} color="#0284c7" />
                      <span>{s.storage_temp || '2-8°C'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      background: s.aliquot_count > 0 ? '#e0f2fe' : '#f1f5f9',
                      color: s.aliquot_count > 0 ? '#0369a1' : '#64748b'
                    }}>
                      {s.aliquot_count || 0} Child tubes
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      background: s.status === 'processing' ? '#dcfce7' : '#fef3c7',
                      color: s.status === 'processing' ? '#15803d' : '#b45309'
                    }}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <button
                      id={`btn-row-aliquot-${s.id}`}
                      onClick={(e) => { e.stopPropagation(); openAliquotFor(s); }}
                      style={{
                        padding: '6px 12px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#0284c7',
                        cursor: 'pointer'
                      }}
                    >
                      + Aliquot
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: CHILD ALIQUOT GENERATOR */}
      {showAliquotModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: '520px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1e293b' }}>Generate Child Aliquot</h2>
              <button onClick={() => setShowAliquotModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAliquot} style={{ padding: 24 }}>
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#64748b' }}>Parent Specimen:</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0284c7', fontFamily: 'monospace' }}>
                  {aliquotSample?.sample_barcode}
                </div>
                <div style={{ fontSize: 13, color: '#334155' }}>
                  {aliquotSample?.patient_name} — {aliquotSample?.sample_type}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Volume (mL)
                  </label>
                  <input
                    id="input-aliquot-vol"
                    type="number"
                    step="0.1"
                    required
                    value={aliquotVolume}
                    onChange={(e) => setAliquotVolume(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Tube Container Type
                  </label>
                  <select
                    id="select-aliquot-tube"
                    value={aliquotTube}
                    onChange={(e) => setAliquotTube(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, background: '#fff' }}
                  >
                    <option value="Microtube 1.5 mL">Microtube 1.5 mL</option>
                    <option value="Cryovial 2.0 mL">Cryovial 2.0 mL</option>
                    <option value="Conical Tube 15 mL">Conical Tube 15 mL</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => setShowAliquotModal(false)}
                  style={{ padding: '10px 18px', background: '#f1f5f9', border: 'none', borderRadius: 8, color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-create-aliquot"
                  type="submit"
                  disabled={generatingAliquot}
                  style={{ padding: '10px 20px', background: '#0284c7', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  {generatingAliquot ? 'Generating...' : 'Print & Create Aliquot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
