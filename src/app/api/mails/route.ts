import { NextRequest, NextResponse } from "next/server";
import { mockMails } from "@/lib/mock-data";

// GET - Fetch all mails (using mock data for now)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    let filteredMails = mockMails;

    if (status && status !== "all") {
      if (status === "new") {
        filteredMails = mockMails.filter(m => m.status === "NEW");
      } else if (status === "open") {
        filteredMails = mockMails.filter(m => m.status === "OPEN" || m.status === "PENDING");
      } else if (status === "resolved") {
        filteredMails = mockMails.filter(m => m.status === "RESOLVED");
      }
    }

    // Convert mock data format to DB format
    const dbMails = filteredMails.map(mail => ({
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
    }));

    return NextResponse.json(dbMails);
  } catch (error) {
    console.error("Error fetching mails:", error);
    return NextResponse.json(
      { error: "Failed to fetch mails" },
      { status: 500 }
    );
  }
}
