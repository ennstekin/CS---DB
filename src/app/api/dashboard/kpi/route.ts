import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const slaThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago

    // Use efficient count queries instead of fetching all data
    const [
      totalMailsResult,
      pendingMailsResult,
      resolvedMailsResult,
      pendingReturnsResult,
      slaViolationsResult,
      todayResolvedResult,
      weekResolvedResult,
      avgResponseTimeResult,
    ] = await Promise.all([
      // Total mails count
      supabase
        .from("mails")
        .select("*", { count: "exact", head: true }),

      // Pending mails count (status NEW or OPEN)
      supabase
        .from("mails")
        .select("*", { count: "exact", head: true })
        .in("status", ["NEW", "OPEN"]),

      // Resolved mails count
      supabase
        .from("mails")
        .select("*", { count: "exact", head: true })
        .eq("status", "RESOLVED"),

      // Pending returns count
      supabase
        .from("returns")
        .select("*", { count: "exact", head: true })
        .in("status", ["REQUESTED", "PENDING_APPROVAL", "IN_TRANSIT"]),

      // SLA violations - mails pending more than 24 hours
      supabase
        .from("mails")
        .select("*", { count: "exact", head: true })
        .in("status", ["NEW", "OPEN"])
        .lt("created_at", slaThreshold),

      // Mails resolved today
      supabase
        .from("mails")
        .select("*", { count: "exact", head: true })
        .eq("status", "RESOLVED")
        .gte("updated_at", todayStart),

      // Mails resolved this week
      supabase
        .from("mails")
        .select("*", { count: "exact", head: true })
        .eq("status", "RESOLVED")
        .gte("updated_at", weekStart),

      // Get resolved mails with timestamps for avg response time calculation
      supabase
        .from("mails")
        .select("created_at, updated_at")
        .eq("status", "RESOLVED")
        .gte("updated_at", weekStart)
        .limit(100),
    ]);

    // Calculate average response time in hours
    let avgResponseTime = 0;
    if (avgResponseTimeResult.data && avgResponseTimeResult.data.length > 0) {
      const responseTimes = avgResponseTimeResult.data
        .filter(m => m.created_at && m.updated_at)
        .map(m => {
          const created = new Date(m.created_at).getTime();
          const updated = new Date(m.updated_at).getTime();
          return (updated - created) / (1000 * 60 * 60); // Convert to hours
        });

      if (responseTimes.length > 0) {
        avgResponseTime = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length * 10) / 10;
      }
    }

    return NextResponse.json({
      // Basic counts
      totalMails: totalMailsResult.count || 0,
      pendingMails: pendingMailsResult.count || 0,
      resolvedMails: resolvedMailsResult.count || 0,
      pendingReturns: pendingReturnsResult.count || 0,

      // SLA & Performance
      slaViolations: slaViolationsResult.count || 0,
      todayResolved: todayResolvedResult.count || 0,
      weekResolved: weekResolvedResult.count || 0,
      avgResponseTimeHours: avgResponseTime,

      // Calculated metrics
      resolutionRate: totalMailsResult.count
        ? Math.round((resolvedMailsResult.count || 0) / totalMailsResult.count * 100)
        : 0,
    });
  } catch (error) {
    console.error("KPI getirme hatası:", error);
    return NextResponse.json(
      { error: "KPI verileri alınamadı" },
      { status: 500 }
    );
  }
}
