// AI Mail Yanıt Üretici
import OpenAI from 'openai';
import type { IkasOrder } from '../ikas/client';

function getOpenAIClient(apiKey?: string): OpenAI | null {
  // API key parametresi veya environment variable'dan al
  const key = apiKey || process.env.OPENAI_API_KEY;

  if (!key) {
    return null;
  }

  // Her seferinde yeni client oluştur (API key dinamik olarak Supabase'den geldiği için)
  return new OpenAI({
    apiKey: key,
  });
}

export interface MailResponseRequest {
  mailId?: string; // Mail ID (cache için)
  from: string;
  subject: string;
  body: string;
  category?: string;
  suggestedOrderNumbers?: string[];
  urgentFetch?: boolean; // Acil sorgulama gerekirse (test için)
}

export interface MailResponseResult {
  suggestedResponse: string;
  tone: "professional" | "friendly" | "apologetic";
  confidence: number;
  reasoning: string;
}

export interface AIKnowledgeBase {
  storeInfo?: string;
  shipping?: string;
  campaigns?: string;
  returnPolicy?: string;
  general?: string;
  customPrompt?: string;
}

/**
 * AI ile mail yanıtı oluştur
 */
export async function generateMailResponse(
  request: MailResponseRequest,
  model: string = "gpt-4o-mini",
  apiKey?: string,
  ikasOrder?: IkasOrder | null,
  knowledgeBase?: AIKnowledgeBase
): Promise<MailResponseResult> {
  const openai = getOpenAIClient(apiKey);
  const { category, subject, body, from } = request;

  console.log("📧 Generating mail response:", {
    hasOpenAIClient: !!openai,
    hasApiKey: !!(apiKey || process.env.OPENAI_API_KEY),
    apiKeyLength: (apiKey || process.env.OPENAI_API_KEY)?.length || 0,
    model,
    category,
    hasIkasOrder: !!ikasOrder,
    hasKnowledgeBase: !!(knowledgeBase && (knowledgeBase.storeInfo || knowledgeBase.shipping || knowledgeBase.campaigns || knowledgeBase.returnPolicy || knowledgeBase.general))
  });

  // OpenAI API varsa gerçek AI yanıtı üret
  if (openai) {
    console.log("✅ OpenAI client available, calling API...");
    try {
      // İkas sipariş bilgilerini prompt'a ekle
      let orderInfoText = "";
      if (ikasOrder) {
        orderInfoText = `

Sipariş Bilgileri (İkas'tan):
- Sipariş No: ${ikasOrder.orderNumber}
- Durum: ${ikasOrder.status}
- Tutar: ${ikasOrder.totalPrice} ${ikasOrder.currency}
- Tarih: ${new Date(ikasOrder.createdAt).toLocaleDateString('tr-TR')}
- Ürünler: ${ikasOrder.items.map(item => `${item.name} (${item.quantity} adet)`).join(', ')}
${ikasOrder.shippingInfo ? `- Kargo: ${ikasOrder.shippingInfo.carrier || 'Belirsiz'}
- Takip No: ${ikasOrder.shippingInfo.trackingNumber || 'Henüz atanmadı'}
- Kargo Durumu: ${ikasOrder.shippingInfo.status || 'Hazırlanıyor'}` : '- Kargo bilgisi henüz yok'}`;
      }

      // Bilgi tabanı bölümünü oluştur
      let knowledgeBaseText = "";
      if (knowledgeBase) {
        const sections: string[] = [];

        if (knowledgeBase.storeInfo) {
          sections.push(`Mağaza Bilgileri:\n${knowledgeBase.storeInfo}`);
        }
        if (knowledgeBase.shipping) {
          sections.push(`Kargo ve Teslimat:\n${knowledgeBase.shipping}`);
        }
        if (knowledgeBase.campaigns) {
          sections.push(`Aktif Kampanyalar:\n${knowledgeBase.campaigns}`);
        }
        if (knowledgeBase.returnPolicy) {
          sections.push(`İade Politikası:\n${knowledgeBase.returnPolicy}`);
        }
        if (knowledgeBase.general) {
          sections.push(`Diğer Bilgiler:\n${knowledgeBase.general}`);
        }

        if (sections.length > 0) {
          knowledgeBaseText = `

=== MAĞAZA BİLGİ KAYNAĞI (Bu bilgileri cevaplarda kullan) ===
${sections.join('\n\n')}
=== BİLGİ KAYNAĞI SONU ===`;
        }
      }

      // Varsayılan prompt veya özelleştirilmiş prompt
      const defaultRules = `ÖNEMLİ KURALLAR:
- SADECE mail metnini yaz, başka hiçbir şey ekleme
- Açıklama, ton, skor gibi ekstra bilgiler YAZMA
- "Merhaba" ile başla, "Saygılarımla" veya "İyi günler" ile bitir
- Samimi, yardımsever ve çözüm odaklı ol
- 100-200 kelime arası tut
- Türkçe yaz`;

      const customRules = knowledgeBase?.customPrompt?.trim();
      const rulesSection = customRules || defaultRules;

      const prompt = `Sen bir e-ticaret müşteri hizmetleri temsilcisisin. Aşağıdaki müşteri mailine gönderilmeye hazır bir yanıt yaz.
${knowledgeBaseText}

Müşteri: ${from}
Konu: ${subject}
Mail İçeriği:
${body}${orderInfoText}

${rulesSection}
${ikasOrder ? '- Sipariş bilgilerini (numara, durum, kargo) yanıta dahil et' : ''}
${knowledgeBaseText ? '- Mağaza bilgi kaynağındaki bilgileri (kargo, kampanya, iade politikası) kullan' : ''}`;

      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "system",
            content: "Sen bir e-ticaret müşteri hizmetleri temsilcisisin. SADECE gönderilmeye hazır mail metni üret. Açıklama, ton, skor veya başka ekstra bilgi EKLEME. Yanıtın direkt mail olarak gönderilebilir olmalı."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const aiResponse = completion.choices[0]?.message?.content || "";

      // AI yanıtını parse et
      return {
        suggestedResponse: aiResponse,
        tone: "professional",
        confidence: 0.9,
        reasoning: ikasOrder
          ? "OpenAI ile üretildi (İkas sipariş bilgileri dahil)"
          : "OpenAI ile üretildi"
      };
    } catch (error) {
      console.error("❌ OpenAI API error:", error);
      throw new Error(`OpenAI API çağrısı başarısız: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    }
  } else {
    console.log("❌ OpenAI API key bulunamadı");
    throw new Error("OpenAI API key ayarlanmamış. Lütfen Settings sayfasından API key'inizi ekleyin.");
  }
}

/**
 * Yanıtı kullanıcı tarafından düzenlenmiş halini kaydet
 * (İleride fine-tuning için kullanılabilir)
 */
export async function saveEditedResponse(
  originalResponse: string,
  editedResponse: string,
  mailId: string
) {
  // TODO: Database'e kaydet, OpenAI fine-tuning için kullan
  console.log("Edited response saved for mail:", mailId);
}
