"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, CheckCircle, Clock, TrendingUp, AlertTriangle, Package, Timer, CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface KpiData {
  totalMails: number;
  pendingMails: number;
  resolvedMails: number;
  pendingReturns: number;
  slaViolations: number;
  todayResolved: number;
  weekResolved: number;
  avgResponseTimeHours: number;
  resolutionRate: number;
}

export function KpiCards() {
  const [kpiData, setKpiData] = useState<KpiData>({
    totalMails: 0,
    pendingMails: 0,
    resolvedMails: 0,
    pendingReturns: 0,
    slaViolations: 0,
    todayResolved: 0,
    weekResolved: 0,
    avgResponseTimeHours: 0,
    resolutionRate: 0,
  });

  useEffect(() => {
    fetch("/api/dashboard/kpi")
      .then((res) => res.json())
      .then((data) => setKpiData(data))
      .catch((err) => console.error("Failed to load KPI data:", err));
  }, []);

  const formatResponseTime = (hours: number): string => {
    if (hours < 1) return `${Math.round(hours * 60)} dk`;
    if (hours < 24) return `${hours.toFixed(1)} saat`;
    return `${Math.round(hours / 24)} gün`;
  };

  return (
    <div className="space-y-4">
      {/* Primary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bekleyen Mail</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.pendingMails}</div>
            <p className="text-xs text-muted-foreground">
              Yanıt bekliyor
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bekleyen İade</CardTitle>
            <Package className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.pendingReturns}</div>
            <p className="text-xs text-muted-foreground">
              İşlem bekliyor
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bugün Çözülen</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.todayResolved}</div>
            <p className="text-xs text-muted-foreground">
              Bu hafta: {kpiData.weekResolved}
            </p>
          </CardContent>
        </Card>

        <Card className={cn(kpiData.slaViolations > 0 && "border-red-200 bg-red-50/50")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA İhlali</CardTitle>
            <AlertTriangle className={cn("h-4 w-4", kpiData.slaViolations > 0 ? "text-red-500" : "text-muted-foreground")} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", kpiData.slaViolations > 0 && "text-red-600")}>
              {kpiData.slaViolations}
            </div>
            <p className="text-xs text-muted-foreground">
              24+ saat bekleyen
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ort. Yanıt Süresi</CardTitle>
            <Timer className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatResponseTime(kpiData.avgResponseTimeHours)}</div>
            <p className="text-xs text-muted-foreground">
              Son 7 gün ortalaması
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Çözüm Oranı</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{kpiData.resolutionRate}%</div>
              <Badge variant={kpiData.resolutionRate >= 80 ? "default" : kpiData.resolutionRate >= 50 ? "secondary" : "destructive"} className="text-xs">
                {kpiData.resolutionRate >= 80 ? "İyi" : kpiData.resolutionRate >= 50 ? "Orta" : "Düşük"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {kpiData.resolvedMails} / {kpiData.totalMails} mail
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Mail</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.totalMails}</div>
            <p className="text-xs text-muted-foreground">
              Tüm zamanlar
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
