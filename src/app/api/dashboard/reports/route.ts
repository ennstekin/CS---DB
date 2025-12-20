import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get("range") || "7d"; // 7d, 30d, 90d

    const now = new Date();
    let startDate: Date;

    switch (range) {
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const startDateStr = startDate.toISOString();

    // Fetch all data in parallel
    const [
      // Mail statistics
      totalMailsResult,
      newMailsInRangeResult,
      resolvedMailsInRangeResult,
      mailsByStatusResult,
      mailsByCategoryResult,
      // Return statistics
      totalReturnsResult,
      newReturnsInRangeResult,
      completedReturnsInRangeResult,
      returnsByStatusResult,
      returnsByReasonResult,
      // Daily breakdown for charts
      dailyMailsResult,
      dailyReturnsResult,
      // Response time data
      responseTimeDataResult,
      // SLA data
      slaViolationsResult,
    ] = await Promise.all([
      // Total mails
      supabase.from("mails").select("*", { count: "exact", head: true }),

      // New mails in range
      supabase
        .from("mails")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startDateStr),

      // Resolved mails in range
      supabase
        .from("mails")
        .select("*", { count: "exact", head: true })
        .eq("status", "RESOLVED")
        .gte("updated_at", startDateStr),

      // Mails by status
      supabase
        .from("mails")
        .select("status")
        .gte("created_at", startDateStr),

      // Mails by category
      supabase
        .from("mails")
        .select("ai_category")
        .gte("created_at", startDateStr),

      // Total returns
      supabase.from("returns").select("*", { count: "exact", head: true }),

      // New returns in range
      supabase
        .from("returns")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startDateStr),

      // Completed returns in range
      supabase
        .from("returns")
        .select("*", { count: "exact", head: true })
        .eq("status", "COMPLETED")
        .gte("updated_at", startDateStr),

      // Returns by status
      supabase
        .from("returns")
        .select("status")
        .gte("created_at", startDateStr),

      // Returns by reason
      supabase
        .from("returns")
        .select("reason")
        .gte("created_at", startDateStr),

      // Daily mails for chart
      supabase
        .from("mails")
        .select("created_at, status")
        .gte("created_at", startDateStr)
        .order("created_at", { ascending: true }),

      // Daily returns for chart
      supabase
        .from("returns")
        .select("created_at, status")
        .gte("created_at", startDateStr)
        .order("created_at", { ascending: true }),

      // Response time data
      supabase
        .from("mails")
        .select("created_at, updated_at")
        .eq("status", "RESOLVED")
        .gte("updated_at", startDateStr)
        .limit(500),

      // SLA violations (24+ hours)
      supabase
        .from("mails")
        .select("*", { count: "exact", head: true })
        .in("status", ["NEW", "OPEN"])
        .lt("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()),
    ]);

    // Process mail status distribution
    const mailStatusCounts: Record<string, number> = {};
    (mailsByStatusResult.data || []).forEach((mail) => {
      const status = mail.status || "UNKNOWN";
      mailStatusCounts[status] = (mailStatusCounts[status] || 0) + 1;
    });

    // Process mail category distribution
    const mailCategoryCounts: Record<string, number> = {};
    (mailsByCategoryResult.data || []).forEach((mail) => {
      const category = mail.ai_category || "OTHER";
      mailCategoryCounts[category] = (mailCategoryCounts[category] || 0) + 1;
    });

    // Process return status distribution
    const returnStatusCounts: Record<string, number> = {};
    (returnsByStatusResult.data || []).forEach((ret) => {
      const status = ret.status || "UNKNOWN";
      returnStatusCounts[status] = (returnStatusCounts[status] || 0) + 1;
    });

    // Process return reason distribution
    const returnReasonCounts: Record<string, number> = {};
    (returnsByReasonResult.data || []).forEach((ret) => {
      const reason = ret.reason || "OTHER";
      returnReasonCounts[reason] = (returnReasonCounts[reason] || 0) + 1;
    });

    // Process daily breakdown for charts
    const dailyMailData: Record<string, { total: number; resolved: number }> = {};
    (dailyMailsResult.data || []).forEach((mail) => {
      const date = new Date(mail.created_at).toISOString().split("T")[0];
      if (!dailyMailData[date]) {
        dailyMailData[date] = { total: 0, resolved: 0 };
      }
      dailyMailData[date].total++;
      if (mail.status === "RESOLVED") {
        dailyMailData[date].resolved++;
      }
    });

    const dailyReturnData: Record<string, { total: number; completed: number }> = {};
    (dailyReturnsResult.data || []).forEach((ret) => {
      const date = new Date(ret.created_at).toISOString().split("T")[0];
      if (!dailyReturnData[date]) {
        dailyReturnData[date] = { total: 0, completed: 0 };
      }
      dailyReturnData[date].total++;
      if (ret.status === "COMPLETED") {
        dailyReturnData[date].completed++;
      }
    });

    // Calculate average response time
    let avgResponseTimeHours = 0;
    const responseTimes = (responseTimeDataResult.data || [])
      .filter((m) => m.created_at && m.updated_at)
      .map((m) => {
        const created = new Date(m.created_at).getTime();
        const updated = new Date(m.updated_at).getTime();
        return (updated - created) / (1000 * 60 * 60);
      });

    if (responseTimes.length > 0) {
      avgResponseTimeHours =
        Math.round(
          (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) * 10
        ) / 10;
    }

    // Calculate resolution rate
    const totalInRange = newMailsInRangeResult.count || 0;
    const resolvedInRange = resolvedMailsInRangeResult.count || 0;
    const resolutionRate = totalInRange > 0 ? Math.round((resolvedInRange / totalInRange) * 100) : 0;

    // Format daily data for charts
    const chartData = [];
    const currentDate = new Date(startDate);
    while (currentDate <= now) {
      const dateStr = currentDate.toISOString().split("T")[0];
      chartData.push({
        date: dateStr,
        mails: dailyMailData[dateStr]?.total || 0,
        mailsResolved: dailyMailData[dateStr]?.resolved || 0,
        returns: dailyReturnData[dateStr]?.total || 0,
        returnsCompleted: dailyReturnData[dateStr]?.completed || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json({
      range,
      summary: {
        totalMails: totalMailsResult.count || 0,
        newMailsInRange: newMailsInRangeResult.count || 0,
        resolvedMailsInRange: resolvedMailsInRangeResult.count || 0,
        totalReturns: totalReturnsResult.count || 0,
        newReturnsInRange: newReturnsInRangeResult.count || 0,
        completedReturnsInRange: completedReturnsInRangeResult.count || 0,
        avgResponseTimeHours,
        resolutionRate,
        slaViolations: slaViolationsResult.count || 0,
      },
      distributions: {
        mailsByStatus: mailStatusCounts,
        mailsByCategory: mailCategoryCounts,
        returnsByStatus: returnStatusCounts,
        returnsByReason: returnReasonCounts,
      },
      chartData,
    });
  } catch (error) {
    console.error("Report getirme hatasi:", error);
    return NextResponse.json(
      { error: "Rapor verileri alinamadi" },
      { status: 500 }
    );
  }
}
