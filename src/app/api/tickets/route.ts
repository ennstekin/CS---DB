/**
 * Tickets API
 * GET: List tickets with filters and pagination
 * POST: Create new ticket
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { logActivity, logError } from '@/lib/logger';

interface TicketMail {
  id: string;
  subject: string;
  from_email: string;
  body_text: string;
  status: string;
  created_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');

    // Get total count for pagination
    let countQuery = supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true });

    if (status && status !== 'all') {
      countQuery = countQuery.eq('status', status);
    }

    if (search) {
      countQuery = countQuery.or(`subject.ilike.%${search}%,customer_email.ilike.%${search}%,customer_name.ilike.%${search}%`);
    }

    const { count: totalCount } = await countQuery;

    // Get paginated data
    let query = supabase
      .from('tickets')
      .select(`
        *,
        mails:mails(id, subject, from_email, body_text, status, created_at)
      `)
      .order('last_activity_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`subject.ilike.%${search}%,customer_email.ilike.%${search}%,customer_name.ilike.%${search}%`);
    }

    const { data: tickets, error } = await query;

    if (error) {
      console.error('Talep getirme hatası:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform data with proper typing
    const transformedTickets = tickets?.map(ticket => ({
      id: ticket.id,
      ticketNumber: ticket.ticket_number,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      tags: ticket.tags || [],
      customerEmail: ticket.customer_email,
      customerName: ticket.customer_name,
      orderNumber: ticket.order_number,
      returnId: ticket.return_id,
      assignedTo: ticket.assigned_to,
      lastActivityAt: ticket.last_activity_at,
      createdAt: ticket.created_at,
      mailCount: (ticket.mails as TicketMail[] | null)?.length || 0,
      lastMail: (ticket.mails as TicketMail[] | null)?.[0] || null,
      hasUnreplied: (ticket.mails as TicketMail[] | null)?.some((m) => m.status === 'NEW' || m.status === 'OPEN') || false,
    })) || [];

    return NextResponse.json({
      tickets: transformedTickets,
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        hasMore: (totalCount || 0) > offset + limit,
      },
    });

  } catch (error) {
    console.error('Talep API Hatası:', error);
    return NextResponse.json(
      { error: 'Talepler alınamadı' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subject, customerEmail, customerName, orderNumber, mailId, priority, tags, description } = body;

    // Input validation
    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return NextResponse.json(
        { error: 'Konu alanı gerekli' },
        { status: 400 }
      );
    }

    if (subject.length > 500) {
      return NextResponse.json(
        { error: 'Konu çok uzun (maksimum 500 karakter)' },
        { status: 400 }
      );
    }

    // Extract email from formats like "Name" <email@domain.com> or just email@domain.com
    let cleanEmail = customerEmail;
    if (customerEmail) {
      const emailMatch = customerEmail.match(/<([^>]+)>/) || customerEmail.match(/([^\s@]+@[^\s@]+\.[^\s@]+)/);
      cleanEmail = emailMatch ? emailMatch[1] : customerEmail;

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return NextResponse.json(
          { error: 'Geçersiz e-posta formatı' },
          { status: 400 }
        );
      }
    }

    // Create ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        subject: subject.trim(),
        customer_email: cleanEmail || null,
        customer_name: customerName,
        order_number: orderNumber,
        priority: priority || 'NORMAL',
        tags: tags || [],
        status: 'OPEN',
      })
      .select()
      .single();

    if (ticketError) {
      console.error('Talep oluşturma hatası:', ticketError);
      return NextResponse.json({ error: ticketError.message }, { status: 500 });
    }

    // If mailId provided, link the mail to this ticket
    if (mailId) {
      await supabase
        .from('mails')
        .update({ ticket_id: ticket.id })
        .eq('id', mailId);

      await supabase.from('ticket_events').insert({
        ticket_id: ticket.id,
        event_type: 'mail_received',
        event_data: { mail_id: mailId },
      });
    }

    // Add creation event
    await supabase.from('ticket_events').insert({
      ticket_id: ticket.id,
      event_type: 'ticket_created',
      event_data: { subject },
    });

    // Log activity
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    let appUser = null;
    if (user) {
      const { data } = await authSupabase
        .from('app_users')
        .select('email, role')
        .eq('id', user.id)
        .single();
      appUser = data;
    }

    await logActivity({
      userId: user?.id,
      userEmail: appUser?.email,
      userRole: appUser?.role,
      action: 'CREATE',
      entityType: 'ticket',
      entityId: ticket.id,
      description: `Talep oluşturuldu: ${subject}`,
      newValues: {
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        customerEmail: cleanEmail,
      },
    });

    // If description provided, add it as a note
    if (description && description.trim()) {
      await supabase.from('ticket_events').insert({
        ticket_id: ticket.id,
        event_type: 'note_added',
        event_data: {
          content: description,
          is_internal: false,
          source: 'manual_creation',
        },
      });
    }

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticket_number,
        subject: ticket.subject,
        status: ticket.status,
      },
    });

  } catch (error) {
    console.error('Talep oluşturma hatası:', error);
    return NextResponse.json(
      { error: 'Talep oluşturulamadı' },
      { status: 500 }
    );
  }
}
