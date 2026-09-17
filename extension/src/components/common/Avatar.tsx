import React from 'react';

interface AvatarProps {
  name: string;
  size?: number;
}

export const Avatar: React.FC<AvatarProps> = ({ name, size = 32 }) => {
  const initials = name
    .split(' ')
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  // Deterministic pastel color generator
  const colors = ['#0284c7', '#0d9488', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#db2777'];
  const colorIndex = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  const bg = colors[colorIndex];

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: bg,
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: Math.floor(size * 0.42),
        flexShrink: 0
      }}
    >
      {initials}
    </div>
  );
};

export default Avatar;
