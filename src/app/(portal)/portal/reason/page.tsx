"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, PackageX, Shirt, AlertCircle, Sparkles, FileText, HelpCircle, Package } from "lucide-react";

const RETURN_REASONS = [
  {
    id: "damaged_product",
    label: "Hasarlı Ürün",
    description: "Ürün hasarlı veya kırık geldi",
    icon: PackageX,
    color: "bg-red-50 border-red-200 hover:bg-red-100",
    iconColor: "text-red-600",
  },
  {
    id: "wrong_size",
    label: "Yanlış Beden",
    description: "Beden uygun değil",
    icon: Shirt,
    color: "bg-orange-50 border-orange-200 hover:bg-orange-100",
    iconColor: "text-orange-600",
  },
  {
    id: "changed_mind",
    label: "Fikir Değiştirdim",
    description: "Artık istemiyorum",
    icon: AlertCircle,
    color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    id: "defective",
    label: "Arızalı Ürün",
    description: "Ürün çalışmıyor",
    icon: AlertCircle,
    color: "bg-red-50 border-red-200 hover:bg-red-100",
    iconColor: "text-red-600",
  },
  {
    id: "not_as_described",
    label: "Açıklamaya Uymuyor",
    description: "Ürün sitedeki gibi değil",
    icon: FileText,
    color: "bg-purple-50 border-purple-200 hover:bg-purple-100",
    iconColor: "text-purple-600",
  },
  {
    id: "wrong_product",
    label: "Yanlış Ürün",
    description: "Sipariş ettiğim ürün değil",
    icon: Package,
    color: "bg-yellow-50 border-yellow-200 hover:bg-yellow-100",
    iconColor: "text-yellow-600",
  },
  {
    id: "quality_issue",
    label: "Kalite Sorunu",
    description: "Ürün kalitesi yetersiz",
    icon: Sparkles,
    color: "bg-pink-50 border-pink-200 hover:bg-pink-100",
    iconColor: "text-pink-600",
  },
  {
    id: "other",
    label: "Diğer",
    description: "Farklı bir neden",
    icon: HelpCircle,
    color: "bg-gray-50 border-gray-200 hover:bg-gray-100",
    iconColor: "text-gray-600",
  },
];

export default function ReasonPage() {
  const router = useRouter();
  const [selectedReason, setSelectedReason] = useState("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [orderData, setOrderData] = useState<any>(null);

  useEffect(() => {
    // SessionStorage'dan sipariş bilgilerini al
    const stored = sessionStorage.getItem("returnOrder");
    if (!stored) {
      router.push("/portal");
      return;
    }
    setOrderData(JSON.parse(stored));
  }, [router]);

  const handleContinue = () => {
    if (!selectedReason) return;

    // İade nedenini sessionStorage'a kaydet
    const updated = {
      ...orderData,
      reason: selectedReason,
      reasonDetail: reasonDetail.trim() || undefined,
    };
    sessionStorage.setItem("returnOrder", JSON.stringify(updated));

    // Fotoğraf yükleme sayfasına yönlendir
    router.push("/portal/upload");
  };

  const handleBack = () => {
    router.push("/portal");
  };

  if (!orderData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  const selectedReasonData = RETURN_REASONS.find(r => r.id === selectedReason);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri
          </Button>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">İade Nedeni</h1>
            <p className="text-gray-600">
              Sipariş: <span className="font-semibold">{orderData.orderNumber}</span>
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">✓</div>
            <div className="w-16 h-1 bg-blue-500"></div>
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">2</div>
            <div className="w-16 h-1 bg-gray-300"></div>
            <div className="w-8 h-8 rounded-full bg-gray-300 text-white flex items-center justify-center text-sm font-bold">3</div>
            <div className="w-16 h-1 bg-gray-300"></div>
            <div className="w-8 h-8 rounded-full bg-gray-300 text-white flex items-center justify-center text-sm font-bold">4</div>
          </div>
        </div>

        {/* Reason Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {RETURN_REASONS.map((reason) => {
            const Icon = reason.icon;
            const isSelected = selectedReason === reason.id;

            return (
              <Card
                key={reason.id}
                className={`cursor-pointer transition-all ${reason.color} ${
                  isSelected ? "ring-2 ring-blue-500 shadow-lg" : ""
                }`}
                onClick={() => setSelectedReason(reason.id)}
              >
                <CardContent className="p-6 text-center">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${isSelected ? 'bg-blue-500' : 'bg-white'} mb-3`}>
                    <Icon className={`h-6 w-6 ${isSelected ? 'text-white' : reason.iconColor}`} />
                  </div>
                  <h3 className="font-semibold mb-1">{reason.label}</h3>
                  <p className="text-xs text-muted-foreground">{reason.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Additional Details */}
        {selectedReason && (
          <Card className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">Ek Açıklama (İsteğe Bağlı)</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {selectedReasonData?.label} hakkında daha fazla bilgi verebilirsiniz
              </p>
              <Textarea
                placeholder="Örn: Ürün kutusu ezik geldi..."
                value={reasonDetail}
                onChange={(e) => setReasonDetail(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={!selectedReason}
            className="min-w-[200px]"
          >
            Devam Et
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
