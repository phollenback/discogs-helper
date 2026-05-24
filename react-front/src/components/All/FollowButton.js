import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../AuthContext';
import { useApi } from '../../utility/backSource';

const FollowButton = ({ entityType, entityId, entityName, onFollowChange, compact = false }) => {
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
    }, [entityId, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

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
            await loadFollowStatus();
            const name = entityName || `${entityType} ${entityId}`;
            alert(`Now following ${name}`);
            if (onFollowChange) onFollowChange(true);
        } catch (err) {
            console.error('[FollowButton] Error following:', err);
            alert('Failed to follow. Please try again.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnfollow = async () => {
        try {
            setActionLoading(true);
            await deleteData(`/api/${entityType}/${entityId}/unfollow`);
            await loadFollowStatus();
            const name = entityName || `${entityType} ${entityId}`;
            alert(`Unfollowed ${name}`);
            if (onFollowChange) onFollowChange(false);
        } catch (err) {
            console.error('[FollowButton] Error unfollowing:', err);
            alert('Failed to unfollow. Please try again.');
        } finally {
            setActionLoading(false);
        }
    };

    const btnClass = compact ? 'btn btn--ghost btn-sm' : 'btn btn--ghost btn-sm';
    const activeClass = compact ? 'btn btn--primary btn-sm' : 'btn btn--primary btn-sm';

    if (loading) {
        return (
            <button type="button" className={btnClass} disabled>
                <span className="spinner-border spinner-border-sm me-1" role="status" />
                …
            </button>
        );
    }

    if (!isAuthenticated || !authState.username) {
        return (
            <button
                type="button"
                className={btnClass}
                onClick={() => alert('Please log in to follow')}
                title="Log in to follow"
            >
                Follow
            </button>
        );
    }

    return (
        <div className={compact ? 'follow-btn-compact' : 'd-flex align-items-center gap-2'}>
            {isFollowing ? (
                <button
                    type="button"
                    className={activeClass}
                    onClick={handleUnfollow}
                    disabled={actionLoading}
                    title={`Unfollow this ${entityType}`}
                >
                    {actionLoading ? '…' : 'Following'}
                </button>
            ) : (
                <button
                    type="button"
                    className={btnClass}
                    onClick={handleFollow}
                    disabled={actionLoading}
                    title={`Follow this ${entityType}`}
                >
                    {actionLoading ? '…' : 'Follow'}
                </button>
            )}
            {!compact && followerCount > 0 && (
                <small className="text-muted" style={{ fontSize: '0.85rem' }}>
                    {followerCount} follower{followerCount !== 1 ? 's' : ''}
                </small>
            )}
        </div>
    );
};

export default FollowButton;
