import { NextRequest, NextResponse } from "next/server";
import { generateMailResponse, type MailResponseRequest } from "@/lib/ai/mail-responder";
import { supabase } from "@/lib/supabase";
import { IkasClient, extractOrderNumber } from "@/lib/ikas/client";
import { getCachedOrder, enqueueIkasOrderFetch } from "@/lib/queue";

export async function POST(request: NextRequest) {
  try {
    const body: MailResponseRequest = await request.json();

    // Validasyon
    if (!body.from || !body.subject || !body.body) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Supabase'den OpenAI ve İkas ayarlarını çek
    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["openai_api_key", "openai_model", "ikas_client_id", "ikas_client_secret", "ikas_store_name"]);

    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
    }

    // Settings'i map'e çevir
    const settingsMap: Record<string, string> = {};
    settings?.forEach((row) => {
      settingsMap[row.key] = row.value;
    });

    console.log("🔍 Settings fetched:", {
      hasApiKey: !!settingsMap.openai_api_key,
      apiKeyLength: settingsMap.openai_api_key?.length || 0,
      apiKeyPrefix: settingsMap.openai_api_key?.substring(0, 10) || 'none',
      model: settingsMap.openai_model || "not set"
    });

    // OpenAI API key'i temizle
    let cleanApiKey: string | undefined;
    if (settingsMap.openai_api_key) {
      // Boşlukları, satır sonlarını ve diğer whitespace'leri temizle
      cleanApiKey = settingsMap.openai_api_key.trim().replace(/\s+/g, '');
      console.log("✅ API key found and cleaned");
      console.log("Key length:", cleanApiKey.length, "chars");
      console.log("Key prefix:", cleanApiKey.substring(0, 10));
    } else {
      console.log("❌ No API key found in settings");
    }

    // Model seçimi (varsayılan: gpt-4o-mini)
    const selectedModel = settingsMap.openai_model || "gpt-4o-mini";
    console.log("🤖 Using model:", selectedModel);

    // İkas'tan sipariş bilgilerini çek (cache-first stratejisi)
    let ikasOrderInfo = null;

    console.log("🔍 İkas Settings Check:", {
      hasClientId: !!settingsMap.ikas_client_id,
      hasClientSecret: !!settingsMap.ikas_client_secret,
      hasStoreName: !!settingsMap.ikas_store_name,
      storeName: settingsMap.ikas_store_name || 'NOT SET'
    });

    if (settingsMap.ikas_client_id && settingsMap.ikas_client_secret && settingsMap.ikas_store_name) {
      console.log("🛒 İkas credentials found, checking cache...");

      try {
        // 1. Önce cache'den kontrol et (eğer mailId varsa)
        if (body.mailId) {
          const cached = await getCachedOrder(body.mailId);
          if (cached) {
            console.log("✅ Cache hit! Using cached İkas data");
            ikasOrderInfo = cached.order_data as any;
          } else {
            console.log("⚠️ Cache miss for mail:", body.mailId);
          }
        }

        // 2. Cache'de yoksa ve sipariş ilgiliyse queue'ya ekle (yüksek priority)
        if (!ikasOrderInfo && body.mailId) {
          const fullText = `${body.subject} ${body.body}`;
          const orderNumber = extractOrderNumber(fullText);

          // Sipariş numarası varsa veya mail konusu sipariş/kargo ile ilgiliyse queue'ya ekle
          const isOrderRelated = orderNumber ||
                                 /sipariş|order|kargo|cargo|takip|tracking/i.test(fullText);

          if (isOrderRelated) {
            console.log("📤 Enqueueing high-priority İkas fetch job...");

            const jobId = await enqueueIkasOrderFetch(
              body.mailId,
              body.from,
              body.subject,
              body.body,
              10 // priority: 10 (yüksek - kullanıcı bekliyor)
            );

            if (jobId) {
              console.log(`✅ High-priority job enqueued: ${jobId} (order: ${orderNumber || 'keyword match'})`);
            }

            // Kullanıcıya bilgi ver: "Sipariş bilgileri yükleniyor..."
            console.log("⏳ İkas data not available yet, will be fetched by background worker");
          } else {
            console.log("⏭️ Mail is not order-related, skipping İkas fetch");
          }
        }

        // 3. FALLBACK: Eğer gerçekten acilse (örn: test amaçlı), hemen sorgula
        // Bu kısım opsiyonel - production'da tamamen kaldırılabilir
        if (!ikasOrderInfo && body.urgentFetch === true) {
          console.log("🚨 Urgent fetch requested, querying İkas directly...");

          const ikasClient = new IkasClient({
            clientId: settingsMap.ikas_client_id,
            clientSecret: settingsMap.ikas_client_secret,
            storeName: settingsMap.ikas_store_name,
          });

          const fullText = `${body.subject} ${body.body}`;
          const orderNumber = extractOrderNumber(fullText);

          if (orderNumber) {
            console.log("📦 Order number found:", orderNumber);
            ikasOrderInfo = await ikasClient.getOrderByNumber(orderNumber);
          } else {
            console.log("📧 No order number, trying email search...");
            const orders = await ikasClient.getOrdersByEmail(body.from, 3);
            if (orders.length > 0) {
              ikasOrderInfo = orders[0];
            }
          }
        }
      } catch (error) {
        console.error("❌ İkas query error:", error);
      }
    } else {
      console.log("⚠️ İkas credentials not configured");
    }

    // AI yanıt üret - API key ve İkas bilgilerini parametre olarak gönder
    const response = await generateMailResponse(
      body,
      selectedModel,
      cleanApiKey,
      ikasOrderInfo
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("AI Reply Generation Error:", error);

    // Hata mesajını kullanıcıya göster
    const errorMessage = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
