import { KpiCards } from "@/components/dashboard/kpi-cards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        </div>

        <KpiCards />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Son Çağrılar</CardTitle>
              <CardDescription>
                Son 24 saatteki çağrı aktivitesi
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="text-sm text-muted-foreground">
                Grafik yakında eklenecek...
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Bekleyen İşler</CardTitle>
              <CardDescription>
                Dikkat gerektiren maddeler
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      5 Yanıt bekleyen mail
                    </p>
                    <p className="text-sm text-muted-foreground">
                      En eski: 2 saat önce
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      3 Kaçırılan çağrı
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Geri aranmalı
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      12 İşlem bekleyen sipariş
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Kargoya verilmeli
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
