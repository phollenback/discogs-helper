import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../utility/backSource';
import { useAuthContext } from '../../AuthContext';

const UsersDirectory = () => {
  const { getData } = useApi();
  const { isAuthenticated, authState } = useAuthContext();
  const username = authState?.username;
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('username');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [brokenAvatars, setBrokenAvatars] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getData('/api/users');
      setUsers(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error('[UsersDirectory] Failed to load users', err);
      setError('Unable to load users right now. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  }, [getData]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const loadSuggestions = useCallback(async () => {
    if (!isAuthenticated || !username) {
      setSuggestions([]);
      return;
    }

    setSuggestionsLoading(true);
    setSuggestionsError(null);
    try {
      const response = await getData(`/api/suggestions/${username}/personalized`);
      const limited = Array.isArray(response?.suggestions)
        ? response.suggestions.slice(0, 3)
        : [];
      setSuggestions(limited);
    } catch (err) {
      console.error('[UsersDirectory] Failed to load suggestions', err);
      setSuggestionsError('Could not load personalized suggestions right now.');
    } finally {
      setSuggestionsLoading(false);
    }
  }, [username, getData, isAuthenticated]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const sorted = [...users].sort((a, b) => {
      if (sortBy === 'recent') {
        return (b.user_id || 0) - (a.user_id || 0);
      }
      return (a.username || '').localeCompare(b.username || '');
    });

    if (!term) {
      return sorted;
    }

    return sorted.filter((user) => {
      const username = user.username?.toLowerCase() || '';
      const email = user.email?.toLowerCase() || '';
      return username.includes(term) || email.includes(term);
    });
  }, [users, searchTerm, sortBy]);

  const handleViewProfile = (username) => {
    if (!username) return;
    navigate(`/profile/${username}`);
  };

  const handleViewOwnProfile = () => {
    if (!username) return;
    handleViewProfile(username);
  };

  const renderAvatar = (user) => {
    const avatarKey = user.user_id || user.username || 'unknown';
    const shouldShowFallback = !user.user_image || brokenAvatars[avatarKey];

    return (
      <div className="users-directory__avatar-wrapper">
        {!shouldShowFallback && (
          <img
            src={user.user_image}
            alt={user.username}
            className="users-directory__avatar"
            onError={() =>
              setBrokenAvatars((previous) => ({
                ...previous,
                [avatarKey]: true
              }))
            }
          />
        )}
        {shouldShowFallback && (
          <div className="users-directory__avatar users-directory__avatar--fallback">
            {user.username?.charAt(0)?.toUpperCase() || '?'}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="users-directory">
      <div className="container py-5">
        <div className="row align-items-center gy-3 mb-4">
          <div className="col-lg-8">
            <p className="text-uppercase text-secondary small mb-2">Explore the community</p>
            <h1 className="text-white mb-3">Welcome to Grailtopia</h1>
            <p className="text-light mb-0">
              Browse active diggers, jump into their public profiles, and discover new collections without needing
              an account. Sign in when you&apos;re ready for personalized recommendations and Discogs syncing.
            </p>
          </div>
          <div className="col-lg-4 text-lg-end">
            <button className="btn btn-outline-light me-2 mb-2 mb-lg-0" onClick={loadUsers} disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" />
                  Refreshing
                </>
              ) : (
                <>
                  <i className="fas fa-sync-alt me-2" aria-hidden="true"></i>
                  Refresh list
                </>
              )}
            </button>
            {!isAuthenticated ? (
              <button className="btn btn-light" onClick={() => navigate('/login')}>
                <i className="fas fa-sign-in-alt me-2" aria-hidden="true"></i>
                Login to personalize
              </button>
            ) : (
              <button className="btn btn-outline-light" onClick={loadSuggestions} disabled={suggestionsLoading}>
                {suggestionsLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                    Updating
                  </>
                ) : (
                  <>
                    <i className="fas fa-magic me-2" aria-hidden="true"></i>
                    Refresh suggestions
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="users-directory__controls row g-3 align-items-center mb-4">
          <div className="col-md-6">
            <div className="input-group">
              <span className="input-group-text bg-dark text-light border-secondary">
                <i className="fas fa-search" aria-hidden="true"></i>
              </span>
              <input
                type="search"
                className="form-control bg-dark text-light border-secondary"
                placeholder="Search by username or email"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>
          <div className="col-md-3">
            <select
              className="form-select bg-dark text-light border-secondary"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              <option value="username">Alphabetical</option>
              <option value="recent">Newest members</option>
            </select>
          </div>
          <div className="col-md-3 text-md-end">
            <span className="text-light text-opacity-75 small">
              Showing {filteredUsers.length} of {users.length} users
            </span>
          </div>
        </div>

        {error && (
          <div className="alert alert-warning d-flex justify-content-between align-items-center" role="alert">
            <span>{error}</span>
            <button className="btn btn-sm btn-outline-dark" onClick={loadUsers}>
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-light" role="status" />
            <p className="text-light mt-3">Loading the community roster...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-5">
            <i className="fas fa-users-slash fa-3x text-secondary mb-3" aria-hidden="true"></i>
            <h4 className="text-white">No users match that search</h4>
            <p className="text-light text-opacity-75">Try adjusting your keywords or reset the filters.</p>
            <button
              className="btn btn-outline-light mt-2"
              onClick={() => {
                setSearchTerm('');
                setSortBy('username');
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="row g-4">
            {filteredUsers.map((user, index) => (
              <div className="col-xl-3 col-lg-4 col-md-6" key={user.user_id || user.username || `user-${index}`}>
                <div className="users-directory__card h-100">
                  <div className="text-center">{renderAvatar(user)}</div>
                  <h5 className="text-white text-center mt-3 mb-1">{user.username}</h5>
                  <p className="text-secondary text-center small mb-3">{user.email}</p>
                  <div className="d-grid gap-2">
                    <button className="btn btn-outline-light btn-sm" onClick={() => handleViewProfile(user.username)}>
                      View profile
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {isAuthenticated && (
          <div className="mt-5">
            <div className="row">
              <div className="col-12">
                <div className="users-directory__suggestions card border-0 shadow-lg">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <p className="text-uppercase text-secondary small mb-1">Personalized for you</p>
                        <h4 className="text-white mb-0">Fresh suggestions</h4>
                      </div>
                      <button
                        className="btn btn-outline-light btn-sm"
                        onClick={loadSuggestions}
                        disabled={suggestionsLoading}
                      >
                        {suggestionsLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" />
                            Loading
                          </>
                        ) : (
                          <>
                            <i className="fas fa-sync-alt me-2" aria-hidden="true"></i>
                            Refresh
                          </>
                        )}
                      </button>
                    </div>

                    {suggestionsError && (
                      <div className="alert alert-warning" role="alert">
                        {suggestionsError}
                      </div>
                    )}

                    {suggestionsLoading ? (
                      <div className="text-center py-4">
                        <div className="spinner-border text-light" role="status" />
                        <p className="text-light mt-3 small">Analyzing your wantlist...</p>
                      </div>
                    ) : suggestions.length === 0 ? (
                      <div className="text-center py-4">
                        <i className="fas fa-headphones-alt fa-2x text-secondary mb-3" aria-hidden="true"></i>
                        <p className="text-light mb-0">No suggestions yet. Keep building your wantlist!</p>
                      </div>
                    ) : (
                      <div className="row g-4">
                        {suggestions.map((suggestion, index) => (
                          <div className="col-md-4" key={suggestion.discogs_id || index}>
                            <div className="suggestion-card h-100 p-3 rounded">
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="badge bg-light text-dark">#{index + 1}</span>
                                {suggestion.year && (
                                  <span className="text-light text-opacity-75 small">{suggestion.year}</span>
                                )}
                              </div>
                              <h5 className="text-white text-truncate" title={suggestion.title}>
                                {suggestion.title}
                              </h5>
                              <p className="text-secondary small mb-3 text-truncate">
                                {suggestion.artists?.map((artist) => artist.name).join(', ') || 'Unknown artist'}
                              </p>
                              <div className="d-grid gap-2 mt-auto">
                                <button
                                  className="btn btn-light btn-sm"
                                  onClick={() =>
                                    window.open(
                                      suggestion.resource_url || `https://www.discogs.com/release/${suggestion.discogs_id}`,
                                      '_blank'
                                    )
                                  }
                                >
                                  View on Discogs
                                </button>
                                <button
                                  className="btn btn-outline-light btn-sm"
                                  onClick={handleViewOwnProfile}
                                  disabled={!authState?.username}
                                >
                                  Go to profile
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default UsersDirectory;

