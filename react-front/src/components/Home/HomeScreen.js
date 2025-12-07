import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../AuthContext';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../utility/backSource';

const HomeScreen = () => {
  const { authState, logout } = useAuthContext();
  const navigate = useNavigate();
  const { getData } = useApi();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ totalSuggestions: 0, genres: 0, styles: 0 });
  const [sortBy, setSortBy] = useState('title');
  const [filterYear, setFilterYear] = useState('');

  useEffect(() => {
    if (authState.username) {
      loadPersonalizedSuggestions();
    }
  }, [authState.username]);

  const loadPersonalizedSuggestions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[HomeScreen] Loading personalized suggestions for:', authState.username);
      const response = await getData(`/api/suggestions/${authState.username}/personalized`);
      
      console.log('[HomeScreen] Suggestions received:', response);
      setSuggestions(response.suggestions || []);
      
      // Load stats from styles endpoint
      try {
        const stylesResponse = await getData(`/api/suggestions/${authState.username}/styles`);
        setStats({
          totalSuggestions: response.suggestions?.length || 0,
          genres: stylesResponse.genres?.length || 0,
          styles: stylesResponse.styles?.length || 0
        });
      } catch (err) {
        console.warn('[HomeScreen] Could not load stats:', err);
      }
    } catch (err) {
      console.error('[HomeScreen] Error loading suggestions:', err);
      setError('Failed to load personalized suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleSearchClick = () => {
    navigate('/search');
  };

  const handleCollectionClick = () => {
    navigate('/collection');
  };

  const handleWantlistClick = () => {
    navigate('/wantlist');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  // Filter and sort suggestions
  const filteredAndSortedSuggestions = suggestions
    .filter(suggestion => {
      if (!filterYear) return true;
      return suggestion.year && suggestion.year.toString().includes(filterYear);
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'year':
          return (b.year || 0) - (a.year || 0);
        case 'artist':
          const aArtist = a.artists?.[0]?.name || '';
          const bArtist = b.artists?.[0]?.name || '';
          return aArtist.localeCompare(bArtist);
        case 'title':
        default:
          return a.title.localeCompare(b.title);
      }
    });

  return (
    <div className="min-vh-100" style={{ background: '#1a1a1a' }}>
      {/* Header */}
      <div className="container-fluid py-3 py-md-4">
        <div className="row align-items-center">
          <div className="col-12 col-md-6 mb-3 mb-md-0">
            <h1 className="text-white mb-1 mb-md-0">
              <i className="fas fa-music me-2 me-md-3"></i>
              Grailtopia
            </h1>
            <p className="text-light mb-0 small">Your personalized vinyl discovery platform • <span className="text-light opacity-75">Digital Rev</span></p>
          </div>
          <div className="col-12 col-md-6 text-center text-md-end">
            <div className="btn-group-vertical btn-group-sm d-md-none w-100" role="group">
              <button onClick={handleSearchClick} className="btn btn-outline-light mb-2">
                <i className="fas fa-search me-2"></i>Search
              </button>
              <button onClick={handleCollectionClick} className="btn btn-outline-light mb-2">
                <i className="fas fa-compact-disc me-2"></i>Collection
              </button>
              <button onClick={handleWantlistClick} className="btn btn-outline-light mb-2">
                <i className="fas fa-heart me-2"></i>Wantlist
              </button>
              <button onClick={handleProfileClick} className="btn btn-outline-light mb-2">
                <i className="fas fa-user me-2"></i>Profile
              </button>
              <button onClick={handleLogout} className="btn btn-warning">
                <i className="fas fa-sign-out-alt me-2"></i>Logout
              </button>
            </div>
            <div className="btn-group d-none d-md-flex" role="group">
              <button onClick={handleSearchClick} className="btn btn-outline-light me-2">
                <i className="fas fa-search me-2"></i>Search
              </button>
              <button onClick={handleCollectionClick} className="btn btn-outline-light me-2">
                <i className="fas fa-compact-disc me-2"></i>Collection
              </button>
              <button onClick={handleWantlistClick} className="btn btn-outline-light me-2">
                <i className="fas fa-heart me-2"></i>Wantlist
              </button>
              <button onClick={handleProfileClick} className="btn btn-outline-light me-2">
                <i className="fas fa-user me-2"></i>Profile
              </button>
              <button onClick={handleLogout} className="btn btn-warning">
                <i className="fas fa-sign-out-alt me-2"></i>Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-fluid px-4">
        {/* Welcome Section */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-lg" style={{ background: '#2a2a2a', border: '1px solid #404040' }}>
              <div className="card-body p-5">
                <div className="row align-items-center">
                  <div className="col-12 col-md-8">
                    <h2 className="text-white mb-2 mb-md-3">
                      Welcome back, {authState.username}! 👋
                    </h2>
                    <p className="lead text-light mb-3 mb-md-4 small">
                      Discover new vinyl based on your musical taste. We've analyzed your wantlist to bring you personalized recommendations.
                    </p>
                    <div className="d-flex flex-column flex-md-row gap-2 gap-md-3">
                      <button onClick={loadPersonalizedSuggestions} className="btn btn-light" disabled={loading}>
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Loading...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-refresh me-2"></i>
                            Refresh Suggestions
                          </>
                        )}
                      </button>
                      <button onClick={handleSearchClick} className="btn btn-outline-light">
                        <i className="fas fa-search me-2"></i>
                        Explore More
                      </button>
                    </div>
                  </div>
                  <div className="col-12 col-md-4 text-center d-none d-md-block">
                    <div className="display-1 text-light opacity-25">
                      <i className="fas fa-vinyl"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        {stats.genres > 0 && (
          <div className="row mb-4">
            <div className="col-12">
              <div className="card border-0 shadow" style={{ background: '#2a2a2a', border: '1px solid #404040' }}>
                <div className="card-body p-4">
                  <h5 className="text-white mb-3">
                    <i className="fas fa-chart-pie me-2"></i>
                    Your Musical Taste Analysis
                  </h5>
                  <div className="row text-center">
                    <div className="col-md-3 col-6 mb-3">
                      <div className="p-3 rounded" style={{ background: '#404040' }}>
                        <div className="display-6 text-white mb-1">{stats.genres}</div>
                        <div className="text-light small">Genres</div>
                      </div>
                    </div>
                    <div className="col-md-3 col-6 mb-3">
                      <div className="p-3 rounded" style={{ background: '#404040' }}>
                        <div className="display-6 text-white mb-1">{stats.styles}</div>
                        <div className="text-light small">Styles</div>
                      </div>
                    </div>
                    <div className="col-md-3 col-6 mb-3">
                      <div className="p-3 rounded" style={{ background: '#404040' }}>
                        <div className="display-6 text-white mb-1">{stats.totalSuggestions}</div>
                        <div className="text-light small">Suggestions</div>
                      </div>
                    </div>
                    <div className="col-md-3 col-6 mb-3">
                      <div className="p-3 rounded" style={{ background: '#404040' }}>
                        <div className="display-6 text-white mb-1">
                          <i className="fas fa-heart text-light"></i>
                        </div>
                        <div className="text-light small">Personalized</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Suggestions Section */}
        <div className="row">
          <div className="col-12">
            <div className="card border-0 shadow-lg" style={{ background: '#2a2a2a', border: '1px solid #404040' }}>
              <div className="card-header bg-transparent border-0 py-3 py-md-4">
                <div className="row align-items-center">
                  <div className="col-12 col-md-6 mb-3 mb-md-0">
                    <h3 className="text-white mb-1 mb-md-0">
                      <i className="fas fa-magic me-2 me-md-3"></i>
                      Personalized Recommendations
                    </h3>
                    <p className="text-light mb-0 small">Based on your wantlist preferences</p>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="d-flex flex-column flex-md-row gap-2 justify-content-md-end">
                      <select 
                        className="form-select form-select-sm" 
                        value={sortBy} 
                        onChange={(e) => setSortBy(e.target.value)}
                        style={{ background: '#404040', color: 'white', border: '1px solid #666' }}
                      >
                        <option value="title">Sort by Title</option>
                        <option value="year">Sort by Year</option>
                        <option value="artist">Sort by Artist</option>
                      </select>
                      <input 
                        type="text" 
                        className="form-control form-control-sm" 
                        placeholder="Filter by year..." 
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        style={{ background: '#404040', color: 'white', border: '1px solid #666' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="card-body p-4">
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-light" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-3 text-light">Analyzing your musical taste...</p>
                  </div>
                ) : error ? (
                  <div className="alert alert-warning" role="alert" style={{ background: '#404040', border: '1px solid #666', color: 'white' }}>
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {error}
                    <button onClick={loadPersonalizedSuggestions} className="btn btn-sm btn-outline-light ms-3">
                      Try Again
                    </button>
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="text-center py-5">
                    <div className="display-1 text-light mb-3">
                      <i className="fas fa-music"></i>
                    </div>
                    <h4 className="text-light">No suggestions available</h4>
                    <p className="text-light">Add some items to your wantlist to get personalized recommendations!</p>
                    <button onClick={handleWantlistClick} className="btn btn-light">
                      <i className="fas fa-plus me-2"></i>
                      Build Your Wantlist
                    </button>
                  </div>
                ) : filteredAndSortedSuggestions.length === 0 ? (
                  <div className="text-center py-5">
                    <div className="display-1 text-light mb-3">
                      <i className="fas fa-filter"></i>
                    </div>
                    <h4 className="text-light">No results found</h4>
                    <p className="text-light">Try adjusting your filters or search criteria.</p>
                    <button onClick={() => { setFilterYear(''); setSortBy('title'); }} className="btn btn-outline-light">
                      <i className="fas fa-refresh me-2"></i>
                      Clear Filters
                    </button>
                  </div>
                ) : (
                  <div className="row">
                    {filteredAndSortedSuggestions.map((suggestion, index) => (
                      <div key={index} className="col-lg-3 col-md-4 col-sm-6 mb-4">
                        <div className="card h-100 border-0 shadow-sm suggestion-card" style={{ transition: 'transform 0.2s ease-in-out', background: '#404040', border: '1px solid #666' }}>
                          <div className="position-relative">
                            {suggestion.cover_image ? (
                              <img 
                                src={suggestion.cover_image} 
                                className="card-img-top" 
                                alt={suggestion.title}
                                style={{ height: '200px', objectFit: 'cover' }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className="d-none align-items-center justify-content-center" 
                              style={{ height: '200px', background: '#2a2a2a' }}
                            >
                              <i className="fas fa-music text-light" style={{ fontSize: '3rem' }}></i>
                            </div>
                            <div className="position-absolute top-0 end-0 m-2">
                              <span className="badge bg-light text-dark">#{index + 1}</span>
                            </div>
                            <div className="position-absolute top-0 start-0 m-2">
                              <button 
                                className="btn btn-sm btn-outline-light"
                                onClick={() => window.open(suggestion.resource_url || `https://www.discogs.com/release/${suggestion.discogs_id}`, '_blank')}
                                title="View Release"
                              >
                                <i className="fas fa-external-link-alt"></i>
                              </button>
                            </div>
                          </div>
                          <div className="card-body d-flex flex-column">
                            <h6 className="card-title text-truncate text-white" title={suggestion.title}>
                              {suggestion.title}
                            </h6>
                            
                            {/* Artists Section */}
                            {suggestion.artists && suggestion.artists.length > 0 && (
                              <div className="mb-2">
                                <small className="text-light d-block mb-1">Artists:</small>
                                <div className="d-flex flex-wrap gap-1">
                                  {suggestion.artists.slice(0, 2).map((artist, artistIndex) => (
                                    <button
                                      key={artistIndex}
                                      className="btn btn-outline-light btn-sm py-0 px-2"
                                      style={{ fontSize: '0.75rem', lineHeight: '1.2' }}
                                      onClick={() => window.open(artist.resource_url || `https://www.discogs.com/artist/${artist.id}`, '_blank')}
                                      title={`View ${artist.name} on Discogs`}
                                    >
                                      {artist.name}
                                    </button>
                                  ))}
                                  {suggestion.artists.length > 2 && (
                                    <span className="text-light small">+{suggestion.artists.length - 2} more</span>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            <p className="card-text text-light small mb-2">
                              {suggestion.year ? `Released: ${suggestion.year}` : 'Year unknown'}
                            </p>
                            
                            <div className="mt-auto">
                              <div className="d-grid gap-2">
                                <button 
                                  className="btn btn-light btn-sm"
                                  onClick={() => window.open(suggestion.resource_url || `https://www.discogs.com/release/${suggestion.discogs_id}`, '_blank')}
                                >
                                  <i className="fas fa-compact-disc me-2"></i>
                                  View Release
                                </button>
                                <button 
                                  className="btn btn-outline-light btn-sm"
                                  onClick={() => {
                                    const searchQuery = `${suggestion.title} ${suggestion.artists?.[0]?.name || ''}`.trim();
                                    window.open(`https://www.discogs.com/search/?q=${encodeURIComponent(searchQuery)}`, '_blank');
                                  }}
                                >
                                  <i className="fas fa-search me-2"></i>
                                  Search Similar
                                </button>
                              </div>
                            </div>
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

      <style jsx>{`
        .suggestion-card:hover {
          transform: translateY(-5px);
        }
      `}</style>
    </div>
  );
};

export default HomeScreen;
