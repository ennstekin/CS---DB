import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getOrderService } from "@/lib/services";

// POST - Submit return request from portal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderNumber, email, orderId, reason, reasonDetail, photos = [] } = body;

    if (!orderNumber || !email || !reason) {
      return NextResponse.json(
        { error: "Gerekli alanlar eksik", success: false },
        { status: 400 }
      );
    }

    const cleanOrderNumber = orderNumber.replace("#", "").trim();
    console.log(`📦 Portal: Submitting return for order ${cleanOrderNumber}`);

    // Get order details from İkas
    const orderService = await getOrderService();
    const ikasOrder = await orderService.getOrderByNumber(cleanOrderNumber);

    if (!ikasOrder) {
      return NextResponse.json(
        { error: "Sipariş bulunamadı", success: false },
        { status: 404 }
      );
    }

    // Verify email matches
    if (ikasOrder.customerEmail?.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: "E-posta adresi eşleşmiyor", success: false },
        { status: 401 }
      );
    }

    // Find or create customer
    let { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("email", ikasOrder.customerEmail)
      .single();

    if (!existingCustomer) {
      const nameParts = (ikasOrder.customerName || "").split(" ");
      const { data: newCustomer, error: customerError } = await supabase
        .from("customers")
        .insert({
          email: ikasOrder.customerEmail,
          first_name: nameParts[0] || "Müşteri",
          last_name: nameParts.slice(1).join(" ") || "",
        })
        .select()
        .single();

      if (customerError) {
        console.error("❌ Portal: Error creating customer:", customerError);
        throw customerError;
      }
      existingCustomer = newCustomer;
    }

    // Find or create order
    let { data: existingOrder } = await supabase
      .from("orders")
      .select("id")
      .eq("order_number", cleanOrderNumber)
      .single();

    if (!existingOrder) {
      // Convert timestamp to ISO date if needed
      let orderDate = new Date().toISOString();
      if (ikasOrder.createdAt) {
        // If it's a timestamp number, convert it
        if (typeof ikasOrder.createdAt === 'number' || /^\d+$/.test(ikasOrder.createdAt)) {
          orderDate = new Date(Number(ikasOrder.createdAt)).toISOString();
        } else {
          orderDate = ikasOrder.createdAt;
        }
      }

      const { data: newOrder, error: orderError } = await supabase
        .from("orders")
        .insert({
          ikas_order_id: orderId || ikasOrder.id,
          order_number: cleanOrderNumber,
          customer_id: existingCustomer?.id,
          status: ikasOrder.status || "DELIVERED",
          payment_status: "PAID",
          fulfillment_status: "FULFILLED",
          total_amount: ikasOrder.totalPrice || 0,
          order_date: orderDate,
        })
        .select()
        .single();

      if (orderError) {
        console.error("❌ Portal: Error creating order:", orderError);
        throw orderError;
      }
      existingOrder = newOrder;
    }

    // Generate return number
    const returnNumber = `RET-${cleanOrderNumber}-${Date.now().toString(36).toUpperCase()}`;

    // Create return request
    const { data: returnData, error: returnError } = await supabase
      .from("returns")
      .insert({
        order_id: existingOrder?.id,
        customer_id: existingCustomer?.id,
        return_number: returnNumber,
        status: "REQUESTED",
        reason,
        reason_detail: reasonDetail,
        total_refund_amount: ikasOrder.totalPrice || 0,
        refund_status: "PENDING",
        source: "portal",
      })
      .select()
      .single();

    if (returnError) {
      console.error("❌ Portal: Error creating return:", returnError);
      throw returnError;
    }

    // Create return items from İkas order
    if (ikasOrder.items && ikasOrder.items.length > 0) {
      const returnItems = ikasOrder.items.map((item) => ({
        return_id: returnData.id,
        product_name: item.name,
        variant_name: item.name,
        quantity: item.quantity,
        refund_amount: item.price * item.quantity,
      }));

      await supabase.from("return_items").insert(returnItems);
    }

    // Create timeline event
    await supabase.from("return_timeline").insert({
      return_id: returnData.id,
      event_type: "created",
      description: "Müşteri portalından iade talebi oluşturuldu",
      created_by: "portal",
    });

    // If photos provided, create note with photos
    if (photos && photos.length > 0) {
      await supabase.from("notes").insert({
        return_id: returnData.id,
        content: `Müşteri ${photos.length} adet fotoğraf yükledi`,
        is_internal: false,
        user_id: "customer",
      });
    }

    console.log(`✅ Portal: Return created successfully: ${returnNumber}`);

    return NextResponse.json({
      success: true,
      returnNumber,
      returnId: returnData.id,
    });
  } catch (error) {
    console.error("❌ Portal: Error submitting return:", error);
    return NextResponse.json(
      { error: "İade talebi oluşturulurken hata oluştu", success: false },
      { status: 500 }
    );
  }
}
