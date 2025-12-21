import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { groupMailsIntoThreads, ThreadedMail } from "@/lib/utils/mail-threading";

// GET - Fetch mails from Supabase with pagination and optional threading
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const direction = searchParams.get("direction") || "INBOUND"; // Default: only show inbound mails
    const grouped = searchParams.get("grouped") === "true"; // Thread grouping
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

    // For thread grouping, we need all mails (both directions) to build complete threads
    let query = supabase
      .from("mails")
      .select("*, message_id, in_reply_to, direction")
      .order("received_at", { ascending: false });

    // When grouping threads, fetch all directions to build complete threads
    // Otherwise, filter by direction
    if (!grouped && direction !== "all") {
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

    // Apply pagination only when not grouping (grouping needs all mails first)
    if (!grouped) {
      query = query.range(offset, offset + limit - 1);
    } else {
      query = query.limit(500); // Fetch more for threading, but with a reasonable limit
    }

    const { data: mails, error } = await query;

    if (error) throw error;

    // Return empty array if no mails
    if (!mails || mails.length === 0) {
      return NextResponse.json([]);
    }

    // Helper to infer category
    const inferCategory = (subject: string, bodyText: string) => {
      const text = ((subject || "") + " " + (bodyText || "")).toLowerCase();
      if (text.includes("yanlış") || text.includes("hatalı") || text.includes("farklı")) return "WRONG_ITEM";
      if (text.includes("iade") || text.includes("geri gönder") || text.includes("iade et")) return "RETURN_REQUEST";
      if (text.includes("beden") || text.includes("değişim") || text.includes("değiş")) return "SIZE_EXCHANGE";
      if (text.includes("teşekkür") || text.includes("memnun") || text.includes("harika")) return "POSITIVE_FEEDBACK";
      if (text.includes("fatura")) return "INVOICE_REQUEST";
      if (text.includes("indirim") || text.includes("kod") || text.includes("kupon")) return "DISCOUNT_ISSUE";
      if (text.includes("takip") || text.includes("nerede") || text.includes("ulaştı mı")) return "TRACKING_INQUIRY";
      return "ORDER_INQUIRY";
    };

    // Convert DB format to frontend format
    const convertMail = (mail: typeof mails[0]) => {
      const category = mail.ai_category || inferCategory(mail.subject, mail.body_text);
      return {
        id: mail.id,
        messageId: mail.message_id || null,
        inReplyTo: mail.in_reply_to || null,
        fromEmail: mail.from_email,
        toEmail: mail.to_email || "support@company.com",
        subject: mail.subject || "(Konu yok)",
        bodyText: mail.body_text || "",
        bodyHtml: mail.body_html || null,
        status: mail.status,
        priority: mail.priority,
        direction: mail.direction || "INBOUND",
        isAiAnalyzed: mail.is_ai_analyzed || true,
        aiCategory: category,
        aiSummary: mail.ai_summary || "Mail otomatik olarak kategorize edildi",
        suggestedOrderIds: mail.suggested_order_ids || [],
        matchConfidence: mail.match_confidence || 0.7,
        receivedAt: mail.received_at ? new Date(mail.received_at) : new Date(mail.created_at),
        createdAt: new Date(mail.created_at),
        matchedOrderNumber: mail.matched_order_number || null,
        isMatchedWithOrder: mail.is_matched_with_order || false,
        matchedReturnId: mail.matched_return_id || null,
        matchedReturnNumber: mail.matched_return_number || null,
        labels: mail.labels || [],
        flags: mail.flags || [],
      };
    };

    const dbMails = mails.map(convertMail);

    // If thread grouping is requested
    if (grouped) {
      const threads = groupMailsIntoThreads(dbMails as ThreadedMail[]);
      return NextResponse.json({
        threads,
        totalThreads: threads.length,
        totalMails: dbMails.length,
      });
    }

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
