"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Package, ShoppingBag, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderItem {
  id?: string;
  name: string;
  sku?: string;
  quantity: number;
  price: number;
  variant?: string;
  image?: string;
}

interface OrderData {
  orderNumber: string;
  email: string;
  orderId?: string;
  customerName?: string;
  totalPrice?: number;
  currency?: string;
  items: OrderItem[];
}

export default function SelectPage() {
  const router = useRouter();
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    const stored = sessionStorage.getItem("returnOrder");
    if (!stored) {
      router.push("/portal");
      return;
    }
    const data = JSON.parse(stored);
    setOrderData(data);

    // Eğer daha önce seçilmiş ürünler varsa, onları yükle
    if (data.selectedItems) {
      setSelectedItems(new Set(data.selectedItems));
    }
  }, [router]);

  const toggleItem = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    if (!orderData) return;
    if (selectedItems.size === orderData.items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(orderData.items.map((_, i) => i)));
    }
  };

  const handleContinue = () => {
    if (selectedItems.size === 0) return;

    // Seçilen ürünleri sessionStorage'a kaydet
    const selectedProducts = orderData?.items.filter((_, i) => selectedItems.has(i)) || [];
    const totalRefund = selectedProducts.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const updated = {
      ...orderData,
      selectedItems: Array.from(selectedItems),
      selectedProducts,
      refundAmount: totalRefund,
    };
    sessionStorage.setItem("returnOrder", JSON.stringify(updated));

    router.push("/portal/reason");
  };

  const handleBack = () => {
    router.push("/portal");
  };

  if (!orderData) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  const selectedProducts = orderData.items.filter((_, i) => selectedItems.has(i));
  const totalRefund = selectedProducts.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const currency = orderData.currency || "TRY";

  // Eğer sipariş boş veya items yoksa
  if (!orderData.items || orderData.items.length === 0) {
    return (
      <div className="min-h-screen bg-muted/30">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Geri
            </Button>
            <div>
              <h1 className="font-semibold">Ürün Seçimi</h1>
              <p className="text-xs text-muted-foreground">Sipariş: {orderData.orderNumber}</p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold mb-2">Ürün Bilgisi Bulunamadı</h2>
              <p className="text-muted-foreground mb-4">
                Bu siparişe ait ürün detayları yüklenemedi.
                Lütfen müşteri hizmetleri ile iletişime geçin.
              </p>
              <Button onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Geri Dön
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Geri
              </Button>
              <div>
                <h1 className="font-semibold">Ürün Seçimi</h1>
                <p className="text-xs text-muted-foreground">
                  Sipariş: {orderData.orderNumber}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Adım 2/5</p>
              <p className="text-sm font-medium">{selectedItems.size} ürün seçildi</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">✓</div>
            <div className="w-12 h-1 bg-primary"></div>
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">2</div>
            <div className="w-12 h-1 bg-muted"></div>
            <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold">3</div>
            <div className="w-12 h-1 bg-muted"></div>
            <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold">4</div>
            <div className="w-12 h-1 bg-muted"></div>
            <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold">5</div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left - Product List */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <ShoppingBag className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Hangi ürünleri iade etmek istiyorsunuz?</CardTitle>
                      <CardDescription className="text-sm">
                        İade etmek istediğiniz ürünleri seçin
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAll}
                  >
                    {selectedItems.size === orderData.items.length ? "Temizle" : "Tümünü Seç"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {orderData.items.map((item, index) => {
                  const isSelected = selectedItems.has(index);
                  return (
                    <div
                      key={index}
                      onClick={() => toggleItem(index)}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all",
                        isSelected
                          ? "bg-primary/5 border-primary ring-1 ring-primary"
                          : "hover:bg-muted/50 border-border"
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleItem(index)}
                        className="pointer-events-none"
                      />

                      {/* Product Image */}
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{item.name}</h3>
                        {item.variant && (
                          <p className="text-xs text-muted-foreground">{item.variant}</p>
                        )}
                        {item.sku && (
                          <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Adet: {item.quantity}
                        </p>
                      </div>

                      {/* Price */}
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold">
                          {(item.price * item.quantity).toLocaleString("tr-TR")} {currency}
                        </p>
                        {item.quantity > 1 && (
                          <p className="text-xs text-muted-foreground">
                            {item.price.toLocaleString("tr-TR")} {currency} / adet
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Right - Summary */}
          <div className="space-y-4">
            <Card className="sticky top-20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">İade Özeti</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedItems.size === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Henüz ürün seçilmedi
                  </p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {selectedProducts.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-muted-foreground truncate flex-1 mr-2">
                            {item.name} {item.quantity > 1 && `(x${item.quantity})`}
                          </span>
                          <span className="font-medium flex-shrink-0">
                            {(item.price * item.quantity).toLocaleString("tr-TR")} {currency}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-3">
                      <div className="flex justify-between">
                        <span className="font-medium">Tahmini İade Tutarı</span>
                        <span className="font-bold text-lg text-green-600">
                          {totalRefund.toLocaleString("tr-TR")} {currency}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        *İnceleme sonrası kesinleşecektir
                      </p>
                    </div>
                  </>
                )}

                <Button
                  className="w-full"
                  onClick={handleContinue}
                  disabled={selectedItems.size === 0}
                >
                  Devam Et
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <h4 className="font-medium text-sm mb-2">Bilgi</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Birden fazla ürün seçebilirsiniz</li>
                  <li>• İade tutarı inceleme sonrası kesinleşir</li>
                  <li>• Hasarlı ürünler için fotoğraf istenir</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
