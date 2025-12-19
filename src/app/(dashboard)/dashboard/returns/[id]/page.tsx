"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Package,
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  Plus,
} from "lucide-react";

interface ReturnDetail {
  id: string;
  return_number: string;
  status: string;
  reason: string;
  reason_detail?: string;
  total_refund_amount: number;
  refund_status: string;
  created_at: string;
  updated_at: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
  order: {
    order_number: string;
    ordered_at?: string;
  };
  items?: any[];
  notes?: any[];
  timeline?: any[];
}

export default function ReturnDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [returnData, setReturnData] = useState<ReturnDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchReturnDetail();
    }
  }, [params.id]);

  const fetchReturnDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/returns/${params.id}`);
      const data = await response.json();

      if (data.return) {
        setReturnData(data.return);
      }
    } catch (error) {
      console.error("Error fetching return detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/returns/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          oldStatus: returnData?.status,
        }),
      });

      if (response.ok) {
        fetchReturnDetail();
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;

    try {
      setAddingNote(true);
      const response = await fetch(`/api/returns/${params.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newNote,
          isInternal: true,
        }),
      });

      if (response.ok) {
        setNewNote("");
        fetchReturnDetail();
      }
    } catch (error) {
      console.error("Error adding note:", error);
    } finally {
      setAddingNote(false);
    }
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

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-8 w-64 bg-muted animate-pulse rounded mb-6" />
        <div className="grid gap-6">
          <div className="h-64 bg-muted animate-pulse rounded" />
          <div className="h-96 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (!returnData) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">İade bulunamadı</h1>
        <Button onClick={() => router.push("/dashboard/returns")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          İadelere Dön
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push("/dashboard/returns")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">İade #{returnData.return_number}</h1>
            <p className="text-muted-foreground mt-1">
              Sipariş: {returnData.order.order_number}
            </p>
          </div>
        </div>
        {getStatusBadge(returnData.status)}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Main Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Müşteri Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Ad Soyad</p>
                <p className="font-medium">
                  {returnData.customer.first_name} {returnData.customer.last_name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p>{returnData.customer.email}</p>
              </div>
              {returnData.customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p>{returnData.customer.phone}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Return Details */}
          <Card>
            <CardHeader>
              <CardTitle>İade Detayları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">İade Nedeni</p>
                <p className="font-medium">{returnData.reason}</p>
                {returnData.reason_detail && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {returnData.reason_detail}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">İade Tutarı</p>
                <p className="text-2xl font-bold">{returnData.total_refund_amount} TL</p>
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Oluşturulma</p>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <p className="text-sm">
                      {new Date(returnData.created_at).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Güncelleme</p>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <p className="text-sm">
                      {new Date(returnData.updated_at).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Notlar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Add Note Form */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Not ekle..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addNote()}
                    className="flex-1 px-3 py-2 border rounded-md"
                  />
                  <Button onClick={addNote} disabled={addingNote || !newNote.trim()}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ekle
                  </Button>
                </div>

                {/* Notes List */}
                <div className="space-y-3">
                  {returnData.notes && returnData.notes.length > 0 ? (
                    returnData.notes.map((note: any) => (
                      <div key={note.id} className="p-3 bg-muted rounded-lg">
                        <p className="text-sm">{note.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(note.created_at).toLocaleString("tr-TR")}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Henüz not eklenmemiş
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Timeline & Actions */}
        <div className="space-y-6">
          {/* Status Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Durum Güncelle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => updateStatus("APPROVED")}
                disabled={returnData.status === "APPROVED"}
              >
                Onayla
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => updateStatus("IN_TRANSIT")}
                disabled={returnData.status === "IN_TRANSIT"}
              >
                Kargoya Ver
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => updateStatus("COMPLETED")}
                disabled={returnData.status === "COMPLETED"}
              >
                Tamamla
              </Button>
              <Button
                className="w-full"
                variant="destructive"
                onClick={() => updateStatus("REJECTED")}
                disabled={returnData.status === "REJECTED"}
              >
                Reddet
              </Button>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Zaman Çizelgesi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {returnData.timeline && returnData.timeline.length > 0 ? (
                  returnData.timeline.map((event: any) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <div className="w-px h-full bg-border" />
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm font-medium">{event.description || event.event_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.created_at).toLocaleString("tr-TR")}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Henüz aktivite yok
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
