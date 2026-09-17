import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = <Inbox size={36} color="var(--text-muted)" />,
  action
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        textAlign: 'center',
        gap: 8
      }}
    >
      <div style={{ marginBottom: 4 }}>{icon}</div>
      <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h4>
      {description && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 240 }}>{description}</p>
      )}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
};

export default EmptyState;
