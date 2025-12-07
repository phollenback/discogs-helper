import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../../AuthContext';
import { useApi } from '../../utility/backSource';
import '../../styles/theme.css';

// Action Dropdown Component
const ActionDropdown = ({ discogsId, onEdit, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
                className="grail-btn grail-btn--primary grail-btn--sm"
                onClick={() => setIsOpen(!isOpen)}
                style={{ 
                    width: '100%', 
                    justifyContent: 'center',
                    minWidth: '80px',
                    fontWeight: '600',
                    boxShadow: isOpen ? '0 2px 8px rgba(255, 193, 7, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.2s ease',
                    border: `1px solid ${isOpen ? 'var(--grail-primary)' : 'var(--grail-glass-border)'}`
                }}
                title="Actions"
            >
                <i className="fas fa-ellipsis-v" style={{ marginRight: '0.5rem' }}></i>
                Actions
            </button>
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: '0.25rem',
                    background: 'var(--grail-surface)',
                    border: '1px solid var(--grail-glass-border)',
                    borderRadius: 'var(--grail-radius-md)',
                    boxShadow: 'var(--grail-shadow)',
                    zIndex: 1000,
                    minWidth: '160px',
                    overflow: 'hidden'
                }}>
                    <button
                        className="grail-btn grail-btn--ghost grail-btn--sm"
                        onClick={() => {
                            setIsOpen(false);
                            onEdit();
                        }}
                        style={{
                            width: '100%',
                            borderRadius: 0,
                            justifyContent: 'flex-start',
                            padding: '0.65rem 1rem',
                            background: 'transparent',
                            color: 'var(--grail-text)',
                            borderBottom: '1px solid var(--grail-glass-border)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.color = 'var(--grail-accent)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--grail-text)';
                        }}
                    >
                        <i className="fas fa-edit" style={{ marginRight: '0.5rem', width: '16px' }}></i>
                        Edit
                    </button>
                    <Link
                        to={`/price-suggestion/${discogsId}`}
                        className="grail-btn grail-btn--primary grail-btn--sm"
                        style={{
                            width: '100%',
                            borderRadius: 0,
                            justifyContent: 'flex-start',
                            padding: '0.65rem 1rem',
                            background: 'transparent',
                            color: 'var(--grail-text)',
                            borderBottom: '1px solid var(--grail-glass-border)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.color = 'var(--grail-primary)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--grail-text)';
                        }}
                    >
                        <i className="fas fa-dollar-sign" style={{ marginRight: '0.5rem', width: '16px' }}></i>
                        Check Price
                    </Link>
                    <button
                        className="grail-btn grail-btn--ghost grail-btn--sm"
                        onClick={() => {
                            setIsOpen(false);
                            onDelete();
                        }}
                        style={{
                            width: '100%',
                            borderRadius: 0,
                            justifyContent: 'flex-start',
                            padding: '0.65rem 1rem',
                            background: 'transparent',
                            color: 'var(--grail-text)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 107, 107, 0.15)';
                            e.currentTarget.style.color = 'var(--grail-danger)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--grail-text)';
                        }}
                    >
                        <i className="fas fa-trash" style={{ marginRight: '0.5rem', width: '16px' }}></i>
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
};

const WantlistScreen = () => {
    const [wantlist, setWantlist] = useState([]);
    const [syncing, setSyncing] = useState(false);
    const [hasOAuth, setHasOAuth] = useState(null); // null = checking, true = has OAuth, false = no OAuth
    const { authState } = useAuthContext();
    // All requests go through backend OAuth proxy
    const { getData: getBackendData, updateData, deleteData: deleteBackendData, postData } = useApi();
    const userInitiatedSync = useRef(false);

    // Check OAuth status on mount
    useEffect(() => {
        const checkOAuth = async () => {
            try {
                if (authState.userId) {
                    const status = await getBackendData(`/api/users/${authState.userId}/discogs/oauth/status`);
                    setHasOAuth(status.connected || false);
                } else {
                    setHasOAuth(false);
                }
            } catch (err) {
                console.warn('[WantlistScreen] Could not check OAuth status:', err);
                setHasOAuth(false);
            }
        };
        checkOAuth();
    }, [authState.userId, getBackendData]);

    useEffect(() => {
        userInitiatedSync.current = false;
        if (hasOAuth !== null) { // Only sync if OAuth status is determined
            syncWithDiscogs();
        }
        // eslint-disable-next-line
    }, [hasOAuth]);


    
    const handleEditClick = async (discogsId) => {
        // Prompt user for new notes, rating, and price threshold
        const item = wantlist.find(i => i.discogs_id === discogsId);
        const newNotes = prompt('Edit notes:', item?.notes || '');
        if (newNotes === null) return; // Cancelled
        const newRatingStr = prompt('Edit rating (0-5):', item?.rating?.toString() || '0');
        if (newRatingStr === null) return; // Cancelled
        const newRating = parseInt(newRatingStr, 10);
        if (isNaN(newRating) || newRating < 0 || newRating > 5) {
            alert('Invalid rating. Must be 0-5.');
            return;
        }
        const newPriceThresholdStr = prompt('Edit price threshold:', item?.price_threshold?.toString() || '');
        if (newPriceThresholdStr === null) return; // Cancelled
        const newPriceThreshold = parseFloat(newPriceThresholdStr);
        if (isNaN(newPriceThreshold)) {
            alert('Invalid price threshold.');
            return;
        }
        try {
            console.log('Updating Discogs:', {
                endpoint: `/users/pskills/wants/${discogsId}?notes=${encodeURIComponent(newNotes)}&rating=${newRating}`,
                notes: newNotes,
                rating: newRating
            });
            // TODO: Discogs API update is currently failing with 405 error
            // Need to investigate correct endpoint for updating wantlist items
            // For now, just update the backend database
            /*
            const discogsResp = await putDiscogsData(`/users/pskills/wants/${discogsId}`, {
                notes: newNotes,
                rating: newRating
            });
            console.log('Discogs PUT response:', discogsResp);
            */
            
            // Check if item exists in backend collection
            const backendCollection = await getBackendData(`/api/users/${authState.userId}/collection`);
            const existingItem = backendCollection.find(b => b.discogs_id === discogsId);
            
            let backendResp;
            if (existingItem) {
                // Update existing item
                console.log('Updating existing backend item:', {
                    endpoint: `/api/users/${authState.userId}/collection/${discogsId}`,
                    price_threshold: newPriceThreshold,
                    rating: newRating,
                    notes: newNotes
                });
                backendResp = await updateData(`/api/users/${authState.userId}/collection/${discogsId}`, { 
                    price_threshold: newPriceThreshold, 
                    rating: newRating, 
                    notes: newNotes 
                });
            } else {
                // Create new item
                console.log('Creating new backend item:', {
                    endpoint: `/api/users/${authState.userId}/collection`,
                    discogsId: discogsId,
                    price_threshold: newPriceThreshold,
                    rating: newRating,
                    notes: newNotes
                });
                backendResp = await postData(`/api/users/${authState.userId}/collection`, {
                    userId: authState.userId,
                    discogsId: discogsId,
                    title: item.title || '',
                    artist: item.artist || '',
                    genre: item.genre || '',
                    releaseYear: item.releaseYear || '',
                    styles: item.styles || '',
                    rating: newRating,
                    notes: newNotes,
                    price_threshold: newPriceThreshold,
                    wishlist: 1
                });
            }
            console.log('Backend response:', backendResp);
            
            // Update UI
            setWantlist(wantlist.map(item =>
                item.discogs_id === discogsId
                    ? { ...item, notes: newNotes, rating: newRating, price_threshold: newPriceThreshold }
                    : item
            ));
        } catch (err) {
            console.error('Failed to update item:', err);
            alert('Failed to update item.');
        }
    };
    
    const handleDeleteClick = async (discogsId) => {
        try {
            // Delete from backend database (works for both OAuth and non-OAuth users)
            console.log('Deleting from backend:', {
                endpoint: `/api/users/${authState.userId}/collection/${discogsId}`,
                discogsId
            });
            
            await deleteBackendData(`/api/users/${authState.userId}/collection/${discogsId}`);
            console.log('Successfully deleted from backend');
            
            // Update UI
            setWantlist(wantlist.filter(item => item.discogs_id !== discogsId));
        } catch (err) {
            console.error('Failed to delete item:', err);
            alert('Failed to delete item from wantlist.');
        }
    };

    const syncWithDiscogs = async () => {
        setSyncing(true);
        let discogsSuccess = false;
        let backendSuccess = false;
        
        console.log('[WantlistScreen] Starting sync...', { 
            userId: authState.userId, 
            username: authState.username,
            isAuthenticated: authState.token ? 'yes' : 'no'
        });
        
        try {
            if (!authState.userId) {
                throw new Error('User ID not available - user may not be logged in');
            }
            
            // Check OAuth status
            let userHasOAuth = hasOAuth;
            if (userHasOAuth === null) {
                try {
                    const oauthStatus = await getBackendData(`/api/users/${authState.userId}/discogs/oauth/status`);
                    userHasOAuth = oauthStatus.connected || false;
                    setHasOAuth(userHasOAuth);
                    console.log('[WantlistScreen] OAuth status:', userHasOAuth ? 'Connected' : 'Not connected');
                } catch (err) {
                    console.warn('[WantlistScreen] Could not check OAuth status:', err);
                    userHasOAuth = false;
                    setHasOAuth(false);
                }
            }
            
            let discogsWantlist = [];
            
            if (userHasOAuth) {
                // OAuth user - try to sync with Discogs API via OAuth proxy
                try {
                    const discogsData = await getBackendData(`/api/users/${authState.userId}/discogs/proxy/wants?username=${authState.username}`);
                    console.log('[WantlistScreen] Discogs wantlist data:', discogsData);
                    
                    if (discogsData.wants && discogsData.wants.length > 0) {
                        discogsWantlist = discogsData.wants.map(w => ({
                            discogs_id: w.basic_information.id,
                            thumb: w.basic_information.thumb,
                            title: w.basic_information.title,
                            artist: w.basic_information.artists.map(a => a.name).join(', '),
                            genre: w.basic_information.genres?.join(', '),
                            releaseYear: (typeof w.basic_information.year === 'number') ? w.basic_information.year.toString() : '',
                            styles: Array.isArray(w.basic_information.styles) 
                                ? w.basic_information.styles.join(', ')
                                : '',
                            notes: w.notes,
                            rating: w.rating || 0,
                            price_threshold: ''
                        }));
                        discogsSuccess = true;
                    }
                } catch (discogsErr) {
                    console.warn('[WantlistScreen] Discogs sync failed, falling back to SQL:', discogsErr);
                }
            }
            
            // Fetch from backend (SQL) - either as primary source or to merge with Discogs data
            try {
                console.log('[WantlistScreen] Fetching backend wantlist for username:', authState.username);
                const backendWantlist = await getBackendData(`/api/users/${authState.username}/wantlist`);
                console.log('[WantlistScreen] Backend wantlist response:', backendWantlist);
                
                // Transform SQL data to match expected format
                const sqlWantlist = (backendWantlist || []).map(item => ({
                    discogs_id: item.discogs_id || null,
                    thumb: item.thumb_url || '',
                    title: item.title || '',
                    artist: item.artist || '',
                    genre: item.genre || '',
                    releaseYear: item.release_year || '',
                    styles: item.styles || '',
                    notes: item.notes || '',
                    rating: item.rating || 0,
                    price_threshold: item.price_threshold || ''
                }));
                
                if (userHasOAuth && discogsSuccess && discogsWantlist.length > 0) {
                    // Merge Discogs and SQL data (Discogs takes precedence for OAuth users)
                    const merged = discogsWantlist.map(discogsItem => {
                        const sqlItem = sqlWantlist.find(s => s.discogs_id === discogsItem.discogs_id);
                        return sqlItem ? {
                            ...discogsItem,
                            price_threshold: sqlItem.price_threshold || ''
                        } : discogsItem;
                    });
                    setWantlist(merged);
                } else {
                    // Non-OAuth user or Discogs sync failed - use SQL data
                    setWantlist(sqlWantlist);
                }
                backendSuccess = true;
            } catch (backendErr) {
                console.warn('[WantlistScreen] Backend wantlist fetch failed:', backendErr);
                console.log('[WantlistScreen] Attempting fallback to collection endpoint');
                
                try {
                    const backendCollection = await getBackendData(`/api/users/${authState.username}/collection`);
                    console.log('[WantlistScreen] Backend collection response:', backendCollection);
                    const wantlistItems = (backendCollection || []).filter(item => item.wishlist === 1 || item.wishlist === true);
                    console.log('[WantlistScreen] Filtered wantlist items:', wantlistItems.length);
                    
                    // Transform SQL data
                    const mapped = wantlistItems.map(item => ({
                        discogs_id: item.discogs_id || null,
                        thumb: item.thumb_url || '',
                        title: item.title || '',
                        artist: item.artist || '',
                        genre: item.genre || '',
                        releaseYear: item.release_year || '',
                        styles: item.styles || '',
                        notes: item.notes || '',
                        rating: item.rating || 0,
                        price_threshold: item.price_threshold || ''
                    }));
                    
                    setWantlist(mapped);
                    backendSuccess = true;
                } catch (collectionErr) {
                    console.error('[WantlistScreen] Backend collection fallback also failed:', collectionErr);
                    throw collectionErr;
                }
            }

            // Provide appropriate feedback
            if (userInitiatedSync.current) {
                if (discogsSuccess && backendSuccess) {
                    alert('Successfully synced with both backend and Discogs!');
                } else if (backendSuccess) {
                    alert('Backend data loaded successfully. Discogs sync unavailable.');
                } else {
                    alert('Failed to load wantlist data.');
                }
            }
        } catch (err) {
            console.error('Sync error:', err);
            if (userInitiatedSync.current) {
                alert('Failed to load wantlist data. Please try again.');
            }
        } finally {
            setSyncing(false);
        }
    };

    const handleSyncClick = () => {
        userInitiatedSync.current = true;
        syncWithDiscogs();
    };

    return (
        <div className="grail-content">
            <div className="grail-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--grail-spacing-lg)', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 className="grail-section-title" style={{ marginBottom: '0.5rem' }}>
                            {authState.username}'s Wantlist
                        </h1>
                        <p className="grail-section-subtitle">
                            Track releases you're looking to add to your collection
                        </p>
                    </div>
                    {hasOAuth && (
                        <button 
                            className='grail-btn grail-btn--primary grail-btn--sm' 
                            onClick={handleSyncClick} 
                            disabled={syncing}
                        >
                            {syncing ? (
                                <>
                                    <span className="spinner-border spinner-border-sm" style={{ marginRight: '0.5rem' }} role="status" aria-hidden="true"></span>
                                    Loading...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-sync" style={{ marginRight: '0.5rem' }}></i>
                                    Refresh Wantlist
                                </>
                            )}
                        </button>
                    )}
                </div>
                
                {hasOAuth && (
                    <p className="grail-section-subtitle" style={{ marginBottom: 'var(--grail-spacing-lg)', fontSize: '0.75rem' }}>
                        Shows your local wantlist. Discogs sync is optional and may be rate-limited.
                    </p>
                )}

                <div style={{ position: 'relative', width: '100%' }}>
                    <div style={{ overflowX: 'auto', marginRight: '110px' }}>
                        <table className="grail-table" style={{ width: '100%', minWidth: '100%' }}>
                            <thead>
                                <tr>
                                    <th scope="col" style={{ minWidth: '80px', width: '80px' }}>Discogs #</th>
                                    <th scope="col" style={{ minWidth: '60px', width: '60px' }}>Cover</th>
                                    <th scope="col" style={{ minWidth: '200px' }}>Title</th>
                                    <th scope="col" style={{ minWidth: '150px' }}>Artist</th>
                                    <th scope="col" style={{ minWidth: '100px' }}>Genre</th>
                                    <th scope="col" style={{ minWidth: '150px' }}>Notes</th>
                                    <th scope="col" style={{ minWidth: '60px', width: '60px' }}>Rating</th>
                                    <th scope="col" style={{ minWidth: '100px', width: '100px' }}>Price Target</th>
                                </tr>
                            </thead>
                            <tbody>
                                {wantlist.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--grail-muted)' }}>
                                            No items in wantlist. Add releases to track what you're looking for.
                                        </td>
                                    </tr>
                                ) : wantlist.map((item) => (
                                    <tr key={item.discogs_id}>
                                        <th scope="row" style={{ fontWeight: '600' }}>
                                            <Link 
                                                to={`/release/${item.discogs_id}`}
                                                style={{ color: 'var(--grail-primary)', textDecoration: 'none' }}
                                            >
                                                {item.discogs_id}
                                            </Link>
                                        </th>
                                        <td>
                                            <Link to={`/release/${item.discogs_id}`}>
                                                <img 
                                                    src={item.thumb} 
                                                    alt={item.title} 
                                                    style={{
                                                        width: '50px',
                                                        height: '50px',
                                                        objectFit: 'cover',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        border: '1px solid var(--grail-glass-border)'
                                                    }} 
                                                />
                                            </Link>
                                        </td>
                                        <td>
                                            <Link 
                                                to={`/release/${item.discogs_id}`}
                                                style={{ color: 'var(--grail-text)', textDecoration: 'none' }}
                                            >
                                                {item.title}
                                            </Link>
                                        </td>
                                        <td style={{ color: 'var(--grail-text-subtle)' }}>{item.artist}</td>
                                        <td style={{ color: 'var(--grail-text-subtle)', fontSize: '0.85rem' }}>{item.genre}</td>
                                        <td style={{ color: 'var(--grail-text-subtle)', fontSize: '0.85rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.notes || '—'}</td>
                                        <td style={{ color: 'var(--grail-highlight)', fontWeight: '600' }}>{item.rating || '—'}</td>
                                        <td style={{ color: 'var(--grail-text-subtle)' }}>{item.price_threshold ? `$${item.price_threshold}` : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Sticky Actions Column */}
                    <div style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        width: '100px',
                        background: 'var(--grail-surface)',
                        borderLeft: '1px solid var(--grail-glass-border)',
                        zIndex: 10
                    }}>
                        <table className="grail-table" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th scope="col" style={{ width: '100px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {wantlist.length === 0 ? (
                                    <tr>
                                        <td style={{ height: '53px' }}></td>
                                    </tr>
                                ) : wantlist.map((item) => (
                                    <tr key={item.discogs_id}>
                                        <td style={{ padding: '0.85rem 0.5rem' }}>
                                            <ActionDropdown 
                                                discogsId={item.discogs_id}
                                                onEdit={() => handleEditClick(item.discogs_id)}
                                                onDelete={() => handleDeleteClick(item.discogs_id)}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WantlistScreen;
