export const entityFollowsQueries = {
    // Follow an artist or label
    followEntity: `
        INSERT INTO user_follows_entities (user_id, entity_type, entity_discogs_id, entity_name)
        VALUES (?, ?, ?, ?)
    `,
    
    // Unfollow an artist or label
    unfollowEntity: `
        DELETE FROM user_follows_entities
        WHERE user_id = ? AND entity_type = ? AND entity_discogs_id = ?
    `,
    
    // Check if user is following an entity
    isFollowing: `
        SELECT COUNT(*) as is_following
        FROM user_follows_entities
        WHERE user_id = ? AND entity_type = ? AND entity_discogs_id = ?
    `,
    
    // Get all entities a user is following (with optional filter by type)
    getFollowing: `
        SELECT 
            entity_type,
            entity_discogs_id,
            entity_name,
            notification_enabled,
            created_at
        FROM user_follows_entities
        WHERE user_id = ?
        ORDER BY created_at DESC
    `,
    
    // Get all artists a user is following
    getFollowingArtists: `
        SELECT 
            entity_discogs_id,
            entity_name,
            notification_enabled,
            created_at
        FROM user_follows_entities
        WHERE user_id = ? AND entity_type = 'artist'
        ORDER BY created_at DESC
    `,
    
    // Get all labels a user is following
    getFollowingLabels: `
        SELECT 
            entity_discogs_id,
            entity_name,
            notification_enabled,
            created_at
        FROM user_follows_entities
        WHERE user_id = ? AND entity_type = 'label'
        ORDER BY created_at DESC
    `,
    
    // Get follower count for an entity
    getFollowerCount: `
        SELECT COUNT(*) as follower_count
        FROM user_follows_entities
        WHERE entity_type = ? AND entity_discogs_id = ?
    `,
    
    // Get follow status for an entity (is following + follower count)
    getFollowStatus: `
        SELECT 
            (SELECT COUNT(*) FROM user_follows_entities 
             WHERE user_id = ? AND entity_type = ? AND entity_discogs_id = ?) as is_following,
            (SELECT COUNT(*) FROM user_follows_entities 
             WHERE entity_type = ? AND entity_discogs_id = ?) as follower_count
    `
};

