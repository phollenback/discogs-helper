import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, JWTPayload } from '../utils/jwt';

// Extend Express Request interface to include user
declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    console.log(`[auth][authenticateToken] Checking authentication for ${req.method} ${req.path}`);
    console.log(`[auth][authenticateToken] Authorization header:`, req.headers.authorization ? req.headers.authorization.substring(0, 30) + '...' : 'none');
    
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
        console.log(`[auth][authenticateToken] ❌ No token found in Authorization header`);
        return res.status(401).json({ message: 'Access token required' });
    }
    
    console.log(`[auth][authenticateToken] Token extracted: ${token.substring(0, 20)}...`);
    
    try {
        const payload = verifyToken(token);
        req.user = payload;
        console.log(`[auth][authenticateToken] ✅ Token verified for user: ${payload.username} (${payload.userId})`);
        next();
    } catch (error) {
        console.log(`[auth][authenticateToken] ❌ Token verification failed:`, error);
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
        try {
            const payload = verifyToken(token);
            req.user = payload;
        } catch (error) {
            // Token is invalid but we continue without authentication
            req.user = undefined;
        }
    }
    
    next();
};

