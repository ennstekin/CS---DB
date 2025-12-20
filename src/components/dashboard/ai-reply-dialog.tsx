"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Send, Edit } from "lucide-react";
import type { MailResponseResult } from "@/lib/ai/mail-responder";

interface Mail {
  id: string;
  fromEmail: string;
  subject: string;
  bodyText: string;
  aiCategory?: string;
  suggestedOrderIds?: string[];
}

interface AiReplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mail: Mail | null;
  initialText?: string;
  onTextClear?: () => void;
}

export function AiReplyDialog({ open, onOpenChange, mail, initialText, onTextClear }: AiReplyDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [aiResponse, setAiResponse] = useState<MailResponseResult | null>(null);
  const [editedResponse, setEditedResponse] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Dialog açıldığında: manuel metin varsa direkt göster, yoksa AI üret
  useEffect(() => {
    if (open && mail) {
      if (initialText && initialText.trim()) {
        // Manuel metin geldi, AI üretme
        setEditedResponse(initialText);
        setIsEditing(true);
        setAiResponse({ suggestedResponse: initialText, tone: 'professional', confidence: 1 } as MailResponseResult);
      } else if (!aiResponse && !isGenerating) {
        // Manuel metin yok, AI üret
        handleGenerateReply();
      }
    }
  }, [open, mail, initialText]);

  // AI yanıt üret
  const handleGenerateReply = async () => {
    if (!mail) return;

    console.log("🚀 Generating AI reply for mail:", {
      fromEmail: mail.fromEmail,
      subject: mail.subject,
      aiCategory: mail.aiCategory,
      hasCategory: !!mail.aiCategory
    });

    setIsGenerating(true);
    setAiResponse(null);

    try {
      const requestBody = {
        from: mail.fromEmail,
        subject: mail.subject,
        body: mail.bodyText,
        category: mail.aiCategory,
      };

      console.log("📤 Sending request to API (v2 - clean):", requestBody);

      const response = await fetch("/api/ai/generate-reply-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate reply");
      }

      const data: MailResponseResult = await response.json();
      setAiResponse(data);
      setEditedResponse(data.suggestedResponse);
      setIsEditing(true);
    } catch (error) {
      console.error("Error generating reply:", error);
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu";
      alert(`Yanıt oluşturulamadı:\n\n${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Mail gönder
  const handleSendReply = async () => {
    if (!mail || !editedResponse) return;

    setIsSending(true);

    try {
      const response = await fetch("/api/mails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: mail.fromEmail,
          subject: `Re: ${mail.subject}`,
          text: editedResponse,
          originalMailId: mail.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send mail");
      }

      const data = await response.json();
      alert(`Mail başarıyla gönderildi!\n\nAlıcı: ${mail.fromEmail}\nKonu: Re: ${mail.subject}`);

      // Dialog'u kapat (handleOpenChange state'i temizleyecek)
      handleOpenChange(false);
    } catch (error) {
      console.error("Error sending mail:", error);
      alert("Mail gönderilirken bir hata oluştu: " + (error as Error).message);
    } finally {
      setIsSending(false);
    }
  };

  const toneLabels = {
    professional: "Profesyonel",
    friendly: "Samimi",
    apologetic: "Özür Dileyen",
  };

  const toneColors = {
    professional: "bg-blue-500",
    friendly: "bg-green-500",
    apologetic: "bg-orange-500",
  };

  // Dialog kapanırken state'i temizle
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      // Dialog kapandığında state'i temizle
      setTimeout(() => {
        setAiResponse(null);
        setEditedResponse("");
        setIsEditing(false);
      }, 300);
      // Manuel metin alanını da temizle
      onTextClear?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            AI Destekli Yanıt Oluştur
          </DialogTitle>
          <DialogDescription>
            {mail && `${mail.fromEmail} adresine yanıt hazırlanıyor`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Orijinal Mail Özeti */}
          {mail && (
            <div className="bg-gray-50 rounded-lg p-4 border">
              <h4 className="font-semibold text-sm mb-2">Orijinal Mail:</h4>
              <p className="text-sm text-gray-600 mb-1">
                <strong>Konu:</strong> {mail.subject}
              </p>
              <p className="text-xs text-gray-500 line-clamp-3">{mail.bodyText}</p>
            </div>
          )}

          {/* Loading State */}
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-muted-foreground">
                AI yanıt hazırlıyor...
              </p>
            </div>
          )}

          {/* AI Yanıt Gösterimi */}
          {aiResponse && (
            <div className="space-y-4">
              {/* Önerilen Cevap */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Önerilen Cevap:</label>

                {isEditing ? (
                  <Textarea
                    value={editedResponse}
                    onChange={(e) => setEditedResponse(e.target.value)}
                    rows={15}
                    className="text-sm"
                  />
                ) : (
                  <div className="border rounded-lg p-4 bg-white max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-sans text-sm">
                      {editedResponse}
                    </pre>
                  </div>
                )}
              </div>

              {/* Hızlı Aksiyon Butonları */}
              <div className="flex gap-2">
                <Button
                  onClick={handleSendReply}
                  disabled={isSending || !editedResponse.trim()}
                  className="flex-1"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Gönderiliyor...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Hızlı Gönder
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(!isEditing)}
                  disabled={isSending}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {isEditing ? "Önizle" : "Düzenle"}
                </Button>
              </div>

              {/* Değişiklik Bildirimi */}
              {editedResponse !== aiResponse.suggestedResponse && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-900">
                    ℹ️ Yanıt düzenlendi
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSending}
          >
            İptal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
