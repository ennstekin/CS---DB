import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET - Get return details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from("returns")
      .select(`
        *,
        customer:customers(*),
        order:orders(*),
        items:return_items(*),
        notes:notes(*),
        timeline:return_timeline(*)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    return NextResponse.json({ return: data });
  } catch (error) {
    console.error("Error fetching return:", error);
    return NextResponse.json(
      { error: "Failed to fetch return" },
      { status: 500 }
    );
  }
}

// PATCH - Update return status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, refundStatus, approvedAt, completedAt } = body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (refundStatus) updateData.refund_status = refundStatus;
    if (approvedAt) updateData.approved_at = approvedAt;
    if (completedAt) updateData.completed_at = completedAt;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("returns")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Create timeline event if status changed
    if (status) {
      await supabase.from("return_timeline").insert({
        return_id: id,
        event_type: "status_changed",
        description: `Durum güncellendi: ${status}`,
        event_data: { oldStatus: body.oldStatus, newStatus: status },
        created_by: "system", // TODO: Get from auth
      });
    }

    return NextResponse.json({
      success: true,
      return: data,
    });
  } catch (error) {
    console.error("Error updating return:", error);
    return NextResponse.json(
      { error: "Failed to update return" },
      { status: 500 }
    );
  }
}

// DELETE - Delete return
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabase.from("returns").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting return:", error);
    return NextResponse.json(
      { error: "Failed to delete return" },
      { status: 500 }
    );
  }
}
