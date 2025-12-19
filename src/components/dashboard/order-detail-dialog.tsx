"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Truck, MapPin, CreditCard, Loader2, AlertCircle } from "lucide-react";

interface OrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  customerEmail: string;
  customerName: string;
  totalPrice: number;
  currency: string;
  createdAt: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  shippingInfo?: {
    trackingNumber: string;
    trackingUrl?: string;
    carrier: string;
    status: string;
  };
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  processing: "bg-yellow-500",
  shipped: "bg-blue-500",
  delivered: "bg-green-500",
  cancelled: "bg-red-500",
  completed: "bg-green-500",
};

const statusLabels: Record<string, string> = {
  pending: "Beklemede",
  processing: "Hazırlanıyor",
  shipped: "Kargoda",
  delivered: "Teslim Edildi",
  cancelled: "İptal Edildi",
  completed: "Tamamlandı",
};

export function OrderDetailDialog({ open, onOpenChange, orderNumber }: OrderDetailDialogProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && orderNumber) {
      fetchOrderDetails();
    }
  }, [open, orderNumber]);

  const fetchOrderDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 Fetching order details for:', orderNumber);

      const response = await fetch(`/api/orders/${orderNumber}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sipariş detayları alınamadı');
      }

      const data = await response.json();
      setOrder(data);
      console.log('✅ Order details received:', data);

    } catch (err) {
      console.error('❌ Error fetching order:', err);
      setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Sipariş Detayı: #{orderNumber}
          </DialogTitle>
          <DialogDescription>
            İkas sisteminden sipariş bilgileri getiriliyor...
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-muted-foreground">Sipariş detayları yükleniyor...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div className="text-center">
              <p className="font-semibold text-red-600">Hata</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        )}

        {order && !isLoading && !error && (
          <div className="space-y-4">
            {/* Durum */}
            <div className="flex items-center gap-2">
              <Badge className={statusColors[order.status?.toLowerCase()] || "bg-gray-500"}>
                {statusLabels[order.status?.toLowerCase()] || order.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {new Date(order.createdAt).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>

            {/* Müşteri Bilgileri */}
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Müşteri Bilgileri
                </h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Ad Soyad:</strong> {order.customerName}</p>
                  <p><strong>E-posta:</strong> {order.customerEmail}</p>
                </div>
              </CardContent>
            </Card>

            {/* Ürünler */}
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Sipariş Ürünleri
                </h3>
                <div className="space-y-3">
                  {order.items.map((item, index) => (
                    <div key={item.id} className="flex justify-between items-start border-b pb-2 last:border-0">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Adet: {item.quantity}</p>
                      </div>
                      <p className="font-semibold">{item.price ? item.price.toFixed(2) : '0.00'} {order.currency}</p>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 font-bold">
                    <span>Toplam:</span>
                    <span>{order.totalPrice.toFixed(2)} {order.currency}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Kargo Takip */}
            {order.shippingInfo && (
              <Card>
                <CardContent className="pt-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Kargo Bilgileri
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Kargo Şirketi:</strong> {order.shippingInfo.carrier || 'Belirleniyor'}</p>
                    <p><strong>Takip No:</strong> {order.shippingInfo.trackingNumber || 'Henüz atanmadı'}</p>
                    <p><strong>Durum:</strong> {order.shippingInfo.status || 'Hazırlanıyor'}</p>
                    {order.shippingInfo.trackingUrl && (
                      <a
                        href={order.shippingInfo.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline block mt-2"
                      >
                        Kargo Takip Linki →
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ödeme */}
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Ödeme Bilgileri
                </h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Tutar:</strong> {order.totalPrice.toFixed(2)} {order.currency}</p>
                  <p><strong>Sipariş ID:</strong> {order.id}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
