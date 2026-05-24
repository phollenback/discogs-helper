import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { I } from '../All/icons';
import SearchForm from '../Search/SearchForm';

const SearchPaletteContext = createContext(null);

export function SearchPaletteProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [searchType, setSearchType] = useState('release');
  const navigate = useNavigate();

  const openPalette = useCallback(() => setOpen(true), []);
  const closePalette = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const goToSearch = (term, type) => {
    const params = new URLSearchParams({ q: term, type: type || searchType });
    navigate(`/search?${params.toString()}`);
    setOpen(false);
  };

  return (
    <SearchPaletteContext.Provider value={{ open, openPalette, closePalette }}>
      {children}
      {open && (
        <div
          className="search-palette-backdrop"
          onClick={closePalette}
          role="presentation"
        >
          <div
            className="search-palette"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Search Discogs"
          >
            <div className="search-palette__header">
              <I.Search />
              <span>Search Discogs</span>
              <button type="button" className="search-palette__close" onClick={closePalette} aria-label="Close">
                Esc
              </button>
            </div>
            <SearchForm
              variant="palette"
              autoFocus
              searchType={searchType}
              onSearchTypeChange={setSearchType}
              setSearchTerm={() => {}}
              onSubmit={goToSearch}
            />
          </div>
        </div>
      )}
    </SearchPaletteContext.Provider>
  );
}

export function useSearchPalette() {
  const ctx = useContext(SearchPaletteContext);
  if (!ctx) {
    throw new Error('useSearchPalette must be used within SearchPaletteProvider');
  }
  return ctx;
}
