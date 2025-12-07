import { Request, RequestHandler, Response } from 'express'
import { OkPacket } from 'mysql';
import * as UserDao from './users.dao'
import { execute } from '../services/mysql.connector';
import { generateToken } from '../utils/jwt';
import axios from 'axios';
import * as OAuthUtils from '../utils/oauth';

// Temporary storage for OAuth request tokens (request token -> { userId, requestTokenSecret })
// This is cleared after callback completes or expires after 10 minutes
const oauthRequestTokenCache = new Map<string, { userId: number; requestTokenSecret: string; timestamp: number }>();
const OAUTH_TOKEN_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// Clean up expired tokens periodically
const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [token, data] of oauthRequestTokenCache.entries()) {
        if (now - data.timestamp > OAUTH_TOKEN_EXPIRY_MS) {
            oauthRequestTokenCache.delete(token);
        }
    }
}, 60000); // Check every minute

// Use unref() to allow Node.js to exit even if this interval is still running
// This prevents Jest from hanging on open handles
cleanupInterval.unref();

// Helper function to check if user can access the requested resource by username
const checkUserAccessByUsername = (req: Request): boolean => {
    const requestedUsername = req.params.username as string;
    const authenticatedUsername = req.user?.username;
    
    // Admins can access any user's data
    if (req.user?.isAdmin) {
        return true;
    }
    
    if (!authenticatedUsername || requestedUsername !== authenticatedUsername) {
        return false;
    }
    
    return true;
};

// Helper function to check if user can access the requested resource by userId
const checkUserAccessByUserId = (req: Request): boolean => {
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

export const readUsers : RequestHandler = async (req: Request , res: Response) => {
    try {
        // This endpoint returns ALL users - should be admin-only
        // For now, only allow authenticated users to see basic user list
        console.log('[AUTH][readUsers] Fetching all users from database');
        let users;

        users = await UserDao.readUsers();
        
        // Remove sensitive information (passwords) before sending
        const sanitizedUsers = users.map(user => ({
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            user_image: user.user_image || null,
            public_resources: user.public_resources !== false // Default to true if null/undefined
        }));
        
        console.log(`[AUTH][readUsers] Successfully fetched ${sanitizedUsers.length} users from database`);
        res.status(200).json(
            sanitizedUsers
        );
    } catch (error: any) {
        console.error('[AUTH][readUsers][ERROR] Failed to fetch users:', error);
        console.error('[AUTH][readUsers][ERROR] Error details:', {
            message: error?.message,
            code: error?.code,
            stack: error?.stack
        });
        res.status(500).json({
            message: 'There was an error when fetching records',
            error: process.env.NODE_ENV === 'development' ? error?.message : undefined
        })
    }
}

export const createUser : RequestHandler = async (req: Request , res: Response) => {
    try {
        const { username, email, password, user_image } = req.body;

        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({
                message: 'Username, email, and password are required'
            });
        }

        // Normalize user_image: convert empty strings to null, trim whitespace
        const normalizedUserImage = (typeof user_image === 'string' && user_image.trim()) || null;

        const okPacket : OkPacket = await UserDao.createUser({
            username,
            email,
            password,
            user_image: normalizedUserImage
        });

        console.log('[users.controller][createUser] User created:', okPacket);

        // Return user info including userId for OAuth flow
        res.status(200).json({
            message: 'User created successfully',
            userId: okPacket.insertId,
            username,
            email
        });
    } catch (error) {
        console.error('[users.controller][createUser][Error] ', error);
        
        // Handle duplicate username/email errors
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                message: 'Username or email already exists'
            });
        }
        
        res.status(500).json({
            message: 'There was an error when creating user'
        });
    }
}

export const readUserByUsername : RequestHandler = async (req: Request , res: Response) => {
    try {
        // Public endpoint - anyone can view user profiles (social platform)
        let user;
        let username = req.params.username as string

        console.log(`[users.controller][readUserByUsername] Fetching user: ${username}`);
        user = await UserDao.readUserByUsername(username);
        
        // Remove sensitive information (password) before sending
        if (user && user.length > 0) {
            const sanitizedUser = {
                username: user[0].username,
                email: user[0].email,
                public_resources: user[0].public_resources !== false // Default to true if null/undefined
                // Don't send password
            };
            res.status(200).json(sanitizedUser);
        } else {
            res.status(404).json({
                message: 'User not found'
            });
        }
    } catch (error) {
        console.error('[users.controller][readUserByUsername][Error] ', error);
        res.status(500).json({
            message: 'There was an error when fetching user'
        });
    }
}

export const updateUser : RequestHandler = async (req: Request , res: Response) => {
    try {
        // Check authorization
        if (!checkUserAccessByUsername(req)) {
            return res.status(403).json({
                message: 'Access forbidden: You can only update your own account'
            });
        }

        let username = req.params.username as string

        const okPacket : OkPacket = await UserDao.updateUser(req.body, username);
        
        res.status(200).json(
            okPacket
        );
    } catch (error) {
        console.error('[records.controller][readRecords][Error] ', error);
        res.status(500).json({
            message: 'There was an error when fetching records'
        })
    }
}

export const deleteUser : RequestHandler = async (req: Request , res: Response) => {
    try {
        // Check authorization
        if (!checkUserAccessByUsername(req)) {
            return res.status(403).json({
                message: 'Access forbidden: You can only delete your own account'
            });
        }

        let username = req.params.username as string

        const okPacket : OkPacket = await UserDao.deleteUser(username);
        
        res.status(200).json(
            okPacket
        );
    } catch (error) {
        console.error('[records.controller][readRecords][Error] ', error);
        res.status(500).json({
            message: 'There was an error when fetching records'
        })
    }
}

export const authenticateUser: RequestHandler = async (req, res) => {
    const { email, password } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    console.log(`[AUTH][authenticateUser] Login attempt from IP: ${clientIP}`);
    console.log(`[AUTH][authenticateUser] User-Agent: ${userAgent}`);
    console.log(`[AUTH][authenticateUser] Email: ${email ? email.substring(0, 3) + '***' : 'none'}`);
    
    if (!email || !password) {
        console.log(`[AUTH][authenticateUser][FAILED] Missing credentials - Email: ${!!email}, Password: ${!!password}`);
        res.status(400).json({ message: 'Email and password required.' });
        return;
    }
    
    try {
        console.log(`[AUTH][authenticateUser] Looking up user by email: ${email}`);
        // Find user by email
        const users = await UserDao.readUsers();
        // The DB returns user_id, username, email, password, created_at
        const user = users.find(u => u.email === email);
        
        if (!user) {
            console.log(`[AUTH][authenticateUser][FAILED] User not found for email: ${email}`);
            res.status(401).json({ message: 'Invalid credentials.' });
            return;
        }
        
        console.log(`[AUTH][authenticateUser] User found - ID: ${user.user_id}, Username: ${user.username}`);
        console.log(`[AUTH][authenticateUser] User is_admin field:`, user.is_admin);
        
        // Plain text password check (not secure, but matches your DB)
        // If you later hash passwords, use bcrypt.compare here
        const valid = password === user.password;
        
        if (!valid) {
            console.log(`[AUTH][authenticateUser][FAILED] Invalid password for user: ${user.username} (ID: ${user.user_id})`);
            res.status(401).json({ message: 'Invalid credentials.' });
            return;
        }
        
        console.log(`[AUTH][authenticateUser][SUCCESS] Password validated for user: ${user.username} (ID: ${user.user_id})`);
        console.log('user.is_admin', user.is_admin);
        // Generate JWT token
        const token = generateToken({
            userId: user.user_id,
            username: user.username,
            email: user.email,
            isAdmin: user.is_admin || false
        });
        
        console.log(`[AUTH][authenticateUser][SUCCESS] JWT token generated for user: ${user.username} (ID: ${user.user_id})`);
        console.log(`[AUTH][authenticateUser][SUCCESS] User isAdmin status: ${user.is_admin || false}`);
        console.log(`[AUTH][authenticateUser][SUCCESS] Login completed successfully for: ${user.username} (ID: ${user.user_id}) from IP: ${clientIP}`);

        // Return user info (omit password)
        // Convert is_admin (which might be 0/1 from MySQL) to boolean
        const isAdmin = Boolean(user.is_admin);
        
        res.status(200).json({
            message: 'Login successful',
            user: {
                userId: user.user_id, // match frontend expectation
                username: user.username,
                email: user.email,
                isAdmin: isAdmin
            },
            token: token
        });
        
        console.log(`[AUTH][authenticateUser][SUCCESS] Returning isAdmin as boolean: ${isAdmin}`);
    } catch (error: any) {
        console.error(`[AUTH][authenticateUser][ERROR] Server error during authentication for email: ${email}:`, error);
        console.error(`[AUTH][authenticateUser][ERROR] Error stack:`, error?.stack);
        console.error(`[AUTH][authenticateUser][ERROR] Error message:`, error?.message);
        console.error(`[AUTH][authenticateUser][ERROR] Error code:`, error?.code);
        res.status(500).json({ 
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error?.message : undefined
        });
    }
};

export const syncWantlist: RequestHandler = async (req, res) => {
    try {
        // Check authorization
        if (!checkUserAccessByUserId(req)) {
            return res.status(403).json({
                message: 'Access forbidden: You can only sync your own wantlist'
            });
        }

        const userId = parseInt(req.params.userId, 10);
        const wantlist = req.body; // Array of wantlist items
        
        // Remove all user_records for this user
        await execute('DELETE FROM user_records WHERE user_id = ?', [userId]);
        // Insert all wantlist items
        for (const item of wantlist) {
            // Find or create the record
            // Production database uses discogs_id directly in user_records
            if (item.discogs_id) {
                await execute(
                    'INSERT INTO user_records (user_id, discogs_id, rating, notes, price_threshold, wishlist) VALUES (?, ?, ?, ?, ?, ?)',
                    [userId, item.discogs_id, item.rating || 0, item.notes || '', item.price_threshold || 0, 1]
                );
            } else {
                // Manual record - would need to create it first
                console.warn('Manual records in wantlist sync not yet supported');
                continue;
            }
        }
        res.status(200).json({ message: 'Wantlist synced!' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to sync wantlist.' });
    }
};

// Discogs OAuth 1.0a Flow
export const requestOAuthToken: RequestHandler = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        console.log(`[users.controller][requestOAuthToken] Start OAuth token request for userId: ${userId}`);

        // Get Discogs consumer key and secret from environment
        const consumerKey = process.env.DISCOGS_CONSUMER_KEY;
        const consumerSecret = process.env.DISCOGS_CONSUMER_SECRET;
        // Default to localhost for EC2 production, can be overridden for docker-compose
        const callbackUrl = process.env.DISCOGS_OAUTH_CALLBACK_URL || 'http://localhost:3001/api/users/discogs/oauth/callback';
        console.log(`[users.controller][requestOAuthToken] Loaded consumerKey: ${!!consumerKey}, consumerSecret: ${!!consumerSecret}, callbackUrl: ${callbackUrl}`);

        if (!consumerKey || !consumerSecret) {
            console.error('[users.controller][requestOAuthToken] Missing DISCOGS_CONSUMER_KEY or DISCOGS_CONSUMER_SECRET');
            return res.status(500).json({
                message: 'OAuth configuration error'
            });
        }

        // Use the explicit callback URL from environment
        const callback = callbackUrl;
        console.log(`[users.controller][requestOAuthToken] Computed backend callback URL: ${callback}`);

        // Generate OAuth parameters
        const oauthParams: Record<string, string> = {
            oauth_consumer_key: consumerKey,
            oauth_nonce: OAuthUtils.generateNonce(),
            oauth_signature_method: 'HMAC-SHA1',
            oauth_timestamp: OAuthUtils.generateTimestamp(),
            oauth_version: '1.0',
            oauth_callback: callback
        };
        console.log('[users.controller][requestOAuthToken] Generated initial OAuth params:', JSON.stringify(oauthParams));

        // Generate signature
        const requestTokenUrl = 'https://api.discogs.com/oauth/request_token';
        oauthParams.oauth_signature = OAuthUtils.generateOAuthSignature(
            'POST',
            requestTokenUrl,
            oauthParams,
            consumerSecret
        );
        console.log('[users.controller][requestOAuthToken] OAuth signature generated:', oauthParams.oauth_signature);

        // Make request to Discogs
        const authHeader = OAuthUtils.generateOAuthHeader(oauthParams);
        console.log('[users.controller][requestOAuthToken] OAuth Authorization header:', authHeader);

        console.log(`[users.controller][requestOAuthToken] Requesting token from Discogs for userId: ${userId}`);
        let response;
        try {
            response = await axios.post(requestTokenUrl, {}, {
                headers: {
                    'Authorization': authHeader
                }
            });
            console.log('[users.controller][requestOAuthToken] Got response from Discogs:', response.data);
        } catch (err) {
            console.error('[users.controller][requestOAuthToken][axios.post Error] Failed to fetch Discogs request_token:', err?.response?.data || err);
            throw err;
        }

        // Parse response (format: oauth_token=xxx&oauth_token_secret=yyy)
        const responseParams = new URLSearchParams(response.data);
        const requestToken = responseParams.get('oauth_token');
        const requestTokenSecret = responseParams.get('oauth_token_secret');
        console.log(`[users.controller][requestOAuthToken] Parsed tokens -> oauth_token: ${requestToken}, oauth_token_secret: ${requestTokenSecret}`);

        if (!requestToken || !requestTokenSecret) {
            console.error('[users.controller][requestOAuthToken] Missing requestToken or requestTokenSecret in Discogs response');
            throw new Error('Failed to get request token from Discogs');
        }

        // Store request token data server-side for callback retrieval
        oauthRequestTokenCache.set(requestToken, {
            userId,
            requestTokenSecret,
            timestamp: Date.now()
        });
        console.log(`[users.controller][requestOAuthToken] Stored request token in cache. Key: ${requestToken}, userId: ${userId}, timestamp: ${Date.now()}`);

        // Build authorization URL
        const authUrl = `https://www.discogs.com/oauth/authorize?oauth_token=${requestToken}`;
        console.log(`[users.controller][requestOAuthToken] Auth URL: ${authUrl}`);

        // Return to frontend
        res.status(200).json({
            requestToken,
            requestTokenSecret,
            authUrl
        });
        console.log(`[users.controller][requestOAuthToken] Successfully completed OAuth token request for userId: ${userId}`);
    } catch (error) {
        console.error('[users.controller][requestOAuthToken][Error]', error);
        res.status(500).json({
            message: 'Failed to initiate OAuth flow'
        });
    }
};

// GET callback endpoint - handles Discogs redirect directly
export const callbackOAuthGet: RequestHandler = async (req, res) => {
    try {
        // Get OAuth parameters from query string (Discogs redirects here)
        const requestToken = req.query.oauth_token as string;
        const verifier = req.query.oauth_verifier as string;
        const denied = req.query.denied as string;

        // Get frontend URL for redirect after processing
        // Default to localhost for EC2 production, can be overridden for docker-compose
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:80';

        // Check if user denied authorization
        if (denied) {
            console.log('[users.controller][callbackOAuthGet] User denied authorization');
            return res.redirect(`${frontendUrl}/?discogs=denied`);
        }

        if (!verifier || !requestToken) {
            console.error('[users.controller][callbackOAuthGet] Missing OAuth parameters');
            return res.redirect(`${frontendUrl}/?discogs=error&message=${encodeURIComponent('Missing OAuth parameters')}`);
        }

        console.log('[users.controller][callbackOAuthGet] Processing callback with token:', requestToken);

        // Look up userId from server-side cache
        const cachedData = oauthRequestTokenCache.get(requestToken);
        if (!cachedData) {
            console.error('[users.controller][callbackOAuthGet] Request token not found in cache');
            return res.redirect(`${frontendUrl}/?discogs=error&message=${encodeURIComponent('OAuth session expired. Please try connecting again.')}`);
        }

        const userId = cachedData.userId;
        const tokenSecret = cachedData.requestTokenSecret;

        // Get Discogs consumer key and secret
        const consumerKey = process.env.DISCOGS_CONSUMER_KEY;
        const consumerSecret = process.env.DISCOGS_CONSUMER_SECRET;

        if (!consumerKey || !consumerSecret) {
            console.error('[users.controller][callbackOAuthGet] Missing OAuth configuration');
            return res.redirect(`${frontendUrl}/?discogs=error&message=${encodeURIComponent('OAuth configuration error')}`);
        }

        // Generate OAuth parameters for access token request
        const oauthParams: Record<string, string> = {
            oauth_consumer_key: consumerKey,
            oauth_token: requestToken,
            oauth_nonce: OAuthUtils.generateNonce(),
            oauth_signature_method: 'HMAC-SHA1',
            oauth_timestamp: OAuthUtils.generateTimestamp(),
            oauth_version: '1.0',
            oauth_verifier: verifier
        };

        // Generate signature
        const accessTokenUrl = 'https://api.discogs.com/oauth/access_token';
        oauthParams.oauth_signature = OAuthUtils.generateOAuthSignature(
            'POST',
            accessTokenUrl,
            oauthParams,
            consumerSecret,
            tokenSecret
        );

        // Make request to Discogs
        const authHeader = OAuthUtils.generateOAuthHeader(oauthParams);
        
        console.log('[users.controller][callbackOAuthGet] Exchanging verifier for access token for userId:', userId);
        
        const response = await axios.post(accessTokenUrl, {}, {
            headers: {
                'Authorization': authHeader
            }
        });

        // Parse response (format: oauth_token=xxx&oauth_token_secret=yyy)
        const responseParams = new URLSearchParams(response.data);
        const accessToken = responseParams.get('oauth_token');
        const accessTokenSecret = responseParams.get('oauth_token_secret');

        if (!accessToken || !accessTokenSecret) {
            throw new Error('Failed to get access token from Discogs');
        }

        // Store both access token and secret per Discogs OAuth 1.0a requirements
        await UserDao.updateDiscogsToken(userId, accessToken, accessTokenSecret);

        // Remove from cache after successful exchange
        oauthRequestTokenCache.delete(requestToken);

        console.log('[users.controller][callbackOAuthGet] Access token and secret stored for userId:', userId);

        // Redirect to frontend with success
        return res.redirect(`${frontendUrl}/?discogs=connected&userId=${userId}`);
    } catch (error) {
        console.error('[users.controller][callbackOAuthGet][Error]', error);
        // Use environment variable or default to web service for docker-compose
        // In production, this should be set to the public frontend URL
        const frontendUrl = process.env.FRONTEND_URL || 'http://web';
        const errorMessage = error instanceof Error ? error.message : 'Failed to complete OAuth flow';
        return res.redirect(`${frontendUrl}/?discogs=error&message=${encodeURIComponent(errorMessage)}`);
    }
};

// POST callback endpoint - kept for backward compatibility but should use GET
export const callbackOAuth: RequestHandler = async (req, res) => {
    try {
        // Get request token from URL or body (prefer URL as it's more reliable)
        const requestTokenFromUrl = req.query.oauth_token as string;
        const { verifier, requestToken: requestTokenFromBody, requestTokenSecret } = req.body;
        
        // Use request token from URL if available, otherwise from body
        const requestToken = requestTokenFromUrl || requestTokenFromBody;

        // Early idempotency check: if we have userId, check if user already has complete token (both token and secret)
        if (req.params.userId) {
            const paramUserId = parseInt(req.params.userId, 10);
            if (!isNaN(paramUserId) && paramUserId > 0) {
                const userResult = await UserDao.readUsers();
                const user = userResult.find(u => u.user_id === paramUserId);
                // Only return early if user has BOTH token and secret (complete authorization)
                if (user && user.discogs_token && user.discogs_token_secret) {
                    console.log('[users.controller][callbackOAuth] User already has complete OAuth token pair, returning success (idempotency)');
                    return res.status(200).json({
                        message: 'Discogs account already connected',
                        connected: true
                    });
                }
            }
        }

        if (!verifier || !requestToken) {
            return res.status(400).json({
                message: 'Missing required OAuth parameters (verifier and oauth_token)'
            });
        }

        // Try to get request token data from server-side cache first
        let userId: number;
        let tokenSecret: string;
        let useCacheData = false;
        
        const cachedData = oauthRequestTokenCache.get(requestToken);
        if (cachedData) {
            // Use cached data (preferred method)
            userId = cachedData.userId;
            tokenSecret = cachedData.requestTokenSecret;
            useCacheData = true;
            console.log('[users.controller][callbackOAuth] Retrieved request token data from server-side cache for userId:', userId);
        } else if (requestTokenSecret && req.params.userId) {
            // Fallback to body data if cache miss (for backward compatibility)
            const paramUserId = parseInt(req.params.userId, 10);
            if (!isNaN(paramUserId) && paramUserId > 0) {
                userId = paramUserId;
                tokenSecret = requestTokenSecret;
                console.log('[users.controller][callbackOAuth] Using request token data from request body for userId:', userId);
            } else {
                // Final check: user might have token already from previous call
                if (req.params.userId) {
                    const paramUserId = parseInt(req.params.userId, 10);
                    if (!isNaN(paramUserId) && paramUserId > 0) {
                        const userResult = await UserDao.readUsers();
                        const user = userResult.find(u => u.user_id === paramUserId);
                        if (user && user.discogs_token) {
                            console.log('[users.controller][callbackOAuth] User already has OAuth token (idempotency check after cache miss)');
                            return res.status(200).json({
                                message: 'Discogs account already connected',
                                connected: true
                            });
                        }
                    }
                }
                return res.status(400).json({
                    message: 'OAuth session expired or invalid. Please try connecting again.'
                });
            }
        } else {
            // Token not in cache and no fallback data - check if user already has token
            if (req.params.userId) {
                const paramUserId = parseInt(req.params.userId, 10);
                if (!isNaN(paramUserId) && paramUserId > 0) {
                    const userResult = await UserDao.readUsers();
                    const user = userResult.find(u => u.user_id === paramUserId);
                    if (user && user.discogs_token) {
                        console.log('[users.controller][callbackOAuth] User already has OAuth token (idempotency - duplicate callback)');
                        return res.status(200).json({
                            message: 'Discogs account already connected',
                            connected: true
                        });
                    }
                }
            }
            return res.status(400).json({
                message: 'OAuth session expired or invalid. Please try connecting again.'
            });
        }

        // Get Discogs consumer key and secret
        const consumerKey = process.env.DISCOGS_CONSUMER_KEY;
        const consumerSecret = process.env.DISCOGS_CONSUMER_SECRET;

        if (!consumerKey || !consumerSecret) {
            return res.status(500).json({
                message: 'OAuth configuration error'
            });
        }

        // Generate OAuth parameters for access token request
        const oauthParams: Record<string, string> = {
            oauth_consumer_key: consumerKey,
            oauth_token: requestToken,
            oauth_nonce: OAuthUtils.generateNonce(),
            oauth_signature_method: 'HMAC-SHA1',
            oauth_timestamp: OAuthUtils.generateTimestamp(),
            oauth_version: '1.0',
            oauth_verifier: verifier
        };

        // Generate signature
        const accessTokenUrl = 'https://api.discogs.com/oauth/access_token';
        oauthParams.oauth_signature = OAuthUtils.generateOAuthSignature(
            'POST',
            accessTokenUrl,
            oauthParams,
            consumerSecret,
            tokenSecret
        );

        // Make request to Discogs
        const authHeader = OAuthUtils.generateOAuthHeader(oauthParams);
        
        console.log('[users.controller][callbackOAuth] Exchanging verifier for access token for userId:', userId);
        
        const response = await axios.post(accessTokenUrl, {}, {
            headers: {
                'Authorization': authHeader
            }
        });

        // Parse response (format: oauth_token=xxx&oauth_token_secret=yyy)
        const responseParams = new URLSearchParams(response.data);
        const accessToken = responseParams.get('oauth_token');
        const accessTokenSecret = responseParams.get('oauth_token_secret');

        if (!accessToken || !accessTokenSecret) {
            throw new Error('Failed to get access token from Discogs');
        }

        // Check again if user already has token (in case of race condition between duplicate calls)
        const userResult = await UserDao.readUsers();
        const user = userResult.find(u => u.user_id === userId);
        if (user && user.discogs_token) {
            console.log('[users.controller][callbackOAuth] User already has OAuth token, skipping duplicate exchange (idempotency)');
            // Remove from cache even if we didn't exchange (cleanup)
            if (useCacheData) {
                oauthRequestTokenCache.delete(requestToken);
            }
            return res.status(200).json({
                message: 'Discogs account already connected',
                connected: true
            });
        }

        // Store both access token and secret per Discogs OAuth 1.0a requirements
        // Both are required for properly authenticated API calls
        await UserDao.updateDiscogsToken(userId, accessToken, accessTokenSecret);

        // Remove from cache only after successful exchange
        if (useCacheData) {
            oauthRequestTokenCache.delete(requestToken);
        }

        console.log('[users.controller][callbackOAuth] Access token and secret stored for userId:', userId);

        res.status(200).json({
            message: 'Discogs account connected successfully',
            connected: true
        });
    } catch (error) {
        console.error('[users.controller][callbackOAuth][Error]', error);
        res.status(500).json({
            message: 'Failed to complete OAuth flow'
        });
    }
};

export const checkOAuthStatus: RequestHandler = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        console.log(`[users.controller][checkOAuthStatus] Checking OAuth status for userId: ${userId}`);
        
        // Get user from database
        const users = await UserDao.readUsers();
        const user = users.find(u => u.user_id === userId);
        
        if (!user) {
            console.log(`[users.controller][checkOAuthStatus] User not found for userId: ${userId}`);
            return res.status(404).json({
                message: 'User not found'
            });
        }
        
        // Check if user has OAuth tokens
        if (!user.discogs_token || !user.discogs_token_secret) {
            console.log(`[users.controller][checkOAuthStatus] No OAuth tokens found for userId: ${userId}`);
            return res.status(200).json({
                connected: false,
                hasToken: false
            });
        }
        
        console.log(`[users.controller][checkOAuthStatus] OAuth tokens found for userId: ${userId}, verifying with Discogs`);
        
        // Verify the token by calling Discogs identity endpoint
        try {
            const discogsConnector = await import('../services/discogs.connector');
            const identityData = await discogsConnector.verifyOAuthIdentity(
                user.discogs_token,
                user.discogs_token_secret
            );
            
            console.log(`[users.controller][checkOAuthStatus] OAuth identity verified for userId: ${userId}`);
            return res.status(200).json({
                connected: true,
                hasToken: true,
                discogsUsername: identityData.username || null
            });
        } catch (verifyError) {
            console.error(`[users.controller][checkOAuthStatus] Failed to verify OAuth identity:`, verifyError);
            // Token might be invalid, but we still indicate they have one
            return res.status(200).json({
                connected: false,
                hasToken: true,
                error: 'Token verification failed'
            });
        }
    } catch (error) {
        console.error('[users.controller][checkOAuthStatus][Error]', error);
        res.status(500).json({
            message: 'Failed to check OAuth status'
        });
    }
};

// ===============================================
// NON-USER-SPECIFIC DISCOGS API ENDPOINTS
// ===============================================

/**
 * Search Discogs database (public endpoint, uses default token)
 */
export const searchDiscogs: RequestHandler = async (req, res) => {
    try {
        const query = req.query.q as string;
        const type = req.query.type as string || 'release';
        const perPage = req.query.per_page ? parseInt(req.query.per_page as string) : 50;
        
        if (!query) {
            return res.status(400).json({ message: 'Query parameter "q" is required' });
        }
        
        const defaultToken = process.env.DISCOGS_TOKEN || 'sgSOwNnDMKJCOWpLLTdNccwHTAbGVrUZOXjLcqxl';
        const response = await axios.get('https://api.discogs.com/database/search', {
            params: {
                q: query,
                type: type,
                per_page: perPage,
                token: defaultToken
            }
        });
        
        res.status(200).json(response.data);
    } catch (error) {
        console.error('[users.controller][searchDiscogs][Error]', error);
        res.status(500).json({ message: 'Failed to search Discogs database' });
    }
};

/**
 * Get release information (public endpoint, uses default token)
 */
export const getRelease: RequestHandler = async (req, res) => {
    try {
        const releaseId = req.params.id;
        
        if (!releaseId) {
            return res.status(400).json({ message: 'Release ID is required' });
        }
        
        const defaultToken = process.env.DISCOGS_TOKEN || 'sgSOwNnDMKJCOWpLLTdNccwHTAbGVrUZOXjLcqxl';
        const response = await axios.get(`https://api.discogs.com/releases/${releaseId}`, {
            params: {
                token: defaultToken
            }
        });
        
        res.status(200).json(response.data);
    } catch (error) {
        console.error('[users.controller][getRelease][Error]', error);
        res.status(500).json({ message: 'Failed to fetch release information' });
    }
};

/**
 * Get price suggestions for a release (public endpoint, uses default token)
 */
export const getPriceSuggestions: RequestHandler = async (req, res) => {
    try {
        const releaseId = req.params.releaseId;
        
        if (!releaseId) {
            return res.status(400).json({ message: 'Release ID is required' });
        }
        
        const defaultToken = process.env.DISCOGS_TOKEN || 'sgSOwNnDMKJCOWpLLTdNccwHTAbGVrUZOXjLcqxl';
        const response = await axios.get(`https://api.discogs.com/marketplace/price_suggestions/${releaseId}`, {
            params: {
                token: defaultToken
            }
        });
        
        res.status(200).json(response.data);
    } catch (error) {
        console.error('[users.controller][getPriceSuggestions][Error]', error);
        res.status(500).json({ message: 'Failed to fetch price suggestions' });
    }
};

/**
 * Get mock meter data (public endpoint, returns same data for all users)
 */
export const getMockMeterData: RequestHandler = async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        
        const mockDataPath = path.join(__dirname, '../data/mock-meter-data.json');
        
        if (!fs.existsSync(mockDataPath)) {
            console.warn('[users.controller][getMockMeterData] Mock data file not found, returning empty array');
            return res.status(200).json([]);
        }
        
        const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));
        
        console.log('[users.controller][getMockMeterData] Loaded', mockData.length, 'releases');
        if (mockData.length > 0) {
            console.log('[users.controller][getMockMeterData] First release image URLs:', {
                cover_image_url: mockData[0].cover_image_url,
                thumb_url: mockData[0].thumb_url
            });
        }
        
        // Ensure we have at least one item for currently playing
        if (mockData.length > 0) {
            // Return data with first item marked as currently playing
            const currentlyPlaying = {
                ...mockData[0],
                start_time: new Date().toISOString(),
                duration_minutes: null
            };
            
            const recentlyPlayed = mockData.slice(1);
            
            res.status(200).json({
                currentlyPlaying,
                recentlyPlayed
            });
        } else {
            res.status(200).json({
                currentlyPlaying: null,
                recentlyPlayed: []
            });
        }
    } catch (error) {
        console.error('[users.controller][getMockMeterData][Error]', error);
        res.status(500).json({ message: 'Failed to fetch mock meter data' });
    }
};

// ===============================================
// DISCOGS API PROXY ENDPOINTS (OAuth-Protected)
// ===============================================

/**
 * Helper to get user OAuth tokens from database
 */
const getUserOAuthTokens = async (userId: number) => {
    const users = await UserDao.readUsers();
    const user = users.find(u => u.user_id === userId);
    if (!user || !user.discogs_token || !user.discogs_token_secret) {
        throw new Error('OAuth tokens not found');
    }
    return {
        token: user.discogs_token,
        tokenSecret: user.discogs_token_secret
    };
};

/**
 * Proxy GET requests to Discogs API using user's OAuth tokens
 */
export const proxyDiscogsGET: RequestHandler = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        const { folderId, releaseId, username: usernameParam } = req.params;
        const url = req.url; // includes query string
        const query = req.query as Record<string, string | string[] | undefined>;
        
        console.log(`[users.controller][proxyDiscogsGET] User ${userId} requesting Discogs: ${url}`);
        
        // Get user OAuth tokens and username
        const { token, tokenSecret } = await getUserOAuthTokens(userId);
        const users = await UserDao.readUsers();
        const user = users.find(u => u.user_id === userId);
        const discogsUsername =
            (typeof query.username === 'string' && query.username.trim().length > 0 && query.username.trim()) ||
            usernameParam ||
            user?.username;
        if (!discogsUsername) {
            return res.status(400).json({ message: 'Discogs username is required' });
        }
        
        // Map URL patterns to Discogs API endpoints
        let discogsUrl: string;
        const searchParams = new URLSearchParams();
        Object.entries(query).forEach(([key, value]) => {
            if (key === 'username' || value === undefined) return;
            if (Array.isArray(value)) {
                value.forEach((val) => searchParams.append(key, val));
            } else {
                searchParams.append(key, value);
            }
        });
        const queryString = searchParams.toString();

        if (url.includes('/collection/folders/')) {
            const folder = folderId || '1';
            discogsUrl = `https://api.discogs.com/users/${discogsUsername}/collection/folders/${folder}/releases${queryString ? `?${queryString}` : ''}`;
        } else if (url.includes('/wants') || url.includes('/wantlist')) {
            discogsUrl = `https://api.discogs.com/users/${discogsUsername}/wants${queryString ? `?${queryString}` : ''}`;
        } else if (url.includes('/profile')) {
            discogsUrl = `https://api.discogs.com/users/${discogsUsername}${queryString ? `?${queryString}` : ''}`;
        } else {
            return res.status(400).json({ message: 'Invalid Discogs path' });
        }
        
        // Make OAuth request to Discogs
        const discogsConnector = await import('../services/discogs.connector');
        const response = await discogsConnector.makeOAuthRequest('GET', discogsUrl, token, tokenSecret);
        
        console.log(`[users.controller][proxyDiscogsGET] Successfully proxied request for user ${userId}`);
        res.status(200).json(response.data);
    } catch (error) {
        console.error('[users.controller][proxyDiscogsGET][Error]', error);
        if (axios.isAxiosError(error) && error.response) {
            return res.status(error.response.status).json({
                message: error.response.data?.message || 'Discogs request failed',
                details: error.response.data
            });
        }
        res.status(500).json({ message: 'Failed to proxy Discogs request' });
    }
};

/**
 * Proxy POST/PUT/DELETE requests to Discogs API using user's OAuth tokens
 */
export const proxyDiscogsWrite: RequestHandler = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        const { folderId, releaseId, username } = req.params;
        const { method } = req;
        const url = req.url;
        
        console.log(`[users.controller][proxyDiscogsWrite] User ${userId} ${method} to Discogs: ${url}`);
        
        // Get user OAuth tokens and username
        const { token, tokenSecret } = await getUserOAuthTokens(userId);
        const users = await UserDao.readUsers();
        const user = users.find(u => u.user_id === userId);
        const discogsUsername = user?.username || username;
        
        // Map URL patterns to Discogs API endpoints
        let discogsUrl: string;
        if (url.includes('/wants/') || url.includes('/wantlist/')) {
            discogsUrl = `https://api.discogs.com/users/${discogsUsername}/wants/${releaseId}`;
        } else if (url.includes('/collection/folders/')) {
            const folder = folderId || '1';
            discogsUrl = `https://api.discogs.com/users/${discogsUsername}/collection/folders/${folder}/releases/${releaseId}`;
        } else {
            return res.status(400).json({ message: 'Invalid Discogs path' });
        }
        
        // Make OAuth request to Discogs
        const discogsConnector = await import('../services/discogs.connector');
        const response = await discogsConnector.makeOAuthRequest(
            method.toUpperCase() as any,
            discogsUrl,
            token,
            tokenSecret,
            req.body
        );
        
        console.log(`[users.controller][proxyDiscogsWrite] Successfully proxied ${method} for user ${userId}`);
        res.status(200).json(response.data);
    } catch (error) {
        console.error('[users.controller][proxyDiscogsWrite][Error]', error);
        res.status(500).json({ message: 'Failed to proxy Discogs request' });
    }
};

/**
 * Update user's public resources setting (privacy toggle for collections/wantlists)
 */
export const updatePublicResourcesSetting: RequestHandler = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        const { public_resources } = req.body;
        
        // Verify user owns this setting
        if (req.user?.userId !== userId) {
            console.log(`[users.controller][updatePublicResourcesSetting] Access denied: user ${req.user?.userId} tried to update setting for user ${userId}`);
            return res.status(403).json({ message: 'Access forbidden: You can only update your own settings' });
        }
        
        // Validate input
        if (typeof public_resources !== 'boolean') {
            return res.status(400).json({ message: 'public_resources must be a boolean value' });
        }
        
        console.log(`[users.controller][updatePublicResourcesSetting] Updating public_resources to ${public_resources} for user ${userId}`);
        await UserDao.updatePublicResourcesSetting(userId, public_resources);
        
        console.log(`[users.controller][updatePublicResourcesSetting] Successfully updated setting for user ${userId}`);
        res.status(200).json({ 
            message: 'Public resources setting updated',
            public_resources 
        });
    } catch (error) {
        console.error('[users.controller][updatePublicResourcesSetting][Error]', error);
        res.status(500).json({ message: 'Failed to update public resources setting' });
    }
};
