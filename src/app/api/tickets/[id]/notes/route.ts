/**
 * Ticket Notes API
 * POST: Add a note to ticket
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content, author, isInternal = true } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Add note
    const { data: note, error: noteError } = await supabase
      .from('ticket_notes')
      .insert({
        ticket_id: id,
        content,
        author: author || 'Temsilci',
        is_internal: isInternal,
      })
      .select()
      .single();

    if (noteError) {
      console.error('Error adding note:', noteError);
      return NextResponse.json({ error: noteError.message }, { status: 500 });
    }

    // Add event
    await supabase.from('ticket_events').insert({
      ticket_id: id,
      event_type: 'note_added',
      event_data: { note_id: note.id, is_internal: isInternal },
    });

    // Update ticket last activity
    await supabase
      .from('tickets')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json({
      success: true,
      note: {
        id: note.id,
        content: note.content,
        author: note.author,
        isInternal: note.is_internal,
        createdAt: note.created_at,
      },
    });

  } catch (error) {
    console.error('Add Note Error:', error);
    return NextResponse.json(
      { error: 'Failed to add note' },
      { status: 500 }
    );
  }
}
