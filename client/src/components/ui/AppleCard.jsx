import React from 'react';

export function AppleCard({ children, className = '', glow = false, style = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`apple-glass-panel ${className}`}
      style={{
        padding: '24px',
        borderColor: glow ? 'var(--apple-border-glow)' : 'var(--apple-border)',
        boxShadow: glow
          ? '0 12px 35px rgba(0, 113, 227, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
          : 'var(--apple-shadow-glass)',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
