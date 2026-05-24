const svgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const I = {
  Disc: (p) => (
    <svg {...svgProps} {...p}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Home: (p) => (
    <svg {...svgProps} {...p}>
      <path d="M3 11.5L12 4l9 7.5" />
      <path d="M5 10v10h4v-6h6v6h4V10" />
    </svg>
  ),
  Search: (p) => (
    <svg {...svgProps} {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  ),
  Shuffle: (p) => (
    <svg {...svgProps} {...p}>
      <path d="M16 3h5v5" />
      <path d="M4 20L21 3" />
      <path d="M21 16v5h-5" />
      <path d="M15 15l6 6" />
      <path d="M4 4l5 5" />
    </svg>
  ),
  Heart: (p) => (
    <svg {...svgProps} {...p}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.17l8.84-8.78a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  Users: (p) => (
    <svg {...svgProps} {...p}>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-3.9 3.1-7 7-7s7 3.1 7 7" />
      <circle cx="17" cy="9" r="3" />
      <path d="M22 21c0-3.1-2.2-5.7-5-6.3" />
    </svg>
  ),
  Gauge: (p) => (
    <svg {...svgProps} {...p}>
      <path d="M3 14a9 9 0 0 1 18 0" />
      <path d="M12 14l4-4" />
      <circle cx="12" cy="14" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  ),
  Star: (p) => (
    <svg {...svgProps} {...p}>
      <path d="M12 3l2.6 5.6L21 9.4l-4.6 4.4L17.6 21 12 17.8 6.4 21l1.2-7.2L3 9.4l6.4-.8L12 3z" />
    </svg>
  ),
  User: (p) => (
    <svg {...svgProps} {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  ),
  Shield: (p) => (
    <svg {...svgProps} {...p}>
      <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" />
    </svg>
  ),
  Cog: (p) => (
    <svg {...svgProps} {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  ),
  Logout: (p) => (
    <svg {...svgProps} {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  ),
  Bell: (p) => (
    <svg {...svgProps} {...p}>
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  ),
  Filter: (p) => (
    <svg {...svgProps} {...p}>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  ),
  Plus: (p) => (
    <svg {...svgProps} {...p}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Share: (p) => (
    <svg {...svgProps} {...p}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 3.9M15.4 6.5l-6.8 3.9" />
    </svg>
  ),
};
