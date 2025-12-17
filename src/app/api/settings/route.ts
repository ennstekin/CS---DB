import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("settings")
      .select("key, value");

    if (error) throw error;

    // Convert array to object
    const settings: Record<string, string> = {};
    data?.forEach((row) => {
      settings[row.key] = row.value;
    });

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

    // Upsert: update if exists, insert if not
    const { error } = await supabase
      .from("settings")
      .upsert({ key, value: value || "" }, { onConflict: "key" });

    if (error) throw error;

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

    // Prepare upsert data
    const upsertData = Object.entries(newSettings).map(([key, value]) => ({
      key,
      value: value || "",
    }));

    // Batch upsert all settings
    const { error } = await supabase
      .from("settings")
      .upsert(upsertData, { onConflict: "key" });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
