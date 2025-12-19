# 🚦 Rate Limit Çözümü

## ❌ Problem

İkas API'ye çok hızlı sorgu atıldığı için **429 Too Many Requests** hatası alınıyordu:
- Limit: 300 request
- Her AI yanıt üretme isteğinde hemen İkas'a sorgu
- Cache mekanizması yoktu
- Queue sistemi aktif değildi

## ✅ Çözüm

### 1. **Hemen Sorgulama KALDIRILDI**

**Önceki Davranış:**
```typescript
// ❌ Her AI yanıt isteğinde hemen İkas'a gidiyordu
urgentFetch: true → İkas API çağrısı → Rate limit!
```

**Yeni Davranış:**
```typescript
// ✅ Sadece cache ve queue kullanılıyor
urgentFetch: false → Cache kontrol → Queue'ya ekle → Worker işler
```

Dosya: `src/components/dashboard/ai-reply-dialog.tsx:69`

### 2. **Worker Rate Limit Koruması**

Worker artık rate limit hatalarını akıllıca yönetiyor:

**Özellikler:**
- ✅ 2 kere üst üste rate limit alırsa durur
- ✅ Rate limit sonrası 30 saniye bekler
- ✅ Failed job'ları 15 dakika sonra retry eder
- ✅ Her job arası 3 saniye bekler
- ✅ Batch size: 5 job (10'dan düşürüldü)

Dosya: `src/lib/queue/worker.ts:73-102`

```typescript
// Rate limit hatası kontrolü
const isRateLimit = errorMessage.includes('429') ||
                    errorMessage.includes('Too Many Requests') ||
                    errorMessage.includes('rate limit');

if (isRateLimit) {
  consecutiveRateLimits++;

  // 2 kere üst üste rate limit alırsa dur
  if (consecutiveRateLimits >= 2) {
    console.log('🛑 Multiple rate limits detected, stopping worker');
    break;
  }

  // Rate limit sonrası 30 saniye bekle
  await new Promise(resolve => setTimeout(resolve, 30000));
}
```

### 3. **Otomatik Cron Job (Production)**

Vercel cron job her 10 dakikada bir worker'ı çalıştırır:

Dosya: `vercel.json:7-12`
```json
{
  "crons": [{
    "path": "/api/queue/process",
    "schedule": "*/10 * * * *"
  }]
}
```

**İşleyiş:**
- Her 10 dakikada bir: `/api/queue/process` POST
- Worker max 5 job işler
- Her job arası 3 saniye bekler
- Toplam süre: ~15 saniye
- Rate limit güvenli ✅

### 4. **Cache-First Stratejisi**

```
Mail Gelir
    ↓
Queue'ya Eklenir (priority: 5)
    ↓
10 dakika sonra Worker çalışır
    ↓
İkas API sorgulanır (3 saniye delay ile)
    ↓
Sonuç Cache'e kaydedilir (1 saat TTL)
    ↓
Kullanıcı AI yanıt ister
    ↓
Cache'den hemen okunur ⚡ (rate limit YOK!)
```

## 📊 Rate Limit Koruması Detayları

### Worker Ayarları
```typescript
maxJobsPerRun: 5        // Her batch'te max 5 job
delayBetweenJobs: 3000  // Her job arası 3 saniye
consecutiveRateLimits: 2 // Max 2 üst üste rate limit
rateLimitWait: 30000    // Rate limit sonrası 30 saniye bekle
```

### İstek Hızı Hesabı
- 5 job × 3 saniye = 15 saniye
- Her 10 dakikada 1 batch
- Saatte: 6 batch × 5 job = **30 request/hour**
- Rate limit: 300 request → Güvenli! ✅

## 🎯 Kullanım Senaryoları

### Senaryo 1: Yeni Mail Gelir
```
1. Mail IMAP'den çekilir
2. Supabase'e kaydedilir
3. Queue'ya eklenir (priority: 5)
4. 10 dakika içinde worker işler
5. Cache'e kaydedilir (1 saat)
```

### Senaryo 2: Kullanıcı AI Yanıt İster
```
1. Cache'de sipariş var mı? → VARSA: ⚡ Hemen kullan
2. Cache'de yoksa: Queue'ya ekle (priority: 10)
3. AI yanıt üret (İkas datası olmadan)
4. Kullanıcıya göster
5. 10 dakika sonra worker cache'e kaydet
6. Kullanıcı tekrar isterse: Cache'den gelir ✅
```

### Senaryo 3: Rate Limit Alınırsa
```
1. Worker job işler
2. Rate limit hatası alır (429)
3. Job'ı fail olarak işaretler
4. 15 dakika sonra retry'a koyar
5. 30 saniye bekler
6. Bir sonraki job'ı dener
7. Yine rate limit alırsa: Worker durur 🛑
8. 10 dakika sonra tekrar dener
```

## 🧪 Test Senaryosu

### Development'ta Manuel Test
```bash
# 1. Mail çek (queue'ya ekler)
curl -X POST http://localhost:3000/api/mails/fetch

# 2. Queue'ya eklendiğini kontrol et
curl http://localhost:3000/api/queue/process

# Çıktı:
# {
#   "success": true,
#   "stats": {
#     "byStatus": { "pending": 5 },
#     "total": 5
#   }
# }

# 3. Worker'ı manuel çalıştır
curl -X POST http://localhost:3000/api/queue/process

# Çıktı:
# {
#   "success": true,
#   "processed": 3,
#   "failed": 0
# }

# 4. Cache'i kontrol et (Supabase dashboard)
# SELECT * FROM ikas_order_cache WHERE expires_at > NOW();
```

### Production'da Otomatik
1. Mail gelir → Otomatik queue'ya eklenir
2. Her 10 dakikada worker çalışır (Vercel cron)
3. Cache dolur
4. Kullanıcı AI yanıt ister → Cache'den gelir
5. Rate limit YOK! ✅

## 📈 İstatistikler

### Önceki Sistem (Rate Limit Problemi)
- ❌ Her AI yanıt: 1-2 İkas request
- ❌ 50 mail × 2 request = 100 request
- ❌ 1 saatte 100+ request → Rate limit!

### Yeni Sistem (Çözüm)
- ✅ Mail geldiğinde: 0 İkas request (queue'ya eklenir)
- ✅ Worker çalışır: 5 request / 15 saniye
- ✅ AI yanıt ister: 0 İkas request (cache'den)
- ✅ Saatte: ~30 request → Güvenli! ✅

## 🔧 Ayarlamalar

### Worker Delay'ini Artırmak (Daha Güvenli)
```typescript
// src/lib/queue/worker.ts:199
delayBetweenJobs: 5000, // 5 saniye (3'ten artırıldı)
```

### Cron Sıklığını Azaltmak
```json
// vercel.json:10
"schedule": "*/15 * * * *" // 15 dakikada bir (10'dan artırıldı)
```

### Cache TTL'yi Artırmak
```sql
-- supabase-migrations.sql:12
expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours')
-- 1 saatten 2 saate çıkarıldı
```

## ✅ Sonuç

Rate limit problemi tamamen çözüldü:

1. ✅ Hemen sorgulama kaldırıldı
2. ✅ Cache-first stratejisi aktif
3. ✅ Queue sistemi çalışıyor
4. ✅ Worker rate limit korumalı
5. ✅ Otomatik cron job kuruldu
6. ✅ Saatte sadece ~30 request
7. ✅ 300 limit → %90 güvenlik marjı

**Artık rate limit sorunu YOK!** 🎉
