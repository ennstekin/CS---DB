/**
 * Group unassigned mails into tickets
 * This logic was extracted from /api/tickets/group-mails for reuse
 *
 * OPTIMIZED: Uses batch queries instead of N+1 queries
 */

import { supabase } from '@/lib/supabase';

interface GroupMailsResult {
  success: boolean;
  grouped: number;
  newTickets: number;
  message: string;
}

interface UnassignedMail {
  id: string;
  from_email: string;
  subject: string;
  body_text: string;
  in_reply_to: string | null;
  created_at: string;
  matched_order_number: string | null;
  matched_return_id: string | null;
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

// Extract clean email from "Name <email>" format
function extractCleanEmail(fromEmail: string | null): string | null {
  if (!fromEmail) return null;
  const emailMatch = fromEmail.match(/<([^>]+)>/);
  return emailMatch ? emailMatch[1] : fromEmail;
}

// Extract name from "Name <email>" format
function extractFromName(fromEmail: string | null): string {
  if (!fromEmail) return 'Unknown';
  const nameMatch = fromEmail.match(/"([^"]+)"/);
  if (nameMatch) return nameMatch[1];
  const cleanEmail = extractCleanEmail(fromEmail);
  return cleanEmail?.split('@')[0] || 'Unknown';
}

// Clean subject (remove Re:, Fwd:, etc.)
function cleanSubject(subject: string | null): string {
  return (subject || '')
    .replace(/^(Re:|Fwd:|FW:|RE:|İLT:|YNT:)\s*/gi, '')
    .trim()
    .toLowerCase();
}

export async function groupMailsIntoTickets(): Promise<GroupMailsResult> {
  // Get mails without ticket_id
  const { data: unassignedMails, error: mailsError } = await supabase
    .from('mails')
    .select('id, from_email, subject, body_text, in_reply_to, created_at, matched_order_number, matched_return_id')
    .is('ticket_id', null)
    .order('created_at', { ascending: true });

  if (mailsError) {
    console.error('Error fetching mails:', mailsError);
    return {
      success: false,
      grouped: 0,
      newTickets: 0,
      message: mailsError.message,
    };
  }

  if (!unassignedMails || unassignedMails.length === 0) {
    return {
      success: true,
      grouped: 0,
      newTickets: 0,
      message: 'No unassigned mails found',
    };
  }

  console.log(`📧 Found ${unassignedMails.length} unassigned mails`);

  // OPTIMIZATION: Batch fetch all parent mails for In-Reply-To lookup
  const inReplyToIds = unassignedMails
    .filter(m => m.in_reply_to)
    .map(m => m.in_reply_to as string);

  const parentMailsMap = new Map<string, string>(); // message_id -> ticket_id
  if (inReplyToIds.length > 0) {
    const { data: parentMails } = await supabase
      .from('mails')
      .select('message_id, ticket_id')
      .in('message_id', inReplyToIds)
      .not('ticket_id', 'is', null);

    parentMails?.forEach(pm => {
      if (pm.ticket_id) {
        parentMailsMap.set(pm.message_id, pm.ticket_id);
      }
    });
  }

  // OPTIMIZATION: Batch fetch all open tickets for customer matching
  const customerEmails = [...new Set(
    unassignedMails
      .map(m => extractCleanEmail(m.from_email))
      .filter((e): e is string => e !== null)
  )];

  interface OpenTicket {
    id: string;
    customer_email: string;
    subject: string;
    status: string;
    last_activity_at: string;
  }

  const openTicketsMap = new Map<string, OpenTicket[]>(); // email -> tickets
  if (customerEmails.length > 0) {
    const { data: openTickets } = await supabase
      .from('tickets')
      .select('id, customer_email, subject, status, last_activity_at')
      .in('customer_email', customerEmails)
      .neq('status', 'CLOSED')
      .order('last_activity_at', { ascending: false });

    openTickets?.forEach(ticket => {
      const email = ticket.customer_email?.toLowerCase();
      if (email) {
        if (!openTicketsMap.has(email)) {
          openTicketsMap.set(email, []);
        }
        openTicketsMap.get(email)!.push(ticket);
      }
    });
  }

  let groupedCount = 0;
  let newTicketCount = 0;

  // Track tickets created in this batch to prevent duplicates
  const createdTicketsForEmail = new Map<string, string>(); // email -> ticketId

  // Prepare batch updates
  const mailToTicketUpdates: { mailId: string; ticketId: string; mail: UnassignedMail }[] = [];
  const newTicketsToCreate: { mail: UnassignedMail; cleanEmail: string; fromName: string }[] = [];

  for (const mail of unassignedMails) {
    let ticketId: string | null = null;
    const cleanEmail = extractCleanEmail(mail.from_email);

    // 1. Check if this mail is a reply (In-Reply-To header) - O(1) lookup
    if (mail.in_reply_to && parentMailsMap.has(mail.in_reply_to)) {
      ticketId = parentMailsMap.get(mail.in_reply_to)!;
      console.log(`🔗 Mail ${mail.id} linked to ticket via In-Reply-To`);
    }

    // 2. Check for open ticket from same customer - O(1) lookup
    if (!ticketId && cleanEmail) {
      const customerTickets = openTicketsMap.get(cleanEmail.toLowerCase());
      if (customerTickets && customerTickets.length > 0) {
        const mailSubject = cleanSubject(mail.subject);

        for (const ticket of customerTickets) {
          const ticketSubject = ticket.subject.toLowerCase();

          if (
            mailSubject.includes(ticketSubject) ||
            ticketSubject.includes(mailSubject) ||
            mailSubject === ticketSubject
          ) {
            ticketId = ticket.id;
            console.log(`🔗 Mail ${mail.id} linked to ticket via same customer + similar subject`);
            break;
          }
        }
      }
    }

    // 3. Check if we already created a ticket for this customer in this batch
    if (!ticketId && cleanEmail && createdTicketsForEmail.has(cleanEmail.toLowerCase())) {
      ticketId = createdTicketsForEmail.get(cleanEmail.toLowerCase())!;
      console.log(`🔒 Using ticket created earlier in this batch for ${cleanEmail}`);
    }

    // 4. Need to create new ticket
    if (!ticketId && cleanEmail) {
      newTicketsToCreate.push({
        mail,
        cleanEmail,
        fromName: extractFromName(mail.from_email),
      });
    } else if (ticketId) {
      mailToTicketUpdates.push({ mailId: mail.id, ticketId, mail });
    }
  }

  // OPTIMIZATION: Batch create new tickets
  if (newTicketsToCreate.length > 0) {
    const ticketsToInsert = newTicketsToCreate.map(item => ({
      subject: item.mail.subject || 'Konu Yok',
      customer_email: item.cleanEmail,
      customer_name: item.fromName,
      status: 'OPEN',
      priority: detectPriority(item.mail.subject, item.mail.body_text),
      tags: detectTags(item.mail.subject, item.mail.body_text),
      order_number: item.mail.matched_order_number,
      return_id: item.mail.matched_return_id,
    }));

    const { data: createdTickets, error: ticketError } = await supabase
      .from('tickets')
      .insert(ticketsToInsert)
      .select('id, customer_email, ticket_number');

    if (ticketError) {
      // If batch insert fails, fall back to individual inserts (for handling duplicates)
      console.warn('Batch ticket creation failed, falling back to individual inserts:', ticketError.message);

      for (const item of newTicketsToCreate) {
        try {
          const { data: newTicket, error } = await supabase
            .from('tickets')
            .insert({
              subject: item.mail.subject || 'Konu Yok',
              customer_email: item.cleanEmail,
              customer_name: item.fromName,
              status: 'OPEN',
              priority: detectPriority(item.mail.subject, item.mail.body_text),
              tags: detectTags(item.mail.subject, item.mail.body_text),
              order_number: item.mail.matched_order_number,
              return_id: item.mail.matched_return_id,
            })
            .select('id, ticket_number')
            .single();

          if (error) {
            if (error.code === '23505') {
              console.log(`🔒 Duplicate ticket prevented for ${item.cleanEmail}`);
            } else {
              console.error('Talep oluşturma hatası:', error);
            }
            continue;
          }

          if (newTicket) {
            createdTicketsForEmail.set(item.cleanEmail.toLowerCase(), newTicket.id);
            mailToTicketUpdates.push({ mailId: item.mail.id, ticketId: newTicket.id, mail: item.mail });
            newTicketCount++;
            console.log(`✨ Created new ticket #${newTicket.ticket_number} for mail ${item.mail.id}`);
          }
        } catch (e) {
          console.error('Failed to create ticket:', e);
        }
      }
    } else if (createdTickets) {
      // Map created tickets back to mails
      const ticketByEmail = new Map(createdTickets.map(t => [t.customer_email?.toLowerCase(), t]));

      for (const item of newTicketsToCreate) {
        const ticket = ticketByEmail.get(item.cleanEmail.toLowerCase());
        if (ticket) {
          createdTicketsForEmail.set(item.cleanEmail.toLowerCase(), ticket.id);
          mailToTicketUpdates.push({ mailId: item.mail.id, ticketId: ticket.id, mail: item.mail });
          newTicketCount++;
          console.log(`✨ Created new ticket #${ticket.ticket_number} for mail ${item.mail.id}`);
        }
      }

      // Batch insert ticket creation events
      const creationEvents = createdTickets.map(ticket => {
        const item = newTicketsToCreate.find(i => i.cleanEmail.toLowerCase() === ticket.customer_email?.toLowerCase());
        return {
          ticket_id: ticket.id,
          event_type: 'ticket_created',
          event_data: { from_mail: item?.mail.id },
        };
      });

      if (creationEvents.length > 0) {
        await supabase.from('ticket_events').insert(creationEvents);
      }
    }
  }

  // OPTIMIZATION: Batch update mails with ticket_id
  if (mailToTicketUpdates.length > 0) {
    // Group updates by ticket_id for efficiency
    const updatesByTicket = new Map<string, string[]>();
    for (const update of mailToTicketUpdates) {
      if (!updatesByTicket.has(update.ticketId)) {
        updatesByTicket.set(update.ticketId, []);
      }
      updatesByTicket.get(update.ticketId)!.push(update.mailId);
    }

    // Batch update mails for each ticket
    for (const [ticketId, mailIds] of updatesByTicket) {
      const { error: updateError } = await supabase
        .from('mails')
        .update({ ticket_id: ticketId })
        .in('id', mailIds);

      if (!updateError) {
        groupedCount += mailIds.length;
      }
    }

    // OPTIMIZATION: Batch fetch ticket statuses
    const ticketIds = [...new Set(mailToTicketUpdates.map(u => u.ticketId))];
    const { data: ticketStatuses } = await supabase
      .from('tickets')
      .select('id, status')
      .in('id', ticketIds);

    const ticketStatusMap = new Map(ticketStatuses?.map(t => [t.id, t.status]) || []);

    // Batch update tickets' last_activity_at and status
    for (const [ticketId, mailIds] of updatesByTicket) {
      const relatedMails = mailToTicketUpdates.filter(u => u.ticketId === ticketId);
      const latestMail = relatedMails.reduce((latest, current) =>
        new Date(current.mail.created_at) > new Date(latest.mail.created_at) ? current : latest
      );

      await supabase
        .from('tickets')
        .update({
          last_activity_at: latestMail.mail.created_at,
          status: 'OPEN',
        })
        .eq('id', ticketId);
    }

    // Batch insert mail received events
    const mailReceivedEvents = mailToTicketUpdates.map(update => ({
      ticket_id: update.ticketId,
      event_type: 'mail_received',
      event_data: { mail_id: update.mailId },
    }));

    if (mailReceivedEvents.length > 0) {
      await supabase.from('ticket_events').insert(mailReceivedEvents);
    }

    // Add customer replied events for tickets that were waiting
    const customerRepliedEvents = mailToTicketUpdates
      .filter(update => ticketStatusMap.get(update.ticketId) === 'WAITING_CUSTOMER')
      .map(update => ({
        ticket_id: update.ticketId,
        event_type: 'customer_replied',
        event_data: { from: update.mail.from_email, subject: update.mail.subject },
      }));

    if (customerRepliedEvents.length > 0) {
      await supabase.from('ticket_events').insert(customerRepliedEvents);
      console.log(`🔔 ${customerRepliedEvents.length} customer replied events added`);
    }
  }

  return {
    success: true,
    grouped: groupedCount,
    newTickets: newTicketCount,
    message: `Grouped ${groupedCount} mails into tickets`,
  };
}
