import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { I } from '../All/icons';
import VinylWidget from './VinylWidget';
import { useAuthContext } from '../../AuthContext';
import { useSearchPalette } from '../Search/SearchPalette';

const PAGE_LABELS = {
  '/now': 'Now Playing',
  '/home': 'Dashboard',
  '/search': 'Search',
  '/collection': 'Collection',
  '/wantlist': 'Wantlist',
  '/match': 'Match',
  '/meter': 'Meter',
  '/rating': 'Rating',
  '/profile': 'Profile',
  '/admin': 'Admin',
  '/release': 'Release',
  '/artist': 'Artist',
  '/label': 'Label',
};

export default function Topbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { authState, isAuthenticated } = useAuthContext();
  const { openPalette } = useSearchPalette();

  const label = Object.entries(PAGE_LABELS).find(([p]) => pathname.startsWith(p))?.[1] || 'Dashboard';
  const profilePath = authState?.username ? `/profile/${authState.username}` : '/login';

  return (
    <header className="topbar">
      <div className="topbar__title">
        <span className="crumb">Grailmeter</span>
        <span className="sep">›</span>
        <span>{label}</span>
      </div>

      <button type="button" className="topbar__search" onClick={openPalette}>
        <I.Search />
        <span>Search artists, releases, labels…</span>
        <span className="kbd">Ctrl K</span>
      </button>

      <div className="topbar__spacer" />

      <button type="button" className="topbar__icon-btn" title="Notifications">
        <I.Bell />
      </button>

      <VinylWidget />

      <button
        type="button"
        className="topbar__avatar"
        onClick={() => navigate(isAuthenticated ? profilePath : '/login')}
        title={authState?.username || 'Sign in'}
      >
        {authState?.username?.slice(0, 2).toUpperCase() || '–'}
      </button>
    </header>
  );
}
