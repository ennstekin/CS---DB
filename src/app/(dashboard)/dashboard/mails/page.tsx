"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockMails, type MockMail } from "@/lib/mock-data";
import { AiReplyDialog } from "@/components/dashboard/ai-reply-dialog";
import { OrderDetailDialog } from "@/components/dashboard/order-detail-dialog";
import {
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Send,
  Edit
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const statusColors = {
  NEW: "bg-blue-500",
  OPEN: "bg-yellow-500",
  PENDING: "bg-orange-500",
  RESOLVED: "bg-green-500",
  CLOSED: "bg-gray-500",
};

const statusLabels = {
  NEW: "Yeni",
  OPEN: "Açık",
  PENDING: "Bekliyor",
  RESOLVED: "Çözüldü",
  CLOSED: "Kapandı",
};

const priorityColors = {
  LOW: "text-gray-500",
  NORMAL: "text-blue-500",
  HIGH: "text-orange-500",
  URGENT: "text-red-500",
};

const categoryLabels = {
  ORDER_INQUIRY: "Sipariş Sorgusu",
  RETURN_REQUEST: "İade Talebi",
  POSITIVE_FEEDBACK: "Olumlu Geri Bildirim",
  WRONG_ITEM: "Yanlış Ürün",
  INVOICE_REQUEST: "Fatura Talebi",
  TRACKING_INQUIRY: "Kargo Takip",
  DISCOUNT_ISSUE: "İndirim Sorunu",
  SIZE_EXCHANGE: "Beden Değişimi",
};

export default function MailsPage() {
  const [selectedMail, setSelectedMail] = useState<MockMail | null>(null);
  const [filter, setFilter] = useState<"all" | "new" | "open" | "resolved">("all");
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string>("");

  const filteredMails = mockMails.filter((mail) => {
    if (filter === "all") return true;
    if (filter === "new") return mail.status === "NEW";
    if (filter === "open") return mail.status === "OPEN" || mail.status === "PENDING";
    if (filter === "resolved") return mail.status === "RESOLVED";
    return true;
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Mailler</h2>
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI Analiz Aktif
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-4" onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all">
              Tümü ({mockMails.length})
            </TabsTrigger>
            <TabsTrigger value="new">
              <Mail className="h-4 w-4 mr-1" />
              Yeni ({mockMails.filter(m => m.status === "NEW").length})
            </TabsTrigger>
            <TabsTrigger value="open">
              <Clock className="h-4 w-4 mr-1" />
              Bekleyen ({mockMails.filter(m => m.status === "OPEN" || m.status === "PENDING").length})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              <CheckCircle className="h-4 w-4 mr-1" />
              Çözülen ({mockMails.filter(m => m.status === "RESOLVED").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Mail Listesi */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Gelen Kutusu</CardTitle>
                  <CardDescription>
                    {filteredMails.length} mail
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {filteredMails.map((mail) => (
                      <div
                        key={mail.id}
                        onClick={() => setSelectedMail(mail)}
                        className={cn(
                          "p-4 cursor-pointer hover:bg-accent transition-colors",
                          selectedMail?.id === mail.id && "bg-accent"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="font-medium text-sm truncate">
                            {mail.from}
                          </span>
                          <Badge
                            className={cn("text-xs", statusColors[mail.status])}
                            variant="default"
                          >
                            {statusLabels[mail.status]}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-sm mb-1 truncate">
                          {mail.subject}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {mail.preview}
                        </p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {format(new Date(mail.receivedAt), "dd MMM HH:mm", { locale: tr })}
                          </span>
                          {mail.priority === "HIGH" && (
                            <AlertCircle className={cn("h-3 w-3", priorityColors.HIGH)} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Mail Detay */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Mail Detayı</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedMail ? (
                    <div className="space-y-4">
                      {/* Mail Header */}
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold">{selectedMail.subject}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Gönderen:</span>
                          <span className="font-medium text-foreground">{selectedMail.from}</span>
                          <span>•</span>
                          <span>{format(new Date(selectedMail.receivedAt), "dd MMMM yyyy, HH:mm", { locale: tr })}</span>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={statusColors[selectedMail.status]}>
                            {statusLabels[selectedMail.status]}
                          </Badge>
                          {selectedMail.aiCategory && (
                            <Badge variant="outline">
                              {categoryLabels[selectedMail.aiCategory as keyof typeof categoryLabels]}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Önerilen Cevap - AI Tarafından Oluşturulmuş */}
                      {selectedMail.isAiAnalyzed && (
                        <Card className="bg-blue-50 border-blue-200">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-blue-600" />
                              Önerilen Cevap
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {/* AI'ın Önerdiği Mail Cevabı */}
                            <div className="bg-white rounded-lg p-4 border border-blue-200">
                              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800">
{`Sayın Müşterimiz,

Talebiniz için teşekkür ederiz. Siparişinizin durumunu inceledik ve size güncel bilgileri sunmak isteriz.

Siparişiniz ${selectedMail.suggestedOrderNumbers?.[0] || 'sistemimizde'} kayıtlı olup, kargo sürecindedir. En kısa sürede size ulaştırılacaktır.

Herhangi bir sorunuz olursa lütfen bizimle iletişime geçmekten çekinmeyin.

Saygılarımızla,
Müşteri Hizmetleri`}
                              </pre>
                            </div>

                            {/* Aksiyon Butonları */}
                            <div className="flex gap-2">
                              <Button
                                onClick={() => setReplyDialogOpen(true)}
                                className="flex-1"
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Hızlı Gönder
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setReplyDialogOpen(true)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Düzenle
                              </Button>
                            </div>

                            {/* Sipariş Eşleştirmeleri */}
                            {selectedMail.suggestedOrderNumbers.length > 0 && (
                              <div className="pt-2 border-t border-blue-200">
                                <p className="text-xs font-medium text-gray-600 mb-2">
                                  İlgili Siparişler:
                                </p>
                                <div className="flex gap-2 flex-wrap">
                                  {selectedMail.suggestedOrderNumbers.map((orderNo) => (
                                    <Badge
                                      key={orderNo}
                                      variant="secondary"
                                      className="cursor-pointer hover:bg-blue-100 transition-colors"
                                      onClick={() => {
                                        setSelectedOrderNumber(orderNo);
                                        setOrderDetailOpen(true);
                                      }}
                                    >
                                      {orderNo}
                                      <ChevronRight className="h-3 w-3 ml-1" />
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      {/* Mail İçeriği */}
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <pre className="whitespace-pre-wrap font-sans text-sm">
                          {selectedMail.body}
                        </pre>
                      </div>

                      {/* Aksiyon Butonları */}
                      <div className="flex gap-2">
                        <Button onClick={() => setReplyDialogOpen(true)}>
                          <Sparkles className="h-4 w-4 mr-2" />
                          AI ile Yanıtla
                        </Button>
                        <Button variant="outline">İleriye Yönlendir</Button>
                        <Button variant="outline">Çözüldü Olarak İşaretle</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Detaylarını görmek için bir mail seçin</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* AI Yanıt Dialog */}
        <AiReplyDialog
          open={replyDialogOpen}
          onOpenChange={setReplyDialogOpen}
          mail={selectedMail}
        />

        {/* Sipariş Detay Dialog */}
        <OrderDetailDialog
          open={orderDetailOpen}
          onOpenChange={setOrderDetailOpen}
          orderNumber={selectedOrderNumber}
        />
      </div>
    </div>
  );
}
