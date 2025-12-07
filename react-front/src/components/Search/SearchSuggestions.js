import React, { useState, useEffect } from 'react';
import { useApi } from '../../utility/backSource';
import { useAuthContext } from '../../AuthContext';

const SearchSuggestions = ({ searchTerm, onSuggestionClick }) => {
  const { authState } = useAuthContext();
  const { getData } = useApi();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authState.username && !searchTerm) {
      loadPersonalizedSuggestions();
    }
  }, [authState.username, searchTerm]);

  const loadPersonalizedSuggestions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[SearchSuggestions] Loading personalized suggestions for:', authState.username);
      const response = await getData(`/api/suggestions/${authState.username}/personalized`);
      
      console.log('[SearchSuggestions] Suggestions received:', response);
      setSuggestions((response.suggestions || []).slice(0, 4)); // Limit to 4 suggestions
    } catch (err) {
      console.error('[SearchSuggestions] Error loading suggestions:', err);
      setError('Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    onSuggestionClick(suggestion.title);
  };

  if (!authState.username) {
    return null; // Don't show suggestions if user is not logged in
  }

  return (
    <div className="search-suggestions" style={{ 
      background: '#2a2a2a', 
      border: '1px solid #404040', 
      borderRadius: '8px',
      padding: '1.5rem',
      height: 'fit-content',
      position: 'sticky',
      top: '1rem'
    }}>
      <h6 className="text-white mb-3">
        <i className="fas fa-magic me-2"></i>
        {searchTerm ? 'Search Suggestions' : 'Personalized Recommendations'}
      </h6>
      
      {loading ? (
        <div className="text-center py-3">
          <div className="spinner-border text-light spinner-border-sm" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-light small mt-2 mb-0">Loading suggestions...</p>
        </div>
      ) : error ? (
        <div className="alert alert-warning" role="alert" style={{ 
          background: '#404040', 
          border: '1px solid #666', 
          color: 'white',
          fontSize: '0.875rem'
        }}>
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-3">
          <div className="text-light small">
            <i className="fas fa-music mb-2 d-block" style={{ fontSize: '1.5rem' }}></i>
            No suggestions available
          </div>
        </div>
      ) : (
        <div className="suggestion-cards">
          {suggestions.map((suggestion, index) => (
            <div 
              key={index} 
              className="card mb-3 suggestion-card" 
              style={{ 
                background: '#404040', 
                border: '1px solid #666',
                cursor: 'pointer',
                transition: 'transform 0.2s ease-in-out'
              }}
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              <div className="row g-0">
                <div className="col-4">
                  {suggestion.cover_image ? (
                    <img 
                      src={suggestion.cover_image} 
                      className="img-fluid rounded-start" 
                      alt={suggestion.title}
                      style={{ height: '60px', objectFit: 'cover', width: '100%' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className="d-none align-items-center justify-content-center" 
                    style={{ height: '60px', background: '#2a2a2a' }}
                  >
                    <i className="fas fa-music text-light" style={{ fontSize: '1.25rem' }}></i>
                  </div>
                </div>
                <div className="col-8">
                  <div className="card-body p-2">
                    <h6 className="card-title text-white small mb-1" style={{
                      fontSize: '0.75rem',
                      lineHeight: '1.2',
                      height: '2.4em',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {suggestion.title}
                    </h6>
                    
                    {/* Artists */}
                    {suggestion.artists && suggestion.artists.length > 0 && (
                      <p className="card-text text-light small mb-1" style={{
                        fontSize: '0.65rem',
                        height: '1.3em',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {suggestion.artists[0].name}
                        {suggestion.artists.length > 1 && ` +${suggestion.artists.length - 1}`}
                      </p>
                    )}
                    
                    <p className="card-text text-light small mb-0" style={{ fontSize: '0.6rem' }}>
                      <i className="fas fa-calendar me-1"></i>
                      {suggestion.year || 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {!searchTerm && (
        <div className="text-center mt-3">
          <small className="text-light">
            <i className="fas fa-info-circle me-1"></i>
            Based on your wantlist preferences
          </small>
        </div>
      )}
    </div>
  );
};

export default SearchSuggestions;
