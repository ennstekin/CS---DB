import { NextRequest, NextResponse } from "next/server";
import { getOrderService } from "@/lib/services";

// POST - Verify order for return portal using İkas API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderNumber, email } = body;

    if (!orderNumber || !email) {
      return NextResponse.json(
        { error: "Sipariş numarası ve e-posta gerekli", success: false },
        { status: 400 }
      );
    }

    // Clean order number (remove # if present)
    const cleanOrderNumber = orderNumber.replace("#", "").trim();

    console.log(`🔍 Portal: Verifying order ${cleanOrderNumber} for email ${email}`);

    // Get order service (fetches İkas credentials from Supabase)
    const orderService = await getOrderService();

    // Fetch order from İkas
    const order = await orderService.getOrderByNumber(cleanOrderNumber);

    if (!order) {
      console.log(`❌ Portal: Order ${cleanOrderNumber} not found in İkas`);
      return NextResponse.json(
        { error: "Sipariş bulunamadı", success: false },
        { status: 404 }
      );
    }

    // Verify email matches (case-insensitive)
    if (order.customerEmail?.toLowerCase() !== email.toLowerCase()) {
      console.log(`❌ Portal: Email mismatch for order ${cleanOrderNumber}`);
      return NextResponse.json(
        { error: "E-posta adresi eşleşmiyor", success: false },
        { status: 401 }
      );
    }

    console.log(`✅ Portal: Order ${cleanOrderNumber} verified successfully`);

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        totalPrice: order.totalPrice,
        shippingPrice: order.shippingPrice,
        currency: order.currency,
        createdAt: order.createdAt,
        status: order.status,
        items: order.items.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
      },
    });
  } catch (error) {
    console.error("❌ Portal: Error verifying order:", error);
    return NextResponse.json(
      { error: "Sipariş doğrulama hatası", success: false },
      { status: 500 }
    );
  }
}
