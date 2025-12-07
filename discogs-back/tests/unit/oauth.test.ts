import { generateOAuthSignature, generateOAuthHeader, generateNonce, generateTimestamp } from '../../src/utils/oauth';

describe('OAuth Utility Tests', () => {
  describe('generateNonce', () => {
    it('should generate a random nonce', () => {
      const nonce = generateNonce();
      expect(nonce).toBeDefined();
      expect(typeof nonce).toBe('string');
      expect(nonce.length).toBe(32);
    });
  });

  describe('generateTimestamp', () => {
    it('should generate a timestamp', () => {
      const timestamp = generateTimestamp();
      expect(timestamp).toBeDefined();
      expect(typeof timestamp).toBe('string');
      expect(parseInt(timestamp)).toBeGreaterThan(0);
    });
  });

  describe('generateOAuthHeader', () => {
    it('should generate OAuth header from params', () => {
      const params = {
        oauth_consumer_key: 'test_key',
        oauth_nonce: 'test_nonce',
        oauth_timestamp: '1234567890',
        oauth_signature: 'test_signature'
      };
      const header = generateOAuthHeader(params);
      expect(header).toBeDefined();
      expect(typeof header).toBe('string');
      expect(header).toContain('OAuth');
      expect(header).toContain('oauth_consumer_key="test_key"');
    });
  });

  describe('generateOAuthSignature', () => {
    it('should generate OAuth signature', () => {
      const params = {
        oauth_consumer_key: 'consumer_key',
        oauth_nonce: 'nonce123',
        oauth_timestamp: '1234567890',
        oauth_signature_method: 'HMAC-SHA1',
        oauth_version: '1.0'
      };
      const signature = generateOAuthSignature('POST', 'https://api.example.com/test', params, 'consumer_secret');
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
    });

    it('should handle empty token secret', () => {
      const params = {
        oauth_consumer_key: 'consumer_key',
        oauth_nonce: 'nonce123',
        oauth_timestamp: '1234567890',
        oauth_signature_method: 'HMAC-SHA1',
        oauth_version: '1.0'
      };
      const signature = generateOAuthSignature('GET', 'https://api.example.com/test', params, 'consumer_secret', '');
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
    });
  });
});

