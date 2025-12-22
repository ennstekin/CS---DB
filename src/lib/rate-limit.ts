/**
 * Distributed rate limiting with Vercel KV (Redis)
 * Falls back to in-memory if KV is not configured
 */

import { kv } from '@vercel/kv';

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

// Check if Vercel KV is configured
const isKvConfigured = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// Fallback in-memory store (for development without KV)
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const memoryStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically (only for memory store)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      if (entry.resetAt < now) {
        memoryStore.delete(key);
      }
    }
  }, 60000);
}

/**
 * Check rate limit for a given identifier using Vercel KV
 */
async function checkRateLimitKV(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const key = `ratelimit:${identifier}`;

  try {
    // Use Redis INCR with expiry for atomic rate limiting
    const count = await kv.incr(key);

    // Set expiry on first request
    if (count === 1) {
      await kv.expire(key, config.windowSeconds);
    }

    // Get TTL for reset time calculation
    const ttl = await kv.ttl(key);
    const resetAt = now + (ttl > 0 ? ttl * 1000 : windowMs);

    if (count > config.limit) {
      return {
        success: false,
        remaining: 0,
        resetAt,
        retryAfter: ttl > 0 ? ttl : config.windowSeconds,
      };
    }

    return {
      success: true,
      remaining: config.limit - count,
      resetAt,
    };
  } catch (error) {
    console.error('Rate limit KV error, falling back to allow:', error);
    // On KV error, allow the request but log it
    return {
      success: true,
      remaining: config.limit,
      resetAt: now + windowMs,
    };
  }
}

/**
 * Check rate limit using in-memory store (fallback)
 */
function checkRateLimitMemory(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const key = identifier;

  let entry = memoryStore.get(key);

  // If no entry or window expired, create new entry
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + windowMs,
    };
    memoryStore.set(key, entry);
    return {
      success: true,
      remaining: config.limit - 1,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count++;

  // Check if over limit
  if (entry.count > config.limit) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  return {
    success: true,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Check rate limit for a given identifier
 * Uses Vercel KV if configured, falls back to in-memory
 * @param identifier - Unique identifier (usually IP address or user ID)
 * @param config - Rate limit configuration
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  if (isKvConfigured) {
    return checkRateLimitKV(identifier, config);
  }

  // Log warning in production if KV is not configured
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️ Rate limiting using in-memory store. Configure Vercel KV for distributed rate limiting.');
  }

  return checkRateLimitMemory(identifier, config);
}

/**
 * Synchronous rate limit check (uses memory store only)
 * For backwards compatibility - prefer async checkRateLimit
 * @deprecated Use async checkRateLimit instead
 */
export function checkRateLimitSync(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  return checkRateLimitMemory(identifier, config);
}

/**
 * Get client IP from request
 */
export function getClientIP(request: Request): string {
  // Check common headers for real IP (behind proxies)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Vercel specific header
  const vercelIP = request.headers.get('x-vercel-forwarded-for');
  if (vercelIP) {
    return vercelIP.split(',')[0].trim();
  }

  // Fallback
  return 'unknown';
}

// Preset configurations for common use cases
export const RateLimitPresets = {
  /** Standard API: 100 requests per minute */
  standard: { limit: 100, windowSeconds: 60 },

  /** Strict: 20 requests per minute (for sensitive endpoints) */
  strict: { limit: 20, windowSeconds: 60 },

  /** Auth: 5 attempts per minute (for login/verification) */
  auth: { limit: 5, windowSeconds: 60 },

  /** Bulk: 10 requests per minute (for heavy operations) */
  bulk: { limit: 10, windowSeconds: 60 },
} as const;
