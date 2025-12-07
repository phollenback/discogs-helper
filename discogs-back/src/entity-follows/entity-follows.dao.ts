import { execute } from '../services/mysql.connector';
import { entityFollowsQueries } from './entity-follows.queries';
import { EntityType } from './entity-follows.model';

// Follow an artist or label
export const followEntity = async (
    userId: number, 
    entityType: EntityType, 
    entityDiscogsId: number, 
    entityName?: string
) => {
    return execute<any>(
        entityFollowsQueries.followEntity, 
        [userId, entityType, entityDiscogsId, entityName || null]
    );
};

// Unfollow an artist or label
export const unfollowEntity = async (
    userId: number, 
    entityType: EntityType, 
    entityDiscogsId: number
) => {
    return execute<any>(
        entityFollowsQueries.unfollowEntity, 
        [userId, entityType, entityDiscogsId]
    );
};

// Check if user is following an entity
export const isFollowing = async (
    userId: number, 
    entityType: EntityType, 
    entityDiscogsId: number
) => {
    const result = await execute<any>(
        entityFollowsQueries.isFollowing, 
        [userId, entityType, entityDiscogsId]
    );
    return result && result[0]?.is_following > 0;
};

// Get all entities a user is following
export const getFollowing = async (userId: number, entityType?: EntityType) => {
    if (entityType) {
        // Use specific query for filtered results
        if (entityType === 'artist') {
            return getFollowingArtists(userId);
        } else {
            return getFollowingLabels(userId);
        }
    }
    
    // Return all entities
    return execute<any>(entityFollowsQueries.getFollowing, [userId]);
};

// Get all artists a user is following
export const getFollowingArtists = async (userId: number) => {
    return execute<any>(entityFollowsQueries.getFollowingArtists, [userId]);
};

// Get all labels a user is following
export const getFollowingLabels = async (userId: number) => {
    return execute<any>(entityFollowsQueries.getFollowingLabels, [userId]);
};

// Get follower count for an entity
export const getFollowerCount = async (entityType: EntityType, entityDiscogsId: number) => {
    const result = await execute<any>(
        entityFollowsQueries.getFollowerCount, 
        [entityType, entityDiscogsId]
    );
    return result[0]?.follower_count || 0;
};

// Get follow status (is following + follower count)
export const getFollowStatus = async (
    userId: number | null, 
    entityType: EntityType, 
    entityDiscogsId: number
) => {
    const result = await execute<any>(
        entityFollowsQueries.getFollowStatus, 
        [userId, entityType, entityDiscogsId, entityType, entityDiscogsId]
    );
    return {
        is_following: result[0]?.is_following > 0,
        follower_count: result[0]?.follower_count || 0
    };
};

