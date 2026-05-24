import React from 'react';

export default function VinylDisc({ labelColor = '#E89B4D', labelText = '', faded = false }) {
  const gradId = React.useId().replace(/:/g, '');

  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', opacity: faded ? 0.5 : 1 }}>
      <defs>
        <radialGradient id={`discGrad-${gradId}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a1815" />
          <stop offset="100%" stopColor="#06050a" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="49" fill={`url(#discGrad-${gradId})`} stroke="#0a0a0e" strokeWidth="0.5" />
      {[44, 41, 38, 35, 32, 29, 26].map((r) => (
        <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="#2a2622" strokeWidth="0.18" opacity={0.6} />
      ))}
      <ellipse cx="35" cy="32" rx="22" ry="14" fill="white" opacity="0.04" transform="rotate(-20 35 32)" />
      <circle cx="50" cy="50" r="22" fill={labelColor} />
      {labelText && (
        <text
          x="50"
          y="44"
          textAnchor="middle"
          fill="rgba(0,0,0,0.75)"
          fontFamily="Geist Mono, ui-monospace, monospace"
          fontSize="3.2"
          fontWeight="600"
          letterSpacing="0.4"
        >
          {labelText.slice(0, 12)}
        </text>
      )}
      <text
        x="50"
        y="58"
        textAnchor="middle"
        fill="rgba(0,0,0,0.55)"
        fontFamily="Geist Mono, ui-monospace, monospace"
        fontSize="2.4"
        letterSpacing="0.4"
      >
        SIDE A · 33⅓
      </text>
      <circle cx="50" cy="50" r="1.6" fill="#0a0a0e" />
    </svg>
  );
}
