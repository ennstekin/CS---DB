# 🚀 Background Queue System - Kullanım Kılavuzu

## 📋 Genel Bakış

Bu sistem, İkas API sorgularını arka planda işlemek için profesyonel bir queue (kuyruk) mekanizması sunar. Rate limit problemlerini çözer, cache stratejisi kullanır ve otomatik retry mekanizması içerir.

## 🏗️ Mimari

```
Mail Gelir → Queue'ya Eklenir → Background Worker İşler → Cache'e Kaydedilir
                ↓                        ↓                         ↓
          (Düşük Priority)        (İkas API Çağrısı)      (1 saat TTL)
```

### Bileşenler

1. **Database Tables** (`supabase-migrations.sql`)
   - `ikas_order_cache` - Sipariş verilerini 1 saat cache'ler
   - `job_queue` - Background job kuyruğu

2. **Queue Helpers** (`src/lib/queue/index.ts`)
   - `enqueueJob()` - Job ekle
   - `dequeueJob()` - Job al (atomic)
   - `completeJob()` / `failJob()` - Job durumu güncelle
   - `getCachedOrder()` / `cacheOrder()` - Cache yönetimi

3. **Background Worker** (`src/lib/queue/worker.ts`)
   - İkas API sorgularını işler
   - Rate limit hatalarını yönetir
   - Exponential backoff ile retry

4. **API Endpoints**
   - `/api/queue/process` - Worker'ı tetikler
   - `/api/mails/fetch` - Mail çekip queue'ya ekler
   - `/api/ai/generate-reply` - Cache'den okur, yoksa queue'ya ekler

## 🔄 Çalışma Akışı

### 1. Mail Geldiğinde
```typescript
// /api/mails/fetch içinde otomatik çalışır
POST /api/mails/fetch
→ Mail'i Supabase'e kaydet
→ İkas fetch job'ını queue'ya ekle (priority: 5)
→ Background worker işleyecek
```

### 2. AI Yanıt Üretirken
```typescript
// /api/ai/generate-reply içinde
POST /api/ai/generate-reply
→ Cache'de sipariş var mı kontrol et
→ Varsa: Cache'den kullan ✅
→ Yoksa: Yüksek priority job ekle (priority: 10)
→ AI yanıt üret (İkas datası olabilir veya olmayabilir)
```

### 3. Background Worker Çalışması
```typescript
// Manuel veya cron ile tetikle
POST /api/queue/process
→ Queue'dan job al (priority sırasına göre)
→ İkas API'yi sorgula
→ Sonucu cache'e kaydet (1 saat)
→ Job'ı complete olarak işaretle
→ Hata varsa: Exponential backoff ile retry
```

## 📊 Priority Seviyeleri

| Priority | Kullanım | Açıklama |
|----------|----------|----------|
| 10 | Kullanıcı bekliyor | AI yanıt üretirken cache miss olursa |
| 5 | Normal | Yeni mail geldiğinde |
| 0 | Düşük | Toplu işlemler, cleanup |

## 🛠️ Kullanım Örnekleri

### 1. Queue'ya Job Ekleme
```typescript
import { enqueueIkasOrderFetch } from '@/lib/queue';

const jobId = await enqueueIkasOrderFetch(
  mailId,       // UUID
  fromEmail,    // string
  subject,      // string
  bodyText,     // string
  priority      // 0-10 (5 varsayılan)
);
```

### 2. Cache'den Okuma
```typescript
import { getCachedOrder } from '@/lib/queue';

const cached = await getCachedOrder(mailId);
if (cached) {
  console.log('Cache hit!', cached.order_data);
} else {
  console.log('Cache miss, need to fetch');
}
```

### 3. Worker'ı Manuel Çalıştırma
```bash
# Terminal'de
curl -X POST http://localhost:3000/api/queue/process

# Sonuç:
{
  "success": true,
  "processed": 5,
  "failed": 0,
  "errors": []
}
```

### 4. Queue İstatistikleri
```bash
curl http://localhost:3000/api/queue/process

# Sonuç:
{
  "success": true,
  "stats": {
    "byStatus": {
      "pending": 12,
      "processing": 2,
      "completed": 150,
      "failed": 3
    },
    "byType": {
      "fetch_ikas_order": 167
    },
    "total": 167
  }
}
```

## ⏰ Production Kurulumu

### Seçenek 1: Vercel Cron Jobs
```typescript
// vercel.json
{
  "crons": [{
    "path": "/api/queue/process",
    "schedule": "*/5 * * * *" // Her 5 dakikada bir
  }]
}
```

### Seçenek 2: Supabase Edge Functions
```typescript
// supabase/functions/queue-worker/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const response = await fetch('https://yourapp.com/api/queue/process', {
    method: 'POST'
  });
  return response;
});

// Supabase cron:
// 0 */5 * * * * (her 5 dakikada bir)
```

### Seçenek 3: External Cron Service
- [cron-job.org](https://cron-job.org)
- [EasyCron](https://www.easycron.com)
- Her 5 dakikada bir: `POST https://yourapp.com/api/queue/process`

## 🔧 Ayarlar

### Worker Ayarları
`src/lib/queue/worker.ts`:
```typescript
const worker = new QueueWorker({
  ikasClientId: '...',
  ikasClientSecret: '...',
  ikasStoreName: 'paen',
  maxJobsPerRun: 10,      // Bir seferde max 10 job işle
  delayBetweenJobs: 1000  // Job'lar arası 1 saniye bekle (rate limit)
});
```

### Cache TTL
`supabase-migrations.sql`:
```sql
expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour')
```

### Retry Ayarları
`supabase-migrations.sql`:
```sql
max_attempts INTEGER NOT NULL DEFAULT 3,  -- Max 3 deneme
scheduled_at = NOW() + (INTERVAL '1 minute' * POWER(2, v_attempts))
-- Exponential backoff: 2^n dakika (2, 4, 8 dakika)
```

## 📈 Monitoring

### Database'de Kontrol
```sql
-- Bekleyen job'lar
SELECT * FROM job_queue WHERE status = 'pending' ORDER BY priority DESC;

-- Başarısız job'lar
SELECT * FROM job_queue WHERE status = 'failed';

-- Cache durumu
SELECT COUNT(*) FROM ikas_order_cache WHERE expires_at > NOW();
```

### Logs
Worker çalışırken terminal'de görüntülenecek loglar:
```
🚀 Queue worker started
📦 Processing job abc-123-def (attempt 1/3)
🔍 Fetching İkas order for mail: xyz-456
📦 Order number found: 12345
✅ İkas order found: 12345
✅ Order cached: 12345 for mail: xyz-456
✅ Job abc-123-def completed
🏁 Worker finished: 5 processed, 0 failed
```

## ⚠️ Önemli Notlar

1. **Rate Limits**: İkas API'nin rate limit'i var (300 req). Worker her job arasında 1 saniye bekler.

2. **Cache Strategy**: Mail'ler geldiğinde otomatik queue'ya eklenir. AI yanıt üretirken önce cache kontrol edilir.

3. **Priority**: Kullanıcı beklerken yüksek priority (10) kullanılır. Background işler düşük priority (5).

4. **Retry Logic**: Job 3 kere dener. Başarısız olursa `failed` statüsüne geçer.

5. **Cleanup**: Eski completed/failed job'ları silmek için:
```sql
SELECT cleanup_old_jobs(); -- 7 günden eski job'ları siler
```

## 🐛 Troubleshooting

### Problem: Worker çalışmıyor
```bash
# Terminal'de manuel çalıştır
curl -X POST http://localhost:3000/api/queue/process

# Log'ları kontrol et
# Error varsa göreceksin
```

### Problem: Cache dolmuyor
```sql
-- Worker başarıyla çalıştı mı?
SELECT * FROM job_queue WHERE job_type = 'fetch_ikas_order' ORDER BY created_at DESC LIMIT 10;

-- Cache'de ne var?
SELECT * FROM ikas_order_cache ORDER BY created_at DESC LIMIT 10;
```

### Problem: Rate limit hatası
```sql
-- Failed job'larda 429 hatası var mı?
SELECT * FROM job_queue WHERE error_message LIKE '%429%';

-- Bekle ve tekrar dene (otomatik retry var)
```

## 📚 İleri Seviye

### Yeni Job Tipi Ekleme
1. `src/lib/queue/index.ts` içinde `JobType`'a ekle:
```typescript
export type JobType = 'fetch_ikas_order' | 'process_mail' | 'cleanup' | 'NEW_TYPE';
```

2. Worker'da handler ekle:
```typescript
// src/lib/queue/worker.ts
private async processNewTypeJob(job: Job): Promise<void> {
  // Custom logic
}
```

### Batch Processing
```typescript
// Toplu job ekleme
const mailIds = ['id1', 'id2', 'id3'];
for (const id of mailIds) {
  await enqueueIkasOrderFetch(id, email, subject, body, 0); // low priority
}
```

## ✅ Sonuç

Artık profesyonel bir background queue sisteminiz var! 🎉

- ✅ Rate limit problemleri çözüldü
- ✅ Cache stratejisi aktif
- ✅ Otomatik retry mekanizması var
- ✅ Production-ready
- ✅ Monitoring ve logging hazır

**Next Steps**:
1. Vercel cron job kurulumu
2. Production test
3. İzleme dashboard'u (opsiyonel)
