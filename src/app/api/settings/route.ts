import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SETTINGS_FILE = path.join(process.cwd(), "data", "settings.json");

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Read settings from file
function readSettings(): Record<string, string> {
  ensureDataDir();
  if (!fs.existsSync(SETTINGS_FILE)) {
    return {};
  }
  try {
    const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading settings file:", error);
    return {};
  }
}

// Write settings to file
function writeSettings(settings: Record<string, string>) {
  ensureDataDir();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

export async function GET() {
  try {
    const settings = readSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json(
        { error: "Key is required" },
        { status: 400 }
      );
    }

    const settings = readSettings();
    settings[key] = value || "";
    writeSettings(settings);

    return NextResponse.json({ key, value: value || "" });
  } catch (error) {
    console.error("Error saving setting:", error);
    return NextResponse.json(
      { error: "Failed to save setting" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const newSettings = body as Record<string, string>;

    const settings = readSettings();
    Object.entries(newSettings).forEach(([key, value]) => {
      settings[key] = value || "";
    });
    writeSettings(settings);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
