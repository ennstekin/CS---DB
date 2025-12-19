"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Upload, X } from "lucide-react";

export default function UploadPage() {
  const router = useRouter();
  const [orderData, setOrderData] = useState<any>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const stored = sessionStorage.getItem("returnOrder");
    if (!stored) {
      router.push("/portal");
      return;
    }
    setOrderData(JSON.parse(stored));
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 5) {
      alert("Maksimum 5 fotoğraf yükleyebilirsiniz");
      return;
    }

    setPhotos([...photos, ...files]);

    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const handleContinue = () => {
    // Save photos to sessionStorage (base64)
    const updated = {
      ...orderData,
      photos: previews,
    };
    sessionStorage.setItem("returnOrder", JSON.stringify(updated));
    router.push("/portal/complete");
  };

  const handleSkip = () => {
    router.push("/portal/complete");
  };

  const handleBack = () => {
    router.push("/portal/reason");
  };

  if (!orderData) {
    return <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center"><p>Yükleniyor...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Button variant="ghost" onClick={handleBack} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri
          </Button>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Fotoğraf Yükleme</h1>
            <p className="text-gray-600">
              Ürün fotoğrafları iade sürecinizi hızlandırır (İsteğe Bağlı)
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">✓</div>
            <div className="w-16 h-1 bg-green-500"></div>
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">✓</div>
            <div className="w-16 h-1 bg-blue-500"></div>
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">3</div>
            <div className="w-16 h-1 bg-gray-300"></div>
            <div className="w-8 h-8 rounded-full bg-gray-300 text-white flex items-center justify-center text-sm font-bold">4</div>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors">
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-semibold mb-1">Fotoğraf Yükle</p>
                <p className="text-sm text-muted-foreground mb-2">
                  Hasarlı veya kusurlu ürünlerin fotoğraflarını ekleyin
                </p>
                <p className="text-xs text-muted-foreground">
                  Maksimum 5 fotoğraf, her biri 10MB'a kadar
                </p>
              </div>
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {/* Photo Previews */}
            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mt-6">
                {previews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleSkip}>
            Atla
          </Button>
          <Button size="lg" onClick={handleContinue} className="min-w-[200px]">
            Devam Et
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
