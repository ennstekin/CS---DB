import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMailAndSave, SmtpConfig } from "@/lib/mail/smtp-client";

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

    // Get SMTP settings from database
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            "mail_smtp_host",
            "mail_smtp_port",
            "mail_smtp_user",
            "mail_smtp_password",
            "mail_smtp_secure",
          ],
        },
      },
    });

    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
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
    if (originalMailId) {
      const originalMail = await prisma.mail.findUnique({
        where: { id: originalMailId },
      });

      if (originalMail?.messageId) {
        inReplyTo = originalMail.messageId;
      }
    }

    // Send mail and save to database
    const messageId = await sendMailAndSave(
      config,
      {
        to,
        subject,
        text,
        html,
        inReplyTo,
      },
      originalMailId
    );

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
