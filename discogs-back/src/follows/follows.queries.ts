export const followsQueries = {
    // Follow a user
    followUser: `
        INSERT INTO user_follows (follower_id, following_id)
        VALUES (?, ?)
    `,
    
    // Unfollow a user
    unfollowUser: `
        DELETE FROM user_follows
        WHERE follower_id = ? AND following_id = ?
    `,
    
    // Get all users that a user is following
    getFollowing: `
        SELECT 
            u.user_id,
            u.username,
            u.email,
            uf.created_at as followed_at
        FROM user_follows uf
        JOIN users u ON uf.following_id = u.user_id
        WHERE uf.follower_id = ?
        ORDER BY uf.created_at DESC
    `,
    
    // Get all followers of a user
    getFollowers: `
        SELECT 
            u.user_id,
            u.username,
            u.email,
            uf.created_at as followed_at
        FROM user_follows uf
        JOIN users u ON uf.follower_id = u.user_id
        WHERE uf.following_id = ?
        ORDER BY uf.created_at DESC
    `,
    
    // Check if user A is following user B
    isFollowing: `
        SELECT COUNT(*) as is_following
        FROM user_follows
        WHERE follower_id = ? AND following_id = ?
    `,
    
    // Check if two users follow each other (mutual)
    areMutualFollowers: `
        SELECT 
            (SELECT COUNT(*) FROM user_follows WHERE follower_id = ? AND following_id = ?) as a_follows_b,
            (SELECT COUNT(*) FROM user_follows WHERE follower_id = ? AND following_id = ?) as b_follows_a
    `,
    
    // Get follower/following counts for a user
    getFollowCounts: `
        SELECT 
            (SELECT COUNT(*) FROM user_follows WHERE following_id = ?) as follower_count,
            (SELECT COUNT(*) FROM user_follows WHERE follower_id = ?) as following_count
    `,
    
    // Get mutual followers (users who follow each other)
    getMutualFollowers: `
        SELECT 
            u.user_id,
            u.username,
            u.email
        FROM user_follows uf1
        JOIN user_follows uf2 ON uf1.follower_id = uf2.following_id 
            AND uf1.following_id = uf2.follower_id
        JOIN users u ON uf1.following_id = u.user_id
        WHERE uf1.follower_id = ?
        ORDER BY u.username
    `
};

