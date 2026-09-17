import React from 'react';
import { Activity, ExternalLink, Settings, Globe } from 'lucide-react';
import { SessionData } from '../../types';
import { lisIntegration } from '../../services/integration/lisIntegration';
import { i18n, SupportedLanguage } from '../../services/i18n';

interface HeaderProps {
  session: SessionData | null;
  onOpenSettings?: () => void;
  onOpenSidepanel?: () => void;
  title?: string;
}

export const ExtensionHeader: React.FC<HeaderProps> = ({
  session,
  onOpenSettings,
  onOpenSidepanel,
  title = 'MediFlow LIS'
}) => {
  const isOnline = navigator.onLine;
  const currentLang = i18n.getLanguage();

  const toggleLanguage = () => {
    const next: SupportedLanguage = currentLang === 'en' ? 'hi' : 'en';
    i18n.setLanguage(next);
  };

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 2px 5px rgba(2, 132, 199, 0.3)'
          }}
        >
          <Activity size={15} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {title}
          </div>
          {session?.activeBranchName && (
            <div style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 600 }}>
              {session.activeBranchName}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Online Status Dot */}
        <div
          title={isOnline ? 'LIS Online' : 'Offline'}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: isOnline ? 'var(--success)' : 'var(--danger)',
            boxShadow: isOnline ? '0 0 6px var(--success)' : 'none'
          }}
        />

        {/* Language switch */}
        <button
          onClick={toggleLanguage}
          title="Switch Language (EN / HI)"
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '2px 5px',
            borderRadius: 4
          }}
        >
          {currentLang.toUpperCase()}
        </button>

        {/* Web App Link */}
        <button
          onClick={() => lisIntegration.openWebApp()}
          title="Launch Full LIS Web App"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            padding: 4,
            borderRadius: 4
          }}
        >
          <ExternalLink size={15} />
        </button>

        {/* Settings button */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            title="Options & Settings"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              padding: 4,
              borderRadius: 4
            }}
          >
            <Settings size={15} />
          </button>
        )}
      </div>
    </header>
  );
};

export default ExtensionHeader;
