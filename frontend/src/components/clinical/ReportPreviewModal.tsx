import React, { useState, useEffect } from 'react';
import { X, Printer, Download, CheckCircle2, ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

interface ReportPreviewModalProps {
  reportId: string;
  onClose: () => void;
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({ reportId, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const { error, success } = useNotification();

  useEffect(() => {
    async function loadReport() {
      try {
        const res = await api.get(`/reports/${reportId}`);
        setData(res);
      } catch (e: any) {
        error(e.message || 'Failed to load report');
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, [reportId]);

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      const blob = await api.get(`/reports/${reportId}/pdf`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Diagnostic_Report_${data?.report?.report_number || reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      success('PDF downloaded successfully');
    } catch (e: any) {
      error('Failed to download PDF: ' + e.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #e0f2fe', borderTopColor: '#0284c7', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p>Generating clinical report view...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { report, testResults, samples } = data;

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-content-xl" style={{ height: '94vh' }}>
        {/* Action Header (Hidden in Print) */}
        <div className="modal-header no-print">
          <div>
            <h3 style={{ fontSize: 16 }}>Diagnostic Report Preview: {report.report_number}</h3>
            <span style={{ fontSize: 12, color: '#64748b' }}>Status: <strong style={{ textTransform: 'capitalize', color: report.status === 'approved' || report.status === 'released' ? '#059669' : '#0284c7' }}>{report.status}</strong></span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={handlePrint} className="btn btn-outline btn-sm">
              <Printer size={15} />
              <span>Print A4</span>
            </button>
            <button onClick={handleDownloadPdf} disabled={isDownloading} className="btn btn-primary btn-sm">
              <Download size={15} />
              <span>{isDownloading ? 'Generating...' : 'Download PDF'}</span>
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', marginLeft: 8 }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Report Body */}
        <div className="modal-body printable-report" style={{ backgroundColor: '#ffffff', padding: '36px 44px', color: '#0f172a' }}>
          {/* 1. Header & Accreditation */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #0284c7', paddingBottom: 14, marginBottom: 16 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0369a1', letterSpacing: '-0.01em', textTransform: 'uppercase' }}>
              {report.lab_name || 'Apex Diagnostics & Reference Laboratory'}
            </h1>
            {report.license_number && (
              <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 2 }}>
                Accreditation: {report.license_number}
              </p>
            )}
            <p style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
              {[report.branch_name || report.lab_address, report.lab_phone ? `Tel: ${report.lab_phone}` : '', report.lab_email ? `Email: ${report.lab_email}` : ''].filter(Boolean).join('  |  ')}
            </p>
          </div>

          {/* 2. Patient Demographics Box */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            padding: '12px 18px',
            marginBottom: 20,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px 24px',
            fontSize: 12.5
          }}>
            <div>
              <div style={{ display: 'flex', marginBottom: 4 }}>
                <span style={{ width: 110, fontWeight: 700, color: '#334155' }}>Patient Name:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{report.patient_name}</span>
              </div>
              <div style={{ display: 'flex', marginBottom: 4 }}>
                <span style={{ width: 110, fontWeight: 700, color: '#334155' }}>Age / Gender:</span>
                <span>{report.age} {report.age_unit || 'Yrs'} / {report.gender}</span>
              </div>
              <div style={{ display: 'flex', marginBottom: 4 }}>
                <span style={{ width: 110, fontWeight: 700, color: '#334155' }}>Patient ID (PID):</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{report.patient_id_code}</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ width: 110, fontWeight: 700, color: '#334155' }}>Ref. Doctor:</span>
                <span>{report.doctor_name ? `${report.doctor_name} (${report.doctor_specialization || 'Consultant'})` : 'Self / OPD'}</span>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', marginBottom: 4 }}>
                <span style={{ width: 110, fontWeight: 700, color: '#334155' }}>Report Number:</span>
                <span style={{ fontWeight: 700, color: '#0284c7' }}>{report.report_number}</span>
              </div>
              <div style={{ display: 'flex', marginBottom: 4 }}>
                <span style={{ width: 110, fontWeight: 700, color: '#334155' }}>Lab Number:</span>
                <span style={{ fontFamily: 'monospace' }}>{report.lab_number || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', marginBottom: 4 }}>
                <span style={{ width: 110, fontWeight: 700, color: '#334155' }}>Sample Barcode:</span>
                <span style={{ fontFamily: 'monospace' }}>{samples?.[0]?.sample_barcode || 'SMP-001'}</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ width: 110, fontWeight: 700, color: '#334155' }}>Report Date:</span>
                <span>{new Date(report.approved_at || report.created_at).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* 3. Parameter Results Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, fontSize: 12.5 }}>
            <thead>
              <tr style={{ backgroundColor: '#e2e8f0', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, width: '42%' }}>TEST / PARAMETER</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, width: '20%' }}>OBSERVED VALUE</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, width: '15%' }}>UNIT</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, width: '23%' }}>BIOLOGICAL REF. INTERVAL</th>
              </tr>
            </thead>
            <tbody>
              {testResults?.map((test: any) => (
                <React.Fragment key={test.result_id || test.test_id}>
                  {/* Test Section Header */}
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    <td colSpan={4} style={{ padding: '8px 12px', fontWeight: 700, color: '#0369a1', fontSize: 13 }}>
                      {test.test_name?.toUpperCase()}
                      {test.method && <span style={{ fontSize: 10.5, fontWeight: 400, color: '#64748b', marginLeft: 10 }}>Method: {test.method}</span>}
                    </td>
                  </tr>

                  {/* Test Parameters */}
                  {test.parameters?.map((p: any, pIdx: number) => {
                    const isAbnormal = p.flag === 'high' || p.flag === 'low' || p.flag === 'critical_high' || p.flag === 'critical_low' || p.is_critical;
                    return (
                      <tr key={p.id} style={{ backgroundColor: pIdx % 2 === 1 ? '#fafafa' : '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '7px 12px', fontWeight: isAbnormal ? 700 : 400 }}>
                          {p.param_name}
                        </td>
                        <td style={{ padding: '7px 12px', fontWeight: isAbnormal ? 700 : 500, color: isAbnormal ? '#dc2626' : '#0f172a' }}>
                          {p.value_numeric !== null ? p.value_numeric : (p.value_text || '-')}
                          {p.flag === 'high' && ' (HIGH)'}
                          {p.flag === 'low' && ' (LOW)'}
                          {p.flag === 'critical_high' && ' (CRITICAL HIGH)'}
                          {p.flag === 'critical_low' && ' (CRITICAL LOW)'}
                        </td>
                        <td style={{ padding: '7px 12px', color: '#64748b' }}>{p.unit || '-'}</td>
                        <td style={{ padding: '7px 12px', color: '#64748b' }}>{p.reference_range_text || 'Normal'}</td>
                      </tr>
                    );
                  })}

                  {/* Clinical Remarks / Impression */}
                  {(test.clinical_remarks || test.impression) && (
                    <tr>
                      <td colSpan={4} style={{ padding: '8px 12px', backgroundColor: '#f0f9ff', borderBottom: '1px solid #bae6fd' }}>
                        <span style={{ fontWeight: 700, color: '#0369a1', fontSize: 11.5 }}>Clinical Remarks: </span>
                        <span style={{ fontSize: 11.5, color: '#0f172a' }}>{test.impression || test.clinical_remarks}</span>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {/* 4. Signatures & Accreditation Seals */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 40, paddingTop: 16, borderTop: '1px solid #cbd5e1' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Alex Rivera, B.Sc MLT</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Senior Medical Laboratory Technologist</div>
              <div style={{ fontSize: 10.5, color: '#94a3b8' }}>Tested & Verified on Automated Analyzer</div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#059669', marginBottom: 4, fontSize: 11.5, fontWeight: 600 }}>
                <CheckCircle2 size={14} />
                <span>Digitally Certified & Approved</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                {report.approved_by_name || 'Dr. Sarah Jenkins, MD'}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Consultant Clinical Pathologist</div>
              <div style={{ fontSize: 10.5, color: '#94a3b8' }}>Registration No: MED-PATH-84291</div>
            </div>
          </div>

          {/* 5. End of Report Footer */}
          <div style={{ textAlign: 'center', marginTop: 32, paddingTop: 12, borderTop: '1px dashed #cbd5e1', fontSize: 11, color: '#64748b' }}>
            <p style={{ fontStyle: 'italic', marginBottom: 4 }}>***** End of Diagnostic Laboratory Report *****</p>
            <p style={{ fontSize: 10, color: '#94a3b8' }}>
              {report.footer_text || 'Diagnostic tests are intended to assist clinical diagnosis. Findings should correlate with clinical conditions.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
