import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // Toplam mail sayısı
    const { count: totalMails } = await supabase
      .from("mails")
      .select("*", { count: "exact", head: true });

    // Bekleyen mailler (INBOX labelı olanlar veya flagsiz olanlar)
    const { data: pendingMailsData } = await supabase
      .from("mails")
      .select("id, labels, flags")
      .or("labels.cs.{INBOX,UNREAD},flags.cs.{}");

    const pendingMails = pendingMailsData?.filter((mail) => {
      // UNREAD labelı varsa veya \Seen flag'i yoksa bekleyen sayılır
      const hasUnreadLabel = mail.labels?.includes("UNREAD");
      const hasSeenFlag = mail.flags?.includes("\\Seen");
      return hasUnreadLabel || !hasSeenFlag;
    }).length || 0;

    // Çözülen mailler (\Seen flag'i olanlar)
    const { data: resolvedMailsData } = await supabase
      .from("mails")
      .select("flags");

    const resolvedMails = resolvedMailsData?.filter((mail) =>
      mail.flags?.includes("\\Seen")
    ).length || 0;

    return NextResponse.json({
      totalMails: totalMails || 0,
      pendingMails,
      resolvedMails,
    });
  } catch (error) {
    console.error("KPI fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch KPI data" },
      { status: 500 }
    );
  }
}
