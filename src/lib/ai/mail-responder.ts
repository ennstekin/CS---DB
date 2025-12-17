// AI Mail Yanıt Üretici
import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export interface MailResponseRequest {
  from: string;
  subject: string;
  body: string;
  category?: string;
  suggestedOrderNumbers?: string[];
}

export interface MailResponseResult {
  suggestedResponse: string;
  tone: "professional" | "friendly" | "apologetic";
  confidence: number;
  reasoning: string;
}

/**
 * AI ile mail yanıtı oluştur
 */
export async function generateMailResponse(
  request: MailResponseRequest
): Promise<MailResponseResult> {
  const openai = getOpenAIClient();
  const { category, subject, body, from } = request;

  // OpenAI API varsa gerçek AI yanıtı üret
  if (openai) {
    try {
      const prompt = `Sen bir e-ticaret müşteri hizmetleri asistanısın. Aşağıdaki müşteri mailini oku ve profesyonel bir yanıt hazırla.

Müşteri: ${from}
Konu: ${subject}
Kategori: ${category || 'Belirsiz'}
Mail İçeriği:
${body}

Lütfen şu formatta yanıt ver:
1. Müşteriye uygun bir mail yanıtı (200-300 kelime)
2. Ton (professional/friendly/apologetic)
3. Güven skoru (0-1 arası)
4. Kısa bir açıklama

Yanıtın samimi, yardımsever ve çözüm odaklı olsun. Türkçe yaz.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Sen yardımsever ve profesyonel bir müşteri hizmetleri asistanısın."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const aiResponse = completion.choices[0]?.message?.content || "";

      // AI yanıtını parse et
      return {
        suggestedResponse: aiResponse,
        tone: "professional",
        confidence: 0.9,
        reasoning: "OpenAI GPT-4 ile üretildi"
      };
    } catch (error) {
      console.error("OpenAI API error:", error);
      // Hata durumunda mock yanıta düş
    }
  }

  // Kategori bazlı mock yanıtlar
  const mockResponses: Record<string, MailResponseResult> = {
    ORDER_INQUIRY: {
      suggestedResponse: `Sayın Müşterimiz,

Talebiniz için teşekkür ederiz. Siparişinizin durumunu inceledik ve size güncel bilgileri sunmak isteriz.

Siparişiniz ${request.suggestedOrderNumbers?.[0] || 'sistemimizde'} kayıtlı olup, kargo sürecindedir. En kısa sürede size ulaştırılacaktır.

Herhangi bir sorunuz olursa lütfen bizimle iletişime geçmekten çekinmeyin.

Saygılarımızla,
Müşteri Hizmetleri`,
      tone: "professional",
      confidence: 0.92,
      reasoning: "Sipariş sorgusu tespit edildi. Profesyonel ve bilgilendirici bir yanıt hazırlandı.",
    },

    RETURN_REQUEST: {
      suggestedResponse: `Merhaba,

İade talebinizi aldık ve size yardımcı olmaktan mutluluk duyarız.

İade sürecimiz oldukça basittir:
1. Ürünü orijinal ambalajında saklayın
2. İade formunu doldurun (mailinize gönderildi)
3. Kargo şirketimiz ürünü adresinizden alacaktır

İade onaylandıktan sonra ödemeniz 3-5 iş günü içinde hesabınıza iade edilecektir.

Başka bir konuda yardımcı olabilir miyiz?

İyi günler,
Müşteri Hizmetleri`,
      tone: "friendly",
      confidence: 0.88,
      reasoning: "İade talebi için yardımcı ve çözüm odaklı yanıt.",
    },

    WRONG_ITEM: {
      suggestedResponse: `Sayın Müşterimiz,

Yaşadığınız bu durum için gerçekten özür dileriz. Bu tür hatalar kabul edilemez ve sorunu hemen çözeceğiz.

Yanlış gönderilen ürün için:
- Kargo şirketimiz bugün içinde ürünü adresinizden alacak
- Doğru ürün öncelikli olarak size gönderilecek
- Ödemeniz korunacak, ek bir ücret ödemeyeceksiniz

Yaşattığımız mağduriyetten dolayı bir sonraki alışverişinizde kullanabileceğiniz %15 indirim kodu: OZUR15

Tekrar özür dileriz.

Saygılarımızla,
Müşteri Hizmetleri`,
      tone: "apologetic",
      confidence: 0.95,
      reasoning: "Yanlış ürün gönderimi ciddi bir hata. Özür ve telafi içeren yanıt.",
    },

    POSITIVE_FEEDBACK: {
      suggestedResponse: `Merhaba,

Geri bildiriminiz için çok teşekkür ederiz! 😊

Sizin gibi memnun müşterilerimiz bizim en büyük motivasyon kaynağımız. Hızlı kargomuz ve kaliteli ürünlerimizle size en iyi hizmeti sunmaya devam edeceğiz.

Bir dahaki alışverişinizde kullanabileceğiniz sadakat indirim kodu: TESEKKUR10

Bizi tercih ettiğiniz için tekrar teşekkürler!

Sevgilerle,
Müşteri Hizmetleri`,
      tone: "friendly",
      confidence: 0.90,
      reasoning: "Pozitif geri bildirim için minnettar ve samimi yanıt.",
    },

    TRACKING_INQUIRY: {
      suggestedResponse: `Merhaba,

Kargo takip bilgilerinizi aşağıda bulabilirsiniz:

Sipariş No: ${request.suggestedOrderNumbers?.[0] || '#XXXX'}
Kargo Takip No: KRG123456789
Kargo Şirketi: Aras Kargo

Kargonuz yola çıkmış olup, tahmini teslimat: Yarın, 14:00-18:00

Kargo durumunu buradan takip edebilirsiniz:
https://kargotakip.com/KRG123456789

İyi günler dileriz!

Müşteri Hizmetleri`,
      tone: "professional",
      confidence: 0.93,
      reasoning: "Kargo takip talebi için net ve bilgilendirici yanıt.",
    },

    INVOICE_REQUEST: {
      suggestedResponse: `Sayın Müşterimiz,

Fatura talebinizi aldık.

Kurumsal fatura için lütfen aşağıdaki bilgileri bize iletin:
- Şirket Ünvanı
- Vergi Dairesi
- Vergi/TC No
- Adres

Bilgileri aldıktan sonra faturanız en geç 24 saat içinde e-posta adresinize gönderilecektir.

Saygılarımızla,
Müşteri Hizmetleri`,
      tone: "professional",
      confidence: 0.89,
      reasoning: "Fatura talebi için resmi ve açıklayıcı yanıt.",
    },

    DISCOUNT_ISSUE: {
      suggestedResponse: `Merhaba,

İndirim kodu ile ilgili yaşadığınız sorunu araştırdık.

YENI25 kodu şu anda aktif durumda ve kullanılabilir. Ancak bazı kısıtlamaları var:
- Minimum 500 TL alışveriş gereklidir
- İndirimli ürünlerde geçerli değildir
- Bir kullanıcı sadece 1 kez kullanabilir

Eğer bu koşullara uyuyorsanız hala sorun yaşıyorsanız, lütfen sepet ekran görüntüsü gönderin, hemen çözelim.

Size özel alternatif bir kod da oluşturabiliriz: OZEL20

Yardımcı olabildiysek ne mutlu!

İyi alışverişler,
Müşteri Hizmetleri`,
      tone: "friendly",
      confidence: 0.87,
      reasoning: "İndirim sorunu için çözüm odaklı ve alternatif sunan yanıt.",
    },

    SIZE_EXCHANGE: {
      suggestedResponse: `Merhaba,

Beden değişimi talebinizi aldık, tabii ki yardımcı olabiliriz!

Ürün hiç kullanılmamışsa ve etiketleri duruyorsa değişim yapabiliriz:

1. L beden stoklarını kontrol ettik - Mevcut ✅
2. Kargo firması M bedeni sizden alacak
3. L beden aynı gün kargoya verilecek
4. Ekstra ücret yok

Değişim işlemini başlatmak için bu maile "Onaylıyorum" yazmanız yeterli.

Teşekkürler!

Müşteri Hizmetleri`,
      tone: "friendly",
      confidence: 0.91,
      reasoning: "Beden değişimi için hızlı ve çözüm odaklı yanıt.",
    },
  };

  // Kategori varsa ona göre, yoksa genel yanıt
  const response = category && mockResponses[category]
    ? mockResponses[category]
    : {
        suggestedResponse: `Merhaba,

Mesajınız için teşekkür ederiz. Talebinizi aldık ve en kısa sürede size dönüş yapacağız.

Bu arada, daha hızlı destek için aşağıdaki kanalları kullanabilirsiniz:
- WhatsApp: 0850 XXX XX XX
- Canlı Destek: website.com/destek

İyi günler,
Müşteri Hizmetleri`,
        tone: "professional" as const,
        confidence: 0.75,
        reasoning: "Kategori belirlenemedi. Genel yanıt hazırlandı.",
      };

  // Gerçek API call simülasyonu için kısa gecikme
  await new Promise(resolve => setTimeout(resolve, 1500));

  return response;
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
