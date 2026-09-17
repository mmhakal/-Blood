import React, { useState, useEffect } from 'react';
import {
  Search, User, ClipboardList, Scan, FileText, TestTubes,
  Boxes, Cpu, ArrowRight, Sparkles, Filter, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

interface SearchItem {
  entity_type: 'patient' | 'order' | 'sample' | 'report' | 'test' | 'doctor' | 'invoice' | 'inventory' | 'analyzer';
  entity_id: string;
  title: string;
  subtitle: string;
  badge?: string;
  badge_color?: string;
  url: string;
  created_at?: string;
}

export const GlobalIntelligentSearch: React.FC = () => {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [parsedIntent, setParsedIntent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const executeSearch = async (term: string) => {
    if (!term || term.trim().length < 2) {
      setResults([]);
      setParsedIntent(null);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setParsedIntent(data.parsed_intent || null);
      }
    } catch (err) {
      console.error('Search error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      executeSearch(query);
    }, 250);
    return () => clearTimeout(handler);
  }, [query]);

  const filteredResults = activeFilter === 'all'
    ? results
    : results.filter(r => r.entity_type === activeFilter);

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'patient': return <User size={18} color="#0284c7" />;
      case 'order': return <ClipboardList size={18} color="#6366f1" />;
      case 'sample': return <Scan size={18} color="#10b981" />;
      case 'report': return <FileText size={18} color="#f59e0b" />;
      case 'test': return <TestTubes size={18} color="#8b5cf6" />;
      case 'inventory': return <Boxes size={18} color="#d97706" />;
      case 'analyzer': return <Cpu size={18} color="#0d9488" />;
      default: return <Search size={18} color="#64748b" />;
    }
  };

  const sampleQuickQueries = [
    'CBC', 'Rohan', 'Sysmex', 'EDTA', 'reagent', 'stat orders'
  ];

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Search Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
          Intelligent Global LIS Search
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
          Natural-language contextual discovery across patients, test orders, specimens, analyzers, diagnostic reports & inventory
        </p>

        {/* Big Search Input */}
        <div style={{
          position: 'relative',
          maxWidth: 720,
          margin: '24px auto 0'
        }}>
          <Search size={22} color="#94a3b8" style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by patient name, order #, barcode, reagent SKU, or test parameter..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              padding: '16px 20px 16px 56px',
              fontSize: 16,
              borderRadius: 14,
              border: '2px solid #e2e8f0',
              background: '#ffffff',
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.08)',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
          />
        </div>

        {/* Quick Suggestion Pills */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Try queries:</span>
          {sampleQuickQueries.map((sq) => (
            <button
              key={sq}
              onClick={() => setQuery(sq)}
              style={{
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: 20,
                padding: '3px 12px',
                fontSize: 12,
                color: '#475569',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {sq}
            </button>
          ))}
        </div>
      </div>

      {/* Natural-Language Intent Banner */}
      {parsedIntent && (
        <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 10,
          padding: '12px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: '#1e40af',
          fontSize: 13,
          fontWeight: 600
        }}>
          <Sparkles size={18} color="#3b82f6" />
          <span>Intent Recognized: {parsedIntent}</span>
        </div>
      )}

      {/* Filter Category Pills */}
      {results.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {['all', 'patient', 'order', 'sample', 'report', 'test', 'inventory', 'analyzer'].map((cat) => {
            const count = cat === 'all' ? results.length : results.filter(r => r.entity_type === cat).length;
            if (cat !== 'all' && count === 0) return null;

            return (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: activeFilter === cat ? 'none' : '1px solid #e2e8f0',
                  background: activeFilter === cat ? '#0284c7' : '#ffffff',
                  color: activeFilter === cat ? '#ffffff' : '#475569',
                  textTransform: 'capitalize'
                }}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Results List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          Searching across indexed entities...
        </div>
      ) : filteredResults.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredResults.map((item) => (
            <Link
              key={`${item.entity_type}-${item.entity_id}`}
              to={item.url}
              style={{
                textDecoration: 'none',
                color: 'inherit'
              }}
            >
              <div
                className="card"
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {getEntityIcon(item.entity_type)}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                        {item.title}
                      </span>
                      {item.badge && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: item.badge_color ? `${item.badge_color}18` : '#f1f5f9',
                          color: item.badge_color || '#475569'
                        }}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                      {item.subtitle}
                    </div>
                  </div>
                </div>

                <ArrowRight size={18} color="#94a3b8" />
              </div>
            </Link>
          ))}
        </div>
      ) : query.length >= 2 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <Search size={36} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>
            No matching entities found
          </h3>
          <p style={{ fontSize: 13, margin: 0 }}>
            Try adjusting your search keywords, barcode ID, or patient name.
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default GlobalIntelligentSearch;
