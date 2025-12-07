
export const userQueries = {
    readUsers: `
     SELECT
        users.user_id,
        users.username,
        users.email,
        users.password,
        users.is_admin,
        users.discogs_token,
        users.discogs_token_secret,
        users.user_image,
        users.public_resources
    FROM users
    `,

    createUser:`
    INSERT INTO users (username, email, password, user_image)
    VALUES (?,?,?,?)
    `,

    readUserByUsername:`
    SELECT
        users.user_id,
        users.username,
        users.password,
        users.email,
        users.is_admin,
        users.discogs_token,
        users.discogs_token_secret,
        users.user_image,
        users.public_resources
    FROM users
    WHERE users.username = ?
    `,

    updateUser:`
    UPDATE users
    SET username = ?, email = ?, password = ?
    WHERE username = ?
    `,

    deleteUser:`
    DELETE FROM Discogs.users WHERE username = ?
    `
}