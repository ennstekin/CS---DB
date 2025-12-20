import { NextRequest, NextResponse } from "next/server";
import { sendMailAndSave, SmtpConfig } from "@/lib/mail/smtp-client";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, text, html, originalMailId, ticketId } = body;

    // Validate required fields
    if (!to || !subject || !text) {
      return NextResponse.json(
        { error: "to, subject, and text are required" },
        { status: 400 }
      );
    }

    // Get SMTP settings from Supabase
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
      !settingsMap.mail_smtp_host ||
      !settingsMap.mail_smtp_user ||
      !settingsMap.mail_smtp_password
    ) {
      return NextResponse.json(
        { error: "SMTP settings not configured" },
        { status: 400 }
      );
    }

    // Create SMTP config
    const config: SmtpConfig = {
      host: settingsMap.mail_smtp_host,
      port: parseInt(settingsMap.mail_smtp_port || "587"),
      user: settingsMap.mail_smtp_user,
      password: settingsMap.mail_smtp_password,
      secure: settingsMap.mail_smtp_secure === "true",
    };

    // Get inReplyTo from original mail if this is a reply
    // Note: Database lookup disabled for now (using file storage)
    let inReplyTo: string | undefined;

    // Append signature if configured (escape HTML entities for security)
    const signature = settingsMap.mail_signature || "";
    const escapeHtml = (str: string) => str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const textWithSignature = signature ? `${text}\n\n${signature}` : text;
    const htmlWithSignature = html && signature
      ? `${html}<br><br><pre style="font-family: inherit;">${escapeHtml(signature)}</pre>`
      : html;

    // Send mail (without database save for now)
    const client = await import("@/lib/mail/smtp-client").then(m => new m.SmtpMailClient(config));
    const messageId = await client.sendMail({
      to,
      subject,
      text: textWithSignature,
      html: htmlWithSignature,
      inReplyTo,
    });

    // Update original mail status to RESOLVED if provided
    if (originalMailId) {
      await supabase
        .from("mails")
        .update({
          status: "RESOLVED",
          responded_at: new Date().toISOString()
        })
        .eq("id", originalMailId);

      console.log(`✅ Mail ${originalMailId} status updated to RESOLVED`);
    }

    // Update ticket status to WAITING_CUSTOMER if ticketId provided
    if (ticketId) {
      await supabase
        .from("tickets")
        .update({
          status: "WAITING_CUSTOMER",
          last_activity_at: new Date().toISOString()
        })
        .eq("id", ticketId);

      // Add event to ticket timeline with content
      await supabase.from("ticket_events").insert({
        ticket_id: ticketId,
        event_type: "reply_sent",
        event_data: { to, subject, message_id: messageId, content: textWithSignature },
      });

      console.log(`✅ Ticket ${ticketId} status updated to WAITING_CUSTOMER`);
    } else if (originalMailId) {
      // Try to find ticket from original mail
      const { data: mailData } = await supabase
        .from("mails")
        .select("ticket_id")
        .eq("id", originalMailId)
        .single();

      if (mailData?.ticket_id) {
        await supabase
          .from("tickets")
          .update({
            status: "WAITING_CUSTOMER",
            last_activity_at: new Date().toISOString()
          })
          .eq("id", mailData.ticket_id);

        await supabase.from("ticket_events").insert({
          ticket_id: mailData.ticket_id,
          event_type: "reply_sent",
          event_data: { to, subject, message_id: messageId, content: textWithSignature },
        });

        console.log(`✅ Ticket ${mailData.ticket_id} (from mail) status updated to WAITING_CUSTOMER`);
      }
    }

    return NextResponse.json({
      success: true,
      messageId,
      message: "Mail başarıyla gönderildi",
    });
  } catch (error) {
    console.error("Error sending mail:", error);
    return NextResponse.json(
      { error: "Mail gönderme başarısız: " + (error as Error).message },
      { status: 500 }
    );
  }
}
