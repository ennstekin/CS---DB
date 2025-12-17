import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const SETTINGS_KEY = "app_settings";

export async function GET() {
  try {
    const settings = await kv.get<Record<string, string>>(SETTINGS_KEY);
    return NextResponse.json(settings || {});
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

    const settings = await kv.get<Record<string, string>>(SETTINGS_KEY) || {};
    settings[key] = value || "";
    await kv.set(SETTINGS_KEY, settings);

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

    const settings = await kv.get<Record<string, string>>(SETTINGS_KEY) || {};
    Object.entries(newSettings).forEach(([key, value]) => {
      settings[key] = value || "";
    });
    await kv.set(SETTINGS_KEY, settings);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
