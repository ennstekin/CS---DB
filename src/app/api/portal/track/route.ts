import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// POST - Track return status by return number
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { returnNumber } = body;

    if (!returnNumber) {
      return NextResponse.json(
        { error: "İade numarası gerekli", success: false },
        { status: 400 }
      );
    }

    // Clean return number - remove common prefixes
    const cleanReturnNumber = returnNumber
      .replace("#", "")
      .replace(/^RET-/i, "")
      .trim()
      .toUpperCase();

    console.log(`🔍 Portal: Tracking return ${cleanReturnNumber}`);

    // Find return by return number containing the search term
    const { data: returns, error } = await supabase
      .from("returns")
      .select(`
        id,
        return_number,
        status,
        reason,
        reason_detail,
        total_refund_amount,
        refund_status,
        created_at,
        updated_at,
        customer:customers(first_name, last_name, email),
        order:orders(order_number)
      `)
      .ilike("return_number", `%${cleanReturnNumber}%`)
      .order("created_at", { ascending: false })
      .limit(1);

    const returnData = returns?.[0];

    if (error || !returnData) {
      console.log(`❌ Portal: Return ${cleanReturnNumber} not found`);
      return NextResponse.json(
        { error: "İade talebi bulunamadı", success: false },
        { status: 404 }
      );
    }

    // Get timeline events
    const { data: timeline } = await supabase
      .from("return_timeline")
      .select("*")
      .eq("return_id", returnData.id)
      .order("created_at", { ascending: true });

    // Get return items
    const { data: items } = await supabase
      .from("return_items")
      .select("*")
      .eq("return_id", returnData.id);

    console.log(`✅ Portal: Return ${cleanReturnNumber} found`);

    return NextResponse.json({
      success: true,
      return: {
        ...returnData,
        timeline: timeline || [],
        items: items || [],
      },
    });
  } catch (error) {
    console.error("❌ Portal: Error tracking return:", error);
    return NextResponse.json(
      { error: "İade takip hatası", success: false },
      { status: 500 }
    );
  }
}
