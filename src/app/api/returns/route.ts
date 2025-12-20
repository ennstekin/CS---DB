import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { IkasClient } from "@/lib/ikas/client";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/logger";

// Get İkas settings from database
async function getIkasClient(): Promise<IkasClient | null> {
  const { data: settings } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["ikas_client_id", "ikas_client_secret", "ikas_store_name"]);

  if (!settings || settings.length < 3) return null;

  const config: Record<string, string> = {};
  settings.forEach((s) => (config[s.key] = s.value));

  if (!config.ikas_client_id || !config.ikas_client_secret || !config.ikas_store_name) {
    return null;
  }

  return new IkasClient({
    clientId: config.ikas_client_id,
    clientSecret: config.ikas_client_secret,
    storeName: config.ikas_store_name,
  });
}

// GET - List all returns from İkas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const source = searchParams.get("source") || "db"; // db (fast) or ikas (slow, real-time)

    // Try to fetch from İkas first
    if (source === "ikas") {
      const ikasClient = await getIkasClient();

      if (ikasClient) {
        const ikasReturns = await ikasClient.getReturns(limit);

        // Transform to match frontend expected format
        let returns = ikasReturns.map((r) => ({
          id: r.id,
          return_number: `RET-${r.orderNumber}`,
          status: r.status,
          reason: r.lineItems[0]?.status || "İade talebi",
          total_refund_amount: r.totalRefundAmount,
          created_at: r.requestedAt,
          customer: {
            first_name: r.customerName.split(" ")[0] || "",
            last_name: r.customerName.split(" ").slice(1).join(" ") || "",
            email: r.customerEmail,
          },
          order: {
            order_number: r.orderNumber,
          },
          items: r.lineItems,
        }));

        // Filter by status if provided
        if (status && status !== "all") {
          returns = returns.filter((r) => r.status === status);
        }

        return NextResponse.json({ returns, source: "ikas" });
      }
    }

    // Fallback to database
    let query = supabase
      .from("returns")
      .select(`
        *,
        customer:customers(*),
        order:orders(*)
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ returns: data || [], source: "db" });
  } catch (error) {
    console.error("İade getirme hatası:", error);
    return NextResponse.json(
      { error: "İadeler alınamadı" },
      { status: 500 }
    );
  }
}

// POST - Create new return
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orderId,
      customerId,
      returnNumber,
      reason,
      reasonDetail,
      totalRefundAmount,
      items,
      source = "manual",
      // İkas order data for manual returns
      orderNumber,
      customerEmail,
      customerName,
    } = body;

    // Validate required fields
    if (!returnNumber) {
      return NextResponse.json(
        { error: "İade numarası gerekli" },
        { status: 400 }
      );
    }

    // Input validation
    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return NextResponse.json(
        { error: "Geçersiz e-posta formatı" },
        { status: 400 }
      );
    }

    if (totalRefundAmount && (isNaN(totalRefundAmount) || totalRefundAmount < 0)) {
      return NextResponse.json(
        { error: "Geçersiz iade tutarı" },
        { status: 400 }
      );
    }

    let finalOrderId = orderId;
    let finalCustomerId = customerId;

    // For manual returns with İkas data, create/find customer and order
    if (source === "manual" && orderNumber && customerEmail) {
      // Find or create customer
      let { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("email", customerEmail)
        .single();

      if (!existingCustomer) {
        const nameParts = (customerName || "").split(" ");
        const { data: newCustomer, error: customerError } = await supabase
          .from("customers")
          .insert({
            email: customerEmail,
            first_name: nameParts[0] || "Müşteri",
            last_name: nameParts.slice(1).join(" ") || "",
          })
          .select()
          .single();

        if (customerError) {
          console.error("Error creating customer:", customerError);
          throw customerError;
        }
        existingCustomer = newCustomer;
      }
      finalCustomerId = existingCustomer?.id;

      // Find or create order
      let { data: existingOrder } = await supabase
        .from("orders")
        .select("id")
        .eq("order_number", orderNumber)
        .single();

      if (!existingOrder) {
        const { data: newOrder, error: orderError } = await supabase
          .from("orders")
          .insert({
            ikas_order_id: orderId || `manual-${orderNumber}`,
            order_number: orderNumber,
            customer_id: finalCustomerId,
            status: "DELIVERED",
            payment_status: "PAID",
            fulfillment_status: "FULFILLED",
            total_amount: totalRefundAmount || 0,
            order_date: new Date().toISOString(),
          })
          .select()
          .single();

        if (orderError) {
          console.error("Error creating order:", orderError);
          throw orderError;
        }
        existingOrder = newOrder;
      }
      finalOrderId = existingOrder?.id;
    }

    // Validate we have IDs
    if (!finalOrderId || !finalCustomerId) {
      return NextResponse.json(
        { error: "Sipariş veya müşteri bilgisi eksik" },
        { status: 400 }
      );
    }

    // Create return
    const { data: returnData, error: returnError } = await supabase
      .from("returns")
      .insert({
        order_id: finalOrderId,
        customer_id: finalCustomerId,
        return_number: returnNumber,
        status: "REQUESTED",
        reason: reason || "other",
        reason_detail: reasonDetail,
        total_refund_amount: totalRefundAmount || 0,
        refund_status: "PENDING",
        source: source,
      })
      .select()
      .single();

    if (returnError) throw returnError;

    // Create return items if provided
    if (items && items.length > 0) {
      const returnItems = items.map((item: any) => ({
        return_id: returnData.id,
        product_name: item.productName,
        variant_name: item.variantName,
        quantity: item.quantity,
        refund_amount: item.refundAmount,
      }));

      await supabase.from("return_items").insert(returnItems);
    }

    // Create timeline event
    await supabase.from("return_timeline").insert({
      return_id: returnData.id,
      event_type: "created",
      description: source === "manual" ? "Manuel iade talebi oluşturuldu" : "İade talebi oluşturuldu",
      created_by: "system",
    });

    // Log activity
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    let appUser = null;
    if (user) {
      const { data } = await authSupabase
        .from("app_users")
        .select("email, role")
        .eq("id", user.id)
        .single();
      appUser = data;
    }

    await logActivity({
      userId: user?.id,
      userEmail: appUser?.email,
      userRole: appUser?.role,
      action: "CREATE",
      entityType: "return",
      entityId: returnData.id,
      description: `İade oluşturuldu: ${returnNumber}`,
      newValues: {
        returnNumber,
        reason,
        totalRefundAmount,
        source,
        orderNumber,
      },
    });

    return NextResponse.json({
      success: true,
      return: returnData,
    });
  } catch (error) {
    console.error("İade oluşturma hatası:", error);
    return NextResponse.json(
      { error: "İade oluşturulamadı" },
      { status: 500 }
    );
  }
}
