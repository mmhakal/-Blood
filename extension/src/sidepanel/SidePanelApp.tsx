import React, { useState, useEffect, useRef } from 'react';
import {
  Search, User, FileText, FlaskConical, Bell, ExternalLink,
  ChevronRight, ArrowRight, ShieldCheck, Clock, CheckCircle2,
  AlertCircle, Phone, Calendar, RefreshCw, X
} from 'lucide-react';
import { SessionData, SearchResultEntity, ExtensionNotification } from '../types';
import { authService } from '../services/auth/authService';
import { searchService, SearchFilter } from '../services/search/searchService';
import { notificationService } from '../services/notifications/notificationService';
import { lisIntegration } from '../services/integration/lisIntegration';
import ExtensionHeader from '../components/layout/ExtensionHeader';
import SearchBox from '../components/common/SearchBox';
import Tabs, { TabItem } from '../components/common/Tabs';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import Skeleton from '../components/common/Skeleton';
import { t, i18n } from '../services/i18n';

export const SidePanelApp: React.FC = () => {
  const [session, setSession] = useState<SessionData | null>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'activity' | 'notifications'>('search');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<SearchFilter>('all');
  const [searchResults, setSearchResults] = useState<SearchResultEntity[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Selected Patient Details Drawer
  const [selectedEntity, setSelectedEntity] = useState<SearchResultEntity | null>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<ExtensionNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Barcode quick scan
  const [barcodeInput, setBarcodeInput] = useState('');

  const searchDebounceTimer = useRef<any>(null);

  useEffect(() => {
    authService.getSession().then((s) => {
      setSession(s);
      if (s) {
        loadInitialData();
      }
    });

    const unsubAuth = authService.onSessionChange((newSession) => {
      setSession(newSession);
    });

    const unsubLang = i18n.subscribe(() => {
      setSession((prev) => (prev ? { ...prev } : null));
    });

    // Listen for context detection messages from content script or service worker
    if (typeof chrome !== 'undefined' && chrome?.runtime?.onMessage) {
      const listener = (msg: any) => {
        if (msg?.messageType === 'PAGE_CONTEXT_DETECTED' && msg.payload?.value) {
          setSearchQuery(msg.payload.value);
          executeSearch(msg.payload.value, 'all');
        }
      };
      chrome.runtime.onMessage.addListener(listener);
      return () => {
        unsubAuth();
        unsubLang();
        chrome.runtime.onMessage.removeListener(listener);
      };
    }

    return () => {
      unsubAuth();
      unsubLang();
    };
  }, []);

  const loadInitialData = async () => {
    const recents = await searchService.getRecentSearches();
    setRecentSearches(recents);
    const count = await notificationService.getUnreadCount();
    setUnreadCount(count);
    const notifs = await notificationService.getNotifications(false, 20);
    setNotifications(notifs);
  };

  const handleQueryChange = (val: string) => {
    setSearchQuery(val);
    clearTimeout(searchDebounceTimer.current);

    if (!val.trim()) {
      setSearchResults([]);
      return;
    }

    searchDebounceTimer.current = setTimeout(() => {
      executeSearch(val, searchFilter);
    }, 350);
  };

  const executeSearch = async (q: string, filter: SearchFilter) => {
    if (!q.trim()) return;
    try {
      setIsSearching(true);
      setSearchError('');
      const res = await searchService.search(q, filter);
      setSearchResults(res.results);
      const recents = await searchService.getRecentSearches();
      setRecentSearches(recents);
    } catch (err: any) {
      setSearchError(err.userMessage || 'Search query failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleFilterChange = (filter: SearchFilter) => {
    setSearchFilter(filter);
    if (searchQuery.trim()) {
      executeSearch(searchQuery, filter);
    }
  };

  const handleRecentClick = (q: string) => {
    setSearchQuery(q);
    executeSearch(q, searchFilter);
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    setSearchQuery(barcodeInput.trim());
    executeSearch(barcodeInput.trim(), 'all');
    setBarcodeInput('');
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'patient': return <User size={16} color="var(--primary)" />;
      case 'order': return <FlaskConical size={16} color="var(--accent)" />;
      case 'report': return <FileText size={16} color="var(--success)" />;
      default: return <Search size={16} color="var(--text-muted)" />;
    }
  };

  const tabs: TabItem[] = [
    { id: 'search', label: 'Search & Lookup', icon: <Search size={14} /> },
    { id: 'activity', label: 'Activity Feed', icon: <Clock size={14} /> },
    { id: 'notifications', label: 'Alerts', icon: <Bell size={14} />, count: unreadCount }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <ExtensionHeader session={session} title="MediFlow Productivity Console" />

      {/* Tabs Navigation */}
      <div style={{ padding: '0 12px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
        <Tabs tabs={tabs} activeTab={activeTab} onChange={(id) => setActiveTab(id as any)} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* TAB 1: SEARCH */}
        {activeTab === 'search' && (
          <>
            {/* Quick Barcode Scanner Form */}
            <form onSubmit={handleBarcodeSubmit} style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                placeholder="Scan Sample Barcode / Enter Order #..."
                className="ext-input"
                style={{ fontSize: 12, height: 32 }}
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
              />
              <Button type="submit" size="sm" variant="primary">
                Lookup
              </Button>
            </form>

            {/* Unified Search Box */}
            <SearchBox
              value={searchQuery}
              onChange={handleQueryChange}
              placeholder={t('extension.searchPlaceholder')}
              loading={isSearching}
              onClear={() => setSearchResults([])}
              autoFocus
            />

            {/* Entity Filter Pills */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
              {(['all', 'patient', 'order', 'report'] as SearchFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => handleFilterChange(f)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 9999,
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    border: '1px solid',
                    borderColor: searchFilter === f ? 'var(--primary)' : 'var(--border-color)',
                    background: searchFilter === f ? 'var(--primary-light)' : 'var(--bg-card)',
                    color: searchFilter === f ? 'var(--primary)' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {f === 'all' ? 'All Entities' : `${f}s`}
                </button>
              ))}
            </div>

            {/* Recent Searches */}
            {!searchQuery && recentSearches.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Recent Searches:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {recentSearches.map((rec, i) => (
                    <button
                      key={i}
                      onClick={() => handleRecentClick(rec)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 4,
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                        fontSize: 11,
                        cursor: 'pointer'
                      }}
                    >
                      {rec}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Loading Skeleton */}
            {isSearching && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Skeleton height={50} />
                <Skeleton height={50} />
                <Skeleton height={50} />
              </div>
            )}

            {/* Search Error */}
            {searchError && (
              <ErrorState message={searchError} onRetry={() => executeSearch(searchQuery, searchFilter)} />
            )}

            {/* Search Results */}
            {!isSearching && searchQuery && searchResults.length === 0 && (
              <EmptyState
                title="No matching records found"
                description={`No laboratory records match "${searchQuery}".`}
              />
            )}

            {!isSearching && searchResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                  Found {searchResults.length} results:
                </div>
                {searchResults.map((item) => (
                  <Card
                    key={`${item.entity_type}-${item.entity_id}`}
                    onClick={() => setSelectedEntity(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: 'var(--bg-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {getEntityIcon(item.entity_type)}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {item.subtitle}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {item.badge && (
                        <Badge variant="primary" style={{ backgroundColor: item.badge_color ? `${item.badge_color}22` : undefined, color: item.badge_color }}>
                          {item.badge}
                        </Badge>
                      )}
                      <ChevronRight size={14} color="var(--text-muted)" />
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Selected Entity Drawer */}
            {selectedEntity && (
              <div
                style={{
                  position: 'fixed',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'var(--bg-card)',
                  borderTop: '2px solid var(--primary)',
                  boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
                  padding: 16,
                  zIndex: 200,
                  animation: 'fadeIn 0.2s ease-out'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>
                      {selectedEntity.entity_type} Record
                    </span>
                    <h4 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0 0' }}>
                      {selectedEntity.title}
                    </h4>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {selectedEntity.subtitle}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedEntity(null)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <X size={16} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                  <Button
                    size="sm"
                    variant="primary"
                    icon={<ExternalLink size={13} />}
                    onClick={() => lisIntegration.openWebApp(selectedEntity.url)}
                  >
                    Open in LIS
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setSelectedEntity(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: RECENT ACTIVITY */}
        {activeTab === 'activity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>
              Real-time Laboratory Stream
            </div>
            <Card style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <CheckCircle2 size={16} color="var(--success)" style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Report Released — Complete Blood Count
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Patient: John Doe (PID-2026-0001) | Dr. Marcus Vance
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  Just now
                </div>
              </div>
            </Card>
            <Card style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <Clock size={16} color="var(--warning)" style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Sample Accessioned — Lipid Panel
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Barcode: SMP-2026-000002 | Apex Central Branch
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  14 minutes ago
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 3: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>
                System Alerts & Panic Results
              </span>
              <button
                onClick={loadInitialData}
                style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <RefreshCw size={11} /> Refresh
              </button>
            </div>

            {notifications.length === 0 ? (
              <EmptyState title="No active notifications" description="All diagnostic alerts are acknowledged." />
            ) : (
              notifications.map((n) => (
                <Card
                  key={n.id}
                  style={{
                    borderLeft: n.type === 'panic_result' || n.type === 'critical' ? '4px solid var(--danger)' : '4px solid var(--primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {n.title}
                    </span>
                    <Badge variant={n.type === 'panic_result' ? 'danger' : 'primary'}>
                      {n.type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {n.message}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {new Date(n.created_at).toLocaleTimeString()}
                    </span>
                    {n.link && (
                      <Button
                        size="sm"
                        variant="outline"
                        icon={<ExternalLink size={11} />}
                        onClick={() => lisIntegration.openWebApp(n.link!)}
                      >
                        Inspect
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SidePanelApp;
