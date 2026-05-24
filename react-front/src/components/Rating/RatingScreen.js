import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../All/PageHeader';
import VinylSpinner from '../All/VinylSpinner';
import { useAuthContext } from '../../AuthContext';
import { useApi } from '../../utility/backSource';

const RatingScreen = () => {
    const [collection, setCollection] = useState([]);
    const [wantlist, setWantlist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [ratingFilter, setRatingFilter] = useState('all'); // 'all', 'rated', 'unrated'
    const [sortBy, setSortBy] = useState('title'); // 'title', 'artist', 'rating', 'date_added'
    const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'
    const [activeTab, setActiveTab] = useState('collection'); // 'collection', 'wantlist'
    
    const { authState } = useAuthContext();
    const { getData, updateData } = useApi();

    useEffect(() => {
        loadData();
    }, [authState.userId]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadData = async () => {
        try {
            setLoading(true);
            
            if (!authState.username || !authState.userId) {
                setError('Please log in to view your collection');
                setLoading(false);
                return;
            }
            
            // Fetch from Discogs API via OAuth proxy (real-time data)
            const [discogsCollection, discogsWantlist] = await Promise.all([
                getData(`/api/users/${authState.userId}/discogs/proxy/collection/folders/1/releases?username=${authState.username}`),
                getData(`/api/users/${authState.userId}/discogs/proxy/wants?username=${authState.username}`)
            ]);
            
            // Fetch user ratings/rankings from database
            const [dbCollection, dbWantlist] = await Promise.all([
                getData(`/api/users/${authState.userId}/collection`).catch(() => []),
                getData(`/api/users/${authState.userId}/wantlist`).catch(() => [])
            ]);
            
            // Map and merge collection data
            const mappedCollection = discogsCollection.releases?.map(release => {
                const info = release.basic_information;
                const dbItem = dbCollection.find(item => item.discogs_id === info.id);
                
                return {
                    discogs_id: info.id,
                    title: info.title,
                    artist: info.artists?.map(a => a.name).join(', ') || '',
                    release_year: info.year,
                    genre: info.genres?.join(', ') || '',
                    styles: info.styles?.join(', ') || '',
                    thumb_url: info.thumb,
                    cover_image_url: info.cover_image,
                    rating: dbItem?.rating || null,
                    ranking: dbItem?.ranking || null,
                    notes: dbItem?.notes || '',
                    price_threshold: dbItem?.price_threshold || 0,
                    wishlist: 0,
                    created_at: release.date_added
                };
            }) || [];
            
            // Map and merge wantlist data
            const mappedWantlist = discogsWantlist.wants?.map(want => {
                const info = want.basic_information;
                const dbItem = dbWantlist.find(item => item.discogs_id === info.id);
                
                return {
                    discogs_id: info.id,
                    title: info.title,
                    artist: info.artists?.map(a => a.name).join(', ') || '',
                    release_year: info.year,
                    genre: info.genres?.join(', ') || '',
                    styles: info.styles?.join(', ') || '',
                    thumb_url: info.thumb,
                    cover_image_url: info.cover_image,
                    rating: dbItem?.rating || want.rating || null,
                    ranking: dbItem?.ranking || null,
                    notes: dbItem?.notes || want.notes || '',
                    price_threshold: dbItem?.price_threshold || 0,
                    wishlist: 1,
                    created_at: want.date_added
                };
            }) || [];
            
            setCollection(mappedCollection);
            setWantlist(mappedWantlist);
        } catch (err) {
            console.error('Error loading data:', err);
            setError('Failed to load data from Discogs');
        } finally {
            setLoading(false);
        }
    };

    const handleRatingChange = async (discogsId, newRating) => {
        try {
            const currentData = activeTab === 'collection' ? collection : wantlist;
            const item = currentData.find(item => item.discogs_id === discogsId);
            if (!item) return;

            // Update in backend
            await updateData(`/api/users/${authState.userId}/collection/${discogsId}`, {
                rating: newRating,
                ranking: item.ranking,
                notes: item.notes || '',
                price_threshold: item.price_threshold || '0',
                wishlist: activeTab === 'wantlist' ? 1 : 0,
                // Include release data for record creation if needed
                title: item.title,
                artist: item.artist,
                release_year: item.release_year,
                genre: item.genre,
                styles: item.styles,
                thumb_url: item.thumb_url,
                cover_image_url: item.cover_image_url
            });

            // Update local state for both collection and wantlist
            const updateItem = (prev) => 
                prev.map(item => 
                    item.discogs_id === discogsId 
                        ? { ...item, rating: newRating }
                        : item
                );

            setCollection(updateItem);
            setWantlist(updateItem);
        } catch (err) {
            console.error('Error updating rating:', err);
            alert('Failed to update rating. Please try again.');
        }
    };

    const handleRankingChange = async (discogsId, newRanking) => {
        try {
            const currentData = activeTab === 'collection' ? collection : wantlist;
            const item = currentData.find(item => item.discogs_id === discogsId);
            if (!item) return;

            // If setting a ranking, we need to adjust other rankings
            let updatedData = [...currentData];
            
            if (newRanking !== null && newRanking !== undefined) {
                // Find if another item has this ranking
                const existingRankedItem = updatedData.find(
                    i => i.ranking === newRanking && i.discogs_id !== discogsId
                );
                
                // If an item exists with this ranking, shift rankings
                if (existingRankedItem) {
                    // Get all items with rankings >= newRanking
                    const itemsToShift = updatedData.filter(
                        i => i.ranking !== null && i.ranking >= newRanking && i.discogs_id !== discogsId
                    );
                    
                    // Shift their rankings up by 1
                    for (const shiftItem of itemsToShift) {
                        await updateData(`/api/users/${authState.userId}/collection/${shiftItem.discogs_id}`, {
                            rating: shiftItem.rating,
                            ranking: shiftItem.ranking + 1,
                            notes: shiftItem.notes || '',
                            price_threshold: shiftItem.price_threshold || '0',
                            wishlist: activeTab === 'wantlist' ? 1 : 0,
                            // Include release data for record creation if needed
                            title: shiftItem.title,
                            artist: shiftItem.artist,
                            release_year: shiftItem.release_year,
                            genre: shiftItem.genre,
                            styles: shiftItem.styles,
                            thumb_url: shiftItem.thumb_url,
                            cover_image_url: shiftItem.cover_image_url
                        });
                    }
                }
            }

            // Update the main item's ranking
            await updateData(`/api/users/${authState.userId}/collection/${discogsId}`, {
                rating: item.rating,
                ranking: newRanking,
                notes: item.notes || '',
                price_threshold: item.price_threshold || '0',
                wishlist: activeTab === 'wantlist' ? 1 : 0,
                // Include release data for record creation if needed
                title: item.title,
                artist: item.artist,
                release_year: item.release_year,
                genre: item.genre,
                styles: item.styles,
                thumb_url: item.thumb_url,
                cover_image_url: item.cover_image_url
            });

            // Reload data to get fresh rankings
            await loadData();
        } catch (err) {
            console.error('Error updating ranking:', err);
            alert('Failed to update ranking. Please try again.');
        }
    };

    const handleTop5Change = async (position, selectedDiscogsId) => {
        if (!selectedDiscogsId) return;
        
        try {
            const currentData = activeTab === 'collection' ? collection : wantlist;
            const selectedItem = currentData.find(item => item.discogs_id === parseInt(selectedDiscogsId));
            if (!selectedItem) return;

            // Get current top 5
            const currentTop5 = currentData
                .filter(item => item.ranking !== null && item.ranking >= 1 && item.ranking <= 5)
                .sort((a, b) => a.ranking - b.ranking);

            // Find the item currently at this position
            const currentItemAtPosition = currentTop5.find(item => item.ranking === position);

            // If the selected item already has a ranking, swap with current position
            if (selectedItem.ranking !== null && selectedItem.ranking >= 1 && selectedItem.ranking <= 5) {
                // Swap rankings
                if (currentItemAtPosition && currentItemAtPosition.discogs_id !== selectedItem.discogs_id) {
                    await updateData(`/api/users/${authState.userId}/collection/${currentItemAtPosition.discogs_id}`, {
                        rating: currentItemAtPosition.rating,
                        ranking: selectedItem.ranking,
                        notes: currentItemAtPosition.notes || '',
                        price_threshold: currentItemAtPosition.price_threshold || '0',
                        wishlist: activeTab === 'wantlist' ? 1 : 0,
                        // Include release data for record creation if needed
                        title: currentItemAtPosition.title,
                        artist: currentItemAtPosition.artist,
                        release_year: currentItemAtPosition.release_year,
                        genre: currentItemAtPosition.genre,
                        styles: currentItemAtPosition.styles,
                        thumb_url: currentItemAtPosition.thumb_url,
                        cover_image_url: currentItemAtPosition.cover_image_url
                    });
                }
                
                await updateData(`/api/users/${authState.userId}/collection/${selectedItem.discogs_id}`, {
                    rating: selectedItem.rating,
                    ranking: position,
                    notes: selectedItem.notes || '',
                    price_threshold: selectedItem.price_threshold || '0',
                    wishlist: activeTab === 'wantlist' ? 1 : 0,
                    // Include release data for record creation if needed
                    title: selectedItem.title,
                    artist: selectedItem.artist,
                    release_year: selectedItem.release_year,
                    genre: selectedItem.genre,
                    styles: selectedItem.styles,
                    thumb_url: selectedItem.thumb_url,
                    cover_image_url: selectedItem.cover_image_url
                });
            } else {
                // Item not in top 5, move current item out and add new item
                if (currentItemAtPosition) {
                    // Remove ranking from current item
                    await updateData(`/api/users/${authState.userId}/collection/${currentItemAtPosition.discogs_id}`, {
                        rating: currentItemAtPosition.rating,
                        ranking: null,
                        notes: currentItemAtPosition.notes || '',
                        price_threshold: currentItemAtPosition.price_threshold || '0',
                        wishlist: activeTab === 'wantlist' ? 1 : 0,
                        // Include release data for record creation if needed
                        title: currentItemAtPosition.title,
                        artist: currentItemAtPosition.artist,
                        release_year: currentItemAtPosition.release_year,
                        genre: currentItemAtPosition.genre,
                        styles: currentItemAtPosition.styles,
                        thumb_url: currentItemAtPosition.thumb_url,
                        cover_image_url: currentItemAtPosition.cover_image_url
                    });
                }
                
                // Add new item to this position
                await updateData(`/api/users/${authState.userId}/collection/${selectedItem.discogs_id}`, {
                    rating: selectedItem.rating,
                    ranking: position,
                    notes: selectedItem.notes || '',
                    price_threshold: selectedItem.price_threshold || '0',
                    wishlist: activeTab === 'wantlist' ? 1 : 0,
                    // Include release data for record creation if needed
                    title: selectedItem.title,
                    artist: selectedItem.artist,
                    release_year: selectedItem.release_year,
                    genre: selectedItem.genre,
                    styles: selectedItem.styles,
                    thumb_url: selectedItem.thumb_url,
                    cover_image_url: selectedItem.cover_image_url
                });
            }

            // Reload data
            await loadData();
        } catch (err) {
            console.error('Error updating top 5:', err);
            alert('Failed to update top 5. Please try again.');
        }
    };


    const getFilteredAndSortedData = () => {
        const currentData = activeTab === 'collection' ? collection : wantlist;
        let filtered = currentData;

        // Apply rating filter
        if (ratingFilter === 'rated') {
            filtered = filtered.filter(item => item.rating && item.rating > 0);
        } else if (ratingFilter === 'unrated') {
            filtered = filtered.filter(item => !item.rating || item.rating === 0);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aValue, bValue;
            
            switch (sortBy) {
                case 'title':
                    aValue = a.title?.toLowerCase() || '';
                    bValue = b.title?.toLowerCase() || '';
                    break;
                case 'artist':
                    aValue = a.artist?.toLowerCase() || '';
                    bValue = b.artist?.toLowerCase() || '';
                    break;
                case 'rating':
                    aValue = a.rating || 0;
                    bValue = b.rating || 0;
                    break;
                case 'ranking':
                    // Put unranked items at the end
                    aValue = a.ranking === null ? 999999 : a.ranking;
                    bValue = b.ranking === null ? 999999 : b.ranking;
                    break;
                case 'date_added':
                    aValue = new Date(a.created_at || 0);
                    bValue = new Date(b.created_at || 0);
                    break;
                default:
                    aValue = a.title?.toLowerCase() || '';
                    bValue = b.title?.toLowerCase() || '';
            }

            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        return filtered;
    };

    const getTop5 = () => {
        const currentData = activeTab === 'collection' ? collection : wantlist;
        const top5 = [];
        
        for (let i = 1; i <= 5; i++) {
            const item = currentData.find(item => item.ranking === i);
            top5.push(item || null);
        }
        
        return top5;
    };

    const renderStars = (currentRating, discogsId) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <span
                    key={i}
                    className={`star ${i <= currentRating ? 'filled' : ''}`}
                    onClick={() => handleRatingChange(discogsId, i)}
                    style={{ cursor: 'pointer' }}
                >
                    ★
                </span>
            );
        }
        return stars;
    };

    const getRatingStats = () => {
        const currentData = activeTab === 'collection' ? collection : wantlist;
        const rated = currentData.filter(item => item.rating && item.rating > 0);
        const unrated = currentData.filter(item => !item.rating || item.rating === 0);
        const avgRating = rated.length > 0 
            ? (rated.reduce((sum, item) => sum + item.rating, 0) / rated.length).toFixed(1)
            : 0;

        return { 
            total: currentData.length,
            rated: rated.length, 
            unrated: unrated.length, 
            avgRating 
        };
    };

    if (loading) {
        return (
            <section className="page">
                <div className="page-empty">
                    <VinylSpinner label="Loading your collection…" />
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="page">
                <div className="grail-alert grail-alert--warning">{error}</div>
            </section>
        );
    }

    const stats = getRatingStats();
    const filteredData = getFilteredAndSortedData();

    return (
        <section className="page">
            <PageHeader
                eyebrow="Library"
                title="Rate your items"
                subtitle="Score releases in your collection or wantlist."
            />

            <div className="page-tabs">
                <button
                    type="button"
                    className={`page-tabs__btn${activeTab === 'collection' ? ' is-active' : ''}`}
                    onClick={() => setActiveTab('collection')}
                >
                    Collection ({collection.length})
                </button>
                <button
                    type="button"
                    className={`page-tabs__btn${activeTab === 'wantlist' ? ' is-active' : ''}`}
                    onClick={() => setActiveTab('wantlist')}
                >
                    Wantlist ({wantlist.length})
                </button>
            </div>

            <div className="page-stat-row">
                <div className="page-stat">
                    <div className="page-stat__label">Total</div>
                    <div className="page-stat__value">{stats.total}</div>
                </div>
                <div className="page-stat">
                    <div className="page-stat__label">Rated</div>
                    <div className="page-stat__value">{stats.rated}</div>
                </div>
                <div className="page-stat">
                    <div className="page-stat__label">Unrated</div>
                    <div className="page-stat__value">{stats.unrated}</div>
                </div>
                <div className="page-stat">
                    <div className="page-stat__label">Average</div>
                    <div className="page-stat__value">{stats.avgRating}</div>
                </div>
            </div>

            <div className="page-toolbar">
                <select
                    className="form-select form-select-sm"
                    value={ratingFilter}
                    onChange={(e) => setRatingFilter(e.target.value)}
                    aria-label="Filter by rating"
                >
                    <option value="all">All items</option>
                    <option value="rated">Rated</option>
                    <option value="unrated">Unrated</option>
                </select>
                <select
                    className="form-select form-select-sm"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    aria-label="Sort by"
                >
                    <option value="title">Title</option>
                    <option value="artist">Artist</option>
                    <option value="rating">Rating</option>
                    <option value="ranking">Ranking</option>
                    <option value="date_added">Date added</option>
                </select>
                <select
                    className="form-select form-select-sm"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    aria-label="Sort order"
                >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                </select>
            </div>

            {filteredData.length === 0 ? (
                <div className="page-empty">
                    <p className="page-empty__title">No items yet</p>
                    <p>
                        {ratingFilter === 'all'
                            ? `Nothing in your ${activeTab} to rate.`
                            : `No ${ratingFilter} items in your ${activeTab}.`}
                    </p>
                </div>
            ) : (
                filteredData.map((item) => (
                    <article key={item.discogs_id} className="rating-item">
                        <Link to={`/release/${item.discogs_id}`}>
                            <img
                                className="rating-item__thumb"
                                src={item.thumb_url || item.cover_image_url || 'https://via.placeholder.com/64x64/cccccc/666666?text=No+Image'}
                                alt={item.title || 'Album cover'}
                                onError={(e) => {
                                    e.target.src = 'https://via.placeholder.com/64x64/cccccc/666666?text=No+Image';
                                }}
                            />
                        </Link>
                        <div>
                            <h3 className="match-card__title" style={{ marginBottom: 4 }}>
                                <Link to={`/release/${item.discogs_id}`}>{item.title}</Link>
                            </h3>
                            <p className="match-card__meta">{item.artist}{item.release_year ? ` · ${item.release_year}` : ''}</p>
                            <div className="rating-item__stars">{renderStars(item.rating || 0, item.discogs_id)}</div>
                        </div>
                        {item.ranking != null && (
                            <span className="pill pill--muted">#{item.ranking}</span>
                        )}
                    </article>
                ))
            )}
        </section>
    );
};

export default RatingScreen;
