import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendReturnStatusNotification, getSmtpConfigFromEnv } from "@/lib/services/notification-service";

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

      // Send customer notification
      const smtpConfig = getSmtpConfigFromEnv();
      if (smtpConfig) {
        // Get return with customer info for notification
        const { data: returnWithCustomer } = await supabase
          .from("returns")
          .select(`
            return_number,
            total_refund_amount,
            customer:customers(email, first_name, last_name),
            order:orders(order_number)
          `)
          .eq("id", id)
          .single();

        if (returnWithCustomer) {
          const customer = returnWithCustomer.customer as { email?: string; first_name?: string; last_name?: string } | null;
          const order = returnWithCustomer.order as { order_number?: string } | null;

          if (customer?.email) {
            // Send notification in background (don't await)
            sendReturnStatusNotification(smtpConfig, {
              to: customer.email,
              customerName: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Değerli Müşterimiz',
              returnNumber: returnWithCustomer.return_number || id,
              orderNumber: order?.order_number || '',
              status: status,
              totalAmount: returnWithCustomer.total_refund_amount,
            }).catch(err => console.error('Failed to send notification:', err));
          }
        }
      }
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
