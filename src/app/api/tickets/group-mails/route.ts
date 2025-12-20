/**
 * Group Mails into Tickets API
 * POST: Analyze unassigned mails and group them into tickets
 */

import { NextRequest, NextResponse } from 'next/server';
import { groupMailsIntoTickets } from '@/lib/mail/group-mails';

export async function POST(request: NextRequest) {
  try {
    const result = await groupMailsIntoTickets();

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      grouped: result.grouped,
      newTickets: result.newTickets,
    });

  } catch (error) {
    console.error('Group Mails Error:', error);
    return NextResponse.json(
      { error: 'Failed to group mails' },
      { status: 500 }
    );
  }
}
