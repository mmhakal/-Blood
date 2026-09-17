import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'primary', style }) => {
  return (
    <span className={`ext-badge ext-badge-${variant}`} style={style}>
      {children}
    </span>
  );
};

export default Badge;
