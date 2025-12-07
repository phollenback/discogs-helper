import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../utility/backSource';
import VinylSpinner from '../All/VinylSpinner';
import '../../styles/theme.css';

const MeterScreen = () => {
    const { getData } = useApi();
    
    const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
    const [recentlyPlayed, setRecentlyPlayed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortBy, setSortBy] = useState('recent'); // 'recent', 'play_count', 'total_time'
    const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'

    const loadMeterData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Fetch mock meter data (same for all users)
            const meterData = await getData('/api/meter/mock-data');
            
            console.log('[MeterScreen] Received meter data:', meterData);
            if (meterData?.currentlyPlaying) {
                console.log('[MeterScreen] Currently playing image URLs:', {
                    cover_image_url: meterData.currentlyPlaying.cover_image_url,
                    thumb_url: meterData.currentlyPlaying.thumb_url
                });
            }
            
            if (!meterData) {
                setCurrentlyPlaying(null);
                setRecentlyPlayed([]);
                setLoading(false);
                return;
            }

            // Set currently playing and recently played from mock data
            setCurrentlyPlaying(meterData.currentlyPlaying || null);
            setRecentlyPlayed(meterData.recentlyPlayed || []);
        } catch (err) {
            console.error('[MeterScreen] Error loading meter data:', err);
            setError('Failed to load playback data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMeterData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Load once on mount, no dependencies needed for mock data

    const formatDuration = (minutes) => {
        if (!minutes) return '0 min';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return date.toLocaleDateString();
    };

    const calculateElapsedTime = (startTime) => {
        if (!startTime) return '0 min';
        const start = new Date(startTime);
        const now = new Date();
        const diffMs = now - start;
        const diffMins = Math.floor(diffMs / 60000);
        return formatDuration(diffMins);
    };

    const sortedRecentlyPlayed = [...recentlyPlayed].sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
            case 'recent':
                comparison = new Date(b.last_played) - new Date(a.last_played);
                break;
            case 'play_count':
                comparison = b.play_count - a.play_count;
                break;
            case 'total_time':
                comparison = b.total_time_minutes - a.total_time_minutes;
                break;
            default:
                comparison = 0;
        }
        
        return sortOrder === 'asc' ? -comparison : comparison;
    });

    if (loading) {
        return (
            <div className="container py-5">
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                    <VinylSpinner label="Loading your listening history..." />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container py-5">
                <div className="grail-alert grail-alert--danger">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {error}
                    <button 
                        onClick={loadMeterData} 
                        className="grail-btn grail-btn--primary grail-btn--sm ms-3"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container py-4">
            <div className="mb-4" style={{ position: 'relative' }}>
                <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '0',
                    width: '120px',
                    height: '120px',
                    background: 'radial-gradient(circle, rgba(234, 88, 12, 0.15) 0%, transparent 70%)',
                    borderRadius: '50%',
                    filter: 'blur(20px)',
                    zIndex: 0
                }}></div>
                <h1 className="grail-heading--h1 mb-2" style={{ position: 'relative', zIndex: 1 }}>
                    <i className="fas fa-tachometer-alt me-2" style={{ color: 'var(--grail-accent)' }}></i>
                    Grailmeter
                </h1>
                <p style={{ color: 'var(--grail-text-subtle)', position: 'relative', zIndex: 1, marginBottom: '1rem' }}>
                    Track your vinyl listening history and habits
                </p>
                <div style={{ position: 'relative', zIndex: 1, marginTop: '1rem' }}>
                    <p style={{ color: 'var(--grail-text-subtle)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                        Coming soon... Check out the design for this cloud/IoT solution{' '}
                        <a 
                            href="https://github.com/phollenback/Multi-Frontend-Discogs-Helper?tab=readme-ov-file#discogs-helper"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ 
                                color: 'var(--grail-accent)',
                                textDecoration: 'none',
                                fontWeight: '600'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.textDecoration = 'underline';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.textDecoration = 'none';
                            }}
                        >
                            here
                            <i className="fas fa-external-link-alt ms-1" style={{ fontSize: '0.8rem' }}></i>
                        </a>
                    </p>
                </div>
            </div>

            {/* Currently Playing Section */}
            <div className="mb-5" style={{ position: 'relative' }}>
                <div style={{
                    position: 'absolute',
                    top: '-10px',
                    left: '-10px',
                    width: '80px',
                    height: '80px',
                    background: 'radial-gradient(circle, rgba(234, 88, 12, 0.1) 0%, transparent 70%)',
                    borderRadius: '50%',
                    filter: 'blur(15px)',
                    zIndex: 0
                }}></div>
                <h2 className="grail-heading--h2 mb-3" style={{ position: 'relative', zIndex: 1 }}>
                    <i className="fas fa-play-circle me-2" style={{ color: 'var(--grail-accent)' }}></i>
                    Currently Playing
                </h2>
                
                {currentlyPlaying ? (
                    <div className="grail-card" style={{ 
                        background: 'var(--grail-surface)',
                        border: '1px solid var(--grail-glass-border)',
                        borderRadius: 'var(--grail-radius-lg)',
                        padding: '2rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2rem',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {/* Accent gradient background */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '4px',
                            background: 'linear-gradient(90deg, var(--grail-primary) 0%, var(--grail-accent) 50%, var(--grail-primary) 100%)',
                            zIndex: 1
                        }}></div>
                        
                        {/* Large Vinyl Spinner */}
                        <div style={{ 
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1rem',
                            position: 'relative',
                            zIndex: 2
                        }}>
                            <div style={{ 
                                position: 'relative',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <VinylSpinner size={200} label={null} />
                                {/* Accent glow effect */}
                                    <div style={{
                                        position: 'absolute',
                                    width: '200px',
                                    height: '200px',
                                        borderRadius: '50%',
                                    background: 'radial-gradient(circle, rgba(234, 88, 12, 0.2) 0%, transparent 70%)',
                                    filter: 'blur(20px)',
                                    zIndex: -1,
                                    animation: 'pulse 2s ease-in-out infinite'
                                }}></div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ color: 'var(--grail-text-subtle)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Runtime</div>
                                <div className="h4 mb-0" style={{ color: 'var(--grail-accent)' }}>
                                    {calculateElapsedTime(currentlyPlaying.start_time)}
                                </div>
                            </div>
                        </div>

                        {/* Record Details */}
                        <div style={{ 
                            width: '100%',
                            maxWidth: '600px',
                            textAlign: 'center'
                        }}>
                            <Link 
                                to={`/release/${currentlyPlaying.discogs_id}`}
                                style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                                <h3 className="h4 mb-2" style={{ color: 'var(--grail-text)' }}>
                                    {currentlyPlaying.title}
                                </h3>
                                <p style={{ color: 'var(--grail-text-subtle)', marginBottom: '1rem' }}>{currentlyPlaying.artist}</p>
                            </Link>
                            
                            <div className="row g-3 mt-3">
                                <div className="col-6 col-md-3">
                                    <div style={{ color: 'var(--grail-text-subtle)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Release Year</div>
                                    <div style={{ color: 'var(--grail-text)' }}>{currentlyPlaying.release_year || 'N/A'}</div>
                                </div>
                                <div className="col-6 col-md-3">
                                    <div style={{ color: 'var(--grail-text-subtle)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Genre</div>
                                    <div style={{ color: 'var(--grail-text)' }}>{currentlyPlaying.genre || 'N/A'}</div>
                                </div>
                                <div className="col-6 col-md-3">
                                    <div style={{ color: 'var(--grail-text-subtle)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Styles</div>
                                    <div style={{ color: 'var(--grail-text)' }}>{currentlyPlaying.styles || 'N/A'}</div>
                                </div>
                                <div className="col-6 col-md-3">
                                    <div style={{ color: 'var(--grail-text-subtle)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Started</div>
                                    <div style={{ color: 'var(--grail-text)' }}>{formatTimeAgo(currentlyPlaying.start_time)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grail-card" style={{ 
                        background: 'var(--grail-surface)',
                        border: '1px solid var(--grail-glass-border)',
                        borderRadius: 'var(--grail-radius-lg)',
                        padding: '3rem',
                        textAlign: 'center'
                    }}>
                        <i className="fas fa-pause-circle" style={{ 
                            fontSize: '4rem', 
                            color: 'var(--grail-text-subtle)',
                            marginBottom: '1rem'
                        }}></i>
                        <p style={{ color: 'var(--grail-text-subtle)', marginBottom: 0 }}>No record currently playing</p>
                    </div>
                )}
            </div>

            {/* Recently Played Section */}
            <div style={{ position: 'relative' }}>
                <div style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '-10px',
                    width: '100px',
                    height: '100px',
                    background: 'radial-gradient(circle, rgba(234, 88, 12, 0.08) 0%, transparent 70%)',
                    borderRadius: '50%',
                    filter: 'blur(15px)',
                    zIndex: 0
                }}></div>
                <div className="d-flex justify-content-between align-items-center mb-3" style={{ position: 'relative', zIndex: 1 }}>
                    <h2 className="grail-heading--h2 mb-0">
                        <i className="fas fa-history me-2" style={{ color: 'var(--grail-accent)' }}></i>
                        Recently Played
                    </h2>
                    
                    {/* Sort Controls */}
                    <div className="d-flex gap-2 align-items-center">
                        <select
                            className="form-select form-select-sm"
                            style={{
                                background: 'var(--grail-surface)',
                                border: '1px solid var(--grail-glass-border)',
                                color: 'var(--grail-text)',
                                width: 'auto'
                            }}
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="recent">Most Recent</option>
                            <option value="play_count">Play Count</option>
                            <option value="total_time">Total Time</option>
                        </select>
                        <button
                            className="grail-btn grail-btn--ghost grail-btn--sm"
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                        >
                            <i className={`fas fa-sort-${sortOrder === 'asc' ? 'amount-up' : 'amount-down'}`}></i>
                        </button>
                    </div>
                </div>

                {sortedRecentlyPlayed.length > 0 ? (
                    <div className="row g-3">
                        {sortedRecentlyPlayed.map((record) => (
                            <div key={record.discogs_id} className="col-12 col-md-6 col-lg-4">
                                <Link 
                                    to={`/release/${record.discogs_id}`}
                                    style={{ textDecoration: 'none' }}
                                >
                                    <div className="grail-card" style={{
                                        background: 'var(--grail-surface)',
                                        border: '1px solid var(--grail-glass-border)',
                                        borderRadius: 'var(--grail-radius-md)',
                                        padding: '1rem',
                                        height: '100%',
                                        transition: 'all 0.2s ease',
                                        cursor: 'pointer',
                                        color: 'var(--grail-text)',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--grail-accent)';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = 'var(--grail-shadow-lg)';
                                        // Add accent glow on hover
                                        const glow = e.currentTarget.querySelector('.card-accent-glow');
                                        if (glow) glow.style.opacity = '1';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--grail-glass-border)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                        const glow = e.currentTarget.querySelector('.card-accent-glow');
                                        if (glow) glow.style.opacity = '0';
                                    }}
                                    >
                                        {/* Accent glow on hover */}
                                        <div className="card-accent-glow" style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            height: '3px',
                                            background: 'linear-gradient(90deg, var(--grail-primary) 0%, var(--grail-accent) 50%, var(--grail-primary) 100%)',
                                            opacity: 0,
                                            transition: 'opacity 0.3s ease',
                                            zIndex: 1
                                        }}></div>
                                        
                                        <div className="d-flex gap-3" style={{ position: 'relative', zIndex: 2 }}>
                                            {/* Vinyl sleeve effect - card background */}
                                            <div style={{
                                                        width: '80px',
                                                        height: '80px',
                                                        borderRadius: 'var(--grail-radius-sm)',
                                                flexShrink: 0,
                                                backgroundColor: 'var(--grail-surface-alt)',
                                                border: '1px solid var(--grail-glass-border)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                position: 'relative',
                                                overflow: 'hidden',
                                                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
                                            }}>
                                                {/* Vinyl icon coming out of the sleeve */}
                                                <i className="fas fa-compact-disc" style={{ 
                                                    fontSize: '3rem',
                                                    color: 'var(--grail-accent)',
                                                    position: 'relative',
                                                    zIndex: 2,
                                                    transform: 'translateX(-15px)',
                                                    filter: 'drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.3))'
                                                }}></i>
                                                {/* Sleeve edge effect */}
                                                <div style={{
                                                    position: 'absolute',
                                                    right: 0,
                                                    top: 0,
                                                    bottom: 0,
                                                    width: '20px',
                                                    background: 'linear-gradient(90deg, transparent 0%, rgba(0, 0, 0, 0.3) 100%)',
                                                    zIndex: 1
                                                }}></div>
                                                {/* Accent highlight on sleeve */}
                                                <div style={{
                                                    position: 'absolute',
                                                    left: 0,
                                                    top: 0,
                                                    bottom: 0,
                                                    width: '3px',
                                                    background: 'linear-gradient(180deg, var(--grail-accent) 0%, transparent 100%)',
                                                    zIndex: 3
                                                }}></div>
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <h5 className="h6 mb-1" style={{ 
                                                    color: 'var(--grail-text)',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {record.title}
                                                </h5>
                                                <p style={{
                                                    color: 'var(--grail-text-subtle)',
                                                    fontSize: '0.85rem',
                                                    marginBottom: '0.5rem',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {record.artist}
                                                </p>
                                                <div className="d-flex gap-3" style={{ fontSize: '0.875rem', color: 'var(--grail-text-subtle)' }}>
                                                    <div>
                                                        <i className="fas fa-play me-1"></i>
                                                        {record.play_count} {record.play_count === 1 ? 'play' : 'plays'}
                                                    </div>
                                                    <div>
                                                        <i className="fas fa-clock me-1"></i>
                                                        {formatDuration(record.total_time_minutes)}
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--grail-text-subtle)', marginTop: '0.25rem' }}>
                                                    Last: {formatTimeAgo(record.last_played)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grail-card" style={{ 
                        background: 'var(--grail-surface)',
                        border: '1px solid var(--grail-glass-border)',
                        borderRadius: 'var(--grail-radius-lg)',
                        padding: '3rem',
                        textAlign: 'center'
                    }}>
                        <i className="fas fa-music" style={{ 
                            fontSize: '3rem', 
                            color: 'var(--grail-text-subtle)',
                            marginBottom: '1rem'
                        }}></i>
                        <p style={{ color: 'var(--grail-text-subtle)', marginBottom: 0 }}>No playback history yet</p>
                        <p style={{ color: 'var(--grail-text-subtle)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Start playing records to see your listening history here</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MeterScreen;

// Add pulse animation for accent glow
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% {
            opacity: 0.3;
            transform: scale(1);
        }
        50% {
            opacity: 0.5;
            transform: scale(1.05);
        }
    }
`;
if (!document.head.querySelector('style[data-meter-pulse]')) {
    style.setAttribute('data-meter-pulse', 'true');
    document.head.appendChild(style);
}

