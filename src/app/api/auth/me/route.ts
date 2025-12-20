/**
 * Get current user's app profile
 * This bypasses RLS issues by using server-side auth check
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Fetch app user profile
    const { data: appUser, error: profileError } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching app user:', profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    if (!appUser) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: appUser.id,
      email: appUser.email,
      name: appUser.name,
      role: appUser.role,
      requirePasswordChange: appUser.require_password_change,
      createdAt: appUser.created_at,
      updatedAt: appUser.updated_at,
    })
  } catch (error) {
    console.error('Auth me error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
