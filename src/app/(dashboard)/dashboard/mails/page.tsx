"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Edit,
  Loader2,
  RefreshCw,
  Folder,
  FolderPlus,
  X,
  Package,
  Search,
  Link2,
  Undo2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface DbMail {
  id: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  status: string;
  priority: string;
  isAiAnalyzed: boolean;
  aiCategory?: string;
  aiSummary?: string;
  suggestedOrderIds: string[];
  matchConfidence?: number;
  receivedAt?: Date;
  sentAt?: Date;
  createdAt: Date;
  labels?: string[];
  flags?: string[];
  matchedOrderNumber?: string | null;
  isMatchedWithOrder?: boolean;
  matchedReturnId?: string | null;
  matchedReturnNumber?: string | null;
}

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
  const [mails, setMails] = useState<DbMail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isFetchingNewMails, setIsFetchingNewMails] = useState(false);
  const [selectedMail, setSelectedMail] = useState<DbMail | null>(null);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string>("");
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [aiSuggestedReply, setAiSuggestedReply] = useState<string>("");
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [newLabelInput, setNewLabelInput] = useState<string>("");
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLinkingOrder, setIsLinkingOrder] = useState(false);
  const [isLinkingReturn, setIsLinkingReturn] = useState(false);
  const [selectedReturnNumber, setSelectedReturnNumber] = useState<string>("");

  // Yaygın mail klasörleri
  const commonLabels = [
    "INBOX",
    "SENT",
    "DRAFTS",
    "SPAM",
    "TRASH",
    "ARCHIVE",
    "IMPORTANT",
    "STARRED"
  ];

  // Mevcut maillerden unique label'ları topla (IMAP'den gelen klasörler)
  const existingLabels = Array.from(
    new Set(
      mails.flatMap(mail => mail.labels || [])
    )
  ).filter(label => !commonLabels.includes(label));

  // Arama sonuçlarını filtrele
  const filteredMails = mails.filter((mail) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const fromEmail = mail.fromEmail?.toLowerCase() || "";
    const subject = mail.subject?.toLowerCase() || "";
    const bodyText = mail.bodyText?.toLowerCase() || "";

    return (
      fromEmail.includes(query) ||
      subject.includes(query) ||
      bodyText.includes(query)
    );
  });

  useEffect(() => {
    loadMails();
  }, []);

  // Mail değiştiğinde eşleşmiş sipariş ve iade numaralarını yükle veya temizle
  useEffect(() => {
    if (selectedMail?.matchedOrderNumber) {
      setSelectedOrderNumber(selectedMail.matchedOrderNumber);
    } else {
      setSelectedOrderNumber("");
    }
    if (selectedMail?.matchedReturnNumber) {
      setSelectedReturnNumber(selectedMail.matchedReturnNumber);
    } else {
      setSelectedReturnNumber("");
    }
    setAiSuggestedReply("");
  }, [selectedMail]);

  // Otomatik mail çekme - her 2 dakikada bir
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      fetchNewMailsFromImap();
    }, 2 * 60 * 1000); // 2 dakika

    // İlk yüklemede de çek
    fetchNewMailsFromImap();

    return () => clearInterval(interval);
  }, [autoRefreshEnabled]);

  // Otomatik liste yenileme - her 30 saniyede bir
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      loadMails();
    }, 30 * 1000); // 30 saniye

    return () => clearInterval(interval);
  }, [autoRefreshEnabled]);

  const loadMails = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/mails?limit=100`);
      if (response.ok) {
        const data = await response.json();
        setMails(data);
      }
    } catch (error) {
      console.error("Error loading mails:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNewMailsFromImap = async () => {
    setIsFetchingNewMails(true);
    try {
      console.log('🔄 Fetching new mails from IMAP...');
      const response = await fetch('/api/mails/fetch', {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Fetched mails:', result);
        setLastFetchTime(new Date());

        // Yeni mailler geldiyse listeyi yenile
        if (result.count > 0) {
          await loadMails();
        }
      }
    } catch (error) {
      console.error('❌ Error fetching new mails:', error);
    } finally {
      setIsFetchingNewMails(false);
    }
  };

  const generateAiReply = async () => {
    if (!selectedMail) return;

    setIsGeneratingReply(true);
    setAiSuggestedReply("");

    try {
      console.log('🤖 Generating AI reply for mail:', selectedMail.id);

      // 1. Önce mail içinden sipariş numarasını bul
      const fullText = `${selectedMail.subject} ${selectedMail.bodyText}`;
      const patterns = [
        /#(\d{4,})/i,
        /(\d{4,})\s*numaralı\s*sipariş/i,
        /sipariş\s*(?:no|numarası)?:?\s*#?(\d{4,})/i,
        /(\d{4,})\s*(?:nolu|numaralı)\s*order/i,
        /order\s*(?:no|number)?:?\s*#?(\d{4,})/i,
      ];

      let orderNumber = '';
      for (const pattern of patterns) {
        const match = fullText.match(pattern);
        if (match?.[1]) {
          orderNumber = match[1];
          console.log('📦 Order number found:', orderNumber);
          break;
        }
      }

      // 2. Sipariş numarası varsa İkas'tan detay çek
      let orderData = null;
      if (orderNumber) {
        try {
          console.log('🔍 Fetching order details from İkas:', orderNumber);
          const orderResponse = await fetch(`/api/orders/${orderNumber}`);
          if (orderResponse.ok) {
            orderData = await orderResponse.json();
            console.log('✅ Order data fetched:', orderData);
          }
        } catch (err) {
          console.warn('⚠️ Could not fetch order data:', err);
        }
      }

      // 3. AI cevap oluştur (sipariş bilgileriyle birlikte)
      const response = await fetch('/api/ai/generate-reply-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: selectedMail.fromEmail,
          subject: selectedMail.subject,
          body: selectedMail.bodyText,
          mailId: selectedMail.id,
          orderNumber: orderNumber || undefined,
          orderData: orderData || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('AI cevap oluşturulamadı');
      }

      const data = await response.json();
      setAiSuggestedReply(data.suggestedResponse || data.response || data.reply || '');
      console.log('✅ AI reply generated:', data);

    } catch (error) {
      console.error('❌ Error generating AI reply:', error);
      alert('AI cevap oluşturulurken hata oluştu: ' + (error as Error).message);
    } finally {
      setIsGeneratingReply(false);
    }
  };

  // Label ekleme fonksiyonu
  const handleAddLabel = async (label: string) => {
    if (!selectedMail) return;

    setIsAddingLabel(true);
    try {
      const response = await fetch(`/api/mails/${selectedMail.id}/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      });

      if (!response.ok) throw new Error('Label eklenemedi');

      const data = await response.json();

      // Mail listesini ve seçili maili güncelle
      setSelectedMail({ ...selectedMail, labels: data.labels });
      setMails(mails.map(m => m.id === selectedMail.id ? { ...m, labels: data.labels } : m));
      setNewLabelInput("");
    } catch (error) {
      console.error('Label eklenirken hata:', error);
      alert('Label eklenemedi: ' + (error as Error).message);
    } finally {
      setIsAddingLabel(false);
    }
  };

  // Label silme fonksiyonu
  const handleRemoveLabel = async (label: string) => {
    if (!selectedMail) return;

    try {
      const response = await fetch(`/api/mails/${selectedMail.id}/labels`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      });

      if (!response.ok) throw new Error('Label silinemedi');

      const data = await response.json();

      // Mail listesini ve seçili maili güncelle
      setSelectedMail({ ...selectedMail, labels: data.labels });
      setMails(mails.map(m => m.id === selectedMail.id ? { ...m, labels: data.labels } : m));
    } catch (error) {
      console.error('Label silinirken hata:', error);
      alert('Label silinemedi: ' + (error as Error).message);
    }
  };

  // Mail-sipariş eşleştirme fonksiyonu
  const handleLinkOrder = async (orderNumber: string) => {
    if (!selectedMail || !orderNumber) return;

    setIsLinkingOrder(true);
    try {
      const response = await fetch(`/api/mails/${selectedMail.id}/link-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber }),
      });

      if (!response.ok) throw new Error('Sipariş bağlanamadı');

      const data = await response.json();

      // Mail listesini ve seçili maili güncelle
      const updatedMail = {
        ...selectedMail,
        matchedOrderNumber: orderNumber,
        isMatchedWithOrder: true
      };
      setSelectedMail(updatedMail);
      setMails(mails.map(m => m.id === selectedMail.id ? updatedMail : m));
      setSelectedOrderNumber(orderNumber);

      console.log('✅ Mail siparişe bağlandı:', orderNumber);
    } catch (error) {
      console.error('Sipariş bağlanırken hata:', error);
      alert('Sipariş bağlanamadı: ' + (error as Error).message);
    } finally {
      setIsLinkingOrder(false);
    }
  };

  // Mail-sipariş bağlantısını kaldır
  const handleUnlinkOrder = async () => {
    if (!selectedMail) return;

    setIsLinkingOrder(true);
    try {
      const response = await fetch(`/api/mails/${selectedMail.id}/link-order`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Bağlantı kaldırılamadı');

      // Mail listesini ve seçili maili güncelle
      const updatedMail = {
        ...selectedMail,
        matchedOrderNumber: null,
        isMatchedWithOrder: false
      };
      setSelectedMail(updatedMail);
      setMails(mails.map(m => m.id === selectedMail.id ? updatedMail : m));
      setSelectedOrderNumber("");

      console.log('✅ Sipariş bağlantısı kaldırıldı');
    } catch (error) {
      console.error('Bağlantı kaldırılırken hata:', error);
      alert('Bağlantı kaldırılamadı: ' + (error as Error).message);
    } finally {
      setIsLinkingOrder(false);
    }
  };

  // Mail-iade eşleştirme fonksiyonu
  const handleLinkReturn = async (returnNumber: string) => {
    if (!selectedMail || !returnNumber) return;

    setIsLinkingReturn(true);
    try {
      const response = await fetch(`/api/mails/${selectedMail.id}/link-return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnNumber }),
      });

      if (!response.ok) throw new Error('İade bağlanamadı');

      const data = await response.json();

      // Mail listesini ve seçili maili güncelle
      const updatedMail = {
        ...selectedMail,
        matchedReturnNumber: data.matchedReturnNumber || returnNumber,
        matchedReturnId: data.matchedReturnId
      };
      setSelectedMail(updatedMail);
      setMails(mails.map(m => m.id === selectedMail.id ? updatedMail : m));
      setSelectedReturnNumber(data.matchedReturnNumber || returnNumber);

      console.log('✅ Mail iadeye bağlandı:', returnNumber);
    } catch (error) {
      console.error('İade bağlanırken hata:', error);
      alert('İade bağlanamadı: ' + (error as Error).message);
    } finally {
      setIsLinkingReturn(false);
    }
  };

  // Mail-iade bağlantısını kaldır
  const handleUnlinkReturn = async () => {
    if (!selectedMail) return;

    setIsLinkingReturn(true);
    try {
      const response = await fetch(`/api/mails/${selectedMail.id}/link-return`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Bağlantı kaldırılamadı');

      // Mail listesini ve seçili maili güncelle
      const updatedMail = {
        ...selectedMail,
        matchedReturnNumber: null,
        matchedReturnId: null
      };
      setSelectedMail(updatedMail);
      setMails(mails.map(m => m.id === selectedMail.id ? updatedMail : m));
      setSelectedReturnNumber("");

      console.log('✅ İade bağlantısı kaldırıldı');
    } catch (error) {
      console.error('Bağlantı kaldırılırken hata:', error);
      alert('Bağlantı kaldırılamadı: ' + (error as Error).message);
    } finally {
      setIsLinkingReturn(false);
    }
  };


  const handleQuickSend = async () => {
    if (!selectedMail) return;

    setIsSending(true);

    try {
      // Önerilen cevap template'i
      const suggestedReply = `Sayın Müşterimiz,

Talebiniz için teşekkür ederiz. Siparişinizin durumunu inceledik ve size güncel bilgileri sunmak isteriz.

Siparişiniz ${selectedMail.suggestedOrderIds?.[0] || 'sistemimizde'} kayıtlı olup, kargo sürecindedir. En kısa sürede size ulaştırılacaktır.

Herhangi bir sorunuz olursa lütfen bizimle iletişime geçmekten çekinmeyin.

Saygılarımızla,
Müşteri Hizmetleri`;

      const response = await fetch("/api/mails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: selectedMail.fromEmail,
          subject: `Re: ${selectedMail.subject}`,
          text: suggestedReply,
          originalMailId: selectedMail.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Mail gönderilemedi");
      }

      alert("Mail başarıyla gönderildi!");

      // Mailleri yeniden yükle
      loadMails();
    } catch (error) {
      console.error("Error sending mail:", error);
      alert("Mail gönderilirken hata oluştu: " + (error as Error).message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Mailler</h2>
          <div className="flex gap-2 items-center">
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI Analiz Aktif
            </Badge>

            {/* Otomatik yenileme durumu */}
            {autoRefreshEnabled && (
              <Badge
                variant="secondary"
                className="gap-1 bg-green-100 text-green-700 border-green-300"
              >
                <RefreshCw className={cn("h-3 w-3", isFetchingNewMails && "animate-spin")} />
                Otomatik Yenileme
                {lastFetchTime && (
                  <span className="text-xs opacity-70">
                    ({format(lastFetchTime, 'HH:mm', { locale: tr })})
                  </span>
                )}
              </Badge>
            )}

            {/* Otomatik yenileme toggle */}
            <Button
              variant={autoRefreshEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              title={autoRefreshEnabled ? "Otomatik yenilemeyi kapat" : "Otomatik yenilemeyi aç"}
            >
              <RefreshCw className={cn("h-4 w-4", autoRefreshEnabled && "animate-spin")} />
            </Button>

            {/* Manuel yenileme */}
            <Button
              variant="outline"
              size="sm"
              onClick={loadMails}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Mail Listesi */}
              <Card className="lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle>Gelen Kutusu</CardTitle>
                  <CardDescription>
                    {searchQuery ? `${filteredMails.length} / ${mails.length} mail` : `${mails.length} mail`}
                  </CardDescription>
                  {/* Arama Kutusu */}
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Mail ara (gönderen, konu, içerik)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y max-h-[calc(100vh-300px)] overflow-y-auto">
                    {filteredMails.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">
                          {searchQuery ? "Aramanızla eşleşen mail bulunamadı" : "Henüz mail yok"}
                        </p>
                      </div>
                    ) : (
                    filteredMails.map((mail) => (
                      <div
                        key={mail.id}
                        onClick={() => setSelectedMail(mail)}
                        className={cn(
                          "p-4 cursor-pointer hover:bg-accent transition-colors",
                          selectedMail?.id === mail.id && "bg-accent"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="font-medium text-sm truncate flex items-center gap-1">
                            {mail.fromEmail}
                            {mail.matchedOrderNumber && (
                              <span title={`Sipariş: #${mail.matchedOrderNumber}`}>
                                <Link2 className="h-3 w-3 text-green-600" />
                              </span>
                            )}
                            {mail.matchedReturnNumber && (
                              <span title={`İade: ${mail.matchedReturnNumber}`}>
                                <Undo2 className="h-3 w-3 text-orange-600" />
                              </span>
                            )}
                          </span>
                          <Badge
                            className={cn("text-xs", statusColors[mail.status as keyof typeof statusColors])}
                            variant="default"
                          >
                            {statusLabels[mail.status as keyof typeof statusLabels]}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-sm mb-1 truncate">
                          {mail.subject}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {mail.bodyText.substring(0, 100)}...
                        </p>
                        <div className="flex items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-muted-foreground">
                              {mail.receivedAt ? format(new Date(mail.receivedAt), "dd MMM HH:mm", { locale: tr }) : format(new Date(mail.createdAt), "dd MMM HH:mm", { locale: tr })}
                            </span>
                            {mail.labels && mail.labels.length > 0 && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                {mail.labels.slice(0, 2).map((label, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs px-1 py-0 h-4">
                                    {label}
                                  </Badge>
                                ))}
                                {mail.labels.length > 2 && (
                                  <span className="text-muted-foreground">+{mail.labels.length - 2}</span>
                                )}
                              </>
                            )}
                          </div>
                          {mail.priority === "HIGH" && (
                            <AlertCircle className={cn("h-3 w-3", priorityColors.HIGH)} />
                          )}
                        </div>
                      </div>
                    ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Mail Detay */}
              <Card className="lg:col-span-2">
                {selectedMail ? (
                  <>
                    {/* Mail Header - Compact */}
                    <div className="border-b">
                      <div className="p-4 pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold truncate">{selectedMail.subject}</h3>
                            <div className="flex items-center gap-2 mt-1 text-sm">
                              <span className="font-medium">{selectedMail.fromEmail}</span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-muted-foreground">
                                {selectedMail.receivedAt
                                  ? format(new Date(selectedMail.receivedAt), "dd MMM yyyy, HH:mm", { locale: tr })
                                  : format(new Date(selectedMail.createdAt), "dd MMM yyyy, HH:mm", { locale: tr })}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge className={statusColors[selectedMail.status as keyof typeof statusColors]}>
                              {statusLabels[selectedMail.status as keyof typeof statusLabels]}
                            </Badge>
                            {selectedMail.aiCategory && (
                              <Badge variant="outline" className="text-xs">
                                {categoryLabels[selectedMail.aiCategory as keyof typeof categoryLabels]}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Labels/Folders Row */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {selectedMail.labels && selectedMail.labels.map((label, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs group">
                              <Folder className="h-3 w-3 mr-1" />
                              {label}
                              <button
                                onClick={() => handleRemoveLabel(label)}
                                className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          {selectedMail.flags?.includes('\\Flagged') && (
                            <Badge variant="destructive" className="text-xs">🚩</Badge>
                          )}
                        </div>
                      </div>

                      {/* Quick Actions Toolbar */}
                      <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
                        <Button
                          size="sm"
                          onClick={generateAiReply}
                          disabled={isGeneratingReply}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        >
                          {isGeneratingReply ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4 mr-2" />
                          )}
                          AI Cevap
                        </Button>

                        {/* Sipariş Bul / Bağla */}
                        {!selectedMail.matchedOrderNumber ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const fullText = `${selectedMail.subject} ${selectedMail.bodyText}`;
                              const patterns = [
                                /#(\d{4,})/i,
                                /(\d{4,})\s*numaralı\s*sipariş/i,
                                /sipariş\s*(?:no|numarası)?:?\s*#?(\d{4,})/i,
                                /(\d{4,})\s*(?:nolu|numaralı)\s*order/i,
                                /order\s*(?:no|number)?:?\s*#?(\d{4,})/i,
                              ];
                              for (const pattern of patterns) {
                                const match = fullText.match(pattern);
                                if (match?.[1]) {
                                  // Sipariş bulundu - otomatik bağla
                                  handleLinkOrder(match[1]);
                                  setOrderDetailOpen(true);
                                  return;
                                }
                              }
                              alert('Mail içeriğinde sipariş numarası bulunamadı.');
                            }}
                            disabled={isLinkingOrder}
                          >
                            {isLinkingOrder ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Package className="h-4 w-4 mr-2" />
                            )}
                            Sipariş Bul
                          </Button>
                        ) : null}

                        {/* İade Bul / Bağla */}
                        {!selectedMail.matchedReturnNumber ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const fullText = `${selectedMail.subject} ${selectedMail.bodyText}`;
                              // İade numarası pattern'leri
                              const returnPatterns = [
                                /RET-(\d+-[A-Z0-9]+)/i,
                                /iade\s*(?:no|numarası)?:?\s*#?([A-Z0-9-]+)/i,
                                /return\s*(?:no|number)?:?\s*#?([A-Z0-9-]+)/i,
                              ];
                              for (const pattern of returnPatterns) {
                                const match = fullText.match(pattern);
                                if (match?.[1]) {
                                  handleLinkReturn(match[1]);
                                  return;
                                }
                              }
                              // İade numarası bulunamadıysa, sipariş numarasından iade ara
                              if (selectedMail.matchedOrderNumber) {
                                // Sipariş numarasıyla ilişkili iade var mı kontrol et
                                handleLinkReturn(selectedMail.matchedOrderNumber);
                                return;
                              }
                              alert('Mail içeriğinde iade numarası bulunamadı.');
                            }}
                            disabled={isLinkingReturn}
                          >
                            {isLinkingReturn ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Undo2 className="h-4 w-4 mr-2" />
                            )}
                            İade Bul
                          </Button>
                        ) : null}

                        <Button size="sm" variant="outline" onClick={() => setReplyDialogOpen(true)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Cevap Yaz
                        </Button>

                        {/* Klasör Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <FolderPlus className="h-4 w-4 mr-2" />
                              Klasör
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="max-h-80 overflow-y-auto">
                            <DropdownMenuLabel>Yaygın Klasörler</DropdownMenuLabel>
                            {commonLabels.map((label) => (
                              <DropdownMenuItem
                                key={label}
                                onClick={() => handleAddLabel(label)}
                                disabled={selectedMail.labels?.includes(label)}
                              >
                                <Folder className="h-4 w-4 mr-2" />
                                {label}
                              </DropdownMenuItem>
                            ))}
                            {existingLabels.length > 0 && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>IMAP Klasörleri</DropdownMenuLabel>
                                {existingLabels.map((label) => (
                                  <DropdownMenuItem
                                    key={label}
                                    onClick={() => handleAddLabel(label)}
                                    disabled={selectedMail.labels?.includes(label)}
                                  >
                                    <Folder className="h-4 w-4 mr-2" />
                                    {label}
                                  </DropdownMenuItem>
                                ))}
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <div className="p-2">
                              <Input
                                placeholder="Özel klasör adı..."
                                value={newLabelInput}
                                onChange={(e) => setNewLabelInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && newLabelInput.trim()) {
                                    handleAddLabel(newLabelInput.trim());
                                  }
                                }}
                                className="h-8 text-xs"
                              />
                              <Button
                                size="sm"
                                onClick={() => newLabelInput.trim() && handleAddLabel(newLabelInput.trim())}
                                disabled={!newLabelInput.trim() || isAddingLabel}
                                className="w-full mt-2 h-7"
                              >
                                {isAddingLabel ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Ekle'}
                              </Button>
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Linked Order Badge - Eşleştirilmiş Sipariş */}
                        {selectedMail.matchedOrderNumber && (
                          <Badge
                            variant="default"
                            className="cursor-pointer bg-green-600 hover:bg-green-700 transition-colors py-1.5 px-3 group"
                            onClick={() => setOrderDetailOpen(true)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            #{selectedMail.matchedOrderNumber}
                            <ChevronRight className="h-3 w-3 ml-1" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnlinkOrder();
                              }}
                              className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Bağlantıyı kaldır"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )}

                        {/* Detected but not linked Order Badge */}
                        {selectedOrderNumber && !selectedMail.matchedOrderNumber && (
                          <Badge
                            variant="secondary"
                            className="cursor-pointer hover:bg-blue-100 transition-colors py-1.5 px-3"
                            onClick={() => setOrderDetailOpen(true)}
                          >
                            <Package className="h-3 w-3 mr-1" />
                            #{selectedOrderNumber}
                            <ChevronRight className="h-3 w-3 ml-1" />
                          </Badge>
                        )}

                        {/* AI Suggested Orders - sadece eşleşmemiş maillerde göster */}
                        {!selectedMail.matchedOrderNumber && selectedMail.suggestedOrderIds?.filter(o => o !== selectedOrderNumber).map((orderNo) => (
                          <Badge
                            key={orderNo}
                            variant="outline"
                            className="cursor-pointer hover:bg-blue-50 transition-colors"
                            onClick={() => {
                              // Seç ve bağla
                              handleLinkOrder(orderNo);
                              setOrderDetailOpen(true);
                            }}
                          >
                            #{orderNo}
                            <ChevronRight className="h-3 w-3 ml-1" />
                          </Badge>
                        ))}

                        {/* Linked Return Badge - Eşleştirilmiş İade */}
                        {selectedMail.matchedReturnNumber && (
                          <Badge
                            variant="default"
                            className="cursor-pointer bg-orange-600 hover:bg-orange-700 transition-colors py-1.5 px-3 group"
                            onClick={() => {
                              // İade detay sayfasına git
                              window.open(`/dashboard/returns/${selectedMail.matchedReturnId}`, '_blank');
                            }}
                          >
                            <Undo2 className="h-3 w-3 mr-1" />
                            {selectedMail.matchedReturnNumber}
                            <ChevronRight className="h-3 w-3 ml-1" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnlinkReturn();
                              }}
                              className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Bağlantıyı kaldır"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Mail Content */}
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        {/* Mail Body */}
                        <div className="border rounded-lg p-4 bg-muted/30 max-h-[300px] overflow-y-auto">
                          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                            {selectedMail.bodyText}
                          </pre>
                        </div>

                        {/* AI Generated Reply Section */}
                        {aiSuggestedReply && (
                          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="h-4 w-4 text-blue-600" />
                                  <span className="font-semibold text-sm">AI Önerisi</span>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={generateAiReply}
                                    disabled={isGeneratingReply}
                                    title="Yeniden oluştur"
                                  >
                                    <RefreshCw className={cn("h-3 w-3", isGeneratingReply && "animate-spin")} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setAiSuggestedReply("")}
                                    title="Kapat"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-blue-200 max-h-[200px] overflow-y-auto">
                                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
                                  {aiSuggestedReply}
                                </pre>
                              </div>
                              <div className="flex gap-2 mt-3">
                                <Button
                                  size="sm"
                                  onClick={() => setReplyDialogOpen(true)}
                                  className="flex-1"
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Düzenle ve Gönder
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Loading state for AI */}
                        {isGeneratingReply && !aiSuggestedReply && (
                          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-center gap-3">
                                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                                <span className="text-sm text-blue-700">AI cevap oluşturuluyor...</span>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <CardContent className="p-0">
                    <div className="text-center py-16 text-muted-foreground">
                      <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Detaylarını görmek için bir mail seçin</p>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
        </div>

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
