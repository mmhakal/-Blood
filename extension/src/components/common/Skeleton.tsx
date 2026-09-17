import React from 'react';

interface SkeletonProps {
  height?: number | string;
  width?: number | string;
  borderRadius?: number | string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  height = 16,
  width = '100%',
  borderRadius = 'var(--radius-sm)',
  style
}) => {
  return (
    <div
      style={{
        height,
        width,
        borderRadius,
        backgroundColor: 'var(--border-color)',
        opacity: 0.6,
        animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        ...style
      }}
    />
  );
};

export default Skeleton;
