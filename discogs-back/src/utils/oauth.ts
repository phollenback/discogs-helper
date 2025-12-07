import crypto from 'crypto';

// OAuth 1.0a signature generation
export const generateOAuthSignature = (
    method: string,
    url: string,
    params: Record<string, string>,
    consumerSecret: string,
    tokenSecret: string = ''
): string => {
    // Sort parameters alphabetically
    const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');

    // Create signature base string
    const signatureBaseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;

    // Create signing key
    const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

    // Generate HMAC-SHA1 signature
    const signature = crypto
        .createHmac('sha1', signingKey)
        .update(signatureBaseString)
        .digest('base64');

    return signature;
};

// Generate OAuth header
export const generateOAuthHeader = (params: Record<string, string>): string => {
    const authParams = Object.keys(params)
        .sort()
        .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(params[key])}"`)
        .join(', ');

    return `OAuth ${authParams}`;
};

// Generate random nonce
export const generateNonce = (): string => {
    return crypto.randomBytes(16).toString('hex');
};

// Generate timestamp
export const generateTimestamp = (): string => {
    return Math.floor(Date.now() / 1000).toString();
};

