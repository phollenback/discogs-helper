import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { SearchPaletteProvider } from '../Search/SearchPalette';

export default function Shell() {
  return (
    <SearchPaletteProvider>
      <div className="app">
        <Sidebar expandMode="tooltip" />
        <div className="main-col">
          <Topbar />
          <main className="content">
            <Outlet />
          </main>
        </div>
      </div>
    </SearchPaletteProvider>
  );
}
