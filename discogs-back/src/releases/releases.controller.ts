import { RequestHandler } from 'express';
import axios from 'axios';
import * as ReleasesDao from './releases.dao';
import { UpsertCollectionRequest } from './releases.model';

const RELEASE_NOT_FOUND_MESSAGE = 'Release not found';

/**
 * Parse and validate a positive integer from request parameters
 */
const parsePositiveInt = (value: string | undefined): number => {
    if (!value) return NaN;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return NaN;
    }
    return parsed;
};

/**
 * Handle Discogs API errors and return appropriate HTTP responses
 */
const handleDiscogsError = (error: unknown, res: any, fallbackMessage: string): void => {
    if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        if (status === 404) {
            res.status(404).json({
                message: error.response.data?.message || RELEASE_NOT_FOUND_MESSAGE
            });
            return;
        }
        res.status(status).json({
            message: error.response.data?.message || fallbackMessage
        });
        return;
    }
    console.error('[releases.controller][Discogs][Error]', error);
    res.status(502).json({ message: fallbackMessage });
};

/**
 * GET /api/releases/:releaseId/overview
 * Get comprehensive release overview including stats, community rating, master, and user data
 */
export const getReleaseOverview: RequestHandler = async (req, res) => {
    const releaseId = parsePositiveInt(req.params.releaseId);
    if (Number.isNaN(releaseId)) {
        res.status(400).json({ message: 'Release ID must be a positive integer' });
        return;
    }

    const {
        curr_abbr,
        includeMaster = 'true',
        master_page,
        master_per_page,
        master_format,
        master_label,
        master_released,
        master_country,
        master_sort,
        master_sort_order
    } = req.query as Record<string, string>;

    // Log authentication status
    console.log(`[releases.controller][getReleaseOverview] Request for release ${releaseId}`);
    console.log(`[releases.controller][getReleaseOverview] User context:`, {
        hasUser: !!req.user,
        userId: req.user?.userId,
        username: req.user?.username,
        hasAuthHeader: !!req.headers.authorization
    });

    try {
        const result = await ReleasesDao.getReleaseOverview(
            releaseId,
            {
                currAbbr: curr_abbr,
                includeMaster: includeMaster !== 'false',
                masterPage: master_page ? Number(master_page) : undefined,
                masterPerPage: master_per_page ? Number(master_per_page) : undefined,
                masterFormat: master_format,
                masterLabel: master_label,
                masterReleased: master_released,
                masterCountry: master_country,
                masterSort: master_sort,
                masterSortOrder: master_sort_order
            },
            req.user?.userId,
            req.user?.username
        );

        console.log(`[releases.controller][getReleaseOverview] Response for release ${releaseId}:`, {
            hasCollectionEntry: !!result.collectionEntry,
            collectionEntryStatus: result.collectionEntry ? {
                wishlist: result.collectionEntry.wishlist,
                inCollection: result.collectionEntry.inCollection
            } : null
        });

        res.status(200).json(result);
    } catch (error) {
        handleDiscogsError(error, res, 'Failed to fetch release overview');
    }
};

/**
 * GET /api/releases/:releaseId
 * Get release detail
 */
export const getReleaseDetail: RequestHandler = async (req, res) => {
    const releaseId = parsePositiveInt(req.params.releaseId);
    if (Number.isNaN(releaseId)) {
        res.status(400).json({ message: 'Release ID must be a positive integer' });
        return;
    }

    const { curr_abbr } = req.query as Record<string, string>;

    try {
        const release = await ReleasesDao.getReleaseDetail(releaseId, curr_abbr);
        res.status(200).json(release);
    } catch (error) {
        handleDiscogsError(error, res, 'Failed to fetch release');
    }
};

/**
 * GET /api/releases/:releaseId/stats
 * Get release statistics
 */
export const getReleaseStatsProxy: RequestHandler = async (req, res) => {
    const releaseId = parsePositiveInt(req.params.releaseId);
    if (Number.isNaN(releaseId)) {
        res.status(400).json({ message: 'Release ID must be a positive integer' });
        return;
    }

    try {
        const stats = await ReleasesDao.getReleaseStats(releaseId);
        res.status(200).json(stats);
    } catch (error) {
        handleDiscogsError(error, res, 'Failed to fetch release stats');
    }
};

/**
 * GET /api/releases/:releaseId/rating/community
 * Get community rating for a release
 */
export const getCommunityRating: RequestHandler = async (req, res) => {
    const releaseId = parsePositiveInt(req.params.releaseId);
    if (Number.isNaN(releaseId)) {
        res.status(400).json({ message: 'Release ID must be a positive integer' });
        return;
    }

    try {
        const rating = await ReleasesDao.getCommunityRating(releaseId);
        res.status(200).json(rating);
    } catch (error) {
        handleDiscogsError(error, res, 'Failed to fetch community rating');
    }
};

/**
 * GET /api/releases/:releaseId/rating
 * Get authenticated user's rating for a release
 */
export const getMyReleaseRating: RequestHandler = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
    }

    const releaseId = parsePositiveInt(req.params.releaseId);
    if (Number.isNaN(releaseId)) {
        res.status(400).json({ message: 'Release ID must be a positive integer' });
        return;
    }

    const { userId, username } = req.user;

    try {
        const result = await ReleasesDao.getUserRating(userId, releaseId, username);
        res.status(200).json(result);
    } catch (error) {
        console.error('[releases.controller][getMyReleaseRating][Error]', error);
        res.status(500).json({ message: 'Failed to fetch user rating' });
    }
};

/**
 * PUT /api/releases/:releaseId/rating
 * Update authenticated user's rating for a release
 */
export const updateMyReleaseRating: RequestHandler = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
    }

    const releaseId = parsePositiveInt(req.params.releaseId);
    if (Number.isNaN(releaseId)) {
        res.status(400).json({ message: 'Release ID must be a positive integer' });
        return;
    }

    const rating = Number(req.body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
        return;
    }

    const { userId, username } = req.user;

    try {
        const result = await ReleasesDao.updateUserRating(userId, releaseId, username, rating);
        res.status(200).json(result);
    } catch (error) {
        handleDiscogsError(error, res, 'Failed to update rating');
    }
};

/**
 * DELETE /api/releases/:releaseId/rating
 * Delete authenticated user's rating for a release
 */
export const deleteMyReleaseRating: RequestHandler = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
    }

    const releaseId = parsePositiveInt(req.params.releaseId);
    if (Number.isNaN(releaseId)) {
        res.status(400).json({ message: 'Release ID must be a positive integer' });
        return;
    }

    const { userId, username } = req.user;

    try {
        const result = await ReleasesDao.deleteUserRating(userId, releaseId, username);
        res.status(200).json(result);
    } catch (error) {
        handleDiscogsError(error, res, 'Failed to delete rating');
    }
};

/**
 * POST /api/releases/:releaseId/collection
 * PUT /api/releases/:releaseId/collection
 * Create or update collection entry for a release
 */
export const upsertCollection: RequestHandler = async (req, res) => {
    // Log authentication status for debugging
    console.log(`[releases.controller][upsertCollection] Request received`);
    console.log(`[releases.controller][upsertCollection] Auth status:`, {
        hasUser: !!req.user,
        userId: req.user?.userId,
        username: req.user?.username,
        hasAuthHeader: !!req.headers.authorization,
        authHeaderPrefix: req.headers.authorization?.substring(0, 20) || 'none'
    });
    
    if (!req.user) {
        console.log(`[releases.controller][upsertCollection] ❌ No user context - returning 401`);
        res.status(401).json({ message: 'Authentication required' });
        return;
    }

    const releaseId = parsePositiveInt(req.params.releaseId);
    if (Number.isNaN(releaseId)) {
        res.status(400).json({ message: 'Release ID must be a positive integer' });
        return;
    }

    const { userId, username } = req.user;
    const { wishlist, notes, priceThreshold, rating } = req.body as UpsertCollectionRequest;
    
    console.log(`[releases.controller][upsertCollection] Processing for user ${username} (${userId}), release ${releaseId}`, {
        wishlist,
        hasNotes: !!notes,
        priceThreshold,
        rating
    });

    try {
        const result = await ReleasesDao.upsertCollection(
            userId,
            releaseId,
            username,
            {
                wishlist,
                notes,
                priceThreshold,
                rating: rating !== undefined && rating !== null ? rating : undefined
            }
        );

        res.status(200).json(result);
    } catch (error) {
        console.error('[releases.controller][upsertCollection][Error]', error);
        handleDiscogsError(error, res, 'Failed to update collection entry');
    }
};

/**
 * DELETE /api/releases/:releaseId/collection
 * Delete collection entry for a release
 */
export const deleteCollection: RequestHandler = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
    }

    const releaseId = parsePositiveInt(req.params.releaseId);
    if (Number.isNaN(releaseId)) {
        res.status(400).json({ message: 'Release ID must be a positive integer' });
        return;
    }

    const { userId, username } = req.user;

    try {
        await ReleasesDao.deleteCollection(userId, releaseId, username);
        res.status(200).json({ message: 'Release removed from collection' });
    } catch (error) {
        handleDiscogsError(error, res, 'Failed to remove collection entry');
    }
};
