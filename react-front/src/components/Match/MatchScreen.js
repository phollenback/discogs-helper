import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../All/PageHeader';
import VinylSpinner from '../All/VinylSpinner';
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

    if (loading) {
        return (
            <section className="page">
                <div className="page-empty">
                    <VinylSpinner label="Finding matches…" />
                </div>
            </section>
        );
    }

    return (
        <section className="page">
            <PageHeader
                eyebrow="Marketplace"
                title="Matches"
                subtitle="Connect with sellers who have items from your wantlist."
            />

            <div className="page-toolbar">
                <div className="page-tabs">
                    {[
                        { key: 'all', label: `All (${matches.length})` },
                        { key: 'buying', label: `Buying (${matches.filter(m => m.type === 'buying').length})` },
                        { key: 'selling', label: `Selling (${matches.filter(m => m.type === 'selling').length})` },
                    ].map(({ key, label }) => (
                        <button
                            key={key}
                            type="button"
                            className={`page-tabs__btn${filter === key ? ' is-active' : ''}`}
                            onClick={() => setFilter(key)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <select
                    id="wantlistFilter"
                    className="form-select form-select-sm"
                    style={{ width: 'auto' }}
                    value={minWantlistMatches}
                    onChange={(e) => setMinWantlistMatches(parseInt(e.target.value, 10))}
                    aria-label="Minimum wantlist items"
                >
                    <option value={1}>1+ wantlist items</option>
                    <option value={2}>2+ wantlist items</option>
                    <option value={3}>3+ wantlist items</option>
                    <option value={4}>4+ wantlist items</option>
                    <option value={5}>5+ wantlist items</option>
                </select>
            </div>

            {filteredMatches.map((match) => (
                <article key={match.id} className="match-card">
                    <img
                        src={match.release.cover_image}
                        alt={match.release.title}
                        className="match-card__cover"
                    />
                    <div>
                        <h3 className="match-card__title">
                            <Link to={`/release/${match.release.discogs_id}`}>{match.release.title}</Link>
                        </h3>
                        <p className="match-card__meta">{match.release.artist} · {match.release.year}</p>
                        <p className="match-card__meta">
                            {match.compatibility_score}% match · {match.type === 'buying' ? 'Buying' : 'Selling'}
                            {match.type === 'buying' && match.seller.wantlist_matches
                                ? ` · ${match.seller.wantlist_matches} wantlist overlap`
                                : ''}
                        </p>
                        <p className="match-card__meta">
                            <Link to={`/profile/${match.buyer.username}`}>{match.buyer.username}</Link>
                            {' ↔ '}
                            <Link to={`/profile/${match.seller.username}`}>{match.seller.username}</Link>
                        </p>
                        <a
                            href={match.listing.discogs_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn--ghost btn-sm mt-2"
                        >
                            View on Discogs
                        </a>
                    </div>
                    <div className="match-card__price">
                        ${match.listing.price}
                        {match.listing.shipping_price > 0 && (
                            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400 }}>
                                +${match.listing.shipping_price} ship
                            </div>
                        )}
                    </div>
                </article>
            ))}

            {filteredMatches.length === 0 && (
                <div className="page-empty">
                    <p className="page-empty__title">No matches found</p>
                    <p>Try adjusting your filters or refresh later.</p>
                    <div className="d-flex justify-content-center gap-2 mt-3">
                        <Link to="/profile" className="btn btn--primary btn-sm">View profile</Link>
                        <button type="button" className="btn btn--ghost btn-sm" onClick={() => window.location.reload()}>
                            Refresh
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
};

export default MatchScreen;
