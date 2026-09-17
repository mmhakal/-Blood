import React, { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, DollarSign, Users, Activity, Stethoscope,
  Download, Printer, Filter, Calendar, Building2, CheckCircle2,
  FileSpreadsheet, Search, RefreshCw, Layers, ShieldCheck, ArrowRight
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export const AnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'reports'>('overview');
  const [data, setData] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [loading, setLoading] = useState(true);
  const { error, success } = useNotification();

  // Centralized Reports Catalog State
  const [catalog, setCatalog] = useState<any[]>([]);
  const [selectedReportCode, setSelectedReportCode] = useState('patient_registration');
  const [reportCategoryFilter, setReportCategoryFilter] = useState('all');
  const [reportResult, setReportResult] = useState<any>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadOverview();
    loadCatalog();
  }, [selectedBranch]);

  const loadOverview = async () => {
    setLoading(true);
    try {
      let endpoint = '/analytics/dashboard';
      if (selectedBranch) endpoint += `?branch_id=${selectedBranch}`;
      const [statsRes, branchRes] = await Promise.all([
        api.get(endpoint),
        api.get('/branches')
      ]);
      setData(statsRes);
      setBranches(branchRes);
    } catch (e: any) {
      error(e.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadCatalog = async () => {
    try {
      const res = await api.get('/analytics/reports/catalog');
      setCatalog(res);
      if (res?.length > 0) {
        handleGenerateReport(selectedReportCode || res[0].code);
      }
    } catch (e: any) {
      console.error('Failed to load report catalog', e);
    }
  };

  const handleGenerateReport = async (code = selectedReportCode) => {
    setGeneratingReport(true);
    try {
      const res = await api.post('/analytics/reports/generate', {
        report_code: code,
        branch_id: selectedBranch || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setReportResult(res);
      setSelectedReportCode(code);
    } catch (e: any) {
      error(e.message || 'Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleExportCsv = () => {
    if (!reportResult?.rows?.length || !reportResult?.columns?.length) {
      error('No data available to export');
      return;
    }

    try {
      const cols = reportResult.columns.map((col: any) => {
        const key = typeof col === 'object' && col !== null ? col.key : col;
        const label = typeof col === 'object' && col !== null ? (col.label || col.key) : String(col);
        return { key, label };
      });

      const headerLine = cols.map((c: any) => `"${String(c.label).replace(/"/g, '""')}"`).join(',');
      const rowLines = reportResult.rows.map((row: any) =>
        cols.map((c: any) => {
          const val = row[c.key];
          return `"${String(val ?? '').replace(/"/g, '""')}"`;
        }).join(',')
      );

      const csvContent = [headerLine, ...rowLines].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${selectedReportCode}_Report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      success('Standardized report exported to CSV!');
    } catch (err: any) {
      error('Export failed: ' + err.message);
    }
  };

  const filteredCatalog = catalog.filter(r =>
    reportCategoryFilter === 'all' || r.category === reportCategoryFilter
  );

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Diagnostic Analytics & Centralized Reports</h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            Real-time business intelligence, clinical throughput, branch comparisons, and 24 standardized audit reports
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, backgroundColor: '#fff' }}
          >
            <option value="">All Laboratory Facilities</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mode Tabs */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '12px 18px',
            fontSize: 14,
            fontWeight: 600,
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'overview' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'overview' ? '#0284c7' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <BarChart3 size={18} />
          <span>Executive BI Dashboards</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          style={{
            padding: '12px 18px',
            fontSize: 14,
            fontWeight: 600,
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'reports' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'reports' ? '#0284c7' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <FileSpreadsheet size={18} />
          <span>Standardized Reports Catalog (24 Reports)</span>
        </button>
      </div>

      {/* TAB 1: EXECUTIVE BI OVERVIEW */}
      {activeTab === 'overview' && (
        <div>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div className="metric-card">
              <div className="metric-icon" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>
                <DollarSign size={24} />
              </div>
              <div>
                <div className="metric-value">₹{(data?.today_revenue || 0).toLocaleString('en-IN')}</div>
                <div className="metric-label">Today's Diagnostic Revenue</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
                <Users size={24} />
              </div>
              <div>
                <div className="metric-value">{data?.today_patients || 0}</div>
                <div className="metric-label">Today's Patient Visits</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon" style={{ backgroundColor: '#ede9fe', color: '#7c3aed' }}>
                <Activity size={24} />
              </div>
              <div>
                <div className="metric-value">{data?.completed_reports || 0}</div>
                <div className="metric-label">Certified Reports Released</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                <TrendingUp size={24} />
              </div>
              <div>
                <div className="metric-value">₹{(data?.outstanding_dues || 0).toLocaleString('en-IN')}</div>
                <div className="metric-label">Total Outstanding Dues</div>
              </div>
            </div>
          </div>

          {/* Visual Charts & Comparisons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
            {/* Branch Performance Comparison */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 16 }}>
                <BarChart3 size={18} color="#0284c7" />
                Branch Diagnostic Collections
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {data?.branch_stats?.map((b: any) => {
                  const maxVal = Math.max(...(data.branch_stats.map((x: any) => parseFloat(x.total_collected || 0))), 1000);
                  const percentage = Math.min(100, Math.round((parseFloat(b.total_collected || 0) / maxVal) * 100));

                  return (
                    <div key={b.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                        <span style={{ fontWeight: 600 }}>{b.name}</span>
                        <strong>₹{parseFloat(b.total_collected || 0).toLocaleString('en-IN')}</strong>
                      </div>
                      <div style={{ width: '100%', height: 10, backgroundColor: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.max(10, percentage)}%`, height: '100%', backgroundColor: '#0284c7', borderRadius: 5, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Popular Tests Breakdown */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 16 }}>
                <Activity size={18} color="#7c3aed" />
                Popular Diagnostic Tests
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data?.popular_tests?.map((t: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                    <span style={{ fontSize: 12, backgroundColor: '#ede9fe', color: '#7c3aed', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                      {t.order_count} tests
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STANDARDIZED 24 REPORTS CATALOG */}
      {activeTab === 'reports' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
          {/* Left: 24 Report Catalog Navigator */}
          <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 18, height: 'fit-content' }}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Filter by Category</label>
              <select
                value={reportCategoryFilter}
                onChange={(e) => setReportCategoryFilter(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              >
                <option value="all">All Categories (24 Reports)</option>
                <option value="operational">Operational & Workflow</option>
                <option value="clinical">Clinical & Pathologist</option>
                <option value="financial">Financial & Ledgers</option>
                <option value="inventory">Inventory & Reagents</option>
                <option value="administrative">Administrative & Governance</option>
                <option value="audit">Audit & Compliance</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '600px', overflowY: 'auto' }}>
              {filteredCatalog.map((rep) => (
                <button
                  key={rep.code}
                  onClick={() => handleGenerateReport(rep.code)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 8,
                    textAlign: 'left',
                    border: 'none',
                    backgroundColor: selectedReportCode === rep.code ? '#e0f2fe' : '#f8fafc',
                    color: selectedReportCode === rep.code ? '#0284c7' : '#334155',
                    fontWeight: selectedReportCode === rep.code ? 700 : 500,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <span>{rep.name}</span>
                  {selectedReportCode === rep.code && <ArrowRight size={14} />}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Dynamic Report Preview & Data Grid */}
          <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
            {/* Header / Export Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {reportResult?.title || 'Report Output'}
                </h2>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  Generated at: {reportResult?.generated_at ? new Date(reportResult.generated_at).toLocaleString() : new Date().toLocaleString()}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleExportCsv}
                  disabled={generatingReport || !reportResult?.rows?.length}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12 }}
                >
                  <Download size={14} />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12 }}
                >
                  <Printer size={14} />
                  <span>Print View</span>
                </button>
              </div>
            </div>

            {/* Dynamic Results Table */}
            {generatingReport ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: 14 }}>Aggregating multi-table audit query...</div>
              </div>
            ) : !reportResult || reportResult.rows?.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
                No records matched the active filters for this report code.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', maxHeight: '550px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 1 }}>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                      {reportResult.columns?.map((col: any, colIdx: number) => {
                        const colKey = typeof col === 'object' && col !== null ? col.key : col;
                        const colLabel = typeof col === 'object' && col !== null ? (col.label || col.key) : String(col);
                        return (
                          <th key={colKey || colIdx} style={{ padding: '10px 12px', textTransform: 'capitalize', fontWeight: 600 }}>
                            {String(colLabel).replace(/_/g, ' ')}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {reportResult.rows?.map((row: any, rIdx: number) => (
                      <tr key={rIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        {reportResult.columns?.map((col: any, colIdx: number) => {
                          const colKey = typeof col === 'object' && col !== null ? col.key : col;
                          const cellValue = row[colKey];
                          return (
                            <td key={colKey || colIdx} style={{ padding: '10px 12px', color: '#0f172a' }}>
                              {typeof cellValue === 'number'
                                ? Number(cellValue).toLocaleString('en-IN')
                                : String(cellValue ?? '-')}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
