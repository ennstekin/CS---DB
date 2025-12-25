"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AiReplyDialog } from "@/components/dashboard/ai-reply-dialog";
import { OrderDetailDialog } from "@/components/dashboard/order-detail-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { sanitizeHtml } from "@/lib/utils/sanitize";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Mail,
  Clock,
  CheckCircle,
  Sparkles,
  ChevronRight,
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
  Ticket,
  Trash2,
  MoreHorizontal,
  Reply,
  Star,
  Archive,
  Send,
  ExternalLink,
  User,
  Filter,
  ChevronDown,
  Keyboard,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format, formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { useKeyboardShortcuts, KEYBOARD_SHORTCUTS } from "@/hooks/use-keyboard-shortcuts";
import { KeyboardShortcutsDialog } from "@/components/ui/keyboard-shortcuts-dialog";

interface DbMail {
  id: string;
  messageId?: string | null;
  inReplyTo?: string | null;
  fromEmail: string;
  toEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  status: string;
  priority: string;
  direction?: string;
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

interface MailThread {
  id: string;
  subject: string;
  latestMail: DbMail;
  mails: DbMail[];
  mailCount: number;
  hasUnread: boolean;
  participants: string[];
  lastActivityAt: Date;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  NEW: { label: "Yeni", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  OPEN: { label: "Açık", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  PENDING: { label: "Bekliyor", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  RESOLVED: { label: "Çözüldü", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  CLOSED: { label: "Kapandı", color: "text-gray-700", bg: "bg-gray-50 border-gray-200" },
};

const categoryLabels: Record<string, string> = {
  ORDER_INQUIRY: "Sipariş",
  RETURN_REQUEST: "İade",
  POSITIVE_FEEDBACK: "Olumlu",
  WRONG_ITEM: "Yanlış Ürün",
  INVOICE_REQUEST: "Fatura",
  TRACKING_INQUIRY: "Kargo",
  DISCOUNT_ISSUE: "İndirim",
  SIZE_EXCHANGE: "Beden",
};

// Extract name from email
const getNameFromEmail = (email: string): string => {
  // Check if it's formatted like "Name Surname" <email@domain.com>
  const match = email.match(/^"?([^"<]+)"?\s*<?/);
  if (match && match[1] && !match[1].includes('@')) {
    return match[1].trim();
  }
  // Otherwise, use the part before @
  const emailPart = email.match(/<([^>]+)>/)?.[1] || email;
  return emailPart.split('@')[0].replace(/[._-]/g, ' ');
};

// Get initials from name
const getInitials = (name: string): string => {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Get avatar color based on email
const getAvatarColor = (email: string): string => {
  const colors = [
    "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-pink-500",
    "bg-indigo-500", "bg-teal-500", "bg-orange-500", "bg-cyan-500"
  ];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function MailsPage() {
  const router = useRouter();
  const [threads, setThreads] = useState<MailThread[]>([]);
  const [mails, setMails] = useState<DbMail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [isFetchingNewMails, setIsFetchingNewMails] = useState(false);
  const [selectedThread, setSelectedThread] = useState<MailThread | null>(null);
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
  const [isDeletingMail, setIsDeletingMail] = useState(false);
  const [showManualReply, setShowManualReply] = useState(false);
  const [manualReplyText, setManualReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const commonLabels = ["INBOX", "SENT", "DRAFTS", "SPAM", "TRASH", "ARCHIVE", "IMPORTANT", "STARRED"];

  const existingLabels = Array.from(
    new Set(mails.flatMap(mail => mail.labels || []))
  ).filter(label => !commonLabels.includes(label));

  // Filter threads based on status, category, and search
  const filteredThreads = threads.filter((thread) => {
    const latestMail = thread.latestMail;

    // Status filter - check if any mail in thread matches
    if (statusFilter !== "ALL") {
      const hasMatchingStatus = thread.mails.some(m => m.status === statusFilter);
      if (!hasMatchingStatus) return false;
    }

    // Category filter - check latest mail
    if (categoryFilter !== "ALL" && latestMail.aiCategory !== categoryFilter) return false;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return thread.mails.some(mail =>
        mail.fromEmail?.toLowerCase().includes(query) ||
        mail.subject?.toLowerCase().includes(query) ||
        mail.bodyText?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const activeFiltersCount = (statusFilter !== "ALL" ? 1 : 0) + (categoryFilter !== "ALL" ? 1 : 0);

  // Keyboard navigation helpers
  const navigateThread = useCallback((direction: "next" | "prev") => {
    const currentIndex = filteredThreads.findIndex(t => t.id === selectedThread?.id);
    let newIndex: number;

    if (direction === "next") {
      newIndex = currentIndex === -1 ? 0 : Math.min(currentIndex + 1, filteredThreads.length - 1);
    } else {
      newIndex = currentIndex === -1 ? filteredThreads.length - 1 : Math.max(currentIndex - 1, 0);
    }

    const newThread = filteredThreads[newIndex];
    if (newThread) {
      setSelectedThread(newThread);
      setSelectedMail(newThread.latestMail);
    }
  }, [filteredThreads, selectedThread]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    { key: "j", callback: () => navigateThread("next") },
    { key: "k", callback: () => navigateThread("prev") },
    { key: "r", callback: () => selectedMail && setShowManualReply(true) },
    { key: "a", callback: () => selectedMail && !isGeneratingReply && generateAiReply() },
    { key: "/", callback: () => searchInputRef.current?.focus() },
    { key: "Escape", callback: () => {
      if (showManualReply) {
        setShowManualReply(false);
      } else if (shortcutsDialogOpen) {
        setShortcutsDialogOpen(false);
      } else {
        setSelectedThread(null);
        setSelectedMail(null);
      }
    }},
    { key: "?", callback: () => setShortcutsDialogOpen(true) },
  ]);

  useEffect(() => {
    loadMails();
  }, []);

  useEffect(() => {
    // When a thread is selected, set the latest mail as selected
    if (selectedThread) {
      setSelectedMail(selectedThread.latestMail);
    }
  }, [selectedThread]);

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
    setShowManualReply(false);
    setManualReplyText("");
  }, [selectedMail]);

  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const interval = setInterval(() => fetchNewMailsFromImap(), 2 * 60 * 1000);
    fetchNewMailsFromImap();
    return () => clearInterval(interval);
  }, [autoRefreshEnabled]);

  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const interval = setInterval(() => loadMails(), 30 * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshEnabled]);

  const loadMails = async () => {
    setIsLoading(true);
    try {
      // Fetch with thread grouping enabled
      const response = await fetch(`/api/mails?grouped=true`);
      if (response.ok) {
        const data = await response.json();
        if (data.threads) {
          // Parse dates in threads
          const parsedThreads = data.threads.map((thread: MailThread) => ({
            ...thread,
            lastActivityAt: new Date(thread.lastActivityAt),
            latestMail: {
              ...thread.latestMail,
              receivedAt: thread.latestMail.receivedAt ? new Date(thread.latestMail.receivedAt) : undefined,
              createdAt: new Date(thread.latestMail.createdAt),
            },
            mails: thread.mails.map((mail: DbMail) => ({
              ...mail,
              receivedAt: mail.receivedAt ? new Date(mail.receivedAt) : undefined,
              createdAt: new Date(mail.createdAt),
            })),
          }));
          setThreads(parsedThreads);
          // Also set mails array for compatibility
          const allMails = parsedThreads.flatMap((t: MailThread) => t.mails);
          setMails(allMails);
        } else {
          // Fallback to non-threaded response
          const mailsArray = Array.isArray(data) ? data : (data.mails || []);
          setMails(mailsArray);
          setThreads([]);
        }
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
      const response = await fetch('/api/mails/fetch', { method: 'POST' });
      if (response.ok) {
        const result = await response.json();
        setLastFetchTime(new Date());
        if (result.count > 0) await loadMails();
      }
    } catch (error) {
      console.error('Error fetching new mails:', error);
    } finally {
      setIsFetchingNewMails(false);
    }
  };

  const generateAiReply = async () => {
    if (!selectedMail) return;
    setIsGeneratingReply(true);
    setAiSuggestedReply("");

    try {
      const fullText = `${selectedMail.subject} ${selectedMail.bodyText}`;
      const patterns = [/#(\d{4,})/i, /(\d{4,})\s*numaralı\s*sipariş/i, /sipariş\s*(?:no|numarası)?:?\s*#?(\d{4,})/i];

      let orderNumber = '';
      for (const pattern of patterns) {
        const match = fullText.match(pattern);
        if (match?.[1]) { orderNumber = match[1]; break; }
      }

      let orderData = null;
      if (orderNumber) {
        try {
          const orderResponse = await fetch(`/api/orders/${orderNumber}`);
          if (orderResponse.ok) orderData = await orderResponse.json();
        } catch (err) { console.warn('Could not fetch order data:', err); }
      }

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

      if (!response.ok) throw new Error('AI cevap oluşturulamadı');
      const data = await response.json();
      setAiSuggestedReply(data.suggestedResponse || data.response || data.reply || '');
    } catch (error) {
      console.error('Error generating AI reply:', error);
      toast.error('AI cevap oluşturulurken hata oluştu');
    } finally {
      setIsGeneratingReply(false);
    }
  };

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
      setSelectedMail({ ...selectedMail, labels: data.labels });
      setMails(mails.map(m => m.id === selectedMail.id ? { ...m, labels: data.labels } : m));
      setNewLabelInput("");
    } catch (error) {
      toast.error('Label eklenemedi');
    } finally {
      setIsAddingLabel(false);
    }
  };

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
      setSelectedMail({ ...selectedMail, labels: data.labels });
      setMails(mails.map(m => m.id === selectedMail.id ? { ...m, labels: data.labels } : m));
    } catch (error) {
      toast.error('Label silinemedi');
    }
  };

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
      const updatedMail = { ...selectedMail, matchedOrderNumber: orderNumber, isMatchedWithOrder: true };
      setSelectedMail(updatedMail);
      setMails(mails.map(m => m.id === selectedMail.id ? updatedMail : m));
      setSelectedOrderNumber(orderNumber);
      toast.success('Sipariş bağlandı');
    } catch (error) {
      toast.error('Sipariş bağlanamadı');
    } finally {
      setIsLinkingOrder(false);
    }
  };

  const handleUnlinkOrder = async () => {
    if (!selectedMail) return;
    setIsLinkingOrder(true);
    try {
      await fetch(`/api/mails/${selectedMail.id}/link-order`, { method: 'DELETE' });
      const updatedMail = { ...selectedMail, matchedOrderNumber: null, isMatchedWithOrder: false };
      setSelectedMail(updatedMail);
      setMails(mails.map(m => m.id === selectedMail.id ? updatedMail : m));
      setSelectedOrderNumber("");
      toast.success('Sipariş bağlantısı kaldırıldı');
    } catch (error) {
      toast.error('Bağlantı kaldırılamadı');
    } finally {
      setIsLinkingOrder(false);
    }
  };

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
      const updatedMail = { ...selectedMail, matchedReturnNumber: data.matchedReturnNumber || returnNumber, matchedReturnId: data.matchedReturnId };
      setSelectedMail(updatedMail);
      setMails(mails.map(m => m.id === selectedMail.id ? updatedMail : m));
      setSelectedReturnNumber(data.matchedReturnNumber || returnNumber);
      toast.success('İade bağlandı');
    } catch (error) {
      toast.error('İade bağlanamadı');
    } finally {
      setIsLinkingReturn(false);
    }
  };

  const handleUnlinkReturn = async () => {
    if (!selectedMail) return;
    setIsLinkingReturn(true);
    try {
      await fetch(`/api/mails/${selectedMail.id}/link-return`, { method: 'DELETE' });
      const updatedMail = { ...selectedMail, matchedReturnNumber: null, matchedReturnId: null };
      setSelectedMail(updatedMail);
      setMails(mails.map(m => m.id === selectedMail.id ? updatedMail : m));
      setSelectedReturnNumber("");
      toast.success('İade bağlantısı kaldırıldı');
    } catch (error) {
      toast.error('Bağlantı kaldırılamadı');
    } finally {
      setIsLinkingReturn(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!selectedMail) return;
    setIsCreatingTicket(true);
    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: selectedMail.subject,
          customerEmail: selectedMail.fromEmail,
          customerName: getNameFromEmail(selectedMail.fromEmail),
          orderNumber: selectedMail.matchedOrderNumber || null,
          mailId: selectedMail.id,
          tags: selectedMail.aiCategory ? [selectedMail.aiCategory.toLowerCase().replace('_', '-')] : [],
        }),
      });
      if (!response.ok) throw new Error('Talep oluşturulamadı');
      const data = await response.json();
      router.push(`/dashboard/tickets/${data.ticket.id}`);
      toast.success('Talep oluşturuldu');
    } catch (error) {
      toast.error('Talep oluşturulamadı');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const handleDeleteMail = async () => {
    if (!selectedMail || !confirm('Bu maili silmek istediğinizden emin misiniz?')) return;

    const mailIdToDelete = selectedMail.id;
    const currentThreadId = selectedThread?.id;

    setIsDeletingMail(true);

    // Temporarily disable auto-refresh during delete
    setAutoRefreshEnabled(false);

    try {
      const response = await fetch(`/api/mails/${mailIdToDelete}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Mail silinemedi');

      // Clear selection first
      setSelectedMail(null);

      // Check if this was the only mail in the thread
      const currentThread = threads.find(t => t.id === currentThreadId);
      if (currentThread && currentThread.mails.length <= 1) {
        setSelectedThread(null);
      }

      // Reload from database to ensure consistency
      await loadMails();

      // Re-select thread if it still exists (and has remaining mails)
      if (currentThreadId) {
        // Use setTimeout to wait for state update
        setTimeout(() => {
          setThreads(currentThreads => {
            const stillExistingThread = currentThreads.find(t => t.id === currentThreadId);
            if (stillExistingThread && stillExistingThread.mails.length > 0) {
              setSelectedThread(stillExistingThread);
              setSelectedMail(stillExistingThread.latestMail);
            }
            return currentThreads;
          });
        }, 100);
      }
      toast.success('Mail silindi');
    } catch (error) {
      toast.error('Mail silinemedi');
    } finally {
      setIsDeletingMail(false);
      // Re-enable auto-refresh
      setAutoRefreshEnabled(true);
    }
  };

  const findOrderInMail = () => {
    if (!selectedMail) return;
    const fullText = `${selectedMail.subject} ${selectedMail.bodyText}`;
    const patterns = [/#(\d{4,})/i, /(\d{4,})\s*numaralı\s*sipariş/i, /sipariş\s*(?:no|numarası)?:?\s*#?(\d{4,})/i, /order\s*(?:no|number)?:?\s*#?(\d{4,})/i];
    for (const pattern of patterns) {
      const match = fullText.match(pattern);
      if (match?.[1]) {
        handleLinkOrder(match[1]);
        setOrderDetailOpen(true);
        return;
      }
    }
    toast.warning('Mail içeriğinde sipariş numarası bulunamadı');
  };

  const findReturnInMail = () => {
    if (!selectedMail) return;
    const fullText = `${selectedMail.subject} ${selectedMail.bodyText}`;
    const patterns = [/RET-(\d+-[A-Z0-9]+)/i, /iade\s*(?:no|numarası)?:?\s*#?([A-Z0-9-]+)/i];
    for (const pattern of patterns) {
      const match = fullText.match(pattern);
      if (match?.[1]) {
        handleLinkReturn(match[1]);
        return;
      }
    }
    if (selectedMail.matchedOrderNumber) {
      handleLinkReturn(selectedMail.matchedOrderNumber);
      return;
    }
    toast.warning('Mail içeriğinde iade numarası bulunamadı');
  };

  const formatMailDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return format(d, 'HH:mm', { locale: tr });
    if (diffDays === 1) return 'Dün';
    if (diffDays < 7) return format(d, 'EEEE', { locale: tr });
    return format(d, 'd MMM', { locale: tr });
  };

  return (
    <TooltipProvider>
      <div className="h-[calc(100vh-120px)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Gelen Kutusu</h1>
            <p className="text-sm text-muted-foreground">
              {filteredThreads.length} konuşma {searchQuery && `(${threads.length} toplam)`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {lastFetchTime && (
              <span className="text-xs text-muted-foreground">
                Son güncelleme: {format(lastFetchTime, 'HH:mm', { locale: tr })}
              </span>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={autoRefreshEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                >
                  <RefreshCw className={cn("h-4 w-4", (autoRefreshEnabled || isFetchingNewMails) && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {autoRefreshEnabled ? "Otomatik yenileme açık" : "Otomatik yenileme kapalı"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShortcutsDialogOpen(true)}
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Klavye kısayolları (?)
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Mail List - Hidden on mobile when thread selected */}
          <div className={cn(
            "flex flex-col border rounded-lg bg-card",
            "w-full lg:w-[380px] lg:flex-shrink-0",
            selectedThread && "hidden lg:flex"
          )}>
            {/* Search & Filters */}
            <div className="p-3 border-b space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Mail ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 bg-muted/50"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-9 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 px-2.5 relative">
                      <Filter className="h-4 w-4" />
                      {activeFiltersCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center">
                          {activeFiltersCount}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64" align="end">
                    <div className="space-y-4">
                      <div className="font-medium text-sm">Filtreler</div>

                      <div className="space-y-2">
                        <Label className="text-xs">Durum</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">Tümü</SelectItem>
                            <SelectItem value="NEW">Yeni</SelectItem>
                            <SelectItem value="OPEN">Açık</SelectItem>
                            <SelectItem value="PENDING">Bekliyor</SelectItem>
                            <SelectItem value="RESOLVED">Çözüldü</SelectItem>
                            <SelectItem value="CLOSED">Kapandı</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Kategori</Label>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">Tümü</SelectItem>
                            <SelectItem value="ORDER_INQUIRY">Sipariş</SelectItem>
                            <SelectItem value="RETURN_REQUEST">İade</SelectItem>
                            <SelectItem value="TRACKING_INQUIRY">Kargo</SelectItem>
                            <SelectItem value="INVOICE_REQUEST">Fatura</SelectItem>
                            <SelectItem value="WRONG_ITEM">Yanlış Ürün</SelectItem>
                            <SelectItem value="SIZE_EXCHANGE">Beden</SelectItem>
                            <SelectItem value="POSITIVE_FEEDBACK">Olumlu</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {activeFiltersCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => {
                            setStatusFilter("ALL");
                            setCategoryFilter("ALL");
                          }}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Filtreleri Temizle
                        </Button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Active Filters Display */}
              {activeFiltersCount > 0 && (
                <div className="flex flex-wrap gap-1">
                  {statusFilter !== "ALL" && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      {statusConfig[statusFilter]?.label || statusFilter}
                      <button onClick={() => setStatusFilter("ALL")}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {categoryFilter !== "ALL" && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      {categoryLabels[categoryFilter] || categoryFilter}
                      <button onClick={() => setCategoryFilter("ALL")}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Thread Items */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Mail className="h-10 w-10 mb-3 opacity-40" />
                  <p className="text-sm">{searchQuery ? "Sonuç bulunamadı" : "Henüz mail yok"}</p>
                </div>
              ) : (
                filteredThreads.map((thread) => {
                  const latestMail = thread.latestMail;
                  const name = getNameFromEmail(latestMail.fromEmail);
                  const initials = getInitials(name);
                  const avatarColor = getAvatarColor(latestMail.fromEmail);
                  const status = statusConfig[latestMail.status] || statusConfig.NEW;
                  const isSelected = selectedThread?.id === thread.id;
                  const hasUnread = thread.hasUnread;
                  const mailCount = thread.mailCount;

                  return (
                    <div
                      key={thread.id}
                      onClick={() => {
                        setSelectedThread(thread);
                        setSelectedMail(latestMail);
                      }}
                      className={cn(
                        "flex gap-3 p-3 cursor-pointer border-b transition-colors relative",
                        isSelected ? "bg-accent" : "hover:bg-muted/50",
                        hasUnread && !isSelected && "bg-blue-50 dark:bg-blue-950/30 border-l-4 border-l-blue-500"
                      )}
                    >
                      {/* Unread dot indicator */}
                      {hasUnread && !isSelected && (
                        <div className="absolute top-4 left-1 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      )}
                      <Avatar className={cn("h-10 w-10 flex-shrink-0", avatarColor)}>
                        <AvatarFallback className="text-white text-xs font-medium">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className={cn("text-sm truncate", hasUnread && "font-semibold")}>
                            {name}
                          </span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {mailCount > 1 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-medium">
                                {mailCount}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatMailDate(thread.lastActivityAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <h4 className={cn("text-sm truncate", hasUnread && "font-medium")}>
                            {thread.subject}
                          </h4>
                          {latestMail.matchedOrderNumber && (
                            <Link2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {latestMail.bodyText?.substring(0, 80)}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 border", status.bg, status.color)}>
                            {status.label}
                          </Badge>
                          {latestMail.aiCategory && categoryLabels[latestMail.aiCategory] && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                              {categoryLabels[latestMail.aiCategory]}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Mail Detail - Show on mobile only when selected */}
          <div className={cn(
            "flex-1 flex flex-col border rounded-lg bg-card min-w-0",
            !selectedThread && "hidden lg:flex"
          )}>
            {selectedThread && selectedMail ? (
              <>
                {/* Detail Header */}
                <div className="p-4 border-b">
                  {/* Mobile Back Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedThread(null);
                      setSelectedMail(null);
                    }}
                    className="lg:hidden mb-3 -ml-2"
                  >
                    <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
                    Geri
                  </Button>
                  <div className="flex items-start gap-4">
                    <Avatar className={cn("h-12 w-12", getAvatarColor(selectedMail.fromEmail))}>
                      <AvatarFallback className="text-white font-medium">
                        {getInitials(getNameFromEmail(selectedMail.fromEmail))}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold leading-tight">{selectedThread.subject}</h2>
                            {selectedThread.mailCount > 1 && (
                              <Badge variant="secondary" className="text-xs">
                                {selectedThread.mailCount} mesaj
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm">
                            <span className="font-medium">{getNameFromEmail(selectedMail.fromEmail)}</span>
                            <span className="text-muted-foreground">&lt;{selectedMail.fromEmail.match(/<([^>]+)>/)?.[1] || selectedMail.fromEmail}&gt;</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Son aktivite: {format(new Date(selectedThread.lastActivityAt), "d MMMM yyyy, HH:mm", { locale: tr })}
                          </p>
                        </div>
                        <Badge variant="outline" className={cn("border", statusConfig[selectedMail.status]?.bg, statusConfig[selectedMail.status]?.color)}>
                          {statusConfig[selectedMail.status]?.label}
                        </Badge>
                      </div>

                      {/* Labels */}
                      {selectedMail.labels && selectedMail.labels.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {selectedMail.labels.map((label, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs gap-1 group">
                              <Folder className="h-3 w-3" />
                              {label}
                              <button onClick={() => handleRemoveLabel(label)} className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Linked Items */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {selectedMail.matchedOrderNumber && (
                          <Badge
                            className="cursor-pointer bg-green-600 hover:bg-green-700 text-white gap-1 group"
                            onClick={() => setOrderDetailOpen(true)}
                          >
                            <Package className="h-3 w-3" />
                            #{selectedMail.matchedOrderNumber}
                            <ExternalLink className="h-3 w-3" />
                            <button onClick={(e) => { e.stopPropagation(); handleUnlinkOrder(); }} className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )}
                        {selectedMail.matchedReturnNumber && (
                          <Badge
                            className="cursor-pointer bg-orange-600 hover:bg-orange-700 text-white gap-1 group"
                            onClick={() => window.open(`/dashboard/returns/${selectedMail.matchedReturnId}`, '_blank')}
                          >
                            <Undo2 className="h-3 w-3" />
                            {selectedMail.matchedReturnNumber}
                            <ExternalLink className="h-3 w-3" />
                            <button onClick={(e) => { e.stopPropagation(); handleUnlinkReturn(); }} className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-1 px-4 py-2 border-b bg-muted/30">
                  <Button size="sm" onClick={generateAiReply} disabled={isGeneratingReply} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 gap-1.5">
                    {isGeneratingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    <span className="hidden sm:inline">AI Cevap</span>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowManualReply(!showManualReply)} className="gap-1.5">
                    <Reply className="h-4 w-4" />
                    <span className="hidden sm:inline">Cevap Yaz</span>
                  </Button>
                  <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />

                  {!selectedMail.matchedOrderNumber && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="ghost" onClick={findOrderInMail} disabled={isLinkingOrder}>
                          {isLinkingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Sipariş Bul</TooltipContent>
                    </Tooltip>
                  )}

                  {!selectedMail.matchedReturnNumber && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="ghost" onClick={findReturnInMail} disabled={isLinkingReturn}>
                          {isLinkingReturn ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>İade Bul</TooltipContent>
                    </Tooltip>
                  )}

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="ghost" onClick={handleCreateTicket} disabled={isCreatingTicket} className="text-purple-600">
                        {isCreatingTicket ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Talep Oluştur</TooltipContent>
                  </Tooltip>

                  <div className="flex-1" />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <FolderPlus className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Klasöre Ekle</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {commonLabels.slice(0, 4).map((label) => (
                        <DropdownMenuItem key={label} onClick={() => handleAddLabel(label)} disabled={selectedMail.labels?.includes(label)}>
                          <Folder className="h-4 w-4 mr-2" />
                          {label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="ghost" onClick={handleDeleteMail} disabled={isDeletingMail} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        {isDeletingMail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Sil</TooltipContent>
                  </Tooltip>
                </div>

                {/* Manual Reply Section */}
                {showManualReply && (
                  <div className="p-4 border-b bg-muted/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Reply className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">Cevap Yaz</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setShowManualReply(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Cevabınızı buraya yazın..."
                      value={manualReplyText}
                      onChange={(e) => setManualReplyText(e.target.value)}
                      rows={5}
                      className="resize-none mb-3"
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Alıcı: {selectedMail.fromEmail}
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setShowManualReply(false); setManualReplyText(""); }}>
                          İptal
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setReplyDialogOpen(true);
                          }}
                          disabled={!manualReplyText.trim()}
                          className="gap-1.5"
                        >
                          <Send className="h-4 w-4" />
                          Önizle ve Gönder
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Thread Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Show all mails in thread */}
                  {selectedThread.mails.map((mail, index) => {
                    const isOutbound = mail.direction === 'OUTBOUND';
                    const mailName = getNameFromEmail(mail.fromEmail);
                    const mailDate = mail.receivedAt || mail.createdAt;

                    return (
                      <div
                        key={mail.id}
                        className={cn(
                          "rounded-lg border p-4",
                          isOutbound
                            ? "bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                            : "bg-background"
                        )}
                      >
                        {/* Mail Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Avatar className={cn("h-8 w-8", getAvatarColor(mail.fromEmail))}>
                              <AvatarFallback className="text-white text-xs">
                                {getInitials(mailName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{mailName}</span>
                                {isOutbound && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-green-100 text-green-700 border-green-300">
                                    Giden
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(mailDate), "d MMM yyyy, HH:mm", { locale: tr })}
                              </p>
                            </div>
                          </div>
                          {index === selectedThread.mails.length - 1 && !isOutbound && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              Son mesaj
                            </Badge>
                          )}
                        </div>

                        {/* Mail Content */}
                        {mail.bodyHtml ? (
                          <div
                            className="prose prose-sm max-w-none [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded [&_a]:text-blue-600"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(mail.bodyHtml) }}
                          />
                        ) : (
                          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                            {mail.bodyText}
                          </pre>
                        )}
                      </div>
                    );
                  })}

                  {/* AI Reply Section */}
                  {(aiSuggestedReply || isGeneratingReply) && (
                    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-blue-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-sm">AI Önerisi</span>
                          </div>
                          {aiSuggestedReply && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={generateAiReply} disabled={isGeneratingReply}>
                                <RefreshCw className={cn("h-3 w-3", isGeneratingReply && "animate-spin")} />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setAiSuggestedReply("")}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        {isGeneratingReply && !aiSuggestedReply ? (
                          <div className="flex items-center justify-center py-6 gap-3">
                            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                            <span className="text-sm text-blue-700">AI cevap oluşturuluyor...</span>
                          </div>
                        ) : (
                          <>
                            <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-blue-200 max-h-[200px] overflow-y-auto">
                              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                                {aiSuggestedReply}
                              </pre>
                            </div>
                            <Button size="sm" className="w-full mt-3" onClick={() => setReplyDialogOpen(true)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Düzenle ve Gönder
                            </Button>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <Mail className="h-16 w-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">Konuşma seçin</p>
                <p className="text-sm">Detaylarını görmek için sol taraftan bir konuşma seçin</p>
              </div>
            )}
          </div>
        </div>

        {/* Dialogs */}
        <AiReplyDialog
          open={replyDialogOpen}
          onOpenChange={setReplyDialogOpen}
          mail={selectedMail}
          initialText={manualReplyText}
          onTextClear={() => {
            setManualReplyText("");
            setShowManualReply(false);
          }}
        />
        <OrderDetailDialog open={orderDetailOpen} onOpenChange={setOrderDetailOpen} orderNumber={selectedOrderNumber} />
        <KeyboardShortcutsDialog
          open={shortcutsDialogOpen}
          onOpenChange={setShortcutsDialogOpen}
          shortcuts={KEYBOARD_SHORTCUTS.mails}
        />
      </div>
    </TooltipProvider>
  );
}
