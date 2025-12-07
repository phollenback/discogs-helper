import { Request, RequestHandler, Response } from 'express';
import * as DiscogsConnector from '../services/discogs.connector';
import * as UsersDao from '../users/users.dao';

export const getUserFolders: RequestHandler = async (req: Request, res: Response) => {
    console.log('[folders.controller][getUserFolders] Function called');
    try {
        const username = req.params.username as string;
        const requestingUser = req.user;
        
        console.log(`[folders.controller][getUserFolders] Fetching folders for: ${username}`);
        console.log(`[folders.controller][getUserFolders] Requesting user:`, requestingUser);
        
        if (!username) {
            console.log('[folders.controller][getUserFolders] No username provided');
            res.status(400).json({ message: 'Username is required' });
            return;
        }
        
        // Get user's Discogs token from database
        let userToken: string | undefined;
        let userTokenSecret: string | undefined;
        if (requestingUser && requestingUser.username === username) {
            // User is requesting their own folders, use their OAuth tokens if available
            const userResult = await UsersDao.readUserByUsername(username);
            if (userResult.length > 0) {
                userToken = userResult[0].discogs_token;
                userTokenSecret = userResult[0].discogs_token_secret || undefined;
            }
        }
        
        const foldersData = await DiscogsConnector.getUserCollectionFolders(username, userToken, userTokenSecret);
        
        console.log(`[folders.controller][getUserFolders] Successfully fetched folders for: ${username}`);
        
        res.status(200).json({
            folders: foldersData.folders || [],
            pagination: foldersData.pagination || {}
        });
    } catch (error) {
        console.error('[folders.controller][getUserFolders][Error]', error);
        res.status(500).json({
            message: 'There was an error when fetching user folders'
        });
    }
};

export const createUserFolder: RequestHandler = async (req: Request, res: Response) => {
    try {
        const username = req.params.username as string;
        const { name } = req.body;
        const requestingUser = req.user;
        
        console.log(`[folders.controller][createUserFolder] Creating folder "${name}" for: ${username}`);
        
        if (!username || !name) {
            res.status(400).json({ message: 'Username and folder name are required' });
            return;
        }
        
        // Only allow users to create folders for themselves
        if (!requestingUser || requestingUser.username !== username) {
            res.status(403).json({ message: 'You can only create folders for your own collection' });
            return;
        }
        
        // Get user's Discogs token from database
        const userResult = await UsersDao.readUserByUsername(username);
        if (userResult.length === 0 || !userResult[0].discogs_token) {
            res.status(400).json({ message: 'User does not have a Discogs token configured' });
            return;
        }
        
        const folderData = await DiscogsConnector.createUserCollectionFolder(
            username, 
            name, 
            userResult[0].discogs_token,
            userResult[0].discogs_token_secret || undefined
        );
        
        console.log(`[folders.controller][createUserFolder] Successfully created folder for: ${username}`);
        
        res.status(201).json({
            message: 'Folder created successfully',
            folder: folderData
        });
    } catch (error) {
        console.error('[folders.controller][createUserFolder][Error]', error);
        res.status(500).json({
            message: 'There was an error when creating the folder'
        });
    }
};

export const updateUserFolder: RequestHandler = async (req: Request, res: Response) => {
    try {
        const username = req.params.username as string;
        const folderId = parseInt(req.params.folderId as string);
        const { name } = req.body;
        const requestingUser = req.user;
        
        console.log(`[folders.controller][updateUserFolder] Updating folder ${folderId} for: ${username}`);
        
        if (!username || !folderId || !name) {
            res.status(400).json({ message: 'Username, folder ID, and folder name are required' });
            return;
        }
        
        // Only allow users to update their own folders
        if (!requestingUser || requestingUser.username !== username) {
            res.status(403).json({ message: 'You can only update your own folders' });
            return;
        }
        
        // Get user's Discogs token from database
        const userResult = await UsersDao.readUserByUsername(username);
        if (userResult.length === 0 || !userResult[0].discogs_token) {
            res.status(400).json({ message: 'User does not have a Discogs token configured' });
            return;
        }
        
        const folderData = await DiscogsConnector.updateUserCollectionFolder(
            username, 
            folderId, 
            name, 
            userResult[0].discogs_token,
            userResult[0].discogs_token_secret || undefined
        );
        
        console.log(`[folders.controller][updateUserFolder] Successfully updated folder ${folderId} for: ${username}`);
        
        res.status(200).json({
            message: 'Folder updated successfully',
            folder: folderData
        });
    } catch (error) {
        console.error('[folders.controller][updateUserFolder][Error]', error);
        res.status(500).json({
            message: 'There was an error when updating the folder'
        });
    }
};

export const deleteUserFolder: RequestHandler = async (req: Request, res: Response) => {
    try {
        const username = req.params.username as string;
        const folderId = parseInt(req.params.folderId as string);
        const requestingUser = req.user;
        
        console.log(`[folders.controller][deleteUserFolder] Deleting folder ${folderId} for: ${username}`);
        
        if (!username || !folderId) {
            res.status(400).json({ message: 'Username and folder ID are required' });
            return;
        }
        
        // Only allow users to delete their own folders
        if (!requestingUser || requestingUser.username !== username) {
            res.status(403).json({ message: 'You can only delete your own folders' });
            return;
        }
        
        // Get user's Discogs token from database
        const userResult = await UsersDao.readUserByUsername(username);
        if (userResult.length === 0 || !userResult[0].discogs_token) {
            res.status(400).json({ message: 'User does not have a Discogs token configured' });
            return;
        }
        
        await DiscogsConnector.deleteUserCollectionFolder(
            username, 
            folderId, 
            userResult[0].discogs_token,
            userResult[0].discogs_token_secret || undefined
        );
        
        console.log(`[folders.controller][deleteUserFolder] Successfully deleted folder ${folderId} for: ${username}`);
        
        res.status(200).json({
            message: 'Folder deleted successfully'
        });
    } catch (error) {
        console.error('[folders.controller][deleteUserFolder][Error]', error);
        res.status(500).json({
            message: 'There was an error when deleting the folder'
        });
    }
};

export const addReleaseToFolder: RequestHandler = async (req: Request, res: Response) => {
    try {
        const username = req.params.username as string;
        const folderId = parseInt(req.params.folderId as string);
        const releaseId = parseInt(req.params.releaseId as string);
        const requestingUser = req.user;
        
        console.log(`[folders.controller][addReleaseToFolder] Adding release ${releaseId} to folder ${folderId} for: ${username}`);
        
        if (!username || !folderId || !releaseId) {
            res.status(400).json({ message: 'Username, folder ID, and release ID are required' });
            return;
        }
        
        // Only allow users to modify their own folders
        if (!requestingUser || requestingUser.username !== username) {
            res.status(403).json({ message: 'You can only modify your own folders' });
            return;
        }
        
        // Get user's Discogs token from database
        const userResult = await UsersDao.readUserByUsername(username);
        if (userResult.length === 0 || !userResult[0].discogs_token) {
            res.status(400).json({ message: 'User does not have a Discogs token configured' });
            return;
        }
        
        const result = await DiscogsConnector.addReleaseToFolder(
            username, 
            folderId, 
            releaseId, 
            userResult[0].discogs_token,
            userResult[0].discogs_token_secret || undefined
        );
        
        console.log(`[folders.controller][addReleaseToFolder] Successfully added release ${releaseId} to folder ${folderId} for: ${username}`);
        
        res.status(200).json({
            message: 'Release added to folder successfully',
            result: result
        });
    } catch (error) {
        console.error('[folders.controller][addReleaseToFolder][Error]', error);
        res.status(500).json({
            message: 'There was an error when adding release to folder'
        });
    }
};

export const moveReleaseBetweenFolders: RequestHandler = async (req: Request, res: Response) => {
    try {
        const username = req.params.username as string;
        const releaseId = parseInt(req.params.releaseId as string);
        const { fromFolderId, toFolderId, instanceId } = req.body;
        const requestingUser = req.user;
        
        console.log(`[folders.controller][moveReleaseBetweenFolders] Moving release ${releaseId} instance ${instanceId} from folder ${fromFolderId} to ${toFolderId} for: ${username}`);
        
        if (!username || !releaseId || !fromFolderId || !toFolderId) {
            res.status(400).json({ message: 'Username, release ID, from folder ID, and to folder ID are required' });
            return;
        }
        
        // Only allow users to modify their own folders
        if (!requestingUser || requestingUser.username !== username) {
            res.status(403).json({ message: 'You can only modify your own folders' });
            return;
        }
        
        // Get user's Discogs OAuth tokens from database
        const userResult = await UsersDao.readUserByUsername(username);
        if (userResult.length === 0 || !userResult[0].discogs_token) {
            res.status(400).json({ message: 'User does not have a Discogs token configured' });
            return;
        }
        
        // If instanceId not provided, try to get it from release instances
        let actualInstanceId = instanceId;
        if (!actualInstanceId) {
            try {
                const instances = await DiscogsConnector.getReleaseInstances(
                    username, 
                    releaseId, 
                    userResult[0].discogs_token,
                    userResult[0].discogs_token_secret || undefined
                );
                // Find instance in the fromFolderId
                const instance = instances.instances?.find((inst: any) => inst.folder_id === fromFolderId);
                if (instance && instance.instance_id) {
                    actualInstanceId = instance.instance_id;
                } else {
                    res.status(400).json({ message: 'Instance ID is required. Could not find instance in source folder.' });
                    return;
                }
            } catch (error) {
                console.error('[folders.controller][moveReleaseBetweenFolders] Error fetching instances:', error);
                res.status(400).json({ message: 'Instance ID is required' });
                return;
            }
        }
        
        const result = await DiscogsConnector.moveReleaseBetweenFolders(
            username, 
            releaseId, 
            fromFolderId, 
            toFolderId, 
            userResult[0].discogs_token,
            userResult[0].discogs_token_secret || undefined,
            actualInstanceId
        );
        
        console.log(`[folders.controller][moveReleaseBetweenFolders] Successfully moved release ${releaseId} for: ${username}`);
        
        res.status(200).json({
            message: 'Release moved between folders successfully',
            result: result
        });
    } catch (error) {
        console.error('[folders.controller][moveReleaseBetweenFolders][Error]', error);
        res.status(500).json({
            message: 'There was an error when moving release between folders'
        });
    }
};

// ===============================================
// ADDITIONAL COLLECTION MANAGEMENT ENDPOINTS
// ===============================================

export const getFolderMetadata: RequestHandler = async (req: Request, res: Response) => {
    try {
        const username = req.params.username as string;
        const folderId = parseInt(req.params.folderId as string);
        const requestingUser = req.user;
        
        console.log(`[folders.controller][getFolderMetadata] Fetching folder ${folderId} metadata for: ${username}`);
        
        if (!username || !folderId) {
            res.status(400).json({ message: 'Username and folder ID are required' });
            return;
        }
        
        // Get user's Discogs token from database if authenticated as the user
        let userToken: string | undefined;
        let userTokenSecret: string | undefined;
        if (requestingUser && requestingUser.username === username) {
            const userResult = await UsersDao.readUserByUsername(username);
            if (userResult.length > 0) {
                userToken = userResult[0].discogs_token;
                userTokenSecret = userResult[0].discogs_token_secret || undefined;
            }
        }
        
        const folderData = await DiscogsConnector.getFolderMetadata(username, folderId, userToken, userTokenSecret);
        
        console.log(`[folders.controller][getFolderMetadata] Successfully fetched folder ${folderId} metadata for: ${username}`);
        
        res.status(200).json(folderData);
    } catch (error) {
        console.error('[folders.controller][getFolderMetadata][Error]', error);
        res.status(500).json({
            message: 'There was an error when fetching folder metadata'
        });
    }
};

export const getFolderItems: RequestHandler = async (req: Request, res: Response) => {
    try {
        const username = req.params.username as string;
        const folderId = parseInt(req.params.folderId as string);
        const requestingUser = req.user;
        
        console.log(`[folders.controller][getFolderItems] Fetching items from folder ${folderId} for: ${username}`);
        
        if (!username || !folderId) {
            res.status(400).json({ message: 'Username and folder ID are required' });
            return;
        }
        
        // Get user's Discogs token from database if authenticated as the user
        let userToken: string | undefined;
        let userTokenSecret: string | undefined;
        if (requestingUser && requestingUser.username === username) {
            const userResult = await UsersDao.readUserByUsername(username);
            if (userResult.length > 0) {
                userToken = userResult[0].discogs_token;
                userTokenSecret = userResult[0].discogs_token_secret || undefined;
            }
        }
        
        // Extract query parameters for sorting and pagination
        const options = {
            sort: req.query.sort as string,
            sort_order: req.query.sort_order as string,
            page: req.query.page ? parseInt(req.query.page as string) : undefined,
            per_page: req.query.per_page ? parseInt(req.query.per_page as string) : undefined
        };
        
        const itemsData = await DiscogsConnector.getFolderItems(username, folderId, options, userToken, userTokenSecret);
        
        console.log(`[folders.controller][getFolderItems] Successfully fetched items from folder ${folderId} for: ${username}`);
        
        res.status(200).json(itemsData);
    } catch (error) {
        console.error('[folders.controller][getFolderItems][Error]', error);
        res.status(500).json({
            message: 'There was an error when fetching folder items'
        });
    }
};

export const getReleaseInstances: RequestHandler = async (req: Request, res: Response) => {
    try {
        const username = req.params.username as string;
        const releaseId = parseInt(req.params.releaseId as string);
        const requestingUser = req.user;
        
        console.log(`[folders.controller][getReleaseInstances] Fetching release ${releaseId} instances for: ${username}`);
        
        if (!username || !releaseId) {
            res.status(400).json({ message: 'Username and release ID are required' });
            return;
        }
        
        // Get user's Discogs token from database if authenticated as the user
        let userToken: string | undefined;
        let userTokenSecret: string | undefined;
        if (requestingUser && requestingUser.username === username) {
            const userResult = await UsersDao.readUserByUsername(username);
            if (userResult.length > 0) {
                userToken = userResult[0].discogs_token;
                userTokenSecret = userResult[0].discogs_token_secret || undefined;
            }
        }
        
        const instancesData = await DiscogsConnector.getReleaseInstances(username, releaseId, userToken, userTokenSecret);
        
        console.log(`[folders.controller][getReleaseInstances] Successfully fetched release ${releaseId} instances for: ${username}`);
        
        res.status(200).json(instancesData);
    } catch (error) {
        console.error('[folders.controller][getReleaseInstances][Error]', error);
        res.status(500).json({
            message: 'There was an error when fetching release instances'
        });
    }
};

export const updateReleaseInstance: RequestHandler = async (req: Request, res: Response) => {
    try {
        const username = req.params.username as string;
        const folderId = parseInt(req.params.folderId as string);
        const releaseId = parseInt(req.params.releaseId as string);
        const instanceId = parseInt(req.params.instanceId as string);
        const requestingUser = req.user;
        
        console.log(`[folders.controller][updateReleaseInstance] Updating instance ${instanceId} of release ${releaseId} for: ${username}`);
        
        if (!username || !folderId || !releaseId || !instanceId) {
            res.status(400).json({ message: 'Username, folder ID, release ID, and instance ID are required' });
            return;
        }
        
        // Only allow users to modify their own collection
        if (!requestingUser || requestingUser.username !== username) {
            res.status(403).json({ message: 'You can only modify your own collection' });
            return;
        }
        
        // Get user's Discogs token from database
        const userResult = await UsersDao.readUserByUsername(username);
        if (userResult.length === 0 || !userResult[0].discogs_token) {
            res.status(400).json({ message: 'User does not have a Discogs token configured' });
            return;
        }
        
        const result = await DiscogsConnector.updateReleaseInstance(
            username, 
            folderId, 
            releaseId, 
            instanceId, 
            req.body, 
            userResult[0].discogs_token,
            userResult[0].discogs_token_secret || undefined
        );
        
        console.log(`[folders.controller][updateReleaseInstance] Successfully updated instance ${instanceId} for: ${username}`);
        
        res.status(200).json({
            message: 'Release instance updated successfully',
            result: result
        });
    } catch (error) {
        console.error('[folders.controller][updateReleaseInstance][Error]', error);
        res.status(500).json({
            message: 'There was an error when updating release instance'
        });
    }
};

export const deleteReleaseInstance: RequestHandler = async (req: Request, res: Response) => {
    try {
        const username = req.params.username as string;
        const folderId = parseInt(req.params.folderId as string);
        const releaseId = parseInt(req.params.releaseId as string);
        const instanceId = parseInt(req.params.instanceId as string);
        const requestingUser = req.user;
        
        console.log(`[folders.controller][deleteReleaseInstance] Deleting instance ${instanceId} of release ${releaseId} for: ${username}`);
        
        if (!username || !folderId || !releaseId || !instanceId) {
            res.status(400).json({ message: 'Username, folder ID, release ID, and instance ID are required' });
            return;
        }
        
        // Only allow users to modify their own collection
        if (!requestingUser || requestingUser.username !== username) {
            res.status(403).json({ message: 'You can only modify your own collection' });
            return;
        }
        
        // Get user's Discogs token from database
        const userResult = await UsersDao.readUserByUsername(username);
        if (userResult.length === 0 || !userResult[0].discogs_token) {
            res.status(400).json({ message: 'User does not have a Discogs token configured' });
            return;
        }
        
        await DiscogsConnector.deleteReleaseInstance(
            username, 
            folderId, 
            releaseId, 
            instanceId, 
            userResult[0].discogs_token,
            userResult[0].discogs_token_secret || undefined
        );
        
        console.log(`[folders.controller][deleteReleaseInstance] Successfully deleted instance ${instanceId} for: ${username}`);
        
        res.status(200).json({
            message: 'Release instance deleted successfully'
        });
    } catch (error) {
        console.error('[folders.controller][deleteReleaseInstance][Error]', error);
        res.status(500).json({
            message: 'There was an error when deleting release instance'
        });
    }
};

export const getCollectionValue: RequestHandler = async (req: Request, res: Response) => {
    try {
        const username = req.params.username as string;
        const requestingUser = req.user;
        
        console.log(`[folders.controller][getCollectionValue] Fetching collection value for: ${username}`);
        
        if (!username) {
            res.status(400).json({ message: 'Username is required' });
            return;
        }
        
        // Only allow users to view their own collection value (requires authentication)
        if (!requestingUser || requestingUser.username !== username) {
            res.status(403).json({ message: 'You can only view your own collection value' });
            return;
        }
        
        // Get user's Discogs token from database
        const userResult = await UsersDao.readUserByUsername(username);
        if (userResult.length === 0) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        
        const user = userResult[0];
        const hasOAuth = !!(user.discogs_token && user.discogs_token_secret);
        
        if (hasOAuth) {
            // OAuth user - use Discogs API
            console.log(`[folders.controller][getCollectionValue] OAuth user - fetching from Discogs API`);
            const valueData = await DiscogsConnector.getCollectionValue(
                username, 
                user.discogs_token,
                user.discogs_token_secret || undefined
            );
            
            console.log(`[folders.controller][getCollectionValue] Successfully fetched collection value for: ${username}`);
            res.status(200).json(valueData);
        } else {
            // Non-OAuth user - use public API with default token
            console.log(`[folders.controller][getCollectionValue] Non-OAuth user - using public API`);
            try {
                // Use public API with default token for collection value
                const valueData = await DiscogsConnector.getCollectionValue(
                    username,
                    undefined, // Will use default token from connector
                    undefined
                );
                res.status(200).json(valueData);
            } catch (error: any) {
                // If public API fails, return zeros
                console.warn('[folders.controller][getCollectionValue] Public API failed, returning zeros:', error?.message || error);
                res.status(200).json({
                    minimum: 0,
                    median: 0,
                    maximum: 0
                });
            }
        }
    } catch (error: any) {
        console.error('[folders.controller][getCollectionValue][Error]', error);
        console.error('[folders.controller][getCollectionValue][Error Details]', {
            message: error?.message,
            stack: error?.stack,
            response: error?.response?.data,
            status: error?.response?.status
        });
        
        // Pass through the error message from the connector if available
        const errorMessage = error?.message || 'There was an error when fetching collection value';
        
        // Determine appropriate status code based on error type
        let statusCode = 500;
        if (errorMessage.includes('authentication failed') || errorMessage.includes('401') || errorMessage.includes('403')) {
            statusCode = 401;
        } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
            statusCode = 404;
        }
        
        res.status(statusCode).json({
            message: errorMessage
        });
    }
};

export const getCollectionFields: RequestHandler = async (req: Request, res: Response) => {
    try {
        const username = req.params.username as string;
        const requestingUser = req.user;
        
        console.log(`[folders.controller][getCollectionFields] Fetching collection fields for: ${username}`);
        
        if (!username) {
            res.status(400).json({ message: 'Username is required' });
            return;
        }
        
        // Get user's Discogs token from database if authenticated as the user
        let userToken: string | undefined;
        let userTokenSecret: string | undefined;
        if (requestingUser && requestingUser.username === username) {
            const userResult = await UsersDao.readUserByUsername(username);
            if (userResult.length > 0) {
                userToken = userResult[0].discogs_token;
                userTokenSecret = userResult[0].discogs_token_secret || undefined;
            }
        }
        
        const fieldsData = await DiscogsConnector.getCollectionFields(username, userToken, userTokenSecret);
        
        console.log(`[folders.controller][getCollectionFields] Successfully fetched collection fields for: ${username}`);
        
        res.status(200).json(fieldsData);
    } catch (error) {
        console.error('[folders.controller][getCollectionFields][Error]', error);
        res.status(500).json({
            message: 'There was an error when fetching collection fields'
        });
    }
};
