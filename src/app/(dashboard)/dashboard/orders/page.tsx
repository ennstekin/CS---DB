import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Mock data - Gerçek veri Ikas'tan gelecek
const mockOrders = [
  {
    id: "1",
    orderNumber: "#1234",
    customer: "Ahmet Yılmaz",
    status: "CONFIRMED",
    total: "₺1,250.00",
    date: "2025-01-15",
  },
  {
    id: "2",
    orderNumber: "#1235",
    customer: "Ayşe Demir",
    status: "SHIPPED",
    total: "₺890.00",
    date: "2025-01-15",
  },
  {
    id: "3",
    orderNumber: "#1236",
    customer: "Mehmet Kaya",
    status: "PENDING",
    total: "₺2,100.00",
    date: "2025-01-14",
  },
];

const statusColors = {
  PENDING: "bg-yellow-500",
  CONFIRMED: "bg-blue-500",
  SHIPPED: "bg-green-500",
  DELIVERED: "bg-green-700",
  CANCELLED: "bg-red-500",
};

const statusLabels = {
  PENDING: "Bekliyor",
  CONFIRMED: "Onaylandı",
  SHIPPED: "Kargoya Verildi",
  DELIVERED: "Teslim Edildi",
  CANCELLED: "İptal",
};

export default function OrdersPage() {
  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Siparişler</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tüm Siparişler</CardTitle>
            <CardDescription>
              Ikas'tan çekilen sipariş listesi (Yakında gerçek veri eklenecek)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sipariş No</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Tutar</TableHead>
                  <TableHead>Tarih</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell>{order.customer}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[order.status as keyof typeof statusColors]}>
                        {statusLabels[order.status as keyof typeof statusLabels]}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.total}</TableCell>
                    <TableCell>{order.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Not:</strong> Bu sayfa şu anda mock data göstermektedir.
            Ikas API entegrasyonu için .env.local dosyasında IKAS_ACCESS_TOKEN değerini
            girmeniz gerekmektedir. Ardından gerçek sipariş verileri otomatik olarak
            çekilecektir.
          </p>
        </div>
      </div>
    </div>
  );
}
