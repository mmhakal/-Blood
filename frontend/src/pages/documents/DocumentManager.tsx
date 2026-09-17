import React, { useState, useEffect } from 'react';
import {
  FileText, Plus, Download, ShieldCheck, Clock, AlertTriangle,
  CheckCircle, Filter, Calendar, Building, Lock, Eye, ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

interface DocumentItem {
  id: string;
  category: string;
  title: string;
  document_number: string;
  issuing_authority?: string;
  file_url: string;
  file_size_bytes: number;
  mime_type: string;
  version: number;
  effective_date?: string;
  expiry_date?: string;
  status: 'active' | 'expiring_soon' | 'expired' | 'archived';
  created_at: string;
}

export const DocumentManager: React.FC = () => {
  const { token } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Upload Form
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('accreditation');
  const [formDocNumber, setFormDocNumber] = useState('');
  const [formAuthority, setFormAuthority] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formFileUrl, setFormFileUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const data = await api.get<DocumentItem[]>('/documents');
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load documents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [token]);

  const handleDownload = async (docId: string, title: string) => {
    try {
      const data = await api.get<{ download_url: string }>(`/documents/${docId}/download`);
      if (data?.download_url) {
        window.open(data.download_url, '_blank');
      }
    } catch (err) {
      console.error('Download error', err);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDocNumber) return;
    try {
      setSubmitting(true);
      await api.post('/documents', {
        title: formTitle,
        category: formCategory,
        document_number: formDocNumber,
        issuing_authority: formAuthority,
        expiry_date: formExpiryDate || null,
        file_url: formFileUrl || 'https://storage.mediflow.io/documents/sample_spec.pdf',
        file_size_bytes: 1048576,
        mime_type: 'application/pdf'
      });
      setShowUploadModal(false);
      setFormTitle('');
      setFormDocNumber('');
      fetchDocuments();
    } catch (err) {
      console.error('Upload document error', err);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = categoryFilter === 'all'
    ? documents
    : documents.filter(d => d.category === categoryFilter);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1600, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Enterprise Document Repository & Compliance Archive
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Controlled document storage for NABL/CAP accreditations, statutory licenses, SOPs, and equipment manuals
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Plus size={16} /> Archive Document
        </button>
      </div>

      {/* Category Pills Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'All Documents' },
          { key: 'accreditation', label: 'Accreditations (NABL/CAP)' },
          { key: 'license', label: 'Statutory Licenses' },
          { key: 'sop', label: 'Standard Operating Procedures' },
          { key: 'manual', label: 'Equipment Manuals' },
          { key: 'certification', label: 'Staff Certifications' }
        ].map(cat => (
          <button
            key={cat.key}
            onClick={() => setCategoryFilter(cat.key)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              border: categoryFilter === cat.key ? 'none' : '1px solid #e2e8f0',
              background: categoryFilter === cat.key ? '#0284c7' : '#ffffff',
              color: categoryFilter === cat.key ? '#ffffff' : '#475569'
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Documents Grid / Table */}
      <div className="card" style={{ padding: 22 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
            Loading document archives...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#64748b' }}>
            <FileText size={40} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
            <p>No documents found matching this category filter.</p>
          </div>
        ) : (
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: 12, color: '#64748b' }}>
                <th style={{ padding: '10px 14px' }}>DOCUMENT TITLE & REF</th>
                <th style={{ padding: '10px 14px' }}>CATEGORY</th>
                <th style={{ padding: '10px 14px' }}>ISSUING BODY</th>
                <th style={{ padding: '10px 14px' }}>VERSION</th>
                <th style={{ padding: '10px 14px' }}>EXPIRY DATE</th>
                <th style={{ padding: '10px 14px' }}>STATUS</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => (
                <tr key={doc.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{doc.title}</div>
                    <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{doc.document_number}</div>
                  </td>
                  <td style={{ padding: '12px 14px', textTransform: 'uppercase', fontSize: 11, fontWeight: 700, color: '#64748b' }}>
                    {doc.category}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#475569' }}>
                    {doc.issuing_authority || 'Internal Laboratory QA'}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                      v{doc.version}.0
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#475569' }}>
                    {doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString() : 'Perpetual'}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: doc.status === 'active' ? '#ecfdf5' : '#fffbeb',
                      color: doc.status === 'active' ? '#166534' : '#b45309'
                    }}>
                      {(doc.status || 'active').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDownload(doc.id, doc.title)}
                      className="btn btn-secondary"
                      style={{ fontSize: 12, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <Download size={14} /> Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 16
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 540, padding: 24, borderRadius: 14 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 16px', color: '#0f172a' }}>
              Archive Controlled Document
            </h2>

            <form onSubmit={handleCreateDocument} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                  DOCUMENT TITLE *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ISO 15189:2022 Medical Laboratory Quality Manual"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                    CATEGORY
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="accreditation">Accreditation (NABL/CAP)</option>
                    <option value="license">Statutory License</option>
                    <option value="sop">Standard Operating Procedure</option>
                    <option value="manual">Equipment Manual</option>
                    <option value="certification">Staff Certification</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                    DOCUMENT NUMBER / CODE *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NABL-MC-2026-088"
                    value={formDocNumber}
                    onChange={(e) => setFormDocNumber(e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                    ISSUING AUTHORITY
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. National Accreditation Board (NABL)"
                    value={formAuthority}
                    onChange={(e) => setFormAuthority(e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                    EXPIRATION DATE
                  </label>
                  <input
                    type="date"
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    className="input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                  FILE URL / STORAGE PATH
                </label>
                <input
                  type="text"
                  placeholder="https://storage.mediflow.io/documents/..."
                  value={formFileUrl}
                  onChange={(e) => setFormFileUrl(e.target.value)}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? 'Archiving...' : 'Commit to Document Repository'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManager;
