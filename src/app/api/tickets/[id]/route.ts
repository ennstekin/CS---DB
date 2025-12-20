/**
 * Single Ticket API
 * GET: Get ticket with full details
 * PATCH: Update ticket
 * DELETE: Delete ticket
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get ticket with mails and events
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(`
        *,
        mails:mails(
          id,
          message_id,
          subject,
          from_email,
          body_text,
          body_html,
          status,
          labels,
          matched_order_number,
          matched_return_id,
          created_at
        ),
        notes:ticket_notes(
          id,
          content,
          author,
          is_internal,
          created_at
        ),
        events:ticket_events(
          id,
          event_type,
          event_data,
          created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching ticket:', error);
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Build timeline from mails, notes, and events
    const timeline: any[] = [];

    // Add mails to timeline
    ticket.mails?.forEach((mail: any) => {
      timeline.push({
        id: mail.id,
        type: 'mail',
        direction: 'inbound', // TODO: track outbound mails
        title: mail.subject,
        content: mail.body_text,
        contentHtml: mail.body_html,
        from: mail.from_email,
        fromName: mail.from_email?.split('@')[0] || 'Müşteri',
        isReplied: mail.status === 'RESOLVED' || mail.status === 'CLOSED',
        createdAt: mail.created_at,
      });
    });

    // Add notes to timeline
    ticket.notes?.forEach((note: any) => {
      timeline.push({
        id: note.id,
        type: 'note',
        content: note.content,
        author: note.author,
        isInternal: note.is_internal,
        createdAt: note.created_at,
      });
    });

    // Add events to timeline
    ticket.events?.forEach((event: any) => {
      if (event.event_type !== 'mail_received' && event.event_type !== 'note_added') {
        timeline.push({
          id: event.id,
          type: 'event',
          eventType: event.event_type,
          data: event.event_data,
          createdAt: event.created_at,
        });
      }
    });

    // Sort timeline by date
    timeline.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const response = {
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
      timeline,
      mailCount: ticket.mails?.length || 0,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Get Ticket Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, priority, tags, assignedTo, orderNumber, returnId } = body;

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (tags) updates.tags = tags;
    if (assignedTo !== undefined) updates.assigned_to = assignedTo;
    if (orderNumber !== undefined) updates.order_number = orderNumber;
    if (returnId !== undefined) updates.return_id = returnId;

    const { data: ticket, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating ticket:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Add status change event
    if (status) {
      await supabase.from('ticket_events').insert({
        ticket_id: id,
        event_type: 'status_changed',
        event_data: { new_status: status },
      });
    }

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticket_number,
        status: ticket.status,
        priority: ticket.priority,
      },
    });

  } catch (error) {
    console.error('Update Ticket Error:', error);
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // First unlink mails from ticket
    await supabase
      .from('mails')
      .update({ ticket_id: null })
      .eq('ticket_id', id);

    // Delete ticket (cascade will delete notes and events)
    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting ticket:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete Ticket Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete ticket' },
      { status: 500 }
    );
  }
}
