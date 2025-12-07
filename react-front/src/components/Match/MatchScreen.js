import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../../AuthContext';

const MatchScreen = () => {
    const [matches, setMatches] = useState([]);
    const [filteredMatches, setFilteredMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'buying', 'selling'
    const [minWantlistMatches, setMinWantlistMatches] = useState(1); // Minimum wantlist matches required
    const { authState } = useAuthContext();

    // Hardcoded test data
    const testMatches = [
        {
            id: "match_1",
            type: "buying", // Current user is buying
            release: {
                discogs_id: 123456,
                title: "Abbey Road",
                artist: "The Beatles",
                year: 1969,
                genre: "Rock",
                cover_image: "https://via.placeholder.com/150x150/1a1a1a/ffffff?text=Abbey+Road",
                format: "Vinyl LP",
                condition: "Near Mint"
            },
            buyer: {
                user_id: 1,
                username: authState.username || "current_user",
                price_threshold: 45.00
            },
            seller: {
                user_id: 2,
                username: "vinyl_store_pdx",
                location: "Portland, OR",
                rating: 4.8,
                total_ratings: 156,
                wantlist_matches: 3 // Number of items this seller has from buyer's wantlist
            },
            listing: {
                price: 42.99,
                shipping_price: 5.00,
                condition: "Near Mint",
                date_listed: "2 days ago",
                discogs_url: "https://discogs.com/sell/item/123456"
            },
            compatibility_score: 95
        },
        {
            id: "match_2",
            type: "selling", // Current user is selling
            release: {
                discogs_id: 789012,
                title: "Dark Side of the Moon",
                artist: "Pink Floyd",
                year: 1973,
                genre: "Progressive Rock",
                cover_image: "https://via.placeholder.com/150x150/2d2d2d/ffffff?text=Dark+Side",
                format: "Vinyl LP",
                condition: "Very Good+"
            },
            buyer: {
                user_id: 3,
                username: "floyd_collector",
                price_threshold: 35.00
            },
            seller: {
                user_id: 1,
                username: authState.username || "current_user",
                location: "Seattle, WA",
                rating: 4.9,
                total_ratings: 89,
                wantlist_matches: 1 // Number of items this seller has from buyer's wantlist
            },
            listing: {
                price: 32.50,
                shipping_price: 4.50,
                condition: "Very Good+",
                date_listed: "1 day ago",
                discogs_url: "https://discogs.com/sell/item/789012"
            },
            compatibility_score: 88
        },
        {
            id: "match_3",
            type: "buying",
            release: {
                discogs_id: 345678,
                title: "Kind of Blue",
                artist: "Miles Davis",
                year: 1959,
                genre: "Jazz",
                cover_image: "https://via.placeholder.com/150x150/1e3a8a/ffffff?text=Kind+Blue",
                format: "Vinyl LP",
                condition: "Excellent"
            },
            buyer: {
                user_id: 1,
                username: authState.username || "current_user",
                price_threshold: 28.00
            },
            seller: {
                user_id: 4,
                username: "jazz_maven",
                location: "New York, NY",
                rating: 4.7,
                total_ratings: 203,
                wantlist_matches: 5 // Number of items this seller has from buyer's wantlist
            },
            listing: {
                price: 25.99,
                shipping_price: 3.99,
                condition: "Excellent",
                date_listed: "5 hours ago",
                discogs_url: "https://discogs.com/sell/item/345678"
            },
            compatibility_score: 92
        },
        {
            id: "match_4",
            type: "selling",
            release: {
                discogs_id: 567890,
                title: "Nevermind",
                artist: "Nirvana",
                year: 1991,
                genre: "Grunge",
                cover_image: "https://via.placeholder.com/150x150/4b5563/ffffff?text=Nevermind",
                format: "Vinyl LP",
                condition: "Near Mint"
            },
            buyer: {
                user_id: 5,
                username: "grunge_fan_90s",
                price_threshold: 40.00
            },
            seller: {
                user_id: 1,
                username: authState.username || "current_user",
                location: "Seattle, WA",
                rating: 4.9,
                total_ratings: 89,
                wantlist_matches: 2 // Number of items this seller has from buyer's wantlist
            },
            listing: {
                price: 38.00,
                shipping_price: 6.00,
                condition: "Near Mint",
                date_listed: "3 days ago",
                discogs_url: "https://discogs.com/sell/item/567890"
            },
            compatibility_score: 85
        },
        {
            id: "match_5",
            type: "buying",
            release: {
                discogs_id: 901234,
                title: "Pet Sounds",
                artist: "The Beach Boys",
                year: 1966,
                genre: "Pop Rock",
                cover_image: "https://via.placeholder.com/150x150/059669/ffffff?text=Pet+Sounds",
                format: "Vinyl LP",
                condition: "Very Good"
            },
            buyer: {
                user_id: 1,
                username: authState.username || "current_user",
                price_threshold: 22.00
            },
            seller: {
                user_id: 6,
                username: "surf_sounds_ca",
                location: "Los Angeles, CA",
                rating: 4.6,
                total_ratings: 78,
                wantlist_matches: 1 // Number of items this seller has from buyer's wantlist
            },
            listing: {
                price: 19.99,
                shipping_price: 4.99,
                condition: "Very Good",
                date_listed: "1 week ago",
                discogs_url: "https://discogs.com/sell/item/901234"
            },
            compatibility_score: 79
        }
    ];

    useEffect(() => {
        // Simulate loading
        setLoading(true);
        setTimeout(() => {
            setMatches(testMatches);
            setLoading(false);
        }, 1000);
    }, []);

    useEffect(() => {
        // Filter matches based on selected filter and wantlist matches requirement
        let filtered = matches;
        
        // Filter by type (all, buying, selling)
        if (filter === 'buying') {
            filtered = filtered.filter(match => match.type === 'buying');
        } else if (filter === 'selling') {
            filtered = filtered.filter(match => match.type === 'selling');
        }
        
        // Filter by minimum wantlist matches (only for buying matches)
        filtered = filtered.filter(match => {
            if (match.type === 'buying') {
                return match.seller.wantlist_matches >= minWantlistMatches;
            }
            return true; // Don't filter selling matches by wantlist matches
        });
        
        setFilteredMatches(filtered);
    }, [matches, filter, minWantlistMatches]);

    const getUserAvatar = (username) => {
        // Generate a consistent color based on username
        const colors = ['bg-primary', 'bg-success', 'bg-warning', 'bg-info', 'bg-secondary', 'bg-danger'];
        const colorIndex = username.length % colors.length;
        return colors[colorIndex];
    };

    if (loading) {
        return (
            <div className="container mt-4">
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-3 text-muted">Finding your matches...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-4">
            {/* Header */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
                        <div className="mb-3 mb-md-0">
                            <h1 className="display-5 mb-2">
                                <i className="fas fa-handshake text-primary me-3"></i>
                                Match Center
                            </h1>
                            <p className="text-muted mb-0">Connect with sellers who have items from your wantlist</p>
                        </div>
                        <div className="d-flex flex-column flex-lg-row gap-3 align-items-start align-items-lg-center">
                            <div className="btn-group" role="group">
                                <button 
                                    className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setFilter('all')}
                                >
                                    <i className="fas fa-list me-1"></i>
                                    All ({matches.length})
                                </button>
                                <button 
                                    className={`btn ${filter === 'buying' ? 'btn-success' : 'btn-outline-success'}`}
                                    onClick={() => setFilter('buying')}
                                >
                                    <i className="fas fa-shopping-cart me-1"></i>
                                    Buying ({matches.filter(m => m.type === 'buying').length})
                                </button>
                                <button 
                                    className={`btn ${filter === 'selling' ? 'btn-warning' : 'btn-outline-warning'}`}
                                    onClick={() => setFilter('selling')}
                                >
                                    <i className="fas fa-store me-1"></i>
                                    Selling ({matches.filter(m => m.type === 'selling').length})
                                </button>
                            </div>
                            
                            {/* Wantlist Matches Filter */}
                            <div className="d-flex align-items-center gap-2">
                                <label htmlFor="wantlistFilter" className="form-label mb-0 text-muted small">
                                    <i className="fas fa-heart me-1"></i>
                                    Min. Wantlist Items:
                                </label>
                                <select 
                                    id="wantlistFilter"
                                    className="form-select form-select-sm"
                                    style={{ width: 'auto', minWidth: '80px' }}
                                    value={minWantlistMatches}
                                    onChange={(e) => setMinWantlistMatches(parseInt(e.target.value))}
                                >
                                    <option value={1}>1+</option>
                                    <option value={2}>2+</option>
                                    <option value={3}>3+</option>
                                    <option value={4}>4+</option>
                                    <option value={5}>5+</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Match Cards */}
            <div className="row">
                {filteredMatches.map((match) => (
                    <div key={match.id} className="col-12 mb-4">
                        <div className="card shadow-sm border-0 h-100">
                            <div className="card-body">
                                <div className="row align-items-center">
                                    {/* Release Image */}
                                    <div className="col-md-2 text-center mb-3 mb-md-0">
                                        <img 
                                            src={match.release.cover_image} 
                                            alt={match.release.title}
                                            className="img-fluid rounded shadow-sm"
                                            style={{ maxHeight: '120px', width: 'auto' }}
                                        />
                                    </div>

                                    {/* Release Info */}
                                    <div className="col-md-4 mb-3 mb-md-0">
                                        <h5 className="card-title mb-2">
                                            <Link 
                                                to={`/release/${match.release.discogs_id}`}
                                                className="text-decoration-none"
                                            >
                                                {match.release.title}
                                            </Link>
                                        </h5>
                                        <p className="text-muted mb-1">
                                            <strong>{match.release.artist}</strong>
                                        </p>
                                        <p className="text-muted small mb-2">
                                            {match.release.year} • {match.release.genre}
                                        </p>
                                        <div className="d-flex flex-wrap gap-2">
                                            <span className="badge bg-primary">
                                                <i className="fas fa-compact-disc me-1"></i>
                                                {match.release.format}
                                            </span>
                                            <span className="badge bg-secondary">
                                                {match.release.condition}
                                            </span>
                                            <span className={`badge ${match.type === 'buying' ? 'bg-success' : 'bg-warning'}`}>
                                                <i className={`fas ${match.type === 'buying' ? 'fa-shopping-cart' : 'fa-store'} me-1`}></i>
                                                {match.type === 'buying' ? 'You\'re Buying' : 'You\'re Selling'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Match Info */}
                                    <div className="col-md-3 mb-3 mb-md-0">
                                        <div className="text-center">
                                            <div className="d-flex align-items-center justify-content-center mb-2">
                                                <div className="text-center me-3">
                                                    <Link 
                                                        to={`/profile/${match.buyer.username}`}
                                                        className="text-decoration-none"
                                                    >
                                                        <div className={`avatar-sm ${getUserAvatar(match.buyer.username)} text-white rounded-circle d-flex align-items-center justify-content-center mb-1`} 
                                                             style={{ width: '40px', height: '40px' }}>
                                                            <i className="fas fa-user"></i>
                                                        </div>
                                                        <small className="text-muted d-block">{match.buyer.username}</small>
                                                        <small className="text-success">
                                                            <i className="fas fa-heart me-1"></i>Wants
                                                        </small>
                                                    </Link>
                                                </div>
                                                
                                                <div className="text-primary mx-2">
                                                    <i className="fas fa-exchange-alt fa-lg"></i>
                                                </div>
                                                
                                                <div className="text-center ms-3">
                                                    <Link 
                                                        to={`/profile/${match.seller.username}`}
                                                        className="text-decoration-none"
                                                    >
                                                        <div className={`avatar-sm ${getUserAvatar(match.seller.username)} text-white rounded-circle d-flex align-items-center justify-content-center mb-1`} 
                                                             style={{ width: '40px', height: '40px' }}>
                                                            <i className="fas fa-user"></i>
                                                        </div>
                                                        <small className="text-muted d-block">{match.seller.username}</small>
                                                        <small className="text-warning">
                                                            <i className="fas fa-store me-1"></i>Sells
                                                        </small>
                                                    </Link>
                                                </div>
                                            </div>
                                            
                                            <div className="match-score">
                                                <span className="badge bg-info fs-6 mb-1">
                                                    <i className="fas fa-percentage me-1"></i>
                                                    {match.compatibility_score}% Match
                                                </span>
                                                {match.type === 'buying' && match.seller.wantlist_matches && (
                                                    <div className="mt-1">
                                                        <span className="badge bg-success">
                                                            <i className="fas fa-heart me-1"></i>
                                                            {match.seller.wantlist_matches} Wantlist Items
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Price & Actions */}
                                    <div className="col-md-3 text-center text-md-end">
                                        <div className="mb-3">
                                            <div className="h4 text-success mb-1">
                                                ${match.listing.price}
                                            </div>
                                            {match.listing.shipping_price > 0 && (
                                                <small className="text-muted d-block">
                                                    +${match.listing.shipping_price} shipping
                                                </small>
                                            )}
                                            
                                            {match.buyer.price_threshold && (
                                                <div className="mt-1">
                                                    <small className="text-muted">
                                                        Budget: <span className="text-primary">${match.buyer.price_threshold}</span>
                                                    </small>
                                                </div>
                                            )}
                                        </div>

                                        <div className="d-flex flex-column gap-2">
                                            <a 
                                                href={match.listing.discogs_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-primary btn-sm"
                                            >
                                                <i className="fas fa-external-link-alt me-1"></i>
                                                View on Discogs
                                            </a>
                                            
                                            {match.type === 'buying' && (
                                                <button className="btn btn-success btn-sm">
                                                    <i className="fas fa-envelope me-1"></i>
                                                    Contact Seller
                                                </button>
                                            )}
                                            
                                            {match.type === 'selling' && (
                                                <button className="btn btn-warning btn-sm">
                                                    <i className="fas fa-user me-1"></i>
                                                    View Buyer Profile
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Additional Match Details */}
                                <div className="row mt-3 pt-3 border-top">
                                    <div className="col-md-6">
                                        <small className="text-muted">
                                            <i className="fas fa-clock me-1"></i>
                                            Listed {match.listing.date_listed}
                                        </small>
                                    </div>
                                    <div className="col-md-6 text-md-end">
                                        <div className="d-flex flex-column flex-md-row justify-content-md-end gap-3">
                                            <small className="text-muted">
                                                <i className="fas fa-map-marker-alt me-1"></i>
                                                {match.seller.location}
                                            </small>
                                            <small className="text-muted">
                                                <i className="fas fa-star me-1 text-warning"></i>
                                                {match.seller.rating}/5 ({match.seller.total_ratings} reviews)
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {filteredMatches.length === 0 && !loading && (
                <div className="text-center py-5">
                    <div className="mb-4">
                        <i className="fas fa-search text-muted" style={{ fontSize: '4rem' }}></i>
                    </div>
                    <h3 className="text-muted mb-3">
                        No {filter !== 'all' ? filter : ''} matches found
                    </h3>
                    <p className="text-muted mb-4">
                        {filter === 'buying' && `We couldn't find any sellers with ${minWantlistMatches}+ items from your wantlist right now.`}
                        {filter === 'selling' && "No buyers are currently looking for items you're selling."}
                        {filter === 'all' && `No matches available with your current filters (${minWantlistMatches}+ wantlist items).`}
                    </p>
                    <div className="d-flex flex-column flex-md-row justify-content-center gap-3">
                        <Link to="/profile" className="btn btn-primary">
                            <i className="fas fa-user me-2"></i>
                            View Profile
                        </Link>
                        <button 
                            className="btn btn-outline-primary"
                            onClick={() => window.location.reload()}
                        >
                            <i className="fas fa-sync-alt me-2"></i>
                            Refresh Matches
                        </button>
                    </div>
                </div>
            )}

            {/* Stats Footer */}
            {filteredMatches.length > 0 && (
                <div className="row mt-4 pt-4 border-top">
                    <div className="col-12 text-center">
                        <div className="row">
                            <div className="col-md-4">
                                <div className="text-center">
                                    <h4 className="text-primary mb-1">{matches.filter(m => m.type === 'buying').length}</h4>
                                    <small className="text-muted">Buying Opportunities</small>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="text-center">
                                    <h4 className="text-warning mb-1">{matches.filter(m => m.type === 'selling').length}</h4>
                                    <small className="text-muted">Selling Opportunities</small>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="text-center">
                                    <h4 className="text-success mb-1">
                                        {Math.round(matches.reduce((acc, match) => acc + match.compatibility_score, 0) / matches.length)}%
                                    </h4>
                                    <small className="text-muted">Average Match Score</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MatchScreen;
