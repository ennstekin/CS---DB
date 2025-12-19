"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Loader2, Package, Mail, Calendar } from "lucide-react";

export default function CompletePage() {
  const router = useRouter();
  const [orderData, setOrderData] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [returnNumber, setReturnNumber] = useState("");

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
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setReturnNumber(data.returnNumber);
        setSubmitted(true);
        sessionStorage.removeItem("returnOrder");
      } else {
        alert(data.error || "İade talebi oluşturulamadı");
      }
    } catch (error) {
      alert("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push("/portal/upload");
  };

  if (!orderData) {
    return <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center"><p>Yükleniyor...</p></div>;
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">İade Talebiniz Alındı!</h2>
            <p className="text-muted-foreground mb-6">
              İade numaranız:
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-2xl font-bold text-blue-600">#{returnNumber}</p>
            </div>
            <div className="space-y-3 text-sm text-left">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                <p>E-posta adresinize onay mesajı gönderildi</p>
              </div>
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-blue-600 mt-0.5" />
                <p>Kargo etiketini e-postanızdan yazdırabilirsiniz</p>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                <p>İade süreciniz 3-5 iş günü içinde tamamlanacak</p>
              </div>
            </div>
            <Button
              className="w-full mt-6"
              onClick={() => router.push("/portal")}
            >
              Yeni İade Talebi
            </Button>
          </CardContent>
        </Card>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri
          </Button>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">İade Özeti</h1>
            <p className="text-gray-600">
              Bilgilerinizi kontrol edin ve onaylayın
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">✓</div>
            <div className="w-16 h-1 bg-green-500"></div>
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">✓</div>
            <div className="w-16 h-1 bg-green-500"></div>
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">✓</div>
            <div className="w-16 h-1 bg-blue-500"></div>
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">4</div>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Sipariş Numarası</p>
              <p className="font-semibold">{orderData.orderNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">E-posta</p>
              <p className="font-semibold">{orderData.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">İade Nedeni</p>
              <p className="font-semibold">{reasonLabels[orderData.reason] || orderData.reason}</p>
            </div>
            {orderData.reasonDetail && (
              <div>
                <p className="text-sm text-muted-foreground">Açıklama</p>
                <p className="text-sm">{orderData.reasonDetail}</p>
              </div>
            )}
            {orderData.photos && orderData.photos.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Yüklenen Fotoğraflar</p>
                <div className="grid grid-cols-4 gap-2">
                  {orderData.photos.map((photo: string, index: number) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-20 object-cover rounded"
                    />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">İade Talimatları</h3>
            <ol className="space-y-2 text-sm">
              <li className="flex gap-2">
                <span className="font-semibold">1.</span>
                <span>Ürünü orijinal ambalajına yerleştirin</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">2.</span>
                <span>E-postanıza gelen kargo etiketini yazdırın</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">3.</span>
                <span>Paketi kargo şubesine teslim edin</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">4.</span>
                <span>İade süreci 3-5 iş günü içinde tamamlanır</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        <Button
          size="lg"
          className="w-full"
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
      </div>
    </div>
  );
}
