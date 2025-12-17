"use client";

import { useState } from "react";
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
import type { MockMail } from "@/lib/mock-data";
import type { MailResponseResult } from "@/lib/ai/mail-responder";

interface AiReplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mail: MockMail | null;
}

export function AiReplyDialog({ open, onOpenChange, mail }: AiReplyDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [aiResponse, setAiResponse] = useState<MailResponseResult | null>(null);
  const [editedResponse, setEditedResponse] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // AI yanıt üret
  const handleGenerateReply = async () => {
    if (!mail) return;

    setIsGenerating(true);
    setAiResponse(null);

    try {
      const response = await fetch("/api/ai/generate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: mail.from,
          subject: mail.subject,
          body: mail.body,
          category: mail.aiCategory,
          suggestedOrderNumbers: mail.suggestedOrderNumbers,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate reply");

      const data: MailResponseResult = await response.json();
      setAiResponse(data);
      setEditedResponse(data.suggestedResponse);
    } catch (error) {
      console.error("Error generating reply:", error);
      alert("Yanıt oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Mail gönder
  const handleSendReply = async () => {
    if (!mail || !editedResponse) return;

    setIsSending(true);

    try {
      // TODO: Gerçek mail gönderme API'si
      await new Promise(resolve => setTimeout(resolve, 1500));

      alert(`Mail gönderildi!\n\nAlıcı: ${mail.from}\nKonu: Re: ${mail.subject}`);

      // Dialog'u kapat ve state'i temizle
      onOpenChange(false);
      setTimeout(() => {
        setAiResponse(null);
        setEditedResponse("");
        setIsEditing(false);
      }, 300);
    } catch (error) {
      console.error("Error sending mail:", error);
      alert("Mail gönderilirken bir hata oluştu.");
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            AI Destekli Yanıt Oluştur
          </DialogTitle>
          <DialogDescription>
            {mail && `${mail.from} adresine yanıt hazırlanıyor`}
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
              <p className="text-xs text-gray-500 line-clamp-3">{mail.body}</p>
            </div>
          )}

          {/* AI Yanıt Üretme Butonu */}
          {!aiResponse && !isGenerating && (
            <Button
              onClick={handleGenerateReply}
              className="w-full"
              size="lg"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI ile Otomatik Yanıt Oluştur
            </Button>
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
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            İptal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
