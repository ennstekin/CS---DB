"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

interface KpiData {
  totalMails: number;
  pendingMails: number;
  resolvedMails: number;
}

export function KpiCards() {
  const [kpiData, setKpiData] = useState<KpiData>({
    totalMails: 0,
    pendingMails: 0,
    resolvedMails: 0,
  });

  useEffect(() => {
    fetch("/api/dashboard/kpi")
      .then((res) => res.json())
      .then((data) => setKpiData(data))
      .catch((err) => console.error("Failed to load KPI data:", err));
  }, []);

  const aiAccuracy = kpiData.totalMails > 0
    ? Math.round((kpiData.resolvedMails / kpiData.totalMails) * 100)
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Toplam Mail</CardTitle>
          <Mail className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpiData.totalMails}</div>
          <p className="text-xs text-muted-foreground">
            Tüm mailler
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Bekleyen</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
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
          <CardTitle className="text-sm font-medium">Çözülen</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpiData.resolvedMails}</div>
          <p className="text-xs text-muted-foreground">
            Tamamlandı
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">AI Başarı</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{aiAccuracy}%</div>
          <p className="text-xs text-muted-foreground">
            Çözülme oranı
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
