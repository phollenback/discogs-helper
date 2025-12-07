import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/SearchList.css';
import FollowButton from '../All/FollowButton';

const truncate = (text = '', max = 160) => {
    if (!text) return '';
    return text.length > max ? `${text.slice(0, max)}…` : text;
};

const SearchList = ({ results, searchType, onAddToWantlist }) => {
    const [hoveredId, setHoveredId] = useState(null);

    const renderReleaseCard = (release) => {
        const isHovered = hoveredId === release.id;

        return (
            <div 
                key={release.id} 
                className="col-6 col-sm-4 col-md-3 col-lg-2 mb-3"
                onMouseEnter={() => setHoveredId(release.id)}
                onMouseLeave={() => setHoveredId(null)}
            >
                <div className="card h-100 search-card-compact" style={{ 
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    background: '#404040',
                    border: '1px solid #666',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    transform: isHovered ? 'translateY(-5px)' : 'translateY(0)',
                    boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <Link to={`/release/${release.id}`} className="text-decoration-none">
                        <img 
                            src={release.thumb || 'https://via.placeholder.com/150x150/cccccc/666666?text=No+Image'} 
                            className="card-img-top" 
                            alt={release.title}
                            style={{
                                width: '100%',
                                height: '150px',
                                objectFit: 'cover'
                            }}
                            onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/150x150/cccccc/666666?text=No+Image';
                            }}
                        />
                    </Link>
                    <div className="card-body p-2">
                        <Link 
                            to={`/release/${release.id}`}
                            className="text-decoration-none"
                        >
                            <h6 className="card-title mb-1" style={{
                                fontSize: '0.75rem',
                                lineHeight: '1.2',
                                height: '2.4em',
                                overflow: 'hidden',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                color: 'white'
                            }}>
                                {release.title}
                            </h6>
                        </Link>
                        <p className="card-text mb-2" style={{fontSize: '0.7rem', color: '#ccc'}}>
                            <i className="fas fa-calendar me-1"></i>
                            {release.year}
                        </p>
                        {release.genre && release.genre.length > 0 && (
                            <p className="card-text mb-2" style={{
                                fontSize: '0.65rem',
                                color: '#999',
                                height: '1.3em',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {Array.isArray(release.genre) ? release.genre.join(', ') : release.genre}
                            </p>
                        )}
                        <div className="d-grid gap-1">
                            <button
                                className="btn btn-outline-light btn-sm"
                                onClick={(e) => {
                                    e.preventDefault();
                                    onAddToWantlist(release);
                                }}
                                style={{
                                    fontSize: '0.7rem',
                                    padding: '0.25rem 0.5rem'
                                }}
                            >
                                <i className="fas fa-heart me-1"></i>
                                Wantlist
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderArtistCard = (artist) => {
        const isHovered = hoveredId === artist.id;

        return (
            <div 
                key={artist.id}
                className="col-12 col-sm-6 col-lg-4 mb-3"
                onMouseEnter={() => setHoveredId(artist.id)}
                onMouseLeave={() => setHoveredId(null)}
            >
                <div className="card h-100" style={{
                    background: '#404040',
                    border: '1px solid #666',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    transform: isHovered ? 'translateY(-5px)' : 'translateY(0)',
                    boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <div className="d-flex">
                        <div style={{ flex: '0 0 120px', background: '#2b2b2b' }}>
                            <img 
                                src={artist.thumb || 'https://via.placeholder.com/200x200/666666/cccccc?text=Artist'} 
                                alt={artist.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                    e.target.src = 'https://via.placeholder.com/200x200/666666/cccccc?text=Artist';
                                }}
                            />
                        </div>
                        <div className="card-body">
                            <h5 className="card-title text-light">{artist.name}</h5>
                            {artist.realName && (
                                <p className="card-subtitle mb-2 text-muted">
                                    <i className="fas fa-signature me-2"></i>
                                    {artist.realName}
                                </p>
                            )}
                            {artist.profile && (
                                <p className="card-text text-light small">
                                    {truncate(artist.profile, 160)}
                                </p>
                            )}
                            <div className="mt-3">
                                <div className="d-flex flex-wrap gap-2 mb-2">
                                    <FollowButton 
                                        entityType="artist" 
                                        entityId={artist.id} 
                                        entityName={artist.name}
                                    />
                                </div>
                                <div className="d-flex flex-wrap gap-2">
                                    <Link
                                        to={`/artist/${artist.id}`}
                                        className="btn btn-outline-light btn-sm"
                                    >
                                        <i className="fas fa-info-circle me-2"></i>
                                        View Details
                                    </Link>
                                    <a
                                        href={artist.uri || artist.resourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-outline-light btn-sm"
                                    >
                                        <i className="fas fa-external-link-alt me-2"></i>
                                        Discogs
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderLabelCard = (label) => {
        const isHovered = hoveredId === label.id;

        return (
            <div 
                key={label.id}
                className="col-12 col-sm-6 col-lg-4 mb-3"
                onMouseEnter={() => setHoveredId(label.id)}
                onMouseLeave={() => setHoveredId(null)}
            >
                <div className="card h-100" style={{
                    background: '#404040',
                    border: '1px solid #666',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    transform: isHovered ? 'translateY(-5px)' : 'translateY(0)',
                    boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <div className="d-flex">
                        <div style={{ flex: '0 0 120px', background: '#2b2b2b' }}>
                            <img 
                                src={label.thumb || 'https://via.placeholder.com/200x200/666666/cccccc?text=Label'} 
                                alt={label.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                    e.target.src = 'https://via.placeholder.com/200x200/666666/cccccc?text=Label';
                                }}
                            />
                        </div>
                        <div className="card-body">
                            <h5 className="card-title text-light">{label.name}</h5>
                            {label.country && (
                                <p className="card-subtitle mb-2 text-muted">
                                    <i className="fas fa-globe-americas me-2"></i>
                                    {label.country}
                                </p>
                            )}
                            {label.profile && (
                                <p className="card-text text-light small">
                                    {truncate(label.profile, 160)}
                                </p>
                            )}
                            <div className="mt-3">
                                <div className="d-flex flex-wrap gap-2 mb-2">
                                    <FollowButton 
                                        entityType="label" 
                                        entityId={label.id} 
                                        entityName={label.name}
                                    />
                                </div>
                                <div className="d-flex flex-wrap gap-2">
                                    <Link
                                        to={`/label/${label.id}`}
                                        className="btn btn-outline-light btn-sm"
                                    >
                                        <i className="fas fa-info-circle me-2"></i>
                                        View Details
                                    </Link>
                                    <a
                                        href={label.uri || label.resourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-outline-light btn-sm"
                                    >
                                        <i className="fas fa-external-link-alt me-2"></i>
                                        Discogs
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderCards = () => {
        if (searchType === 'artist') {
            return results.map(renderArtistCard);
        }

        if (searchType === 'label') {
            return results.map(renderLabelCard);
        }

        return results.map(renderReleaseCard);
    };

    const emptyStateMessage = () => {
        switch (searchType) {
            case 'artist':
                return 'Try refining the artist name or adding more details';
            case 'label':
                return 'Try refining the label name or adding more details';
            default:
                return 'Try adjusting your search terms';
        }
    };

    const iconForType = () => {
        switch (searchType) {
            case 'artist':
                return 'fa-user';
            case 'label':
                return 'fa-tag';
            default:
                return 'fa-music';
        }
    };

    return (
        <div className="search-list">
            {results.length === 0 ? (
                <div className="text-center py-5">
                    <i className={`fas ${iconForType()} fa-3x text-light mb-3`}></i>
                    <h5 className="text-light">No results found</h5>
                    <p className="text-light">{emptyStateMessage()}</p>
                </div>
            ) : (
                <div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="mb-0 text-light text-capitalize">
                            <i className={`fas ${iconForType()} me-2`}></i>
                            {searchType} results ({results.length})
                        </h5>
                        <small className="text-light">
                            <i className="fas fa-info-circle me-1"></i>
                            {searchType === 'release' ? 'Click for release details' : searchType === 'artist' ? 'Click for artist details' : 'Opens Discogs in a new tab'}
                        </small>
                    </div>
                    <div className="row">
                        {renderCards()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchList;