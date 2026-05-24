import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthContext } from '../../AuthContext';
import { I } from '../All/icons';

const NAV_PRIMARY = [
  { to: '/now', label: 'Now Playing', icon: I.Disc },
  { to: '/home', label: 'Dashboard', icon: I.Home },
  { to: '/search', label: 'Search', icon: I.Search },
  { to: '/collection', label: 'Collection', icon: I.Shuffle },
  { to: '/wantlist', label: 'Wantlist', icon: I.Heart },
  { to: '/match', label: 'Match', icon: I.Users },
  { to: '/meter', label: 'Meter', icon: I.Gauge },
  { to: '/rating', label: 'Rating', icon: I.Star },
];

const NAV_SECONDARY = (username) => [
  { to: username ? `/profile/${username}` : '/login', label: 'Profile', icon: I.User },
];

function RailItem({ item }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) => `rail-item ${isActive ? 'is-active' : ''}`}
    >
      <span className="rail-item__icon"><Icon /></span>
      <span className="rail-item__label">{item.label}</span>
      <span className="rail-item__tip">{item.label}</span>
    </NavLink>
  );
}

export default function Sidebar({ expandMode = 'tooltip' }) {
  const { authState, isAuthenticated, logout } = useAuthContext();
  const [hovered, setHovered] = useState(false);
  const isExpanded = expandMode === 'pinned' || (expandMode === 'hover' && hovered);
  const isAdmin = authState?.isAdmin === true || authState?.isAdmin === 1;

  return (
    <aside
      className={`rail ${isExpanded ? 'is-expanded' : ''}`}
      onMouseEnter={() => expandMode === 'hover' && setHovered(true)}
      onMouseLeave={() => expandMode === 'hover' && setHovered(false)}
    >
      <NavLink to={isAuthenticated ? '/now' : '/'} className="rail__brand" title="Grailmeter">
        G
      </NavLink>

      <div className="rail__group">
        {NAV_PRIMARY.map((item) => (
          <RailItem key={item.to} item={item} />
        ))}
      </div>

      <div className="rail__divider" />

      <div className="rail__group">
        {NAV_SECONDARY(authState?.username).map((item) => (
          <RailItem key={item.to} item={item} />
        ))}
        {isAdmin && <RailItem item={{ to: '/admin', label: 'Admin', icon: I.Shield }} />}
      </div>

      <div className="rail__spacer" />

      {isAuthenticated && (
        <button type="button" className="rail-item" onClick={logout} style={{ color: 'var(--muted)' }}>
          <span className="rail-item__icon"><I.Logout /></span>
          <span className="rail-item__label">Log out</span>
          <span className="rail-item__tip">Log out</span>
        </button>
      )}
    </aside>
  );
}
