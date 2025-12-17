import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CallsPage() {
  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Çağrılar</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Çağrı Yönetimi</CardTitle>
            <CardDescription>
              Telefon görüşmeleri ve AI asistan kayıtları
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium mb-2">Çağrı modülü yakında eklenecek</p>
              <p className="text-sm">
                Twilio entegrasyonu ve AI asistan özellikleri sonraki aşamada geliştirilecek
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
