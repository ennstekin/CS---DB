import { NextResponse } from "next/server";
import { ImapConfig } from "@/lib/mail/imap-client";
import { supabase } from "@/lib/supabase";

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

    // Fetch mails and save to Supabase
    const { ImapMailClient } = await import("@/lib/mail/imap-client");
    const client = new ImapMailClient(config);
    const mails = await client.fetchUnreadMails(50);

    // Save to Supabase
    const { supabase } = await import("@/lib/supabase");

    for (const mail of mails) {
      await supabase.from("mails").upsert({
        message_id: mail.messageId,
        from_email: mail.from,
        to_email: mail.to,
        subject: mail.subject,
        body_text: mail.text,
        body_html: mail.html,
        received_at: mail.date,
      }, { onConflict: "message_id" });
    }

    return NextResponse.json({
      success: true,
      count: mails.length,
      message: `${mails.length} mail çekildi ve kaydedildi`,
    });
  } catch (error) {
    console.error("Error fetching mails:", error);
    return NextResponse.json(
      { error: "Mail çekme başarısız: " + (error as Error).message },
      { status: 500 }
    );
  }
}
