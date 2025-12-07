import { Request, RequestHandler, Response } from 'express';
import * as EntityFollowsDao from './entity-follows.dao';
import { EntityType } from './entity-follows.model';
import axios from 'axios';

const DISCOGS_API_BASE = 'https://api.discogs.com';

// Helper to validate entity type
const isValidEntityType = (type: string): type is EntityType => {
    return type === 'artist' || type === 'label';
};

// Helper to fetch entity name from Discogs
const fetchEntityName = async (entityType: EntityType, discogsId: number): Promise<string | null> => {
    try {
        const token = process.env.DISCOGS_TOKEN;
        const params = token ? { token } : {};
        const response = await axios.get(
            `${DISCOGS_API_BASE}/${entityType}s/${discogsId}`, 
            { params }
        );
        return response.data.name || null;
    } catch (error) {
        console.error(`[entity-follows.controller] Failed to fetch ${entityType} name:`, error);
        return null;
    }
};

// Follow an artist or label
export const followEntity: RequestHandler = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { entityType, entityId } = req.params;

        console.log(`[followEntity] User ${userId} attempting to follow ${entityType} ${entityId}`);

        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (!isValidEntityType(entityType)) {
            return res.status(400).json({ message: 'Invalid entity type. Must be "artist" or "label"' });
        }

        const entityDiscogsId = parseInt(entityId, 10);
        if (isNaN(entityDiscogsId) || entityDiscogsId <= 0) {
            return res.status(400).json({ message: 'Invalid entity ID' });
        }

        // Check if already following
        const alreadyFollowing = await EntityFollowsDao.isFollowing(userId, entityType, entityDiscogsId);
        if (alreadyFollowing) {
            return res.status(400).json({ message: `You are already following this ${entityType}` });
        }

        // Fetch entity name from Discogs
        const entityName = await fetchEntityName(entityType, entityDiscogsId);

        // Follow the entity
        await EntityFollowsDao.followEntity(userId, entityType, entityDiscogsId, entityName || undefined);
        
        console.log(`[followEntity] User ${userId} successfully followed ${entityType} ${entityDiscogsId}`);
        res.status(201).json({ 
            message: `Successfully followed ${entityType}`,
            entity_type: entityType,
            entity_discogs_id: entityDiscogsId,
            entity_name: entityName
        });
    } catch (error) {
        console.error('[followEntity][Error]', error);
        res.status(500).json({ message: 'Error following entity' });
    }
};

// Unfollow an artist or label
export const unfollowEntity: RequestHandler = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { entityType, entityId } = req.params;

        console.log(`[unfollowEntity] User ${userId} attempting to unfollow ${entityType} ${entityId}`);

        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (!isValidEntityType(entityType)) {
            return res.status(400).json({ message: 'Invalid entity type. Must be "artist" or "label"' });
        }

        const entityDiscogsId = parseInt(entityId, 10);
        if (isNaN(entityDiscogsId) || entityDiscogsId <= 0) {
            return res.status(400).json({ message: 'Invalid entity ID' });
        }

        // Unfollow the entity
        await EntityFollowsDao.unfollowEntity(userId, entityType, entityDiscogsId);
        
        console.log(`[unfollowEntity] User ${userId} successfully unfollowed ${entityType} ${entityDiscogsId}`);
        res.status(200).json({ 
            message: `Successfully unfollowed ${entityType}`,
            entity_type: entityType,
            entity_discogs_id: entityDiscogsId
        });
    } catch (error) {
        console.error('[unfollowEntity][Error]', error);
        res.status(500).json({ message: 'Error unfollowing entity' });
    }
};

// Get follow status for an entity
export const getFollowStatus: RequestHandler = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId || null; // May be null if not authenticated
        const { entityType, entityId } = req.params;

        if (!isValidEntityType(entityType)) {
            return res.status(400).json({ message: 'Invalid entity type. Must be "artist" or "label"' });
        }

        const entityDiscogsId = parseInt(entityId, 10);
        if (isNaN(entityDiscogsId) || entityDiscogsId <= 0) {
            return res.status(400).json({ message: 'Invalid entity ID' });
        }

        const status = await EntityFollowsDao.getFollowStatus(userId, entityType, entityDiscogsId);
        
        res.status(200).json({
            entity_type: entityType,
            entity_discogs_id: entityDiscogsId,
            is_following: status.is_following,
            follower_count: status.follower_count
        });
    } catch (error) {
        console.error('[getFollowStatus][Error]', error);
        res.status(500).json({ message: 'Error fetching follow status' });
    }
};

// Get all entities a user is following
export const getFollowing: RequestHandler = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { entityType } = req.query;

        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        let following;
        if (entityType && isValidEntityType(entityType as string)) {
            following = await EntityFollowsDao.getFollowing(userId, entityType as EntityType);
        } else {
            following = await EntityFollowsDao.getFollowing(userId);
        }

        res.status(200).json(following);
    } catch (error) {
        console.error('[getFollowing][Error]', error);
        res.status(500).json({ message: 'Error fetching following list' });
    }
};

// Get all artists a user is following
export const getFollowingArtists: RequestHandler = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const artists = await EntityFollowsDao.getFollowingArtists(userId);
        res.status(200).json(artists);
    } catch (error) {
        console.error('[getFollowingArtists][Error]', error);
        res.status(500).json({ message: 'Error fetching following artists' });
    }
};

// Get all labels a user is following
export const getFollowingLabels: RequestHandler = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const labels = await EntityFollowsDao.getFollowingLabels(userId);
        res.status(200).json(labels);
    } catch (error) {
        console.error('[getFollowingLabels][Error]', error);
        res.status(500).json({ message: 'Error fetching following labels' });
    }
};

