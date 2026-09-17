import React, { useState, useEffect } from 'react';
import {
  TestTubes, Plus, Search, ChevronRight, ChevronDown, Check,
  ShieldAlert, Edit2, Copy, Download, Upload, FlaskConical,
  Layers, DollarSign, ArrowUpDown, X, AlertCircle, FileText
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export const TestMaster: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tests' | 'parameters' | 'pricing' | 'categories' | 'samples' | 'import_export'>('tests');

  // Master States
  const [tests, setTests] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [sampleTypes, setSampleTypes] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedSampleType, setSelectedSampleType] = useState('');

  // Selected Test for Deep Parameter & Pricing Management
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [testParameters, setTestParameters] = useState<any[]>([]);
  const [testBranchPrices, setTestBranchPrices] = useState<any[]>([]);

  // Modals
  const [showTestModal, setShowTestModal] = useState(false);
  const [editingTest, setEditingTest] = useState<any>(null);
  const [showParamModal, setShowParamModal] = useState(false);
  const [editingParam, setEditingParam] = useState<any>(null);
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [activeParamForRange, setActiveParamForRange] = useState<any>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSampleTypeModal, setShowSampleTypeModal] = useState(false);

  // Forms
  const [testForm, setTestForm] = useState({
    name: '',
    code: '',
    category_id: '',
    department: 'Hematology',
    sample_type: 'Whole Blood (EDTA)',
    container_type: 'Lavender Top (EDTA)',
    method: 'Automated Flow Cytometry',
    turnaround_time_hours: 4,
    base_price: 500,
    remarks: ''
  });

  const [paramForm, setParamForm] = useState({
    name: '',
    short_name: '',
    result_type: 'numeric',
    unit: 'mg/dL',
    decimal_precision: 2,
    default_value: '',
    method: '',
    display_order: 1,
    remarks: ''
  });

  const [rangeForm, setRangeForm] = useState({
    gender: 'Both',
    min_age_days: 0,
    max_age_days: 43800,
    normal_min: '',
    normal_max: '',
    critical_low: '',
    critical_high: '',
    text_range: '',
    remarks: ''
  });

  const [catForm, setCatForm] = useState({
    name: '',
    code: '',
    description: '',
    display_order: 1
  });

  const [sampleTypeForm, setSampleTypeForm] = useState({
    name: '',
    code: '',
    container: '',
    color_code: '#8b5cf6',
    cap_type: '',
    min_volume: '2.0 mL',
    storage_requirement: '2-8°C refrigerated',
    processing_instructions: ''
  });

  const [importCsvText, setImportCsvText] = useState('');
  const [importResults, setImportResults] = useState<any>(null);

  const { error, success } = useNotification();

  const loadData = async () => {
    try {
      setLoading(true);
      const [testsRes, catRes, samplesRes, branchesRes] = await Promise.all([
        api.get('/tests'),
        api.get('/tests/categories'),
        api.get('/sample-types'),
        api.get('/branches')
      ]);
      setTests(testsRes);
      setCategories(catRes);
      setSampleTypes(samplesRes);
      setBranches(branchesRes);

      if (testsRes.length > 0 && !selectedTest) {
        selectTestForSubViews(testsRes[0]);
      }
    } catch (e: any) {
      error(e.message || 'Failed to load test catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectTestForSubViews = async (test: any) => {
    setSelectedTest(test);
    try {
      const [paramsRes, pricesRes] = await Promise.all([
        api.get(`/tests/${test.id}/parameters`),
        api.get(`/tests/${test.id}/prices`)
      ]);
      setTestParameters(paramsRes);
      setTestBranchPrices(pricesRes);
    } catch (e: any) {
      // ignore
    }
  };

  // Test CRUD
  const handleCreateOrUpdateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTest) {
        await api.put(`/tests/${editingTest.id}`, testForm);
        success(`Test '${testForm.name}' updated`);
      } else {
        await api.post('/tests', {
          ...testForm,
          base_price: parseFloat(String(testForm.base_price)) || 0,
          parameters: [
            { name: `${testForm.name} Result`, short_name: testForm.code, unit: 'units', normal_min: 10, normal_max: 50 }
          ]
        });
        success(`Diagnostic test '${testForm.name}' created`);
      }
      setShowTestModal(false);
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to save test');
    }
  };

  const handleDuplicateTest = async (testId: string) => {
    try {
      await api.post(`/tests/${testId}/duplicate`, {});
      success('Diagnostic test duplicated with parameters and reference ranges');
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to duplicate test');
    }
  };

  const handleToggleTestStatus = async (test: any) => {
    const newStatus = test.status === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/tests/${test.id}/status`, { status: newStatus });
      success(`Test status changed to ${newStatus}`);
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to update status');
    }
  };

  // Parameter CRUD
  const handleSaveParameter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest) return;

    try {
      if (editingParam) {
        await api.put(`/tests/parameters/${editingParam.id}`, paramForm);
        success('Parameter updated');
      } else {
        await api.post(`/tests/${selectedTest.id}/parameters`, paramForm);
        success('Parameter added to test');
      }
      setShowParamModal(false);
      selectTestForSubViews(selectedTest);
    } catch (err: any) {
      error(err.message || 'Failed to save parameter');
    }
  };

  const handleDeleteParameter = async (paramId: string) => {
    try {
      await api.delete(`/tests/parameters/${paramId}`);
      success('Parameter removed');
      selectTestForSubViews(selectedTest);
    } catch (err: any) {
      error(err.message || 'Failed to delete parameter');
    }
  };

  // Reference Range CRUD
  const handleSaveRange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeParamForRange) return;

    try {
      await api.post(`/tests/parameters/${activeParamForRange.id}/reference-ranges`, {
        ...rangeForm,
        normal_min: rangeForm.normal_min ? parseFloat(rangeForm.normal_min) : null,
        normal_max: rangeForm.normal_max ? parseFloat(rangeForm.normal_max) : null,
        critical_low: rangeForm.critical_low ? parseFloat(rangeForm.critical_low) : null,
        critical_high: rangeForm.critical_high ? parseFloat(rangeForm.critical_high) : null
      });
      success('Biological reference range added');
      setShowRangeModal(false);
      selectTestForSubViews(selectedTest);
    } catch (err: any) {
      error(err.message || 'Failed to add reference range');
    }
  };

  const handleDeleteRange = async (rangeId: string) => {
    try {
      await api.delete(`/tests/reference-ranges/${rangeId}`);
      success('Reference range removed');
      selectTestForSubViews(selectedTest);
    } catch (err: any) {
      error(err.message || 'Failed to remove range');
    }
  };

  // Branch Pricing Override
  const handleSaveBranchPrice = async (branchId: string, priceVal: string) => {
    if (!selectedTest || !priceVal) return;
    try {
      await api.post(`/tests/${selectedTest.id}/prices`, {
        branch_id: branchId,
        price: parseFloat(priceVal),
        tax_percentage: 5,
        discount_allowed: true
      });
      success('Branch price saved');
      selectTestForSubViews(selectedTest);
    } catch (err: any) {
      error(err.message || 'Failed to save branch price');
    }
  };

  const handleResetBranchPrice = async (branchId: string) => {
    if (!selectedTest) return;
    try {
      await api.delete(`/tests/${selectedTest.id}/prices/${branchId}`);
      success('Branch reverted to default price');
      selectTestForSubViews(selectedTest);
    } catch (err: any) {
      error(err.message || 'Failed to reset price');
    }
  };

  // Category CRUD
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/tests/categories', catForm);
      success(`Category '${catForm.name}' created`);
      setShowCategoryModal(false);
      setCatForm({ name: '', code: '', description: '', display_order: 1 });
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to create category');
    }
  };

  // Sample Type CRUD
  const handleSaveSampleType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/sample-types', sampleTypeForm);
      success(`Sample type '${sampleTypeForm.name}' registered`);
      setShowSampleTypeModal(false);
      loadData();
    } catch (err: any) {
      error(err.message || 'Failed to create sample type');
    }
  };

  // Import / Export
  const handleExportCSV = async () => {
    try {
      const res = await api.get('/tests/export');
      const blob = new Blob([res], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `test_catalog_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      success('Test catalog exported to CSV successfully');
    } catch (err: any) {
      error(err.message || 'Export failed');
    }
  };

  const handleImportCSV = async () => {
    if (!importCsvText.trim()) return;
    try {
      const res = await api.post('/tests/import', { csv_data: importCsvText });
      setImportResults(res);
      success(res.message);
      loadData();
    } catch (err: any) {
      error(err.message || 'Import failed');
    }
  };

  // Filtered tests
  const filteredTests = tests.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.code.toLowerCase().includes(search.toLowerCase());
    const matchCat = !selectedCategory || t.category_id === selectedCategory;
    const matchDept = !selectedDepartment || t.department === selectedDepartment;
    const matchSample = !selectedSampleType || t.sample_type === selectedSampleType;
    return matchSearch && matchCat && matchDept && matchSample;
  });

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Clinical Test & Parameter Master</h1>
          <p style={{ fontSize: 13.5, color: '#64748b' }}>
            Diagnostic catalog, multi-parameter profiles, biological reference intervals, and branch pricing.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleExportCSV} className="btn btn-outline">
            <Download size={15} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => {
              setEditingTest(null);
              setTestForm({
                name: '', code: '', category_id: categories[0]?.id || '',
                department: 'Hematology', sample_type: 'Whole Blood (EDTA)',
                container_type: 'Lavender Top (EDTA)', method: 'Automated Flow Cytometry',
                turnaround_time_hours: 4, base_price: 500, remarks: ''
              });
              setShowTestModal(true);
            }}
            className="btn btn-primary"
          >
            <Plus size={16} />
            <span>Add Diagnostic Test</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
        {[
          { key: 'tests', label: `Tests Catalog (${tests.length})`, icon: TestTubes },
          { key: 'parameters', label: `Parameters & Ranges`, icon: Layers },
          { key: 'pricing', label: `Branch Pricing`, icon: DollarSign },
          { key: 'categories', label: `Categories (${categories.length})`, icon: ArrowUpDown },
          { key: 'samples', label: `Sample Master (${sampleTypes.length})`, icon: FlaskConical },
          { key: 'import_export', label: `Import / Export`, icon: Upload }
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
                border: 'none', background: 'transparent',
                borderBottom: isActive ? '2px solid #0284c7' : '2px solid transparent',
                color: isActive ? '#0284c7' : '#64748b',
                fontWeight: isActive ? 700 : 500, cursor: 'pointer', fontSize: 13.5
              }}
            >
              <Icon size={16} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* TAB 1: TESTS CATALOG */}
      {/* ============================================================ */}
      {activeTab === 'tests' && (
        <div>
          {/* Search & Filters */}
          <div className="card" style={{ marginBottom: 20, padding: 14, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
              <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 11 }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tests by Name, Code, or Department..."
                className="form-input"
                style={{ paddingLeft: 40, height: 40 }}
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="form-input"
              style={{ width: 170, height: 40 }}
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="form-input"
              style={{ width: 170, height: 40 }}
            >
              <option value="">All Departments</option>
              <option value="Hematology">Hematology</option>
              <option value="Biochemistry">Biochemistry</option>
              <option value="Clinical Pathology">Clinical Pathology</option>
              <option value="Immunology">Immunology</option>
              <option value="Microbiology">Microbiology</option>
              <option value="Serology">Serology</option>
              <option value="Endocrinology">Endocrinology</option>
            </select>
          </div>

          {/* Tests Table */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Test Code / Name</th>
                  <th>Category / Dept</th>
                  <th>Sample / Container</th>
                  <th>Method</th>
                  <th>TAT</th>
                  <th>Base Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30 }}>Loading diagnostic catalog...</td></tr>
                ) : filteredTests.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>No tests match your filter criteria.</td></tr>
                ) : (
                  filteredTests.map((t) => (
                    <tr key={t.id} style={{ backgroundColor: selectedTest?.id === t.id ? '#f0f9ff' : 'transparent' }}>
                      <td>
                        <strong style={{ color: '#0284c7' }}>{t.code}</strong>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{t.name}</div>
                      </td>
                      <td>
                        <div>{t.category_name || 'General'}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{t.department}</div>
                      </td>
                      <td>
                        <div>{t.sample_type || 'Blood'}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{t.container_type || 'Standard'}</div>
                      </td>
                      <td><span style={{ fontSize: 12 }}>{t.method || 'Standard Analyzer'}</span></td>
                      <td><strong>{t.turnaround_time_hours || 4}h</strong></td>
                      <td><strong style={{ color: '#059669' }}>₹{t.base_price}</strong></td>
                      <td>
                        <span className={`badge badge-${t.status === 'active' ? 'success' : 'normal'}`}>
                          {t.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => {
                              selectTestForSubViews(t);
                              setActiveTab('parameters');
                            }}
                            className="btn btn-secondary btn-sm"
                            title="Manage Parameters & Ranges"
                          >
                            <Layers size={13} />
                          </button>
                          <button
                            onClick={() => handleDuplicateTest(t.id)}
                            className="btn btn-outline btn-sm"
                            title="Duplicate Test"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingTest(t);
                              setTestForm({
                                name: t.name, code: t.code, category_id: t.category_id || '',
                                department: t.department, sample_type: t.sample_type,
                                container_type: t.container_type, method: t.method || '',
                                turnaround_time_hours: t.turnaround_time_hours, base_price: t.base_price,
                                remarks: t.remarks || ''
                              });
                              setShowTestModal(true);
                            }}
                            className="btn btn-outline btn-sm"
                            title="Edit Test"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleToggleTestStatus(t)}
                            className={`btn btn-sm ${t.status === 'active' ? 'btn-outline' : 'btn-primary'}`}
                            style={{ fontSize: 11, padding: '2px 6px' }}
                          >
                            {t.status === 'active' ? 'Off' : 'On'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: PARAMETERS & REFERENCE RANGES */}
      {/* ============================================================ */}
      {activeTab === 'parameters' && (
        <div>
          {/* Test Selector Banner */}
          <div className="card" style={{ marginBottom: 20, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="badge badge-primary">{selectedTest?.code || 'SELECT TEST'}</span>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                {selectedTest?.name || 'Please select a test from the catalog tab'}
              </h2>
              <p style={{ fontSize: 12, color: '#64748b' }}>
                Department: {selectedTest?.department} • Sample: {selectedTest?.sample_type} • Method: {selectedTest?.method || 'N/A'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <select
                value={selectedTest?.id || ''}
                onChange={(e) => {
                  const match = tests.find(t => t.id === e.target.value);
                  if (match) selectTestForSubViews(match);
                }}
                className="form-input"
                style={{ width: 220 }}
              >
                {tests.map(t => (
                  <option key={t.id} value={t.id}>{t.code} - {t.name}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  setEditingParam(null);
                  setParamForm({
                    name: '', short_name: '', result_type: 'numeric',
                    unit: 'mg/dL', decimal_precision: 2, default_value: '',
                    method: '', display_order: testParameters.length + 1, remarks: ''
                  });
                  setShowParamModal(true);
                }}
                className="btn btn-primary btn-sm"
              >
                <Plus size={14} />
                <span>Add Parameter</span>
              </button>
            </div>
          </div>

          {/* Parameters & Reference Intervals List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {testParameters.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                No clinical parameters configured for this test yet. Click "Add Parameter" to begin.
              </div>
            ) : (
              testParameters.map((p, pIdx) => (
                <div key={p.id} className="card" style={{ borderLeft: '4px solid #0284c7' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700 }}>{p.name}</h3>
                        <span className="badge badge-primary">{p.short_name || p.name}</span>
                        <span className="badge badge-normal">{p.result_type}</span>
                        {p.unit && <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>({p.unit})</span>}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                        Precision: {p.decimal_precision} decimals • Method: {p.method || 'Default'} • Order: #{p.display_order}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => {
                          setActiveParamForRange(p);
                          setRangeForm({
                            gender: 'Both', min_age_days: 0, max_age_days: 43800,
                            normal_min: '', normal_max: '', critical_low: '',
                            critical_high: '', text_range: '', remarks: ''
                          });
                          setShowRangeModal(true);
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        <Plus size={13} />
                        <span>Add Range</span>
                      </button>
                      <button
                        onClick={() => handleDeleteParameter(p.id)}
                        className="btn btn-outline btn-sm"
                        style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Reference Ranges Table */}
                  <div style={{ backgroundColor: '#f8fafc', borderRadius: 6, padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                      Biological Reference Intervals ({p.reference_ranges?.length || 0})
                    </div>

                    {(!p.reference_ranges || p.reference_ranges.length === 0) ? (
                      <p style={{ fontSize: 12, color: '#94a3b8' }}>No ranges defined. Results will have no normal/abnormal flags.</p>
                    ) : (
                      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ color: '#64748b', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '6px 8px' }}>Gender</th>
                            <th style={{ padding: '6px 8px' }}>Age Bracket</th>
                            <th style={{ padding: '6px 8px' }}>Normal Interval</th>
                            <th style={{ padding: '6px 8px' }}>Critical Thresholds</th>
                            <th style={{ padding: '6px 8px' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.reference_ranges.map((r: any) => (
                            <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '6px 8px' }}><strong>{r.gender}</strong></td>
                              <td style={{ padding: '6px 8px' }}>
                                {Math.round((r.min_age_days || 0) / 365)}y - {Math.round((r.max_age_days || 43800) / 365)}y
                              </td>
                              <td style={{ padding: '6px 8px' }}>
                                {r.text_range ? (
                                  <span className="badge badge-normal">{r.text_range}</span>
                                ) : (
                                  <strong style={{ color: '#059669' }}>{r.normal_min} - {r.normal_max} {p.unit}</strong>
                                )}
                              </td>
                              <td style={{ padding: '6px 8px' }}>
                                {(r.critical_low !== null && r.critical_low !== undefined) || (r.critical_high !== null && r.critical_high !== undefined) ? (
                                  <span style={{ color: '#dc2626', fontWeight: 600 }}>
                                    &lt; {r.critical_low ?? 'N/A'} | &gt; {r.critical_high ?? 'N/A'}
                                  </span>
                                ) : (
                                  <span style={{ color: '#94a3b8' }}>None</span>
                                )}
                              </td>
                              <td style={{ padding: '6px 8px' }}>
                                <button
                                  onClick={() => handleDeleteRange(r.id)}
                                  style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                                >
                                  &times;
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: BRANCH PRICING MATRIX */}
      {/* ============================================================ */}
      {activeTab === 'pricing' && (
        <div>
          <div className="card" style={{ marginBottom: 20, padding: 16 }}>
            <span className="badge badge-primary">{selectedTest?.code}</span>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
              Branch Pricing Overrides: {selectedTest?.name}
            </h2>
            <p style={{ fontSize: 12, color: '#64748b' }}>
              Base Price: <strong style={{ color: '#059669' }}>₹{selectedTest?.base_price}</strong>. You can configure custom diagnostic rates per branch center.
            </p>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Branch Code / Name</th>
                  <th>City</th>
                  <th>Base Price</th>
                  <th>Custom Branch Price</th>
                  <th>Effective Price</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((b) => {
                  const override = testBranchPrices.find(p => p.branch_id === b.id);
                  return (
                    <tr key={b.id}>
                      <td>
                        <strong>{b.name}</strong>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{b.code}</div>
                      </td>
                      <td>{b.city || 'N/A'}</td>
                      <td>₹{selectedTest?.base_price}</td>
                      <td>
                        <input
                          type="number"
                          defaultValue={override ? override.price : selectedTest?.base_price}
                          id={`branch_price_${b.id}`}
                          className="form-input"
                          style={{ width: 120, height: 34 }}
                        />
                      </td>
                      <td>
                        <strong style={{ color: override ? '#0284c7' : '#64748b' }}>
                          ₹{override ? override.price : selectedTest?.base_price}
                        </strong>
                        {override ? <span className="badge badge-primary" style={{ marginLeft: 6, fontSize: 10 }}>Custom</span> : null}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => {
                              const el = document.getElementById(`branch_price_${b.id}`) as HTMLInputElement;
                              if (el) handleSaveBranchPrice(b.id, el.value);
                            }}
                            className="btn btn-primary btn-sm"
                          >
                            Save
                          </button>
                          {override && (
                            <button
                              onClick={() => handleResetBranchPrice(b.id)}
                              className="btn btn-outline btn-sm"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: TEST CATEGORIES */}
      {/* ============================================================ */}
      {activeTab === 'categories' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>Clinical Test Categories</h3>
            <button onClick={() => setShowCategoryModal(true)} className="btn btn-primary btn-sm">
              <Plus size={14} />
              <span>Add Custom Category</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {categories.map((c) => (
              <div key={c.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <span className="badge badge-primary">{c.code}</span>
                    <h4 style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{c.name}</h4>
                  </div>
                  <span className="badge badge-normal">{c.test_count || 0} Tests</span>
                </div>
                <p style={{ fontSize: 12.5, color: '#64748b' }}>{c.description || 'Clinical laboratory department'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 5: SAMPLE TYPES MASTER */}
      {/* ============================================================ */}
      {activeTab === 'samples' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Specimen & Sample Master</h3>
              <p style={{ fontSize: 12.5, color: '#64748b' }}>Phlebotomy tube types, volumes, and preservation instructions</p>
            </div>
            <button onClick={() => setShowSampleTypeModal(true)} className="btn btn-primary btn-sm">
              <Plus size={14} />
              <span>Add Specimen Type</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {sampleTypes.map((s) => (
              <div key={s.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      backgroundColor: s.color_code || '#8b5cf6',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }} />
                    <div>
                      <h4 style={{ fontSize: 15, fontWeight: 700 }}>{s.name}</h4>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{s.code}</span>
                    </div>
                  </div>
                  <span className="badge badge-primary">{s.min_volume || '2.0 mL'}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: '#475569', marginTop: 8 }}>
                  <div><strong>Container:</strong> {s.container}</div>
                  <div><strong>Storage:</strong> {s.storage_requirement || 'Ambient / Refrigerated'}</div>
                  {s.processing_instructions && (
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                      Instructions: {s.processing_instructions}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 6: CSV IMPORT / EXPORT */}
      {/* ============================================================ */}
      {activeTab === 'import_export' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Export Panel */}
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Export Diagnostic Catalog</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Download complete test master, parameter schemas, and biological reference intervals in Excel / CSV format.
            </p>
            <button onClick={handleExportCSV} className="btn btn-primary">
              <Download size={15} />
              <span>Download CSV Catalog</span>
            </button>
          </div>

          {/* Import Panel */}
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Bulk Import Catalog</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
              Paste comma-separated CSV test data with parameters. Must maintain tenant isolation and permissions.
            </p>
            <textarea
              rows={8}
              value={importCsvText}
              onChange={(e) => setImportCsvText(e.target.value)}
              placeholder="Test Code,Test Name,Department,Category,Sample Type,Container,Method,TAT Hours,Base Price,Status,Parameter Name..."
              className="form-input"
              style={{ fontFamily: 'monospace', fontSize: 12, marginBottom: 12 }}
            />
            <button onClick={handleImportCSV} className="btn btn-primary btn-sm">
              <Upload size={14} />
              <span>Process CSV Import</span>
            </button>

            {importResults && (
              <div style={{ marginTop: 12, padding: 10, backgroundColor: '#f8fafc', borderRadius: 6, fontSize: 12 }}>
                <strong>{importResults.message}</strong>
                {importResults.errors?.length > 0 && (
                  <div style={{ color: '#dc2626', marginTop: 6 }}>
                    {importResults.errors.map((err: string, i: number) => <div key={i}>• {err}</div>)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Test */}
      {showTestModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingTest ? 'Edit Diagnostic Test' : 'Add New Diagnostic Test'}</h2>
              <button onClick={() => setShowTestModal(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleCreateOrUpdateTest}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Test Name *</label>
                    <input
                      type="text"
                      required
                      value={testForm.name}
                      onChange={(e) => setTestForm({ ...testForm, name: e.target.value })}
                      className="form-input"
                      placeholder="e.g. Serum Uric Acid"
                    />
                  </div>
                  <div>
                    <label className="form-label">Test Code *</label>
                    <input
                      type="text"
                      required
                      value={testForm.code}
                      onChange={(e) => setTestForm({ ...testForm, code: e.target.value.toUpperCase() })}
                      className="form-input"
                      placeholder="e.g. URIC_ACID"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Category</label>
                    <select
                      value={testForm.category_id}
                      onChange={(e) => setTestForm({ ...testForm, category_id: e.target.value })}
                      className="form-input"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Department</label>
                    <select
                      value={testForm.department}
                      onChange={(e) => setTestForm({ ...testForm, department: e.target.value })}
                      className="form-input"
                    >
                      <option value="Hematology">Hematology</option>
                      <option value="Biochemistry">Biochemistry</option>
                      <option value="Clinical Pathology">Clinical Pathology</option>
                      <option value="Immunology">Immunology</option>
                      <option value="Microbiology">Microbiology</option>
                      <option value="Serology">Serology</option>
                      <option value="Endocrinology">Endocrinology</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Sample Type</label>
                    <select
                      value={testForm.sample_type}
                      onChange={(e) => setTestForm({ ...testForm, sample_type: e.target.value })}
                      className="form-input"
                    >
                      {sampleTypes.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Container Type</label>
                    <input
                      type="text"
                      value={testForm.container_type}
                      onChange={(e) => setTestForm({ ...testForm, container_type: e.target.value })}
                      className="form-input"
                      placeholder="Gold Top / SST"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Turnaround Time (Hours)</label>
                    <input
                      type="number"
                      min="1"
                      value={testForm.turnaround_time_hours}
                      onChange={(e) => setTestForm({ ...testForm, turnaround_time_hours: parseInt(e.target.value, 10) || 4 })}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Base Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={testForm.base_price}
                      onChange={(e) => setTestForm({ ...testForm, base_price: parseFloat(e.target.value) || 0 })}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Method</label>
                    <input
                      type="text"
                      value={testForm.method}
                      onChange={(e) => setTestForm({ ...testForm, method: e.target.value })}
                      className="form-input"
                      placeholder="Enzymatic / Flow Cytometry"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Clinical Remarks / Instructions</label>
                  <input
                    type="text"
                    value={testForm.remarks}
                    onChange={(e) => setTestForm({ ...testForm, remarks: e.target.value })}
                    className="form-input"
                    placeholder="Patient preparation instructions"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowTestModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTest ? 'Update Test' : 'Save Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Parameter */}
      {showParamModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 550 }}>
            <div className="modal-header">
              <h2 className="modal-title">Add Parameter to {selectedTest?.name}</h2>
              <button onClick={() => setShowParamModal(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleSaveParameter}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                  <div>
                    <label className="form-label">Parameter Name *</label>
                    <input
                      type="text"
                      required
                      value={paramForm.name}
                      onChange={(e) => setParamForm({ ...paramForm, name: e.target.value })}
                      className="form-input"
                      placeholder="e.g. Total Leukocyte Count"
                    />
                  </div>
                  <div>
                    <label className="form-label">Short Name</label>
                    <input
                      type="text"
                      value={paramForm.short_name}
                      onChange={(e) => setParamForm({ ...paramForm, short_name: e.target.value })}
                      className="form-input"
                      placeholder="TLC"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="form-label">Result Type</label>
                    <select
                      value={paramForm.result_type}
                      onChange={(e) => setParamForm({ ...paramForm, result_type: e.target.value })}
                      className="form-input"
                    >
                      <option value="numeric">Numeric</option>
                      <option value="text">Textual</option>
                      <option value="positive_negative">Positive/Negative</option>
                      <option value="reactive_nonreactive">Reactive/Non-reactive</option>
                      <option value="options">Select Options</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Unit of Measure</label>
                    <input
                      type="text"
                      value={paramForm.unit}
                      onChange={(e) => setParamForm({ ...paramForm, unit: e.target.value })}
                      className="form-input"
                      placeholder="mg/dL, g/dL, /cumm"
                    />
                  </div>
                  <div>
                    <label className="form-label">Decimal Places</label>
                    <input
                      type="number"
                      min="0"
                      max="4"
                      value={paramForm.decimal_precision}
                      onChange={(e) => setParamForm({ ...paramForm, decimal_precision: parseInt(e.target.value, 10) || 0 })}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowParamModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Parameter</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Reference Range */}
      {showRangeModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 550 }}>
            <div className="modal-header">
              <h2 className="modal-title">Add Reference Interval for {activeParamForRange?.name}</h2>
              <button onClick={() => setShowRangeModal(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleSaveRange}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="form-label">Gender</label>
                    <select
                      value={rangeForm.gender}
                      onChange={(e) => setRangeForm({ ...rangeForm, gender: e.target.value })}
                      className="form-input"
                    >
                      <option value="Both">Both (General)</option>
                      <option value="Male">Male Only</option>
                      <option value="Female">Female Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Min Age (Days)</label>
                    <input
                      type="number"
                      value={rangeForm.min_age_days}
                      onChange={(e) => setRangeForm({ ...rangeForm, min_age_days: parseInt(e.target.value, 10) || 0 })}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Max Age (Days)</label>
                    <input
                      type="number"
                      value={rangeForm.max_age_days}
                      onChange={(e) => setRangeForm({ ...rangeForm, max_age_days: parseInt(e.target.value, 10) || 43800 })}
                      className="form-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="form-label">Normal Min</label>
                    <input
                      type="number"
                      step="any"
                      value={rangeForm.normal_min}
                      onChange={(e) => setRangeForm({ ...rangeForm, normal_min: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Normal Max</label>
                    <input
                      type="number"
                      step="any"
                      value={rangeForm.normal_max}
                      onChange={(e) => setRangeForm({ ...rangeForm, normal_max: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="form-label">Critical Low (Panic)</label>
                    <input
                      type="number"
                      step="any"
                      value={rangeForm.critical_low}
                      onChange={(e) => setRangeForm({ ...rangeForm, critical_low: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Critical High (Panic)</label>
                    <input
                      type="number"
                      step="any"
                      value={rangeForm.critical_high}
                      onChange={(e) => setRangeForm({ ...rangeForm, critical_high: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Text Range (for non-numeric e.g. Negative)</label>
                  <input
                    type="text"
                    value={rangeForm.text_range}
                    onChange={(e) => setRangeForm({ ...rangeForm, text_range: e.target.value })}
                    className="form-input"
                    placeholder="e.g. Negative, Non-Reactive"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowRangeModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Range</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Category */}
      {showCategoryModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2 className="modal-title">Add Diagnostic Category</h2>
              <button onClick={() => setShowCategoryModal(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleSaveCategory}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="form-label">Category Name *</label>
                  <input
                    type="text"
                    required
                    value={catForm.name}
                    onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                    className="form-input"
                    placeholder="e.g. Molecular Diagnostics"
                  />
                </div>
                <div>
                  <label className="form-label">Category Code *</label>
                  <input
                    type="text"
                    required
                    value={catForm.code}
                    onChange={(e) => setCatForm({ ...catForm, code: e.target.value.toUpperCase() })}
                    className="form-input"
                    placeholder="e.g. MOLECULAR"
                  />
                </div>
                <div>
                  <label className="form-label">Description</label>
                  <input
                    type="text"
                    value={catForm.description}
                    onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Create Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Sample Type */}
      {showSampleTypeModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: 550 }}>
            <div className="modal-header">
              <h2 className="modal-title">Register Specimen Sample Type</h2>
              <button onClick={() => setShowSampleTypeModal(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleSaveSampleType}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                  <div>
                    <label className="form-label">Sample Name *</label>
                    <input
                      type="text"
                      required
                      value={sampleTypeForm.name}
                      onChange={(e) => setSampleTypeForm({ ...sampleTypeForm, name: e.target.value })}
                      className="form-input"
                      placeholder="e.g. Synovial Fluid"
                    />
                  </div>
                  <div>
                    <label className="form-label">Code *</label>
                    <input
                      type="text"
                      required
                      value={sampleTypeForm.code}
                      onChange={(e) => setSampleTypeForm({ ...sampleTypeForm, code: e.target.value.toUpperCase() })}
                      className="form-input"
                      placeholder="SYNOVIAL"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                  <div>
                    <label className="form-label">Container Type *</label>
                    <input
                      type="text"
                      required
                      value={sampleTypeForm.container}
                      onChange={(e) => setSampleTypeForm({ ...sampleTypeForm, container: e.target.value })}
                      className="form-input"
                      placeholder="Sterile Tube / Heparin"
                    />
                  </div>
                  <div>
                    <label className="form-label">Color Code</label>
                    <input
                      type="color"
                      value={sampleTypeForm.color_code}
                      onChange={(e) => setSampleTypeForm({ ...sampleTypeForm, color_code: e.target.value })}
                      className="form-input"
                      style={{ padding: 2, height: 38 }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="form-label">Minimum Volume</label>
                    <input
                      type="text"
                      value={sampleTypeForm.min_volume}
                      onChange={(e) => setSampleTypeForm({ ...sampleTypeForm, min_volume: e.target.value })}
                      className="form-input"
                      placeholder="1.0 mL"
                    />
                  </div>
                  <div>
                    <label className="form-label">Storage Requirement</label>
                    <input
                      type="text"
                      value={sampleTypeForm.storage_requirement}
                      onChange={(e) => setSampleTypeForm({ ...sampleTypeForm, storage_requirement: e.target.value })}
                      className="form-input"
                      placeholder="2-8°C refrigerated"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Processing Instructions</label>
                  <input
                    type="text"
                    value={sampleTypeForm.processing_instructions}
                    onChange={(e) => setSampleTypeForm({ ...sampleTypeForm, processing_instructions: e.target.value })}
                    className="form-input"
                    placeholder="STAT delivery to lab, do not centrifuge"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowSampleTypeModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Specimen Type</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
