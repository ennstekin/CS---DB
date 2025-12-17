import { NextRequest, NextResponse } from "next/server";
import { sendMailAndSave, SmtpConfig } from "@/lib/mail/smtp-client";
import fs from "fs";
import path from "path";

const SETTINGS_FILE = path.join(process.cwd(), "data", "settings.json");

function readSettings(): Record<string, string> {
  if (!fs.existsSync(SETTINGS_FILE)) {
    return {};
  }
  try {
    const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, text, html, originalMailId } = body;

    // Validate required fields
    if (!to || !subject || !text) {
      return NextResponse.json(
        { error: "to, subject, and text are required" },
        { status: 400 }
      );
    }

    // Get SMTP settings from file
    const settingsMap = readSettings();

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

    // Send mail (without database save for now)
    const client = await import("@/lib/mail/smtp-client").then(m => new m.SmtpMailClient(config));
    const messageId = await client.sendMail({
      to,
      subject,
      text,
      html,
      inReplyTo,
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
