import { NextRequest, NextResponse } from "next/server";
import { sendMailAndSave, SmtpConfig } from "@/lib/mail/smtp-client";
import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/logger";

/**
 * Sanitize HTML to prevent XSS attacks
 * Removes script tags, event handlers, and dangerous attributes
 */
function sanitizeHtml(html: string): string {
  if (!html) return '';

  return html
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove style tags and their content (can contain expressions)
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove on* event handlers (onclick, onerror, onload, etc.)
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '')
    // Remove javascript: URLs
    .replace(/javascript\s*:/gi, 'blocked:')
    // Remove vbscript: URLs
    .replace(/vbscript\s*:/gi, 'blocked:')
    // Remove data: URLs (can contain scripts)
    .replace(/data\s*:\s*text\/html/gi, 'blocked:text/html')
    // Remove expression() in CSS (IE specific XSS)
    .replace(/expression\s*\(/gi, 'blocked(')
    // Remove iframe tags
    .replace(/<iframe\b[^>]*>/gi, '')
    .replace(/<\/iframe>/gi, '')
    // Remove object/embed tags
    .replace(/<object\b[^>]*>/gi, '')
    .replace(/<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    // Remove form tags (prevent phishing)
    .replace(/<form\b[^>]*>/gi, '')
    .replace(/<\/form>/gi, '')
    // Remove meta refresh (can redirect)
    .replace(/<meta\s+http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, '');
}

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
    let inReplyTo: string | undefined;
    let originalFromEmail: string | undefined;
    let effectiveTicketId: string | undefined = ticketId;

    if (originalMailId) {
      const { data: originalMail } = await supabase
        .from("mails")
        .select("message_id, from_email, ticket_id")
        .eq("id", originalMailId)
        .single();

      if (originalMail) {
        inReplyTo = originalMail.message_id;
        originalFromEmail = originalMail.from_email;
        if (!effectiveTicketId && originalMail.ticket_id) {
          effectiveTicketId = originalMail.ticket_id;
        }
      }
    }

    // Append signature if configured (escape HTML entities for security)
    const signature = settingsMap.mail_signature || "";
    const escapeHtml = (str: string) => str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const textWithSignature = signature ? `${text}\n\n${signature}` : text;
    // Sanitize HTML content to prevent XSS attacks
    const sanitizedHtml = html ? sanitizeHtml(html) : undefined;
    const htmlWithSignature = sanitizedHtml && signature
      ? `${sanitizedHtml}<br><br><pre style="font-family: inherit;">${escapeHtml(signature)}</pre>`
      : sanitizedHtml;

    // Send mail
    const client = await import("@/lib/mail/smtp-client").then(m => new m.SmtpMailClient(config));
    const messageId = await client.sendMail({
      to,
      subject,
      text: textWithSignature,
      html: htmlWithSignature,
      inReplyTo,
    });

    // Save outbound mail to database (for thread tracking)
    const { data: savedOutboundMail } = await supabase
      .from("mails")
      .insert({
        message_id: messageId,
        direction: "OUTBOUND",
        from_email: config.user,
        to_email: to,
        subject: subject,
        body_text: textWithSignature,
        body_html: htmlWithSignature,
        in_reply_to: inReplyTo,
        status: "SENT",
        ticket_id: effectiveTicketId,
        sent_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (savedOutboundMail) {
      console.log(`📤 Outbound mail saved: ${savedOutboundMail.id} (messageId: ${messageId})`);
    }

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

    // Update ticket status to WAITING_CUSTOMER if we have a ticket
    if (effectiveTicketId) {
      await supabase
        .from("tickets")
        .update({
          status: "WAITING_CUSTOMER",
          last_activity_at: new Date().toISOString()
        })
        .eq("id", effectiveTicketId);

      // Add event to ticket timeline with content
      await supabase.from("ticket_events").insert({
        ticket_id: effectiveTicketId,
        event_type: "reply_sent",
        event_data: { to, subject, message_id: messageId, content: textWithSignature },
      });

      console.log(`✅ Ticket ${effectiveTicketId} status updated to WAITING_CUSTOMER`);
    }

    // Log activity
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    let appUser = null;
    if (user) {
      const { data } = await authSupabase
        .from("app_users")
        .select("email, role")
        .eq("id", user.id)
        .single();
      appUser = data;
    }

    await logActivity({
      userId: user?.id,
      userEmail: appUser?.email,
      userRole: appUser?.role,
      action: "SEND",
      entityType: "mail",
      entityId: savedOutboundMail?.id,
      description: `Mail gönderildi: ${to}`,
      newValues: {
        to,
        subject,
        ticketId: effectiveTicketId,
        originalMailId,
      },
    });

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
