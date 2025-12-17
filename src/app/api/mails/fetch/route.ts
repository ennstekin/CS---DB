import { NextResponse } from "next/server";
import { fetchAndSaveMails, ImapConfig } from "@/lib/mail/imap-client";
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

export async function POST() {
  try {
    // Get IMAP settings from file
    const settingsMap = readSettings();

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
