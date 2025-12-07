import { Request, RequestHandler, Response } from 'express';
import * as AdminDao from './admin.dao';

export const readAllUsers: RequestHandler = async (req: Request, res: Response) => {
    try {
        console.log('[admin.controller][readAllUsers] Fetching all users');
        
        const users = await AdminDao.readAllUsers();
        
        // Sanitize users - remove passwords and sensitive info
        const sanitizedUsers = users.map(user => ({
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            is_admin: user.is_admin || false,
            discogs_token: user.discogs_token || null,
            discogs_connected: !!(user.discogs_token && user.discogs_token_secret),
            created_at: user.created_at
        }));
        
        console.log(`[admin.controller][readAllUsers] Successfully fetched ${sanitizedUsers.length} users`);
        
        res.status(200).json({
            users: sanitizedUsers,
            count: sanitizedUsers.length
        });
    } catch (error) {
        console.error('[admin.controller][readAllUsers][Error]', error);
        res.status(500).json({
            message: 'There was an error when fetching all users'
        });
    }
};

export const updateUser: RequestHandler = async (req: Request, res: Response) => {
    try {
        const username = req.params.username as string;
        const { email, newPassword, discogsToken } = req.body;
        
        console.log(`[admin.controller][updateUser] Updating user: ${username}`);
        
        if (!username) {
            res.status(400).json({ message: 'Username is required' });
            return;
        }
        
        // Validate password if provided
        if (newPassword && newPassword.length < 8) {
            res.status(400).json({ message: 'Password must be at least 8 characters long' });
            return;
        }
        
        // Check if at least one field is provided
        if (!email && !newPassword && discogsToken === undefined) {
            res.status(400).json({ message: 'At least one field (email, password, or Discogs token) must be provided' });
            return;
        }
        
        let result;
        
        // Build update object
        const updateFields: any = {};
        if (email) updateFields.email = email;
        if (newPassword) updateFields.password = newPassword;
        if (discogsToken !== undefined) updateFields.discogs_token = discogsToken || null;
        
        console.log(`[admin.controller][updateUser] Updating fields for ${username}:`, Object.keys(updateFields));
        result = await AdminDao.updateUserFields(updateFields, username);
        
        console.log(`[admin.controller][updateUser] Successfully updated user: ${username}`);
        
        res.status(200).json({
            message: 'User updated successfully',
            affectedRows: result.affectedRows
        });
    } catch (error) {
        console.error('[admin.controller][updateUser][Error]', error);
        res.status(500).json({
            message: 'There was an error when updating the user'
        });
    }
};

export const deleteUser: RequestHandler = async (req: Request, res: Response) => {
    try {
        const username = req.params.username as string;
        
        console.log(`[admin.controller][deleteUser] Deleting user: ${username}`);
        
        if (!username) {
            res.status(400).json({ message: 'Username is required' });
            return;
        }
        
        // Prevent admin from deleting themselves
        if (username === req.user?.username) {
            res.status(400).json({ message: 'You cannot delete your own account' });
            return;
        }
        
        const result = await AdminDao.deleteUser(username);
        
        console.log(`[admin.controller][deleteUser] Successfully deleted user: ${username}`);
        
        res.status(200).json({
            message: 'User deleted successfully',
            affectedRows: result.affectedRows
        });
    } catch (error) {
        console.error('[admin.controller][deleteUser][Error]', error);
        res.status(500).json({
            message: 'There was an error when deleting the user'
        });
    }
};

