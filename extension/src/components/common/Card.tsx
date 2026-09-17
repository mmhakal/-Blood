import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', style, onClick }) => {
  return (
    <div
      className={`ext-card ${className}`}
      onClick={onClick}
      style={{
        padding: 12,
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
    >
      {children}
    </div>
  );
};

export default Card;
