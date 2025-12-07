import React, { useMemo, useState } from 'react';

const SEARCH_OPTIONS = [
  { value: 'release', label: 'Releases', icon: 'fa-record-vinyl' },
  { value: 'artist', label: 'Artists', icon: 'fa-user' },
  { value: 'label', label: 'Labels', icon: 'fa-tag' },
];

const SearchForm = ({ setSearchTerm, searchType, onSearchTypeChange }) => {
  const [searchKey, setSearchKey] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const placeholderText = useMemo(() => {
    switch (searchType) {
      case 'artist':
        return 'Enter artist name...';
      case 'label':
        return 'Enter label name...';
      default:
        return 'Enter artist, album, or label name...';
    }
  }, [searchType]);

  const handleChangeInput = (event) => {
    const value = event.target.value;
    setSearchKey(value);
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    if (searchKey.trim()) {
      setIsSearching(true);
      setSearchTerm(searchKey.trim());
      console.log("Form submitted with search term:", searchKey.trim());
      
      // Reset searching state after a short delay
      setTimeout(() => setIsSearching(false), 1000);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleFormSubmit(event);
    }
  };

  return (
    <div className="search-form-container">
      <div className="text-center mb-4">
        <h2 className="display-6 mb-2">
          <i className="fas fa-search me-3 text-primary"></i>
          Search Discogs Database
        </h2>
        <p className="text-muted">
          Find releases, artists, and labels from the world's largest music database
        </p>
      </div>
      
      <form onSubmit={handleFormSubmit} className="search-form">
        <div className="row g-3 align-items-end">
          <div className="col-12">
            <label className="form-label">
              <i className="fas fa-toggle-on me-2"></i>
              Search For
            </label>
            <div className="btn-group w-100" role="group" aria-label="Search type">
              {SEARCH_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`btn btn-outline-primary ${searchType === option.value ? 'active' : ''}`}
                  onClick={() => onSearchTypeChange(option.value)}
                >
                  <i className={`fas ${option.icon} me-2`}></i>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="col-md-8">
            <label htmlFor="searchInput" className="form-label">
              <i className="fas fa-music me-2"></i>
              Search Term
            </label>
            <input
              id="searchInput"
              type="text"
              className="form-control form-control-lg"
              value={searchKey}
              placeholder={placeholderText}
              onChange={handleChangeInput}
              onKeyPress={handleKeyPress}
              disabled={isSearching}
              style={{
                borderRadius: '25px',
                padding: '15px 25px',
                border: '2px solid #e9ecef',
                fontSize: '1.1rem',
                transition: 'all 0.3s ease'
              }}
            />
          </div>
          <div className="col-md-4">
            <button 
              type='submit' 
              className={`btn btn-primary btn-lg w-100 ${isSearching ? 'disabled' : ''}`}
              disabled={isSearching || !searchKey.trim()}
              style={{
                borderRadius: '25px',
                padding: '15px 25px',
                fontSize: '1.1rem',
                fontWeight: '600',
                transition: 'all 0.3s ease'
              }}
            >
              {isSearching ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Searching...
                </>
              ) : (
                <>
                  <i className="fas fa-search me-2"></i>
                  Search
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="row mt-3">
          <div className="col-12">
            <div className="search-tips">
              <small className="text-muted">
                <i className="fas fa-lightbulb me-2"></i>
                <strong>Search Tips:</strong> Try searching by artist name, album title, label, or catalog number for best results
              </small>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SearchForm;