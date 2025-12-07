import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../AuthContext';
import { useApi } from '../../utility/backSource';

const FollowButton = ({ entityType, entityId, entityName, onFollowChange }) => {
    const { authState, isAuthenticated } = useAuthContext();
    const { getData, postData, deleteData } = useApi();
    const [isFollowing, setIsFollowing] = useState(false);
    const [followerCount, setFollowerCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (entityId) {
            loadFollowStatus();
        }
    }, [entityId, isAuthenticated]);

    const loadFollowStatus = async () => {
        try {
            setLoading(true);
            const data = await getData(`/api/${entityType}/${entityId}/follow-status`);
            setIsFollowing(data.is_following || false);
            setFollowerCount(data.follower_count || 0);
        } catch (err) {
            console.error('[FollowButton] Error loading follow status:', err);
            setIsFollowing(false);
            setFollowerCount(0);
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = async () => {
        if (!isAuthenticated || !authState.username) {
            alert('Please log in to follow artists and labels');
            return;
        }

        try {
            setActionLoading(true);
            await postData(`/api/${entityType}/${entityId}/follow`, {});
            
            // Reload status to ensure accuracy
            await loadFollowStatus();
            
            // Show success feedback
            const name = entityName || `${entityType} ${entityId}`;
            alert(`✅ Now following ${name}!`);
            
            if (onFollowChange) onFollowChange(true);
        } catch (err) {
            console.error('[FollowButton] Error following:', err);
            alert('❌ Failed to follow. Please try again.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnfollow = async () => {
        try {
            setActionLoading(true);
            await deleteData(`/api/${entityType}/${entityId}/unfollow`);
            
            // Reload status to ensure accuracy
            await loadFollowStatus();
            
            // Show success feedback
            const name = entityName || `${entityType} ${entityId}`;
            alert(`✅ Unfollowed ${name}`);
            
            if (onFollowChange) onFollowChange(false);
        } catch (err) {
            console.error('[FollowButton] Error unfollowing:', err);
            alert('❌ Failed to unfollow. Please try again.');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <button className="btn btn-outline-primary btn-sm" disabled>
                <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                Loading...
            </button>
        );
    }

    if (!isAuthenticated || !authState.username) {
        return (
            <div>
                <button 
                    className="btn btn-outline-primary btn-sm" 
                    onClick={() => alert('Please log in to follow')}
                    title="Log in to follow"
                >
                    <i className="fas fa-heart me-1"></i>
                    Follow
                </button>
                {followerCount > 0 && (
                    <small className="text-muted ms-2">
                        {followerCount} follower{followerCount !== 1 ? 's' : ''}
                    </small>
                )}
            </div>
        );
    }

    return (
        <div className="d-flex align-items-center gap-2">
            {isFollowing ? (
                <button
                    className="btn btn-success btn-sm"
                    onClick={handleUnfollow}
                    disabled={actionLoading}
                    title={`Unfollow this ${entityType}`}
                    style={{ 
                        minWidth: '100px',
                        transition: 'all 0.2s ease'
                    }}
                >
                    {actionLoading ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                            Unfollowing...
                        </>
                    ) : (
                        <>
                            <i className="fas fa-check-circle me-1"></i>
                            Following
                        </>
                    )}
                </button>
            ) : (
                <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={handleFollow}
                    disabled={actionLoading}
                    title={`Follow this ${entityType}`}
                    style={{ 
                        minWidth: '100px',
                        transition: 'all 0.2s ease'
                    }}
                >
                    {actionLoading ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                            Following...
                        </>
                    ) : (
                        <>
                            <i className="fas fa-heart me-1"></i>
                            Follow
                        </>
                    )}
                </button>
            )}
            {followerCount > 0 && (
                <small className="text-muted" style={{ fontSize: '0.85rem' }}>
                    <i className="fas fa-users me-1"></i>
                    {followerCount} follower{followerCount !== 1 ? 's' : ''}
                </small>
            )}
        </div>
    );
};

export default FollowButton;

