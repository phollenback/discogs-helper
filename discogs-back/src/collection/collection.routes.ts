import { Request, Response, Router } from 'express'
import * as CollectionsController from './collection.controller'
import { authenticateToken, optionalAuth } from '../middleware/auth'

const router = Router();

// Public routes - view any user's collection/wantlist by username
// MUST come before numeric ID routes to avoid conflicts
router
    .route('/api/users/:username/collection')
    .get(optionalAuth, CollectionsController.readCollectionByUsername);

router
    .route('/api/users/:username/wantlist')
    .get(optionalAuth, CollectionsController.readWantlistByUsername);

// Use regex constraint to only match numeric user IDs (not usernames)
// This prevents route conflicts with /api/users/:username/collection/value
router  //
    .route('/api/users/:userId(\\d+)/collection')
    .get(authenticateToken, CollectionsController.readCollection)
   
router // 
    .route('/api/users/:userId(\\d+)/collection')
    .post(authenticateToken, CollectionsController.createCollectionItem)

router //
    .route('/api/users/:userId(\\d+)/collection/:recordId(\\d+)')
    .get(authenticateToken, CollectionsController.readCollectionItem)

router //
    .route('/api/users/:userId(\\d+)/collection/:recordId(\\d+)')
    .put(authenticateToken, CollectionsController.updateCollectionItem)

router //
    .route('/api/users/:userId(\\d+)/collection/:recordId(\\d+)')
    .delete(authenticateToken, CollectionsController.deleteCollectionItem)

router //
    .route('/api/users/:userId(\\d+)/wantlist')
    .get(authenticateToken, CollectionsController.readWantlist)

router //
    .route('/api/users/:userId(\\d+)/sync-discogs')
    .post(authenticateToken, CollectionsController.syncWithDiscogs)

export default router;