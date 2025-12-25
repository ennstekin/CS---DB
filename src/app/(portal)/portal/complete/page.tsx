"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Loader2, Package, Mail, Calendar, CreditCard, MapPin, ShoppingBag, ImageIcon, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface SelectedProduct {
  name: string;
  quantity: number;
  price: number;
  variant?: string;
  image?: string;
}

export default function CompletePage() {
  const router = useRouter();
  const [orderData, setOrderData] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [returnNumber, setReturnNumber] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("returnOrder");
    if (!stored) {
      router.push("/portal");
      return;
    }
    setOrderData(JSON.parse(stored));
  }, [router]);

  const handleSubmit = async () => {
    if (!orderData) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/portal/submit-return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: orderData.orderNumber,
          email: orderData.email,
          orderId: orderData.orderId,
          reason: orderData.reason,
          reasonDetail: orderData.reasonDetail,
          photos: orderData.photos || [],
          selectedProducts: orderData.selectedProducts || [],
          refundAmount: orderData.refundAmount,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setReturnNumber(data.returnNumber);
        setSubmitted(true);
        sessionStorage.removeItem("returnOrder");
        toast.success("İade talebiniz başarıyla oluşturuldu!");
      } else {
        setError(data.error || "İade talebi oluşturulamadı. Lütfen tekrar deneyin.");
        toast.error(data.error || "İade talebi oluşturulamadı");
      }
    } catch (err) {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
      toast.error("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push("/portal/upload");
  };

  if (!orderData) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  const reasonLabels: Record<string, string> = {
    damaged_product: "Hasarlı Ürün",
    wrong_size: "Yanlış Beden",
    changed_mind: "Fikir Değiştirdim",
    defective: "Arızalı Ürün",
    not_as_described: "Açıklamaya Uymuyor",
    wrong_product: "Yanlış Ürün",
    quality_issue: "Kalite Sorunu",
    other: "Diğer",
  };

  const currency = orderData.currency || "TRY";
  const selectedProducts: SelectedProduct[] = orderData.selectedProducts || [];
  const refundAmount = orderData.refundAmount || 0;

  if (submitted) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardContent className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">İade Talebiniz Alındı!</h2>
            <p className="text-muted-foreground mb-6">
              Talebiniz başarıyla oluşturuldu
            </p>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground mb-1">İade Numaranız</p>
              <p className="text-2xl font-bold text-primary">#{returnNumber}</p>
            </div>

            {/* İade Detayları */}
            {selectedProducts.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm font-medium mb-2">İade Edilen Ürünler:</p>
                {selectedProducts.map((product, i) => (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span className="text-muted-foreground">{product.name}</span>
                    <span>{(product.price * product.quantity).toLocaleString("tr-TR")} {currency}</span>
                  </div>
                ))}
                <div className="border-t mt-2 pt-2 flex justify-between font-medium">
                  <span>Tahmini İade Tutarı</span>
                  <span className="text-green-600">{refundAmount.toLocaleString("tr-TR")} {currency}</span>
                </div>
              </div>
            )}

            <div className="space-y-3 text-sm text-left mb-6">
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">E-posta Gönderildi</p>
                  <p className="text-muted-foreground text-xs">Onay mesajı ve kargo etiketi e-posta adresinize gönderildi</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                <Package className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Ürünü Hazırlayın</p>
                  <p className="text-muted-foreground text-xs">Ürünü orijinal ambalajına yerleştirip kargo etiketini yapıştırın</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">3-5 İş Günü</p>
                  <p className="text-muted-foreground text-xs">Ürün teslim alındıktan sonra iade işleminiz tamamlanacak</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push("/portal/track")}
              >
                İade Takip
              </Button>
              <Button
                className="flex-1"
                onClick={() => router.push("/portal")}
              >
                Yeni İade
              </Button>
            </div>
          </CardContent>
        </Card>
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
                <h1 className="font-semibold">İade Özeti</h1>
                <p className="text-xs text-muted-foreground">
                  Sipariş: {orderData.orderNumber}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Adım 5/5</p>
              <p className="text-sm font-medium">Son Adım</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">✓</div>
            <div className="w-12 h-1 bg-green-500"></div>
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">✓</div>
            <div className="w-12 h-1 bg-green-500"></div>
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">✓</div>
            <div className="w-12 h-1 bg-green-500"></div>
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">✓</div>
            <div className="w-12 h-1 bg-primary"></div>
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">5</div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left - Details */}
          <div className="lg:col-span-2 space-y-4">
            {/* Error Message */}
            {error && (
              <Card className="border-destructive bg-destructive/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* Seçilen Ürünler */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">İade Edilecek Ürünler</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedProducts.length > 0 ? (
                  selectedProducts.map((product, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded" />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        {product.variant && (
                          <p className="text-xs text-muted-foreground">{product.variant}</p>
                        )}
                        <p className="text-xs text-muted-foreground">Adet: {product.quantity}</p>
                      </div>
                      <p className="font-semibold text-sm">
                        {(product.price * product.quantity).toLocaleString("tr-TR")} {currency}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Ürün bilgisi bulunamadı
                  </p>
                )}
              </CardContent>
            </Card>

            {/* İade Detayları */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">İade Detayları</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Sipariş Numarası</p>
                    <p className="font-medium">{orderData.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">E-posta</p>
                    <p className="font-medium truncate">{orderData.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">İade Nedeni</p>
                    <p className="font-medium">{reasonLabels[orderData.reason] || orderData.reason}</p>
                  </div>
                  {orderData.customerName && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Müşteri</p>
                      <p className="font-medium">{orderData.customerName}</p>
                    </div>
                  )}
                </div>

                {orderData.reasonDetail && (
                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Açıklama</p>
                    <p className="text-sm">{orderData.reasonDetail}</p>
                  </div>
                )}

                {orderData.photos && orderData.photos.length > 0 && (
                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Yüklenen Fotoğraflar ({orderData.photos.length})</p>
                    <div className="grid grid-cols-5 gap-2">
                      {orderData.photos.map((photo: string, index: number) => (
                        <img
                          key={index}
                          src={photo}
                          alt={`Fotoğraf ${index + 1}`}
                          className="w-full aspect-square object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* İade Talimatları */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">İade Talimatları</h3>
                <ol className="space-y-2 text-sm">
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                    <span>Ürünü orijinal ambalajına yerleştirin</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                    <span>E-postanıza gelen kargo etiketini yazdırın</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                    <span>Paketi en yakın kargo şubesine teslim edin</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                    <span>Ürün teslim alındıktan sonra 3-5 iş günü içinde iade işleminiz tamamlanır</span>
                  </li>
                </ol>
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
                {selectedProducts.length > 0 && (
                  <div className="space-y-2">
                    {selectedProducts.map((product, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-muted-foreground truncate flex-1 mr-2">
                          {product.name} {product.quantity > 1 && `(x${product.quantity})`}
                        </span>
                        <span className="font-medium flex-shrink-0">
                          {(product.price * product.quantity).toLocaleString("tr-TR")} {currency}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Tahmini İade</span>
                    </div>
                    <span className="font-bold text-lg text-green-600">
                      {refundAmount.toLocaleString("tr-TR")} {currency}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    *İnceleme sonrası kesinleşecektir
                  </p>
                </div>

                <div className="border-t pt-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>Kargo bilgileri e-posta ile gönderilecek</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Gönderiliyor...
                    </>
                  ) : (
                    "İade Talebini Gönder"
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Göndererek iade koşullarını kabul etmiş olursunuz
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
