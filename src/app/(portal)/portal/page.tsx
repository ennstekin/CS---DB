"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Mail, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PortalPage() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!orderNumber.trim() || !email.trim()) {
      setError("Lütfen tüm alanları doldurun");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/portal/verify-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        sessionStorage.setItem("returnOrder", JSON.stringify({
          orderNumber: data.order?.orderNumber || orderNumber,
          email,
          orderId: data.order?.id,
          customerName: data.order?.customerName,
          customerEmail: data.order?.customerEmail,
          totalPrice: data.order?.totalPrice,
          shippingPrice: data.order?.shippingPrice,
          currency: data.order?.currency,
          createdAt: data.order?.createdAt,
          status: data.order?.status,
          items: data.order?.items || [],
        }));

        router.push("/portal/select");
      } else {
        // Daha açıklayıcı hata mesajları
        if (data.error?.includes("not found") || data.error?.includes("bulunamadı")) {
          setError("Sipariş numarası bulunamadı. Lütfen sipariş numaranızı kontrol edin.");
        } else if (data.error?.includes("email") || data.error?.includes("eşleşmiyor")) {
          setError("E-posta adresi bu siparişle eşleşmiyor. Sipariş verirken kullandığınız e-posta adresini girin.");
        } else if (data.error?.includes("expired") || data.error?.includes("süre")) {
          setError("Bu sipariş için iade süresi dolmuş. İade taleplerini sipariş tarihinden itibaren 30 gün içinde yapabilirsiniz.");
        } else {
          setError(data.error || "Sipariş doğrulanamadı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.");
        }
      }
    } catch (err) {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { step: 1, text: "Sipariş bilgilerinizi doğrulayın", active: true },
    { step: 2, text: "İade edilecek ürünleri seçin", active: false },
    { step: 3, text: "İade nedeninizi seçin", active: false },
    { step: 4, text: "Ürün fotoğraflarını yükleyin", active: false },
    { step: 5, text: "İade talebinizi gönderin", active: false },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SC</span>
            </div>
            <div>
              <h1 className="font-semibold">Smart CS</h1>
              <p className="text-xs text-muted-foreground">İade Portalı</p>
            </div>
          </div>
          <a
            href="/portal/track"
            className="text-sm text-primary hover:underline font-medium flex items-center gap-1"
          >
            İade Takip
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left Side - Form */}
          <div className="lg:col-span-3 space-y-6">
            <div>
              <h1 className="text-2xl font-semibold">İade Talebi Oluştur</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Siparişinizi kolayca iade edin
              </p>
            </div>

            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Sipariş Doğrulama</CardTitle>
                    <CardDescription className="text-sm">
                      İade işlemine başlamak için sipariş bilgilerinizi girin
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVerify} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="orderNumber">Sipariş Numarası</Label>
                    <div className="relative">
                      <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="orderNumber"
                        type="text"
                        placeholder="ÖRN: #12345"
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        disabled={loading}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-posta Adresi</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="ornek@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Kontrol ediliyor...
                      </>
                    ) : (
                      <>
                        Devam Et
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Steps */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">İade Süreci</CardTitle>
                <CardDescription className="text-sm">
                  5 kolay adımda iade işleminizi tamamlayın
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {steps.map((step) => (
                  <div
                    key={step.step}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border",
                      step.active ? "bg-primary/5 border-primary/20" : "border-transparent"
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0",
                      step.active
                        ? "bg-primary text-white"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {step.step}
                    </div>
                    <span className={cn(
                      "text-sm",
                      step.active ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>
                      {step.text}
                    </span>
                  </div>
                ))}

                <div className="pt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Sorularınız mı var?{" "}
                    <a href="mailto:destek@ornek.com" className="text-primary hover:underline">
                      Bize ulaşın
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
