"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Mail,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
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
      const [mailsRes, returnsRes] = await Promise.all([
        fetch("/api/mails?limit=100"),
        fetch("/api/returns?status=all&limit=100&source=db"),
      ]);

      const mailsData = await mailsRes.json();
      const returnsData = await returnsRes.json();

      const mails = mailsData.mails || [];
      const returns = returnsData.returns || [];

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 7);

      const pendingMails = mails.filter((m: any) => !m.isReplied);
      const pendingReturns = returns.filter(
        (r: any) => r.status === "REQUESTED" || r.status === "PENDING_APPROVAL"
      );

      const todayResolved = mails.filter((m: any) => {
        if (!m.isReplied) return false;
        const repliedAt = new Date(m.updatedAt || m.createdAt);
        return repliedAt >= todayStart;
      }).length;

      const weeklyMails = mails.filter((m: any) => new Date(m.createdAt) >= weekStart).length;
      const weeklyReturns = returns.filter((r: any) => new Date(r.createdAt) >= weekStart).length;

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

      const recentActivity: DashboardStats["recentActivity"] = [];

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

  const kpiCards = [
    { title: "Bekleyen Mail", value: stats.pendingMails, icon: Mail, color: "text-orange-600", bg: "bg-orange-50" },
    { title: "Bekleyen İade", value: stats.pendingReturns, icon: RotateCcw, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Bugün Çözülen", value: stats.todayResolved, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
    { title: "Bu Hafta", value: stats.weeklyTotal, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Müşteri hizmetleri özeti</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.title}</p>
                  {loading ? (
                    <div className="h-8 w-12 bg-muted animate-pulse rounded mt-1" />
                  ) : (
                    <p className="text-2xl font-semibold mt-1">{kpi.value}</p>
                  )}
                </div>
                <div className={cn("p-2.5 rounded-lg", kpi.bg)}>
                  <kpi.icon className={cn("h-5 w-5", kpi.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Attention Required */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              Dikkat Gerektiren
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                <div className="h-14 bg-muted animate-pulse rounded-lg" />
                <div className="h-14 bg-muted animate-pulse rounded-lg" />
              </div>
            ) : stats.pendingMails === 0 && stats.pendingReturns === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
                <p className="font-medium">Tüm işler tamamlandı</p>
                <p className="text-sm text-muted-foreground">Bekleyen iş yok</p>
              </div>
            ) : (
              <>
                {stats.oldestPendingMail && stats.oldestPendingMail.hours > 24 && (
                  <Link href="/dashboard/mails">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors group">
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-orange-600" />
                        <div>
                          <p className="text-sm font-medium">{stats.oldestPendingMail.hours} saattir yanıtsız</p>
                          <p className="text-xs text-muted-foreground">{stats.oldestPendingMail.from}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-orange-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                )}

                {stats.pendingMails > 0 && (
                  <Link href="/dashboard/mails">
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{stats.pendingMails} mail yanıt bekliyor</p>
                          <p className="text-xs text-muted-foreground">E-postalara git</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                )}

                {stats.pendingReturns > 0 && (
                  <Link href="/dashboard/returns">
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group">
                      <div className="flex items-center gap-3">
                        <RotateCcw className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{stats.pendingReturns} iade onay bekliyor</p>
                          <p className="text-xs text-muted-foreground">İadelere git</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Son Aktiviteler</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
                    <div className="flex-1">
                      <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-1/2 bg-muted animate-pulse rounded mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            ) : stats.recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Henüz aktivite yok
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentActivity.map((activity) => (
                  <div key={`${activity.type}-${activity.id}`} className="flex items-center gap-3">
                    <div className={cn(
                      "h-9 w-9 rounded-full flex items-center justify-center",
                      activity.type === "mail" ? "bg-orange-50" : "bg-blue-50"
                    )}>
                      {activity.type === "mail" ? (
                        <Mail className="h-4 w-4 text-orange-600" />
                      ) : (
                        <RotateCcw className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.description}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
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
