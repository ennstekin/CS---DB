"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  Package,
  Send,
  Loader2,
  StickyNote,
  RefreshCw,
  Sparkles,
  Undo2,
  X,
  ExternalLink,
  Edit,
  Wand2,
} from "lucide-react";
import { OrderDetailDialog } from "@/components/dashboard/order-detail-dialog";
import { stripEmailQuotes, stripEmailQuotesHtml } from "@/lib/utils/strip-email-quotes";

interface TimelineItem {
  id: string;
  type: "mail" | "note" | "event";
  direction?: string;
  title?: string;
  content?: string;
  contentHtml?: string;
  from?: string;
  fromName?: string;
  author?: string;
  isInternal?: boolean;
  isReplied?: boolean;
  eventType?: string;
  data?: any;
  createdAt: string;
}

interface TicketDetail {
  id: string;
  ticketNumber: number;
  subject: string;
  status: string;
  priority: string;
  tags: string[];
  customerEmail: string;
  customerName: string;
  orderNumber: string | null;
  returnId: string | null;
  assignedTo: string | null;
  lastActivityAt: string;
  createdAt: string;
  timeline: TimelineItem[];
  mailCount: number;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Açık", color: "bg-red-100 text-red-800" },
  WAITING_CUSTOMER: { label: "Müşteri Bekliyor", color: "bg-yellow-100 text-yellow-800" },
  WAITING_INTERNAL: { label: "İç Onay", color: "bg-blue-100 text-blue-800" },
  RESOLVED: { label: "Çözüldü", color: "bg-green-100 text-green-800" },
  CLOSED: { label: "Kapalı", color: "bg-gray-100 text-gray-800" },
};

const eventLabels: Record<string, string> = {
  ticket_created: "Talep oluşturuldu",
  status_changed: "Durum değiştirildi",
  mail_received: "Mail alındı",
  mail_sent: "Mail gönderildi",
  reply_sent: "Yanıt gönderildi",
  customer_replied: "Müşteri yanıtladı",
  note_added: "Not eklendi",
  order_linked: "Sipariş bağlandı",
};

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteContent, setNoteContent] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [generatingReply, setGeneratingReply] = useState(false);
  const [aiReply, setAiReply] = useState("");
  const [isEditingReply, setIsEditingReply] = useState(false);
  const [editedReply, setEditedReply] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [updatingAssignee, setUpdatingAssignee] = useState(false);

  // Predefined agents/team members
  const TEAM_MEMBERS = [
    { id: "unassigned", name: "Atanmamış" },
    { id: "agent-1", name: "Müşteri Temsilcisi 1" },
    { id: "agent-2", name: "Müşteri Temsilcisi 2" },
    { id: "supervisor", name: "Süpervizör" },
    { id: "manager", name: "Yönetici" },
  ];

  // Order/Return linking states
  const [isLinkingOrder, setIsLinkingOrder] = useState(false);
  const [isLinkingReturn, setIsLinkingReturn] = useState(false);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);

  useEffect(() => {
    fetchTicket();
  }, [resolvedParams.id]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tickets/${resolvedParams.id}`);
      const data = await response.json();

      if (data.id) {
        setTicket(data);
      }
    } catch (error) {
      console.error("Error fetching ticket:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return;

    try {
      setUpdatingStatus(true);
      await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchTicket();
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAssigneeChange = async (assigneeId: string) => {
    if (!ticket) return;

    try {
      setUpdatingAssignee(true);
      const assignedTo = assigneeId === "unassigned" ? null : assigneeId;
      await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTo }),
      });
      fetchTicket();
    } catch (error) {
      console.error("Error updating assignee:", error);
    } finally {
      setUpdatingAssignee(false);
    }
  };

  const handleAddNote = async () => {
    if (!ticket || !noteContent.trim()) return;

    try {
      setAddingNote(true);
      await fetch(`/api/tickets/${ticket.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: noteContent,
          author: "Temsilci",
          isInternal: true,
        }),
      });
      setNoteContent("");
      fetchTicket();
    } catch (error) {
      console.error("Error adding note:", error);
    } finally {
      setAddingNote(false);
    }
  };

  const handleGenerateAIReply = async () => {
    if (!ticket || ticket.timeline.length === 0) return;

    const lastMail = ticket.timeline.filter((t) => t.type === "mail").pop();
    if (!lastMail) return;

    try {
      setGeneratingReply(true);
      const response = await fetch("/api/ai/generate-reply-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: lastMail.from || ticket.customerEmail,
          subject: ticket.subject,
          body: lastMail.content || "",
        }),
      });

      const data = await response.json();
      if (data.suggestedResponse) {
        setAiReply(data.suggestedResponse);
      }
    } catch (error) {
      console.error("Error generating reply:", error);
    } finally {
      setGeneratingReply(false);
    }
  };

  const handleUnlinkOrder = async () => {
    if (!ticket) return;

    try {
      setIsLinkingOrder(true);
      await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: null }),
      });
      fetchTicket();
    } catch (error) {
      console.error("Error unlinking order:", error);
    } finally {
      setIsLinkingOrder(false);
    }
  };

  const handleUnlinkReturn = async () => {
    if (!ticket) return;

    try {
      setIsLinkingReturn(true);
      await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnId: null }),
      });
      fetchTicket();
    } catch (error) {
      console.error("Error unlinking return:", error);
    } finally {
      setIsLinkingReturn(false);
    }
  };

  // Auto-find order number from timeline content
  const handleAutoFindOrder = async () => {
    if (!ticket) return;

    setIsLinkingOrder(true);
    try {
      // Collect all text from timeline
      const allText = ticket.timeline
        .filter((t) => t.type === "mail")
        .map((t) => `${t.title || ""} ${t.content || ""}`)
        .join(" ");

      // Order number patterns - Türkçe ve İngilizce formatlar
      const patterns = [
        /#(\d{4,})/i,                                              // #12345
        /sipariş\s*(?:no|numarası|numaram|num)?:?\s*#?(\d{4,})/i,  // sipariş no/numarası/numaram: 12345
        /siparişim\s*:?\s*#?(\d{4,})/i,                            // siparişim 12345
        /(\d{4,})\s*numaralı\s*sipariş/i,                          // 12345 numaralı sipariş
        /(\d{4,})\s*(?:nolu|numaralı)\s*(?:sipariş|order)/i,       // 12345 nolu sipariş
        /order\s*(?:no|number|id)?:?\s*#?(\d{4,})/i,               // order no/number/id: 12345
        /(?:no|numara|number|id)\s*:?\s*#?(\d{4,})/i,              // no: 12345, numara: 12345
      ];

      for (const pattern of patterns) {
        const match = allText.match(pattern);
        if (match?.[1]) {
          // Found order number - link it
          await fetch(`/api/tickets/${ticket.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderNumber: match[1] }),
          });
          fetchTicket();
          return;
        }
      }

      alert("Mail içeriğinde sipariş numarası bulunamadı.");
    } catch (error) {
      console.error("Error auto-finding order:", error);
    } finally {
      setIsLinkingOrder(false);
    }
  };

  // Auto-find return number from timeline content
  const handleAutoFindReturn = async () => {
    if (!ticket) return;

    setIsLinkingReturn(true);
    try {
      // Collect all text from timeline
      const allText = ticket.timeline
        .filter((t) => t.type === "mail")
        .map((t) => `${t.title || ""} ${t.content || ""}`)
        .join(" ");

      // Return number patterns
      const patterns = [
        /RET-(\d+-[A-Z0-9]+)/i,
        /iade\s*(?:no|numarası)?:?\s*#?([A-Z0-9-]+)/i,
        /return\s*(?:no|number)?:?\s*#?([A-Z0-9-]+)/i,
      ];

      for (const pattern of patterns) {
        const match = allText.match(pattern);
        if (match?.[1]) {
          await fetch(`/api/tickets/${ticket.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ returnId: match[1] }),
          });
          fetchTicket();
          return;
        }
      }

      // If order is linked, search for return by order number in database
      if (ticket.orderNumber) {
        // Try to find return in database by order number
        const searchResponse = await fetch(`/api/returns?orderNumber=${ticket.orderNumber}&limit=1`);
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.returns && searchData.returns.length > 0) {
            const foundReturn = searchData.returns[0];
            await fetch(`/api/tickets/${ticket.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ returnId: foundReturn.id }),
            });
            fetchTicket();
            return;
          }
        }
      }

      alert("Bu sipariş için iade talebi bulunamadı.");
    } catch (error) {
      console.error("Error auto-finding return:", error);
    } finally {
      setIsLinkingReturn(false);
    }
  };

  // Send AI reply
  const handleSendReply = async () => {
    if (!ticket) return;

    const replyText = isEditingReply ? editedReply : aiReply;
    if (!replyText.trim()) return;

    setIsSendingReply(true);
    try {
      const response = await fetch("/api/mails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: ticket.customerEmail,
          subject: `Re: ${ticket.subject}`,
          text: replyText,
          ticketId: ticket.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Mail gönderilemedi");
      }

      alert("Mail başarıyla gönderildi!");
      setAiReply("");
      setEditedReply("");
      setIsEditingReply(false);
      fetchTicket();
    } catch (error) {
      console.error("Error sending reply:", error);
      alert("Mail gönderilirken hata: " + (error as Error).message);
    } finally {
      setIsSendingReply(false);
    }
  };

  // Start editing reply
  const handleStartEditReply = () => {
    setEditedReply(aiReply);
    setIsEditingReply(true);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-muted-foreground">Talep bulunamadı</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Geri Dön
        </Button>
      </div>
    );
  }

  const statusInfo = statusConfig[ticket.status] || statusConfig.OPEN;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">#{ticket.ticketNumber}</span>
              <h1 className="text-xl font-semibold">{ticket.subject}</h1>
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {ticket.customerName || ticket.customerEmail}
              </span>
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {ticket.mailCount} mail
              </span>
              {ticket.orderNumber && (
                <span className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  {ticket.orderNumber}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {ticket.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}

          {/* Assignee Select */}
          <Select
            value={ticket.assignedTo || "unassigned"}
            onValueChange={handleAssigneeChange}
            disabled={updatingAssignee}
          >
            <SelectTrigger className="w-44">
              <User className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Atanmamış" />
            </SelectTrigger>
            <SelectContent>
              {TEAM_MEMBERS.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Select */}
          <Select
            value={ticket.status}
            onValueChange={handleStatusChange}
            disabled={updatingStatus}
          >
            <SelectTrigger className={`w-44 ${statusInfo.color}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">Açık</SelectItem>
              <SelectItem value="WAITING_CUSTOMER">Müşteri Bekliyor</SelectItem>
              <SelectItem value="WAITING_INTERNAL">İç Onay</SelectItem>
              <SelectItem value="RESOLVED">Çözüldü</SelectItem>
              <SelectItem value="CLOSED">Kapalı</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Timeline - Main Content */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Konuşma Geçmişi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket.timeline.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Henüz aktivite yok
                </p>
              ) : (
                <div className="space-y-4">
                  {ticket.timeline.map((item) => (
                    <div key={item.id} className="relative pl-6">
                      {/* Timeline line */}
                      <div className="absolute left-2 top-3 bottom-0 w-px bg-border" />

                      {/* Timeline dot */}
                      <div className={`absolute left-0 top-2 h-4 w-4 rounded-full border-2 ${
                        item.type === "mail" && item.direction === "outbound"
                          ? "bg-green-100 border-green-500"
                          : item.type === "mail"
                          ? "bg-blue-100 border-blue-500"
                          : item.type === "note"
                          ? "bg-yellow-100 border-yellow-500"
                          : "bg-gray-100 border-gray-400"
                      }`} />

                      {/* Content */}
                      <div className={`rounded-lg border p-4 ${
                        item.type === "mail" && item.direction === "outbound"
                          ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                          : item.type === "mail"
                          ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
                          : item.type === "note"
                          ? "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800"
                          : "bg-muted border-border"
                      }`}>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {item.type === "mail" && (
                              <>
                                {item.direction === "outbound" ? (
                                  <Send className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Mail className="h-4 w-4 text-blue-600" />
                                )}
                                <span className="font-medium">
                                  {item.direction === "outbound" ? "Yanıt gönderildi" : (item.fromName || item.from || "Müşteri")}
                                </span>
                                {item.direction !== "outbound" && item.isReplied && (
                                  <Badge variant="outline" className="text-xs">Yanıtlandı</Badge>
                                )}
                              </>
                            )}
                            {item.type === "note" && (
                              <>
                                <StickyNote className="h-4 w-4 text-yellow-600" />
                                <span className="font-medium">{item.author || "Not"}</span>
                                {item.isInternal && (
                                  <Badge variant="secondary" className="text-xs">İç Not</Badge>
                                )}
                              </>
                            )}
                            {item.type === "event" && (
                              <>
                                {item.eventType === "reply_sent" ? (
                                  <Send className="h-4 w-4 text-green-600" />
                                ) : (
                                  <RefreshCw className="h-4 w-4 text-gray-500" />
                                )}
                                <span className="font-medium">
                                  {eventLabels[item.eventType || ""] || item.eventType}
                                </span>
                              </>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(item.createdAt)}
                          </span>
                        </div>

                        {/* Body */}
                        {item.type === "mail" && item.contentHtml ? (
                          <div
                            className="text-sm prose prose-sm max-w-none dark:prose-invert"
                            dangerouslySetInnerHTML={{ __html: stripEmailQuotesHtml(item.contentHtml) }}
                          />
                        ) : item.type === "mail" && item.content ? (
                          <div className="text-sm whitespace-pre-wrap">
                            {stripEmailQuotes(item.content)}
                          </div>
                        ) : item.content ? (
                          <div className="text-sm whitespace-pre-wrap">
                            {item.content}
                          </div>
                        ) : null}

                        {/* Event data */}
                        {item.type === "event" && item.data && (
                          <div className="text-sm">
                            {item.data.new_status && (
                              <span className="text-muted-foreground">
                                Yeni durum: {statusConfig[item.data.new_status]?.label || item.data.new_status}
                              </span>
                            )}
                            {item.data.content && (
                              <div className="mt-2 whitespace-pre-wrap bg-green-50 dark:bg-green-950 rounded p-3 border border-green-200 dark:border-green-800">
                                {item.data.content}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Note */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <StickyNote className="h-4 w-4" />
                Not Ekle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="İç not yazın (sadece ekip görür)..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={3}
              />
              <Button
                onClick={handleAddNote}
                disabled={addingNote || !noteContent.trim()}
              >
                {addingNote ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Not Ekle
              </Button>
            </CardContent>
          </Card>

          {/* AI Reply */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI Yanıt Önerisi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {aiReply ? (
                <>
                  {isEditingReply ? (
                    <Textarea
                      value={editedReply}
                      onChange={(e) => setEditedReply(e.target.value)}
                      rows={8}
                      className="font-sans text-sm"
                    />
                  ) : (
                    <div className="rounded-lg border bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 p-4">
                      <p className="text-sm whitespace-pre-wrap">{aiReply}</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    {isEditingReply ? (
                      <>
                        <Button
                          onClick={handleSendReply}
                          disabled={isSendingReply || !editedReply.trim()}
                          className="flex-1"
                        >
                          {isSendingReply ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="mr-2 h-4 w-4" />
                          )}
                          Gönder
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsEditingReply(false);
                            setEditedReply("");
                          }}
                        >
                          <X className="mr-2 h-4 w-4" />
                          İptal
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={handleSendReply}
                          disabled={isSendingReply}
                          className="flex-1"
                        >
                          {isSendingReply ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="mr-2 h-4 w-4" />
                          )}
                          Gönder
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleStartEditReply}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Düzenle
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setAiReply("")}
                          title="Kapat"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  AI ile yanıt önerisi almak için butona tıklayın
                </p>
              )}
              <Button
                variant="outline"
                onClick={handleGenerateAIReply}
                disabled={generatingReply}
              >
                {generatingReply ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {aiReply ? "Yeniden Oluştur" : "AI Yanıt Oluştur"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Customer Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Müşteri Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">İsim</p>
                <p className="font-medium">{ticket.customerName || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">E-posta</p>
                <p className="font-medium">{ticket.customerEmail || "-"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Order & Return Linking */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Sipariş & İade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Order Section */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Sipariş</p>
                {ticket.orderNumber ? (
                  <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{ticket.orderNumber}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setOrderDetailOpen(true)}
                        title="Sipariş Detayı"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600"
                        onClick={handleUnlinkOrder}
                        disabled={isLinkingOrder}
                        title="Bağlantıyı Kaldır"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleAutoFindOrder}
                    disabled={isLinkingOrder}
                  >
                    {isLinkingOrder ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4 mr-2" />
                    )}
                    Otomatik Bul
                  </Button>
                )}
              </div>

              {/* Return Section */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">İade</p>
                {ticket.returnId ? (
                  <div className="flex items-center justify-between bg-orange-50 dark:bg-orange-950 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <Undo2 className="h-4 w-4 text-orange-600" />
                      <span className="font-medium">{ticket.returnId}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600"
                        onClick={handleUnlinkReturn}
                        disabled={isLinkingReturn}
                        title="Bağlantıyı Kaldır"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleAutoFindReturn}
                    disabled={isLinkingReturn}
                  >
                    {isLinkingReturn ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4 mr-2" />
                    )}
                    Otomatik Bul
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Zaman Bilgisi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Oluşturulma</p>
                <p className="font-medium">{formatTime(ticket.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Son Aktivite</p>
                <p className="font-medium">{formatTime(ticket.lastActivityAt)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Hızlı İşlemler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleStatusChange("RESOLVED")}
                disabled={ticket.status === "RESOLVED"}
              >
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                Çözüldü Olarak İşaretle
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleStatusChange("WAITING_CUSTOMER")}
                disabled={ticket.status === "WAITING_CUSTOMER"}
              >
                <Clock className="mr-2 h-4 w-4 text-yellow-500" />
                Müşteri Yanıtı Bekle
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleStatusChange("CLOSED")}
                disabled={ticket.status === "CLOSED"}
              >
                <AlertCircle className="mr-2 h-4 w-4 text-gray-500" />
                Talebi Kapat
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Order Detail Dialog */}
      {ticket.orderNumber && (
        <OrderDetailDialog
          open={orderDetailOpen}
          onOpenChange={setOrderDetailOpen}
          orderNumber={ticket.orderNumber}
        />
      )}
    </div>
  );
}
