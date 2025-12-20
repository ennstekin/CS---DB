"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Mail,
  Undo2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp
} from "lucide-react";

interface DashboardStats {
  pendingMails: number;
  pendingReturns: number;
  todayResolved: number;
  weeklyTotal: number;
  oldestPendingMail: { id: string; subject: string; from: string; hours: number } | null;
  recentActivity: Array<{
    id: string;
    type: "mail" | "return";
    title: string;
    description: string;
    time: string;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    pendingMails: 0,
    pendingReturns: 0,
    todayResolved: 0,
    weeklyTotal: 0,
    oldestPendingMail: null,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Parallel fetch for better performance (use source=db for fast local queries)
      const [mailsRes, returnsRes] = await Promise.all([
        fetch("/api/mails?limit=100"),
        fetch("/api/returns?status=all&limit=100&source=db"),
      ]);

      const mailsData = await mailsRes.json();
      const returnsData = await returnsRes.json();

      const mails = mailsData.mails || [];
      const returns = returnsData.returns || [];

      // Calculate stats
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 7);

      // Pending mails (not replied)
      const pendingMails = mails.filter((m: any) => !m.isReplied);

      // Pending returns
      const pendingReturns = returns.filter(
        (r: any) => r.status === "REQUESTED" || r.status === "PENDING_APPROVAL"
      );

      // Today resolved
      const todayResolved = mails.filter((m: any) => {
        if (!m.isReplied) return false;
        const repliedAt = new Date(m.updatedAt || m.createdAt);
        return repliedAt >= todayStart;
      }).length;

      // Weekly total (mails + returns)
      const weeklyMails = mails.filter((m: any) => new Date(m.createdAt) >= weekStart).length;
      const weeklyReturns = returns.filter((r: any) => new Date(r.createdAt) >= weekStart).length;

      // Oldest pending mail
      let oldestPendingMail = null;
      if (pendingMails.length > 0) {
        const sorted = [...pendingMails].sort(
          (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        const oldest = sorted[0];
        const hoursAgo = Math.floor((now.getTime() - new Date(oldest.createdAt).getTime()) / (1000 * 60 * 60));
        oldestPendingMail = {
          id: oldest.id,
          subject: oldest.subject || "Konu yok",
          from: oldest.fromEmail || "Bilinmeyen",
          hours: hoursAgo,
        };
      }

      // Recent activity - combine mails and returns, sort by date
      const recentActivity: DashboardStats["recentActivity"] = [];

      // Add recent mails (last 5 replied)
      const repliedMails = mails
        .filter((m: any) => m.isReplied)
        .sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
        .slice(0, 3);

      repliedMails.forEach((m: any) => {
        const time = new Date(m.updatedAt || m.createdAt);
        recentActivity.push({
          id: m.id,
          type: "mail",
          title: m.subject || "Konu yok",
          description: `${m.fromEmail} - yanıtlandı`,
          time: formatTime(time),
        });
      });

      // Add recent returns (last 3)
      const recentReturns = returns
        .sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
        .slice(0, 3);

      recentReturns.forEach((r: any) => {
        const time = new Date(r.updatedAt || r.createdAt);
        recentActivity.push({
          id: r.id,
          type: "return",
          title: `İade #${r.returnNumber || r.id.slice(0, 8)}`,
          description: getReturnStatusText(r.status),
          time: formatTime(time),
        });
      });

      // Sort all by time (newest first)
      recentActivity.sort((a, b) => {
        const timeA = parseTimeAgo(a.time);
        const timeB = parseTimeAgo(b.time);
        return timeA - timeB; // Lower value = more recent
      });

      setStats({
        pendingMails: pendingMails.length,
        pendingReturns: pendingReturns.length,
        todayResolved,
        weeklyTotal: weeklyMails + weeklyReturns,
        oldestPendingMail,
        recentActivity: recentActivity.slice(0, 5),
      });
    } catch (error) {
      console.error("Dashboard veri hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  // Parse time ago string back to minutes for sorting
  const parseTimeAgo = (timeStr: string): number => {
    if (timeStr.includes("dk önce")) {
      return parseInt(timeStr) || 0;
    }
    if (timeStr.includes("saat önce")) {
      return (parseInt(timeStr) || 0) * 60;
    }
    if (timeStr.includes("gün önce")) {
      return (parseInt(timeStr) || 0) * 60 * 24;
    }
    return 99999; // Very old
  };

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins} dk önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;
    return date.toLocaleDateString("tr-TR");
  };

  const getReturnStatusText = (status: string): string => {
    const statusMap: Record<string, string> = {
      REQUESTED: "Talep edildi",
      PENDING_APPROVAL: "Onay bekliyor",
      APPROVED: "Onaylandı",
      IN_TRANSIT: "Kargoda",
      COMPLETED: "Tamamlandı",
      REJECTED: "Reddedildi",
    };
    return statusMap[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Müşteri hizmetleri özeti</p>
      </div>

      {/* KPI Cards - Sadece 4 önemli metrik */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bekleyen Mail
            </CardTitle>
            <Mail className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-12 animate-pulse rounded bg-muted" />
            ) : (
              <div className="text-3xl font-bold">
                {stats.pendingMails}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bekleyen İade
            </CardTitle>
            <Undo2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-12 animate-pulse rounded bg-muted" />
            ) : (
              <div className="text-3xl font-bold">
                {stats.pendingReturns}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bugün Çözülen
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-12 animate-pulse rounded bg-muted" />
            ) : (
              <div className="text-3xl font-bold">
                {stats.todayResolved}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bu Hafta
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-12 animate-pulse rounded bg-muted" />
            ) : (
              <div className="text-3xl font-bold">
                {stats.weeklyTotal}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* İki Kolon: Dikkat Gerektiren + Son Aktivite */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dikkat Gerektiren */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              Dikkat Gerektiren
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                <div className="h-16 animate-pulse rounded bg-muted" />
                <div className="h-16 animate-pulse rounded bg-muted" />
              </div>
            ) : (
              <>
                {stats.pendingMails === 0 && stats.pendingReturns === 0 ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <CheckCircle2 className="mr-2 h-5 w-5 text-green-500" />
                    Tüm işler tamamlandı
                  </div>
                ) : (
                  <>
                    {stats.oldestPendingMail && stats.oldestPendingMail.hours > 24 && (
                      <Link href={`/dashboard/mails`}>
                        <div className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 p-3 transition-colors hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-950 dark:hover:bg-orange-900">
                          <div className="flex items-center gap-3">
                            <Clock className="h-5 w-5 text-orange-500" />
                            <div>
                              <p className="text-sm font-medium">
                                {stats.oldestPendingMail.hours} saattir yanıtsız mail
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {stats.oldestPendingMail.from}
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                    )}

                    {stats.pendingMails > 0 && (
                      <Link href="/dashboard/mails">
                        <div className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent">
                          <div className="flex items-center gap-3">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">
                                {stats.pendingMails} mail yanıt bekliyor
                              </p>
                              <p className="text-xs text-muted-foreground">
                                E-postalara git
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                    )}

                    {stats.pendingReturns > 0 && (
                      <Link href="/dashboard/returns?status=PENDING_APPROVAL">
                        <div className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent">
                          <div className="flex items-center gap-3">
                            <Undo2 className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">
                                {stats.pendingReturns} iade onay bekliyor
                              </p>
                              <p className="text-xs text-muted-foreground">
                                İadelere git
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                    )}
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Son Aktiviteler */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Son Aktiviteler</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : stats.recentActivity.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                Henüz aktivite yok
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentActivity.map((activity) => (
                  <div
                    key={`${activity.type}-${activity.id}`}
                    className="flex items-center gap-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      {activity.type === "mail" ? (
                        <Mail className="h-4 w-4" />
                      ) : (
                        <Undo2 className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {activity.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.description}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {activity.time}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
