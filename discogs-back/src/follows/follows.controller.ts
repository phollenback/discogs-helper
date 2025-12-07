import { Request, RequestHandler, Response } from 'express';
import * as FollowsDao from './follows.dao';
import * as UserDao from '../users/users.dao';

// Follow a user
export const followUser: RequestHandler = async (req: Request, res: Response) => {
    try {
        const followerId = req.user?.userId; // From auth token
        const usernameToFollow = req.params.username;

        console.log(`[followUser] User ${followerId} attempting to follow ${usernameToFollow}`);

        if (!followerId) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Get the user ID of the user to follow
        const userToFollow = await UserDao.readUserByUsername(usernameToFollow);
        
        if (!userToFollow || userToFollow.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const followingId = userToFollow[0].user_id;

        // Prevent following yourself
        if (followerId === followingId) {
            return res.status(400).json({ message: 'You cannot follow yourself' });
        }

        // Check if already following
        const existingFollow = await FollowsDao.isFollowing(followerId, followingId);
        if (existingFollow && existingFollow[0]?.is_following > 0) {
            return res.status(400).json({ message: 'You are already following this user' });
        }

        // Follow the user
        await FollowsDao.followUser(followerId, followingId);
        
        console.log(`[followUser] User ${followerId} successfully followed user ${followingId}`);
        res.status(201).json({ 
            message: 'Successfully followed user',
            following: usernameToFollow
        });
    } catch (error: any) {
        console.error('[followUser][Error]', error);
        console.error('[followUser][Error] Details:', {
            message: error?.message,
            code: error?.code,
            stack: error?.stack,
            sqlMessage: error?.sqlMessage
        });
        res.status(500).json({ 
            message: 'Error following user',
            error: process.env.NODE_ENV === 'development' ? error?.message : undefined
        });
    }
};

// Unfollow a user
export const unfollowUser: RequestHandler = async (req: Request, res: Response) => {
    try {
        const followerId = req.user?.userId; // From auth token
        const usernameToUnfollow = req.params.username;

        console.log(`[unfollowUser] User ${followerId} attempting to unfollow ${usernameToUnfollow}`);

        if (!followerId) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Get the user ID of the user to unfollow
        const userToUnfollow = await UserDao.readUserByUsername(usernameToUnfollow);
        
        if (!userToUnfollow || userToUnfollow.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const followingId = userToUnfollow[0].user_id;

        // Unfollow the user
        const result = await FollowsDao.unfollowUser(followerId, followingId);
        
        console.log(`[unfollowUser] User ${followerId} successfully unfollowed user ${followingId}`);
        res.status(200).json({ 
            message: 'Successfully unfollowed user',
            unfollowed: usernameToUnfollow
        });
    } catch (error: any) {
        console.error('[unfollowUser][Error]', error);
        console.error('[unfollowUser][Error] Details:', {
            message: error?.message,
            code: error?.code,
            stack: error?.stack,
            sqlMessage: error?.sqlMessage
        });
        res.status(500).json({ 
            message: 'Error unfollowing user',
            error: process.env.NODE_ENV === 'development' ? error?.message : undefined
        });
    }
};

// Get users that a user is following
export const getFollowing: RequestHandler = async (req: Request, res: Response) => {
    try {
        const username = req.params.username;

        console.log(`[getFollowing] Fetching following list for ${username}`);

        // Get the user ID
        const user = await UserDao.readUserByUsername(username);
        
        if (!user || user.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userId = user[0].user_id;

        // Get following list
        const following = await FollowsDao.getFollowing(userId);
        
        // Remove sensitive information
        const sanitizedFollowing = following.map(f => ({
            user_id: f.user_id,
            username: f.username,
            followed_at: f.followed_at
        }));

        console.log(`[getFollowing] User ${username} is following ${sanitizedFollowing.length} users`);
        res.status(200).json(sanitizedFollowing);
    } catch (error: any) {
        console.error('[getFollowing][Error]', error);
        console.error('[getFollowing][Error] Details:', {
            message: error?.message,
            code: error?.code,
            stack: error?.stack,
            sqlMessage: error?.sqlMessage
        });
        res.status(500).json({ 
            message: 'Error fetching following list',
            error: process.env.NODE_ENV === 'development' ? error?.message : undefined
        });
    }
};

// Get followers of a user
export const getFollowers: RequestHandler = async (req: Request, res: Response) => {
    try {
        const username = req.params.username;

        console.log(`[getFollowers] Fetching followers list for ${username}`);

        // Get the user ID
        const user = await UserDao.readUserByUsername(username);
        
        if (!user || user.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userId = user[0].user_id;

        // Get followers list
        const followers = await FollowsDao.getFollowers(userId);
        
        // Remove sensitive information
        const sanitizedFollowers = followers.map(f => ({
            user_id: f.user_id,
            username: f.username,
            followed_at: f.followed_at
        }));

        console.log(`[getFollowers] User ${username} has ${sanitizedFollowers.length} followers`);
        res.status(200).json(sanitizedFollowers);
    } catch (error: any) {
        console.error('[getFollowers][Error]', error);
        console.error('[getFollowers][Error] Details:', {
            message: error?.message,
            code: error?.code,
            stack: error?.stack,
            sqlMessage: error?.sqlMessage
        });
        res.status(500).json({ 
            message: 'Error fetching followers list',
            error: process.env.NODE_ENV === 'development' ? error?.message : undefined
        });
    }
};

// Get follow counts and status
export const getFollowStatus: RequestHandler = async (req: Request, res: Response) => {
    try {
        const username = req.params.username;
        const currentUserId = req.user?.userId; // May be undefined if not authenticated

        console.log(`[getFollowStatus] Fetching follow status for ${username}`);

        // Get the user ID
        const user = await UserDao.readUserByUsername(username);
        
        if (!user || user.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userId = user[0].user_id;

        console.log(`[getFollowStatus] User ID for ${username}: ${userId}`);

        // Get follow counts
        const counts = await FollowsDao.getFollowCounts(userId);
        
        console.log(`[getFollowStatus] Raw counts from DAO:`, counts);
        
        let isFollowing = false;
        let followsYou = false;
        let isMutual = false;

        // If authenticated, check relationship with current user
        if (currentUserId && currentUserId !== userId) {
            const followStatus = await FollowsDao.isFollowing(currentUserId, userId);
            isFollowing = followStatus && followStatus[0]?.is_following > 0;

            const followsBackStatus = await FollowsDao.isFollowing(userId, currentUserId);
            followsYou = followsBackStatus && followsBackStatus[0]?.is_following > 0;

            isMutual = isFollowing && followsYou;
        }

        const response = {
            username: username,
            follower_count: counts[0]?.follower_count || 0,
            following_count: counts[0]?.following_count || 0,
            ...(currentUserId && currentUserId !== userId && {
                relationship: {
                    is_following: isFollowing,
                    follows_you: followsYou,
                    is_mutual: isMutual
                }
            })
        };

        console.log(`[getFollowStatus] Status for ${username}:`, response);
        res.status(200).json(response);
    } catch (error: any) {
        console.error('[getFollowStatus][Error]', error);
        console.error('[getFollowStatus][Error] Details:', {
            message: error?.message,
            code: error?.code,
            stack: error?.stack,
            sqlMessage: error?.sqlMessage
        });
        res.status(500).json({ 
            message: 'Error fetching follow status',
            error: process.env.NODE_ENV === 'development' ? error?.message : undefined
        });
    }
};

// Get mutual followers (friends)
export const getMutualFollowers: RequestHandler = async (req: Request, res: Response) => {
    try {
        const username = req.params.username;

        console.log(`[getMutualFollowers] Fetching mutual followers for ${username}`);

        // Get the user ID
        const user = await UserDao.readUserByUsername(username);
        
        if (!user || user.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userId = user[0].user_id;

        // Get mutual followers
        const mutuals = await FollowsDao.getMutualFollowers(userId);
        
        // Remove sensitive information
        const sanitizedMutuals = mutuals.map(m => ({
            user_id: m.user_id,
            username: m.username
        }));

        console.log(`[getMutualFollowers] User ${username} has ${sanitizedMutuals.length} mutual followers`);
        res.status(200).json(sanitizedMutuals);
    } catch (error: any) {
        console.error('[getMutualFollowers][Error]', error);
        console.error('[getMutualFollowers][Error] Details:', {
            message: error?.message,
            code: error?.code,
            stack: error?.stack,
            sqlMessage: error?.sqlMessage
        });
        res.status(500).json({ 
            message: 'Error fetching mutual followers',
            error: process.env.NODE_ENV === 'development' ? error?.message : undefined
        });
    }
};

