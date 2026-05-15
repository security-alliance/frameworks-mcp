import * as crypto from 'crypto';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const DEFAULT_RATE_LIMIT = 100;
const RATE_WINDOW_MS = 60 * 1000;
const MAX_CLIENTS = 10000;

const rateLimitStore = new Map<string, RateLimitEntry>();

const RATE_LIMIT = parseInt(process.env.RATE_LIMIT || String(DEFAULT_RATE_LIMIT), 10);

if (Number.isNaN(RATE_LIMIT) || RATE_LIMIT < 1) {
  throw new Error(`Invalid RATE_LIMIT env var: ${process.env.RATE_LIMIT}`);
}

export const rateLimiter = {
  check(clientId: string): boolean {
    const now = Date.now();

    if (rateLimitStore.size >= MAX_CLIENTS) {
      let oldest: string | null = null;
      let oldestReset = Infinity;
      for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetAt < oldestReset) {
          oldest = key;
          oldestReset = entry.resetAt;
        }
      }
      if (oldest !== null) {
        rateLimitStore.delete(oldest);
      }
    }

    const entry = rateLimitStore.get(clientId);

    if (!entry || entry.resetAt < now) {
      rateLimitStore.set(clientId, {
        count: 1,
        resetAt: now + RATE_WINDOW_MS,
      });
      return true;
    }

    if (entry.count >= RATE_LIMIT) {
      return false;
    }

    entry.count++;
    return true;
  },

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  },

  getSize(): number {
    return rateLimitStore.size;
  },
};

setInterval(() => rateLimiter.cleanup(), RATE_WINDOW_MS);

function getApiKey(): string {
  return process.env.API_KEY || '';
}

export function checkApiKey(req: { headers?: Record<string, string | string[] | undefined> }): boolean {
  const apiKey = getApiKey();
  if (!apiKey) {
    return true;
  }

  const auth = req.headers?.['authorization'];
  if (!auth) {
    return false;
  }

  if (typeof auth === 'string') {
    if (auth.startsWith('Bearer ')) {
      const token = auth.slice(7);
      if (token.length !== apiKey.length) {
        return false;
      }
      return crypto.timingSafeEqual(
        Buffer.from(token),
        Buffer.from(apiKey),
      );
    }
    return false;
  }

  return false;
}

export function sanitizeInput(input: unknown): Record<string, unknown> {
  if (typeof input !== 'object' || input === null) {
    return {};
  }

  const sanitized: Record<string, unknown> = {};
  const obj = input as Record<string, unknown>;

  for (const [key, value] of Object.entries(obj)) {
    const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 100);

    if (typeof value === 'string') {
      sanitized[safeKey] = value.substring(0, 10000).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
    } else if (Array.isArray(value)) {
      sanitized[safeKey] = value
        .map((v: unknown) =>
          typeof v === 'string' ? v.substring(0, 1000) : v
        )
        .slice(0, 100);
    } else if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        continue;
      }
      sanitized[safeKey] = Math.min(Math.abs(value), 1e9);
    } else if (typeof value === 'boolean') {
      sanitized[safeKey] = value;
    }
  }

  return sanitized;
}

const MAX_BODY_SIZE = 1024 * 1024;

export function parseBody(raw: string, maxLength: number = MAX_BODY_SIZE): unknown {
  if (raw.length > maxLength) {
    throw new Error('Request body too large');
  }
  return JSON.parse(raw);
}

export function getClientId(req: { headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]!.trim().substring(0, 64);
  }
  const clientId = req.headers?.['mcp-client-id'];
  if (typeof clientId === 'string') {
    return clientId.substring(0, 64);
  }
  return req.socket?.remoteAddress || 'unknown';
}

const CORS_ORIGINS_ENV = () => process.env.CORS_ORIGINS || '';

export function getCorsHeaders(): Record<string, string> {
  const corsOrigins = CORS_ORIGINS_ENV();
  if (!corsOrigins) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };
  }
  return {
    'Access-Control-Allow-Origin': corsOrigins,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
  };
}

export function sanitizeError(error: unknown): string {
  const apiKey = getApiKey();
  if (!apiKey) {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error';
  }
  return 'Internal server error';
}