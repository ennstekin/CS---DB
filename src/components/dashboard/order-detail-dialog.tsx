"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Truck, MapPin, CreditCard, Calendar } from "lucide-react";

interface OrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: string;
}

// Mock sipariş detayları
const mockOrderDetails: Record<string, any> = {
  "#1234": {
    orderNumber: "#1234",
    status: "SHIPPED",
    customer: {
      name: "Ahmet Yılmaz",
      email: "ahmet.yilmaz@gmail.com",
      phone: "0532 123 45 67",
    },
    items: [
      {
        name: "Erkek Klasik Gömlek",
        variant: "Mavi - L",
        quantity: 2,
        price: 299.90,
      },
      {
        name: "Pantolon",
        variant: "Siyah - 32",
        quantity: 1,
        price: 399.90,
      },
    ],
    shippingAddress: {
      fullName: "Ahmet Yılmaz",
      address: "Atatürk Cad. No: 45 Daire: 8",
      city: "Kadıköy / İstanbul",
      phone: "0532 123 45 67",
    },
    payment: {
      method: "Kredi Kartı",
      total: 999.70,
    },
    tracking: {
      company: "Aras Kargo",
      trackingNumber: "KRG123456789",
      status: "Dağıtımda",
      estimatedDelivery: "Yarın, 14:00-18:00",
    },
    orderDate: "12 Ocak 2025, 14:30",
  },
  "#1189": {
    orderNumber: "#1189",
    status: "PROCESSING",
    customer: {
      name: "Ayşe Öztürk",
      email: "ayse.ozturk@gmail.com",
      phone: "0545 987 65 43",
    },
    items: [
      {
        name: "Kadın Spor Ayakkabı",
        variant: "Siyah - 38",
        quantity: 1,
        price: 599.90,
      },
    ],
    shippingAddress: {
      fullName: "Ayşe Öztürk",
      address: "Bağdat Cad. No: 123 Kat: 3",
      city: "Maltepe / İstanbul",
      phone: "0545 987 65 43",
    },
    payment: {
      method: "Havale/EFT",
      total: 599.90,
    },
    tracking: {
      company: "Yurtiçi Kargo",
      trackingNumber: "YRT987654321",
      status: "Hazırlanıyor",
      estimatedDelivery: "2-3 iş günü",
    },
    orderDate: "14 Ocak 2025, 10:15",
  },
  "#1198": {
    orderNumber: "#1198",
    status: "DELIVERED",
    customer: {
      name: "Elif Demir",
      email: "elif.demir@hotmail.com",
      phone: "0533 456 78 90",
    },
    items: [
      {
        name: "Mavi Elbise",
        variant: "M",
        quantity: 1,
        price: 449.90,
      },
    ],
    shippingAddress: {
      fullName: "Elif Demir",
      address: "Cumhuriyet Mah. 15. Sok. No: 7",
      city: "Beşiktaş / İstanbul",
      phone: "0533 456 78 90",
    },
    payment: {
      method: "Kredi Kartı",
      total: 449.90,
    },
    tracking: {
      company: "MNG Kargo",
      trackingNumber: "MNG456789123",
      status: "Teslim Edildi",
      estimatedDelivery: "Teslim edildi (13 Ocak)",
    },
    orderDate: "10 Ocak 2025, 16:20",
  },
};

const statusColors: Record<string, string> = {
  PROCESSING: "bg-yellow-500",
  SHIPPED: "bg-blue-500",
  DELIVERED: "bg-green-500",
  CANCELLED: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  PROCESSING: "Hazırlanıyor",
  SHIPPED: "Kargoda",
  DELIVERED: "Teslim Edildi",
  CANCELLED: "İptal Edildi",
};

export function OrderDetailDialog({ open, onOpenChange, orderNumber }: OrderDetailDialogProps) {
  const order = mockOrderDetails[orderNumber];

  if (!order) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sipariş Bulunamadı</DialogTitle>
            <DialogDescription>
              {orderNumber} numaralı sipariş bulunamadı.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Sipariş Detayı: {order.orderNumber}
          </DialogTitle>
          <DialogDescription>
            Sipariş Tarihi: {order.orderDate}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Durum */}
          <div className="flex items-center gap-2">
            <Badge className={statusColors[order.status]}>
              {statusLabels[order.status]}
            </Badge>
          </div>

          {/* Müşteri Bilgileri */}
          <Card>
            <CardContent className="pt-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Müşteri Bilgileri
              </h3>
              <div className="space-y-1 text-sm">
                <p><strong>Ad Soyad:</strong> {order.customer.name}</p>
                <p><strong>E-posta:</strong> {order.customer.email}</p>
                <p><strong>Telefon:</strong> {order.customer.phone}</p>
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
                {order.items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-start border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.variant}</p>
                      <p className="text-xs text-muted-foreground">Adet: {item.quantity}</p>
                    </div>
                    <p className="font-semibold">{item.price.toFixed(2)} ₺</p>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 font-bold">
                  <span>Toplam:</span>
                  <span>{order.payment.total.toFixed(2)} ₺</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Teslimat Adresi */}
          <Card>
            <CardContent className="pt-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Teslimat Adresi
              </h3>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{order.shippingAddress.fullName}</p>
                <p>{order.shippingAddress.address}</p>
                <p>{order.shippingAddress.city}</p>
                <p>{order.shippingAddress.phone}</p>
              </div>
            </CardContent>
          </Card>

          {/* Kargo Takip */}
          <Card>
            <CardContent className="pt-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Kargo Bilgileri
              </h3>
              <div className="space-y-1 text-sm">
                <p><strong>Kargo Şirketi:</strong> {order.tracking.company}</p>
                <p><strong>Takip No:</strong> {order.tracking.trackingNumber}</p>
                <p><strong>Durum:</strong> {order.tracking.status}</p>
                <p><strong>Tahmini Teslimat:</strong> {order.tracking.estimatedDelivery}</p>
              </div>
            </CardContent>
          </Card>

          {/* Ödeme */}
          <Card>
            <CardContent className="pt-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Ödeme Bilgileri
              </h3>
              <div className="space-y-1 text-sm">
                <p><strong>Ödeme Yöntemi:</strong> {order.payment.method}</p>
                <p><strong>Tutar:</strong> {order.payment.total.toFixed(2)} ₺</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
