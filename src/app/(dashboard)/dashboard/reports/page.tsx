"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Package,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
  Loader2,
  RefreshCw,
  Calendar,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportData {
  range: string;
  summary: {
    totalMails: number;
    newMailsInRange: number;
    resolvedMailsInRange: number;
    totalReturns: number;
    newReturnsInRange: number;
    completedReturnsInRange: number;
    avgResponseTimeHours: number;
    resolutionRate: number;
    slaViolations: number;
  };
  distributions: {
    mailsByStatus: Record<string, number>;
    mailsByCategory: Record<string, number>;
    returnsByStatus: Record<string, number>;
    returnsByReason: Record<string, number>;
  };
  chartData: Array<{
    date: string;
    mails: number;
    mailsResolved: number;
    returns: number;
    returnsCompleted: number;
  }>;
}

const statusLabels: Record<string, string> = {
  NEW: "Yeni",
  OPEN: "Acik",
  PENDING: "Beklemede",
  RESOLVED: "Cozuldu",
  CLOSED: "Kapandi",
  REQUESTED: "Talep Edildi",
  PENDING_APPROVAL: "Onay Bekliyor",
  APPROVED: "Onaylandi",
  IN_TRANSIT: "Yolda",
  RECEIVED: "Alindi",
  COMPLETED: "Tamamlandi",
  REJECTED: "Reddedildi",
  CANCELLED: "Iptal",
};

const categoryLabels: Record<string, string> = {
  ORDER_INQUIRY: "Siparis Sorgusu",
  RETURN_REQUEST: "Iade Talebi",
  POSITIVE_FEEDBACK: "Olumlu Geri Bildirim",
  WRONG_ITEM: "Yanlis Urun",
  INVOICE_REQUEST: "Fatura Talebi",
  TRACKING_INQUIRY: "Kargo Takibi",
  DISCOUNT_ISSUE: "Indirim Sorunu",
  SIZE_EXCHANGE: "Beden Degisimi",
  OTHER: "Diger",
};

const reasonLabels: Record<string, string> = {
  DEFECTIVE: "Kusurlu Urun",
  WRONG_ITEM: "Yanlis Urun",
  NOT_AS_DESCRIBED: "Tarifle Uyusmuyor",
  SIZE_ISSUE: "Beden Sorunu",
  CHANGED_MIND: "Fikir Degisikligi",
  OTHER: "Diger",
};

const statusColors: Record<string, string> = {
  NEW: "bg-blue-500",
  OPEN: "bg-amber-500",
  PENDING: "bg-orange-500",
  RESOLVED: "bg-green-500",
  CLOSED: "bg-gray-500",
  REQUESTED: "bg-blue-500",
  PENDING_APPROVAL: "bg-amber-500",
  APPROVED: "bg-green-500",
  IN_TRANSIT: "bg-purple-500",
  RECEIVED: "bg-cyan-500",
  COMPLETED: "bg-green-600",
  REJECTED: "bg-red-500",
  CANCELLED: "bg-gray-400",
};

const categoryColors: Record<string, string> = {
  ORDER_INQUIRY: "bg-blue-500",
  RETURN_REQUEST: "bg-orange-500",
  POSITIVE_FEEDBACK: "bg-green-500",
  WRONG_ITEM: "bg-red-500",
  INVOICE_REQUEST: "bg-purple-500",
  TRACKING_INQUIRY: "bg-cyan-500",
  DISCOUNT_ISSUE: "bg-yellow-500",
  SIZE_EXCHANGE: "bg-pink-500",
  OTHER: "bg-gray-500",
};

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState("7d");

  useEffect(() => {
    loadReportData();
  }, [selectedRange]);

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/dashboard/reports?range=${selectedRange}`);
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      }
    } catch (error) {
      console.error("Error loading report data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatResponseTime = (hours: number): string => {
    if (hours < 1) return `${Math.round(hours * 60)} dk`;
    if (hours < 24) return `${hours.toFixed(1)} saat`;
    return `${Math.round(hours / 24)} gun`;
  };

  const getRangeLabel = (range: string): string => {
    switch (range) {
      case "7d": return "Son 7 Gun";
      case "30d": return "Son 30 Gun";
      case "90d": return "Son 90 Gun";
      default: return range;
    }
  };

  // Simple bar chart component
  const SimpleBarChart = ({ data, maxValue }: { data: Array<{ label: string; value: number; color: string }>; maxValue: number }) => (
    <div className="space-y-2">
      {data.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="w-24 text-xs text-muted-foreground truncate" title={item.label}>
            {item.label}
          </div>
          <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", item.color)}
              style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
            />
          </div>
          <div className="w-10 text-xs font-medium text-right">{item.value}</div>
        </div>
      ))}
    </div>
  );

  // Simple line chart (ASCII-style for simplicity)
  const SimpleTrendChart = ({ data }: { data: ReportData["chartData"] }) => {
    const maxMails = Math.max(...data.map(d => d.mails), 1);
    const maxReturns = Math.max(...data.map(d => d.returns), 1);
    const chartHeight = 120;

    return (
      <div className="relative">
        <div className="flex items-end gap-1 h-[120px]">
          {data.slice(-14).map((day, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full flex flex-col-reverse gap-0.5">
                <div
                  className="w-full bg-blue-500 rounded-t"
                  style={{ height: `${(day.mails / maxMails) * 80}px` }}
                  title={`Mailler: ${day.mails}`}
                />
              </div>
              <div
                className="w-full bg-orange-500 rounded-t"
                style={{ height: `${(day.returns / maxReturns) * 40}px` }}
                title={`Iadeler: ${day.returns}`}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          {data.slice(-14).filter((_, i) => i % 3 === 0).map((day, index) => (
            <span key={index}>{day.date.split("-").slice(1).join("/")}</span>
          ))}
        </div>
        <div className="flex gap-4 mt-3 justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-blue-500 rounded" />
            <span className="text-xs text-muted-foreground">Mailler</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-orange-500 rounded" />
            <span className="text-xs text-muted-foreground">Iadeler</span>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading && !reportData) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const summary = reportData?.summary || {
    totalMails: 0,
    newMailsInRange: 0,
    resolvedMailsInRange: 0,
    totalReturns: 0,
    newReturnsInRange: 0,
    completedReturnsInRange: 0,
    avgResponseTimeHours: 0,
    resolutionRate: 0,
    slaViolations: 0,
  };

  const distributions = reportData?.distributions || {
    mailsByStatus: {},
    mailsByCategory: {},
    returnsByStatus: {},
    returnsByReason: {},
  };

  const chartData = reportData?.chartData || [];

  // Prepare chart data
  const mailStatusData = Object.entries(distributions.mailsByStatus).map(([status, count]) => ({
    label: statusLabels[status] || status,
    value: count,
    color: statusColors[status] || "bg-gray-500",
  })).sort((a, b) => b.value - a.value);

  const mailCategoryData = Object.entries(distributions.mailsByCategory).map(([category, count]) => ({
    label: categoryLabels[category] || category,
    value: count,
    color: categoryColors[category] || "bg-gray-500",
  })).sort((a, b) => b.value - a.value);

  const returnStatusData = Object.entries(distributions.returnsByStatus).map(([status, count]) => ({
    label: statusLabels[status] || status,
    value: count,
    color: statusColors[status] || "bg-gray-500",
  })).sort((a, b) => b.value - a.value);

  const returnReasonData = Object.entries(distributions.returnsByReason).map(([reason, count]) => ({
    label: reasonLabels[reason] || reason,
    value: count,
    color: "bg-purple-500",
  })).sort((a, b) => b.value - a.value);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Raporlar</h1>
          <p className="text-muted-foreground">Musteri hizmetleri performans analizi</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedRange} onValueChange={setSelectedRange}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Son 7 Gun</SelectItem>
              <SelectItem value="30d">Son 30 Gun</SelectItem>
              <SelectItem value="90d">Son 90 Gun</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadReportData} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gelen Mail</CardTitle>
            <Mail className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.newMailsInRange}</div>
            <p className="text-xs text-muted-foreground">
              {getRangeLabel(selectedRange)} icinde
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cozulen Mail</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.resolvedMailsInRange}</div>
            <div className="flex items-center gap-1">
              <Badge variant={summary.resolutionRate >= 80 ? "default" : summary.resolutionRate >= 50 ? "secondary" : "destructive"}>
                %{summary.resolutionRate}
              </Badge>
              <span className="text-xs text-muted-foreground">cozum orani</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Iade Talebi</CardTitle>
            <Package className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.newReturnsInRange}</div>
            <p className="text-xs text-muted-foreground">
              {summary.completedReturnsInRange} tamamlandi
            </p>
          </CardContent>
        </Card>

        <Card className={cn(summary.slaViolations > 0 && "border-red-200 bg-red-50/50")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA Ihlali</CardTitle>
            <AlertTriangle className={cn("h-4 w-4", summary.slaViolations > 0 ? "text-red-500" : "text-muted-foreground")} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", summary.slaViolations > 0 && "text-red-600")}>
              {summary.slaViolations}
            </div>
            <p className="text-xs text-muted-foreground">
              24+ saat bekleyen
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ort. Yanit Suresi</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatResponseTime(summary.avgResponseTimeHours)}</div>
            <p className="text-xs text-muted-foreground">
              {getRangeLabel(selectedRange)} ortalamasi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Mail</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalMails}</div>
            <p className="text-xs text-muted-foreground">
              Tum zamanlar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Iade</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalReturns}</div>
            <p className="text-xs text-muted-foreground">
              Tum zamanlar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Gunluk Trend</CardTitle>
          <CardDescription>Mail ve iade talebi sayilari</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <SimpleTrendChart data={chartData} />
          ) : (
            <div className="h-[160px] flex items-center justify-center text-muted-foreground">
              Veri bulunamadi
            </div>
          )}
        </CardContent>
      </Card>

      {/* Distribution Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Mail Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mail Durumu Dagilimi</CardTitle>
            <CardDescription>{getRangeLabel(selectedRange)}</CardDescription>
          </CardHeader>
          <CardContent>
            {mailStatusData.length > 0 ? (
              <SimpleBarChart
                data={mailStatusData}
                maxValue={Math.max(...mailStatusData.map(d => d.value))}
              />
            ) : (
              <div className="h-[120px] flex items-center justify-center text-muted-foreground">
                Veri bulunamadi
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mail Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mail Kategorisi Dagilimi</CardTitle>
            <CardDescription>{getRangeLabel(selectedRange)}</CardDescription>
          </CardHeader>
          <CardContent>
            {mailCategoryData.length > 0 ? (
              <SimpleBarChart
                data={mailCategoryData}
                maxValue={Math.max(...mailCategoryData.map(d => d.value))}
              />
            ) : (
              <div className="h-[120px] flex items-center justify-center text-muted-foreground">
                Veri bulunamadi
              </div>
            )}
          </CardContent>
        </Card>

        {/* Return Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Iade Durumu Dagilimi</CardTitle>
            <CardDescription>{getRangeLabel(selectedRange)}</CardDescription>
          </CardHeader>
          <CardContent>
            {returnStatusData.length > 0 ? (
              <SimpleBarChart
                data={returnStatusData}
                maxValue={Math.max(...returnStatusData.map(d => d.value))}
              />
            ) : (
              <div className="h-[120px] flex items-center justify-center text-muted-foreground">
                Veri bulunamadi
              </div>
            )}
          </CardContent>
        </Card>

        {/* Return Reason Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Iade Nedeni Dagilimi</CardTitle>
            <CardDescription>{getRangeLabel(selectedRange)}</CardDescription>
          </CardHeader>
          <CardContent>
            {returnReasonData.length > 0 ? (
              <SimpleBarChart
                data={returnReasonData}
                maxValue={Math.max(...returnReasonData.map(d => d.value))}
              />
            ) : (
              <div className="h-[120px] flex items-center justify-center text-muted-foreground">
                Veri bulunamadi
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
