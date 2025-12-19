# 🏗️ Profesyonel Mimari Önerisi

## Mevcut Sorunlar

1. ❌ İkas OAuth çalışmıyor (endpoint problemi)
2. ❌ Queue sistemi aşırı karmaşık
3. ❌ Separation of concerns yok
4. ❌ Her şey her şeyi yapıyor
5. ❌ Test edilmesi zor
6. ❌ Debug edilmesi zor

## Clean Architecture Principles

### Katmanlar

```
┌──────────────────────────────────────────┐
│         Presentation Layer               │  ← API Routes, UI
│  - Simple request/response              │
│  - No business logic                    │
└────────────────┬─────────────────────────┘
                 │
┌────────────────▼─────────────────────────┐
│        Application Layer                 │  ← Services
│  - Business logic                        │
│  - Orchestration                         │
│  - Use cases                             │
└────────────────┬─────────────────────────┘
                 │
┌────────────────▼─────────────────────────┐
│          Domain Layer                    │  ← Entities
│  - Core business objects                 │
│  - Value objects                         │
│  - Domain rules                          │
└────────────────┬─────────────────────────┘
                 │
┌────────────────▼─────────────────────────┐
│      Infrastructure Layer                │  ← External APIs
│  - Database                              │
│  - External APIs (İkas)                  │
│  - Cache                                 │
└──────────────────────────────────────────┘
```

## 3 Mimari Seçeneği

---

## ✅ OPTION A: Simple Synchronous (ÖNERİLEN)

### Açıklama
En basit, anlaşılır, debug kolay yaklaşım.

### Akış
```
1. Mail Gelir
   ↓
2. Save to Database
   ↓
3. (Kullanıcı AI yanıt ister)
   ↓
4. Check Cache (OrderService)
   ↓
5. Cache Miss? → Query İkas immediately
   ↓
6. Save to Cache (1 hour TTL)
   ↓
7. Generate AI response
   ↓
8. Return to user
```

### Folder Structure
```
src/
├── lib/
│   ├── infrastructure/
│   │   ├── ikas/
│   │   │   ├── client.ts          # HTTP client only
│   │   │   ├── auth.ts            # OAuth only
│   │   │   └── queries.ts         # GraphQL queries
│   │   └── cache/
│   │       └── redis.ts           # or memory cache
│   ├── domain/
│   │   ├── order.ts               # Order entity
│   │   ├── mail.ts                # Mail entity
│   │   └── value-objects.ts       # OrderNumber, Email, etc
│   └── services/
│       ├── order-service.ts       # Order business logic
│       ├── mail-service.ts        # Mail processing
│       └── ai-service.ts          # AI logic
└── app/api/
    ├── mails/fetch/route.ts       # IMAP → DB
    └── ai/generate-reply/route.ts # AI + Orders
```

### Implementation

#### 1. Infrastructure: İkas Client (Clean)
```typescript
// src/lib/infrastructure/ikas/client.ts
import { IkasAuth } from './auth';

export class IkasClient {
  constructor(private auth: IkasAuth) {}

  async getOrderByNumber(orderNumber: string): Promise<any> {
    const token = await this.auth.getAccessToken();

    const response = await fetch('https://api.myikas.com/api/v1/admin/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: GET_ORDER_QUERY,
        variables: { orderNumber }
      })
    });

    const data = await response.json();
    return data.data?.order || null;
  }
}
```

#### 2. Infrastructure: OAuth (Separate)
```typescript
// src/lib/infrastructure/ikas/auth.ts
export class IkasAuth {
  private token: string | null = null;
  private expiresAt: number | null = null;

  constructor(
    private clientId: string,
    private clientSecret: string,
    private storeName: string
  ) {}

  async getAccessToken(): Promise<string> {
    if (this.token && this.expiresAt && Date.now() < this.expiresAt) {
      return this.token;
    }

    const url = `https://${this.storeName}.myikas.com/api/admin/oauth/token`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      })
    });

    if (!response.ok) {
      throw new Error(`OAuth failed: ${response.status}`);
    }

    const data = await response.json();
    this.token = data.access_token;
    this.expiresAt = Date.now() + (data.expires_in - 60) * 1000;

    return this.token;
  }
}
```

#### 3. Domain: Value Objects
```typescript
// src/lib/domain/value-objects.ts
export class OrderNumber {
  private constructor(private value: string) {}

  static fromText(text: string): OrderNumber | null {
    const patterns = [
      /#(\d{4,})/i,
      /sipariş\s*(?:no|numarası)?:?\s*#?(\d{4,})/i,
      /order\s*(?:no|number)?:?\s*#?(\d{4,})/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        return new OrderNumber(match[1]);
      }
    }

    return null;
  }

  getValue(): string {
    return this.value;
  }
}
```

#### 4. Service: Order Service (Business Logic)
```typescript
// src/lib/services/order-service.ts
import { IkasClient } from '@/lib/infrastructure/ikas/client';
import { Order } from '@/lib/domain/order';

export class OrderService {
  private cache = new Map<string, { data: Order; expiresAt: number }>();

  constructor(private ikasClient: IkasClient) {}

  async getOrderByNumber(orderNumber: string): Promise<Order | null> {
    // 1. Check cache
    const cached = this.cache.get(orderNumber);
    if (cached && Date.now() < cached.expiresAt) {
      console.log('✅ Cache hit:', orderNumber);
      return cached.data;
    }

    // 2. Query İkas
    try {
      const ikasOrder = await this.ikasClient.getOrderByNumber(orderNumber);
      if (!ikasOrder) return null;

      // 3. Map to domain entity
      const order: Order = {
        id: ikasOrder.id,
        orderNumber: ikasOrder.orderNumber,
        status: ikasOrder.status,
        customerEmail: ikasOrder.customer?.email || '',
        customerName: ikasOrder.customer?.name || '',
        totalPrice: ikasOrder.totalPrice,
        currency: ikasOrder.currency,
        items: ikasOrder.lineItems || [],
      };

      // 4. Cache it (1 hour)
      this.cache.set(orderNumber, {
        data: order,
        expiresAt: Date.now() + 3600000
      });

      console.log('✅ Order fetched from İkas:', orderNumber);
      return order;

    } catch (error) {
      console.error('❌ Failed to fetch order:', error);
      return null;
    }
  }
}
```

#### 5. API Route: Clean and Simple
```typescript
// src/app/api/ai/generate-reply/route.ts
import { OrderNumber } from '@/lib/domain/value-objects';
import { orderService } from '@/lib/services';

export async function POST(request: NextRequest) {
  const body = await request.json();

  // 1. Extract order number (if any)
  const fullText = `${body.subject} ${body.body}`;
  const orderNumber = OrderNumber.fromText(fullText);

  // 2. Get order data (if order number found)
  const order = orderNumber
    ? await orderService.getOrderByNumber(orderNumber.getValue())
    : null;

  // 3. Generate AI response
  const aiResponse = await generateMailResponse({
    from: body.from,
    subject: body.subject,
    body: body.body,
    order: order // null if not found
  });

  return NextResponse.json(aiResponse);
}
```

### Avantajlar
- ✅ Çok basit ve anlaşılır
- ✅ Debug kolay
- ✅ Her katman tek bir şey yapıyor
- ✅ Test edilebilir
- ✅ Gerçek zamanlı (kullanıcı beklemez)
- ✅ No queue complexity
- ✅ Cache sayesinde rate limit minimize

### Dezavantajlar
- ⚠️ İlk istekte 2-3 saniye gecikme (İkas sorgusu)
- ⚠️ Rate limit riski var (ama cache + smart filtering ile minimize)

### Rate Limit Yönetimi
```typescript
// OrderService içinde
async getOrderByNumber(orderNumber: string): Promise<Order | null> {
  try {
    return await this.ikasClient.getOrderByNumber(orderNumber);
  } catch (error) {
    if (error.message.includes('429')) {
      // Rate limit - return null, user can retry later
      console.warn('⏸️ Rate limit hit, returning null');
      return null;
    }
    throw error;
  }
}
```

---

## 🔄 OPTION B: Async Background (Karmaşık)

### Açıklama
Queue sistemiyle background processing.

### Akış
```
1. Mail Gelir
   ↓
2. Save to Database
   ↓
3. IF order-related: Enqueue job (low priority)
   ↓
4. Background worker (every 10 min)
   ↓
5. Fetch orders → Cache
   ↓
6. (Kullanıcı AI yanıt ister)
   ↓
7. Check cache → Hit? Return ✅
   ↓
8. Miss? Return "Order info loading, try later"
```

### Avantajlar
- ✅ Rate limit güvenli
- ✅ Background processing

### Dezavantajlar
- ❌ Karmaşık
- ❌ İlk istekte order data yok
- ❌ Kullanıcı birkaç kez denemeli

---

## ⚡ OPTION C: Hybrid (Dengeli)

### Açıklama
Cache-first, sync fallback.

### Akış
```
1. Mail Gelir → Save
   ↓
2. IF order-related AND recent: Skip queue
   ↓
3. (Kullanıcı AI yanıt ister)
   ↓
4. Check cache → Hit? Return ✅
   ↓
5. Miss? → Try İkas NOW (with 3 sec timeout)
   ↓
6. Success? Return with order data
   ↓
7. Timeout/Rate limit? Return without order + enqueue for later
```

### Avantajlar
- ✅ Kullanıcı beklemez (genelde)
- ✅ Background fallback var

### Dezavantajlar
- ⚠️ Biraz karmaşık
- ⚠️ Timeout logic gerekiyor

---

## 🎯 ÖNERİ: OPTION A

### Neden?

1. **Basitlik**: En önemli özellik. Karmaşıklık = Bug.
2. **Debug Kolay**: Sorun olursa hemen görürsün.
3. **Test Edilebilir**: Her katman ayrı test edilir.
4. **Yeterli Hızlı**: Cache ile 2. istekten sonra instant.
5. **Akıllı Filtreleme**: Sadece order-related mailler sorgulanır.

### Implementasyon Adımları

1. **Önce İkas OAuth'u düzelt** → En kritik
2. **Infrastructure layer oluştur** → İkas client + auth
3. **Domain layer oluştur** → Value objects + entities
4. **Service layer oluştur** → OrderService
5. **API routes düzenle** → Simple calls to services
6. **Test et** → Her katmanı ayrı ayrı

### Migration Plan

```bash
# 1. Eski kodu backup al
git commit -m "backup: old architecture"

# 2. Yeni structure oluştur
mkdir -p src/lib/{infrastructure,domain,services}

# 3. İkas client'ı temizle
# - Auth'u ayır
# - Client'ı basitleştir

# 4. Service layer ekle
# - OrderService
# - Simple cache logic

# 5. API routes'ları güncelle
# - Remove queue logic
# - Use OrderService

# 6. Test
# - Her katmanı ayrı test et

# 7. Queue'yu kaldır (opsiyonel)
# - Eğer gerekliyse bırakabilirsin
# - Ama basit yaklaşımla başla
```

---

## 📊 Karşılaştırma

| Özellik | Option A (Sync) | Option B (Async) | Option C (Hybrid) |
|---------|----------------|------------------|-------------------|
| Basitlik | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Debug | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Hız (ilk istek) | ⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐ |
| Hız (cache hit) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Rate limit güvenliği | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Test edilebilirlik | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Maintenance | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |

---

## ✅ SONUÇ

**OPTION A - Simple Synchronous** mimarisi ile git.

### Sebep:
1. Başarı için en önemli şey: **Çalışan bir sistem**
2. Karmaşık mimari → Daha fazla bug
3. Basit mimari → Kolay debug → Hızlı geliştirme
4. Cache + Smart filtering → Yeterli optimizasyon
5. İhtiyaç olursa daha sonra async eklersin

### İlk Adım:
**İkas OAuth'u düzelt** - Bu olmadan hiçbir mimari çalışmaz.

```bash
# Test et:
curl -X POST https://paen.myikas.com/api/admin/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=YOUR_ID&client_secret=YOUR_SECRET"
```

Eğer bu çalışmazsa, İkas support ile konuş. Mimariyi düzeltmek bu problemi çözmez.
