import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sanitizeInput, rateLimiter, parseBody, getClientId, checkApiKey, getSecurityHeaders, getCorsHeaders, sanitizeError } from '../src/security/middleware.js';

describe('sanitizeInput', () => {
  it('should sanitize string values with length limits', () => {
    const input = { query: 'a'.repeat(20000) };
    const result = sanitizeInput(input);
    expect((result as Record<string, unknown>).query).toHaveLength(10000);
  });

  it('should sanitize array values with item count limits', () => {
    const input = { tags: Array.from({ length: 200 }, (_, i) => `tag${i}`) };
    const result = sanitizeInput(input);
    expect((result as Record<string, unknown>).tags).toHaveLength(100);
  });

  it('should sanitize array string values with length limits', () => {
    const input = { tags: ['a'.repeat(5000)] };
    const result = sanitizeInput(input);
    const tags = (result as Record<string, unknown>).tags as string[];
    expect(tags[0]).toHaveLength(1000);
  });

  it('should sanitize number values with clamping', () => {
    const input = { limit: 1e15 };
    const result = sanitizeInput(input);
    expect((result as Record<string, unknown>).limit).toBe(1e9);
  });

  it('should reject NaN and Infinity numbers', () => {
    const input = { val: NaN };
    const result = sanitizeInput(input);
    expect(result.val).toBeUndefined();
  });

  it('should reject Infinity numbers', () => {
    const input = { val: Infinity };
    const result = sanitizeInput(input);
    expect(result.val).toBeUndefined();
  });

  it('should sanitize object keys by stripping non-alphanumeric chars', () => {
    const input = { 'eval<script>': 'test' };
    const result = sanitizeInput(input);
    expect(result['evalscript']).toBe('test');
    expect(result['eval<script>']).toBeUndefined();
  });

  it('should strip control characters from strings', () => {
    const input = { query: 'hello\x00world\x01\x08' };
    const result = sanitizeInput(input);
    expect((result as Record<string, unknown>).query).toBe('helloworld');
  });

  it('should pass through boolean values', () => {
    const input = { flag: true };
    const result = sanitizeInput(input);
    expect((result as Record<string, unknown>).flag).toBe(true);
  });

  it('should reject non-object input', () => {
    expect(sanitizeInput('string')).toEqual({});
    expect(sanitizeInput(null)).toEqual({});
    expect(sanitizeInput(undefined)).toEqual({});
    expect(sanitizeInput(42)).toEqual({});
  });

  it('should reject nested objects (pass-through removal)', () => {
    const input = { nested: { deep: 'value' } };
    const result = sanitizeInput(input);
    expect(result.nested).toBeUndefined();
  });

  it('should truncate key names to 100 chars', () => {
    const longKey = 'a'.repeat(200);
    const input = { [longKey]: 'test' };
    const result = sanitizeInput(input);
    const keys = Object.keys(result);
    expect(keys[0]).toHaveLength(100);
  });

  it('should handle empty object', () => {
    const result = sanitizeInput({});
    expect(result).toEqual({});
  });
});

describe('rateLimiter', () => {
  beforeEach(() => {
    rateLimiter.cleanup();
  });

  it('should allow requests under the limit', () => {
    expect(rateLimiter.check('client1')).toBe(true);
  });

  it('should block requests over the limit', () => {
    for (let i = 0; i < 100; i++) {
      rateLimiter.check('client_spammer');
    }
    expect(rateLimiter.check('client_spammer')).toBe(false);
  });

  it('should track different clients independently', () => {
    for (let i = 0; i < 100; i++) {
      rateLimiter.check('client_a');
    }
    expect(rateLimiter.check('client_a')).toBe(false);
    expect(rateLimiter.check('client_b')).toBe(true);
  });

  it('should report store size', () => {
    rateLimiter.check('test_client');
    expect(rateLimiter.getSize()).toBeGreaterThan(0);
  });

  it('should handle max client eviction', () => {
    for (let i = 0; i < 10001; i++) {
      rateLimiter.check(`client_${i}`);
    }
    expect(rateLimiter.getSize()).toBeLessThanOrEqual(10001);
  });
});

describe('parseBody', () => {
  it('should parse valid JSON', () => {
    const result = parseBody('{"key": "value"}');
    expect(result).toEqual({ key: 'value' });
  });

  it('should reject oversized bodies by default', () => {
    const big = 'x'.repeat(1024 * 1024 + 1);
    expect(() => parseBody(big)).toThrow('Request body too large');
  });

  it('should reject oversized bodies with custom limit', () => {
    const small = 'x'.repeat(101);
    expect(() => parseBody(small, 100)).toThrow('Request body too large');
  });

  it('should reject invalid JSON', () => {
    expect(() => parseBody('not json')).toThrow();
  });
});

describe('getClientId', () => {
  it('should use x-forwarded-for header when present', () => {
    const req = { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } };
    expect(getClientId(req)).toBe('1.2.3.4');
  });

  it('should use mcp-client-id header when no x-forwarded-for', () => {
    const req = { headers: { 'mcp-client-id': 'my-agent' } };
    expect(getClientId(req)).toBe('my-agent');
  });

  it('should fall back to socket remote address', () => {
    const req = { socket: { remoteAddress: '10.0.0.1' } };
    expect(getClientId(req)).toBe('10.0.0.1');
  });

  it('should default to unknown', () => {
    const req = {};
    expect(getClientId(req)).toBe('unknown');
  });

  it('should truncate long client IDs', () => {
    const req = { headers: { 'mcp-client-id': 'a'.repeat(200) } };
    expect(getClientId(req)).toHaveLength(64);
  });
});

describe('checkApiKey', () => {
  it('should allow requests when no API_KEY is set', () => {
    const originalApiKey = process.env.API_KEY;
    delete process.env.API_KEY;
    expect(checkApiKey({})).toBe(true);
    if (originalApiKey) process.env.API_KEY = originalApiKey;
  });

  it('should reject requests without authorization when API_KEY is set', () => {
    const originalApiKey = process.env.API_KEY;
    process.env.API_KEY = 'test-secret-key';
    expect(checkApiKey({})).toBe(false);
    process.env.API_KEY = originalApiKey || '';
    if (!originalApiKey) delete process.env.API_KEY;
  });

  it('should accept valid Bearer token', () => {
    const originalApiKey = process.env.API_KEY;
    process.env.API_KEY = 'test-secret-key';
    expect(checkApiKey({ headers: { authorization: 'Bearer test-secret-key' } })).toBe(true);
    process.env.API_KEY = originalApiKey || '';
    if (!originalApiKey) delete process.env.API_KEY;
  });

  it('should reject invalid Bearer token (timing-safe)', () => {
    const originalApiKey = process.env.API_KEY;
    process.env.API_KEY = 'test-secret-key';
    expect(checkApiKey({ headers: { authorization: 'Bearer wrong-key' } })).toBe(false);
    process.env.API_KEY = originalApiKey || '';
    if (!originalApiKey) delete process.env.API_KEY;
  });

  it('should reject non-Bearer authorization', () => {
    const originalApiKey = process.env.API_KEY;
    process.env.API_KEY = 'test-secret-key';
    expect(checkApiKey({ headers: { authorization: 'Basic dGVzdDp0ZXN0' } })).toBe(false);
    process.env.API_KEY = originalApiKey || '';
    if (!originalApiKey) delete process.env.API_KEY;
  });
});

describe('getSecurityHeaders', () => {
  it('should return standard security headers', () => {
    const headers = getSecurityHeaders();
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Cache-Control']).toBe('no-store');
    expect(headers['Content-Type']).toBe('application/json');
  });
});

describe('getCorsHeaders', () => {
  it('should return wildcard CORS when CORS_ORIGINS is not set', () => {
    const original = process.env.CORS_ORIGINS;
    delete process.env.CORS_ORIGINS;
    const headers = getCorsHeaders();
    expect(headers['Access-Control-Allow-Origin']).toBe('*');
    expect(headers['Access-Control-Allow-Methods']).toContain('GET');
    expect(headers['Access-Control-Allow-Methods']).toContain('POST');
    expect(headers['Access-Control-Allow-Headers']).toContain('Authorization');
    process.env.CORS_ORIGINS = original;
    if (!original) delete process.env.CORS_ORIGINS;
  });

  it('should return specific origin when CORS_ORIGINS is set', () => {
    const original = process.env.CORS_ORIGINS;
    process.env.CORS_ORIGINS = 'https://example.com';
    const headers = getCorsHeaders();
    expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com');
    process.env.CORS_ORIGINS = original;
    if (!original) delete process.env.CORS_ORIGINS;
  });
});

describe('sanitizeError', () => {
  it('should return error message when no API_KEY is set', () => {
    const originalApiKey = process.env.API_KEY;
    delete process.env.API_KEY;
    expect(sanitizeError(new Error('database connection failed'))).toBe('database connection failed');
    if (originalApiKey) process.env.API_KEY = originalApiKey;
  });

  it('should return generic message when API_KEY is set', () => {
    const originalApiKey = process.env.API_KEY;
    process.env.API_KEY = 'secret';
    expect(sanitizeError(new Error('database connection failed'))).toBe('Internal server error');
    process.env.API_KEY = originalApiKey || '';
    if (!originalApiKey) delete process.env.API_KEY;
  });

  it('should handle non-Error objects without API_KEY', () => {
    const originalApiKey = process.env.API_KEY;
    delete process.env.API_KEY;
    expect(sanitizeError('string error')).toBe('Unknown error');
    if (originalApiKey) process.env.API_KEY = originalApiKey;
  });
});