import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { mockMails } from "@/lib/mock-data";

// GET - Fetch all mails from Supabase
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    // Build query
    let query = supabase
      .from("mails")
      .select("*")
      .order("received_at", { ascending: false });

    // Filter by status
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

    // If no mails in DB, return mock data
    if (!mails || mails.length === 0) {
      console.log("No mails in database, returning mock data");
      return NextResponse.json(mockMails.map(mail => ({
        id: mail.id,
        fromEmail: mail.from,
        toEmail: "support@company.com",
        subject: mail.subject,
        bodyText: mail.body,
        status: mail.status,
        priority: mail.priority,
        isAiAnalyzed: mail.isAiAnalyzed,
        aiCategory: mail.aiCategory,
        aiSummary: mail.aiSummary,
        suggestedOrderIds: mail.suggestedOrderNumbers || [],
        matchConfidence: mail.matchConfidence,
        receivedAt: new Date(mail.receivedAt),
        createdAt: new Date(mail.receivedAt),
      })));
    }

    // Convert DB format to frontend format
    const dbMails = mails.map(mail => {
      // Basit kategori tahmini (eğer yoksa)
      let category = mail.ai_category;
      if (!category) {
        const subject = (mail.subject || "").toLowerCase();
        const body = (mail.body_text || "").toLowerCase();
        const text = subject + " " + body;

        // Önce özel durumları kontrol et (daha spesifik olanlar önce)
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
          category = "ORDER_INQUIRY"; // Varsayılan
        }
      }

      return {
        id: mail.id,
        fromEmail: mail.from_email,
        toEmail: mail.to_email || "support@company.com",
        subject: mail.subject || "(No Subject)",
        bodyText: mail.body_text || "",
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

    return NextResponse.json(dbMails);
  } catch (error) {
    console.error("Error fetching mails:", error);
    return NextResponse.json(
      { error: "Failed to fetch mails" },
      { status: 500 }
    );
  }
}
