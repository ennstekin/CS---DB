"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Calendar,
  User,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Undo2,
  Store,
  Globe,
  PenLine,
  Plus,
  Search,
  Loader2,
} from "lucide-react";

interface Return {
  id: string;
  return_number: string;
  status: string;
  reason: string;
  total_refund_amount: number;
  created_at: string;
  source?: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
  };
  order: {
    order_number: string;
  };
}

interface OrderItem {
  id: string;
  name: string;
  variantName?: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  customerEmail: string;
  customerName: string;
  totalPrice: number;
  shippingPrice: number;
  currency: string;
  createdAt: string;
  items: OrderItem[];
}

interface SelectedItem {
  id: string;
  quantity: number;
  refundAmount: number;
}

type TabSource = "ikas" | "portal" | "manual";

const RETURN_REASONS = [
  { value: "defective", label: "Ürün Hasarlı/Kusurlu" },
  { value: "wrong_item", label: "Yanlış Ürün Gönderildi" },
  { value: "not_as_described", label: "Ürün Açıklamayla Uyuşmuyor" },
  { value: "changed_mind", label: "Fikir Değişikliği" },
  { value: "size_issue", label: "Beden/Boyut Uyumsuzluğu" },
  { value: "late_delivery", label: "Geç Teslimat" },
  { value: "other", label: "Diğer" },
];

export default function ReturnsPage() {
  const [activeTab, setActiveTab] = useState<TabSource>("ikas");
  const [ikasReturns, setIkasReturns] = useState<Return[]>([]);
  const [portalReturns, setPortalReturns] = useState<Return[]>([]);
  const [manualReturns, setManualReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [ikasLoading, setIkasLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  // Manual return dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [searchingOrder, setSearchingOrder] = useState(false);
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);
  const [orderError, setOrderError] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [returnReason, setReturnReason] = useState("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [creatingReturn, setCreatingReturn] = useState(false);
  const [includeShipping, setIncludeShipping] = useState(false);

  useEffect(() => {
    fetchAllReturns();
  }, []);

  useEffect(() => {
    // Re-filter when status changes
  }, [statusFilter]);

  const fetchAllReturns = async () => {
    setLoading(true);
    setIkasLoading(true);

    // Fetch DB data first (fast) - don't wait for İkas
    try {
      const dbRes = await fetch("/api/returns?source=db&limit=100");
      const dbData = await dbRes.json();

      // Split DB returns by source
      const dbReturns = dbData.returns || [];
      setPortalReturns(dbReturns.filter((r: Return) => r.source === "portal"));
      setManualReturns(dbReturns.filter((r: Return) => r.source === "manual"));
    } catch (error) {
      console.error("Error fetching DB returns:", error);
    } finally {
      setLoading(false);
    }

    // Fetch İkas data separately (slow) - don't block UI
    try {
      const ikasRes = await fetch("/api/returns?source=ikas&limit=50");
      const ikasData = await ikasRes.json();
      setIkasReturns(ikasData.returns || []);
    } catch (error) {
      console.error("Error fetching İkas returns:", error);
    } finally {
      setIkasLoading(false);
    }
  };

  // Search order by number
  const searchOrder = async () => {
    if (!orderNumber.trim()) return;

    setSearchingOrder(true);
    setOrderError("");
    setFoundOrder(null);
    setSelectedItems([]);

    try {
      const res = await fetch(`/api/orders/${orderNumber.trim()}`);
      const data = await res.json();

      if (!res.ok) {
        setOrderError(data.error || "Sipariş bulunamadı");
        return;
      }

      setFoundOrder(data);
    } catch (error) {
      setOrderError("Sipariş aranırken bir hata oluştu");
    } finally {
      setSearchingOrder(false);
    }
  };

  // Toggle item selection
  const toggleItemSelection = (item: OrderItem) => {
    setSelectedItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.filter((i) => i.id !== item.id);
      }
      return [...prev, { id: item.id, quantity: item.quantity, refundAmount: item.price }];
    });
  };

  // Calculate total refund
  const itemsTotal = selectedItems.reduce((sum, item) => sum + item.refundAmount, 0);
  const shippingAmount = includeShipping && foundOrder?.shippingPrice ? foundOrder.shippingPrice : 0;
  const totalRefund = itemsTotal + shippingAmount;

  // Create manual return
  const createManualReturn = async () => {
    if (!foundOrder || selectedItems.length === 0 || !returnReason) return;

    setCreatingReturn(true);
    try {
      const returnNumber = `MAN-${foundOrder.orderNumber}-${Date.now().toString(36).toUpperCase()}`;

      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: foundOrder.id,
          returnNumber,
          reason: returnReason,
          reasonDetail,
          totalRefundAmount: totalRefund,
          source: "manual",
          // İkas order data
          orderNumber: foundOrder.orderNumber,
          customerEmail: foundOrder.customerEmail,
          customerName: foundOrder.customerName,
          items: selectedItems.map((si) => {
            const item = foundOrder.items.find((i) => i.id === si.id);
            return {
              productName: item?.name || "",
              variantName: item?.variantName || "",
              quantity: si.quantity,
              refundAmount: si.refundAmount,
            };
          }),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "İade oluşturulamadı");
      }

      // Success - close dialog and refresh
      resetDialog();
      fetchAllReturns();
      setActiveTab("manual");
    } catch (error) {
      console.error("Error creating return:", error);
      alert(error instanceof Error ? error.message : "İade oluşturulurken bir hata oluştu");
    } finally {
      setCreatingReturn(false);
    }
  };

  // Reset dialog state
  const resetDialog = () => {
    setDialogOpen(false);
    setOrderNumber("");
    setFoundOrder(null);
    setOrderError("");
    setSelectedItems([]);
    setReturnReason("");
    setReasonDetail("");
    setIncludeShipping(false);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; icon: any; label: string }> = {
      REQUESTED: { variant: "secondary", icon: Clock, label: "Talep Edildi" },
      PENDING_APPROVAL: { variant: "default", icon: AlertCircle, label: "Onay Bekliyor" },
      APPROVED: { variant: "default", icon: CheckCircle, label: "Onaylandı" },
      REJECTED: { variant: "destructive", icon: XCircle, label: "Reddedildi" },
      IN_TRANSIT: { variant: "default", icon: Package, label: "Kargoda" },
      RECEIVED: { variant: "default", icon: CheckCircle, label: "Teslim Alındı" },
      COMPLETED: { variant: "default", icon: CheckCircle, label: "Tamamlandı" },
      CANCELLED: { variant: "secondary", icon: XCircle, label: "İptal" },
    };

    const config = statusConfig[status] || statusConfig.REQUESTED;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const filterByStatus = (returns: Return[]) => {
    if (statusFilter === "all") return returns;
    return returns.filter((r) => r.status === statusFilter);
  };

  const getActiveReturns = () => {
    switch (activeTab) {
      case "ikas":
        return filterByStatus(ikasReturns);
      case "portal":
        return filterByStatus(portalReturns);
      case "manual":
        return filterByStatus(manualReturns);
      default:
        return [];
    }
  };

  const activeReturns = getActiveReturns();

  const stats = {
    ikas: ikasReturns.length,
    portal: portalReturns.length,
    manual: manualReturns.length,
    pending: activeReturns.filter((r) => r.status === "REQUESTED" || r.status === "PENDING_APPROVAL").length,
    completed: activeReturns.filter((r) => r.status === "COMPLETED").length,
  };

  const ReturnsList = ({ returns, isLoading = false }: { returns: Return[], isLoading?: boolean }) => (
    <Card>
      <div className="divide-y">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Yükleniyor...</div>
        ) : returns.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Undo2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>İade talebi bulunamadı</p>
          </div>
        ) : (
          returns.map((returnItem) => (
            <div key={returnItem.id} className="p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold">#{returnItem.return_number}</h3>
                    {getStatusBadge(returnItem.status)}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>
                        {returnItem.customer?.first_name} {returnItem.customer?.last_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      <span>Sipariş #{returnItem.order?.order_number}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span>{returnItem.total_refund_amount?.toLocaleString("tr-TR")} TL</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(returnItem.created_at).toLocaleDateString("tr-TR")}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Sebep: {returnItem.reason}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (window.location.href = `/dashboard/returns/${returnItem.id}`)}
                >
                  Detay
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">İade Yönetimi</h1>
          <p className="text-muted-foreground mt-1">
            Müşteri iade taleplerini yönetin ve takip edin
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Manuel İade Oluştur
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabSource)} className="mb-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
          <TabsTrigger value="ikas" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            <span>İkas</span>
            <Badge variant="secondary" className="ml-1">{stats.ikas}</Badge>
          </TabsTrigger>
          <TabsTrigger value="portal" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span>Portal</span>
            <Badge variant="secondary" className="ml-1">{stats.portal}</Badge>
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <PenLine className="h-4 w-4" />
            <span>Manuel</span>
            <Badge variant="secondary" className="ml-1">{stats.manual}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 my-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Toplam İade</p>
                <p className="text-2xl font-bold">{activeReturns.length}</p>
              </div>
              <Undo2 className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bekleyen</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tamamlanan</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4 bg-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Kaynak</p>
                <p className="text-2xl font-bold capitalize">{activeTab}</p>
              </div>
              {activeTab === "ikas" && <Store className="h-8 w-8 text-primary" />}
              {activeTab === "portal" && <Globe className="h-8 w-8 text-primary" />}
              {activeTab === "manual" && <PenLine className="h-8 w-8 text-primary" />}
            </div>
          </Card>
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 mb-4">
          {["all", "REQUESTED", "APPROVED", "COMPLETED", "REJECTED"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status === "all" ? "Tümü" :
               status === "REQUESTED" ? "Bekleyen" :
               status === "APPROVED" ? "Onaylı" :
               status === "COMPLETED" ? "Tamamlanan" :
               status === "REJECTED" ? "Reddedilen" : status}
            </Button>
          ))}
        </div>

        <TabsContent value="ikas">
          <ReturnsList returns={filterByStatus(ikasReturns)} isLoading={ikasLoading} />
        </TabsContent>

        <TabsContent value="portal">
          <ReturnsList returns={filterByStatus(portalReturns)} isLoading={loading} />
        </TabsContent>

        <TabsContent value="manual">
          <ReturnsList returns={filterByStatus(manualReturns)} isLoading={loading} />
        </TabsContent>
      </Tabs>

      {/* Manual Return Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && resetDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manuel İade Oluştur</DialogTitle>
            <DialogDescription>
              Sipariş numarası ile sipariş arayın ve iade edilecek ürünleri seçin
            </DialogDescription>
          </DialogHeader>

          {/* Order Search */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="orderNumber">Sipariş Numarası</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="orderNumber"
                    placeholder="Örn: 136269"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchOrder()}
                  />
                  <Button onClick={searchOrder} disabled={searchingOrder || !orderNumber.trim()}>
                    {searchingOrder ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {orderError && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                {orderError}
              </div>
            )}

            {/* Found Order */}
            {foundOrder && (
              <div className="space-y-4 border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Sipariş #{foundOrder.orderNumber}</h3>
                    <p className="text-sm text-muted-foreground">{foundOrder.customerName}</p>
                    <p className="text-sm text-muted-foreground">{foundOrder.customerEmail}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{foundOrder.totalPrice?.toLocaleString("tr-TR")} {foundOrder.currency}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(foundOrder.createdAt).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <Label className="mb-2 block">İade Edilecek Ürünleri Seçin</Label>
                  <div className="space-y-2">
                    {foundOrder.items?.map((item) => {
                      const isSelected = selectedItems.some((i) => i.id === item.id);
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                            isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                          }`}
                          onClick={() => toggleItemSelection(item)}
                        >
                          <Checkbox checked={isSelected} />
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            {item.variantName && (
                              <p className="text-sm text-muted-foreground">{item.variantName}</p>
                            )}
                            <p className="text-sm">Adet: {item.quantity}</p>
                          </div>
                          <p className="font-semibold">{item.price?.toLocaleString("tr-TR")} TL</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Return Reason */}
                {selectedItems.length > 0 && (
                  <div className="space-y-4">
                    <div>
                      <Label>İade Sebebi</Label>
                      <Select value={returnReason} onValueChange={setReturnReason}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="İade sebebi seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {RETURN_REASONS.map((reason) => (
                            <SelectItem key={reason.value} value={reason.value}>
                              {reason.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Açıklama (Opsiyonel)</Label>
                      <Textarea
                        placeholder="Ek detaylar..."
                        value={reasonDetail}
                        onChange={(e) => setReasonDetail(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    {/* Shipping refund option */}
                    {foundOrder?.shippingPrice > 0 && (
                      <div
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          includeShipping ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                        }`}
                        onClick={() => setIncludeShipping(!includeShipping)}
                      >
                        <Checkbox checked={includeShipping} />
                        <div className="flex-1">
                          <p className="font-medium">Kargo Ücreti İadesi</p>
                          <p className="text-sm text-muted-foreground">Kargo ücretini de iade tutarına ekle</p>
                        </div>
                        <p className="font-semibold">{foundOrder.shippingPrice.toLocaleString("tr-TR")} TL</p>
                      </div>
                    )}

                    {/* Refund summary */}
                    <div className="p-3 bg-muted rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Ürün Tutarı:</span>
                        <span>{itemsTotal.toLocaleString("tr-TR")} TL</span>
                      </div>
                      {includeShipping && foundOrder?.shippingPrice > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Kargo Ücreti:</span>
                          <span>{foundOrder.shippingPrice.toLocaleString("tr-TR")} TL</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t">
                        <span className="font-medium">Toplam İade Tutarı:</span>
                        <span className="text-xl font-bold">{totalRefund.toLocaleString("tr-TR")} TL</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetDialog}>
              İptal
            </Button>
            <Button
              onClick={createManualReturn}
              disabled={creatingReturn || !foundOrder || selectedItems.length === 0 || !returnReason}
            >
              {creatingReturn ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Oluşturuluyor...
                </>
              ) : (
                "İade Oluştur"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
