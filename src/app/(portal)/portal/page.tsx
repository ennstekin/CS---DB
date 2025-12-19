"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Undo2, Package, Mail } from "lucide-react";

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
      // Sipariş doğrulama için API çağrısı
      const response = await fetch("/api/portal/verify-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Sipariş bilgilerini sessionStorage'a kaydet (İkas'tan gelen tüm detaylarla)
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

        // İade nedeni seçim sayfasına yönlendir
        router.push("/portal/reason");
      } else {
        setError(data.error || "Sipariş bulunamadı. Lütfen bilgilerinizi kontrol edin.");
      }
    } catch (err) {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Undo2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">İade Talebi</h1>
          <p className="text-gray-600">
            Siparişinizi kolayca iade edin
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sipariş Doğrulama</CardTitle>
            <CardDescription>
              İade işlemine başlamak için sipariş bilgilerinizi girin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orderNumber" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Sipariş Numarası
                </Label>
                <Input
                  id="orderNumber"
                  type="text"
                  placeholder="ÖRN: #12345"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  E-posta Adresi
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ornek@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? "Kontrol ediliyor..." : "Devam Et"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold text-sm mb-2">İade Süreci:</h3>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                  <span>Sipariş bilgilerinizi doğrulayın</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                  <span>İade nedeninizi seçin</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                  <span>Ürün fotoğraflarını yükleyin (isteğe bağlı)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                  <span>İade talebinizi gönderin</span>
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-gray-600">
            Mevcut iade talebiniz mi var?{" "}
            <a href="/portal/track" className="text-blue-600 hover:underline font-medium">
              İade Takip
            </a>
          </p>
          <p className="text-sm text-gray-600">
            Sorularınız mı var?{" "}
            <a href="mailto:destek@ornek.com" className="text-blue-600 hover:underline">
              Bize ulaşın
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
