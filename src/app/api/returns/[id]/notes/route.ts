import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET - Get return notes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from("notes")
      .select("*, user:users(*)")
      .eq("return_id", id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ notes: data || [] });
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

// POST - Add note to return
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content, isInternal, userId } = body;

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("notes")
      .insert({
        return_id: id,
        content,
        is_internal: isInternal ?? true,
        user_id: userId || "system", // TODO: Get from auth
      })
      .select("*, user:users(*)")
      .single();

    if (error) throw error;

    // Add timeline event
    await supabase.from("return_timeline").insert({
      return_id: id,
      event_type: "note_added",
      description: "Not eklendi",
      event_data: { noteId: data.id },
      created_by: userId || "system",
    });

    return NextResponse.json({
      success: true,
      note: data,
    });
  } catch (error) {
    console.error("Error adding note:", error);
    return NextResponse.json(
      { error: "Failed to add note" },
      { status: 500 }
    );
  }
}
