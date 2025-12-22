import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/logger'

/**
 * Validate password strength
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Şifre en az 8 karakter olmalıdır' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Şifre en az 1 büyük harf içermelidir' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Şifre en az 1 küçük harf içermelidir' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Şifre en az 1 rakam içermelidir' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, message: 'Şifre en az 1 özel karakter içermelidir (!@#$%^&*...)' };
  }
  return { valid: true };
}

// GET - List all users (Admin only)
export async function GET() {
  try {
    const supabase = await createClient()

    // Check if current user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentUser } = await supabase
      .from('app_users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get all users
    const { data: users, error } = await supabase
      .from('app_users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new user with temporary password (Admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Check if current user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentUser } = await supabase
      .from('app_users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { email, name, role, temporaryPassword } = body

    if (!email || !name || !role || !temporaryPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['ADMIN', 'SUPERVISOR', 'AGENT'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const passwordValidation = validatePassword(temporaryPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.message }, { status: 400 })
    }

    // Create auth user using admin client
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true, // Skip email verification
    })

    if (createError) {
      if (createError.message.includes('already registered')) {
        return NextResponse.json({ error: 'Bu e-posta adresi zaten kullanılıyor' }, { status: 400 })
      }
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // Create app_users record
    const { error: insertError } = await adminClient
      .from('app_users')
      .insert({
        id: authData.user.id,
        email,
        name,
        role,
        require_password_change: true,
      })

    if (insertError) {
      // Rollback: delete the auth user if app_users insert fails
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Log activity
    const { data: adminUser } = await supabase
      .from('app_users')
      .select('email, role')
      .eq('id', user.id)
      .single()

    await logActivity({
      userId: user.id,
      userEmail: adminUser?.email,
      userRole: adminUser?.role,
      action: 'CREATE',
      entityType: 'user',
      entityId: authData.user.id,
      description: `Yeni kullanıcı oluşturuldu: ${email}`,
      newValues: { email, name, role },
    })

    return NextResponse.json({
      user: {
        id: authData.user.id,
        email,
        name,
        role,
        requirePasswordChange: true,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
