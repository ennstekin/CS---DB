"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  RefreshCw,
} from "lucide-react";

interface ActivityLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

interface ActivityLogViewerProps {
  isAdmin?: boolean;
}

const actionColors: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  SEND: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  STATUS_CHANGE: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  LOGIN: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  LOGOUT: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const entityTypeLabels: Record<string, string> = {
  ticket: "Talep",
  mail: "E-posta",
  return: "İade",
  user: "Kullanıcı",
  settings: "Ayarlar",
  order: "Sipariş",
};

const actionLabels: Record<string, string> = {
  CREATE: "Oluştur",
  UPDATE: "Güncelle",
  DELETE: "Sil",
  SEND: "Gönder",
  STATUS_CHANGE: "Durum Değiştir",
  LOGIN: "Giriş",
  LOGOUT: "Çıkış",
  VIEW: "Görüntüle",
  ASSIGN: "Ata",
};

export function ActivityLogViewer({ isAdmin = false }: ActivityLogViewerProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit] = useState(20);

  // Filters
  const [entityType, setEntityType] = useState<string>("all");
  const [action, setAction] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("limit", limit.toString());
      params.set("offset", (page * limit).toString());

      if (entityType !== "all") {
        params.set("entity_type", entityType);
      }
      if (action !== "all") {
        params.set("action", action);
      }

      const res = await fetch(`/api/logs?${params.toString()}`);
      const data = await res.json();

      if (data.error) {
        console.error("Error fetching logs:", data.error);
        return;
      }

      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, entityType, action]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleExportCSV = () => {
    const headers = ["Tarih", "Kullanıcı", "Rol", "Aksiyon", "Tür", "Açıklama"];
    const rows = logs.map((log) => [
      formatDate(log.created_at),
      log.user_email || "-",
      log.user_role || "-",
      actionLabels[log.action] || log.action,
      entityTypeLabels[log.entity_type] || log.entity_type,
      log.description || "-",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `activity-logs-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Aktivite Logları</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Yenile
            </Button>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tür" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Türler</SelectItem>
              <SelectItem value="ticket">Talep</SelectItem>
              <SelectItem value="mail">E-posta</SelectItem>
              <SelectItem value="return">İade</SelectItem>
              <SelectItem value="user">Kullanıcı</SelectItem>
            </SelectContent>
          </Select>

          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Aksiyon" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Aksiyonlar</SelectItem>
              <SelectItem value="CREATE">Oluştur</SelectItem>
              <SelectItem value="UPDATE">Güncelle</SelectItem>
              <SelectItem value="DELETE">Sil</SelectItem>
              <SelectItem value="SEND">Gönder</SelectItem>
              <SelectItem value="STATUS_CHANGE">Durum Değiştir</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Tarih</TableHead>
                <TableHead>Kullanıcı</TableHead>
                <TableHead className="w-[100px]">Aksiyon</TableHead>
                <TableHead className="w-[100px]">Tür</TableHead>
                <TableHead>Açıklama</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Henüz log kaydı yok
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(log.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {log.user_email || "Sistem"}
                        </span>
                        {log.user_role && (
                          <span className="text-xs text-muted-foreground">
                            {log.user_role}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={actionColors[log.action] || ""}
                      >
                        {actionLabels[log.action] || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {entityTypeLabels[log.entity_type] || log.entity_type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{log.description || "-"}</span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-muted-foreground">
              Toplam {total} kayıt
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
