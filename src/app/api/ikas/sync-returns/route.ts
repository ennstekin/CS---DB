import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// POST - Sync returns from iKAS
export async function POST(request: NextRequest) {
  try {
    // Get iKAS settings from database
    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("*")
      .single();

    if (settingsError || !settings?.ikas_client_id || !settings?.ikas_client_secret) {
      return NextResponse.json(
        { error: "iKAS ayarları eksik. Lütfen Settings sayfasından ayarları yapın." },
        { status: 400 }
      );
    }

    // Get OAuth token from iKAS
    const tokenResponse = await fetch(`https://api.myikas.com/api/v1/admin/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: settings.ikas_client_id,
        client_secret: settings.ikas_client_secret,
        grant_type: "client_credentials",
      }),
    });

    if (!tokenResponse.ok) {
      return NextResponse.json(
        { error: "iKAS token alınamadı. Ayarları kontrol edin." },
        { status: 401 }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Fetch orders with REFUND_REQUESTED status from iKAS
    // Last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const ordersResponse = await fetch(
      `https://api.myikas.com/api/v1/admin/orders?orderPackageStatus=REFUND_REQUESTED&createdAt[gte]=${ninetyDaysAgo.toISOString()}&limit=100`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!ordersResponse.ok) {
      return NextResponse.json(
        { error: "iKAS siparişleri alınamadı" },
        { status: 500 }
      );
    }

    const ordersData = await ordersResponse.json();
    const orders = ordersData.data || [];

    let syncedCount = 0;
    let newReturns = 0;

    for (const order of orders) {
      // Check if order already exists in our database
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("id")
        .eq("order_number", order.orderNumber)
        .single();

      let orderId = existingOrder?.id;

      // If order doesn't exist, create it
      if (!orderId) {
        // First, check/create customer
        const { data: existingCustomer } = await supabase
          .from("customers")
          .select("id")
          .eq("email", order.customer?.email)
          .single();

        let customerId = existingCustomer?.id;

        if (!customerId) {
          const { data: newCustomer } = await supabase
            .from("customers")
            .insert({
              first_name: order.customer?.firstName || "",
              last_name: order.customer?.lastName || "",
              email: order.customer?.email || "",
              phone: order.customer?.phone || null,
            })
            .select()
            .single();

          customerId = newCustomer?.id;
        }

        // Create order
        const { data: newOrder } = await supabase
          .from("orders")
          .insert({
            customer_id: customerId,
            order_number: order.orderNumber,
            total_amount: order.totalFinalPrice || 0,
            currency: order.currencySymbol || "TL",
            status: order.orderStatus,
            ordered_at: order.orderedAt,
            ikas_order_id: order.id,
          })
          .select()
          .single();

        orderId = newOrder?.id;
      }

      // Check if return already exists
      const { data: existingReturn } = await supabase
        .from("returns")
        .select("id")
        .eq("order_id", orderId)
        .eq("source", "ikas")
        .single();

      if (!existingReturn) {
        // Create return from iKAS order
        const returnNumber = `IKAS-${order.orderNumber}`;

        const { data: newReturn } = await supabase
          .from("returns")
          .insert({
            order_id: orderId,
            customer_id: order.customer?.id,
            return_number: returnNumber,
            status: "PENDING_APPROVAL",
            reason: "ikas_refund_request",
            reason_detail: `iKAS'tan otomatik çekildi - Order Status: ${order.orderPackageStatus}`,
            total_refund_amount: order.totalFinalPrice || 0,
            refund_status: "PENDING",
            source: "ikas",
          })
          .select()
          .single();

        if (newReturn) {
          // Create timeline event
          await supabase.from("return_timeline").insert({
            return_id: newReturn.id,
            event_type: "created",
            description: "iKAS'tan otomatik iade talebi oluşturuldu",
            created_by: "system",
          });

          newReturns++;
        }
      }

      syncedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `${syncedCount} sipariş kontrol edildi, ${newReturns} yeni iade talebi oluşturuldu`,
      synced: syncedCount,
      newReturns,
    });
  } catch (error) {
    console.error("Error syncing iKAS returns:", error);
    return NextResponse.json(
      { error: "iKAS senkronizasyon hatası: " + (error as Error).message },
      { status: 500 }
    );
  }
}
