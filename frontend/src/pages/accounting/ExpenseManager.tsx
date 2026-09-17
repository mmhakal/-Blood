import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Filter, Trash2, TrendingDown,
  Calendar, Building2, CheckCircle2, AlertCircle, X
} from 'lucide-react';
import api from '../../services/api';

export const ExpenseManager: React.FC = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Filters
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    branch_id: '',
    category_id: '',
    title: '',
    amount: '',
    payment_method: 'Cash',
    payee: '',
    invoice_reference: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedBranch, selectedCategory]);

  const loadData = async () => {
    setLoading(true);
    try {
      let endpoint = '/accounting/expenses?';
      if (selectedBranch) endpoint += `branch_id=${selectedBranch}&`;
      if (selectedCategory) endpoint += `category_id=${selectedCategory}&`;

      const [expRes, catRes, branchRes] = await Promise.all([
        api.get(endpoint),
        api.get('/accounting/categories'),
        api.get('/branches'),
      ]);

      setExpenses(expRes);
      setCategories(catRes);
      setBranches(branchRes);
      if (branchRes?.length > 0 && !formData.branch_id) {
        setFormData(prev => ({ ...prev, branch_id: branchRes[0].id }));
      }
      if (catRes?.length > 0 && !formData.category_id) {
        setFormData(prev => ({ ...prev, category_id: catRes[0].id }));
      }
    } catch (err) {
      console.error('Failed to load expense records', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return;

    setSubmitting(true);
    try {
      await api.post('/accounting/expenses', {
        ...formData,
        amount: parseFloat(formData.amount),
      });
      setShowModal(false);
      setFormData({
        branch_id: branches[0]?.id || '',
        category_id: categories[0]?.id || '',
        title: '',
        amount: '',
        payment_method: 'Cash',
        payee: '',
        invoice_reference: '',
        notes: '',
      });
      loadData();
    } catch (err: any) {
      alert('Failed to record expense: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to void/delete this expense entry?')) return;
    try {
      await api.delete(`/accounting/expenses/${id}`);
      loadData();
    } catch (err: any) {
      alert('Error deleting expense: ' + err.message);
    }
  };

  const filtered = expenses.filter(e =>
    (e.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.payee || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.category_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalExpenseSum = filtered.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>Operating Expense Manager</h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>Track reagent procurement, lab consumables, maintenance & operational costs</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={16} />
          <span>New Expense Entry</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', backgroundColor: '#fff', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 20, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search expenses by title, payee, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
          />
        </div>

        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, backgroundColor: '#fff' }}
        >
          <option value="">All Branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, backgroundColor: '#fff' }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <div style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: '#dc2626' }}>
          Total Filtered: ₹{totalExpenseSum.toLocaleString()}
        </div>
      </div>

      {/* Expense Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading expense ledger...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No expense records found matching filters.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 14px' }}>Date</th>
                  <th style={{ padding: '12px 14px' }}>Expense Title / Payee</th>
                  <th style={{ padding: '12px 14px' }}>Category</th>
                  <th style={{ padding: '12px 14px' }}>Branch</th>
                  <th style={{ padding: '12px 14px' }}>Mode</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((exp) => (
                  <tr key={exp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>
                      {new Date(exp.expense_date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{exp.title}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Payee: {exp.payee || 'Direct Vendor'}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, backgroundColor: '#f1f5f9', color: '#334155' }}>
                        {exp.category_name || 'General'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>{exp.branch_name || 'Central'}</td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>{exp.payment_method}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                      ₹{Number(exp.amount).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleDelete(exp.id)}
                        title="Void expense"
                        style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Expense Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{
            width: '100%',
            maxWidth: 500,
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 24,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Record Operating Expense</h2>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Branch</label>
                  <select
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Expense Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Expense Title / Description</label>
                <input
                  type="text"
                  placeholder="e.g. EDTA Vacuum Tube Pack Purchase"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Payment Method</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="UPI">UPI</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Payee / Vendor</label>
                  <input
                    type="text"
                    placeholder="e.g. Bio-Rad Laboratories"
                    value={formData.payee}
                    onChange={(e) => setFormData({ ...formData, payee: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Invoice / Voucher Ref #</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-99"
                    value={formData.invoice_reference}
                    onChange={(e) => setFormData({ ...formData, invoice_reference: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional internal justification or notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ padding: '8px 18px', fontSize: 13 }}
                >
                  {submitting ? 'Saving...' : 'Post Expense to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
