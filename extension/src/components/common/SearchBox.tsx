import React, { useState, useEffect } from 'react';
import { Search, X, Loader } from 'lucide-react';

interface SearchBoxProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  loading?: boolean;
  onClear?: () => void;
  autoFocus?: boolean;
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  loading = false,
  onClear,
  autoFocus = false
}) => {
  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
      <div style={{ position: 'absolute', left: 10, color: 'var(--text-muted)', display: 'flex', pointerEvents: 'none' }}>
        {loading ? <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={15} />}
      </div>
      <input
        type="text"
        className="ext-input"
        style={{ paddingLeft: 32, paddingRight: value ? 30 : 12, height: 34, fontSize: 12 }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
      {value && (
        <button
          onClick={() => {
            onChange('');
            onClear?.();
          }}
          style={{
            position: 'absolute',
            right: 8,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};

export default SearchBox;
