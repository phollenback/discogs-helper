export const adminQueries = {
    readAllUsers: `
        SELECT
            user_id,
            username,
            email,
            is_admin,
            discogs_token,
            discogs_token_secret,
            created_at,
            updated_at
        FROM Discogs.users
        ORDER BY created_at DESC
    `,
    
    readUserByUsername: `
        SELECT
            user_id,
            username,
            email,
            is_admin,
            created_at,
            updated_at
        FROM Discogs.users
        WHERE username = ?
    `,
    
    updateUser: `
        UPDATE Discogs.users
        SET email = ?
        WHERE username = ?
    `,
    
    updateUserPassword: `
        UPDATE Discogs.users
        SET password = ?
        WHERE username = ?
    `,
    
    updateUserEmailAndPassword: `
        UPDATE Discogs.users
        SET email = ?, password = ?
        WHERE username = ?
    `,
    
    deleteUser: `
        DELETE FROM Discogs.users
        WHERE username = ?
    `
};

