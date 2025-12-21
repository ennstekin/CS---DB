import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET - Fetch mails from Supabase with pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const direction = searchParams.get("direction") || "INBOUND"; // Default: only show inbound mails
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100); // Max 100
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get total count for pagination
    let countQuery = supabase
      .from("mails")
      .select("*", { count: "exact", head: true });

    // Filter by direction (default: INBOUND for inbox)
    if (direction !== "all") {
      countQuery = countQuery.eq("direction", direction);
    }

    if (status && status !== "all") {
      if (status === "new") {
        countQuery = countQuery.eq("status", "NEW");
      } else if (status === "open") {
        countQuery = countQuery.in("status", ["OPEN", "PENDING"]);
      } else if (status === "resolved") {
        countQuery = countQuery.eq("status", "RESOLVED");
      }
    }

    const { count: totalCount } = await countQuery;

    // Build paginated query
    let query = supabase
      .from("mails")
      .select("*")
      .order("received_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by direction (default: INBOUND for inbox)
    if (direction !== "all") {
      query = query.eq("direction", direction);
    }

    if (status && status !== "all") {
      if (status === "new") {
        query = query.eq("status", "NEW");
      } else if (status === "open") {
        query = query.in("status", ["OPEN", "PENDING"]);
      } else if (status === "resolved") {
        query = query.eq("status", "RESOLVED");
      }
    }

    const { data: mails, error } = await query;

    if (error) throw error;

    // Return empty array if no mails
    if (!mails || mails.length === 0) {
      return NextResponse.json([]);
    }

    // Convert DB format to frontend format with category inference
    const dbMails = mails.map(mail => {
      let category = mail.ai_category;
      if (!category) {
        const subject = (mail.subject || "").toLowerCase();
        const body = (mail.body_text || "").toLowerCase();
        const text = subject + " " + body;

        if (text.includes("yanlış") || text.includes("hatalı") || text.includes("farklı")) {
          category = "WRONG_ITEM";
        } else if (text.includes("iade") || text.includes("geri gönder") || text.includes("iade et")) {
          category = "RETURN_REQUEST";
        } else if (text.includes("beden") || text.includes("değişim") || text.includes("değiş")) {
          category = "SIZE_EXCHANGE";
        } else if (text.includes("teşekkür") || text.includes("memnun") || text.includes("harika")) {
          category = "POSITIVE_FEEDBACK";
        } else if (text.includes("fatura")) {
          category = "INVOICE_REQUEST";
        } else if (text.includes("indirim") || text.includes("kod") || text.includes("kupon")) {
          category = "DISCOUNT_ISSUE";
        } else if (text.includes("takip") || text.includes("nerede") || text.includes("ulaştı mı")) {
          category = "TRACKING_INQUIRY";
        } else if (text.includes("sipariş") || text.includes("kargo") || text.includes("#")) {
          category = "ORDER_INQUIRY";
        } else {
          category = "ORDER_INQUIRY";
        }
      }

      return {
        id: mail.id,
        fromEmail: mail.from_email,
        toEmail: mail.to_email || "support@company.com",
        subject: mail.subject || "(Konu yok)",
        bodyText: mail.body_text || "",
        bodyHtml: mail.body_html || null,
        status: mail.status,
        priority: mail.priority,
        isAiAnalyzed: mail.is_ai_analyzed || true,
        aiCategory: category,
        aiSummary: mail.ai_summary || "Mail otomatik olarak kategorize edildi",
        suggestedOrderIds: mail.suggested_order_ids || [],
        matchConfidence: mail.match_confidence || 0.7,
        receivedAt: new Date(mail.received_at || mail.created_at),
        createdAt: new Date(mail.created_at),
        matchedOrderNumber: mail.matched_order_number || null,
        isMatchedWithOrder: mail.is_matched_with_order || false,
        matchedReturnId: mail.matched_return_id || null,
        matchedReturnNumber: mail.matched_return_number || null,
        labels: mail.labels || [],
        flags: mail.flags || [],
      };
    });

    // Return with pagination info if offset is provided
    if (searchParams.has("offset")) {
      return NextResponse.json({
        mails: dbMails,
        pagination: {
          total: totalCount || 0,
          limit,
          offset,
          hasMore: (totalCount || 0) > offset + limit,
        },
      });
    }

    // Legacy: return array directly for backward compatibility
    return NextResponse.json(dbMails);
  } catch (error) {
    console.error("Mail getirme hatası:", error);
    return NextResponse.json(
      { error: "Mailler alınamadı" },
      { status: 500 }
    );
  }
}
