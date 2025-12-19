// Mock data for development - BOŞ (gerçek veriler Supabase'den geliyor)

export const mockMails: any[] = [];

export type MockMail = {
  id: string;
  from: string;
  subject: string;
  preview: string;
  body: string;
  receivedAt: string;
  status: "NEW" | "OPEN" | "PENDING" | "RESOLVED";
  priority: "LOW" | "NORMAL" | "HIGH";
  isAiAnalyzed: boolean;
  aiCategory: string;
  aiSummary: string;
  suggestedOrderNumbers: string[];
  matchConfidence: number;
};
