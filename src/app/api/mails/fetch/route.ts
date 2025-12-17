import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchAndSaveMails, ImapConfig } from "@/lib/mail/imap-client";

export async function POST() {
  try {
    // Get IMAP settings from database
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            "mail_imap_host",
            "mail_imap_port",
            "mail_imap_user",
            "mail_imap_password",
            "mail_imap_tls",
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

    // Fetch and save mails
    const savedCount = await fetchAndSaveMails(config);

    return NextResponse.json({
      success: true,
      count: savedCount,
      message: `${savedCount} yeni mail kaydedildi`,
    });
  } catch (error) {
    console.error("Error fetching mails:", error);
    return NextResponse.json(
      { error: "Mail çekme başarısız: " + (error as Error).message },
      { status: 500 }
    );
  }
}
