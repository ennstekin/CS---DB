import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// DELETE - Soft delete a mail (set deleted_at timestamp)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Soft delete - set deleted_at timestamp instead of hard delete
    // This prevents IMAP fetch from re-importing the deleted mail
    const { error } = await supabase
      .from("mails")
      .update({
        deleted_at: new Date().toISOString(),
        ticket_id: null // Unlink from ticket
      })
      .eq("id", id);

    if (error) {
      console.error("Error deleting mail:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Mail Error:", error);
    return NextResponse.json(
      { error: "Failed to delete mail" },
      { status: 500 }
    );
  }
}

// PATCH - Update mail (status, labels, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, labels, matchedOrderNumber, matchedReturnId } = body;

    const updates: Record<string, any> = {};

    if (status) updates.status = status;
    if (labels) updates.labels = labels;
    if (matchedOrderNumber !== undefined) updates.matched_order_number = matchedOrderNumber;
    if (matchedReturnId !== undefined) updates.matched_return_id = matchedReturnId;

    const { data, error } = await supabase
      .from("mails")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating mail:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, mail: data });
  } catch (error) {
    console.error("Update Mail Error:", error);
    return NextResponse.json(
      { error: "Failed to update mail" },
      { status: 500 }
    );
  }
}
