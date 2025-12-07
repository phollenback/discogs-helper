import { OkPacket } from "mysql";
import { execute } from '../services/mysql.connector';
import { collectionQueries } from './collection.queries'
import { CollectionItem } from "./collection.model";

export const readCollection = async (userId : number)  => {
    console.log(`[DAO][readCollection] Executing query for user ID: ${userId}`);
    try {
        const result = await execute<CollectionItem[]>(collectionQueries.readCollection, [userId]);
        console.log(`[DAO][readCollection] Query executed successfully, returned ${Array.isArray(result) ? result.length : 'non-array'} items`);
        return result;
    } catch (error: any) {
        console.error(`[DAO][readCollection][ERROR] Failed to execute query for user ID: ${userId}:`, error);
        console.error(`[DAO][readCollection][ERROR] Error details:`, {
            message: error?.message,
            code: error?.code,
            sqlMessage: error?.sqlMessage,
            sql: error?.sql
        });
        throw error;
    }
};

export const createCollectionItem = async (item : CollectionItem)  => {
    console.log('in create CI');
    // Normalize price_threshold: empty string or invalid values become NULL for DECIMAL column
    const normalizedPriceThreshold = 
        item.priceThreshold === '' || item.priceThreshold === null || item.priceThreshold === undefined
            ? null
            : item.priceThreshold;
    return execute<OkPacket>(collectionQueries.createCollectionItem,
         [item.userId, item.recordId, item.rating, item.ranking, item.notes, normalizedPriceThreshold, item.wishlist]);
};

export const readCollectionItem = async (userId : number, discogsId : number)  => {
    console.log('in read CI');
    return execute<CollectionItem>(collectionQueries.readCollectionItem, [userId, discogsId]);
};

export const updateCollectionItem = async (item : CollectionItem, userId : number, recordId : number)  => {
    console.log('in update CI');
    // Normalize price_threshold: empty string or invalid values become NULL for DECIMAL column
    const normalizedPriceThreshold = 
        item.priceThreshold === '' || item.priceThreshold === null || item.priceThreshold === undefined
            ? null
            : item.priceThreshold;
    return execute<OkPacket>(collectionQueries.updateCollectionItem,
         [item.rating, item.ranking, item.notes, normalizedPriceThreshold, item.wishlist, userId, recordId]);
};

export const deleteCollectionItem = async (userId : number, recordId : number)  => {
    console.log('in delete CI');
    return execute<OkPacket>(collectionQueries.deleteCollectionItem, [userId, recordId]);
};

export const upsertCollectionItem = async (item : CollectionItem)  => {
    console.log('in upsert CI');
    // Normalize price_threshold: empty string or invalid values become NULL for DECIMAL column
    // DECIMAL(10,2) cannot accept empty strings, must be a number or NULL
    let normalizedPriceThreshold: string | null = null;
    if (item.priceThreshold !== '' && item.priceThreshold !== null && item.priceThreshold !== undefined) {
        const trimmed = String(item.priceThreshold).trim();
        normalizedPriceThreshold = trimmed === '' ? null : trimmed;
    }
    console.log(`[collection.dao][upsertCollectionItem] priceThreshold: "${item.priceThreshold}" -> normalized: ${normalizedPriceThreshold}`);
    return execute<OkPacket>(collectionQueries.upsertCollectionItem,
         [item.userId, item.recordId, item.rating, item.ranking, item.notes, normalizedPriceThreshold, item.wishlist]);
};

export const readWantlist = async (userId : number)  => {
    console.log(`[DAO][readWantlist] Executing query for user ID: ${userId}`);
    try {
        const result = await execute<CollectionItem[]>(collectionQueries.readWantlist, [userId]);
        console.log(`[DAO][readWantlist] Query executed successfully, returned ${Array.isArray(result) ? result.length : 'non-array'} items`);
        return result;
    } catch (error: any) {
        console.error(`[DAO][readWantlist][ERROR] Failed to execute query for user ID: ${userId}:`, error);
        console.error(`[DAO][readWantlist][ERROR] Error details:`, {
            message: error?.message,
            code: error?.code,
            sqlMessage: error?.sqlMessage,
            sql: error?.sql
        });
        throw error;
    }
};