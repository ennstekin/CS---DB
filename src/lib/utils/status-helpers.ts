/**
 * Centralized status colors, labels, and helper functions
 * Used across the application for consistent UI
 */

// ==================== MAIL STATUS ====================

export const mailStatusColors: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800",
  OPEN: "bg-yellow-100 text-yellow-800",
  PENDING: "bg-orange-100 text-orange-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-800",
};

export const mailStatusLabels: Record<string, string> = {
  NEW: "Yeni",
  OPEN: "Açık",
  PENDING: "Beklemede",
  RESOLVED: "Çözüldü",
  CLOSED: "Kapalı",
};

// ==================== TICKET STATUS ====================

export const ticketStatusColors: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  WAITING_CUSTOMER: "bg-yellow-100 text-yellow-800",
  WAITING_INTERNAL: "bg-orange-100 text-orange-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-800",
};

export const ticketStatusLabels: Record<string, string> = {
  OPEN: "Açık",
  WAITING_CUSTOMER: "Müşteri Bekliyor",
  WAITING_INTERNAL: "İç Onay Bekliyor",
  RESOLVED: "Çözüldü",
  CLOSED: "Kapalı",
};

// ==================== TICKET PRIORITY ====================

export const ticketPriorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-800",
  NORMAL: "bg-blue-100 text-blue-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
};

export const ticketPriorityLabels: Record<string, string> = {
  LOW: "Düşük",
  NORMAL: "Normal",
  HIGH: "Yüksek",
  URGENT: "Acil",
};

// ==================== RETURN STATUS ====================

export const returnStatusColors: Record<string, string> = {
  REQUESTED: "bg-blue-100 text-blue-800",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  IN_TRANSIT: "bg-purple-100 text-purple-800",
  RECEIVED: "bg-indigo-100 text-indigo-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

export const returnStatusLabels: Record<string, string> = {
  REQUESTED: "Talep Edildi",
  PENDING_APPROVAL: "Onay Bekliyor",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  IN_TRANSIT: "Kargoda",
  RECEIVED: "Teslim Alındı",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal Edildi",
};

// ==================== REFUND STATUS ====================

export const refundStatusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
};

export const refundStatusLabels: Record<string, string> = {
  PENDING: "Bekliyor",
  PROCESSING: "İşleniyor",
  COMPLETED: "Tamamlandı",
  FAILED: "Başarısız",
};

// ==================== ORDER STATUS ====================

export const orderStatusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-indigo-100 text-indigo-800",
  SHIPPED: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  REFUNDED: "bg-gray-100 text-gray-800",
};

export const orderStatusLabels: Record<string, string> = {
  PENDING: "Beklemede",
  CONFIRMED: "Onaylandı",
  PROCESSING: "Hazırlanıyor",
  SHIPPED: "Kargoya Verildi",
  DELIVERED: "Teslim Edildi",
  CANCELLED: "İptal Edildi",
  REFUNDED: "İade Edildi",
};

// ==================== MAIL CATEGORY ====================

export const mailCategoryColors: Record<string, string> = {
  ORDER_INQUIRY: "bg-blue-100 text-blue-800",
  COMPLAINT: "bg-red-100 text-red-800",
  RETURN_REQUEST: "bg-orange-100 text-orange-800",
  SHIPPING_INQUIRY: "bg-purple-100 text-purple-800",
  PRODUCT_QUESTION: "bg-green-100 text-green-800",
  PAYMENT_ISSUE: "bg-yellow-100 text-yellow-800",
  GENERAL: "bg-gray-100 text-gray-800",
};

export const mailCategoryLabels: Record<string, string> = {
  ORDER_INQUIRY: "Sipariş Sorgusu",
  COMPLAINT: "Şikayet",
  RETURN_REQUEST: "İade Talebi",
  SHIPPING_INQUIRY: "Kargo Sorgusu",
  PRODUCT_QUESTION: "Ürün Sorusu",
  PAYMENT_ISSUE: "Ödeme Sorunu",
  GENERAL: "Genel",
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Extract name from email address
 * "John Doe <john@example.com>" -> "John Doe"
 * "john@example.com" -> "john"
 */
export function getNameFromEmail(email: string): string {
  if (!email) return "Bilinmeyen";

  // Check for "Name <email>" format
  const nameMatch = email.match(/"([^"]+)"/);
  if (nameMatch) return nameMatch[1];

  // Check for Name <email> without quotes
  const angleMatch = email.match(/^([^<]+)</);
  if (angleMatch) return angleMatch[1].trim();

  // Just email, extract username
  const atIndex = email.indexOf("@");
  if (atIndex > 0) {
    return email.substring(0, atIndex);
  }

  return email;
}

/**
 * Get initials from name
 * "John Doe" -> "JD"
 * "john" -> "JO"
 */
export function getInitials(name: string): string {
  if (!name) return "??";

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Get consistent avatar color based on email/name
 */
export function getAvatarColor(identifier: string): string {
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-green-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-fuchsia-500",
    "bg-pink-500",
    "bg-rose-500",
  ];

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";

  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";

  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "-";

  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";

  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format relative time
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return "-";

  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Az önce";
  if (diffMins < 60) return `${diffMins} dakika önce`;
  if (diffHours < 24) return `${diffHours} saat önce`;
  if (diffDays < 7) return `${diffDays} gün önce`;

  return formatDate(date);
}

/**
 * Format currency
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = "TRY"
): string {
  if (amount === null || amount === undefined) return "-";

  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return "-";

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(numAmount);
}
