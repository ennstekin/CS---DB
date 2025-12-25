"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Upload, X, Loader2 } from "lucide-react";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_TOTAL_SIZE = 15 * 1024 * 1024; // 15MB total
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const TARGET_WIDTH = 1200; // Resize to max 1200px width

// Compress image using canvas
async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions
      if (width > TARGET_WIDTH) {
        height = (height * TARGET_WIDTH) / width;
        width = TARGET_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG with 0.8 quality
      const compressed = canvas.toDataURL('image/jpeg', 0.8);
      resolve(compressed);
    };

    img.onerror = () => reject(new Error('Failed to load image'));

    // Read file as data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export default function UploadPage() {
  const router = useRouter();
  const [orderData, setOrderData] = useState<any>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("returnOrder");
    if (!stored) {
      router.push("/portal");
      return;
    }
    setOrderData(JSON.parse(stored));
  }, [router]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setError("");

    if (photos.length + files.length > 5) {
      setError("Maksimum 5 fotoğraf yükleyebilirsiniz");
      return;
    }

    // Validate file types and sizes
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`"${file.name}" desteklenmeyen dosya formatı. Sadece JPEG, PNG, WebP desteklenir.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`"${file.name}" 5MB'dan büyük. Lütfen daha küçük bir dosya seçin.`);
        return;
      }
    }

    setIsProcessing(true);

    try {
      const newPhotos: File[] = [];
      const newPreviews: string[] = [];

      for (const file of files) {
        // Compress image
        const compressed = await compressImage(file);
        newPhotos.push(file);
        newPreviews.push(compressed);
      }

      // Check total size of compressed images
      const totalSize = [...previews, ...newPreviews].reduce((sum, p) => sum + p.length, 0);
      if (totalSize > MAX_TOTAL_SIZE) {
        setError("Toplam dosya boyutu çok büyük. Lütfen daha az veya daha küçük fotoğraflar seçin.");
        return;
      }

      setPhotos([...photos, ...newPhotos]);
      setPreviews([...previews, ...newPreviews]);
    } catch (err) {
      setError("Fotoğraf işlenirken bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsProcessing(false);
    }
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
            <div className="w-12 h-1 bg-green-500"></div>
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">✓</div>
            <div className="w-12 h-1 bg-green-500"></div>
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">✓</div>
            <div className="w-12 h-1 bg-blue-500"></div>
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">4</div>
            <div className="w-12 h-1 bg-gray-300"></div>
            <div className="w-8 h-8 rounded-full bg-gray-300 text-white flex items-center justify-center text-sm font-bold">5</div>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <label htmlFor="file-upload" className={`cursor-pointer ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors">
                {isProcessing ? (
                  <>
                    <Loader2 className="h-12 w-12 mx-auto mb-4 text-blue-500 animate-spin" />
                    <p className="text-lg font-semibold mb-1">Fotoğraflar İşleniyor...</p>
                    <p className="text-sm text-muted-foreground">
                      Fotoğraflar sıkıştırılıyor, lütfen bekleyin
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-semibold mb-1">Fotoğraf Yükle</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Hasarlı veya kusurlu ürünlerin fotoğraflarını ekleyin
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Maksimum 5 fotoğraf, her biri 5MB&apos;a kadar (JPEG, PNG, WebP)
                    </p>
                  </>
                )}
              </div>
              <input
                id="file-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFileChange}
                className="hidden"
                disabled={isProcessing}
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
          <Button variant="outline" onClick={handleSkip} disabled={isProcessing}>
            Atla
          </Button>
          <Button size="lg" onClick={handleContinue} className="min-w-[200px]" disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                İşleniyor...
              </>
            ) : (
              <>
                Devam Et
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
