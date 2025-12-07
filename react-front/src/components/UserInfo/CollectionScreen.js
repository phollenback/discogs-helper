import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../../AuthContext';
import { useApi } from '../../utility/backSource';
import FolderManager from '../Folders/FolderManager';
import '../../styles/theme.css';

// Action Dropdown Component
const ActionDropdown = ({ discogsId, instanceId, onEdit, onDelete, onMoveFolder }) => {
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
                    {onMoveFolder && (
                        <button
                            className="grail-btn grail-btn--ghost grail-btn--sm"
                            onClick={() => {
                                setIsOpen(false);
                                onMoveFolder();
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
                                e.currentTarget.style.color = 'var(--grail-primary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = 'var(--grail-text)';
                            }}
                        >
                            <i className="fas fa-folder" style={{ marginRight: '0.5rem', width: '16px' }}></i>
                            Move to Folder
                        </button>
                    )}
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

const CollectionScreen = () => {
    const [collection, setCollection] = useState([]);
    const [folders, setFolders] = useState([]);
    const [selectedFolder, setSelectedFolder] = useState(1); // Default to "Uncategorized"
    const [syncing, setSyncing] = useState(false);
    const [activeTab, setActiveTab] = useState('collection'); // 'collection' or 'folders'
    const [collectionValue, setCollectionValue] = useState(null);
    const [loadingValue, setLoadingValue] = useState(false);
    const [valueError, setValueError] = useState(null);
    const [moveFolderModal, setMoveFolderModal] = useState(null); // { releaseId, instanceId, currentFolderId }
    const [movingRelease, setMovingRelease] = useState(false);
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
                console.warn('[CollectionScreen] Could not check OAuth status:', err);
                setHasOAuth(false);
            }
        };
        checkOAuth();
    }, [authState.userId, getBackendData]);

    useEffect(() => {
        if (hasOAuth !== null) { // Only load if OAuth status is determined
            userInitiatedSync.current = false;
            loadFolders();
            syncCollection();
        }
        // eslint-disable-next-line
    }, [selectedFolder, hasOAuth]);

    const loadFolders = async () => {
        try {
            // Only load folders for OAuth users
            if (hasOAuth === false) {
                console.log('[CollectionScreen] Skipping folder load for non-OAuth user');
                setFolders([{ id: 1, name: 'Uncategorized', count: 0 }]);
                return;
            }
            
            if (hasOAuth === null) {
                // Still checking OAuth status, wait
                return;
            }
            
            console.log('[CollectionScreen] Loading folders for user:', authState.username);
            const foldersData = await getBackendData(`/api/users/${authState.username}/folders`);
            console.log('[CollectionScreen] Folders loaded:', foldersData);
            setFolders(foldersData.folders || [{ id: 1, name: 'Uncategorized', count: 0 }]);
        } catch (err) {
            console.error('[CollectionScreen] Failed to load folders:', err);
            // For non-OAuth users, this is expected - just use default folder
            if (hasOAuth === false) {
                console.log('[CollectionScreen] Non-OAuth user - using default folder');
            }
            // Fallback to Uncategorized folder
            setFolders([{ id: 1, name: 'Uncategorized', count: 0 }]);
        }
    };

    const syncCollection = async () => {
        setSyncing(true);
        try {
            console.log('[CollectionScreen] Starting collection sync...', {
                userId: authState.userId,
                username: authState.username,
                selectedFolder: selectedFolder,
                isAuthenticated: authState.token ? 'yes' : 'no'
            });
            
            // Check if we have necessary auth data
            if (!authState.username || !authState.userId) {
                throw new Error('Username or UserId not available - user may not be logged in');
            }
            
            // Check OAuth status first
            let userHasOAuth = hasOAuth;
            if (userHasOAuth === null) {
                // If not yet determined, check now
                try {
                    const oauthStatus = await getBackendData(`/api/users/${authState.userId}/discogs/oauth/status`);
                    userHasOAuth = oauthStatus.connected || false;
                    setHasOAuth(userHasOAuth);
                    console.log('[CollectionScreen] OAuth status:', userHasOAuth ? 'Connected' : 'Not connected');
                } catch (err) {
                    console.warn('[CollectionScreen] Could not check OAuth status:', err);
                    userHasOAuth = false;
                    setHasOAuth(false);
                }
            }
            
            if (userHasOAuth) {
                // OAuth user - use Discogs proxy
                console.log('[CollectionScreen] Fetching from Discogs API via proxy...');
                try {
                    const discogsData = await getBackendData(`/api/users/${authState.userId}/discogs/proxy/collection/folders/${selectedFolder}/releases?username=${authState.username}`);
                    console.log('[CollectionScreen] Discogs API response:', discogsData);
                    
                    const mapped = discogsData.releases.map(release => {
                        console.log('Processing release:', release);
                        
                        // Safely extract artist names
                        let artistNames = '';
                        if (release.basic_information.artists && Array.isArray(release.basic_information.artists)) {
                            artistNames = release.basic_information.artists
                                .map(a => (a && typeof a === 'object' && a.name) ? a.name : '')
                                .filter(name => name !== '')
                                .join(', ');
                        }
                        
                        // Safely extract genres
                        let genres = '';
                        if (release.basic_information.genres && Array.isArray(release.basic_information.genres)) {
                            genres = release.basic_information.genres
                                .map(g => (typeof g === 'string') ? g : '')
                                .filter(g => g !== '')
                                .join(', ');
                        }
                        
                        // Ensure all values are strings, numbers, or null
                        const mappedItem = {
                            discogs_id: release.basic_information.id || null,
                            instance_id: release.instance_id || null,
                            thumb: (typeof release.basic_information.thumb === 'string') ? release.basic_information.thumb : '',
                            title: (typeof release.basic_information.title === 'string') ? release.basic_information.title : '',
                            artist: artistNames,
                            genre: genres,
                            releaseYear: (typeof release.basic_information.year === 'number') ? release.basic_information.year.toString() : '',
                            styles: Array.isArray(release.basic_information.styles) 
                                ? release.basic_information.styles.join(', ')
                                : '',
                            notes: (typeof release.notes === 'string') ? release.notes : '',
                            rating: (typeof release.rating === 'number') ? release.rating : 0,
                            price_threshold: '',
                            cover: (typeof release.basic_information.cover_image === 'string') ? release.basic_information.cover_image : '',
                            folder_id: selectedFolder
                        };
                        
                        console.log('Mapped item:', mappedItem);
                        return mappedItem;
                    });
                    
                    // Fetch backend collection for this user
                    console.log('[CollectionScreen] Fetching backend collection for username:', authState.username);
                    let backendCollection = [];
                    
                    try {
                        if (!authState.username) {
                            console.warn('[CollectionScreen] Username not available, skipping backend sync');
                        } else {
                            backendCollection = await getBackendData(`/api/users/${authState.username}/collection`);
                            console.log('[CollectionScreen] Backend collection response:', backendCollection);
                        }
                    } catch (backendErr) {
                        console.error('[CollectionScreen] Backend collection fetch failed:', backendErr);
                        console.warn('[CollectionScreen] Continuing with Discogs data only');
                        // Continue without backend data - use empty array
                        backendCollection = [];
                    }
                    
                    // Merge backend fields into collection
                    const merged = mapped.map(item => {
                        const backendItem = backendCollection.find(b => b.discogs_id === item.discogs_id);
                        const mergedItem = backendItem ? {
                            ...item,
                            notes: (typeof backendItem.notes === 'string') ? backendItem.notes : (item.notes || ''),
                            rating: (typeof backendItem.rating === 'number') ? backendItem.rating : (item.rating || 0),
                            price_threshold: (typeof backendItem.price_threshold === 'string' || typeof backendItem.price_threshold === 'number') ? backendItem.price_threshold.toString() : ''
                        } : item;
                        
                        console.log('Merged item:', mergedItem);
                        return mergedItem;
                    });
                    
                    setCollection(merged);
                    console.log('Final collection:', merged);
                    if (userInitiatedSync.current) {
                        alert('Synced with Discogs!');
                    }
                } catch (discogsErr) {
                    console.error('[CollectionScreen] Discogs API fetch failed:', discogsErr);
                    // If Discogs fails for OAuth user, fall back to SQL
                    try {
                        console.log('[CollectionScreen] Falling back to SQL collection...');
                        const sqlCollection = await getBackendData(`/api/users/${authState.username}/collection`);
                        const mapped = (sqlCollection || []).map(item => ({
                            discogs_id: item.discogs_id || null,
                            instance_id: null,
                            thumb: item.thumb_url || '',
                            title: item.title || '',
                            artist: item.artist || '',
                            genre: item.genre || '',
                            releaseYear: item.release_year || '',
                            styles: item.styles || '',
                            notes: item.notes || '',
                            rating: item.rating || 0,
                            price_threshold: item.price_threshold || '',
                            cover: item.cover_image_url || '',
                            folder_id: selectedFolder || 1
                        }));
                        setCollection(mapped);
                    } catch (sqlErr) {
                        console.error('[CollectionScreen] SQL fallback also failed:', sqlErr);
                        throw sqlErr;
                    }
                }
            } else {
                // Non-OAuth user - load from SQL
                console.log('[CollectionScreen] Loading from SQL database...');
                const sqlCollection = await getBackendData(`/api/users/${authState.username}/collection`);
                
                // Transform SQL data to match expected format
                const mapped = (sqlCollection || []).map(item => ({
                    discogs_id: item.discogs_id || null,
                    instance_id: null, // SQL doesn't use instance_id
                    thumb: item.thumb_url || '',
                    title: item.title || '',
                    artist: item.artist || '',
                    genre: item.genre || '',
                    releaseYear: item.release_year || '',
                    styles: item.styles || '',
                    notes: item.notes || '',
                    rating: item.rating || 0,
                    price_threshold: item.price_threshold || '',
                    cover: item.cover_image_url || '',
                    folder_id: selectedFolder || 1 // Default to folder 1
                }));
                
                setCollection(mapped);
                console.log('[CollectionScreen] Collection loaded from SQL:', mapped.length, 'items');
            }
        } catch (err) {
            console.error('Sync error:', err);
            const errorMessage = err?.message || 'Failed to load collection';
            // Don't show error alert for non-OAuth users if it's a Discogs-related error
            if (!hasOAuth && errorMessage.includes('Discogs')) {
                console.warn('[CollectionScreen] Ignoring Discogs error for non-OAuth user');
            } else {
                alert(`Failed to load collection: ${errorMessage}`);
            }
        } finally {
            setSyncing(false);
        }
    };

    const handleEditClick = async (discogsId, instanceId) => {
        const item = collection.find(i => i.discogs_id === discogsId && i.instance_id === instanceId);
        const newNotes = prompt('Edit notes:', item?.notes || '');
        if (newNotes === null) return;
        const newRatingStr = prompt('Edit rating (0-5):', item?.rating?.toString() || '0');
        if (newRatingStr === null) return;
        const newRating = parseInt(newRatingStr, 10);
        if (isNaN(newRating) || newRating < 0 || newRating > 5) {
            alert('Invalid rating. Must be 0-5.');
            return;
        }
        const newPriceThresholdStr = prompt('Edit price threshold:', item?.price_threshold?.toString() || '');
        if (newPriceThresholdStr === null) return;
        const newPriceThreshold = parseFloat(newPriceThresholdStr);
        if (isNaN(newPriceThreshold)) {
            alert('Invalid price threshold.');
            return;
        }
        try {
            console.log('Updating Discogs collection:', {
                endpoint: `/users/${authState.username}/collection/folders/${selectedFolder}/releases/${discogsId}/instances/${instanceId}`,
                method: 'PUT',
                data: {
                    notes: newNotes,
                    rating: newRating
                },
                notes: newNotes,
                rating: newRating
            });
            
            // Update rating and notes on Discogs
            // TODO: Discogs API update is currently failing with 405 error
            // Need to investigate correct endpoint for updating collection items
            // For now, just update the backend database
            /*
            const discogsResp = await putDiscogsData(`/users/${authState.username}/collection/folders/${selectedFolder}/releases/${discogsId}/instances/${instanceId}`, {
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
                    wishlist: 0
                });
            }
            console.log('Backend response:', backendResp);
            
            // Update UI
            setCollection(collection.map(item =>
                (item.discogs_id === discogsId && item.instance_id === instanceId)
                    ? { ...item, notes: newNotes, rating: newRating, price_threshold: newPriceThreshold }
                    : item
            ));
        } catch (err) {
            console.error('Failed to update item:', err);
            alert('Failed to update item.');
        }
    };

    const handleMoveFolder = (discogsId, instanceId, currentFolderId) => {
        setMoveFolderModal({ releaseId: discogsId, instanceId, currentFolderId });
    };

    const handleMoveFolderConfirm = async (targetFolderId) => {
        if (!moveFolderModal || !targetFolderId || targetFolderId === moveFolderModal.currentFolderId) {
            setMoveFolderModal(null);
            return;
        }

        try {
            setMovingRelease(true);
            console.log('[CollectionScreen] Moving release:', {
                releaseId: moveFolderModal.releaseId,
                instanceId: moveFolderModal.instanceId,
                fromFolderId: moveFolderModal.currentFolderId,
                toFolderId: targetFolderId
            });

            await updateData(`/api/users/${authState.username}/releases/${moveFolderModal.releaseId}/move`, {
                fromFolderId: moveFolderModal.currentFolderId,
                toFolderId: targetFolderId,
                instanceId: moveFolderModal.instanceId
            });

            console.log('[CollectionScreen] Successfully moved release');
            alert('Release moved successfully!');
            setMoveFolderModal(null);
            // Refresh collection
            await syncCollection();
        } catch (err) {
            console.error('[CollectionScreen] Error moving release:', err);
            alert('Failed to move release. Please try again.');
        } finally {
            setMovingRelease(false);
        }
    };

    const handleDeleteClick = async (discogsId, instanceId) => {
        try {
            console.log('Deleting from Discogs collection:', {
                endpoint: `/users/${authState.username}/collection/folders/${selectedFolder}/releases/${discogsId}/instances/${instanceId}`,
                discogsId,
                instanceId
            });
            
            // Note: Discogs doesn't have an API endpoint to delete by instance_id via OAuth proxy
            // This would require a different Discogs API endpoint not yet supported
            console.log('Discogs instance deletion not supported via OAuth proxy yet');
            
            console.log('Deleting from backend:', {
                endpoint: `/api/users/${authState.userId}/collection/${discogsId}`,
                discogsId
            });
            
            // Delete from backend database
            const backendResp = await deleteBackendData(`/api/users/${authState.userId}/collection/${discogsId}`);
            console.log('Backend DELETE response:', backendResp);
            
            // Update UI
            setCollection(collection.filter(item => !(item.discogs_id === discogsId && item.instance_id === instanceId)));
        } catch (err) {
            console.error('Failed to delete item:', err);
            alert('Failed to delete item from collection.');
        }
    };

    const handleSyncClick = () => {
        userInitiatedSync.current = true;
        syncCollection();
    };

    const loadCollectionValue = async () => {
        try {
            setLoadingValue(true);
            setValueError(null);
            
            const apiUrl = process.env.REACT_APP_API_URL || '';
            const token = localStorage.getItem('token');
            const response = await fetch(`${apiUrl}/api/users/${authState.username}/collection/value`, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || `Failed to load collection value: ${response.statusText}`);
            }
            
            const data = await response.json();
            // Backend now returns numeric values, but ensure they're numbers
            const formattedData = {
                minimum: typeof data.minimum === 'number' ? data.minimum : (parseFloat(data.minimum) || 0),
                median: typeof data.median === 'number' ? data.median : (parseFloat(data.median) || 0),
                maximum: typeof data.maximum === 'number' ? data.maximum : (parseFloat(data.maximum) || 0)
            };
            setCollectionValue(formattedData);
        } catch (err) {
            console.error('Error loading collection value:', err);
            setValueError(err.message || 'Failed to load collection value');
            setCollectionValue(null); // Clear value on error to prevent stale data
        } finally {
            setLoadingValue(false);
        }
    };

    // Helper function to safely convert any value to a string
    const safeToString = (value) => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') return value;
        if (typeof value === 'number') return value.toString();
        if (typeof value === 'boolean') return value.toString();
        if (Array.isArray(value)) return value.join(', ');
        if (typeof value === 'object') {
            console.warn('Attempting to render object:', value);
            console.warn('Object keys:', Object.keys(value));
            console.warn('Object values:', Object.values(value));
            if (value.field_id && value.value) {
                console.warn('Found field_id/value object:', value);
                return `[${value.field_id}: ${value.value}]`;
            }
            return '[Object]';
        }
        return String(value);
    };


    return (
        <div className="grail-content">
            <div className="grail-card">
                <h1 className="grail-section-title" style={{ marginBottom: '0.5rem' }}>
                    {authState.username}'s Collection
            </h1>
                <p className="grail-section-subtitle" style={{ marginBottom: 'var(--grail-spacing-lg)' }}>
                    Manage your vinyl collection and track your records
                </p>
            
            {/* Navigation Tabs */}
                <div style={{ marginBottom: 'var(--grail-spacing-lg)', borderBottom: '1px solid var(--grail-glass-border)' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button 
                            className={`grail-btn grail-btn--ghost grail-btn--sm ${activeTab === 'collection' ? 'grail-btn--primary' : ''}`}
                            onClick={() => setActiveTab('collection')}
                            style={{ borderRadius: 'var(--grail-radius-md) var(--grail-radius-md) 0 0' }}
                        >
                            <i className="fas fa-compact-disc" style={{ marginRight: '0.5rem' }}></i>
                            Collection Items
                        </button>
                        <button 
                            className={`grail-btn grail-btn--ghost grail-btn--sm ${activeTab === 'folders' ? 'grail-btn--primary' : ''}`}
                            onClick={() => setActiveTab('folders')}
                            style={{ borderRadius: 'var(--grail-radius-md) var(--grail-radius-md) 0 0' }}
                        >
                            <i className="fas fa-folder" style={{ marginRight: '0.5rem' }}></i>
                            Manage Folders
                        </button>
                    </div>
            </div>

            {/* Tab Content */}
                {activeTab === 'collection' && (
                    <div>
                        {/* Collection Value Card */}
                        <div className='grail-card grail-card--compact' style={{ marginBottom: 'var(--grail-spacing-lg)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                    <div>
                                    <h5 className='grail-section-title' style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
                                        <i className="fas fa-dollar-sign" style={{ marginRight: '0.5rem' }}></i>
                                            Collection Value
                                        </h5>
                                        {collectionValue && (
                                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                            <div>
                                                <span className="grail-section-subtitle" style={{ display: 'block', marginBottom: '0.25rem' }}>Minimum</span>
                                                <span style={{ color: 'var(--grail-text)', fontWeight: '600', fontSize: '1.1rem' }}>
                                                    ${(Number(collectionValue.minimum) || 0).toFixed(2)}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="grail-section-subtitle" style={{ display: 'block', marginBottom: '0.25rem' }}>Median</span>
                                                <span style={{ color: 'var(--grail-text)', fontWeight: '600', fontSize: '1.1rem' }}>
                                                    ${(Number(collectionValue.median) || 0).toFixed(2)}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="grail-section-subtitle" style={{ display: 'block', marginBottom: '0.25rem' }}>Maximum</span>
                                                <span style={{ color: 'var(--grail-text)', fontWeight: '600', fontSize: '1.1rem' }}>
                                                    ${(Number(collectionValue.maximum) || 0).toFixed(2)}
                                                </span>
                                            </div>
                                            </div>
                                        )}
                                        {valueError && (
                                        <div className='grail-alert grail-alert--danger' style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                                                {valueError}
                                            </div>
                                        )}
                                    </div>
                                    <button 
                                    className='grail-btn grail-btn--primary grail-btn--sm' 
                                        onClick={loadCollectionValue} 
                                        disabled={loadingValue}
                                    >
                                        {loadingValue ? (
                                            <>
                                            <span className="spinner-border spinner-border-sm" style={{ marginRight: '0.5rem' }} role="status" aria-hidden="true"></span>
                                                Loading...
                                            </>
                                        ) : (
                                            <>
                                            <i className="fas fa-sync" style={{ marginRight: '0.5rem' }}></i>
                                                {collectionValue ? 'Refresh Value' : 'Load Value'}
                                            </>
                                        )}
                                    </button>
                            </div>
                        </div>

                        {/* Collection Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: 'var(--grail-spacing-lg)', flexWrap: 'wrap' }}>
                            {hasOAuth && folders.length > 0 && (
                            <select 
                                    className='form-select' 
                                value={selectedFolder} 
                                    onChange={(e) => setSelectedFolder(parseInt(e.target.value))}
                                    style={{
                                        background: 'var(--grail-surface-alt)',
                                        border: '1px solid var(--grail-glass-border)',
                                        color: 'var(--grail-text)',
                                        borderRadius: 'var(--grail-radius-md)',
                                        padding: '0.5rem 1rem',
                                        minWidth: '200px'
                                    }}
                                >
                                {folders.map(folder => (
                                    <option key={folder.id} value={folder.id}>
                                        {folder.name} ({folder.count} items)
                                    </option>
                                ))}
                            </select>
                            )}
                            {hasOAuth && (
                                <>
                                    <button className='grail-btn grail-btn--primary grail-btn--sm' onClick={handleSyncClick} disabled={syncing}>
                                        {syncing ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm" style={{ marginRight: '0.5rem' }} role="status" aria-hidden="true"></span>
                                                Syncing...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-sync" style={{ marginRight: '0.5rem' }}></i>
                                                Sync with Discogs
                                            </>
                                        )}
                            </button>
                                    <span className="grail-section-subtitle" style={{ fontSize: '0.75rem' }}>
                                        Discogs API has rate limits. Large collections may take time to sync.
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Collection Table */}
                        <div style={{ position: 'relative', width: '100%' }}>
                            <div style={{ overflowX: 'auto', marginRight: '110px' }}>
                                <table className="grail-table" style={{ width: '100%', minWidth: '100%' }}>
                                    <thead>
                                        <tr>
                                            <th scope="col" style={{ minWidth: '80px', width: '80px' }}>Discogs #</th>
                                            <th scope="col" style={{ minWidth: '70px', width: '70px' }}>Instance #</th>
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
                                        {collection.length === 0 ? (
                                            <tr>
                                                <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--grail-muted)' }}>
                                                    No items in collection. Sync with Discogs to load your records.
                                                </td>
                                            </tr>
                                        ) : collection.map((item) => (
                                            <tr key={`${item.discogs_id}-${item.instance_id}`}>
                                                <th scope="row" style={{ fontWeight: '600' }}>
                                                    <Link 
                                                        to={`/release/${item.discogs_id}`}
                                                        style={{ color: 'var(--grail-primary)', textDecoration: 'none' }}
                                                    >
                                                        {safeToString(item.discogs_id)}
                                                    </Link>
                                                </th>
                                                <td style={{ color: 'var(--grail-text-subtle)', fontSize: '0.85rem' }}>{safeToString(item.instance_id)}</td>
                                                <td>
                                                    {item.thumb ? (
                                                        <Link to={`/release/${item.discogs_id}`}>
                                                            <img 
                                                                src={item.thumb} 
                                                                alt={safeToString(item.title)} 
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
                                                    ) : (
                                                        <Link to={`/release/${item.discogs_id}`} style={{ color: 'var(--grail-muted)', textDecoration: 'none', fontSize: '0.85rem' }}>
                                                            No image
                                                        </Link>
                                                    )}
                                                </td>
                                                <td>
                                                    <Link 
                                                        to={`/release/${item.discogs_id}`}
                                                        style={{ color: 'var(--grail-text)', textDecoration: 'none' }}
                                                    >
                                                        {safeToString(item.title)}
                                                    </Link>
                                                </td>
                                                <td style={{ color: 'var(--grail-text-subtle)' }}>{safeToString(item.artist)}</td>
                                                <td style={{ color: 'var(--grail-text-subtle)', fontSize: '0.85rem' }}>{safeToString(item.genre)}</td>
                                                <td style={{ color: 'var(--grail-text-subtle)', fontSize: '0.85rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{safeToString(item.notes) || '—'}</td>
                                                <td style={{ color: 'var(--grail-highlight)', fontWeight: '600' }}>{safeToString(item.rating) || '—'}</td>
                                                <td style={{ color: 'var(--grail-text-subtle)' }}>{safeToString(item.price_threshold) ? `$${safeToString(item.price_threshold)}` : '—'}</td>
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
                                {collection.length === 0 ? (
                                    <tr>
                                        <td style={{ height: '53px' }}></td>
                                    </tr>
                                ) : collection.map((item, index) => (
                                    <tr key={`${item.discogs_id}-${item.instance_id}`}>
                                        <td style={{ padding: '0.85rem 0.5rem' }}>
                                            <ActionDropdown 
                                                discogsId={item.discogs_id}
                                                instanceId={item.instance_id}
                                                onEdit={() => handleEditClick(item.discogs_id, item.instance_id)}
                                                onDelete={() => handleDeleteClick(item.discogs_id, item.instance_id)}
                                                onMoveFolder={hasOAuth ? () => handleMoveFolder(item.discogs_id, item.instance_id, item.folder_id || selectedFolder) : undefined}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                        </div>
                    </div>
                )}

                {activeTab === 'folders' && (
                    <div>
                        {hasOAuth === false ? (
                            <div className="grail-card">
                                <div className="grail-card-body" style={{ textAlign: 'center', padding: 'var(--grail-spacing-xl)' }}>
                                    <i className="fas fa-folder-open" style={{ fontSize: '3rem', color: 'var(--grail-muted)', marginBottom: 'var(--grail-spacing-md)' }}></i>
                                    <h3 className="grail-section-title" style={{ marginBottom: 'var(--grail-spacing-sm)' }}>
                                        Folders Not Available
                                    </h3>
                                    <p className="grail-section-subtitle" style={{ marginBottom: 'var(--grail-spacing-md)' }}>
                                        Folder organization requires authentication with your Discogs account.
                                    </p>
                                    <p className="grail-section-subtitle" style={{ color: 'var(--grail-muted)', fontSize: '0.875rem' }}>
                                        Please connect your Discogs account in your profile settings to use folder functionality.
                                    </p>
                                </div>
                            </div>
                        ) : hasOAuth === true ? (
                        <FolderManager 
                            username={authState.username}
                            onFolderChange={loadFolders}
                        />
                        ) : (
                            <div style={{ textAlign: 'center', padding: 'var(--grail-spacing-xl)' }}>
                                <div className="spinner-border" role="status" style={{ color: 'var(--grail-primary)' }}>
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Move Folder Modal */}
                {moveFolderModal && (
                    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999 }}>
                        <div className="modal-dialog">
                            <div className="grail-card" style={{ margin: 0 }}>
                                <div className="grail-card-header" style={{ borderBottom: '1px solid var(--grail-glass-border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h5 className="grail-section-title" style={{ marginBottom: 0 }}>
                                            <i className="fas fa-folder" style={{ marginRight: '0.5rem' }}></i>
                                            Move Release to Folder
                                        </h5>
                                        <button 
                                            type="button" 
                                            className="grail-btn grail-btn--ghost grail-btn--sm"
                                            onClick={() => setMoveFolderModal(null)}
                                            disabled={movingRelease}
                                            style={{ padding: '0.25rem 0.5rem' }}
                                        >
                                            <i className="fas fa-times"></i>
                                        </button>
                                    </div>
                                </div>
                                <div className="grail-card-body">
                                    <p className="grail-section-subtitle" style={{ marginBottom: 'var(--grail-spacing-md)' }}>
                                        Select the folder to move this release to:
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                                        {folders
                                            .filter(folder => folder.id !== moveFolderModal.currentFolderId)
                                            .map((folder) => (
                                                <button
                                                    key={folder.id}
                                                    className="grail-btn grail-btn--ghost"
                                                    onClick={() => handleMoveFolderConfirm(folder.id)}
                                                    disabled={movingRelease}
                                                    style={{
                                                        width: '100%',
                                                        justifyContent: 'flex-start',
                                                        padding: '0.75rem 1rem',
                                                        textAlign: 'left'
                                                    }}
                                                >
                                                    <i className="fas fa-folder" style={{ marginRight: '0.5rem', color: 'var(--grail-primary)' }}></i>
                                                    {folder.name}
                                                    {folder.count !== undefined && (
                                                        <span style={{ marginLeft: 'auto', color: 'var(--grail-muted)', fontSize: '0.875rem' }}>
                                                            ({folder.count} items)
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                    </div>
                                    {folders.filter(folder => folder.id !== moveFolderModal.currentFolderId).length === 0 && (
                                        <p className="grail-section-subtitle" style={{ textAlign: 'center', color: 'var(--grail-muted)', marginTop: 'var(--grail-spacing-md)' }}>
                                            No other folders available
                                        </p>
                                    )}
                                </div>
                                <div className="grail-card-footer" style={{ borderTop: '1px solid var(--grail-glass-border)' }}>
                                    <button 
                                        type="button" 
                                        className="grail-btn grail-btn--ghost" 
                                        onClick={() => setMoveFolderModal(null)}
                                        disabled={movingRelease}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CollectionScreen;
