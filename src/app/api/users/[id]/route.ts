import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// PATCH - Update user (Admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Prevent self-demotion
    if (id === user.id) {
      return NextResponse.json({ error: 'Kendi rolünüzü değiştiremezsiniz' }, { status: 400 })
    }

    const body = await request.json()
    const { role, name } = body

    const updateData: Record<string, string> = {}

    if (role) {
      if (!['ADMIN', 'SUPERVISOR', 'AGENT'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }
      updateData.role = role
    }

    if (name) {
      updateData.name = name
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: updatedUser, error: updateError } = await adminClient
      .from('app_users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete user (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Prevent self-deletion
    if (id === user.id) {
      return NextResponse.json({ error: 'Kendinizi silemezsiniz' }, { status: 400 })
    }

    // Delete auth user (this will cascade delete app_users due to FK constraint)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Reset user password (Admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
    const { action, temporaryPassword } = body

    if (action !== 'reset_password') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (!temporaryPassword || temporaryPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Update user password
    const { error: updateError } = await adminClient.auth.admin.updateUserById(id, {
      password: temporaryPassword,
    })

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Set require_password_change flag
    await adminClient
      .from('app_users')
      .update({ require_password_change: true })
      .eq('id', id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
