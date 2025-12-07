import { deleteCollectionItem, updateCollectionItem } from "./collection.dao";

export const collectionQueries = {
    readCollection: `
    SELECT
        user_records.user_id,
        records.discogs_id,
        records.title,
        records.artist,
        records.release_year,
        records.genre,
        records.styles,
        records.thumb_url,
        records.cover_image_url,
        user_records.notes,
        user_records.price_threshold,
        user_records.rating,
        user_records.ranking,
        user_records.wishlist
    FROM user_records
    JOIN records ON user_records.discogs_id = records.discogs_id
    WHERE user_records.user_id = ? AND user_records.wishlist = 0
    `,

    readCollectionItem:`
    SELECT
        user_records.user_id,
        records.discogs_id,
        records.title,
        records.artist,
        records.release_year,
        records.genre,
        records.styles,
        user_records.notes,
        user_records.price_threshold,
        user_records.rating,
        user_records.ranking,
        user_records.wishlist
    FROM user_records
    JOIN records ON user_records.discogs_id = records.discogs_id
    WHERE user_records.user_id = ? && records.discogs_id = ?
    `,

    createCollectionItem:`
    INSERT INTO user_records (user_id, discogs_id, rating, ranking, notes, price_threshold, wishlist)
    VALUES (?,?,?,?,?,?,?) 
    `,

    updateCollectionItem:`
    UPDATE user_records
    SET rating = ?, ranking = ?, notes = ?, price_threshold = ?, wishlist = ?
    WHERE user_id = ? && discogs_id = ?;
    `,

    deleteCollectionItem:`
    DELETE FROM user_records WHERE user_id = ? && discogs_id = ?
    `,

    upsertCollectionItem: `
    INSERT INTO user_records (user_id, discogs_id, rating, ranking, notes, price_threshold, wishlist)
    VALUES (?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE
      rating = VALUES(rating),
      ranking = VALUES(ranking),
      notes = VALUES(notes),
      price_threshold = VALUES(price_threshold),
      wishlist = VALUES(wishlist);
    `,

    readWantlist: `
    SELECT
        user_records.user_id,
        records.discogs_id,
        records.title,
        records.artist,
        records.release_year,
        records.genre,
        records.styles,
        records.thumb_url,
        records.cover_image_url,
        user_records.notes,
        user_records.price_threshold,
        user_records.rating,
        user_records.ranking,
        user_records.wishlist
    FROM user_records
    JOIN records ON user_records.discogs_id = records.discogs_id
    WHERE user_records.user_id = ? AND user_records.wishlist = 1
    `
}