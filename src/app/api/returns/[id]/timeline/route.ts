import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET - Get return timeline
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from("return_timeline")
      .select("*")
      .eq("return_id", id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ timeline: data || [] });
  } catch (error) {
    console.error("Error fetching timeline:", error);
    return NextResponse.json(
      { error: "Failed to fetch timeline" },
      { status: 500 }
    );
  }
}

// POST - Add timeline event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { eventType, description, eventData } = body;

    const { data, error } = await supabase
      .from("return_timeline")
      .insert({
        return_id: id,
        event_type: eventType,
        description,
        event_data: eventData,
        created_by: "system", // TODO: Get from auth
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      event: data,
    });
  } catch (error) {
    console.error("Error adding timeline event:", error);
    return NextResponse.json(
      { error: "Failed to add timeline event" },
      { status: 500 }
    );
  }
}
