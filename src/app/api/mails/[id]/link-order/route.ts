import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// POST - Link a mail to an order number
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { orderNumber } = body;

    if (!orderNumber) {
      return NextResponse.json(
        { error: "Sipariş numarası gerekli" },
        { status: 400 }
      );
    }

    console.log(`🔗 Linking mail ${id} to order ${orderNumber}`);

    // Update the mail with the matched order number
    const { data, error } = await supabase
      .from("mails")
      .update({
        matched_order_number: orderNumber,
        is_matched_with_order: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("❌ Error linking mail to order:", error);
      return NextResponse.json(
        { error: "Mail siparişe bağlanamadı" },
        { status: 500 }
      );
    }

    console.log(`✅ Mail ${id} linked to order ${orderNumber}`);

    return NextResponse.json({
      success: true,
      matchedOrderNumber: orderNumber,
      mail: data,
    });
  } catch (error) {
    console.error("❌ Error in link-order:", error);
    return NextResponse.json(
      { error: "Bağlantı hatası" },
      { status: 500 }
    );
  }
}

// DELETE - Unlink a mail from an order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log(`🔓 Unlinking mail ${id} from order`);

    const { data, error } = await supabase
      .from("mails")
      .update({
        matched_order_number: null,
        is_matched_with_order: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("❌ Error unlinking mail from order:", error);
      return NextResponse.json(
        { error: "Bağlantı kaldırılamadı" },
        { status: 500 }
      );
    }

    console.log(`✅ Mail ${id} unlinked from order`);

    return NextResponse.json({
      success: true,
      mail: data,
    });
  } catch (error) {
    console.error("❌ Error in unlink-order:", error);
    return NextResponse.json(
      { error: "Bağlantı kaldırma hatası" },
      { status: 500 }
    );
  }
}
