import React from 'react';

export function Pill({ variant = 'muted', className = '', children }) {
  return (
    <span className={`pill pill--${variant} ${className}`.trim()}>
      <span className="dot" />
      {children}
    </span>
  );
}

export default Pill;
