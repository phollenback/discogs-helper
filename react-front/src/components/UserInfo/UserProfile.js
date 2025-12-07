import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthContext } from '../../AuthContext';
import { useApi } from '../../utility/backSource';
import { useDiscogs } from '../../utility/dataSource';
import VinylSpinner from '../All/VinylSpinner';
import '../../styles/theme.css';

const UserProfile = () => {
    const { username: paramUsername } = useParams();
    const [profile, setProfile] = useState(null);
    const [topReleases, setTopReleases] = useState([]);
    const [collection, setCollection] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCollectionModal, setShowCollectionModal] = useState(false);
    const [followStatus, setFollowStatus] = useState(null);
    const [followLoading, setFollowLoading] = useState(false);
    const [friends, setFriends] = useState([]);
    const [friendsLoading, setFriendsLoading] = useState(false);
    const [followers, setFollowers] = useState([]);
    const [following, setFollowing] = useState([]);
    const [followersFollowingLoading, setFollowersFollowingLoading] = useState(false);
    const [viewMode, setViewMode] = useState('followers'); // 'followers' or 'following'
    const { authState } = useAuthContext();
    const { getData, updateData, postData, deleteData } = useApi();
    const { getData: getDiscogsData } = useDiscogs();
    const [hasDiscogsToken, setHasDiscogsToken] = useState(null);
    const [connectingDiscogs, setConnectingDiscogs] = useState(false);
    const [syncMessage, setSyncMessage] = useState(null);
    const [publicCollection, setPublicCollection] = useState([]);
    const [publicWantlist, setPublicWantlist] = useState([]);
    const [loadingCollection, setLoadingCollection] = useState(false);
    const [showCollectionDropdown, setShowCollectionDropdown] = useState(false);
    const [showWantlistDropdown, setShowWantlistDropdown] = useState(false);
    const [hasLoadedCollection, setHasLoadedCollection] = useState(false);
    const [followedArtists, setFollowedArtists] = useState([]);
    const [followedLabels, setFollowedLabels] = useState([]);
    const [loadingFollowed, setLoadingFollowed] = useState(false);
    const [publicResources, setPublicResources] = useState(true);
    const [updatingSetting, setUpdatingSetting] = useState(false);

    // Determine which username to display (route param or authenticated user)
    const displayUsername = paramUsername || authState.username;
    const isOwnProfile = !paramUsername || paramUsername === authState.username;

    useEffect(() => {
        if (displayUsername) {
            loadProfile();
            loadTopReleases();
            loadFollowStatus();
            loadFriends();
            loadFollowersAndFollowing();
            if (isOwnProfile) {
                loadCollection();
                checkDiscogsConnection();
                loadFollowedEntities();
                loadPublicResourcesSetting();
            }
            // Note: Public collection/wantlist is loaded on-demand when dropdown is expanded
        }
        // eslint-disable-next-line
    }, [displayUsername]);

    // Reload followed entities when user navigates to their profile or when auth state changes
    useEffect(() => {
        if (isOwnProfile && authState.username && authState.userId) {
            // Small delay to ensure auth is fully loaded
            const timer = setTimeout(() => {
                loadFollowedEntities();
            }, 500);
            
            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOwnProfile, authState.username, authState.userId]);

    const loadProfile = async () => {
        try {
            setLoading(true);
            setError(null);
            
            if (!displayUsername) {
                setError('Username not available');
                setLoading(false);
                return;
            }

            console.log(`[UserProfile] Fetching profile for: ${displayUsername}`, {
                isOwnProfile,
                authUsername: authState.username,
                authUserId: authState.userId,
                isAuthenticated: authState.token ? 'yes' : 'no'
            });
            const profileData = await getData(`/api/users/profile/${displayUsername}`);
            console.log('[UserProfile] Profile data received:', profileData);
            
            setProfile(profileData);
        } catch (err) {
            console.error('[UserProfile] Error loading profile:', err);
            setError(`Failed to load profile for ${displayUsername}. ${err.response?.status === 404 ? 'User not found.' : 'Please try again.'}`);
        } finally {
            setLoading(false);
        }
    };

    const loadCollection = async () => {
        try {
            if (!displayUsername) {
                console.warn('[UserProfile] No username available for collection load');
                return;
            }
            
            console.log(`[UserProfile] Fetching collection from Discogs for: ${displayUsername}`);
            const data = await getDiscogsData(`/users/${displayUsername}/collection/folders/0/releases`);
            console.log('[UserProfile] Collection data received:', data);
            
            if (data && data.releases) {
                setCollection(data.releases);
            } else {
                console.warn('[UserProfile] No releases in collection data');
                setCollection([]);
            }
        } catch (err) {
            console.error('[UserProfile] Error loading collection:', err);
            console.warn('[UserProfile] Setting collection to empty array');
            setCollection([]);
        }
    };

    // Load public collection/wantlist for other users from Discogs API
    const loadPublicCollection = async () => {
        if (!displayUsername || isOwnProfile) return; // Only load for other users
        
        try {
            setLoadingCollection(true);
            console.log(`[UserProfile] Loading public collection/wantlist from Discogs for: ${displayUsername}`);
            
            // Fetch from Discogs API (live data)
            const [collectionData, wantlistData] = await Promise.all([
                getDiscogsData(`/users/${displayUsername}/collection/folders/0/releases`).catch((err) => {
                    console.warn('[UserProfile] Failed to load collection from Discogs:', err);
                    return { releases: [] };
                }),
                getDiscogsData(`/users/${displayUsername}/wants`).catch((err) => {
                    console.warn('[UserProfile] Failed to load wantlist from Discogs:', err);
                    return { wants: [] };
                })
            ]);
            
            // Extract releases from collection data
            const collectionReleases = collectionData?.releases || [];
            setPublicCollection(collectionReleases);
            
            // Extract wants from wantlist data
            const wantlistItems = wantlistData?.wants || [];
            setPublicWantlist(wantlistItems);
            
            setHasLoadedCollection(true);
            console.log(`[UserProfile] Loaded ${collectionReleases.length} collection items and ${wantlistItems.length} wantlist items from Discogs`);
        } catch (err) {
            console.error('[UserProfile] Error loading public collection from Discogs:', err);
            setPublicCollection([]);
            setPublicWantlist([]);
            setHasLoadedCollection(true);
        } finally {
            setLoadingCollection(false);
        }
    };

    const loadTopReleases = async () => {
        try {
            if (!displayUsername) return;
            
            console.log(`[UserProfile] Fetching top releases for: ${displayUsername}`);
            const data = await getData(`/api/users/${displayUsername}/top-releases`);
            console.log('[UserProfile] Top releases data received:', data);
            
            setTopReleases(data.topReleases || []);
        } catch (err) {
            console.error('[UserProfile] Error loading top releases:', err);
            // Don't set error state, just use empty array
            setTopReleases([]);
        }
    };

    const loadFollowStatus = async () => {
        try {
            if (!displayUsername) return;
            
            console.log(`[UserProfile] Fetching follow status for: ${displayUsername}`);
            const data = await getData(`/api/users/${displayUsername}/follow-status`);
            console.log('[UserProfile] Follow status data received:', data);
            
            setFollowStatus(data);
        } catch (err) {
            console.error('[UserProfile] Error loading follow status:', err);
            setFollowStatus({ follower_count: 0, following_count: 0 });
        }
    };

    const loadFriends = async () => {
        try {
            if (!displayUsername) return;
            
            setFriendsLoading(true);
            console.log(`[UserProfile] Fetching friends for: ${displayUsername}`);
            const data = await getData(`/api/users/${displayUsername}/mutual`);
            console.log('[UserProfile] Friends data received:', data);
            
            setFriends(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('[UserProfile] Error loading friends:', err);
            setFriends([]);
        } finally {
            setFriendsLoading(false);
        }
    };

    const loadFollowersAndFollowing = async () => {
        try {
            if (!displayUsername) return;
            
            setFollowersFollowingLoading(true);
            
            // Load both followers and following in parallel
            const [followersData, followingData] = await Promise.all([
                getData(`/api/users/${displayUsername}/followers`).catch(() => []),
                getData(`/api/users/${displayUsername}/following`).catch(() => [])
            ]);
            
            console.log('[UserProfile] Followers data received:', followersData);
            console.log('[UserProfile] Following data received:', followingData);
            
            setFollowers(Array.isArray(followersData) ? followersData : []);
            setFollowing(Array.isArray(followingData) ? followingData : []);
        } catch (err) {
            console.error('[UserProfile] Error loading followers/following:', err);
            setFollowers([]);
            setFollowing([]);
        } finally {
            setFollowersFollowingLoading(false);
        }
    };

    const handleFollow = async () => {
        try {
            setFollowLoading(true);
            console.log(`[UserProfile] Following user: ${displayUsername}`);
            
            await postData(`/api/users/${displayUsername}/follow`, {});
            
            // Reload follow status, friends list, and followers/following
            await loadFollowStatus();
            await loadFriends();
            await loadFollowersAndFollowing();
            console.log('[UserProfile] Successfully followed user');
        } catch (err) {
            console.error('[UserProfile] Error following user:', err);
            alert('Failed to follow user. Please try again.');
        } finally {
            setFollowLoading(false);
        }
    };

    const handleUnfollow = async () => {
        try {
            setFollowLoading(true);
            console.log(`[UserProfile] Unfollowing user: ${displayUsername}`);
            
            await deleteData(`/api/users/${displayUsername}/unfollow`);
            
            // Reload follow status, friends list, and followers/following
            await loadFollowStatus();
            await loadFriends();
            await loadFollowersAndFollowing();
            console.log('[UserProfile] Successfully unfollowed user');
        } catch (err) {
            console.error('[UserProfile] Error unfollowing user:', err);
            alert('Failed to unfollow user. Please try again.');
        } finally {
            setFollowLoading(false);
        }
    };

    const saveTopReleases = async (newTopReleases) => {
        try {
            if (!isOwnProfile) {
                alert('You can only edit your own profile');
                return;
            }
            
            console.log(`[UserProfile] Saving top releases for: ${displayUsername}`, newTopReleases);
            
            await updateData(`/api/users/${displayUsername}/top-releases`, {
                topReleases: newTopReleases
            });
            
            setTopReleases(newTopReleases);
            alert('Top releases updated successfully!');
        } catch (err) {
            console.error('[UserProfile] Error saving top releases:', err);
            alert('Failed to save top releases. Please try again.');
        }
    };

    const handleRemoveFromTop = (index) => {
        const newTopReleases = [...topReleases];
        newTopReleases.splice(index, 1);
        saveTopReleases(newTopReleases);
    };

    const handleAddToTop = () => {
        if (topReleases.length >= 3) {
            alert('You can only have 3 top releases. Remove one first.');
            return;
        }
        
        setShowCollectionModal(true);
    };

    const handleSelectFromCollection = (release) => {
        if (topReleases.length >= 3) {
            alert('You can only have 3 top releases. Remove one first.');
            return;
        }
        
        // Check if already in top releases
        if (topReleases.some(r => r.id === release.id)) {
            alert('This release is already in your top 3!');
            return;
        }
        
        // Store the complete release data from Discogs API
        const newRelease = {
            id: release.id,
            instance_id: release.instance_id,
            date_added: release.date_added,
            rating: release.rating,
            basic_information: release.basic_information,
            folder_id: release.folder_id,
            notes: release.notes,
            // Also add simplified fields for backend compatibility
            discogsId: release.basic_information.id,
            title: release.basic_information.title,
            artist: release.basic_information.artists.map(a => a.name).join(', '),
            coverImage: release.basic_information.cover_image
        };
        
        const newTopReleases = [...topReleases, newRelease];
        saveTopReleases(newTopReleases);
        setShowCollectionModal(false);
    };

    const handleMoveUp = (index) => {
        if (index === 0) return; // Already at top
        
        const newTopReleases = [...topReleases];
        const temp = newTopReleases[index];
        newTopReleases[index] = newTopReleases[index - 1];
        newTopReleases[index - 1] = temp;
        
        saveTopReleases(newTopReleases);
    };

    const handleMoveDown = (index) => {
        if (index === topReleases.length - 1) return; // Already at bottom
        
        const newTopReleases = [...topReleases];
        const temp = newTopReleases[index];
        newTopReleases[index] = newTopReleases[index + 1];
        newTopReleases[index + 1] = temp;
        
        saveTopReleases(newTopReleases);
    };

    const loadPublicResourcesSetting = async () => {
        if (!isOwnProfile || !authState.userId || !displayUsername) return;
        
        try {
            // Try getting from profile endpoint first (includes public_resources)
            const profileData = await getData(`/api/users/profile/${displayUsername}`);
            if (profileData && profileData.public_resources !== undefined) {
                setPublicResources(profileData.public_resources !== false);
                return;
            }
            
            // Fallback: get from users list and find current user
            const usersData = await getData('/api/users');
            if (usersData && Array.isArray(usersData)) {
                const currentUser = usersData.find(u => u.user_id === authState.userId || u.username === displayUsername);
                if (currentUser) {
                    setPublicResources(currentUser.public_resources !== false);
                    return;
                }
            }
            
            // Default to true if not found
            setPublicResources(true);
        } catch (err) {
            console.error('[UserProfile] Error loading public resources setting:', err);
            // Default to true if error
            setPublicResources(true);
        }
    };

    const handleTogglePublicResources = async (newValue) => {
        if (!authState.userId) return;
        
        try {
            setUpdatingSetting(true);
            await updateData(`/api/users/${authState.userId}/public-resources`, {
                public_resources: newValue
            });
            setPublicResources(newValue);
            console.log(`[UserProfile] Successfully updated public resources setting to ${newValue}`);
        } catch (err) {
            console.error('[UserProfile] Error updating public resources setting:', err);
            alert('Failed to update setting. Please try again.');
        } finally {
            setUpdatingSetting(false);
        }
    };

    const checkDiscogsConnection = async () => {
        try {
            if (!authState.userId) return;
            
            setConnectingDiscogs(true);
            setSyncMessage(null);
            console.log(`[UserProfile] Checking Discogs OAuth status for userId: ${authState.userId}`);
            const statusData = await getData(`/api/users/${authState.userId}/discogs/oauth/status`);
            console.log('[UserProfile] OAuth status received:', statusData);
            setHasDiscogsToken(statusData.connected || false);
            setSyncMessage(statusData.connected ? 'Connection verified!' : 'Connection failed');
            setTimeout(() => setSyncMessage(null), 2000);
        } catch (err) {
            console.error('[UserProfile] Error checking Discogs connection:', err);
            setHasDiscogsToken(false);
            setSyncMessage('Error checking connection');
            setTimeout(() => setSyncMessage(null), 2000);
        } finally {
            setConnectingDiscogs(false);
        }
    };

    const loadFollowedEntities = async () => {
        if (!isOwnProfile || !authState.username) {
            console.log('[UserProfile] Skipping loadFollowedEntities - not own profile or no username', { isOwnProfile, username: authState.username });
            return;
        }
        
        try {
            setLoadingFollowed(true);
            console.log('[UserProfile] Loading followed entities for user:', authState.username);
            
            const [artists, labels] = await Promise.all([
                getData('/api/users/me/following/artists').catch((err) => {
                    console.error('[UserProfile] Error loading artists:', err);
                    return [];
                }),
                getData('/api/users/me/following/labels').catch((err) => {
                    console.error('[UserProfile] Error loading labels:', err);
                    return [];
                })
            ]);
            
            console.log('[UserProfile] Followed entities loaded:', { 
                artists: artists?.length || 0, 
                labels: labels?.length || 0,
                artistsData: artists,
                labelsData: labels
            });
            
            setFollowedArtists(Array.isArray(artists) ? artists : []);
            setFollowedLabels(Array.isArray(labels) ? labels : []);
        } catch (err) {
            console.error('[UserProfile] Error loading followed entities:', err);
            setFollowedArtists([]);
            setFollowedLabels([]);
        } finally {
            setLoadingFollowed(false);
        }
    };

    const handleConnectDiscogs = async () => {
        if (!authState.userId) {
            alert('Please log in to connect your Discogs account');
            return;
        }

        try {
            setConnectingDiscogs(true);
            const response = await postData(`/api/users/${authState.userId}/discogs/oauth/request`, {});
            
            // Redirect to Discogs authorization page
            // Backend will handle the callback and redirect back to frontend
            window.location.href = response.authUrl;
        } catch (err) {
            console.error('[UserProfile] Error connecting Discogs:', err);
            alert('Failed to connect with Discogs. Please try again.');
            setConnectingDiscogs(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    };

    if (loading) {
        return (
            <div className="container py-5">
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                    <VinylSpinner label="Loading profile..." />
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
                        onClick={loadProfile} 
                        className="grail-btn grail-btn--primary grail-btn--sm ms-3"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="container py-5">
                <div className="grail-alert grail-alert--warning">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    No profile data available
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
                    <i className="fas fa-user-circle me-2" style={{ color: 'var(--grail-accent)' }}></i>
                        {isOwnProfile ? 'My Profile' : `${displayUsername}'s Profile`}
                    </h1>
                    {!isOwnProfile && (
                    <div className="grail-alert" style={{ marginTop: '1rem', position: 'relative', zIndex: 1 }}>
                            <i className="fas fa-info-circle me-2"></i>
                            Viewing {displayUsername}'s public profile
                        </div>
                    )}
                    {!isOwnProfile && profile.discogs_connected !== undefined && (
                    <div className={`grail-alert ${profile.discogs_connected ? 'grail-alert--success' : 'grail-alert--warning'}`} style={{ marginTop: '1rem', position: 'relative', zIndex: 1 }}>
                            <i className={`fas ${profile.discogs_connected ? 'fa-check-circle' : 'fa-exclamation-triangle'} me-2`}></i>
                            {profile.discogs_connected 
                                ? `${displayUsername} has their Discogs account connected. They can sync their wantlist and collection.`
                                : `${displayUsername} has not connected their Discogs account. Collection and wantlist sync is not available.`
                            }
                        </div>
                    )}
            </div>

            <div className="row g-4">
                {/* Avatar and Basic Info */}
                <div className="col-md-4">
                    <div className="grail-card">
                        <div style={{ textAlign: 'center' }}>
                            {profile.avatar_url && (
                                <img 
                                    src={profile.avatar_url} 
                                    alt={profile.username}
                                    className="rounded-circle mb-3"
                                    style={{ 
                                        width: '150px', 
                                        height: '150px',
                                        border: '3px solid var(--grail-accent)',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                                    }}
                                />
                            )}
                            <h3 className="grail-section-title mb-2" style={{ fontSize: '1.5rem' }}>{profile.username}</h3>
                            {profile.name && <p style={{ color: 'var(--grail-text-subtle)', marginBottom: '1rem' }}>{profile.name}</p>}
                            {profile.location && (
                                <p style={{ color: 'var(--grail-text-subtle)', marginBottom: '0.5rem' }}>
                                    <i className="fas fa-map-marker-alt me-2" style={{ color: 'var(--grail-accent)' }}></i>
                                    {profile.location}
                                </p>
                            )}
                            {profile.email && (
                                <p style={{ color: 'var(--grail-text-subtle)', marginBottom: '0.5rem' }}>
                                    <i className="fas fa-envelope me-2" style={{ color: 'var(--grail-accent)' }}></i>
                                    {profile.email}
                                </p>
                            )}
                            <p style={{ color: 'var(--grail-text-subtle)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                Member since: {formatDate(profile.registered)}
                            </p>
                            
                            {/* Connect Discogs Button - only show on own profile if not connected */}
                            {isOwnProfile && hasDiscogsToken === false && (
                                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--grail-glass-border)' }}>
                                    <p style={{ color: 'var(--grail-text-subtle)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                                        Connect your Discogs account to sync your collection and wantlist
                                    </p>
                                    <button 
                                        className="grail-btn grail-btn--primary grail-btn--sm"
                                        onClick={handleConnectDiscogs}
                                        disabled={connectingDiscogs}
                                        style={{ width: '100%' }}
                                    >
                                        {connectingDiscogs ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                Connecting...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-link me-1"></i>
                                                Connect Discogs Account
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                            
                            {/* Discogs Connected Status */}
                            {isOwnProfile && hasDiscogsToken === true && (
                                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--grail-glass-border)' }}>
                                    <div className="grail-alert grail-alert--success" style={{ marginBottom: 0, padding: '0.75rem' }}>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span>
                                                <i className="fas fa-check-circle me-2"></i>
                                                Discogs account connected
                                                {syncMessage && (
                                                    <span style={{ color: 'var(--grail-text-subtle)', fontSize: '0.85rem', fontStyle: 'italic', marginLeft: '0.5rem' }}>
                                                        {syncMessage}
                                                    </span>
                                                )}
                                            </span>
                                            <button
                                                className="grail-btn grail-btn--ghost grail-btn--sm"
                                                onClick={checkDiscogsConnection}
                                                disabled={connectingDiscogs}
                                                title="Refresh connection status"
                                                style={{ padding: '0.25rem 0.5rem', minWidth: 'auto' }}
                                            >
                                                {connectingDiscogs ? (
                                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                ) : (
                                                    <i className="fas fa-sync-alt"></i>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Privacy Settings - only show on own profile */}
                            {isOwnProfile && (
                                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--grail-glass-border)' }}>
                                    <h6 className="grail-section-title mb-3" style={{ fontSize: '1rem' }}>
                                        <i className="fas fa-lock me-2" style={{ color: 'var(--grail-accent)' }}></i>
                                        Privacy Settings
                                    </h6>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div style={{ flex: 1 }}>
                                            <label className="grail-section-subtitle mb-1" style={{ display: 'block', fontWeight: '600' }}>
                                                Public Resources
                                            </label>
                                            <p className="grail-text-subtle small mb-0" style={{ fontSize: '0.85rem' }}>
                                                Allow all users to view your collection and wantlist
                                            </p>
                                        </div>
                                        <div className="form-check form-switch ms-3">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                checked={publicResources}
                                                onChange={(e) => handleTogglePublicResources(e.target.checked)}
                                                disabled={updatingSetting}
                                                style={{
                                                    width: '3rem',
                                                    height: '1.5rem',
                                                    cursor: updatingSetting ? 'not-allowed' : 'pointer',
                                                    backgroundColor: publicResources ? 'var(--grail-success)' : 'var(--grail-surface)',
                                                    borderColor: 'var(--grail-glass-border)'
                                                }}
                                            />
                                        </div>
                                    </div>
                                    {updatingSetting && (
                                        <div className="mt-2">
                                            <small className="grail-text-subtle">
                                                <i className="fas fa-spinner fa-spin me-1"></i>
                                                Updating...
                                            </small>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Privacy Settings - only show on own profile */}
                            {isOwnProfile && (
                                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--grail-glass-border)' }}>
                                    <h6 className="grail-section-title mb-3" style={{ fontSize: '1rem' }}>
                                        <i className="fas fa-lock me-2" style={{ color: 'var(--grail-accent)' }}></i>
                                        Privacy Settings
                                    </h6>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div style={{ flex: 1 }}>
                                            <label className="grail-section-subtitle mb-1" style={{ display: 'block', fontWeight: '600' }}>
                                                Public Resources
                                            </label>
                                            <p className="grail-text-subtle small mb-0" style={{ fontSize: '0.85rem' }}>
                                                Allow all users to view your collection and wantlist
                                            </p>
                                        </div>
                                        <div className="form-check form-switch ms-3">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                checked={publicResources}
                                                onChange={(e) => handleTogglePublicResources(e.target.checked)}
                                                disabled={updatingSetting}
                                                style={{
                                                    width: '3rem',
                                                    height: '1.5rem',
                                                    cursor: updatingSetting ? 'not-allowed' : 'pointer',
                                                    backgroundColor: publicResources ? 'var(--grail-success)' : 'var(--grail-surface)',
                                                    borderColor: 'var(--grail-glass-border)'
                                                }}
                                            />
                                        </div>
                                    </div>
                                    {updatingSetting && (
                                        <div className="mt-2">
                                            <small className="grail-text-subtle">
                                                <i className="fas fa-spinner fa-spin me-1"></i>
                                                Updating...
                                            </small>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {profile.home_page && (
                                <a 
                                    href={profile.home_page} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="grail-btn grail-btn--ghost grail-btn--sm"
                                    style={{ width: '100%', marginTop: '1rem' }}
                                >
                                    <i className="fas fa-external-link-alt me-1"></i>
                                    Visit Homepage
                                </a>
                            )}

                            {/* Follow Button for other users' profiles */}
                            {!isOwnProfile && followStatus && authState.isAuthenticated && (
                                <div style={{ marginTop: '1.5rem' }}>
                                    {followStatus.relationship?.is_following ? (
                                        <button 
                                            className="grail-btn grail-btn--ghost grail-btn--sm"
                                            onClick={handleUnfollow}
                                            disabled={followLoading}
                                            style={{ width: '100%' }}
                                        >
                                            {followLoading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                    Unfollowing...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-user-check me-1"></i>
                                                    Following
                                                    {followStatus.relationship?.is_mutual && (
                                                        <i className="fas fa-exchange-alt ms-1" title="Mutual"></i>
                                                    )}
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <button 
                                            className="grail-btn grail-btn--primary grail-btn--sm"
                                            onClick={handleFollow}
                                            disabled={followLoading}
                                            style={{ width: '100%' }}
                                        >
                                            {followLoading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                    Following...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-user-plus me-1"></i>
                                                    Follow
                                                    {followStatus.relationship?.follows_you && (
                                                        <span style={{ fontSize: '0.875rem', marginLeft: '0.25rem' }}>(Follows you)</span>
                                                    )}
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Social Stats */}
                            {followStatus && (
                                <div className="d-flex justify-content-around" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--grail-glass-border)' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <h5 style={{ color: 'var(--grail-accent)', marginBottom: '0.25rem' }}>{followStatus.follower_count || 0}</h5>
                                        <small style={{ color: 'var(--grail-text-subtle)' }}>Followers</small>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <h5 style={{ color: 'var(--grail-accent)', marginBottom: '0.25rem' }}>{followStatus.following_count || 0}</h5>
                                        <small style={{ color: 'var(--grail-text-subtle)' }}>Following</small>
                                    </div>
                                </div>
                            )}

                            {/* Friends Section */}
                            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--grail-glass-border)' }}>
                                <h6 className="grail-section-title mb-2" style={{ fontSize: '1rem' }}>
                                    <i className="fas fa-user-friends me-2" style={{ color: 'var(--grail-accent)' }}></i>
                                    Friends
                                    {!friendsLoading && friends.length > 0 && (
                                        <span className="grail-pill-badge ms-2">{friends.length}</span>
                                    )}
                                </h6>
                                {friendsLoading ? (
                                    <div style={{ textAlign: 'center', padding: '1rem' }}>
                                        <VinylSpinner size={40} label={null} />
                                    </div>
                                ) : friends.length === 0 ? (
                                    <p style={{ color: 'var(--grail-text-subtle)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                                        {isOwnProfile ? 'No friends yet' : 'No friends to show'}
                                    </p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {friends.map((friend) => (
                                            <Link
                                                key={friend.user_id}
                                                to={`/profile/${friend.username}`}
                                                className="grail-btn grail-btn--ghost grail-btn--sm"
                                                style={{ 
                                                    textDecoration: 'none',
                                                    justifyContent: 'flex-start',
                                                    textAlign: 'left'
                                                }}
                                            >
                                                <i className="fas fa-user-circle me-2" style={{ color: 'var(--grail-success)' }}></i>
                                                <span>{friend.username}</span>
                                            </Link>
                                        ))}
                                    </div>
                                )}

                                {/* Followers/Following Toggle */}
                                <div style={{ marginTop: '1.5rem' }}>
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <small style={{ color: 'var(--grail-text-subtle)', fontWeight: '600' }}>View:</small>
                                        <select 
                                            className="form-select form-select-sm" 
                                            style={{ 
                                                width: 'auto',
                                                background: 'var(--grail-surface)',
                                                border: '1px solid var(--grail-glass-border)',
                                                color: 'var(--grail-text)'
                                            }}
                                            value={viewMode}
                                            onChange={(e) => setViewMode(e.target.value)}
                                        >
                                            <option value="followers">Followers ({followers.length})</option>
                                            <option value="following">Following ({following.length})</option>
                                        </select>
                                    </div>
                                    
                                    {followersFollowingLoading ? (
                                        <div style={{ textAlign: 'center', padding: '1rem' }}>
                                            <VinylSpinner size={40} label={null} />
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {viewMode === 'followers' ? (
                                                followers.length === 0 ? (
                                                    <p style={{ color: 'var(--grail-text-subtle)', fontSize: '0.875rem', marginBottom: 0 }}>No followers yet</p>
                                                ) : (
                                                    followers.map((follower) => (
                                                        <Link
                                                            key={follower.user_id}
                                                            to={`/profile/${follower.username}`}
                                                            className="grail-btn grail-btn--ghost grail-btn--sm"
                                                            style={{ 
                                                                textDecoration: 'none',
                                                                justifyContent: 'flex-start',
                                                                textAlign: 'left'
                                                            }}
                                                        >
                                                            <i className="fas fa-user-circle me-2" style={{ color: 'var(--grail-accent)' }}></i>
                                                            <span>{follower.username}</span>
                                                        </Link>
                                                    ))
                                                )
                                            ) : (
                                                following.length === 0 ? (
                                                    <p style={{ color: 'var(--grail-text-subtle)', fontSize: '0.875rem', marginBottom: 0 }}>Not following anyone yet</p>
                                                ) : (
                                                    following.map((followingUser) => (
                                                        <Link
                                                            key={followingUser.user_id}
                                                            to={`/profile/${followingUser.username}`}
                                                            className="grail-btn grail-btn--ghost grail-btn--sm"
                                                            style={{ 
                                                                textDecoration: 'none',
                                                                justifyContent: 'flex-start',
                                                                textAlign: 'left'
                                                            }}
                                                        >
                                                            <i className="fas fa-user-circle me-2" style={{ color: 'var(--grail-highlight)' }}></i>
                                                            <span>{followingUser.username}</span>
                                                        </Link>
                                                    ))
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {profile.profile && (
                        <div className="grail-card" style={{ marginTop: '1.5rem' }}>
                            <h5 className="grail-section-title mb-2" style={{ fontSize: '1.1rem' }}>About</h5>
                            <p style={{ color: 'var(--grail-text-subtle)' }}>{profile.profile}</p>
                        </div>
                    )}
                </div>

                {/* Stats and Details */}
                <div className="col-md-8">
                    {/* Collection Stats */}
                    <div className="grail-card mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-3" style={{ 
                            paddingBottom: '1rem',
                            borderBottom: '1px solid var(--grail-glass-border)'
                        }}>
                            <h2 className="grail-heading--h2 mb-0">
                                <i className="fas fa-compact-disc me-2" style={{ color: 'var(--grail-accent)' }}></i>
                                Collection & Wantlist
                            </h2>
                            {isOwnProfile && (
                                <div className="d-flex gap-2">
                                    <Link to="/collection" className="grail-btn grail-btn--primary grail-btn--sm">
                                        <i className="fas fa-compact-disc me-1"></i>
                                        Collection
                                    </Link>
                                    <Link to="/wantlist" className="grail-btn grail-btn--ghost grail-btn--sm">
                                        <i className="fas fa-heart me-1"></i>
                                        Wantlist
                                    </Link>
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="row g-3 text-center">
                                <div className="col-md-3">
                                    {isOwnProfile ? (
                                        <Link to="/collection" style={{ textDecoration: 'none' }}>
                                            <div className="grail-card" style={{ 
                                                height: '100%',
                                                border: '2px solid var(--grail-primary)',
                                                transition: 'all 0.2s ease',
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = 'var(--grail-accent)';
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = 'var(--grail-primary)';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                            }}>
                                                <h2 style={{ color: 'var(--grail-accent)', marginBottom: '0.5rem', fontSize: '2.5rem' }}>{profile.num_collection}</h2>
                                                <small style={{ color: 'var(--grail-text-subtle)', display: 'block', marginBottom: '0.75rem' }}>Items in Collection</small>
                                                <span className="grail-pill-badge" style={{ background: 'var(--grail-primary)' }}>
                                                        <i className="fas fa-eye me-1"></i>View Collection
                                                    </span>
                                            </div>
                                        </Link>
                                    ) : (
                                        <div className="grail-card" style={{ height: '100%' }}>
                                            <h2 style={{ color: 'var(--grail-accent)', marginBottom: '0.5rem', fontSize: '2.5rem' }}>
                                                {profile.discogs_connected !== false ? (profile.num_collection || 0) : 'N/A'}
                                            </h2>
                                            <small style={{ color: 'var(--grail-text-subtle)' }}>
                                                {profile.discogs_connected === false && 'Discogs not connected'}
                                                {profile.discogs_connected !== false && 'Items in Collection'}
                                            </small>
                                        </div>
                                    )}
                                </div>
                                <div className="col-md-3">
                                    {isOwnProfile ? (
                                        <Link to="/wantlist" style={{ textDecoration: 'none' }}>
                                            <div className="grail-card" style={{ 
                                                height: '100%',
                                                border: '2px solid var(--grail-highlight)',
                                                transition: 'all 0.2s ease',
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = 'var(--grail-accent)';
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = 'var(--grail-highlight)';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                            }}>
                                                <h2 style={{ color: 'var(--grail-highlight)', marginBottom: '0.5rem', fontSize: '2.5rem' }}>{profile.num_wantlist}</h2>
                                                <small style={{ color: 'var(--grail-text-subtle)', display: 'block', marginBottom: '0.75rem' }}>Items in Wantlist</small>
                                                <span className="grail-pill-badge" style={{ background: 'var(--grail-highlight)', color: '#1f2435' }}>
                                                        <i className="fas fa-heart me-1"></i>View Wantlist
                                                    </span>
                                            </div>
                                        </Link>
                                    ) : (
                                        <div className="grail-card" style={{ height: '100%' }}>
                                            <h2 style={{ color: 'var(--grail-highlight)', marginBottom: '0.5rem', fontSize: '2.5rem' }}>
                                                {profile.discogs_connected !== false ? (profile.num_wantlist || 0) : 'N/A'}
                                            </h2>
                                            <small style={{ color: 'var(--grail-text-subtle)' }}>
                                                {profile.discogs_connected === false && 'Discogs not connected'}
                                                {profile.discogs_connected !== false && 'Items in Wantlist'}
                                            </small>
                                        </div>
                                    )}
                                </div>
                                <div className="col-md-3">
                                    <div className="grail-card" style={{ height: '100%' }}>
                                        <h2 style={{ color: 'var(--grail-success)', marginBottom: '0.5rem', fontSize: '2.5rem' }}>{profile.releases_rated}</h2>
                                        <small style={{ color: 'var(--grail-text-subtle)' }}>Releases Rated</small>
                                </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="grail-card" style={{ height: '100%' }}>
                                        <h2 style={{ color: 'var(--grail-accent)', marginBottom: '0.5rem', fontSize: '2.5rem' }}>
                                        {profile.rating_avg ? profile.rating_avg.toFixed(2) : 'N/A'}
                                            <i className="fas fa-star ms-1" style={{ fontSize: '0.8em', color: 'var(--grail-highlight)' }}></i>
                                    </h2>
                                        <small style={{ color: 'var(--grail-text-subtle)' }}>Average Rating</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Public Collection & Wantlist Display - Collapsible Dropdowns */}
                    {!isOwnProfile && (
                        <div className="grail-card" style={{ marginTop: '1.5rem' }}>
                            <h2 className="grail-heading--h2 mb-3">
                                <i className="fas fa-compact-disc me-2" style={{ color: 'var(--grail-accent)' }}></i>
                                    {displayUsername}'s Collection & Wantlist
                                <small style={{ color: 'var(--grail-text-subtle)', fontSize: '0.875rem', marginLeft: '0.5rem' }}>(Live from Discogs)</small>
                            </h2>
                            <div>
                                {/* Collection Dropdown */}
                                <div style={{ marginBottom: '1rem' }}>
                                    <button
                                        className="grail-btn grail-btn--ghost"
                                        type="button"
                                        onClick={() => {
                                            setShowCollectionDropdown(!showCollectionDropdown);
                                            if (!showCollectionDropdown && !hasLoadedCollection && !loadingCollection) {
                                                loadPublicCollection();
                                            }
                                        }}
                                        disabled={loadingCollection}
                                        style={{ width: '100%', justifyContent: 'space-between' }}
                                    >
                                        <span>
                                            <i className="fas fa-compact-disc me-2"></i>
                                            Collection
                                            {publicCollection.length > 0 && (
                                                <span className="grail-pill-badge ms-2" style={{ background: 'var(--grail-primary)' }}>{publicCollection.length}</span>
                                            )}
                                        </span>
                                        <i className={`fas fa-chevron-${showCollectionDropdown ? 'up' : 'down'}`}></i>
                                    </button>
                                    
                                    {showCollectionDropdown && (
                                        <div className="grail-card mt-3" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                            {loadingCollection ? (
                                                <div style={{ textAlign: 'center', padding: '2rem' }}>
                                                    <VinylSpinner size={50} label="Loading collection from Discogs..." />
                                                </div>
                                            ) : publicCollection.length === 0 ? (
                                                <p style={{ color: 'var(--grail-text-subtle)', textAlign: 'center', marginBottom: 0 }}>No collection items found or collection is private.</p>
                                            ) : (
                                                <div>
                                                    <p style={{ color: 'var(--grail-text-subtle)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                                                        Showing {publicCollection.length} item{publicCollection.length !== 1 ? 's' : ''} from Discogs
                                                    </p>
                                                    <div className="row g-2">
                                                        {publicCollection.map((item, idx) => {
                                                            const release = item.basic_information || item;
                                                            const coverImage = release.cover_image || release.thumb || '/placeholder.jpg';
                                                            const title = release.title || 'Unknown Title';
                                                            const artist = release.artists ? release.artists.map(a => a.name).join(', ') : 'Unknown Artist';
                                                            const discogsId = release.id;
                                                            
                                                            return (
                                                                <div key={item.instance_id || idx} className="col-md-2 col-sm-3 col-4">
                                                                    <Link to={`/release/${discogsId}`} className="text-decoration-none">
                                                                        <img 
                                                                            src={coverImage} 
                                                                            alt={title}
                                                                            className="img-fluid rounded"
                                                                            style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }}
                                                                        />
                                                                        <small className="d-block text-truncate mt-1" title={`${artist} - ${title}`}>
                                                                            {title}
                                                                        </small>
                                                                        <small className="d-block text-truncate text-muted" title={artist}>
                                                                            {artist}
                                                                        </small>
                                                                    </Link>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Wantlist Dropdown */}
                                <div>
                                    <button
                                        className="grail-btn grail-btn--ghost"
                                        type="button"
                                        onClick={() => {
                                            setShowWantlistDropdown(!showWantlistDropdown);
                                            if (!showWantlistDropdown && !hasLoadedCollection && !loadingCollection) {
                                                loadPublicCollection();
                                            }
                                        }}
                                        disabled={loadingCollection}
                                        style={{ width: '100%', justifyContent: 'space-between' }}
                                    >
                                        <span>
                                            <i className="fas fa-heart me-2"></i>
                                            Wantlist
                                            {publicWantlist.length > 0 && (
                                                <span className="grail-pill-badge ms-2" style={{ background: 'var(--grail-highlight)', color: '#1f2435' }}>{publicWantlist.length}</span>
                                            )}
                                        </span>
                                        <i className={`fas fa-chevron-${showWantlistDropdown ? 'up' : 'down'}`}></i>
                                    </button>
                                    
                                    {showWantlistDropdown && (
                                        <div className="grail-card mt-3" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                            {loadingCollection ? (
                                                <div style={{ textAlign: 'center', padding: '2rem' }}>
                                                    <VinylSpinner size={50} label="Loading wantlist from Discogs..." />
                                                </div>
                                            ) : publicWantlist.length === 0 ? (
                                                <p style={{ color: 'var(--grail-text-subtle)', textAlign: 'center', marginBottom: 0 }}>No wantlist items found or wantlist is private.</p>
                                            ) : (
                                                <div>
                                                    <p style={{ color: 'var(--grail-text-subtle)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                                                        Showing {publicWantlist.length} item{publicWantlist.length !== 1 ? 's' : ''} from Discogs
                                                    </p>
                                                    <div className="row g-2">
                                                        {publicWantlist.map((item, idx) => {
                                                            const release = item.basic_information || item;
                                                            const coverImage = release.cover_image || release.thumb || '/placeholder.jpg';
                                                            const title = release.title || 'Unknown Title';
                                                            const artist = release.artists ? release.artists.map(a => a.name).join(', ') : 'Unknown Artist';
                                                            const discogsId = release.id;
                                                            
                                                            return (
                                                                <div key={item.id || idx} className="col-md-2 col-sm-3 col-4">
                                                                    <Link to={`/release/${discogsId}`} className="text-decoration-none">
                                                                        <img 
                                                                            src={coverImage} 
                                                                            alt={title}
                                                                            className="img-fluid rounded"
                                                                            style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', opacity: 0.9 }}
                                                                        />
                                                                        <small className="d-block text-truncate mt-1" title={`${artist} - ${title}`}>
                                                                            {title}
                                                                        </small>
                                                                        <small className="d-block text-truncate text-muted" title={artist}>
                                                                            {artist}
                                                                        </small>
                                                                    </Link>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Followed Artists & Labels */}
                    {isOwnProfile && (
                        <div className="grail-card mb-4">
                            <div className="d-flex justify-content-between align-items-center mb-3" style={{ 
                                paddingBottom: '1rem',
                                borderBottom: '1px solid var(--grail-glass-border)'
                            }}>
                                <h2 className="grail-heading--h2 mb-0">
                                    <i className="fas fa-star me-2" style={{ color: 'var(--grail-accent)' }}></i>
                                    Following
                                </h2>
                                <button
                                    className="grail-btn grail-btn--ghost grail-btn--sm"
                                    onClick={loadFollowedEntities}
                                    disabled={loadingFollowed}
                                    title="Refresh followed artists and labels"
                                >
                                    {loadingFollowed ? (
                                        <span className="spinner-border spinner-border-sm" role="status"></span>
                                    ) : (
                                        <i className="fas fa-sync-alt"></i>
                                    )}
                                </button>
                            </div>
                            <div>
                                {loadingFollowed ? (
                                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                                        <VinylSpinner size={50} label={null} />
                                    </div>
                                ) : (
                                    <>
                                        {/* Followed Artists */}
                                        <div style={{ marginBottom: '2rem' }}>
                                            <h6 className="grail-section-title mb-2" style={{ fontSize: '1rem' }}>
                                                <i className="fas fa-microphone me-2" style={{ color: 'var(--grail-accent)' }}></i>
                                                Artists ({followedArtists.length})
                                            </h6>
                                            {followedArtists.length === 0 ? (
                                                <p style={{ color: 'var(--grail-text-subtle)' }}>You're not following any artists yet.</p>
                                            ) : (
                                                <div className="row g-2">
                                                    {followedArtists.map((artist) => (
                                                        <div key={artist.entity_discogs_id} className="col-md-3 col-sm-4 col-6">
                                                            <Link 
                                                                to={`/artist/${artist.entity_discogs_id}`}
                                                                style={{ textDecoration: 'none' }}
                                                            >
                                                                <div className="grail-card" style={{ 
                                                                    height: '100%',
                                                                    padding: '0.75rem',
                                                                    textAlign: 'center',
                                                                    transition: 'all 0.2s ease',
                                                                    cursor: 'pointer'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.borderColor = 'var(--grail-accent)';
                                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.borderColor = 'var(--grail-glass-border)';
                                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                                }}>
                                                                    <small style={{ 
                                                                        color: 'var(--grail-text)',
                                                                        display: 'block',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap'
                                                                    }} title={artist.entity_name}>
                                                                            {artist.entity_name || `Artist ${artist.entity_discogs_id}`}
                                                                        </small>
                                                                </div>
                                                            </Link>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Followed Labels */}
                                        <div>
                                            <h6 className="grail-section-title mb-2" style={{ fontSize: '1rem' }}>
                                                <i className="fas fa-tag me-2" style={{ color: 'var(--grail-accent)' }}></i>
                                                Labels ({followedLabels.length})
                                            </h6>
                                            {followedLabels.length === 0 ? (
                                                <p style={{ color: 'var(--grail-text-subtle)' }}>You're not following any labels yet.</p>
                                            ) : (
                                                <div className="row g-2">
                                                    {followedLabels.map((label) => (
                                                        <div key={label.entity_discogs_id} className="col-md-3 col-sm-4 col-6">
                                                            <Link 
                                                                to={`/label/${label.entity_discogs_id}`}
                                                                style={{ textDecoration: 'none' }}
                                                            >
                                                                <div className="grail-card" style={{ 
                                                                    height: '100%',
                                                                    padding: '0.75rem',
                                                                    textAlign: 'center',
                                                                    transition: 'all 0.2s ease',
                                                                    cursor: 'pointer'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.borderColor = 'var(--grail-accent)';
                                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.borderColor = 'var(--grail-glass-border)';
                                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                                }}>
                                                                    <small style={{ 
                                                                        color: 'var(--grail-text)',
                                                                        display: 'block',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap'
                                                                    }} title={label.entity_name}>
                                                                            {label.entity_name || `Label ${label.entity_discogs_id}`}
                                                                        </small>
                                                                </div>
                                                            </Link>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Activity Stats */}
                    <div className="grail-card mb-4">
                        <h2 className="grail-heading--h2 mb-3">
                            <i className="fas fa-chart-line me-2" style={{ color: 'var(--grail-accent)' }}></i>
                                Activity & Contributions
                        </h2>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <div className="d-flex justify-content-between align-items-center mb-2" style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--grail-glass-border)' }}>
                                    <span style={{ color: 'var(--grail-text-subtle)' }}>Releases Contributed:</span>
                                    <strong style={{ color: 'var(--grail-text)' }}>{profile.releases_contributed}</strong>
                        </div>
                                <div className="d-flex justify-content-between align-items-center mb-2" style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--grail-glass-border)' }}>
                                    <span style={{ color: 'var(--grail-text-subtle)' }}>Lists Created:</span>
                                    <strong style={{ color: 'var(--grail-text)' }}>{profile.num_lists}</strong>
                                    </div>
                                <div className="d-flex justify-content-between align-items-center mb-2" style={{ padding: '0.5rem 0' }}>
                                    <span style={{ color: 'var(--grail-text-subtle)' }}>Rank:</span>
                                    <strong style={{ color: 'var(--grail-text)' }}>{profile.rank || 'Unranked'}</strong>
                                    </div>
                                    </div>
                            <div className="col-md-6">
                                <div className="d-flex justify-content-between align-items-center mb-2" style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--grail-glass-border)' }}>
                                    <span style={{ color: 'var(--grail-text-subtle)' }}>Items for Sale:</span>
                                    <strong style={{ color: 'var(--grail-text)' }}>{profile.num_for_sale}</strong>
                                </div>
                                <div className="d-flex justify-content-between align-items-center mb-2" style={{ padding: '0.5rem 0' }}>
                                    <span style={{ color: 'var(--grail-text-subtle)' }}>Pending Items:</span>
                                    <strong style={{ color: 'var(--grail-text)' }}>{profile.num_pending}</strong>
                                    </div>
                                <div className="d-flex justify-content-between align-items-center mb-2" style={{ padding: '0.5rem 0' }}>
                                    <span style={{ color: 'var(--grail-text-subtle)' }}>Currency:</span>
                                    <strong style={{ color: 'var(--grail-text)' }}>{profile.curr_abbr}</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Marketplace Stats */}
                    {(profile.buyer_num_ratings > 0 || profile.seller_num_ratings > 0) && (
                        <div className="grail-card mb-4">
                            <h2 className="grail-heading--h2 mb-3">
                                <i className="fas fa-store me-2" style={{ color: 'var(--grail-success)' }}></i>
                                    Marketplace Ratings
                            </h2>
                            <div>
                                <div className="row g-3 text-center">
                                    <div className="col-md-6">
                                        <h6 className="grail-section-title mb-2" style={{ fontSize: '1rem' }}>As Buyer</h6>
                                        <div style={{ marginBottom: '0.5rem' }}>
                                            <span className="grail-pill-badge" style={{ fontSize: '1.2em', background: 'var(--grail-primary)' }}>
                                                {profile.buyer_rating_stars.toFixed(1)} ⭐
                                            </span>
                                        </div>
                                        <small style={{ color: 'var(--grail-text-subtle)' }}>
                                            Based on {profile.buyer_num_ratings} rating{profile.buyer_num_ratings !== 1 ? 's' : ''}
                                        </small>
                                    </div>
                                    <div className="col-md-6">
                                        <h6 className="grail-section-title mb-2" style={{ fontSize: '1rem' }}>As Seller</h6>
                                        <div style={{ marginBottom: '0.5rem' }}>
                                            <span className="grail-pill-badge" style={{ fontSize: '1.2em', background: 'var(--grail-success)' }}>
                                                {profile.seller_rating_stars.toFixed(1)} ⭐
                                            </span>
                                        </div>
                                        <small style={{ color: 'var(--grail-text-subtle)' }}>
                                            Based on {profile.seller_num_ratings} rating{profile.seller_num_ratings !== 1 ? 's' : ''}
                                        </small>
                                    </div>
                                </div>
                                {profile.marketplace_suspended && (
                                    <div className="grail-alert grail-alert--warning" style={{ marginTop: '1rem', marginBottom: 0 }}>
                                        <i className="fas fa-exclamation-triangle me-2"></i>
                                        Marketplace access suspended
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Top 3 Releases */}
                    <div className="grail-card mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-3" style={{ 
                            paddingBottom: '1rem',
                            borderBottom: '1px solid var(--grail-glass-border)'
                        }}>
                            <h2 className="grail-heading--h2 mb-0">
                                <i className="fas fa-trophy me-2" style={{ color: 'var(--grail-highlight)' }}></i>
                                Top 3 Releases
                            </h2>
                            {isOwnProfile && topReleases.length < 3 && (
                                <button 
                                    className="grail-btn grail-btn--primary grail-btn--sm" 
                                    onClick={handleAddToTop}
                                >
                                    <i className="fas fa-plus me-1"></i>
                                    Add
                                </button>
                            )}
                        </div>
                        <div>
                                            {topReleases.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem' }}>
                                    <p style={{ color: 'var(--grail-text-subtle)', marginBottom: '1.5rem' }}>
                                        {isOwnProfile ? 'No top releases selected yet' : 'No top releases set'}
                                    </p>
                                    {isOwnProfile && (
                                        <button 
                                            className="grail-btn grail-btn--primary" 
                                            onClick={handleAddToTop}
                                        >
                                            <i className="fas fa-plus me-2"></i>
                                            Add Your First Top Release
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="row g-3">
                                    {topReleases.map((release, index) => {
                                        const coverImage = release.coverImage || release.basic_information?.cover_image;
                                        const title = release.title || release.basic_information?.title;
                                        const artist = release.artist || release.basic_information?.artists?.map(a => a.name).join(', ');
                                        const discogsId = release.discogsId || release.basic_information?.id || release.id;
                                        const year = release.basic_information?.year;
                                        const genres = release.basic_information?.genres?.join(', ');
                                        
                                        return (
                                        <div key={index} className="col-md-4">
                                            <div className="grail-card" style={{ height: '100%', position: 'relative' }}>
                                                {coverImage && (
                                                    <img 
                                                        src={coverImage} 
                                                        alt={title}
                                                        style={{ 
                                                            width: '100%', 
                                                            height: '200px', 
                                                            objectFit: 'cover',
                                                            borderRadius: 'var(--grail-radius-md)',
                                                            marginBottom: '1rem'
                                                        }}
                                                    />
                                                )}
                                                <div style={{ position: 'absolute', top: '1rem', left: '1rem' }}>
                                                    <span className="grail-pill-badge" style={{ 
                                                        fontSize: '1.2em', 
                                                        background: 'var(--grail-highlight)',
                                                        color: '#1f2435'
                                                    }}>
                                                            #{index + 1}
                                                        </span>
                                                    </div>
                                                <h6 className="grail-section-title mb-2" style={{ fontSize: '1rem', marginTop: coverImage ? '0' : '2.5rem' }}>{title}</h6>
                                                <p style={{ color: 'var(--grail-text-subtle)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{artist}</p>
                                                {year && <p style={{ color: 'var(--grail-text-subtle)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Year: {year}</p>}
                                                {genres && <p style={{ color: 'var(--grail-text-subtle)', fontSize: '0.875rem', marginBottom: '1rem' }}>{genres}</p>}
                                                    
                                                    {/* Reorder buttons - only show for own profile */}
                                                    {isOwnProfile && (
                                                    <div className="d-flex gap-2 mb-2">
                                                            <button 
                                                            className="grail-btn grail-btn--ghost grail-btn--sm flex-grow-1"
                                                                onClick={() => handleMoveUp(index)}
                                                                disabled={index === 0}
                                                                title="Move up"
                                                            >
                                                                <i className="fas fa-arrow-up"></i>
                                                            </button>
                                                            <button 
                                                            className="grail-btn grail-btn--ghost grail-btn--sm flex-grow-1"
                                                                onClick={() => handleMoveDown(index)}
                                                                disabled={index === topReleases.length - 1}
                                                                title="Move down"
                                                            >
                                                                <i className="fas fa-arrow-down"></i>
                                                            </button>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Action buttons */}
                                                    <div className="d-flex gap-2">
                                                        <a 
                                                            href={`https://www.discogs.com/release/${discogsId}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        className="grail-btn grail-btn--ghost grail-btn--sm flex-grow-1"
                                                        style={{ textDecoration: 'none' }}
                                                        >
                                                            <i className="fas fa-external-link-alt me-1"></i>
                                                            View on Discogs
                                                        </a>
                                                        {isOwnProfile && (
                                                            <button 
                                                            className="grail-btn grail-btn--danger grail-btn--sm"
                                                                onClick={() => handleRemoveFromTop(index)}
                                                                title="Remove"
                                                            >
                                                                <i className="fas fa-times"></i>
                                                            </button>
                                                        )}
                                                </div>
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="grail-card">
                        <h2 className="grail-heading--h2 mb-3">
                            <i className="fas fa-link me-2" style={{ color: 'var(--grail-accent)' }}></i>
                                Quick Links
                        </h2>
                        <div className="row g-2">
                            <div className="col-md-6">
                                    <a 
                                        href={profile.collection_folders_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                    className="grail-btn grail-btn--ghost grail-btn--sm"
                                    style={{ width: '100%', textDecoration: 'none' }}
                                    >
                                        <i className="fas fa-folder me-2"></i>
                                        View on Discogs
                                    </a>
                                </div>
                            <div className="col-md-6">
                                    <a 
                                        href={profile.wantlist_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                    className="grail-btn grail-btn--ghost grail-btn--sm"
                                    style={{ width: '100%', textDecoration: 'none' }}
                                    >
                                        <i className="fas fa-heart me-2"></i>
                                        Wantlist on Discogs
                                    </a>
                                </div>
                                {profile.inventory_url && (
                                <div className="col-md-6">
                                        <a 
                                            href={profile.inventory_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                        className="grail-btn grail-btn--ghost grail-btn--sm"
                                        style={{ width: '100%', textDecoration: 'none' }}
                                        >
                                            <i className="fas fa-shopping-cart me-2"></i>
                                            Marketplace Inventory
                                        </a>
                                    </div>
                                )}
                            <div className="col-md-6">
                                    <a 
                                        href={profile.uri} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                    className="grail-btn grail-btn--ghost grail-btn--sm"
                                    style={{ width: '100%', textDecoration: 'none' }}
                                    >
                                        <i className="fas fa-external-link-alt me-2"></i>
                                        Discogs Profile Page
                                    </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Refresh Button */}
            <div className="row mt-4">
                <div className="col-12 text-center">
                    <button 
                        className="grail-btn grail-btn--primary" 
                        onClick={loadProfile}
                        disabled={loading}
                    >
                        <i className="fas fa-sync-alt me-2"></i>
                        Refresh Profile
                    </button>
                </div>
            </div>

            {/* Collection Selection Modal */}
            {showCollectionModal && (
                <div 
                    className="modal show d-block" 
                    tabIndex="-1" 
                    style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
                >
                    <div className="modal-dialog modal-lg modal-dialog-scrollable">
                        <div className="grail-card" style={{ margin: '2rem auto', maxWidth: '800px' }}>
                            <div className="d-flex justify-content-between align-items-center mb-3" style={{ 
                                paddingBottom: '1rem',
                                borderBottom: '1px solid var(--grail-glass-border)'
                            }}>
                                <h2 className="grail-heading--h2 mb-0">
                                    <i className="fas fa-compact-disc me-2" style={{ color: 'var(--grail-accent)' }}></i>
                                    Select from Your Collection
                                </h2>
                                <button 
                                    type="button" 
                                    className="grail-btn grail-btn--ghost grail-btn--sm"
                                    onClick={() => setShowCollectionModal(false)}
                                    style={{ minWidth: 'auto', padding: '0.5rem' }}
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                {collection.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                                        <VinylSpinner size={50} label="Loading collection..." />
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {collection.map((release) => (
                                            <button
                                                key={release.instance_id}
                                                className="grail-btn grail-btn--ghost"
                                                onClick={() => handleSelectFromCollection(release)}
                                                disabled={topReleases.some(r => r.id === release.id)}
                                                style={{ 
                                                    justifyContent: 'flex-start',
                                                    textAlign: 'left',
                                                    padding: '1rem',
                                                    opacity: topReleases.some(r => r.id === release.id) ? 0.6 : 1
                                                }}
                                            >
                                                <img 
                                                    src={release.basic_information.thumb} 
                                                    alt={release.basic_information.title}
                                                    style={{ 
                                                        width: '60px', 
                                                        height: '60px', 
                                                        objectFit: 'cover',
                                                        borderRadius: 'var(--grail-radius-sm)',
                                                        marginRight: '1rem'
                                                    }}
                                                />
                                                <div style={{ flex: 1, textAlign: 'left' }}>
                                                    <h6 style={{ color: 'var(--grail-text)', marginBottom: '0.25rem' }}>{release.basic_information.title}</h6>
                                                    <p style={{ color: 'var(--grail-text-subtle)', fontSize: '0.875rem', marginBottom: 0 }}>
                                                        {release.basic_information.artists.map(a => a.name).join(', ')}
                                                        {release.basic_information.year && ` (${release.basic_information.year})`}
                                                    </p>
                                                </div>
                                                {topReleases.some(r => r.id === release.id) && (
                                                    <span className="grail-pill-badge" style={{ background: 'var(--grail-success)' }}>
                                                        <i className="fas fa-check me-1"></i>
                                                        Selected
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="d-flex justify-content-end mt-3" style={{ paddingTop: '1rem', borderTop: '1px solid var(--grail-glass-border)' }}>
                                <button 
                                    type="button" 
                                    className="grail-btn grail-btn--ghost" 
                                    onClick={() => setShowCollectionModal(false)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserProfile;

