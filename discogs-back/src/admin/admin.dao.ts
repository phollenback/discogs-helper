import { OkPacket } from "mysql";
import { execute } from '../services/mysql.connector';
import { AdminUser } from './admin.model';
import { adminQueries } from './admin.queries';

export const readAllUsers = async () => {
    console.log('[admin.dao][readAllUsers] Fetching all users');
    return execute<AdminUser[]>(adminQueries.readAllUsers, []);
};

export const readUserByUsername = async (username: string) => {
    console.log(`[admin.dao][readUserByUsername] Fetching user: ${username}`);
    return execute<AdminUser[]>(adminQueries.readUserByUsername, [username]);
};

export const updateUserEmail = async (email: string, username: string) => {
    console.log(`[admin.dao][updateUserEmail] Updating email for user: ${username}`);
    return execute<OkPacket>(adminQueries.updateUser, [email, username]);
};

export const updateUserPassword = async (password: string, username: string) => {
    console.log(`[admin.dao][updateUserPassword] Updating password for user: ${username}`);
    return execute<OkPacket>(adminQueries.updateUserPassword, [password, username]);
};

export const updateUserEmailAndPassword = async (email: string, password: string, username: string) => {
    console.log(`[admin.dao][updateUserEmailAndPassword] Updating email and password for user: ${username}`);
    return execute<OkPacket>(adminQueries.updateUserEmailAndPassword, [email, password, username]);
};

export const updateUserFields = async (updateFields: any, username: string) => {
    console.log(`[admin.dao][updateUserFields] Updating fields for user: ${username}`, Object.keys(updateFields));
    
    // Build dynamic SQL query
    const setClause = Object.keys(updateFields).map(field => `${field} = ?`).join(', ');
    const query = `UPDATE users SET ${setClause} WHERE username = ?`;
    const values = [...Object.values(updateFields), username];
    
    console.log(`[admin.dao][updateUserFields] Query: ${query}`);
    return execute<OkPacket>(query, values);
};

export const deleteUser = async (username: string) => {
    console.log(`[admin.dao][deleteUser] Deleting user: ${username}`);
    return execute<OkPacket>(adminQueries.deleteUser, [username]);
};

