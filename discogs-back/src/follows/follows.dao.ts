import { execute } from '../services/mysql.connector';
import { followsQueries } from './follows.queries';

// Follow a user
export const followUser = async (followerId: number, followingId: number) => {
    return execute<any>(followsQueries.followUser, [followerId, followingId]);
};

// Unfollow a user
export const unfollowUser = async (followerId: number, followingId: number) => {
    return execute<any>(followsQueries.unfollowUser, [followerId, followingId]);
};

// Get all users that a user is following
export const getFollowing = async (userId: number) => {
    return execute<any>(followsQueries.getFollowing, [userId]);
};

// Get all followers of a user
export const getFollowers = async (userId: number) => {
    return execute<any>(followsQueries.getFollowers, [userId]);
};

// Check if user A is following user B
export const isFollowing = async (followerId: number, followingId: number) => {
    return execute<any>(followsQueries.isFollowing, [followerId, followingId]);
};

// Check if two users follow each other (mutual)
export const areMutualFollowers = async (userId1: number, userId2: number) => {
    return execute<any>(followsQueries.areMutualFollowers, [userId1, userId2, userId2, userId1]);
};

// Get follower/following counts for a user
export const getFollowCounts = async (userId: number) => {
    return execute<any>(followsQueries.getFollowCounts, [userId, userId]);
};

// Get mutual followers (users who follow each other)
export const getMutualFollowers = async (userId: number) => {
    return execute<any>(followsQueries.getMutualFollowers, [userId]);
};

