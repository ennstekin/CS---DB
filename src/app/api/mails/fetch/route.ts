import { NextResponse } from "next/server";
import { ImapConfig } from "@/lib/mail/imap-client";
import { ImapMailClient } from "@/lib/mail/imap-client";
import { supabase } from "@/lib/supabase";
import { enqueueIkasOrderFetch } from "@/lib/queue";
import { extractOrderNumber } from "@/lib/ikas/client";
import { groupMailsIntoTickets } from "@/lib/mail/group-mails";

export async function POST() {
  try {
    // Get IMAP settings from Supabase
    const { data, error } = await supabase
      .from("settings")
      .select("key, value");

    if (error) throw error;

    // Convert array to object
    const settingsMap: Record<string, string> = {};
    data?.forEach((row) => {
      settingsMap[row.key] = row.value;
    });

    // Validate required settings
    if (
      !settingsMap.mail_imap_host ||
      !settingsMap.mail_imap_user ||
      !settingsMap.mail_imap_password
    ) {
      return NextResponse.json(
        { error: "Mail settings not configured" },
        { status: 400 }
      );
    }

    // Create IMAP config
    const config: ImapConfig = {
      host: settingsMap.mail_imap_host,
      port: parseInt(settingsMap.mail_imap_port || "993"),
      user: settingsMap.mail_imap_user,
      password: settingsMap.mail_imap_password,
      tls: settingsMap.mail_imap_tls === "true",
    };

    // Fetch mails via IMAP (all recent mails, not just unread)
    const client = new ImapMailClient(config);
    const mails = await client.fetchRecentMails(50);

    console.log(`📬 IMAP'tan ${mails.length} mail çekildi`);

    if (mails.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        saved: 0,
        skipped: 0,
        enqueued: 0,
        message: "IMAP'tan mail bulunamadı",
      });
    }

    // OPTIMIZATION: Batch fetch existing mails to check for soft-deleted ones
    // Filter out mails without messageId
    const validMails = mails.filter(m => m.messageId);
    const messageIds = validMails.map(m => m.messageId as string);

    const { data: existingMails } = await supabase
      .from("mails")
      .select("id, message_id, deleted_at")
      .in("message_id", messageIds);

    // Create lookup maps
    const existingMailsMap = new Map<string, { id: string; deleted_at: string | null }>();
    existingMails?.forEach(m => {
      existingMailsMap.set(m.message_id, { id: m.id, deleted_at: m.deleted_at });
    });

    // Separate mails into categories
    const mailsToUpsert: typeof validMails = [];
    const skippedMessageIds: string[] = [];

    for (const mail of validMails) {
      const messageId = mail.messageId as string;
      const existing = existingMailsMap.get(messageId);
      if (existing?.deleted_at) {
        // Mail was soft-deleted, skip it
        skippedMessageIds.push(messageId);
      } else {
        mailsToUpsert.push(mail);
      }
    }

    const skippedCount = skippedMessageIds.length;
    console.log(`⏭️ ${skippedCount} mail atlandı (silinmiş)`);

    if (mailsToUpsert.length === 0) {
      return NextResponse.json({
        success: true,
        count: mails.length,
        saved: 0,
        skipped: skippedCount,
        enqueued: 0,
        message: `${mails.length} mail çekildi, ${skippedCount} atlandı (silinmiş)`,
      });
    }

    // OPTIMIZATION: Batch upsert mails
    const mailRecords = mailsToUpsert.map(mail => ({
      message_id: mail.messageId,
      direction: "INBOUND" as const,
      from_email: mail.from,
      to_email: config.user,
      subject: mail.subject,
      body_text: mail.bodyText,
      body_html: mail.bodyHtml,
      received_at: mail.receivedAt,
      in_reply_to: mail.inReplyTo,
      labels: mail.labels || [],
      flags: mail.flags || [],
    }));

    const { data: savedMails, error: upsertError } = await supabase
      .from("mails")
      .upsert(mailRecords, {
        onConflict: "message_id",
        ignoreDuplicates: false
      })
      .select('id, message_id');

    if (upsertError) {
      console.error('❌ Batch mail upsert failed:', upsertError);
      return NextResponse.json(
        { error: "Mail kaydetme başarısız: " + upsertError.message },
        { status: 500 }
      );
    }

    const savedCount = savedMails?.length || 0;
    console.log(`✅ ${savedCount} mail kaydedildi`);

    // Create a map of message_id -> saved mail id
    const savedMailsMap = new Map<string, string>();
    savedMails?.forEach(m => {
      savedMailsMap.set(m.message_id, m.id);
    });

    // OPTIMIZATION: Batch enqueue order-related mails
    let enqueuedCount = 0;
    const orderRelatedMails: { mailId: string; from: string; subject: string; body: string }[] = [];

    for (const mail of mailsToUpsert) {
      const messageId = mail.messageId as string;
      const savedMailId = savedMailsMap.get(messageId);
      if (!savedMailId) continue;

      const fullText = `${mail.subject} ${mail.bodyText || mail.bodyHtml || ''}`;
      const orderNumber = extractOrderNumber(fullText);
      const isOrderRelated = orderNumber ||
                             /sipariş|order|kargo|cargo|takip|tracking/i.test(fullText);

      if (isOrderRelated) {
        orderRelatedMails.push({
          mailId: savedMailId,
          from: mail.from,
          subject: mail.subject,
          body: mail.bodyText || mail.bodyHtml || '',
        });
      }
    }

    // Enqueue order-related mails (these are still individual calls but fewer)
    for (const mail of orderRelatedMails) {
      const jobId = await enqueueIkasOrderFetch(
        mail.mailId,
        mail.from,
        mail.subject,
        mail.body,
        5
      );

      if (jobId) {
        enqueuedCount++;
      }
    }

    console.log(`📬 ${enqueuedCount} İkas fetch job enqueued`);

    // Group mails into tickets (link new mails to existing tickets)
    try {
      const groupResult = await groupMailsIntoTickets();
      console.log(`📧 Mails grouped: ${groupResult.grouped} mails, ${groupResult.newTickets || 0} new tickets`);
    } catch (groupError) {
      console.error('⚠️ Failed to group mails into tickets:', groupError);
    }

    return NextResponse.json({
      success: true,
      count: mails.length,
      saved: savedCount,
      skipped: skippedCount,
      enqueued: enqueuedCount,
      message: `${mails.length} mail çekildi, ${savedCount} kaydedildi, ${skippedCount} atlandı (silinmiş), ${enqueuedCount} İkas sorgusu queue'ya eklendi`,
    });
  } catch (error) {
    console.error("Error fetching mails:", error);
    return NextResponse.json(
      { error: "Mail çekme başarısız: " + (error as Error).message },
      { status: 500 }
    );
  }
}
