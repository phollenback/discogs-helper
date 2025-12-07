import { Request, RequestHandler, Response } from 'express'
import * as CollectionDao from './collection.dao'
import * as RecordDao from '../records/records.dao'
import * as UserDao from '../users/users.dao'
import * as DiscogsConnector from '../services/discogs.connector'
import { OkPacket } from 'mysql';
import axios from 'axios';

/**
 * Sanitizes collection/wantlist data for public viewing
 * Removes sensitive information: notes, price_threshold
 * @param items - Array of collection items
 * @param isOwner - Whether the requesting user is the owner
 * @returns Sanitized array of items
 */
const sanitizeCollectionData = (items: any[], isOwner: boolean): any[] => {
    // Ensure items is an array
    if (!Array.isArray(items)) {
        console.warn('[sanitizeCollectionData] items is not an array, returning empty array');
        return [];
    }
    
    if (isOwner) {
        // Owner sees everything
        return items;
    }
    
    // Public view: remove sensitive data
    return items.map(item => {
        const sanitized = { ...item };
        // Remove sensitive fields
        delete sanitized.notes;
        delete sanitized.price_threshold;
        // Keep: discogs_id, title, artist, release_year, genre, styles, 
        //       thumb_url, cover_image_url, rating, ranking, wishlist
        return sanitized;
    });
};

/**
 * Check if two users have a connection (either follows the other)
 * @param userId1 - First user ID (requesting user, may be undefined)
 * @param userId2 - Second user ID (target user)
 * @returns true if users are connected, false otherwise
 */
const checkUserConnection = async (userId1: number | undefined, userId2: number): Promise<boolean> => {
    if (!userId1) return false;
    
    try {
        const { execute } = await import('../services/mysql.connector');
        // Check if either user follows the other (any connection)
        const query = `
            SELECT COUNT(*) as count 
            FROM user_follows 
            WHERE (follower_id = ? AND following_id = ?) 
               OR (follower_id = ? AND following_id = ?)
        `;
        
        const result = await execute<any[]>(query, [userId1, userId2, userId2, userId1]);
        const hasConnection = result[0]?.count >= 1; // At least one direction of following
        
        console.log(`[collection.controller][checkUserConnection] User ${userId1} and ${userId2} connection: ${hasConnection}`);
        return hasConnection;
    } catch (error) {
        console.error('[collection.controller][checkUserConnection][Error]', error);
        return false; // Default to no access on error
    }
};

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

export const readCollection : RequestHandler = async (req: Request , res: Response) => {
    try {
        // Check authorization
        if (!checkUserAccess(req)) {
            res.status(403).json({
                message: 'Access forbidden: You can only access your own data'
            });
            return;
        }

        let records;
        let userId = parseInt(req.params.userId as string);
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
        
        console.log(`[COLLECTION][readCollection] Request for user ID: ${userId} from IP: ${clientIP}`);
        
        records = await CollectionDao.readCollection(userId);
        
        console.log(`[COLLECTION][readCollection] Successfully retrieved ${records.length} collection items for user ID: ${userId}`);
        
        res.status(200).json(
            records
        );
    } catch (error) {
        console.error(`[COLLECTION][readCollection][ERROR] Failed to fetch collection for user ID: ${req.params.userId}:`, error);
        res.status(500).json({
            message: 'There was an error when fetching records'
        });
    }
}

export const readWantlist : RequestHandler = async (req: Request , res: Response) => {
    try {
        // Check authorization
        if (!checkUserAccess(req)) {
            res.status(403).json({
                message: 'Access forbidden: You can only access your own data'
            });
            return;
        }

        let records;
        let userId = parseInt(req.params.userId as string);
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
        
        console.log(`[WANTLIST][readWantlist] Request for user ID: ${userId} from IP: ${clientIP}`);

        records = await CollectionDao.readWantlist(userId);

        console.log(`[WANTLIST][readWantlist] Successfully retrieved ${records.length} wantlist items for user ID: ${userId}`);

        res.status(200).json(
            records
        );
    } catch (error) {
        console.error(`[WANTLIST][readWantlist][ERROR] Failed to fetch wantlist for user ID: ${req.params.userId}:`, error);
        res.status(500).json({
            message: 'There was an error when fetching wantlist'
        });
    }
}

/**
 * Public endpoint: Get collection for any user by username
 * Filters sensitive data (notes, price_threshold) for non-owners
 */
export const readCollectionByUsername: RequestHandler = async (req: Request, res: Response) => {
    try {
        const username = req.params.username as string;
        const requestingUserId = req.user?.userId; // May be undefined for public access
        
        console.log(`[COLLECTION][readCollectionByUsername] Request for username: ${username} from user: ${requestingUserId || 'anonymous'}`);
        
        // Get user ID from username
        const users = await UserDao.readUserByUsername(username);
        if (!users || users.length === 0) {
            console.log(`[COLLECTION][readCollectionByUsername] User not found: ${username}`);
            res.status(404).json({ message: 'User not found' });
            return;
        }
        
        const targetUser = users[0];
        const targetUserId = targetUser.user_id;
        const isOwner = requestingUserId === targetUserId;
        
        // Check privacy setting (default to true if null/undefined)
        const isPublic = targetUser.public_resources !== false;
        
        // If not public, check if requesting user has access
        if (!isPublic && !isOwner) {
            const hasConnection = await checkUserConnection(requestingUserId, targetUserId);
            if (!hasConnection) {
                console.log(`[COLLECTION][readCollectionByUsername] Access denied: User ${username} has private resources and user ${requestingUserId || 'anonymous'} is not connected`);
                return res.status(403).json({ 
                    message: 'This user has made their collection private. You must be connected to view it.' 
                });
            }
            console.log(`[COLLECTION][readCollectionByUsername] Access granted: User ${requestingUserId} is connected to ${username}`);
        }
        
        // Check if user has OAuth tokens
        const hasOAuth = !!(targetUser.discogs_token && targetUser.discogs_token_secret);
        
        console.log(`[COLLECTION][readCollectionByUsername] Fetching collection for user ID: ${targetUserId}, isOwner: ${isOwner}, hasOAuth: ${hasOAuth}, isPublic: ${isPublic}`);
        
        let records: any[] = [];
        
        if (hasOAuth) {
            // OAuth user - fetch from Discogs API (folder 1 = All Items)
            try {
                console.log(`[COLLECTION][readCollectionByUsername] Fetching collection from Discogs API for OAuth user: ${username}`);
                const collectionData = await DiscogsConnector.fetchUserCollectionOAuth(
                    username,
                    1, // Folder 1 = All Items
                    targetUser.discogs_token,
                    targetUser.discogs_token_secret
                );
                
                // Transform Discogs API response to match SQL format
                const releases = collectionData?.releases || [];
                records = releases.map((release: any) => ({
                    user_id: targetUserId,
                    discogs_id: release.id || release.basic_information?.id,
                    title: release.basic_information?.title || release.title || '',
                    artist: release.basic_information?.artists?.[0]?.name || release.artist || '',
                    release_year: release.basic_information?.year || release.year || null,
                    genre: (release.basic_information?.genres || []).join(', ') || release.genre || '',
                    styles: (release.basic_information?.styles || []).join(', ') || release.styles || '',
                    thumb_url: release.basic_information?.thumb || release.thumb || '',
                    cover_image_url: release.basic_information?.cover_image || release.cover_image || '',
                    notes: release.notes || null,
                    price_threshold: null, // Not available from Discogs API
                    rating: release.rating || null,
                    ranking: release.instance_id || null,
                    wishlist: 0
                }));
                
                console.log(`[COLLECTION][readCollectionByUsername] Successfully fetched ${records.length} items from Discogs API for ${username}`);
            } catch (discogsError: any) {
                console.error(`[COLLECTION][readCollectionByUsername] Discogs API error:`, discogsError?.message || discogsError);
                // If Discogs API fails, fall back to SQL database
                console.log(`[COLLECTION][readCollectionByUsername] Falling back to SQL database`);
                const sqlRecords = await CollectionDao.readCollection(targetUserId);
                records = Array.isArray(sqlRecords) ? sqlRecords : [];
            }
        } else {
            // Non-OAuth user - fetch from SQL database
            console.log(`[COLLECTION][readCollectionByUsername] Fetching collection from SQL database for non-OAuth user: ${username}`);
            const sqlRecords = await CollectionDao.readCollection(targetUserId);
            records = Array.isArray(sqlRecords) ? sqlRecords : [];
        }
        
        console.log(`[COLLECTION][readCollectionByUsername] Retrieved ${records.length} collection items for user ID: ${targetUserId}`);
        
        // Sanitize data for public viewing
        const sanitizedRecords = sanitizeCollectionData(records, isOwner);
        
        console.log(`[COLLECTION][readCollectionByUsername] Successfully retrieved ${sanitizedRecords.length} items for ${username} (owner: ${isOwner})`);
        
        res.status(200).json(sanitizedRecords);
    } catch (error: any) {
        console.error(`[COLLECTION][readCollectionByUsername][ERROR] Failed to fetch collection for username: ${req.params.username}:`, error);
        console.error(`[COLLECTION][readCollectionByUsername][ERROR] Error details:`, {
            message: error?.message,
            stack: error?.stack,
            code: error?.code,
            sqlMessage: error?.sqlMessage
        });
        res.status(500).json({
            message: 'There was an error when fetching collection',
            error: process.env.NODE_ENV === 'development' ? error?.message : undefined
        });
    }
};

/**
 * Public endpoint: Get wantlist for any user by username
 * Filters sensitive data (notes, price_threshold) for non-owners
 * For OAuth users, fetches from Discogs API. For non-OAuth users, fetches from SQL database.
 */
export const readWantlistByUsername: RequestHandler = async (req: Request, res: Response) => {
    try {
        const username = req.params.username as string;
        const requestingUserId = req.user?.userId; // May be undefined for public access
        
        console.log(`[WANTLIST][readWantlistByUsername] Request for username: ${username} from user: ${requestingUserId || 'anonymous'}`);
        
        // Get user ID from username
        const users = await UserDao.readUserByUsername(username);
        if (!users || users.length === 0) {
            console.log(`[WANTLIST][readWantlistByUsername] User not found: ${username}`);
            res.status(404).json({ message: 'User not found' });
            return;
        }
        
        const targetUser = users[0];
        const targetUserId = targetUser.user_id;
        const isOwner = requestingUserId === targetUserId;
        
        // Check privacy setting (default to true if null/undefined)
        const isPublic = targetUser.public_resources !== false;
        
        // If not public, check if requesting user has access
        if (!isPublic && !isOwner) {
            const hasConnection = await checkUserConnection(requestingUserId, targetUserId);
            if (!hasConnection) {
                console.log(`[WANTLIST][readWantlistByUsername] Access denied: User ${username} has private resources and user ${requestingUserId || 'anonymous'} is not connected`);
                return res.status(403).json({ 
                    message: 'This user has made their wantlist private. You must be connected to view it.' 
                });
            }
            console.log(`[WANTLIST][readWantlistByUsername] Access granted: User ${requestingUserId} is connected to ${username}`);
        }
        
        // Check if user has OAuth tokens
        const hasOAuth = !!(targetUser.discogs_token && targetUser.discogs_token_secret);
        
        console.log(`[WANTLIST][readWantlistByUsername] Fetching wantlist for user ID: ${targetUserId}, isOwner: ${isOwner}, hasOAuth: ${hasOAuth}, isPublic: ${isPublic}`);
        
        let records: any[] = [];
        
        if (hasOAuth) {
            // OAuth user - fetch from Discogs API
            try {
                console.log(`[WANTLIST][readWantlistByUsername] Fetching wantlist from Discogs API for OAuth user: ${username}`);
                const wantlistData = await DiscogsConnector.fetchUserWantlistOAuth(
                    username,
                    targetUser.discogs_token,
                    targetUser.discogs_token_secret
                );
                
                // Transform Discogs API response to match SQL format
                const wants = wantlistData?.wants || [];
                records = wants.map((want: any) => ({
                    user_id: targetUserId,
                    discogs_id: want.id || want.basic_information?.id,
                    title: want.basic_information?.title || want.title || '',
                    artist: want.basic_information?.artists?.[0]?.name || want.artist || '',
                    release_year: want.basic_information?.year || want.year || null,
                    genre: (want.basic_information?.genres || []).join(', ') || want.genre || '',
                    styles: (want.basic_information?.styles || []).join(', ') || want.styles || '',
                    thumb_url: want.basic_information?.thumb || want.thumb || '',
                    cover_image_url: want.basic_information?.cover_image || want.cover_image || '',
                    notes: want.notes || null,
                    price_threshold: null, // Not available from Discogs API
                    rating: want.rating || null,
                    ranking: null,
                    wishlist: 1
                }));
                
                console.log(`[WANTLIST][readWantlistByUsername] Successfully fetched ${records.length} items from Discogs API for ${username}`);
            } catch (discogsError: any) {
                console.error(`[WANTLIST][readWantlistByUsername] Discogs API error:`, discogsError?.message || discogsError);
                // If Discogs API fails, fall back to SQL database
                console.log(`[WANTLIST][readWantlistByUsername] Falling back to SQL database`);
                const sqlRecords = await CollectionDao.readWantlist(targetUserId);
                records = Array.isArray(sqlRecords) ? sqlRecords : [];
            }
        } else {
            // Non-OAuth user - fetch from SQL database
            console.log(`[WANTLIST][readWantlistByUsername] Fetching wantlist from SQL database for non-OAuth user: ${username}`);
            const sqlRecords = await CollectionDao.readWantlist(targetUserId);
            records = Array.isArray(sqlRecords) ? sqlRecords : [];
        }
        
        console.log(`[WANTLIST][readWantlistByUsername] Retrieved ${records.length} wantlist items for user ID: ${targetUserId}`);
        
        // Sanitize data for public viewing
        const sanitizedRecords = sanitizeCollectionData(records, isOwner);
        
        console.log(`[WANTLIST][readWantlistByUsername] Successfully retrieved ${sanitizedRecords.length} items for ${username} (owner: ${isOwner})`);
        
        res.status(200).json(sanitizedRecords);
    } catch (error: any) {
        console.error(`[WANTLIST][readWantlistByUsername][ERROR] Failed to fetch wantlist for username: ${req.params.username}:`, error);
        console.error(`[WANTLIST][readWantlistByUsername][ERROR] Error details:`, {
            message: error?.message,
            stack: error?.stack,
            code: error?.code,
            sqlMessage: error?.sqlMessage
        });
        res.status(500).json({
            message: 'There was an error when fetching wantlist',
            error: process.env.NODE_ENV === 'development' ? error?.message : undefined
        });
    }
};

export const createCollectionItem : RequestHandler = async (req: Request , res: Response) => {
    try {
        // Check authorization
        if (!checkUserAccess(req)) {
            res.status(403).json({
                message: 'Access forbidden: You can only access your own data'
            });
            return;
        }

        const userId = parseInt(req.body.userId);
        const discogsId = req.body.discogsId ? parseInt(req.body.discogsId) : null;
        
        console.log(`[collection.controller][createCollectionItem] User ${userId} adding item with discogsId: ${discogsId}`);

        // Check if user has OAuth tokens (Discogs connected)
        const users = await UserDao.readUsers();
        const user = users.find(u => u.user_id === userId);
        const hasOAuth = !!(user?.discogs_token && user?.discogs_token_secret);
        const discogsUsername = user?.username;

        console.log(`[collection.controller][createCollectionItem] OAuth status: ${hasOAuth ? 'Connected' : 'Not connected'}`);

        // If user has OAuth and discogsId is provided, sync with Discogs API first
        if (hasOAuth && discogsId && discogsUsername) {
            try {
                console.log(`[collection.controller][createCollectionItem] Syncing with Discogs API for user: ${discogsUsername}, release: ${discogsId}`);
                
                // Prepare data for Discogs API
                const discogsData: any = {};
                if (req.body.rating && parseInt(req.body.rating) > 0) {
                    discogsData.rating = parseInt(req.body.rating);
                }
                if (req.body.notes) {
                    discogsData.notes = req.body.notes;
                }
                
                // Add to Discogs collection (default folder 1 = "All")
                await DiscogsConnector.addToCollectionOAuth(
                    discogsUsername,
                    1, // Default folder ID
                    discogsId,
                    user.discogs_token!,
                    user.discogs_token_secret!,
                    discogsData
                );
                
                console.log(`[collection.controller][createCollectionItem] Successfully synced with Discogs API`);
            } catch (discogsError: any) {
                console.error('[collection.controller][createCollectionItem][Discogs Sync Error]', discogsError);
                
                // Handle specific Discogs API errors
                if (discogsError.response) {
                    const status = discogsError.response.status;
                    const message = discogsError.response.data?.message || discogsError.message;
                    
                    if (status === 401 || status === 403) {
                        res.status(401).json({
                            message: 'Discogs authentication failed. Please reconnect your Discogs account.',
                            error: 'DISCOGS_AUTH_FAILED',
                            discogsId
                        });
                        return;
                    }
                    
                    if (status === 404) {
                        res.status(404).json({
                            message: `Release ${discogsId} not found in Discogs.`,
                            error: 'DISCOGS_RELEASE_NOT_FOUND',
                            discogsId
                        });
                        return;
                    }
                    
                    if (status === 429) {
                        res.status(429).json({
                            message: 'Discogs API rate limit exceeded. Please try again in a moment.',
                            error: 'DISCOGS_RATE_LIMIT',
                            discogsId
                        });
                        return;
                    }
                    
                    if (status === 409) {
                        // Item already in collection - this is OK, continue with MySQL insert
                        console.log(`[collection.controller][createCollectionItem] Release ${discogsId} already in Discogs collection, continuing with MySQL insert`);
                    } else {
                        // Other Discogs errors - log but continue with MySQL insert
                        console.warn(`[collection.controller][createCollectionItem] Discogs API error (${status}): ${message}, continuing with MySQL insert`);
                    }
                } else {
                    // Network or other errors - log but continue with MySQL insert
                    console.warn(`[collection.controller][createCollectionItem] Discogs API error: ${discogsError.message}, continuing with MySQL insert`);
                }
            }
        } else if (hasOAuth && !discogsId) {
            console.log(`[collection.controller][createCollectionItem] User has OAuth but no discogsId provided - saving to MySQL only`);
        } else if (!hasOAuth) {
            console.log(`[collection.controller][createCollectionItem] User not connected to Discogs - saving to MySQL only`);
        }

        // Create or find the record in the records table
        const recordItem = {
            discogsId: discogsId,
            title: req.body.title || '',
            artist: req.body.artist || '',
            releaseYear: req.body.releaseYear ? (parseInt(req.body.releaseYear) || 0).toString() : '0',
            genre: req.body.genre || '',
            styles: req.body.styles || '',
            thumbUrl: req.body.thumbUrl || req.body.thumb || '',
            coverImageUrl: req.body.coverImageUrl || req.body.cover_image || ''
        };
        
        let recordId: number;
        try {
            // Try to upsert the record (will create if doesn't exist, or update if it does)
            const result = await RecordDao.upsertRecord(recordItem);
            // Get the record_id - if discogsId exists, look it up, otherwise use insertId
            if (discogsId) {
                const records = await RecordDao.readRecords();
                const record = records.find((r: any) => r.discogs_id === discogsId);
                recordId = (record as any)?.record_id || record?.recordId || (result as any).insertId;
            } else {
                recordId = (result as any).insertId;
            }
            console.log(`[collection.controller][createCollectionItem] Created/updated record with recordId: ${recordId}`);
        } catch (error) {
            // If record already exists, try to find it
            if (discogsId) {
                const records = await RecordDao.readRecords();
                const record = records.find((r: any) => r.discogs_id === discogsId);
                if (record) {
                    recordId = (record as any).record_id || record.recordId;
                } else {
                    throw error;
                }
            } else {
                throw error;
            }
        }
        
        // Create the user record in MySQL
        const item = {
            userId: userId,
            recordId: recordId,
            discogsId: discogsId,
            title: req.body.title || '',
            artist: req.body.artist || '',
            genres: req.body.genres || '',
            released: req.body.released || '',
            styles: req.body.styles || '',
            notes: req.body.notes || '',
            rating: req.body.rating || '0',
            ranking: req.body.ranking || null,
            priceThreshold: req.body.price_threshold !== undefined ? req.body.price_threshold : '0',
            wishlist: req.body.wishlist || '0'
        };
        
        const okPacket : OkPacket = await CollectionDao.createCollectionItem(item);

        console.log(`[collection.controller][createCollectionItem] Successfully created collection item for user ${userId}`);

        res.status(200).json({
            ...okPacket,
            syncedWithDiscogs: hasOAuth && discogsId ? true : false
        });
    } catch (error) {
        console.error('[collection.controller][createCollectionItem][Error] ', error);
        
        // Provide more specific error messages
        let errorMessage = 'There was an error when writing records';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        
        res.status(500).json({
            message: errorMessage,
            error: 'DATABASE_ERROR'
        });
    }
}

export const readCollectionItem : RequestHandler = async (req: Request , res: Response) => {
    try 
        {
            // Check authorization
            if (!checkUserAccess(req)) {
                res.status(403).json({
                    message: 'Access forbidden: You can only access your own data'
                });
                return;
            }

            // Route constraint ensures userId is numeric, but keep validation for safety
            const recordIdParam = req.params.recordId as string;
            const userIdParam = req.params.userId as string;
            
            // Safety check: if recordId is a known non-numeric value, this route shouldn't match
            // (Route constraint should prevent this, but keeping as safety check)
            if (recordIdParam === 'value' || recordIdParam === 'fields' || recordIdParam === 'releases') {
                console.log(`[collection.controller][readCollectionItem] Route conflict detected: recordId="${recordIdParam}" should be handled by folders router`);
                res.status(404).json({ message: 'Not found' });
                return;
            }

            let record;
            let userId = parseInt(userIdParam); // Route constraint ensures this is numeric
            let discogsId = parseInt(recordIdParam) // Note: route param is recordId but it's actually discogsId
    
            console.log('userID: ' + userId)
            console.log('recordId: ' + recordIdParam);
            console.log('discogsId: ' + discogsId);

            if (isNaN(userId) || isNaN(discogsId)) {
                res.status(400).json({ message: 'Invalid user ID or discogs ID' });
                return;
            }

            record = await CollectionDao.readCollectionItem(userId, discogsId);
    
        res.status(200).json(
            record
        );
        } catch (error) {
            console.error('[records.controller][readRecords][Error] ', error);
            res.status(500).json({
                message: 'There was an error when fetching records by id'
            });
        }
}

export const updateCollectionItem : RequestHandler = async (req: Request , res: Response) => {
    try {
        // Check authorization
        if (!checkUserAccess(req)) {
            res.status(403).json({
                message: 'Access forbidden: You can only access your own data'
            });
            return;
        }

        let userId = parseInt(req.params.userId as string)
        let recordIdParam = parseInt(req.params.recordId as string)
        
        // Check if recordIdParam is actually a discogs_id
        // Discogs IDs are typically large numbers (millions), while record_ids are smaller
        // Try to find the record by discogs_id first
        let actualRecordId = recordIdParam;
        let record = await RecordDao.readRecordByDiscogsId(recordIdParam);
        
        if (record) {
            // Found by discogs_id, use the actual record_id
            actualRecordId = (record as any).record_id || record.recordId || recordIdParam;
            console.log(`[collection.controller][updateCollectionItem] Found record by discogs_id ${recordIdParam}, using record_id ${actualRecordId}`);
        } else {
            // Not found by discogs_id - might be a record_id, or discogs_id for a record that doesn't exist yet
            // If it's a large number (> 1000000), it's likely a discogs_id - fetch from Discogs API and create record
            if (recordIdParam > 1000000) {
                console.log(`[collection.controller][updateCollectionItem] ${recordIdParam} looks like a discogs_id, attempting to create record`);
                
                let releaseData: any = null;
                
                // Try to use release data from request body first (frontend already has it)
                if (req.body.title && req.body.artist) {
                    console.log(`[collection.controller][updateCollectionItem] Using release data from request body`);
                    releaseData = {
                        title: req.body.title,
                        artists: [{ name: req.body.artist }],
                        year: req.body.release_year || req.body.year || 0,
                        genres: req.body.genre ? req.body.genre.split(', ') : [],
                        styles: req.body.styles ? req.body.styles.split(', ') : [],
                        thumb: req.body.thumb_url || '',
                        images: req.body.cover_image_url ? [{ uri: req.body.cover_image_url }] : [],
                        cover_image: req.body.cover_image_url || ''
                    };
                } else {
                    // Fallback: Fetch release data from Discogs API (public endpoint, no auth needed)
                    try {
                        console.log(`[collection.controller][updateCollectionItem] Fetching release ${recordIdParam} from Discogs API`);
                        const discogsResponse = await axios.get(`https://api.discogs.com/releases/${recordIdParam}`, {
                            headers: {
                                'User-Agent': 'Grailtopia/1.0'
                            }
                        });
                        releaseData = discogsResponse.data;
                    } catch (discogsError: any) {
                        console.error(`[collection.controller][updateCollectionItem] Failed to fetch release ${recordIdParam} from Discogs:`, discogsError?.response?.status || discogsError?.message);
                        
                        // If rate limited or other error, return a helpful error message
                        if (discogsError?.response?.status === 429) {
                            res.status(429).json({
                                message: 'Discogs API rate limit exceeded. Please try again in a moment.',
                                error: 'RATE_LIMIT_EXCEEDED',
                                discogs_id: recordIdParam
                            });
                            return;
                        }
                        
                        // If we don't have release data from body or API, we can't create the record
                        res.status(400).json({
                            message: `Cannot create record for discogs_id ${recordIdParam}. Please provide release data (title, artist, etc.) in the request body, or wait for rate limit to reset.`,
                            error: 'RECORD_DATA_REQUIRED',
                            discogs_id: recordIdParam
                        });
                        return;
                    }
                }
                
                if (releaseData) {
                    // Create the record
                    const recordItem = {
                        discogsId: recordIdParam,
                        title: releaseData.title || '',
                        artist: releaseData.artists?.map((a: any) => a.name).join(', ') || '',
                        releaseYear: releaseData.year ? releaseData.year.toString() : '0',
                        genre: releaseData.genres?.join(', ') || '',
                        styles: releaseData.styles?.join(', ') || '',
                        thumbUrl: releaseData.thumb || '',
                        coverImageUrl: releaseData.images?.[0]?.uri || releaseData.cover_image || releaseData.thumb || ''
                    };
                    
                    await RecordDao.upsertRecord(recordItem);
                    
                    // Get the newly created record_id
                    record = await RecordDao.readRecordByDiscogsId(recordIdParam);
                    if (record) {
                        actualRecordId = (record as any).record_id || record.recordId || recordIdParam;
                        console.log(`[collection.controller][updateCollectionItem] Created record with discogs_id ${recordIdParam}, got record_id ${actualRecordId}`);
                    } else {
                        throw new Error('Failed to retrieve created record');
                    }
                }
            }
            // If recordIdParam <= 1000000, assume it's already a record_id and use it directly
        }
        
        // Upsert the user record
        const item = {
            userId,
            recordId: actualRecordId,
            title: '',
            artist: '',
            genres: '',
            released: '',
            styles: '',
            rating: req.body.rating,
            ranking: req.body.ranking !== undefined ? req.body.ranking : null,
            notes: req.body.notes,
            priceThreshold: req.body.price_threshold !== undefined ? req.body.price_threshold : '0',
            wishlist: req.body.wishlist || 0
        };
        const okPacket : OkPacket = await CollectionDao.upsertCollectionItem(item);
        console.log('[collection.controller][updateCollectionItem] Successfully upserted collection item:', okPacket);
        res.status(200).json(okPacket);
    } catch (error) {
        console.error('[collection.controller][updateCollectionItem][Error] ', error);
        res.status(500).json({
            message: 'There was an error when updating records or tracks',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

export const deleteCollectionItem : RequestHandler = async (req: Request , res: Response) => {
    try {
        // Check authorization
        if (!checkUserAccess(req)) {
            res.status(403).json({
                message: 'Access forbidden: You can only access your own data'
            });
            return;
        }

        let userId = parseInt(req.params.userId as string)
        let recordId = parseInt(req.params.recordId as string)

        console.log('user id: ' + userId)
        console.log('record id: ', recordId);
        
        const response = await CollectionDao.deleteCollectionItem(userId, recordId);

        res.status(200).json(
            response
        );
    } catch (error) {
        console.error('[records.controller[deleteRecord][Error] ', error);
        res.status(500).json({
            message: 'There was an error when deleting records'
        });
    }
}

export const syncWithDiscogs : RequestHandler = async (req: Request , res: Response) => {
    try {
        // Check authorization
        if (!checkUserAccess(req)) {
            res.status(403).json({
                message: 'Access forbidden: You can only access your own data'
            });
            return;
        }

        const userId = parseInt(req.params.userId as string);
        const username = req.body.username;
        
        if (!username) {
            res.status(400).json({
                message: 'Discogs username is required'
            });
            return;
        }

        console.log(`Starting Discogs sync for user ${userId} with username ${username}`);

        // Fetch collection from Discogs API
        const collectionResponse = await fetch(`https://api.discogs.com/users/${username}/collection/folders/1/releases?token=sgSOwNnDMKJCOWpLLTdNccwHTAbGVrUZOXjLcqxl`);
        const collectionData = await collectionResponse.json();

        // Fetch wantlist from Discogs API
        const wantlistResponse = await fetch(`https://api.discogs.com/users/${username}/wants?token=sgSOwNnDMKJCOWpLLTdNccwHTAbGVrUZOXjLcqxl`);
        const wantlistData = await wantlistResponse.json();

        let syncedCount = 0;
        let errors: string[] = [];

        // Process collection items
        if (collectionData.releases) {
            for (const item of collectionData.releases) {
                try {
                    const release = item.basic_information;
                    
                    // Create record in records table
                    const recordItem = {
                        discogsId: release.id,
                        title: release.title || '',
                        artist: release.artists?.map((a: any) => a.name).join(', ') || '',
                        releaseYear: release.year ? release.year.toString() : '0',
                        genre: release.genres?.join(', ') || '',
                        styles: release.styles?.join(', ') || '',
                        thumbUrl: release.thumb || '',
                        coverImageUrl: release.cover_image || ''
                    };
                    
                    const createResult = await RecordDao.upsertRecord(recordItem);
                    // Get record_id from the created/updated record
                    const records = await RecordDao.readRecords();
                    const record = records.find((r: any) => r.discogs_id === release.id);
                    const recordId = (record as any)?.record_id || record?.recordId;
                    
                    if (!recordId) {
                        throw new Error(`Failed to get record_id for discogs_id ${release.id}`);
                    }
                    
                    // Create user record
                    const userRecord = {
                        userId: userId,
                        recordId: recordId,
                        discogsId: release.id,
                        title: release.title || '',
                        artist: release.artists?.map((a: any) => a.name).join(', ') || '',
                        genres: release.genres?.join(', ') || '',
                        released: release.year ? release.year.toString() : '0',
                        styles: release.styles?.join(', ') || '',
                        notes: '',
                        rating: null,
                        ranking: null,
                        priceThreshold: '0',
                        wishlist: '0'
                    };
                    
                    await CollectionDao.createCollectionItem(userRecord);
                    syncedCount++;
                } catch (error: any) {
                    console.error(`Error syncing collection item ${item.basic_information.id}:`, error);
                    errors.push(`Collection item ${item.basic_information.id}: ${error.message}`);
                }
            }
        }

        // Process wantlist items
        if (wantlistData.wants) {
            for (const item of wantlistData.wants) {
                try {
                    const release = item.basic_information;
                    
                    // Create record in records table
                    const recordItem = {
                        discogsId: release.id,
                        title: release.title || '',
                        artist: release.artists?.map((a: any) => a.name).join(', ') || '',
                        releaseYear: release.year ? release.year.toString() : '0',
                        genre: release.genres?.join(', ') || '',
                        styles: release.styles?.join(', ') || '',
                        thumbUrl: release.thumb || '',
                        coverImageUrl: release.cover_image || ''
                    };
                    
                    const createResult = await RecordDao.upsertRecord(recordItem);
                    // Get record_id from the created/updated record
                    const records = await RecordDao.readRecords();
                    const record = records.find((r: any) => r.discogs_id === release.id);
                    const recordId = (record as any)?.record_id || record?.recordId;
                    
                    if (!recordId) {
                        throw new Error(`Failed to get record_id for discogs_id ${release.id}`);
                    }
                    
                    // Create user record for wantlist
                    const userRecord = {
                        userId: userId,
                        recordId: recordId,
                        discogsId: release.id,
                        title: release.title || '',
                        artist: release.artists?.map((a: any) => a.name).join(', ') || '',
                        genres: release.genres?.join(', ') || '',
                        released: release.year ? release.year.toString() : '0',
                        styles: release.styles?.join(', ') || '',
                        notes: item.notes || '',
                        rating: null,
                        ranking: null,
                        priceThreshold: item.max_price ? item.max_price.toString() : '0',
                        wishlist: '1'
                    };
                    
                    await CollectionDao.createCollectionItem(userRecord);
                    syncedCount++;
                } catch (error: any) {
                    console.error(`Error syncing wantlist item ${item.basic_information.id}:`, error);
                    errors.push(`Wantlist item ${item.basic_information.id}: ${error.message}`);
                }
            }
        }

        res.status(200).json({
            message: `Successfully synced ${syncedCount} items from Discogs`,
            syncedCount,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('[collection.controller][syncWithDiscogs][Error] ', error);
        res.status(500).json({
            message: 'There was an error syncing with Discogs'
        });
    }
}