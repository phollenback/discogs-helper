import { Request, RequestHandler, Response } from 'express'
import * as suggService from './suggestions.services'
import * as UsersDao from '../users/users.dao'

// Helper function to check if user can access the requested resource
const checkUserAccess = (req: Request): boolean => {
    const requestedUserId = parseInt(req.params.userId as string);
    const authenticatedUserId = req.user?.userId;
    
    // Admins can access any user's data
    if (req.user?.isAdmin) {
        return true;
    }
    
    if (!authenticatedUserId || requestedUserId !== authenticatedUserId) {
        return false;
    }
    
    return true;
};

export const readSuggestions : RequestHandler = async (req: Request , res: Response) => {
    try {
        // Check authorization
        if (!checkUserAccess(req)) {
            res.status(403).json({
                message: 'Access forbidden: You can only access your own data'
            });
            return;
        }

        const userId = parseInt(req.params.userId as string);
        const suggestions = await suggService.readSuggestions(userId);
        
        res.status(200).json(suggestions);
    } catch (error) {
        console.error('[suggestions.controller][readSuggestions][Error] ', error);
        res.status(500).json({
            message: 'There was an error when fetching suggestions'
        });
    }
}

export const readUserProfile : RequestHandler = async (req: Request , res: Response) => {
    try {
        const username = req.params.username as string;
        const userProfile = await suggService.getUserProfile(username);
        
        res.status(200).json(userProfile);
    } catch (error) {
        console.error('[suggestions.controller][readUserProfile][Error] ', error);
        res.status(500).json({
            message: 'There was an error when fetching user profile'
        });
    }
}

export const getTopReleases : RequestHandler = async (req: Request , res: Response) => {
    try {
        const username = req.params.username as string;
        const result = await suggService.getUserTopReleases(username);
        
        res.status(200).json(result);
    } catch (error) {
        console.error('[suggestions.controller][getTopReleases][Error] ', error);
        res.status(500).json({
            message: 'There was an error when fetching top releases'
        });
    }
}

export const updateTopReleases : RequestHandler = async (req: Request , res: Response) => {
    try {
        const username = req.params.username as string;
        const { topReleases } = req.body;
        
        // Check if user is updating their own data
        if (req.user?.username !== username) {
            res.status(403).json({
                message: 'Access forbidden: You can only update your own top releases'
            });
            return;
        }
        
        const result = await suggService.updateUserTopReleasesService(username, topReleases);
        res.status(200).json(result);
    } catch (error) {
        console.error('[suggestions.controller][updateTopReleases][Error] ', error);
        
        // Handle validation errors with 400 status
        if (error instanceof Error && (
            error.message.includes('must be an array') ||
            error.message.includes('Maximum 3 releases allowed') ||
            error.message.includes('must have discogsId')
        )) {
            res.status(400).json({
                message: error.message
            });
            return;
        }
        
        res.status(500).json({
            message: 'There was an error when updating top releases'
        });
    }
}

export const getUserWantlistStyles : RequestHandler = async (req: Request , res: Response) => {
    try {
        const username = req.params.username as string;
        const requestingUser = req.user;
        
        // Get user's OAuth tokens if they're requesting their own data
        let userToken: string | undefined;
        let userTokenSecret: string | undefined;
        if (requestingUser && requestingUser.username === username) {
            const userResult = await UsersDao.readUserByUsername(username);
            if (userResult.length > 0) {
                userToken = userResult[0].discogs_token;
                userTokenSecret = userResult[0].discogs_token_secret || undefined;
            }
        }
        
        const result = await suggService.getUserWantlistStyles(username, userToken, userTokenSecret);
        
        res.status(200).json(result);
    } catch (error) {
        console.error('[suggestions.controller][getUserWantlistStyles][Error] ', error);
        res.status(500).json({
            message: 'There was an error when fetching wantlist styles'
        });
    }
}

export const getUserWantlistGenres : RequestHandler = async (req: Request , res: Response) => {
    try {
        console.log('[suggestions.controller][getUserGenres] Fetching genres for username: ', req.params.username);
        const username = req.params.username as string;
        const requestingUser = req.user;
        
        // Get user's OAuth tokens if they're requesting their own data
        let userToken: string | undefined;
        let userTokenSecret: string | undefined;
        if (requestingUser && requestingUser.username === username) {
            const userResult = await UsersDao.readUserByUsername(username);
            if (userResult.length > 0) {
                userToken = userResult[0].discogs_token;
                userTokenSecret = userResult[0].discogs_token_secret || undefined;
            }
        }
        
        const result = await suggService.getUserWantlistGenres(username, userToken, userTokenSecret);
        
        res.status(200).json(result);
    } catch (error) {
        console.error('[suggestions.controller][getUserGenres][Error] ', error);
        res.status(500).json({
            message: 'There was an error when fetching user genres'
        });
    }
}

export const getPersonalizedSuggestions : RequestHandler = async (req: Request , res: Response) => {
    try {
        const username = req.params.username as string;
        const requestingUser = req.user;
        
        // Check if user has OAuth tokens - only call Discogs API if they do
        const userResult = await UsersDao.readUserByUsername(username);
        if (userResult.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const user = userResult[0];
        const hasOAuth = !!(user.discogs_token && user.discogs_token_secret);
        
        if (!hasOAuth) {
            // Non-OAuth user - return empty suggestions instead of calling Discogs API
            console.log(`[suggestions.controller][getPersonalizedSuggestions] Non-OAuth user ${username}, returning empty suggestions`);
            return res.status(200).json({
                suggestions: [],
                count: 0,
                username
            });
        }
        
        // OAuth user - get tokens if they're requesting their own data
        let userToken: string | undefined;
        let userTokenSecret: string | undefined;
        if (requestingUser && requestingUser.username === username) {
            userToken = user.discogs_token;
            userTokenSecret = user.discogs_token_secret || undefined;
        }
        
        const suggestions = await suggService.getPersonalizedSuggestionsService(username, userToken, userTokenSecret);
        
        res.status(200).json({
            suggestions,
            count: suggestions.length,
            username
        });
    } catch (error) {
        console.error('[suggestions.controller][getPersonalizedSuggestions][Error] ', error);
        res.status(500).json({
            message: 'There was an error when fetching personalized suggestions'
        });
    }
}