import React, { useEffect, useMemo, useRef, useState } from 'react';

const SEARCH_OPTIONS = [
  { value: 'release', label: 'Releases' },
  { value: 'artist', label: 'Artists' },
  { value: 'label', label: 'Labels' },
];

const SearchForm = ({
  setSearchTerm,
  searchType,
  onSearchTypeChange,
  initialTerm = '',
  variant = 'default',
  autoFocus = false,
  onSubmit,
}) => {
  const [searchKey, setSearchKey] = useState(initialTerm);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setSearchKey(initialTerm);
  }, [initialTerm]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const placeholderText = useMemo(() => {
    switch (searchType) {
      case 'artist':
        return 'Artist name…';
      case 'label':
        return 'Label name…';
      default:
        return 'Artist, album, label, or catalog #…';
    }
  }, [searchType]);

  const runSearch = (term) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setIsSearching(true);
    setSearchTerm(trimmed);
    onSubmit?.(trimmed, searchType);
    setTimeout(() => setIsSearching(false), 400);
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();
    runSearch(searchKey);
  };

  return (
    <form
      onSubmit={handleFormSubmit}
      className={`search-form${variant === 'hero' || variant === 'palette' ? ' search-form--hero' : ''}`}
    >
      <div className="search-form__types page-tabs">
        {SEARCH_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`page-tabs__btn${searchType === option.value ? ' is-active' : ''}`}
            onClick={() => onSearchTypeChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="search-form__row">
        <input
          ref={inputRef}
          id="searchInput"
          type="search"
          className="form-control search-form__input"
          value={searchKey}
          placeholder={placeholderText}
          onChange={(e) => setSearchKey(e.target.value)}
          disabled={isSearching}
          autoComplete="off"
        />
        <button
          type="submit"
          className="btn btn--primary search-form__submit"
          disabled={isSearching || !searchKey.trim()}
        >
          {isSearching ? 'Searching…' : 'Search'}
        </button>
      </div>

      {variant === 'palette' && (
        <p className="search-form__hint">
          Press <kbd className="search-form__kbd">Ctrl</kbd>+<kbd className="search-form__kbd">K</kbd> from anywhere to open search
        </p>
      )}
    </form>
  );
};

export default SearchForm;
export { SEARCH_OPTIONS };
