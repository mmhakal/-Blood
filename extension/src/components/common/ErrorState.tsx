import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 16px',
        textAlign: 'center',
        gap: 8,
        background: 'var(--danger-light)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(239, 68, 68, 0.2)'
      }}
    >
      <AlertCircle size={28} color="var(--danger)" />
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--danger)', maxWidth: 280 }}>
        {message}
      </span>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} icon={<RefreshCw size={12} />} style={{ marginTop: 4 }}>
          Try Again
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
