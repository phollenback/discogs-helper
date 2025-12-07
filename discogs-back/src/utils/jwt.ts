import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export interface JWTPayload {
    userId: number;
    username: string;
    email: string;
    isAdmin?: boolean;
}

export const generateToken = (payload: JWTPayload): string => {
    console.log(`[JWT][generateToken] Creating token for user: ${payload.username} (ID: ${payload.userId})`);
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    console.log(`[JWT][generateToken] Token generated successfully for user: ${payload.username} (ID: ${payload.userId})`);
    return token;
};

export const verifyToken = (token: string): JWTPayload => {
    try {
        console.log(`[JWT][verifyToken] Verifying token...`);
        const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
        console.log(`[JWT][verifyToken] Token verified successfully for user: ${payload.username} (ID: ${payload.userId})`);
        return payload;
    } catch (error) {
        console.error(`[JWT][verifyToken][ERROR] Token verification failed:`, error);
        throw error;
    }
};

export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }
    
    return parts[1];
};
