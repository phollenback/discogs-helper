import { OkPacket } from "mysql";
import { execute } from '../services/mysql.connector';
import { User } from './users.model'
import { userQueries } from './users.queries'

export const readUsers = async ()  => {
    console.log('[users.dao][readUsers] Fetching all users from database');
    const users = await execute<User[]>(userQueries.readUsers, []);
    console.log(`[users.dao][readUsers] Successfully fetched ${users.length} users from database`);
    return users;
};

export const createUser = async (user : User)  => {
    console.log('[users.dao][createUser] Creating new user with username:', user.username);
    const result = await execute<OkPacket>(userQueries.createUser, [user.username, user.email, user.password, user.user_image || null]);
    console.log(`[users.dao][createUser] User created successfully with ID: ${result.insertId}`);
    return result;
};

export const readUserByUsername = async (username : string)  => {
    console.log(`[users.dao][readUserByUsername] Fetching user with username: ${username}`);
    const users = await execute<User[]>(userQueries.readUserByUsername, [username]);
    console.log(`[users.dao][readUserByUsername] Found ${users.length} user(s) with username: ${username}`);
    return users;
};

export const updateUser = async (user : User, username : string)  => {
    console.log(`[users.dao][updateUser] Updating user with username: ${username}`);
    const result = await execute<OkPacket>(userQueries.updateUser, [user.username, user.email, user.password, username]);
    console.log(`[users.dao][updateUser] User updated - affected rows: ${result.affectedRows}`);
    return result;
};

export const deleteUser = async (username : string)  => {
    console.log(`[users.dao][deleteUser] Deleting user with username: ${username}`);
    const result = await execute<OkPacket>(userQueries.deleteUser, [username]);
    console.log(`[users.dao][deleteUser] User deleted - affected rows: ${result.affectedRows}`);
    return result;
};

export const updateDiscogsToken = async (userId: number, token: string, tokenSecret: string | null = null) => {
    console.log(`[users.dao][updateDiscogsToken] Updating token and secret for userId: ${userId}`);
    console.log(`[users.dao][updateDiscogsToken] Token present: ${!!token}, Secret present: ${!!tokenSecret}`);
    const result = await execute<OkPacket>(
        'UPDATE users SET discogs_token = ?, discogs_token_secret = ? WHERE user_id = ?',
        [token, tokenSecret, userId]
    );
    console.log(`[users.dao][updateDiscogsToken] Token updated - affected rows: ${result.affectedRows}`);
    return result;
};

export const updatePublicResourcesSetting = async (userId: number, publicResources: boolean): Promise<OkPacket> => {
    console.log(`[users.dao][updatePublicResourcesSetting] Updating public_resources to ${publicResources} for userId: ${userId}`);
    const result = await execute<OkPacket>(
        'UPDATE users SET public_resources = ? WHERE user_id = ?',
        [publicResources, userId]
    );
    console.log(`[users.dao][updatePublicResourcesSetting] Setting updated - affected rows: ${result.affectedRows}`);
    return result;
};
