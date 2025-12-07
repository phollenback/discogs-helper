import * as DiscogsConnector from '../services/discogs.connector';
import * as RecordDao from '../records/records.dao';
import * as CollectionDao from '../collection/collection.dao';
import * as UserDao from '../users/users.dao';
import { CollectionItem } from '../collection/collection.model';
import { ReleaseCollectionEntry, ReleaseRatingResponse } from './releases.model';

const RELEASE_NOT_FOUND_MESSAGE = 'Release not found';

/**
 * Normalize price threshold for DECIMAL column (cannot accept empty strings)
 */
const normalizePriceThreshold = (value: any): string | null => {
    if (value === '' || value === null || value === undefined) {
        return null;
    }
    return String(value);
};

/**
 * Normalize collection entry from database format to API response format
 */
export const normalizeCollectionEntry = (entry: any | null): ReleaseCollectionEntry | null => {
    if (!entry) return null;
    return {
        userId: entry.user_id,
        discogsId: entry.discogs_id,
        notes: entry.notes || '',
        priceThreshold: entry.price_threshold !== null && entry.price_threshold !== undefined ? String(entry.price_threshold) : '',
        rating: entry.rating !== undefined && entry.rating !== null ? Number(entry.rating) : null,
        wishlist: entry.wishlist === 1 || entry.wishlist === '1',
        inCollection: entry.wishlist === 0 || entry.wishlist === '0'
    };
};

/**
 * Ensure release data exists in the records table
 */
export const ensureRecordData = async (releaseId: number, releaseData: any): Promise<void> => {
    const artists = Array.isArray(releaseData.artists)
        ? releaseData.artists.map((artist: any) => artist.name).join(', ')
        : '';
    const genres = Array.isArray(releaseData.genres) ? releaseData.genres.join(', ') : '';
    const styles = Array.isArray(releaseData.styles) ? releaseData.styles.join(', ') : '';
    const primaryImage = Array.isArray(releaseData.images) ? releaseData.images[0] : undefined;

    await RecordDao.upsertRecord({
        discogsId: releaseId,
        title: releaseData.title || '',
        artist: artists,
        releaseYear: releaseData.year ? releaseData.year.toString() : '',
        genre: genres,
        styles,
        thumbUrl: primaryImage?.uri150 || primaryImage?.uri || '',
        coverImageUrl: primaryImage?.uri || primaryImage?.resource_url || ''
    });
};

/**
 * Load collection entry for a user and release
 */
export const loadCollectionEntry = async (userId: number, releaseId: number): Promise<any | null> => {
    try {
        const result = await CollectionDao.readCollectionItem(userId, releaseId);
        if (Array.isArray(result)) {
            return result[0] || null;
        }
        return result || null;
    } catch (error) {
        // If record doesn't exist in database, that's fine - user is just browsing
        // Only log if it's not a "not found" type error
        if (error && typeof error === 'object' && 'code' in error && error.code !== 'ER_BAD_FIELD_ERROR') {
            console.warn('[releases.dao][loadCollectionEntry][Warning]', error);
        }
        return null;
    }
};

/**
 * Get record_id from discogs_id
 * Falls back to discogs_id if record not found (e.g., in test scenarios or race conditions)
 */
const getRecordIdFromDiscogsId = async (discogsId: number): Promise<number> => {
    // Production database uses discogs_id directly in user_records instead of record_id
    // So we can just return discogs_id
    return discogsId;
};

/**
 * Upsert collection entry with updates (SQL-only path)
 */
export const upsertCollectionEntry = async (
    userId: number,
    releaseId: number,
    updates: Partial<ReleaseCollectionEntry>
): Promise<{ entry: ReleaseCollectionEntry | null; previous: ReleaseCollectionEntry | null }> => {
    const existing = await loadCollectionEntry(userId, releaseId);
    const previousNormalized = normalizeCollectionEntry(existing);

    // Get record_id from discogs_id
    const recordId = await getRecordIdFromDiscogsId(releaseId);

    const nextWishlist =
        updates.wishlist !== undefined
            ? updates.wishlist
            : existing?.wishlist !== undefined
            ? existing.wishlist
            : '0';

    // Normalize price threshold - empty strings must become null for DECIMAL column
    const normalizedPriceThreshold = normalizePriceThreshold(
        updates.priceThreshold !== undefined
            ? updates.priceThreshold
            : existing?.price_threshold
    );

    await CollectionDao.upsertCollectionItem({
        userId,
        recordId: recordId,
        discogsId: releaseId, // Keep for backwards compatibility in model
        title: '',
        artist: '',
        genres: '',
        released: '',
        styles: '',
        notes: updates.notes !== undefined ? updates.notes : existing?.notes || '',
        rating:
            updates.rating !== undefined
                ? updates.rating?.toString() ?? null
                : existing?.rating ?? null,
        ranking: updates.ranking !== undefined ? updates.ranking : existing?.ranking ?? null,
        priceThreshold: normalizedPriceThreshold,
        wishlist: typeof nextWishlist === 'string' ? nextWishlist : nextWishlist ? '1' : '0'
    } as any);

    const refreshed = await loadCollectionEntry(userId, releaseId);
    return {
        entry: normalizeCollectionEntry(refreshed),
        previous: previousNormalized
    };
};

/**
 * Get user's Discogs OAuth token
 */
export const getUserDiscogsToken = async (username: string): Promise<string | null> => {
    const users = await UserDao.readUserByUsername(username);
    const user = Array.isArray(users) ? users[0] : users;
    return user?.discogs_token || null;
};

/**
 * Get user's Discogs OAuth tokens (token + secret)
 */
export const getUserDiscogsOAuthTokens = async (username: string): Promise<{ token: string; tokenSecret: string } | null> => {
    const users = await UserDao.readUserByUsername(username);
    const user = Array.isArray(users) ? users[0] : users;
    console.log(`[releases.dao][getUserDiscogsOAuthTokens] User: ${username}, has token: ${!!user?.discogs_token}, has secret: ${!!user?.discogs_token_secret}`);
    if (user?.discogs_token && user?.discogs_token_secret) {
        return {
            token: user.discogs_token,
            tokenSecret: user.discogs_token_secret
        };
    }
    return null;
};

/**
 * Get release overview with all related data
 */
export const getReleaseOverview = async (
    releaseId: number,
    options: {
        currAbbr?: string;
        includeMaster?: boolean;
        masterPage?: number;
        masterPerPage?: number;
        masterFormat?: string;
        masterLabel?: string;
        masterReleased?: string;
        masterCountry?: string;
        masterSort?: string;
        masterSortOrder?: string;
    },
    userId?: number,
    username?: string
) => {
    const release = await DiscogsConnector.getRelease(releaseId, options.currAbbr ? { curr_abbr: options.currAbbr } : {});

    const [stats, communityRating] = await Promise.all([
        DiscogsConnector.getReleaseStats(releaseId),
        DiscogsConnector.getReleaseCommunityRating(releaseId)
    ]);

    let master = null;
    let masterVersions = null;

    if (options.includeMaster !== false && release?.master_id) {
        try {
            master = await DiscogsConnector.getMasterRelease(release.master_id);
            masterVersions = await DiscogsConnector.getMasterVersions(release.master_id, {
                page: options.masterPage,
                per_page: options.masterPerPage,
                format: options.masterFormat,
                label: options.masterLabel,
                released: options.masterReleased,
                country: options.masterCountry,
                sort: options.masterSort,
                sort_order: options.masterSortOrder
            });
        } catch (error) {
            console.warn('[releases.dao][getReleaseOverview][Master][Warning]', error);
        }
    }

    let collectionEntry: ReleaseCollectionEntry | null = null;
    let userRating: number | null = null;

    if (userId && username) {
        // Check if user has OAuth tokens - if so, check Discogs API first
        const oauthTokens = await getUserDiscogsOAuthTokens(username);
        
        if (oauthTokens) {
            // OAuth user - check Discogs API for collection/wantlist status
            console.log(`[releases.dao][getReleaseOverview] Checking Discogs API for OAuth user: ${username}`);
            
            let inWantlist = false;
            let inCollection = false;
            let notes = '';
            
            // Check wantlist
            try {
                const wantlistData = await DiscogsConnector.fetchUserWantlistOAuth(
                    username,
                    oauthTokens.token,
                    oauthTokens.tokenSecret
                );
                const wants = wantlistData?.wants || [];
                const wantEntry = wants.find((w: any) => w.id === releaseId);
                if (wantEntry) {
                    inWantlist = true;
                    notes = wantEntry.notes || '';
                }
                console.log(`[releases.dao][getReleaseOverview] In wantlist: ${inWantlist}`);
            } catch (error: any) {
                // 404 means not in wantlist, which is fine
                if (error?.response?.status !== 404) {
                    console.warn('[releases.dao][getReleaseOverview] Could not check wantlist:', error?.message || error);
                }
            }
            
            // Check collection
            try {
                const instances = await DiscogsConnector.getReleaseInstances(
                    username,
                    releaseId,
                    oauthTokens.token,
                    oauthTokens.tokenSecret
                );
                inCollection = !!(instances?.releases?.length || instances?.instances?.length);
                console.log(`[releases.dao][getReleaseOverview] In collection: ${inCollection}`);
            } catch (error: any) {
                // 404 means not in collection, which is fine
                if (error?.response?.status !== 404) {
                    console.warn('[releases.dao][getReleaseOverview] Could not check collection:', error?.message || error);
                }
            }
            
            // Get rating from Discogs
            try {
                const ratingResponse = await DiscogsConnector.getUserReleaseRating(
                    releaseId,
                    username,
                    oauthTokens.token
                );
                userRating = ratingResponse?.rating ?? null;
            } catch (error) {
                // Rating might not exist, which is fine
                console.warn('[releases.dao][getReleaseOverview][UserRating]', error);
            }
            
            // Build collection entry from Discogs API data
            if (inWantlist || inCollection) {
                collectionEntry = {
                    userId,
                    discogsId: releaseId,
                    notes,
                    priceThreshold: '', // Discogs API doesn't provide price threshold
                    rating: userRating,
                    ranking: null,
                    wishlist: inWantlist,
                    inCollection: inCollection
                };
                console.log(`[releases.dao][getReleaseOverview] ✅ Found collection entry from Discogs API for user ${username}, release ${releaseId}:`, {
                    inWantlist,
                    inCollection,
                    hasRating: !!userRating,
                    hasNotes: !!notes
                });
            } else {
                console.log(`[releases.dao][getReleaseOverview] ❌ Release ${releaseId} not found in Discogs wantlist or collection for user ${username}`);
            }
        } else {
            // Non-OAuth user - check SQL database
            console.log(`[releases.dao][getReleaseOverview] Non-OAuth user ${username} - checking SQL database for release ${releaseId}`);
            const entry = await loadCollectionEntry(userId, releaseId);
            collectionEntry = normalizeCollectionEntry(entry);
            if (collectionEntry) {
                console.log(`[releases.dao][getReleaseOverview] ✅ Found collection entry in SQL for user ${username}, release ${releaseId}:`, {
                    inWantlist: collectionEntry.wishlist,
                    inCollection: collectionEntry.inCollection,
                    hasRating: !!collectionEntry.rating
                });
            } else {
                console.log(`[releases.dao][getReleaseOverview] ❌ Release ${releaseId} not found in SQL database for user ${username}`);
            }
            if (collectionEntry?.rating !== null && collectionEntry?.rating !== undefined) {
                userRating = collectionEntry.rating;
            } else {
                // Try to get rating from Discogs token if available
                const token = await getUserDiscogsToken(username);
                if (token) {
                    try {
                        const ratingResponse = await DiscogsConnector.getUserReleaseRating(
                            releaseId,
                            username,
                            token
                        );
                        userRating = ratingResponse?.rating ?? null;
                    } catch (error) {
                        console.warn('[releases.dao][getReleaseOverview][UserRating]', error);
                    }
                }
            }
        }
    }

    return {
        release,
        stats,
        communityRating,
        master,
        masterVersions,
        collectionEntry,
        userRating
    };
};

/**
 * Get release detail
 */
export const getReleaseDetail = async (releaseId: number, currAbbr?: string) => {
    return await DiscogsConnector.getRelease(releaseId, currAbbr ? { curr_abbr: currAbbr } : {});
};

/**
 * Get release stats
 */
export const getReleaseStats = async (releaseId: number) => {
    return await DiscogsConnector.getReleaseStats(releaseId);
};

/**
 * Get community rating
 */
export const getCommunityRating = async (releaseId: number) => {
    return await DiscogsConnector.getReleaseCommunityRating(releaseId);
};

/**
 * Get user's rating for a release
 */
export const getUserRating = async (userId: number, releaseId: number, username: string): Promise<ReleaseRatingResponse> => {
    const entry = await loadCollectionEntry(userId, releaseId);
    const collectionRating = entry?.rating !== undefined && entry?.rating !== null ? Number(entry.rating) : null;

    const token = await getUserDiscogsToken(username);
    if (token) {
        try {
            const ratingResponse = await DiscogsConnector.getUserReleaseRating(
                releaseId,
                username,
                token
            );
            return {
                rating: ratingResponse?.rating ?? collectionRating,
                source: ratingResponse?.rating !== undefined ? 'discogs' : 'local'
            };
        } catch (error) {
            console.warn('[releases.dao][getUserRating] Discogs fetch failed:', error);
        }
    }

    return {
        rating: collectionRating,
        source: 'local'
    };
};

/**
 * Update user's rating for a release
 */
export const updateUserRating = async (
    userId: number,
    releaseId: number,
    username: string,
    rating: number
): Promise<{ rating: number; collectionEntry: ReleaseCollectionEntry | null }> => {
    const release = await DiscogsConnector.getRelease(releaseId);
    await ensureRecordData(releaseId, release);

    const { entry: updatedEntry } = await upsertCollectionEntry(userId, releaseId, {
        userId,
        discogsId: releaseId,
        rating: rating.toString()
    } as any);

    const token = await getUserDiscogsToken(username);
    if (token) {
        try {
            await DiscogsConnector.updateUserReleaseRating(releaseId, username, rating, token);
        } catch (error) {
            console.warn('[releases.dao][updateUserRating] Discogs update failed:', error);
        }
    }

    return {
        rating,
        collectionEntry: updatedEntry
    };
};

/**
 * Delete user's rating for a release
 */
export const deleteUserRating = async (
    userId: number,
    releaseId: number,
    username: string
): Promise<{ rating: null; collectionEntry: ReleaseCollectionEntry | null }> => {
    const release = await DiscogsConnector.getRelease(releaseId);
    await ensureRecordData(releaseId, release);

    const { entry: updatedEntry } = await upsertCollectionEntry(userId, releaseId, {
        userId,
        discogsId: releaseId,
        rating: null
    } as any);

    const token = await getUserDiscogsToken(username);
    if (token) {
        try {
            await DiscogsConnector.deleteUserReleaseRating(releaseId, username, token);
        } catch (error) {
            console.warn('[releases.dao][deleteUserRating] Discogs delete failed:', error);
        }
    }

    return {
        rating: null,
        collectionEntry: updatedEntry
    };
};

/**
 * Upsert collection entry with Discogs sync
 * For Discogs-authenticated users: ONLY sync with Discogs API (skip SQL)
 * For non-authenticated users: Use SQL (future mirroring)
 */
export const upsertCollection = async (
    userId: number,
    releaseId: number,
    username: string,
    updates: Partial<ReleaseCollectionEntry>
): Promise<{ collectionEntry: ReleaseCollectionEntry | null }> => {
    console.log(`[releases.dao][upsertCollection] START - User: ${username}, UserId: ${userId}, ReleaseId: ${releaseId}`);
    
    // Check if user has Discogs OAuth tokens FIRST
    const oauthTokens = await getUserDiscogsOAuthTokens(username);
    const hasOAuth = !!oauthTokens;
    
    console.log(`[releases.dao][upsertCollection] User: ${username}, Has OAuth: ${hasOAuth}, OAuthTokens: ${JSON.stringify(oauthTokens ? { token: '***', secret: '***' } : null)}`);
    
    // If user has Discogs OAuth, ONLY sync with Discogs API (skip SQL)
    if (hasOAuth && oauthTokens) {
        console.log(`[releases.dao][upsertCollection] ENTERING OAuth path - skipping SQL`);
        console.log(`[releases.dao][upsertCollection] Updates: ${JSON.stringify(updates)}`);
        
        try {
            // Check current state: is it in wantlist or collection?
            let currentlyInWantlist = false;
            let currentlyInCollection = false;
            
            // Check wantlist status - try to fetch just this release's want entry
            try {
                const wantlistData = await DiscogsConnector.fetchUserWantlistOAuth(
                    username,
                    oauthTokens.token,
                    oauthTokens.tokenSecret
                );
                const wants = wantlistData?.wants || [];
                currentlyInWantlist = wants.some((w: any) => w.id === releaseId);
                console.log(`[releases.dao][upsertCollection] Currently in wantlist: ${currentlyInWantlist}`);
            } catch (error: any) {
                // 404 means not in wantlist, which is fine
                if (error?.response?.status !== 404) {
                    console.warn('[releases.dao][upsertCollection] Could not check wantlist status:', error?.message || error);
                }
            }
            
            // Check collection status
            try {
                const instances = await DiscogsConnector.getReleaseInstances(
                    username,
                    releaseId,
                    oauthTokens.token,
                    oauthTokens.tokenSecret
                );
                currentlyInCollection = !!(instances?.releases?.length || instances?.instances?.length);
                console.log(`[releases.dao][upsertCollection] Currently in collection: ${currentlyInCollection}`);
            } catch (error: any) {
                // 404 means not in collection, which is fine
                if (error?.response?.status !== 404) {
                    console.warn('[releases.dao][upsertCollection] Could not check collection status:', error?.message || error);
                }
            }
            
            // Determine target state from updates
            const targetWishlist = updates.wishlist === true;
            const targetCollection = updates.wishlist === false;
            const isUpdate = updates.wishlist === undefined; // Just updating notes/rating/etc
            
            console.log(`[releases.dao][upsertCollection] Target wishlist: ${targetWishlist}, Target collection: ${targetCollection}, Is update: ${isUpdate}`);
            
            // Handle wishlist/collection transitions
            if (targetWishlist) {
                // Target: wantlist
                if (!currentlyInWantlist) {
                    // Add to wantlist (with notes and rating)
                    await DiscogsConnector.addToWantlistOAuth(
                        username,
                        releaseId,
                        oauthTokens.token,
                        oauthTokens.tokenSecret,
                        {
                            notes: updates.notes || undefined,
                            rating: updates.rating && Number(updates.rating) > 0 ? Number(updates.rating) : undefined
                        }
                    );
                    console.log(`[releases.dao][upsertCollection] Added to wantlist`);
                }
                // Remove from collection if it's there
                if (currentlyInCollection) {
                    const instances = await DiscogsConnector.getReleaseInstances(
                        username,
                        releaseId,
                        oauthTokens.token,
                        oauthTokens.tokenSecret
                    );
                    const releases = instances?.releases || instances?.instances || [];
                    for (const instance of releases) {
                        const folderId = instance.folder_id || instance.folderId || 1;
                        const instanceId = instance.instance_id || instance.instanceId;
                        if (instanceId) {
                            await DiscogsConnector.deleteReleaseInstance(
                                username,
                                folderId,
                                releaseId,
                                instanceId,
                                oauthTokens.token,
                                oauthTokens.tokenSecret
                            );
                        }
                    }
                    console.log(`[releases.dao][upsertCollection] Removed from collection`);
                }
            } else if (targetCollection) {
                // Target: collection
                if (!currentlyInCollection) {
                    // Add to collection (with notes and rating)
                    await DiscogsConnector.addToCollectionOAuth(
                        username,
                        1, // Default folder
                        releaseId,
                        oauthTokens.token,
                        oauthTokens.tokenSecret,
                        {
                            notes: updates.notes || undefined,
                            rating: updates.rating && Number(updates.rating) > 0 ? Number(updates.rating) : undefined
                        }
                    );
                    console.log(`[releases.dao][upsertCollection] Added to collection`);
                }
                // Remove from wantlist if it's there
                if (currentlyInWantlist) {
                    await DiscogsConnector.deleteFromWantlistOAuth(
                        username,
                        releaseId,
                        oauthTokens.token,
                        oauthTokens.tokenSecret
                    );
                    console.log(`[releases.dao][upsertCollection] Removed from wantlist`);
                }
            } else if (isUpdate) {
                // Just updating existing entry - check if we need to update notes/rating
                // For wantlist: we can update with PUT (idempotent)
                if (currentlyInWantlist) {
                    await DiscogsConnector.addToWantlistOAuth(
                        username,
                        releaseId,
                        oauthTokens.token,
                        oauthTokens.tokenSecret,
                        {
                            notes: updates.notes !== undefined ? updates.notes : undefined,
                            rating: updates.rating && Number(updates.rating) > 0 ? Number(updates.rating) : undefined
                        }
                    );
                    console.log(`[releases.dao][upsertCollection] Updated wantlist entry`);
                }
                // For collection: we'd need to update instance fields, but that's complex
                // For now, notes and price threshold in collection are not easily updatable via API
                // Rating can be updated separately (handled below)
            }
            
            // Handle rating separately (applies to both wantlist and collection) - use OAuth
            // Only update/delete rating if explicitly provided (not undefined)
            if (updates.rating !== undefined) {
                if (updates.rating !== null && Number(updates.rating) > 0) {
                    // Set or update rating
                    try {
                        await DiscogsConnector.updateUserReleaseRatingOAuth(
                            releaseId,
                            username,
                            Number(updates.rating),
                            oauthTokens.token,
                            oauthTokens.tokenSecret
                        );
                        console.log(`[releases.dao][upsertCollection] Updated rating to ${updates.rating} using OAuth`);
                    } catch (error: any) {
                        // Rating might not exist yet, try to create it (same endpoint)
                        console.warn(`[releases.dao][upsertCollection] Rating update failed, may not exist yet:`, error?.message || error);
                        // Don't fail the whole operation if rating update fails
                    }
                } else if (updates.rating === null || (updates.rating !== undefined && Number(updates.rating) === 0)) {
                    // Explicitly delete rating (only if rating is null or 0)
                    try {
                        await DiscogsConnector.deleteUserReleaseRatingOAuth(
                            releaseId,
                            username,
                            oauthTokens.token,
                            oauthTokens.tokenSecret
                        );
                        console.log(`[releases.dao][upsertCollection] Deleted rating using OAuth`);
                    } catch (error: any) {
                        // Rating might not exist, which is fine - don't fail the operation
                        if (error?.response?.status !== 404) {
                            console.warn(`[releases.dao][upsertCollection] Rating deletion failed:`, error?.message || error);
                        } else {
                            console.log(`[releases.dao][upsertCollection] Rating doesn't exist, nothing to delete`);
                        }
                        // Don't fail the whole operation if rating deletion fails
                    }
                }
            }
            
            // Determine final state for return value
            const finalWishlist = targetWishlist || (isUpdate && currentlyInWantlist);
            const finalCollection = targetCollection || (isUpdate && currentlyInCollection);
            
            // Return collection entry based on final state
            return {
                collectionEntry: {
                    userId,
                    discogsId: releaseId,
                    notes: updates.notes !== undefined ? updates.notes : '',
                    priceThreshold: updates.priceThreshold !== undefined ? updates.priceThreshold : '',
                    rating: updates.rating !== undefined && updates.rating !== null && Number(updates.rating) > 0 ? Number(updates.rating) : null,
                    ranking: updates.ranking || null,
                    wishlist: finalWishlist,
                    inCollection: finalCollection
                }
            };
        } catch (discogsError: any) {
            console.error('[releases.dao][upsertCollection] Discogs API sync failed:', {
                message: discogsError?.message || 'Unknown error',
                status: discogsError?.response?.status,
                releaseId,
                username
            });
            throw discogsError; // Fail the request if Discogs sync fails for OAuth users
        }
    }
    
    // For non-authenticated users: use SQL (future mirroring)
    console.log(`[releases.dao][upsertCollection] Non-Discogs user - using SQL for storage`);
    const release = await DiscogsConnector.getRelease(releaseId);
    await ensureRecordData(releaseId, release);
    
    const { entry: updatedEntry } = await upsertCollectionEntry(userId, releaseId, updates);
    
    return {
        collectionEntry: updatedEntry
    };
};

/**
 * Delete collection entry with Discogs sync
 */
export const deleteCollection = async (userId: number, releaseId: number, username: string): Promise<void> => {
    // Check if user has Discogs OAuth tokens FIRST
    const oauthTokens = await getUserDiscogsOAuthTokens(username);
    const hasOAuth = !!oauthTokens;
    
    // If user has Discogs OAuth, ONLY sync with Discogs API (skip SQL)
    if (hasOAuth && oauthTokens) {
        console.log(`[releases.dao][deleteCollection] Discogs-authenticated user - deleting ONLY from Discogs API (skipping SQL)`);
        
        try {
            // Remove from wantlist
            await DiscogsConnector.deleteFromWantlistOAuth(username, releaseId, oauthTokens.token, oauthTokens.tokenSecret);
            
            // Remove from collection folders
            const instances = await DiscogsConnector.getReleaseInstances(username, releaseId, oauthTokens.token);
            const releases = instances?.releases || instances?.instances || [];
            for (const instance of releases) {
                const folderId = instance.folder_id || instance.folderId || 1;
                const instanceId = instance.instance_id || instance.instanceId;
                if (instanceId) {
                    await DiscogsConnector.deleteReleaseInstance(username, folderId, releaseId, instanceId, oauthTokens.token);
                }
            }
            console.log(`[releases.dao][deleteCollection] Successfully deleted from Discogs`);
        } catch (error) {
            console.error('[releases.dao][deleteCollection] Discogs deletion failed:', error);
            throw error; // Fail the request if Discogs deletion fails for OAuth users
        }
        return; // Skip SQL for OAuth users
    }
    
    // For non-authenticated users: use SQL
    const recordId = await getRecordIdFromDiscogsId(releaseId);
    await CollectionDao.deleteCollectionItem(userId, recordId);
};
