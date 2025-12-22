import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRateLimitSync, getClientIP, RateLimitPresets } from './rate-limit';

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe('checkRateLimitSync', () => {
    it('should allow requests under the limit', () => {
      const result = checkRateLimitSync('test-user-1', { limit: 5, windowSeconds: 60 });
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should track request count correctly', () => {
      const identifier = 'test-user-2';
      const config = { limit: 3, windowSeconds: 60 };

      const result1 = checkRateLimitSync(identifier, config);
      expect(result1.remaining).toBe(2);

      const result2 = checkRateLimitSync(identifier, config);
      expect(result2.remaining).toBe(1);

      const result3 = checkRateLimitSync(identifier, config);
      expect(result3.remaining).toBe(0);
    });

    it('should block requests over the limit', () => {
      const identifier = 'test-user-3';
      const config = { limit: 2, windowSeconds: 60 };

      checkRateLimitSync(identifier, config);
      checkRateLimitSync(identifier, config);
      const result = checkRateLimitSync(identifier, config);

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should reset after window expires', () => {
      const identifier = 'test-user-4';
      const config = { limit: 1, windowSeconds: 60 };

      const result1 = checkRateLimitSync(identifier, config);
      expect(result1.success).toBe(true);

      const result2 = checkRateLimitSync(identifier, config);
      expect(result2.success).toBe(false);

      // Advance time past the window
      vi.advanceTimersByTime(61000);

      const result3 = checkRateLimitSync(identifier, config);
      expect(result3.success).toBe(true);
      expect(result3.remaining).toBe(0);
    });

    it('should handle different identifiers separately', () => {
      const config = { limit: 1, windowSeconds: 60 };

      const result1 = checkRateLimitSync('user-a', config);
      expect(result1.success).toBe(true);

      const result2 = checkRateLimitSync('user-b', config);
      expect(result2.success).toBe(true);

      const result3 = checkRateLimitSync('user-a', config);
      expect(result3.success).toBe(false);
    });
  });

  describe('getClientIP', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      });
      expect(getClientIP(request)).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-real-ip': '192.168.1.2' },
      });
      expect(getClientIP(request)).toBe('192.168.1.2');
    });

    it('should extract IP from x-vercel-forwarded-for header', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-vercel-forwarded-for': '192.168.1.3' },
      });
      expect(getClientIP(request)).toBe('192.168.1.3');
    });

    it('should return unknown when no IP headers present', () => {
      const request = new Request('http://localhost');
      expect(getClientIP(request)).toBe('unknown');
    });

    it('should prioritize x-forwarded-for over other headers', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'x-real-ip': '192.168.1.2',
        },
      });
      expect(getClientIP(request)).toBe('192.168.1.1');
    });
  });

  describe('RateLimitPresets', () => {
    it('should have correct standard preset', () => {
      expect(RateLimitPresets.standard).toEqual({ limit: 100, windowSeconds: 60 });
    });

    it('should have correct strict preset', () => {
      expect(RateLimitPresets.strict).toEqual({ limit: 20, windowSeconds: 60 });
    });

    it('should have correct auth preset', () => {
      expect(RateLimitPresets.auth).toEqual({ limit: 5, windowSeconds: 60 });
    });

    it('should have correct bulk preset', () => {
      expect(RateLimitPresets.bulk).toEqual({ limit: 10, windowSeconds: 60 });
    });
  });
});
