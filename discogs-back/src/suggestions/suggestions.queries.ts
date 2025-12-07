export const suggestionsQueries = {
    readUserTopReleases: `
        SELECT top_releases
        FROM users
        WHERE username = ?
    `,
    
    updateUserTopReleases: `
        UPDATE users
        SET top_releases = ?
        WHERE username = ?
    `
}