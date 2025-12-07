import { generateToken, verifyToken, extractTokenFromHeader } from '../../src/utils/jwt';

describe('JWT Utility Tests', () => {
  const testPayload = {
    userId: 1,
    username: 'testuser',
    email: 'test@example.com',
  };

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-key';
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(testPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate different tokens for different payloads', () => {
      const token1 = generateToken(testPayload);
      const token2 = generateToken({ ...testPayload, userId: 2 });
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const token = generateToken(testPayload);
      const decoded = verifyToken(token);
      
      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.username).toBe(testPayload.username);
      expect(decoded.email).toBe(testPayload.email);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => {
        verifyToken(invalidToken);
      }).toThrow();
    });

    it('should throw error for tampered token', () => {
      const token = generateToken(testPayload);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';
      
      expect(() => {
        verifyToken(tamperedToken);
      }).toThrow();
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const header = 'Bearer test-token-123';
      const token = extractTokenFromHeader(header);
      
      expect(token).toBe('test-token-123');
    });

    it('should return null for undefined header', () => {
      const token = extractTokenFromHeader(undefined);
      
      expect(token).toBeNull();
    });

    it('should return null for empty header', () => {
      const token = extractTokenFromHeader('');
      
      expect(token).toBeNull();
    });

    it('should return null for header without Bearer prefix', () => {
      const token = extractTokenFromHeader('Invalid token');
      
      expect(token).toBeNull();
    });

    it('should return null for malformed header', () => {
      const token = extractTokenFromHeader('Bearer');
      
      expect(token).toBeNull();
    });
  });
});



