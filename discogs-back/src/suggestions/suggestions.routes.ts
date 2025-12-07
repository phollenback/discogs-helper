import { Request, Response, Router } from 'express'
import * as SuggestionsController from './suggestions.controllers'
import { authenticateToken } from '../middleware/auth'

const router = Router();

console.log('[SUGGESTIONS ROUTER] Initializing suggestions routes');

router
    .route('/api/suggestions/batch/:userId')
    .get(authenticateToken, SuggestionsController.readSuggestions);

router
    .route('/api/suggestions/:username/styles')
    .get(authenticateToken, SuggestionsController.getUserWantlistStyles);

router
    .route('/api/suggestions/:username/personalized')
    .get(authenticateToken, SuggestionsController.getPersonalizedSuggestions);

// Note: User profile and top releases routes are now in users.routes.ts
// to avoid route conflicts and consolidate all /api/users/* routes

console.log('[SUGGESTIONS ROUTER] Routes registered: /api/suggestions/batch/:userId, /api/suggestions/:username/styles, /api/suggestions/:username/genres, /api/suggestions/:username/personalized');

export default router;