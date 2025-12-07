import { Router } from 'express';
import * as FollowsController from './follows.controller';
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = Router();

console.log('[FOLLOWS ROUTER] Registering routes...');

// Get follow status for a user (PUBLIC with optional auth for relationship info)
router
    .route('/api/users/:username/follow-status')
    .get(optionalAuth, FollowsController.getFollowStatus);

// Get followers of a user (PUBLIC)
router
    .route('/api/users/:username/followers')
    .get(FollowsController.getFollowers);

// Get users that a user is following (PUBLIC)
router
    .route('/api/users/:username/following')
    .get(FollowsController.getFollowing);

// Get mutual followers (friends) of a user (PUBLIC)
router
    .route('/api/users/:username/mutual')
    .get(FollowsController.getMutualFollowers);

// Follow a user (PROTECTED - requires authentication)
router
    .route('/api/users/:username/follow')
    .post(authenticateToken, FollowsController.followUser);

// Unfollow a user (PROTECTED - requires authentication)
router
    .route('/api/users/:username/unfollow')
    .delete(authenticateToken, FollowsController.unfollowUser);

console.log('[FOLLOWS ROUTER] Routes registered:');
console.log('  GET    /api/users/:username/follow-status (public with optional auth)');
console.log('  GET    /api/users/:username/followers (public)');
console.log('  GET    /api/users/:username/following (public)');
console.log('  GET    /api/users/:username/mutual (public)');
console.log('  POST   /api/users/:username/follow (protected)');
console.log('  DELETE /api/users/:username/unfollow (protected)');

export default router;

