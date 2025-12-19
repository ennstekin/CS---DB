"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  Truck,
  ArrowLeft,
  Calendar,
  DollarSign,
  FileText,
  Loader2,
} from "lucide-react";

interface ReturnData {
  id: string;
  return_number: string;
  status: string;
  reason: string;
  reason_detail?: string;
  total_refund_amount: number;
  refund_status: string;
  created_at: string;
  updated_at: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
  };
  order: {
    order_number: string;
  };
  timeline: Array<{
    id: string;
    event_type: string;
    description: string;
    created_at: string;
  }>;
  items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    refund_amount: number;
  }>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  REQUESTED: { label: "Talep Alındı", color: "bg-blue-100 text-blue-800", icon: Clock },
  PENDING_APPROVAL: { label: "Onay Bekliyor", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  APPROVED: { label: "Onaylandı", color: "bg-green-100 text-green-800", icon: CheckCircle },
  IN_TRANSIT: { label: "Kargoda", color: "bg-purple-100 text-purple-800", icon: Truck },
  RECEIVED: { label: "Teslim Alındı", color: "bg-indigo-100 text-indigo-800", icon: Package },
  COMPLETED: { label: "Tamamlandı", color: "bg-green-100 text-green-800", icon: CheckCircle },
  REJECTED: { label: "Reddedildi", color: "bg-red-100 text-red-800", icon: XCircle },
};

const REFUND_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Bekliyor", color: "bg-yellow-100 text-yellow-800" },
  PROCESSING: { label: "İşleniyor", color: "bg-blue-100 text-blue-800" },
  COMPLETED: { label: "Tamamlandı", color: "bg-green-100 text-green-800" },
  FAILED: { label: "Başarısız", color: "bg-red-100 text-red-800" },
};

export default function TrackPage() {
  const [returnNumber, setReturnNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [returnData, setReturnData] = useState<ReturnData | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setReturnData(null);

    if (!returnNumber.trim()) {
      setError("Lütfen iade numarasını girin");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/portal/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnNumber }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setReturnData(data.return);
      } else {
        setError(data.error || "İade talebi bulunamadı");
      }
    } catch (err) {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || { label: status, color: "bg-gray-100 text-gray-800", icon: Clock };
  };

  const getRefundStatusConfig = (status: string) => {
    return REFUND_STATUS_CONFIG[status] || { label: status, color: "bg-gray-100 text-gray-800" };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Search className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">İade Takip</h1>
          <p className="text-gray-600">İade numaranızla talebinizin durumunu sorgulayın</p>
        </div>

        {/* Search Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>İade Sorgula</CardTitle>
            <CardDescription>
              İade onay e-postanızda bulunan iade numarasını girin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTrack} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="returnNumber" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  İade Numarası
                </Label>
                <Input
                  id="returnNumber"
                  type="text"
                  placeholder="Örn: RET-115175-MJCLQJ7E"
                  value={returnNumber}
                  onChange={(e) => setReturnNumber(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sorgulanıyor...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Sorgula
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Return Details */}
        {returnData && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Status Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">#{returnData.return_number}</h2>
                  <Badge className={getStatusConfig(returnData.status).color}>
                    {getStatusConfig(returnData.status).label}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span>Sipariş: #{returnData.order?.order_number}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(returnData.created_at).toLocaleDateString("tr-TR")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>{returnData.total_refund_amount?.toLocaleString("tr-TR")} TL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">İade:</span>
                    <Badge className={getRefundStatusConfig(returnData.refund_status).color} variant="outline">
                      {getRefundStatusConfig(returnData.refund_status).label}
                    </Badge>
                  </div>
                </div>

                {returnData.reason && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      <strong>İade Nedeni:</strong> {returnData.reason}
                    </p>
                    {returnData.reason_detail && (
                      <p className="text-sm text-muted-foreground mt-1">{returnData.reason_detail}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            {returnData.timeline && returnData.timeline.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">İşlem Geçmişi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {returnData.timeline.map((event, index) => (
                      <div key={event.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${index === returnData.timeline.length - 1 ? 'bg-blue-500' : 'bg-gray-300'}`} />
                          {index < returnData.timeline.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-200 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="text-sm font-medium">{event.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(event.created_at).toLocaleString("tr-TR")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Items */}
            {returnData.items && returnData.items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">İade Ürünleri</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {returnData.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">Adet: {item.quantity}</p>
                        </div>
                        <p className="font-semibold">{item.refund_amount?.toLocaleString("tr-TR")} TL</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Links */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/portal">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Yeni İade Talebi
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
