import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
    user?: {
        userId: number;
        username: string;
        email: string;
        isAdmin?: boolean;
    };
}

export const checkAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Check if user is authenticated
        if (!req.user) {
            res.status(401).json({
                message: 'Unauthorized: Authentication required'
            });
            return;
        }

        // Check if user is admin
        if (!req.user.isAdmin) {
            console.log(`[admin.middleware][checkAdmin] Access denied for user: ${req.user.username}`);
            res.status(403).json({
                message: 'Forbidden: Admin access required'
            });
            return;
        }

        console.log(`[admin.middleware][checkAdmin] Admin access granted for user: ${req.user.username}`);
        next();
    } catch (error) {
        console.error('[admin.middleware][checkAdmin][Error]', error);
        res.status(500).json({
            message: 'Internal server error'
        });
    }
};

