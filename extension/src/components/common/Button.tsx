import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  className = '',
  style,
  ...props
}) => {
  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '5px 10px', fontSize: 11 },
    md: { padding: '7px 14px', fontSize: 12 },
    lg: { padding: '10px 18px', fontSize: 14 }
  };

  return (
    <button
      className={`ext-btn ext-btn-${variant} ${className}`}
      disabled={disabled || loading}
      style={{ ...sizeStyles[size], ...style }}
      {...props}
    >
      {loading ? (
        <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid currentColor', borderRightColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
      ) : (
        icon
      )}
      {children}
    </button>
  );
};

export default Button;
