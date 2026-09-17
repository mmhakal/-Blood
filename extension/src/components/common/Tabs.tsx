import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange }) => {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: 4, overflowX: 'auto' }}>
      {tabs.map(tab => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
              background: 'transparent',
              border: 'none',
              borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease'
            }}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span style={{
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 9999,
                background: isActive ? 'var(--primary-light)' : 'var(--bg-tertiary)',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)'
              }}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
