import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
                    style={{
                        cursor: 'pointer',
                        fontSize: '1.5em',
                        color: i <= currentRating ? '#ffc107' : '#e4e5e9',
                        marginRight: '2px'
                    }}
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
            <div className="container mt-4">
                <div className="text-center">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p>Loading your collection...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mt-4">
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            </div>
        );
    }

    const stats = getRatingStats();
    const filteredData = getFilteredAndSortedData();

    return (
        <div className="container mt-4">
            <div className="row">
                <div className="col-12">
                    <h1 className="mb-4">
                        <i className="fas fa-star me-2"></i>
                        Rate Your Items
                    </h1>
                    
                    {/* Tab Navigation */}
                    <ul className="nav nav-tabs mb-4" id="ratingTabs" role="tablist">
                        <li className="nav-item" role="presentation">
                            <button 
                                className={`nav-link ${activeTab === 'collection' ? 'active' : ''}`}
                                onClick={() => setActiveTab('collection')}
                                type="button"
                            >
                                <i className="fas fa-music me-2"></i>
                                Collection ({collection.length})
                            </button>
                        </li>
                        <li className="nav-item" role="presentation">
                            <button 
                                className={`nav-link ${activeTab === 'wantlist' ? 'active' : ''}`}
                                onClick={() => setActiveTab('wantlist')}
                                type="button"
                            >
                                <i className="fas fa-heart me-2"></i>
                                Wantlist ({wantlist.length})
                            </button>
                        </li>
                    </ul>
                    {/* Statistics */}
                    <div className="row mb-4">
                        <div className="col-md-3">
                            <div className="card bg-primary text-white">
                                <div className="card-body text-center">
                                    <h5 className="card-title">Total Items</h5>
                                    <h3>{stats.total}</h3>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card bg-success text-white">
                                <div className="card-body text-center">
                                    <h5 className="card-title">Rated</h5>
                                    <h3>{stats.rated}</h3>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card bg-warning text-white">
                                <div className="card-body text-center">
                                    <h5 className="card-title">Unrated</h5>
                                    <h3>{stats.unrated}</h3>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card bg-info text-white">
                                <div className="card-body text-center">
                                    <h5 className="card-title">Avg Rating</h5>
                                    <h3>{stats.avgRating}</h3>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Top 5 Management */}
                    <div className="row mb-4">
                        <div className="col-12">
                            <div className="card">
                                <div className="card-body">
                                    <h5 className="card-title mb-3">
                                        <i className="fas fa-trophy me-2" style={{color: '#ffc107'}}></i>
                                        Top 5 {activeTab === 'collection' ? 'Collection' : 'Wantlist'} Items
                                    </h5>
                                    <div className="row">
                                        {[1, 2, 3, 4, 5].map((position) => {
                                            const top5 = getTop5();
                                            const item = top5[position - 1];
                                            const currentData = activeTab === 'collection' ? collection : wantlist;
                                            
                                            return (
                                                <div key={position} className="col-md-12 mb-3">
                                                    <div className="d-flex align-items-center">
                                                        <div style={{
                                                            width: '40px',
                                                            height: '40px',
                                                            borderRadius: '50%',
                                                            background: position === 1 ? '#ffd700' : position === 2 ? '#c0c0c0' : position === 3 ? '#cd7f32' : '#6c757d',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: 'bold',
                                                            color: 'white',
                                                            marginRight: '15px',
                                                            fontSize: '1.2em'
                                                        }}>
                                                            {position}
                                                        </div>
                                                        <div style={{flex: 1}}>
                                                            <select
                                                                className="form-select"
                                                                value={item ? item.discogs_id : ''}
                                                                onChange={(e) => handleTop5Change(position, e.target.value)}
                                                            >
                                                                <option value="">Select an item...</option>
                                                                {currentData
                                                                    .sort((a, b) => {
                                                                        const aTitle = a.title?.toLowerCase() || '';
                                                                        const bTitle = b.title?.toLowerCase() || '';
                                                                        return aTitle.localeCompare(bTitle);
                                                                    })
                                                                    .map((dataItem) => (
                                                                        <option key={dataItem.discogs_id} value={dataItem.discogs_id}>
                                                                            {dataItem.title} - {dataItem.artist}
                                                                            {dataItem.ranking !== null && dataItem.ranking !== position ? ` (Currently #${dataItem.ranking})` : ''}
                                                                        </option>
                                                                    ))}
                                                            </select>
                                                        </div>
                                                        {item && (
                                                            <div style={{marginLeft: '15px', display: 'flex', alignItems: 'center'}}>
                                                                <Link to={`/release/${item.discogs_id}`}>
                                                                    <img 
                                                                        src={item.thumb_url || item.cover_image_url || 'https://via.placeholder.com/50x50/cccccc/666666?text=No+Image'}
                                                                        alt={item.title}
                                                                        style={{
                                                                            width: '50px',
                                                                            height: '50px',
                                                                            objectFit: 'cover',
                                                                            borderRadius: '4px'
                                                                        }}
                                                                        onError={(e) => {
                                                                            e.target.src = 'https://via.placeholder.com/50x50/cccccc/666666?text=No+Image';
                                                                        }}
                                                                    />
                                                                </Link>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters and Sorting */}
                    <div className="row mb-3">
                        <div className="col-md-6">
                            <label htmlFor="ratingFilter" className="form-label">Filter by Rating:</label>
                            <select 
                                className="form-select" 
                                id="ratingFilter"
                                value={ratingFilter}
                                onChange={(e) => setRatingFilter(e.target.value)}
                            >
                                <option value="all">All Items</option>
                                <option value="rated">Rated Items</option>
                                <option value="unrated">Unrated Items</option>
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label htmlFor="sortBy" className="form-label">Sort by:</label>
                            <select 
                                className="form-select" 
                                id="sortBy"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="title">Title</option>
                                <option value="artist">Artist</option>
                                <option value="rating">Rating</option>
                                <option value="ranking">Ranking</option>
                                <option value="date_added">Date Added</option>
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label htmlFor="sortOrder" className="form-label">Order:</label>
                            <select 
                                className="form-select" 
                                id="sortOrder"
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                            >
                                <option value="asc">Ascending</option>
                                <option value="desc">Descending</option>
                            </select>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="row">
                        {filteredData.length === 0 ? (
                            <div className="col-12">
                                <div className="alert alert-info" role="alert">
                                    {ratingFilter === 'all' 
                                        ? `No items in your ${activeTab} yet.` 
                                        : `No ${ratingFilter} items found in your ${activeTab}.`
                                    }
                                </div>
                            </div>
                        ) : (
                            filteredData.map((item) => (
                                <div key={item.discogs_id} className="col-md-6 col-lg-4 mb-3">
                                    <div className="card h-100" style={{position: 'relative'}}>
                                        {/* Ranking Badge */}
                                        {item.ranking !== null && item.ranking !== undefined && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '10px',
                                                left: '10px',
                                                width: '30px',
                                                height: '30px',
                                                borderRadius: '50%',
                                                background: item.ranking <= 3 ? (item.ranking === 1 ? '#ffd700' : item.ranking === 2 ? '#c0c0c0' : '#cd7f32') : '#6c757d',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 'bold',
                                                color: 'white',
                                                fontSize: '0.9em',
                                                zIndex: 10,
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                            }}>
                                                #{item.ranking}
                                            </div>
                                        )}
                                        <div className="row g-0">
                                            <div className="col-4">
                                                <Link to={`/release/${item.discogs_id}`}>
                                                    <img 
                                                        src={(() => {
                                                            const imgUrl = item.thumb_url || item.cover_image_url || 'https://via.placeholder.com/150x150/cccccc/666666?text=No+Image';
                                                            console.log(`Image for ${item.title}: ${imgUrl}`);
                                                            return imgUrl;
                                                        })()}
                                                        className="img-fluid rounded-start" 
                                                        alt={item.title || 'Album cover'}
                                                        style={{
                                                            objectFit: 'cover', 
                                                            minHeight: '120px',
                                                            width: '100%',
                                                            height: '100%',
                                                            cursor: 'pointer'
                                                        }}
                                                        onError={(e) => {
                                                            console.log(`Image failed to load for ${item.title}:`, e.target.src);
                                                            e.target.src = 'https://via.placeholder.com/150x150/cccccc/666666?text=No+Image';
                                                        }}
                                                    />
                                                </Link>
                                            </div>
                                            <div className="col-8">
                                                <div className="card-body p-2">
                                                    <h6 className="card-title mb-1" style={{fontSize: '0.9em'}}>
                                                        <Link 
                                                            to={`/release/${item.discogs_id}`}
                                                            className="text-decoration-none text-dark"
                                                            style={{fontSize: '0.9em'}}
                                                        >
                                                            {item.title}
                                                        </Link>
                                                    </h6>
                                                    <p className="card-text mb-1" style={{fontSize: '0.8em', color: '#666'}}>
                                                        {item.artist}
                                                    </p>
                                                    <p className="card-text mb-2" style={{fontSize: '0.7em', color: '#888'}}>
                                                        {item.release_year}
                                                    </p>
                                                    
                                                    {/* Rating Stars */}
                                                    <div className="mb-2">
                                                        <div style={{fontSize: '0.8em', marginBottom: '2px'}}>
                                                            Your Rating:
                                                        </div>
                                                        {renderStars(item.rating || 0, item.discogs_id)}
                                                    </div>

                                                    {/* Ranking Input */}
                                                    <div className="mb-2">
                                                        <label style={{fontSize: '0.8em', marginBottom: '2px', display: 'block'}}>
                                                            Ranking:
                                                        </label>
                                                        <select
                                                            className="form-select form-select-sm"
                                                            value={item.ranking !== null && item.ranking !== undefined ? item.ranking : ''}
                                                            onChange={(e) => handleRankingChange(item.discogs_id, e.target.value ? parseInt(e.target.value) : null)}
                                                            style={{fontSize: '0.8em'}}
                                                        >
                                                            <option value="">No ranking</option>
                                                            {[...Array(100)].map((_, i) => (
                                                                <option key={i + 1} value={i + 1}>
                                                                    #{i + 1}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* Current Rating Display */}
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        {item.rating && item.rating > 0 && (
                                                            <small className="text-muted">
                                                                Rated: {item.rating}/5
                                                            </small>
                                                        )}
                                                        {item.ranking !== null && item.ranking !== undefined && (
                                                            <small className="text-muted">
                                                                Rank: #{item.ranking}
                                                            </small>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RatingScreen;
