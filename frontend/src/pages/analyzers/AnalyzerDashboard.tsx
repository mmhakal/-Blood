import React, { useState, useEffect } from 'react';
import {
  Activity, Cpu, Wifi, WifiOff, RefreshCw, Send, CheckCircle2,
  AlertTriangle, Wrench, ShieldAlert, FileText, Plus, Search,
  Sliders, ArrowUpRight, Clock, Database, Layers, Radio
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export const AnalyzerDashboard: React.FC = () => {
  const [analyzers, setAnalyzers] = useState<any[]>([]);
  const [selectedAnalyzer, setSelectedAnalyzer] = useState<any>(null);
  const [mappings, setMappings] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [importedResults, setImportedResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'analyzers' | 'mappings' | 'simulator' | 'logs'>('analyzers');
  const { error, success } = useNotification();

  // Packet Simulator State
  const [simMessage, setSimMessage] = useState('');
  const [simProtocol, setSimProtocol] = useState<'astm' | 'hl7' | 'json'>('astm');
  const [simulating, setSimulating] = useState(false);
  const [simResponse, setSimResponse] = useState<any>(null);

  // New Mapping Modal State
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [newMapping, setNewMapping] = useState({
    test_id: '',
    parameter_id: '',
    analyzer_test_code: '',
    analyzer_parameter_name: '',
    loinc_code: '',
    unit: '',
    decimal_precision: 2,
    conversion_formula: ''
  });
  const [testsList, setTestsList] = useState<any[]>([]);

  useEffect(() => {
    loadAnalyzers();
    loadTests();
  }, []);

  const loadAnalyzers = async () => {
    setLoading(true);
    try {
      const [anlRes, msgRes, impRes] = await Promise.all([
        api.get('/analyzers'),
        api.get('/analyzers/messages/logs').catch(() => []),
        api.get('/analyzers/results/imported').catch(() => [])
      ]);
      setAnalyzers(anlRes || []);
      setMessages(msgRes || []);
      setImportedResults(impRes || []);
      if (anlRes?.length > 0 && !selectedAnalyzer) {
        selectAnalyzer(anlRes[0]);
      }
    } catch (err: any) {
      error(err.message || 'Failed to load analyzer network');
    } finally {
      setLoading(false);
    }
  };

  const loadTests = async () => {
    try {
      const res = await api.get('/tests');
      setTestsList(res || []);
    } catch (e) {
      // ignore
    }
  };

  const selectAnalyzer = async (analyzer: any) => {
    setSelectedAnalyzer(analyzer);
    try {
      const res = await api.get(`/analyzers/${analyzer.id}/mappings`);
      setMappings(res || []);
    } catch (e) {
      setMappings([]);
    }
  };

  const handleTestConnection = async (id: string) => {
    try {
      const res = await api.post(`/analyzers/${id}/test-connection`, {});
      success(res.message || 'Handshake successful');
      loadAnalyzers();
    } catch (err: any) {
      error(err.message || 'Handshake failed');
    }
  };

  const handleSimulatePacket = async () => {
    if (!selectedAnalyzer || !simMessage.trim()) {
      error('Please select an analyzer and provide a raw message frame');
      return;
    }

    setSimulating(true);
    setSimResponse(null);
    try {
      const res = await api.post(`/analyzers/${selectedAnalyzer.id}/simulate-packet`, {
        raw_message: simMessage,
        protocol_hint: simProtocol
      });
      setSimResponse(res);
      success(res.message || 'Packet simulated successfully');
      loadAnalyzers();
    } catch (err: any) {
      error(err.message || 'Simulation error');
    } finally {
      setSimulating(false);
    }
  };

  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnalyzer) return;

    try {
      await api.post(`/analyzers/${selectedAnalyzer.id}/mappings`, newMapping);
      success('Test mapping configured');
      setShowMappingModal(false);
      selectAnalyzer(selectedAnalyzer);
    } catch (err: any) {
      error(err.message || 'Failed to save mapping');
    }
  };

  const loadPresetSample = (type: 'astm' | 'hl7' | 'json') => {
    setSimProtocol(type);
    if (type === 'astm') {
      setSimMessage([
        'H|\\^&|||XN-550^Sysmex|||||||P|1',
        'P|1||PID-2026-0001||Miller^Johnathan',
        'O|1|SMP-2026-0001||^^^CBC',
        'R|1|^^^HGB|14.2|g/dL|N|||F',
        'R|2|^^^WBC|7.50|10^3/uL|N|||F',
        'R|3|^^^PLT|245|10^3/uL|N|||F',
        'L|1|N'
      ].join('\n'));
    } else if (type === 'hl7') {
      setSimMessage([
        'MSH|^~\\&|COBAS311|ROCHE|MEDIFLOW_LIS|APEX|20260914120000||ORU^R01|MSG-9021|P|2.5',
        'PID|1||PID-2026-0001||Miller^Johnathan',
        'OBR|1|ORD-2026-0001|SMP-2026-0001|^^^BIOCHEMISTRY',
        'OBX|1|NM|^^^GLUC^Glucose||98.5|mg/dL|70-100|N|||F',
        'OBX|2|NM|^^^CREA^Creatinine||1.05|mg/dL|0.7-1.3|N|||F'
      ].join('\r\n'));
    } else {
      setSimMessage(JSON.stringify([
        { barcode: 'SMP-2026-0001', test_code: 'HGB', value: 14.2, unit: 'g/dL', flag: 'normal' },
        { barcode: 'SMP-2026-0001', test_code: 'WBC', value: 7.5, unit: '10^3/uL', flag: 'normal' }
      ], null, 2));
    }
  };

  const onlineCount = analyzers.filter(a => a.status === 'online').length;
  const maintCount = analyzers.filter(a => a.status === 'maintenance').length;
  const offlineCount = analyzers.filter(a => a.status === 'offline' || a.status === 'error').length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Analyzer Management & LIS Automation</h1>
          <p style={{ fontSize: 13.5, color: '#64748b', marginTop: 4 }}>
            Bidirectional analyzer interfacing, ASTM/HL7 protocol drivers, parameter translation, and automated result imports.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={loadAnalyzers} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={15} />
            <span>Refresh Network</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="kpi-card" style={{ borderLeft: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Total Connected</span>
            <Cpu size={18} color="#0284c7" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', marginTop: 8 }}>{analyzers.length}</div>
          <span style={{ fontSize: 12, color: '#64748b' }}>Automated Instruments</span>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Online & Ready</span>
            <Wifi size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981', marginTop: 8 }}>{onlineCount}</div>
          <span style={{ fontSize: 12, color: '#10b981' }}>Active Heartbeat Telemetry</span>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Maintenance / Calibration</span>
            <Wrench size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b', marginTop: 8 }}>{maintCount}</div>
          <span style={{ fontSize: 12, color: '#f59e0b' }}>Service Mode Active</span>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #6366f1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Imported Results</span>
            <Activity size={18} color="#6366f1" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#6366f1', marginTop: 8 }}>{importedResults.length}</div>
          <span style={{ fontSize: 12, color: '#6366f1' }}>Processed Observations</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab('analyzers')}
          className={`tab-btn ${activeTab === 'analyzers' ? 'active' : ''}`}
          style={{ padding: '10px 18px', fontWeight: 600, borderBottom: activeTab === 'analyzers' ? '2px solid #0284c7' : 'none', color: activeTab === 'analyzers' ? '#0284c7' : '#64748b' }}
        >
          Analyzers Network
        </button>
        <button
          onClick={() => setActiveTab('mappings')}
          className={`tab-btn ${activeTab === 'mappings' ? 'active' : ''}`}
          style={{ padding: '10px 18px', fontWeight: 600, borderBottom: activeTab === 'mappings' ? '2px solid #0284c7' : 'none', color: activeTab === 'mappings' ? '#0284c7' : '#64748b' }}
        >
          Parameter Mappings ({mappings.length})
        </button>
        <button
          onClick={() => setActiveTab('simulator')}
          className={`tab-btn ${activeTab === 'simulator' ? 'active' : ''}`}
          style={{ padding: '10px 18px', fontWeight: 600, borderBottom: activeTab === 'simulator' ? '2px solid #0284c7' : 'none', color: activeTab === 'simulator' ? '#0284c7' : '#64748b' }}
        >
          ASTM / HL7 Packet Simulator
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          style={{ padding: '10px 18px', fontWeight: 600, borderBottom: activeTab === 'logs' ? '2px solid #0284c7' : 'none', color: activeTab === 'logs' ? '#0284c7' : '#64748b' }}
        >
          Communication Logs ({messages.length})
        </button>
      </div>

      {/* TAB 1: ANALYZERS GRID */}
      {activeTab === 'analyzers' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {analyzers.map((a) => {
            const isOnline = a.status === 'online';
            const isMaint = a.status === 'maintenance';
            return (
              <div
                key={a.id}
                onClick={() => selectAnalyzer(a)}
                className="card"
                style={{
                  border: selectedAnalyzer?.id === a.id ? '2px solid #0284c7' : '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 20,
                  cursor: 'pointer',
                  backgroundColor: selectedAnalyzer?.id === a.id ? '#f0f9ff' : '#fff',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase',
                      backgroundColor: isOnline ? '#dcfce7' : (isMaint ? '#fef3c7' : '#fee2e2'),
                      color: isOnline ? '#15803d' : (isMaint ? '#b45309' : '#b91c1c')
                    }}>
                      {a.status}
                    </span>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginTop: 8 }}>{a.name}</h3>
                    <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{a.manufacturer} — {a.model}</p>
                  </div>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    backgroundColor: isOnline ? '#e0f2fe' : '#f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7'
                  }}>
                    <Radio size={20} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0', fontSize: 12 }}>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Protocol:</span>
                    <div style={{ fontWeight: 600, color: '#334155' }}>{a.protocol.toUpperCase()} ({a.connection_type.toUpperCase()})</div>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Department:</span>
                    <div style={{ fontWeight: 600, color: '#334155' }}>{a.department}</div>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>IP Address:</span>
                    <div style={{ fontWeight: 600, color: '#334155' }}>{a.ip_address || 'Serial Com Port'}:{a.port || 'COM1'}</div>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Latency:</span>
                    <div style={{ fontWeight: 600, color: '#10b981' }}>{a.latency_ms || 14} ms</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px dashed #e2e8f0' }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    {a.mapping_count || 0} Parameters Mapped
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleTestConnection(a.id); }}
                    className="btn-secondary"
                    style={{ fontSize: 12, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <RefreshCw size={12} /> Test Ping
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: PARAMETER MAPPINGS */}
      {activeTab === 'mappings' && (
        <div className="card" style={{ padding: 24, borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Test Mappings for {selectedAnalyzer?.name || 'Selected Analyzer'}
              </h3>
              <p style={{ fontSize: 13, color: '#64748b' }}>
                Translate instrument parameter codes (e.g. HGB, GLUC) to standardized LIS test parameters and reference ranges.
              </p>
            </div>
            <button
              onClick={() => setShowMappingModal(true)}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
            >
              <Plus size={15} /> Add Parameter Mapping
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: 12, color: '#64748b' }}>Analyzer Code</th>
                  <th style={{ padding: 12, color: '#64748b' }}>Instrument Label</th>
                  <th style={{ padding: 12, color: '#64748b' }}>LIS Test & Parameter</th>
                  <th style={{ padding: 12, color: '#64748b' }}>LOINC Code</th>
                  <th style={{ padding: 12, color: '#64748b' }}>Unit</th>
                  <th style={{ padding: 12, color: '#64748b' }}>Precision</th>
                  <th style={{ padding: 12, color: '#64748b' }}>Formula</th>
                </tr>
              </thead>
              <tbody>
                {mappings.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>
                      No parameter mappings configured for this analyzer. Click "Add Parameter Mapping" to create one.
                    </td>
                  </tr>
                ) : (
                  mappings.map((m) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: 12, fontWeight: 700, color: '#0284c7' }}>{m.analyzer_test_code}</td>
                      <td style={{ padding: 12, color: '#334155' }}>{m.analyzer_parameter_name || '-'}</td>
                      <td style={{ padding: 12 }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{m.test_name}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{m.param_name}</div>
                      </td>
                      <td style={{ padding: 12, color: '#64748b' }}>{m.loinc_code || '-'}</td>
                      <td style={{ padding: 12, color: '#334155' }}>{m.unit || m.system_unit || '-'}</td>
                      <td style={{ padding: 12, color: '#64748b' }}>{m.decimal_precision} decimals</td>
                      <td style={{ padding: 12, color: '#64748b', fontFamily: 'monospace' }}>{m.conversion_formula || '1:1 Direct'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PACKET SIMULATOR */}
      {activeTab === 'simulator' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
          <div className="card" style={{ padding: 24, borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Simulate Analyzer Transmission</h3>
                <p style={{ fontSize: 13, color: '#64748b' }}>Test ASTM, HL7, or JSON packet parsing and result ingestion into LIS.</p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => loadPresetSample('astm')} className="btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }}>Sysmex ASTM</button>
                <button onClick={() => loadPresetSample('hl7')} className="btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }}>Cobas HL7</button>
                <button onClick={() => loadPresetSample('json')} className="btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }}>JSON API</button>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Target Analyzer</label>
              <select
                value={selectedAnalyzer?.id || ''}
                onChange={(e) => {
                  const found = analyzers.find(a => a.id === e.target.value);
                  if (found) selectAnalyzer(found);
                }}
                className="form-input"
              >
                {analyzers.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.protocol.toUpperCase()})</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Raw Frame Message Data</label>
              <textarea
                rows={12}
                value={simMessage}
                onChange={(e) => setSimMessage(e.target.value)}
                placeholder="Paste raw ASTM or HL7 ORU_R01 message string..."
                className="form-input"
                style={{ fontFamily: 'Consolas, monospace', fontSize: 12.5, lineHeight: 1.4 }}
              />
            </div>

            <button
              onClick={handleSimulatePacket}
              disabled={simulating}
              className="btn-primary"
              style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 12 }}
            >
              <Send size={16} />
              <span>{simulating ? 'Ingesting & Mapping Packet...' : 'Simulate & Ingest Packet'}</span>
            </button>
          </div>

          {/* Result Output Preview */}
          <div className="card" style={{ padding: 24, borderRadius: 12, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Ingestion Response & Matched Results</h3>
            {simResponse ? (
              <div>
                <div style={{ padding: 12, backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: '#065f46', fontSize: 13 }}>{simResponse.message}</div>
                  <div style={{ fontSize: 12, color: '#047857', marginTop: 2 }}>
                    Protocol: {simResponse.protocol} | Imported Observations: {simResponse.imported_count} | Matched Orders: {simResponse.matched_orders}
                  </div>
                </div>

                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>Extracted Observations</h4>
                <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                        <th style={{ padding: 6 }}>Barcode</th>
                        <th style={{ padding: 6 }}>Test</th>
                        <th style={{ padding: 6 }}>Value</th>
                        <th style={{ padding: 6 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simResponse.results?.map((r: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: 6, fontWeight: 600 }}>{r.barcode}</td>
                          <td style={{ padding: 6, color: '#0284c7' }}>{r.testCode}</td>
                          <td style={{ padding: 6, fontWeight: 700 }}>{r.value} {r.unit}</td>
                          <td style={{ padding: 6 }}>
                            <span style={{
                              padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                              backgroundColor: r.matchStatus === 'imported' ? '#dcfce7' : '#fef3c7',
                              color: r.matchStatus === 'imported' ? '#15803d' : '#b45309'
                            }}>
                              {r.matchStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', textAlign: 'center', padding: 30 }}>
                <Layers size={40} strokeWidth={1.5} style={{ marginBottom: 12 }} />
                <p style={{ fontSize: 13 }}>Click "Simulate & Ingest Packet" to view live parsed observations, parameter mapping validations, and auto-matching results.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: COMMUNICATION LOGS */}
      {activeTab === 'logs' && (
        <div className="card" style={{ padding: 24, borderRadius: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Live Analyzer Communication Message Logs</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                  <th style={{ padding: 10 }}>Timestamp</th>
                  <th style={{ padding: 10 }}>Analyzer</th>
                  <th style={{ padding: 10 }}>Direction</th>
                  <th style={{ padding: 10 }}>Protocol</th>
                  <th style={{ padding: 10 }}>Payload Preview</th>
                  <th style={{ padding: 10 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: 10, color: '#64748b' }}>{new Date(m.created_at).toLocaleString()}</td>
                    <td style={{ padding: 10, fontWeight: 600, color: '#0f172a' }}>{m.analyzer_name}</td>
                    <td style={{ padding: 10 }}>
                      <span style={{
                        padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                        backgroundColor: m.direction === 'inbound' ? '#e0f2fe' : '#f3e8ff',
                        color: m.direction === 'inbound' ? '#0369a1' : '#7e22ce'
                      }}>
                        {m.direction.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: 10, fontWeight: 600 }}>{m.protocol.toUpperCase()}</td>
                    <td style={{ padding: 10, fontFamily: 'monospace', maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.raw_message}
                    </td>
                    <td style={{ padding: 10 }}>
                      <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d' }}>
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
