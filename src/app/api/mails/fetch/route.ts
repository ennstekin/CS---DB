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

    // Save to Supabase ve queue'ya ekle
    let enqueuedCount = 0;
    let savedCount = 0;
    let skippedCount = 0;

    for (const mail of mails) {
      // Check if this mail was previously deleted (soft delete)
      // If deleted_at is set, skip this mail - don't re-import it
      const { data: existingMail } = await supabase
        .from("mails")
        .select("id, deleted_at")
        .eq("message_id", mail.messageId)
        .single();

      if (existingMail?.deleted_at) {
        // Mail was soft-deleted, skip it
        skippedCount++;
        continue;
      }

      // Mail'i kaydet (insert or update if not deleted)
      const { data: savedMail, error: mailError } = await supabase
        .from("mails")
        .upsert({
          message_id: mail.messageId,
          direction: "INBOUND", // Gelen mail
          from_email: mail.from,
          to_email: config.user,
          subject: mail.subject,
          body_text: mail.bodyText,
          body_html: mail.bodyHtml,
          received_at: mail.receivedAt,
          in_reply_to: mail.inReplyTo, // Thread takibi için önemli
          labels: mail.labels || [],
          flags: mail.flags || [],
        }, {
          onConflict: "message_id",
          ignoreDuplicates: false
        })
        .select('id')
        .single();

      if (mailError) {
        console.error('❌ Failed to save mail:', mailError);
        continue;
      }

      savedCount++;

      // Sadece sipariş numarası içeren mailleri queue'ya ekle
      if (savedMail?.id) {
        const fullText = `${mail.subject} ${mail.bodyText || mail.bodyHtml || ''}`;
        const orderNumber = extractOrderNumber(fullText);

        // Sipariş numarası varsa veya mail konusu sipariş/kargo ile ilgiliyse queue'ya ekle
        const isOrderRelated = orderNumber ||
                               /sipariş|order|kargo|cargo|takip|tracking/i.test(fullText);

        if (isOrderRelated) {
          const jobId = await enqueueIkasOrderFetch(
            savedMail.id,
            mail.from,
            mail.subject,
            mail.bodyText || mail.bodyHtml || '',
            5 // priority: 5 (normal)
          );

          if (jobId) {
            enqueuedCount++;
            console.log(`✅ İkas fetch job enqueued for mail: ${savedMail.id} (order: ${orderNumber || 'keyword match'})`);
          }
        } else {
          console.log(`⏭️ Skipping İkas fetch for mail: ${savedMail.id} (no order reference)`);
        }
      }
    }

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
