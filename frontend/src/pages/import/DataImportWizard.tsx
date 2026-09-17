import React, { useState } from 'react';
import {
  Upload, FileText, CheckCircle, AlertTriangle, Download,
  ArrowRight, RefreshCw, Layers, ShieldCheck, HelpCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const DataImportWizard: React.FC = () => {
  const { token } = useAuth();
  const [entity, setEntity] = useState<'patients' | 'doctors' | 'tests' | 'inventory'>('patients');
  const [csvContent, setCsvContent] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const handleDownloadTemplate = () => {
    window.open(`/api/import/templates/${entity}`, '_blank');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      setValidationResult(null);
      setImportSuccess(null);
    };
    reader.readAsText(file);
  };

  const handleValidate = async () => {
    if (!csvContent) return;
    try {
      setValidating(true);
      setImportSuccess(null);
      const res = await fetch('/api/import/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          entity,
          data_csv: csvContent
        })
      });
      if (res.ok) {
        const data = await res.json();
        setValidationResult(data);
      }
    } catch (err) {
      console.error('Validation error', err);
    } finally {
      setValidating(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!validationResult || !validationResult.can_import) return;
    try {
      setImporting(true);
      const res = await fetch('/api/import/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          entity,
          records: validationResult.preview // or full records
        })
      });
      if (res.ok) {
        const data = await res.json();
        setImportSuccess(data.message);
        setValidationResult(null);
        setCsvContent('');
      }
    } catch (err) {
      console.error('Import error', err);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>
          Laboratory Legacy Data Migration & Import Wizard
        </h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
          Transition records from existing LIS/HIS software with automated schema validation, duplicate detection and rollback safety
        </p>
      </div>

      {importSuccess && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          padding: '14px 20px',
          borderRadius: 8,
          marginBottom: 20,
          fontSize: 14,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <CheckCircle size={18} /> {importSuccess}
        </div>
      )}

      {/* Step 1: Entity Selector */}
      <div className="card" style={{ padding: 22, marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px', color: '#0f172a' }}>
          Step 1: Choose Dataset to Migrate
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {[
            { id: 'patients', title: 'Patients Master', desc: 'Demographics, MRN, mobile numbers & addresses' },
            { id: 'doctors', title: 'Referring Doctors', desc: 'Medical registration, specialties & clinic terms' },
            { id: 'tests', title: 'Test Catalog', desc: 'Test codes, departments & base prices' },
            { id: 'inventory', title: 'Reagents & Stock', desc: 'SKU codes, units & minimum reorder levels' }
          ].map((item) => (
            <div
              key={item.id}
              onClick={() => {
                setEntity(item.id as any);
                setValidationResult(null);
              }}
              style={{
                padding: 16,
                borderRadius: 10,
                border: entity === item.id ? '2px solid #0284c7' : '1px solid #e2e8f0',
                background: entity === item.id ? '#f0f9ff' : '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ fontWeight: 700, color: entity === item.id ? '#0369a1' : '#0f172a', fontSize: 14 }}>
                {item.title}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step 2: Template & Upload */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
              Step 2: Download Template
            </h3>
            <button
              onClick={handleDownloadTemplate}
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Download size={14} /> Download CSV Template
            </button>
          </div>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 14px' }}>
            Ensure your legacy data columns match the standardized schema format.
          </p>

          <div style={{
            border: '2px dashed #cbd5e1',
            borderRadius: 10,
            padding: '24px 16px',
            textAlign: 'center',
            background: '#f8fafc',
            cursor: 'pointer'
          }}>
            <Upload size={32} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
              Select CSV File from Computer
            </div>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              style={{ marginTop: 8, fontSize: 12 }}
            />
          </div>
        </div>

        {/* Step 3: Raw CSV Preview */}
        <div className="card" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px' }}>
            Step 3: CSV Content Preview
          </h3>
          <textarea
            rows={7}
            placeholder="Paste or inspect raw CSV rows here..."
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            className="input"
            style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button
              onClick={handleValidate}
              disabled={validating || !csvContent}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={14} className={validating ? 'animate-spin' : ''} />
              {validating ? 'Validating Batch...' : 'Validate Dataset'}
            </button>
          </div>
        </div>
      </div>

      {/* Step 4: Validation Results & Commit */}
      {validationResult && (
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                Step 4: Pre-Flight Validation Results
              </h3>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
                Inspected {validationResult.total_rows} total rows: {validationResult.valid_rows} valid, {validationResult.invalid_rows} invalid.
              </p>
            </div>

            {validationResult.can_import ? (
              <button
                onClick={handleExecuteImport}
                disabled={importing}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <CheckCircle size={15} />
                {importing ? 'Importing Records...' : `Commit ${validationResult.valid_rows} Records to Database`}
              </button>
            ) : (
              <span style={{ color: '#dc2626', fontSize: 13, fontWeight: 700 }}>
                Resolve errors below before committing
              </span>
            )}
          </div>

          {/* Validation Errors Table */}
          {validationResult.errors.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: 8,
                padding: '10px 14px',
                color: '#991b1b',
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 10
              }}>
                Found {validationResult.errors.length} validation errors:
              </div>

              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '8px 12px' }}>ROW #</th>
                    <th style={{ padding: '8px 12px' }}>FIELD</th>
                    <th style={{ padding: '8px 12px' }}>VALUE</th>
                    <th style={{ padding: '8px 12px' }}>ERROR DESCRIPTION</th>
                  </tr>
                </thead>
                <tbody>
                  {validationResult.errors.map((err: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 700 }}>{err.row}</td>
                      <td style={{ padding: '8px 12px', color: '#dc2626', fontFamily: 'monospace' }}>{err.field}</td>
                      <td style={{ padding: '8px 12px', color: '#475569' }}>{String(err.value || '(empty)')}</td>
                      <td style={{ padding: '8px 12px', color: '#991b1b' }}>{err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sample Preview */}
          {validationResult.preview.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                Sample Preview (First {validationResult.preview.length} Records):
              </div>
              <pre style={{
                background: '#f8fafc',
                padding: 12,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                fontSize: 11,
                overflowX: 'auto'
              }}>
                {JSON.stringify(validationResult.preview, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DataImportWizard;
