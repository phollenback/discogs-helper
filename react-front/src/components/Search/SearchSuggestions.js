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
  }, [authState.username, searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPersonalizedSuggestions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getData(`/api/suggestions/${authState.username}/personalized`);
      setSuggestions((response.suggestions || []).slice(0, 4));
    } catch (err) {
      console.error('[SearchSuggestions] Error loading suggestions:', err);
      setError('Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  };

  if (!authState.username) {
    return null;
  }

  return (
    <aside className="search-suggestions">
      <h2 className="search-suggestions__title">
        {searchTerm ? 'Suggestions' : 'For you'}
      </h2>

      {loading ? (
        <div className="search-suggestions__empty">
          <div className="spinner-border spinner-border-sm" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
          <p>Loading suggestions…</p>
        </div>
      ) : error ? (
        <p className="search-suggestions__error">{error}</p>
      ) : suggestions.length === 0 ? (
        <p className="search-suggestions__empty">No suggestions yet.</p>
      ) : (
        <div className="search-suggestions__list">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className="search-suggestion-card"
              onClick={() => onSuggestionClick(suggestion.title)}
            >
              {suggestion.cover_image ? (
                <img
                  src={suggestion.cover_image}
                  alt=""
                  className="search-suggestion-card__thumb"
                />
              ) : (
                <div className="search-suggestion-card__thumb search-suggestion-card__thumb--empty" />
              )}
              <div className="search-suggestion-card__body">
                <span className="search-suggestion-card__title">{suggestion.title}</span>
                {suggestion.artists?.length > 0 && (
                  <span className="search-suggestion-card__meta">{suggestion.artists[0].name}</span>
                )}
                <span className="search-suggestion-card__meta">{suggestion.year || 'Unknown year'}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {!searchTerm && (
        <p className="search-suggestions__footnote">Based on your wantlist</p>
      )}
    </aside>
  );
};

export default SearchSuggestions;
