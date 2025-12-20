'use client'

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { User, Session } from '@supabase/supabase-js'

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'AGENT'

export interface AppUser {
  id: string
  email: string
  name: string
  role: UserRole
  requirePasswordChange: boolean
  createdAt: string
  updatedAt: string
}

interface AuthContextType {
  user: User | null
  appUser: AppUser | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  isAdmin: boolean
  isSupervisor: boolean
  isAgent: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Memoize Supabase client to prevent recreation on every render
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), [])

  const fetchAppUser = async (userId: string) => {
    console.log('🔍 Fetching app user for ID:', userId)

    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('❌ Error fetching app user:', error.message, error.code, error.details)
      setAppUser(null)
      return
    }

    if (data) {
      console.log('✅ App user loaded:', data.email, data.role)
      setAppUser({
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role as UserRole,
        requirePasswordChange: data.require_password_change,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      })
    } else {
      console.log('⚠️ No app user data found')
      setAppUser(null)
    }
  }

  const refreshUser = async () => {
    if (user?.id) {
      await fetchAppUser(user.id)
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchAppUser(session.user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        await fetchAppUser(session.user.id)
      } else {
        setAppUser(null)
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setAppUser(null)
    setSession(null)
  }

  const value: AuthContextType = {
    user,
    appUser,
    session,
    loading,
    signIn,
    signOut,
    refreshUser,
    isAdmin: appUser?.role === 'ADMIN',
    isSupervisor: appUser?.role === 'SUPERVISOR',
    isAgent: appUser?.role === 'AGENT',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Helper component for role-based rendering
export function RoleGuard({
  children,
  allowedRoles,
  fallback = null,
}: {
  children: ReactNode
  allowedRoles: UserRole[]
  fallback?: ReactNode
}) {
  const { appUser, loading } = useAuth()

  if (loading) return null
  if (!appUser || !allowedRoles.includes(appUser.role)) return <>{fallback}</>

  return <>{children}</>
}
