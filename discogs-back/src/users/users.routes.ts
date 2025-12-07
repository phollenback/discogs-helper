import { Request, Response, Router } from 'express'
import * as UserController from './users.controller'
import { authenticateToken, optionalAuth } from '../middleware/auth'
import * as discogsConnector from '../services/discogs.connector'
import * as SuggestionsController from '../suggestions/suggestions.controllers'
import * as UserDao from './users.dao'

const router = Router();

// Public routes - no authentication required
router // Create user (registration)
    .route('/api/users')
    .post(UserController.createUser)

router // Authenticate user (login)
    .route('/api/users/auth')
    .post(UserController.authenticateUser)

// Protected routes - authentication required
router // Get all users (admin only ideally, but protected)
    .route('/api/users')
    .get(optionalAuth, UserController.readUsers)

// Discogs user profile endpoint - PUBLIC (no auth required for viewing)
// MUST come before /:username to avoid route conflict
router
    .route('/api/users/profile/:username')
    .get(async (req: Request, res: Response) => {
        try {
            const username = req.params.username as string;
            console.log(`[users.routes][readUserProfile] PUBLIC: Fetching profile for username: ${username}`);
            
            // Fetch Discogs profile and check database connection status in parallel
            const [userProfile, dbUser] = await Promise.all([
                discogsConnector.gatherUserProfile(username).catch(() => null),
                UserDao.readUserByUsername(username).catch(() => [])
            ]);
            
            // Check if user has Discogs connected in our database
            let discogsConnected = false;
            let publicResources = true; // Default to true
            if (dbUser && Array.isArray(dbUser) && dbUser.length > 0) {
                const user = dbUser[0];
                discogsConnected = !!(user.discogs_token && user.discogs_token_secret);
                publicResources = user.public_resources !== false; // Default to true if null/undefined
            }
            
            // Add connection status and privacy setting to profile response
            const profileResponse = userProfile ? {
                ...userProfile,
                discogs_connected: discogsConnected,
                public_resources: publicResources
            } : {
                username: username,
                discogs_connected: discogsConnected,
                public_resources: publicResources,
                error: 'Could not fetch Discogs profile'
            };
            
            console.log(`[users.routes][readUserProfile] Successfully fetched profile for: ${username}, Discogs connected: ${discogsConnected}`);
            res.status(200).json(profileResponse);
        } catch (error) {
            console.error('[users.routes][readUserProfile][Error] ', error);
            res.status(500).json({
                message: 'There was an error when fetching user profile'
            });
        }
    });

router // Get user by username - PUBLIC (no auth required for viewing)
    .route('/api/users/:username')
    .get(UserController.readUserByUsername)

router // Update user
    .route('/api/users/:username')
    .put(authenticateToken, UserController.updateUser)

router // Delete user
    .route('/api/users/:username')
    .delete(authenticateToken, UserController.deleteUser)

router.post('/api/users/:userId/wantlist/sync', authenticateToken, UserController.syncWantlist);

// Public resources setting endpoint
router.put('/api/users/:userId/public-resources', authenticateToken, UserController.updatePublicResourcesSetting);

// Discogs OAuth endpoints
router.post('/api/users/:userId/discogs/oauth/request', UserController.requestOAuthToken);
router.get('/api/users/:userId/discogs/oauth/status', authenticateToken, UserController.checkOAuthStatus);
// GET callback - handles Discogs redirect directly (backend-only flow)
router.get('/api/users/discogs/oauth/callback', UserController.callbackOAuthGet);
// POST callback - kept for backward compatibility but deprecated
router.post('/api/users/:userId/discogs/oauth/callback', UserController.callbackOAuth);

// Discogs API proxy endpoints (OAuth-protected)
// Collection endpoints
router.get('/api/users/:userId/discogs/proxy/collection/folders/:folderId/releases', authenticateToken, UserController.proxyDiscogsGET);
router.post('/api/users/:userId/discogs/proxy/collection/folders/:folderId/releases/:releaseId', authenticateToken, UserController.proxyDiscogsWrite);
// Wantlist endpoints
router.get('/api/users/:userId/discogs/proxy/wants', authenticateToken, UserController.proxyDiscogsGET);
router.get('/api/users/:userId/discogs/proxy/wantlist', authenticateToken, UserController.proxyDiscogsGET);
router.put('/api/users/:userId/discogs/proxy/wants/:releaseId', authenticateToken, UserController.proxyDiscogsWrite);
router.put('/api/users/:userId/discogs/proxy/wantlist/:releaseId', authenticateToken, UserController.proxyDiscogsWrite);
router.delete('/api/users/:userId/discogs/proxy/wants/:releaseId', authenticateToken, UserController.proxyDiscogsWrite);
router.delete('/api/users/:userId/discogs/proxy/wantlist/:releaseId', authenticateToken, UserController.proxyDiscogsWrite);
// Profile endpoint
router.get('/api/users/:userId/discogs/proxy/profile', authenticateToken, UserController.proxyDiscogsGET);

// Top Releases endpoints (from suggestions module)
router
    .route('/api/users/:username/top-releases')
    .get(SuggestionsController.getTopReleases) // PUBLIC - no auth required to view
    .put(authenticateToken, SuggestionsController.updateTopReleases); // AUTH required to update

// Non-user-specific Discogs API endpoints (use default token)
// These are public endpoints that don't require user OAuth tokens
router.get('/api/discogs/database/search', UserController.searchDiscogs);
router.get('/api/discogs/releases/:id', UserController.getRelease);
router.get('/api/discogs/marketplace/price_suggestions/:releaseId', UserController.getPriceSuggestions);

// Mock meter data endpoint (returns same data for all users)
router.get('/api/meter/mock-data', UserController.getMockMeterData);

export default router;