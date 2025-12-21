"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  User,
  Brain,
  Search,
  Filter,
  PlayCircle,
  FileText,
  Download,
  Loader2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Mock Data
const mockCalls = [
  {
    id: "1",
    direction: "INBOUND" as const,
    phoneNumber: "+90 532 123 45 67",
    customerName: "Ayşe Yılmaz",
    duration: 245, // seconds
    status: "COMPLETED" as const,
    isAiHandled: true,
    aiSummary: "Müşteri #1234 nolu siparişinin nerede olduğunu sordu. Kargo takip numarası verildi, 2 gün içinde teslim edilecek. Müşteri memnun kaldı.",
    aiSentiment: "POSITIVE" as const,
    transcriptText: "Müşteri: Merhaba, siparişim nerede?\nAI Asistan: Tabii, sipariş numaranızı alabilir miyim?\nMüşteri: 1234\nAI Asistan: Teşekkür ederim. Siparişiniz kargoya verildi, takip numarası: TK123456789. 2 gün içinde elinizde olacak.\nMüşteri: Harika, teşekkür ederim!",
    callStartedAt: "2025-01-19T10:30:00",
    orderNumber: "#1234",
    matchedWithOrder: true,
    matchConfidence: 0.95
  },
  {
    id: "2",
    direction: "OUTBOUND" as const,
    phoneNumber: "+90 555 987 65 43",
    customerName: "Mehmet Kaya",
    duration: 180,
    status: "COMPLETED" as const,
    isAiHandled: false,
    aiSummary: "Sipariş teslimat hatırlatması yapıldı. Müşteri evde olacağını teyit etti.",
    aiSentiment: "NEUTRAL" as const,
    callStartedAt: "2025-01-19T09:15:00",
    orderNumber: "#1235",
    matchedWithOrder: true,
    matchConfidence: 1.0
  },
  {
    id: "3",
    direction: "INBOUND" as const,
    phoneNumber: "+90 542 876 54 32",
    customerName: "Fatma Demir",
    duration: 420,
    status: "COMPLETED" as const,
    isAiHandled: true,
    aiSummary: "Müşteri ürünle ilgili sorun bildirdi. İade süreci başlatıldı. Kargo etiketi email ile gönderildi.",
    aiSentiment: "NEGATIVE" as const,
    transcriptText: "Müşteri: Aldığım ürün hasarlı geldi.\nAI Asistan: Çok özür dilerim. İade işleminizi hemen başlatıyorum. Email adresinize kargo etiketi göndereceğim.\nMüşteri: Tamam, teşekkürler.",
    callStartedAt: "2025-01-19T08:45:00",
    orderNumber: "#1236",
    matchedWithOrder: true,
    matchConfidence: 0.98
  },
  {
    id: "4",
    direction: "INBOUND" as const,
    phoneNumber: "+90 533 765 43 21",
    customerName: "Ali Özkan",
    duration: 95,
    status: "COMPLETED" as const,
    isAiHandled: true,
    aiSummary: "Müşteri sadece teşekkür etmek için aradı. Ürünü çok beğenmiş.",
    aiSentiment: "POSITIVE" as const,
    callStartedAt: "2025-01-18T16:20:00",
    orderNumber: "#1220",
    matchedWithOrder: true,
    matchConfidence: 0.92
  },
  {
    id: "5",
    direction: "INBOUND" as const,
    phoneNumber: "+90 544 654 32 10",
    customerName: "Zeynep Arslan",
    duration: 310,
    status: "COMPLETED" as const,
    isAiHandled: false,
    aiSummary: "Fatura talebi - Email olarak gönderildi.",
    aiSentiment: "NEUTRAL" as const,
    callStartedAt: "2025-01-18T14:10:00",
    orderNumber: "#1221",
    matchedWithOrder: true,
    matchConfidence: 0.88
  },
  {
    id: "6",
    direction: "INBOUND" as const,
    phoneNumber: "+90 532 543 21 09",
    customerName: "Can Yıldız",
    duration: 0,
    status: "MISSED" as const,
    isAiHandled: false,
    callStartedAt: "2025-01-18T11:30:00",
    matchedWithOrder: false
  }
];

export default function CallsPage() {
  const [selectedCall, setSelectedCall] = useState<typeof mockCalls[0] | null>(null);
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncVerimorCalls = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/verimor/sync-calls?days=30", {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Hata: ${error.error}`);
        return;
      }

      const result = await response.json();
      alert(`✅ ${result.stats.new} yeni çağrı eklendi, ${result.stats.updated} çağrı güncellendi!`);

      // Sayfayı yenile
      window.location.reload();
    } catch (error) {
      console.error("Sync error:", error);
      alert("Çağrılar senkronize edilemedi");
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredCalls = mockCalls.filter(call => {
    const matchesDirection = directionFilter === "all" || call.direction === directionFilter;
    const matchesSearch =
      call.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (call.customerName && call.customerName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesDirection && matchesSearch;
  });

  const stats = {
    total: mockCalls.length,
    inbound: mockCalls.filter(c => c.direction === "INBOUND").length,
    outbound: mockCalls.filter(c => c.direction === "OUTBOUND").length,
    aiHandled: mockCalls.filter(c => c.isAiHandled).length,
    avgDuration: Math.round(mockCalls.filter(c => c.duration > 0).reduce((sum, c) => sum + c.duration, 0) / mockCalls.filter(c => c.duration > 0).length)
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case "POSITIVE":
        return <Badge className="bg-green-100 text-green-800 border-green-200">😊 Olumlu</Badge>;
      case "NEGATIVE":
        return <Badge className="bg-red-100 text-red-800 border-red-200">😟 Olumsuz</Badge>;
      case "NEUTRAL":
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">😐 Nötr</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge variant="outline" className="bg-green-50 border-green-200">✓ Tamamlandı</Badge>;
      case "MISSED":
        return <Badge variant="outline" className="bg-red-50 border-red-200">✗ Cevapsız</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Çağrılar</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSyncVerimorCalls}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Çekiliyor...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Verimor'dan Çek
                </>
              )}
            </Button>
            <Button>
              <PhoneOutgoing className="h-4 w-4 mr-2" />
              Yeni Çağrı
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Çağrı</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gelen</CardTitle>
              <PhoneIncoming className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inbound}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Giden</CardTitle>
              <PhoneOutgoing className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.outbound}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI İşledi</CardTitle>
              <Brain className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.aiHandled}</div>
              <p className="text-xs text-muted-foreground">%{Math.round(stats.aiHandled / stats.total * 100)} otomasyon</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ort. Süre</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(stats.avgDuration)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Çağrı Geçmişi</CardTitle>
            <CardDescription>Tüm telefon görüşmeleri ve AI asistan kayıtları</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Telefon numarası veya müşteri ara..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <Select value={directionFilter} onValueChange={setDirectionFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Çağrılar</SelectItem>
                  <SelectItem value="INBOUND">Gelen</SelectItem>
                  <SelectItem value="OUTBOUND">Giden</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Call List */}
            <div className="space-y-4">
              {filteredCalls.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedCall(call)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-2 rounded-full ${call.direction === "INBOUND" ? "bg-blue-100" : "bg-green-100"}`}>
                      {call.direction === "INBOUND" ? (
                        <PhoneIncoming className="h-5 w-5 text-blue-600" />
                      ) : (
                        <PhoneOutgoing className="h-5 w-5 text-green-600" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{call.customerName || "Bilinmeyen"}</p>
                        {call.isAiHandled && (
                          <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
                            <Brain className="h-3 w-3 mr-1" />
                            AI
                          </Badge>
                        )}
                        {call.matchedWithOrder && (
                          <span className="text-sm text-muted-foreground">{call.orderNumber}</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{call.phoneNumber}</p>
                      {call.aiSummary && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{call.aiSummary}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {call.aiSentiment && getSentimentBadge(call.aiSentiment)}
                    {getStatusBadge(call.status)}
                    {call.duration > 0 && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDuration(call.duration)}
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground min-w-[60px] text-right">
                      {new Date(call.callStartedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call Detail Dialog */}
      <Dialog open={!!selectedCall} onOpenChange={() => setSelectedCall(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCall?.direction === "INBOUND" ? (
                <PhoneIncoming className="h-5 w-5 text-blue-600" />
              ) : (
                <PhoneOutgoing className="h-5 w-5 text-green-600" />
              )}
              {selectedCall?.customerName || "Bilinmeyen"}
            </DialogTitle>
            <DialogDescription>{selectedCall?.phoneNumber}</DialogDescription>
          </DialogHeader>

          {selectedCall && (
            <div className="space-y-4">
              {/* Call Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Durum</p>
                  {getStatusBadge(selectedCall.status)}
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Süre</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCall.duration > 0 ? formatDuration(selectedCall.duration) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Tarih/Saat</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedCall.callStartedAt).toLocaleString('tr-TR')}
                  </p>
                </div>
                {selectedCall.matchedWithOrder && (
                  <div>
                    <p className="text-sm font-medium mb-1">İlgili Sipariş</p>
                    <p className="text-sm text-blue-600 font-medium">{selectedCall.orderNumber}</p>
                  </div>
                )}
              </div>

              {/* AI Analysis */}
              {selectedCall.isAiHandled && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4 text-purple-600" />
                    <p className="font-medium text-purple-900">AI Analizi</p>
                  </div>
                  <p className="text-sm text-purple-800 mb-3">{selectedCall.aiSummary}</p>
                  {selectedCall.aiSentiment && (
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-purple-900">Duygu Analizi:</p>
                      {getSentimentBadge(selectedCall.aiSentiment)}
                    </div>
                  )}
                  {selectedCall.matchConfidence && (
                    <div className="mt-2">
                      <p className="text-xs text-purple-700">
                        Sipariş Eşleştirme Güveni: %{Math.round(selectedCall.matchConfidence * 100)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Transcript */}
              {selectedCall.transcriptText && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-gray-600" />
                    <p className="font-medium text-gray-900">Görüşme Kaydı</p>
                  </div>
                  <div className="text-sm text-gray-800 whitespace-pre-line">
                    {selectedCall.transcriptText}
                  </div>
                </div>
              )}

              {/* Audio Player (Placeholder) */}
              <div className="flex items-center justify-center p-4 border-2 border-dashed rounded-lg">
                <Button variant="outline" disabled>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Ses Kaydını Dinle (Yakında)
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
