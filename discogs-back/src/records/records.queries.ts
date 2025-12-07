
export const recordQueries = {
    readRecords: `
     SELECT
        *
    FROM Discogs.records
    `,

    readRecordsByUser:`
        SELECT records.record_id,
               records.discogs_id,
	           records.title,
               records.artist,
               records.release_year,
               records.genre,
               records.styles
        FROM records
        JOIN user_records ON records.record_id = user_records.record_id
        WHERE user_records.user_id = ?
    `,

    readRecordByDiscogsId:`
        SELECT discogs_id, title, artist, release_year, genre, styles, thumb_url, cover_image_url
        FROM records
        WHERE discogs_id = ?
        LIMIT 1
    `,

    createRecord:`
        INSERT INTO records (discogs_id, title, artist, release_year, genre, styles, thumb_url, cover_image_url)
        VALUES (?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            artist = VALUES(artist),
            release_year = VALUES(release_year),
            genre = VALUES(genre),
            styles = VALUES(styles),
            thumb_url = VALUES(thumb_url),
            cover_image_url = VALUES(cover_image_url);
    `,

    upsertRecord:`
        INSERT INTO records (discogs_id, title, artist, release_year, genre, styles, thumb_url, cover_image_url)
        VALUES (?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            artist = VALUES(artist),
            release_year = VALUES(release_year),
            genre = VALUES(genre),
            styles = VALUES(styles),
            thumb_url = VALUES(thumb_url),
            cover_image_url = VALUES(cover_image_url);
    `,

    createManualRecord:`
        INSERT INTO records (title, artist, release_year, genre, styles, thumb_url, cover_image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?);
    `,

    updateRecord:`
        UPDATE records
        SET title = ?,
            artist = ?,
            release_year = ?,
            genre = ?,
            styles = ?
        WHERE record_id = ?;
    `,

    deleteRecord:`
        DELETE FROM user_records 
        WHERE user_records.user_id = ? && 
        user_records.record_id = ?;
    `
}