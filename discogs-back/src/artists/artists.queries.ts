export const artistQueries = {
    readArtists: `
        SELECT artist_id, name, real_name, profile, discogs_id, resource_url
        FROM artists
        ORDER BY name ASC
    `,

    readArtistById: `
        SELECT artist_id, name, real_name, profile, discogs_id, resource_url
        FROM artists
        WHERE artist_id = ?
    `,

    createArtist: `
        INSERT INTO artists (name, real_name, profile, discogs_id, resource_url)
        VALUES (?, ?, ?, ?, ?)
    `,

    updateArtist: `
        UPDATE artists
        SET name = ?, real_name = ?, profile = ?, discogs_id = ?, resource_url = ?
        WHERE artist_id = ?
    `,

    deleteArtist: `
        DELETE FROM artists WHERE artist_id = ?
    `
};

