"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ticket,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  Mail,
  Package,
  Filter,
  Loader2,
  Plus,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface TicketItem {
  id: string;
  ticketNumber: number;
  subject: string;
  status: string;
  priority: string;
  tags: string[];
  customerEmail: string;
  customerName: string;
  orderNumber: string | null;
  lastActivityAt: string;
  createdAt: string;
  mailCount: number;
  hasUnreplied: boolean;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  OPEN: { label: "Açık", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: AlertCircle },
  WAITING_CUSTOMER: { label: "Müşteri Bekliyor", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", icon: Clock },
  WAITING_INTERNAL: { label: "İç Onay", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: Clock },
  RESOLVED: { label: "Çözüldü", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: CheckCircle2 },
  CLOSED: { label: "Kapalı", color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200", icon: CheckCircle2 },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  LOW: { label: "Düşük", color: "bg-slate-100 text-slate-600" },
  NORMAL: { label: "Normal", color: "bg-blue-100 text-blue-600" },
  HIGH: { label: "Yüksek", color: "bg-orange-100 text-orange-600" },
  URGENT: { label: "Acil", color: "bg-red-100 text-red-600" },
};

interface TicketStats {
  open: number;
  waiting: number;
  resolved: number;
  total: number;
}

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [stats, setStats] = useState<TicketStats>({ open: 0, waiting: 0, resolved: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [grouping, setGrouping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // New Ticket Dialog State
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: "",
    customerName: "",
    customerEmail: "",
    orderNumber: "",
    priority: "NORMAL",
    description: "",
  });

  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<TicketItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk Selection State
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (searchQuery) params.append("search", searchQuery);

      const response = await fetch(`/api/tickets?${params}`);
      const data = await response.json();

      if (data.tickets) {
        setTickets(data.tickets);
      }
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGroupMails = async () => {
    try {
      setGrouping(true);
      const response = await fetch("/api/tickets/group-mails", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        toast.success(`${data.grouped} mail gruplandı, ${data.newTickets} yeni talep oluşturuldu`);
        fetchTickets();
      }
    } catch (error) {
      console.error("Error grouping mails:", error);
    } finally {
      setGrouping(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!newTicket.subject.trim()) {
      toast.error("Konu alanı zorunludur");
      return;
    }

    try {
      setCreating(true);
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: newTicket.subject,
          customerName: newTicket.customerName || undefined,
          customerEmail: newTicket.customerEmail || undefined,
          orderNumber: newTicket.orderNumber || undefined,
          priority: newTicket.priority,
          description: newTicket.description || undefined,
        }),
      });

      const data = await response.json();

      if (data.success && data.ticket) {
        // Reset form
        setNewTicket({
          subject: "",
          customerName: "",
          customerEmail: "",
          orderNumber: "",
          priority: "NORMAL",
          description: "",
        });
        setNewTicketOpen(false);

        // Navigate to new ticket
        router.push(`/dashboard/tickets/${data.ticket.id}`);
      } else {
        toast.error("Talep oluşturulamadı: " + (data.error || "Bilinmeyen hata"));
      }
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast.error("Talep oluşturulurken hata oluştu");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, ticket: TicketItem) => {
    e.preventDefault();
    e.stopPropagation();
    setTicketToDelete(ticket);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!ticketToDelete) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/tickets/${ticketToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTickets(tickets.filter((t) => t.id !== ticketToDelete.id));
        setDeleteDialogOpen(false);
        setTicketToDelete(null);
        toast.success("Talep başarıyla silindi");
      } else {
        const data = await response.json();
        toast.error("Silme hatası: " + (data.error || "Bilinmeyen hata"));
      }
    } catch (error) {
      console.error("Error deleting ticket:", error);
      toast.error("Talep silinirken hata oluştu");
    } finally {
      setDeleting(false);
    }
  };

  // Bulk Selection Handlers
  const toggleTicketSelection = (ticketId: string) => {
    const newSelected = new Set(selectedTickets);
    if (newSelected.has(ticketId)) {
      newSelected.delete(ticketId);
    } else {
      newSelected.add(ticketId);
    }
    setSelectedTickets(newSelected);
  };

  const toggleAllTickets = () => {
    if (selectedTickets.size === filteredTickets.length) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(filteredTickets.map(t => t.id)));
    }
  };

  const clearSelection = () => {
    setSelectedTickets(new Set());
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedTickets.size === 0) return;

    setBulkUpdating(true);
    let successCount = 0;
    let errorCount = 0;

    for (const ticketId of selectedTickets) {
      try {
        const response = await fetch(`/api/tickets/${ticketId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} talep güncellendi`);
      fetchTickets();
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} talep güncellenemedi`);
    }

    clearSelection();
    setBulkUpdating(false);
  };

  const handleBulkDelete = async () => {
    if (selectedTickets.size === 0) return;

    const confirmed = window.confirm(
      `${selectedTickets.size} talebi silmek istediğinize emin misiniz?`
    );
    if (!confirmed) return;

    setBulkUpdating(true);
    let successCount = 0;
    let errorCount = 0;

    for (const ticketId of selectedTickets) {
      try {
        const response = await fetch(`/api/tickets/${ticketId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} talep silindi`);
      fetchTickets();
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} talep silinemedi`);
    }

    clearSelection();
    setBulkUpdating(false);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins} dk önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;
    return date.toLocaleDateString("tr-TR");
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      ticket.subject.toLowerCase().includes(query) ||
      ticket.customerEmail?.toLowerCase().includes(query) ||
      ticket.customerName?.toLowerCase().includes(query) ||
      ticket.ticketNumber.toString().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Talepler</h1>
          <p className="text-muted-foreground">Müşteri taleplerini yönetin</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleGroupMails}
            disabled={grouping}
          >
            {grouping ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Mailleri Grupla
          </Button>

          {/* Yeni Talep Dialog */}
          <Dialog open={newTicketOpen} onOpenChange={setNewTicketOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Yeni Talep
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Yeni Talep Oluştur</DialogTitle>
                <DialogDescription>
                  Manuel olarak yeni bir müşteri talebi oluşturun
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Konu */}
                <div className="grid gap-2">
                  <Label htmlFor="subject">Konu *</Label>
                  <Input
                    id="subject"
                    placeholder="Talep konusu..."
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  />
                </div>

                {/* Müşteri Bilgileri */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="customerName">Müşteri Adı</Label>
                    <Input
                      id="customerName"
                      placeholder="Ad Soyad"
                      value={newTicket.customerName}
                      onChange={(e) => setNewTicket({ ...newTicket, customerName: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="customerEmail">E-posta</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      placeholder="ornek@email.com"
                      value={newTicket.customerEmail}
                      onChange={(e) => setNewTicket({ ...newTicket, customerEmail: e.target.value })}
                    />
                  </div>
                </div>

                {/* Sipariş ve Öncelik */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="orderNumber">Sipariş No</Label>
                    <Input
                      id="orderNumber"
                      placeholder="123456"
                      value={newTicket.orderNumber}
                      onChange={(e) => setNewTicket({ ...newTicket, orderNumber: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="priority">Öncelik</Label>
                    <Select
                      value={newTicket.priority}
                      onValueChange={(value) => setNewTicket({ ...newTicket, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Düşük</SelectItem>
                        <SelectItem value="NORMAL">Normal</SelectItem>
                        <SelectItem value="HIGH">Yüksek</SelectItem>
                        <SelectItem value="URGENT">Acil</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Açıklama */}
                <div className="grid gap-2">
                  <Label htmlFor="description">Talep Detayları</Label>
                  <Textarea
                    id="description"
                    placeholder="Müşterinin talebi veya sorunu hakkında detaylı bilgi..."
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setNewTicketOpen(false)}
                  disabled={creating}
                >
                  İptal
                </Button>
                <Button onClick={handleCreateTicket} disabled={creating}>
                  {creating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Talep Oluştur
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          className={`cursor-pointer transition-colors ${statusFilter === "OPEN" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "OPEN" ? "all" : "OPEN")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Açık</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.open}</div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${statusFilter === "WAITING_CUSTOMER" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "WAITING_CUSTOMER" ? "all" : "WAITING_CUSTOMER")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bekliyor</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.waiting}</div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${statusFilter === "RESOLVED" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "RESOLVED" ? "all" : "RESOLVED")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Çözüldü</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.resolved}</div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${statusFilter === "all" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setStatusFilter("all")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Toplam</CardTitle>
            <Ticket className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Talep ara (numara, konu, müşteri)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedTickets.size > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedTickets.size === filteredTickets.length}
                onCheckedChange={toggleAllTickets}
              />
              <span className="text-sm font-medium">
                {selectedTickets.size} talep seçildi
              </span>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Seçimi Temizle
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={bulkUpdating}>
                    {bulkUpdating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Durum Değiştir
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleBulkStatusUpdate("OPEN")}>
                    <AlertCircle className="mr-2 h-4 w-4 text-red-500" />
                    Açık
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStatusUpdate("WAITING_CUSTOMER")}>
                    <Clock className="mr-2 h-4 w-4 text-yellow-500" />
                    Müşteri Bekliyor
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStatusUpdate("RESOLVED")}>
                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                    Çözüldü
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStatusUpdate("CLOSED")}>
                    <CheckCircle2 className="mr-2 h-4 w-4 text-gray-500" />
                    Kapalı
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={bulkUpdating}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Sil ({selectedTickets.size})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tickets List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Ticket className="h-12 w-12 mb-4" />
              <p>Henüz talep yok</p>
              <p className="text-sm">Mailleri gruplamak için yukarıdaki butonu kullanın</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredTickets.map((ticket) => {
                const statusInfo = statusConfig[ticket.status] || statusConfig.OPEN;
                const priorityInfo = priorityConfig[ticket.priority] || priorityConfig.NORMAL;
                const StatusIcon = statusInfo.icon;

                return (
                  <div
                    key={ticket.id}
                    className="flex items-center gap-4 p-4 hover:bg-accent transition-colors"
                  >
                    {/* Checkbox */}
                    <Checkbox
                      checked={selectedTickets.has(ticket.id)}
                      onCheckedChange={() => toggleTicketSelection(ticket.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0"
                    />

                    {/* Link wrapper for rest of content */}
                    <Link
                      href={`/dashboard/tickets/${ticket.id}`}
                      className="flex items-center gap-4 flex-1 min-w-0"
                    >
                      {/* Status Icon */}
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0 ${ticket.hasUnreplied ? "bg-red-100 dark:bg-red-900" : "bg-muted"}`}>
                        <StatusIcon className={`h-5 w-5 ${ticket.hasUnreplied ? "text-red-600" : "text-muted-foreground"}`} />
                      </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">#{ticket.ticketNumber}</span>
                        <h3 className="font-medium truncate">{ticket.subject}</h3>
                        {ticket.hasUnreplied && (
                          <Badge variant="destructive" className="text-xs">Yanıt Bekliyor</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {ticket.customerName || ticket.customerEmail || "Bilinmeyen"}
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

                    {/* Tags */}
                    <div className="hidden md:flex items-center gap-2">
                      {ticket.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Status & Priority */}
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={`${statusInfo.color} text-xs`}>
                        {statusInfo.label}
                      </Badge>
                      {ticket.priority !== "NORMAL" && (
                        <Badge className={`${priorityInfo.color} text-xs`}>
                          {priorityInfo.label}
                        </Badge>
                      )}
                    </div>

                      {/* Time */}
                      <div className="text-sm text-muted-foreground w-24 text-right">
                        {formatTime(ticket.lastActivityAt)}
                      </div>
                    </Link>

                    {/* Delete Button - outside Link */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 flex-shrink-0"
                      onClick={(e) => handleDeleteClick(e, ticket)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Talep Sil</DialogTitle>
            <DialogDescription>
              #{ticketToDelete?.ticketNumber} numaralı talebi silmek istediğinizden emin misiniz?
              Bu işlem geri alınamaz ve ilişkili mailler talepten ayrılacaktır.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
