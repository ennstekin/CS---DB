import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Supabase URL veya Service Role Key bulunamadı");
    }
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

const VERIMOR_BASE_URL = process.env.VERIMOR_BASE_URL || "https://api.bulutsantralim.com/api";

interface VerimorCDR {
  id: string;
  date: string;
  direction: "in" | "out";
  customer_num: string; // Arayan numara
  pbx_num: string; // Santral numarası
  internal_num: string; // Dahili numara
  queue_num?: string;
  start_time: string;
  answer_time?: string;
  end_time: string;
  duration: number; // toplam süre (saniye)
  billable_seconds: number; // konuşma süresi (saniye)
  disposition: string; // ANSWERED, NO ANSWER, BUSY, FAILED
  missed: 0 | 1; // 0 = cevaplandı, 1 = kaçırıldı
  unique_id: string; // Call UUID
}

/**
 * Verimor CDR kayıtlarını çeker ve database'e kaydeder
 * GET /api/verimor/sync-calls?days=30
 */
export async function POST(request: NextRequest) {
  try {
    const VERIMOR_API_KEY = process.env.VERIMOR_API_KEY;

    if (!VERIMOR_API_KEY) {
      return NextResponse.json(
        { error: "Verimor API key bulunamadı. .env.local dosyasını kontrol edin." },
        { status: 500 }
      );
    }

    const supabase = getSupabaseClient();

    // Kaç günlük veri çekileceği (default: 30)
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");

    // Tarih aralığı hesapla (ISO 8601 format)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startDateStr = startDate.toISOString(); // Full ISO 8601
    const endDateStr = endDate.toISOString();

    console.log(`📞 Verimor CDR çekiliyor: ${startDateStr} - ${endDateStr}`);

    // Verimor CDR API'sini çağır
    const verimorUrl = `${VERIMOR_BASE_URL}/cdrs?key=${VERIMOR_API_KEY}&start_stamp_from=${encodeURIComponent(startDateStr)}&start_stamp_to=${encodeURIComponent(endDateStr)}&limit=1000`;

    const response = await fetch(verimorUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Verimor API error:", errorText);
      return NextResponse.json(
        { error: "Verimor API hatası", details: errorText },
        { status: response.status }
      );
    }

    const cdrs: VerimorCDR[] = await response.json();

    console.log(`📊 ${cdrs.length} adet CDR kaydı alındı`);

    let newCalls = 0;
    let updatedCalls = 0;
    let errors = 0;

    // Her CDR kaydını işle
    for (const cdr of cdrs) {
      try {
        // Telefon numarasından müşteriyi bul
        let customerId: string | null = null;
        const phoneNumber = cdr.direction === "in" ? cdr.customer_num : cdr.pbx_num;

        if (phoneNumber) {
          const { data: customer } = await supabase
            .from("customers")
            .select("id")
            .eq("phone", phoneNumber)
            .single();

          customerId = customer?.id || null;
        }

        // Call status belirle
        let status = "COMPLETED";
        if (cdr.missed === 1) {
          status = cdr.disposition === "NO ANSWER" ? "NO_ANSWER" : "FAILED";
        }

        // Çağrı kaydını oluştur veya güncelle
        const callData = {
          verimor_call_id: cdr.unique_id,
          customer_id: customerId,
          direction: cdr.direction === "in" ? "INBOUND" : "OUTBOUND",
          phone_number: phoneNumber,
          duration: cdr.billable_seconds,
          status: status,
          call_started_at: new Date(cdr.start_time).toISOString(),
          call_ended_at: new Date(cdr.end_time).toISOString(),
          is_matched_with_order: false,
        };

        // Aynı unique_id varsa güncelle, yoksa ekle
        const { data: existingCall } = await supabase
          .from("calls")
          .select("id")
          .eq("verimor_call_id", cdr.unique_id)
          .maybeSingle();

        if (existingCall) {
          await supabase
            .from("calls")
            .update(callData)
            .eq("id", existingCall.id);
          updatedCalls++;
        } else {
          await supabase.from("calls").insert(callData);
          newCalls++;
        }
      } catch (error) {
        console.error(`❌ CDR işlenirken hata (${cdr.unique_id}):`, error);
        errors++;
      }
    }

    console.log(`✅ Sync tamamlandı: ${newCalls} yeni, ${updatedCalls} güncellendi, ${errors} hata`);

    return NextResponse.json({
      success: true,
      message: `${newCalls} yeni çağrı eklendi, ${updatedCalls} çağrı güncellendi`,
      stats: {
        total: cdrs.length,
        new: newCalls,
        updated: updatedCalls,
        errors: errors,
      },
    });
  } catch (error: any) {
    console.error("❌ Verimor sync hatası:", error);
    return NextResponse.json(
      { error: "Çağrı kayıtları senkronize edilemedi", details: error.message },
      { status: 500 }
    );
  }
}
