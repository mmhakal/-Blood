import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, icon, className = '', style, ...props }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
      {label && (
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon && (
          <div style={{ position: 'absolute', left: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
            {icon}
          </div>
        )}
        <input
          className={`ext-input ${className}`}
          style={{
            paddingLeft: icon ? 34 : 12,
            borderColor: error ? 'var(--danger)' : undefined,
            ...style
          }}
          {...props}
        />
      </div>
      {error && (
        <span style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>{error}</span>
      )}
    </div>
  );
};

export default Input;
