import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Public routes that don't require authentication
const publicRoutes = ['/login', '/portal', '/api/portal']

// API routes that should skip auth (external webhooks, etc.)
const publicApiRoutes = ['/api/portal/', '/api/queue/']

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request)
  const pathname = request.nextUrl.pathname

  // Allow public routes
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    // If user is logged in and tries to access login, redirect to dashboard
    if (user && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return supabaseResponse
  }

  // Allow public API routes
  if (publicApiRoutes.some(route => pathname.startsWith(route))) {
    return supabaseResponse
  }

  // Redirect to login if not authenticated and trying to access dashboard
  if (!user && pathname.startsWith('/dashboard')) {
    const redirectUrl = new URL('/login', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect root to dashboard if authenticated
  if (user && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // If authenticated, check for password change requirement
  if (user && pathname.startsWith('/dashboard') && pathname !== '/dashboard/change-password') {
    const { data: appUser } = await supabase
      .from('app_users')
      .select('require_password_change')
      .eq('id', user.id)
      .single()

    // Force password change if required
    if (appUser?.require_password_change) {
      return NextResponse.redirect(new URL('/dashboard/change-password', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
