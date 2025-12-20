/**
 * Simple API Authentication Middleware
 * Uses API key from headers or query params
 */

import { NextRequest, NextResponse } from 'next/server';

// Get API key from environment
const API_KEY = process.env.API_SECRET_KEY;

export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  error?: string;
}

/**
 * Verify API authentication
 * Checks for API key in:
 * 1. Authorization header (Bearer token)
 * 2. X-API-Key header
 * 3. api_key query parameter
 */
export function verifyAuth(request: NextRequest): AuthResult {
  // Skip auth in development if no key configured
  if (process.env.NODE_ENV === 'development' && !API_KEY) {
    return { authenticated: true, userId: 'dev-user' };
  }

  // If API key not configured in production, reject all requests
  if (!API_KEY) {
    console.warn('⚠️ API_SECRET_KEY not configured');
    return { authenticated: false, error: 'Server authentication not configured' };
  }

  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    if (token === API_KEY) {
      return { authenticated: true, userId: 'api-user' };
    }
  }

  // Check X-API-Key header
  const apiKeyHeader = request.headers.get('x-api-key');
  if (apiKeyHeader === API_KEY) {
    return { authenticated: true, userId: 'api-user' };
  }

  // Check query parameter
  const apiKeyParam = request.nextUrl.searchParams.get('api_key');
  if (apiKeyParam === API_KEY) {
    return { authenticated: true, userId: 'api-user' };
  }

  return { authenticated: false, error: 'Geçersiz veya eksik API anahtarı' };
}

/**
 * Authentication middleware wrapper
 * Use this to protect API routes
 */
export function withAuth(
  handler: (request: NextRequest, userId: string) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const auth = verifyAuth(request);

    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || 'Yetkisiz erişim' },
        { status: 401 }
      );
    }

    return handler(request, auth.userId || 'unknown');
  };
}

/**
 * Simple auth check - returns true/false
 * Use for routes that need optional auth
 */
export function isAuthenticated(request: NextRequest): boolean {
  return verifyAuth(request).authenticated;
}

/**
 * Get user ID from authenticated request
 */
export function getUserId(request: NextRequest): string | null {
  const auth = verifyAuth(request);
  return auth.authenticated ? (auth.userId || null) : null;
}
