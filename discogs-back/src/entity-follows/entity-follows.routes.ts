import { Router } from 'express';
import * as EntityFollowsController from './entity-follows.controller';
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = Router();

console.log('[ENTITY FOLLOWS ROUTER] Registering routes...');

// Get follow status for an entity (PUBLIC with optional auth)
router
    .route('/api/:entityType(artist|label)/:entityId/follow-status')
    .get(optionalAuth, EntityFollowsController.getFollowStatus);

// Follow an entity (PROTECTED)
router
    .route('/api/:entityType(artist|label)/:entityId/follow')
    .post(authenticateToken, EntityFollowsController.followEntity);

// Unfollow an entity (PROTECTED)
router
    .route('/api/:entityType(artist|label)/:entityId/unfollow')
    .delete(authenticateToken, EntityFollowsController.unfollowEntity);

// Get all entities a user is following (PROTECTED)
router
    .route('/api/users/me/following')
    .get(authenticateToken, EntityFollowsController.getFollowing);

// Get all artists a user is following (PROTECTED)
router
    .route('/api/users/me/following/artists')
    .get(authenticateToken, EntityFollowsController.getFollowingArtists);

// Get all labels a user is following (PROTECTED)
router
    .route('/api/users/me/following/labels')
    .get(authenticateToken, EntityFollowsController.getFollowingLabels);

console.log('[ENTITY FOLLOWS ROUTER] Routes registered:');
console.log('  GET    /api/:entityType/:entityId/follow-status (public with optional auth)');
console.log('  POST   /api/:entityType/:entityId/follow (protected)');
console.log('  DELETE /api/:entityType/:entityId/unfollow (protected)');
console.log('  GET    /api/users/me/following (protected)');
console.log('  GET    /api/users/me/following/artists (protected)');
console.log('  GET    /api/users/me/following/labels (protected)');

export default router;