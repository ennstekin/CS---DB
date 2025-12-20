/**
 * Group Mails into Tickets API
 * POST: Analyze unassigned mails and group them into tickets
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Get mails without ticket_id
    const { data: unassignedMails, error: mailsError } = await supabase
      .from('mails')
      .select('*')
      .is('ticket_id', null)
      .order('created_at', { ascending: true });

    if (mailsError) {
      console.error('Error fetching mails:', mailsError);
      return NextResponse.json({ error: mailsError.message }, { status: 500 });
    }

    if (!unassignedMails || unassignedMails.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No unassigned mails found',
        grouped: 0,
      });
    }

    console.log(`📧 Found ${unassignedMails.length} unassigned mails`);

    let groupedCount = 0;
    let newTicketCount = 0;

    for (const mail of unassignedMails) {
      let ticketId: string | null = null;

      // 1. Check if this mail is a reply (In-Reply-To header)
      if (mail.in_reply_to) {
        const { data: parentMail } = await supabase
          .from('mails')
          .select('ticket_id')
          .eq('message_id', mail.in_reply_to)
          .single();

        if (parentMail?.ticket_id) {
          ticketId = parentMail.ticket_id;
          console.log(`🔗 Mail ${mail.id} linked to ticket via In-Reply-To`);
        }
      }

      // 2. Check for open ticket from same customer
      if (!ticketId && mail.from_email) {
        const { data: existingTicket } = await supabase
          .from('tickets')
          .select('id')
          .eq('customer_email', mail.from_email)
          .neq('status', 'CLOSED')
          .order('last_activity_at', { ascending: false })
          .limit(1)
          .single();

        if (existingTicket) {
          // Check if subject is similar (Re:, Fwd:, or contains original subject)
          const cleanSubject = (mail.subject || '')
            .replace(/^(Re:|Fwd:|FW:|RE:|İLT:|YNT:)\s*/gi, '')
            .trim()
            .toLowerCase();

          const { data: ticketData } = await supabase
            .from('tickets')
            .select('subject')
            .eq('id', existingTicket.id)
            .single();

          if (ticketData) {
            const ticketSubject = ticketData.subject.toLowerCase();

            // If subjects match or one contains the other
            if (
              cleanSubject.includes(ticketSubject) ||
              ticketSubject.includes(cleanSubject) ||
              cleanSubject === ticketSubject
            ) {
              ticketId = existingTicket.id;
              console.log(`🔗 Mail ${mail.id} linked to ticket via same customer + similar subject`);
            }
          }
        }
      }

      // 3. Create new ticket if no match found (with race condition prevention)
      if (!ticketId) {
        // Double-check: another request might have created a ticket for this customer
        if (mail.from_email) {
          const { data: recentTicket } = await supabase
            .from('tickets')
            .select('id')
            .eq('customer_email', mail.from_email)
            .neq('status', 'CLOSED')
            .gte('created_at', new Date(Date.now() - 5000).toISOString()) // Created in last 5 seconds
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (recentTicket) {
            ticketId = recentTicket.id;
            console.log(`🔒 Race condition prevented: Using recently created ticket for ${mail.from_email}`);
          }
        }

        if (!ticketId) {
          const { data: newTicket, error: ticketError } = await supabase
            .from('tickets')
            .insert({
              subject: mail.subject || 'Konu Yok',
              customer_email: mail.from_email,
              customer_name: mail.from_name,
              status: 'OPEN',
              priority: detectPriority(mail.subject, mail.body_text),
              tags: detectTags(mail.subject, mail.body_text),
              order_number: mail.matched_order_number,
              return_id: mail.matched_return_id,
            })
            .select()
            .single();

          if (ticketError) {
            // Handle duplicate key error gracefully
            if (ticketError.code === '23505') {
              console.log(`🔒 Duplicate ticket prevented for ${mail.from_email}`);
              continue;
            }
            console.error('Talep oluşturma hatası:', ticketError);
            continue;
          }

          ticketId = newTicket.id;
          newTicketCount++;

          // Add creation event
          await supabase.from('ticket_events').insert({
            ticket_id: ticketId,
            event_type: 'ticket_created',
            event_data: { from_mail: mail.id },
          });

          console.log(`✨ Created new ticket #${newTicket.ticket_number} for mail ${mail.id}`);
        }
      }

      // Link mail to ticket
      const { error: updateError } = await supabase
        .from('mails')
        .update({ ticket_id: ticketId })
        .eq('id', mail.id);

      if (!updateError) {
        groupedCount++;

        // Check if ticket was waiting for customer (to add proper event)
        const { data: currentTicket } = await supabase
          .from('tickets')
          .select('status')
          .eq('id', ticketId)
          .single();

        const wasWaiting = currentTicket?.status === 'WAITING_CUSTOMER';

        // Update ticket last activity and reopen
        await supabase
          .from('tickets')
          .update({
            last_activity_at: mail.created_at,
            status: 'OPEN', // Reopen if customer sent new mail
          })
          .eq('id', ticketId);

        // Add mail received event
        await supabase.from('ticket_events').insert({
          ticket_id: ticketId,
          event_type: 'mail_received',
          event_data: { mail_id: mail.id },
        });

        // Add customer replied event if ticket was waiting
        if (wasWaiting) {
          await supabase.from('ticket_events').insert({
            ticket_id: ticketId,
            event_type: 'customer_replied',
            event_data: { from: mail.from_email, subject: mail.subject },
          });
          console.log(`🔔 Customer replied to ticket, status changed from WAITING_CUSTOMER to OPEN`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Grouped ${groupedCount} mails into tickets`,
      grouped: groupedCount,
      newTickets: newTicketCount,
    });

  } catch (error) {
    console.error('Group Mails Error:', error);
    return NextResponse.json(
      { error: 'Failed to group mails' },
      { status: 500 }
    );
  }
}

// Detect priority based on keywords
function detectPriority(subject: string, body: string): string {
  const text = `${subject} ${body}`.toLowerCase();

  const urgentKeywords = ['acil', 'urgent', 'hemen', 'ivedi', 'kritik'];
  const highKeywords = ['önemli', 'important', 'lütfen acele'];

  if (urgentKeywords.some(k => text.includes(k))) return 'URGENT';
  if (highKeywords.some(k => text.includes(k))) return 'HIGH';

  return 'NORMAL';
}

// Detect tags based on content
function detectTags(subject: string, body: string): string[] {
  const text = `${subject} ${body}`.toLowerCase();
  const tags: string[] = [];

  if (text.includes('iade') || text.includes('return')) tags.push('iade');
  if (text.includes('kargo') || text.includes('teslimat') || text.includes('shipping')) tags.push('kargo');
  if (text.includes('fatura') || text.includes('invoice')) tags.push('fatura');
  if (text.includes('iptal') || text.includes('cancel')) tags.push('iptal');
  if (text.includes('kusur') || text.includes('hasarlı') || text.includes('defect')) tags.push('kusurlu');
  if (text.includes('değişim') || text.includes('exchange')) tags.push('değişim');
  if (text.includes('indirim') || text.includes('kampanya') || text.includes('discount')) tags.push('kampanya');
  if (text.includes('sipariş') || text.includes('order')) tags.push('sipariş');

  return tags;
}
