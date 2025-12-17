# Smart CS Dashboard

E-ticaret Müşteri Hizmetleri Yönetim Paneli - AI destekli, çoklu kanal entegrasyonlu müşteri destek platformu.

## Proje Özeti

Smart CS Dashboard, Ikas e-ticaret platformu ile entegre çalışan, müşteri destek süreçlerini (Telefon, Mail, İade) tek ekranda toplayan ve yapay zeka ile asiste eden kapsamlı bir yönetim panelidir.

## Özellikler

### Şu An Mevcut
- ✅ Next.js 15 + TypeScript
- ✅ Shadcn/UI component library (10+ component)
- ✅ Prisma ORM + PostgreSQL (Detaylı schema)
- ✅ Ikas GraphQL API client
- ✅ Dashboard ana sayfa ve KPI kartları
- ✅ **Mail Yönetimi Modülü (Mock Data ile)**:
  - Mail listesi ve detay görünümü
  - AI analiz ve sipariş eşleştirme önerileri
  - Mail filtreleme (Yeni, Bekleyen, Çözülen)
  - Öncelik ve kategori etiketleme
  - 8 farklı örnek mail senaryosu

### Yakında Gelecek
- ⏳ **IMAP/SMTP Entegrasyonu**: Gerçek mail servisi bağlantısı
- ⏳ **AI Mail Analizi**: OpenAI entegrasyonu ile otomatik mail sınıflandırma
- ⏳ **AI Telefon Asistanı**: Twilio entegrasyonu, Speech-to-Text
- ⏳ **Müşteri 360 Görünümü**: Tüm müşteri etkileşimleri tek sayfada
- ⏳ **İade Sistemi**: Boomerang entegrasyonu
- ⏳ **Gerçek zamanlı bildirimler**

## Teknoloji Yığını

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Library**: Shadcn/UI + Radix UI
- **Styling**: TailwindCSS
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **API**: GraphQL (Ikas), REST

### Entegrasyonlar
- **E-ticaret**: Ikas API (GraphQL)
- **Telefon**: Twilio (yakında)
- **Mail**: IMAP/SMTP (yakında)
- **AI**: OpenAI API (yakında)

## Kurulum

### 1. Bağımlılıkları Yükle

```bash
pnpm install
```

### 2. Ortam Değişkenlerini Ayarla

`.env.local` dosyasını oluşturun:

```bash
cp .env.example .env.local
```

Gerekli API anahtarlarını doldurun:
- `DATABASE_URL`: PostgreSQL bağlantı dizesi
- `IKAS_ACCESS_TOKEN`: Ikas API access token

### 3. Veritabanını Hazırla

```bash
# Prisma client oluştur
pnpm db:generate

# Veritabanı şemasını oluştur
pnpm db:push
```

### 4. Development Server'ı Başlat

```bash
pnpm dev
```

Uygulama [http://localhost:3000](http://localhost:3000) adresinde çalışacak.

## Proje Yapısı

```
src/
├── app/
│   ├── (dashboard)/           # Dashboard route group
│   │   └── dashboard/
│   │       ├── page.tsx       # Ana dashboard
│   │       ├── calls/         # Çağrı yönetimi
│   │       ├── mails/         # Mail yönetimi
│   │       └── orders/        # Sipariş yönetimi
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                    # Shadcn/UI components
│   └── dashboard/             # Dashboard components
├── lib/
│   ├── integrations/
│   │   └── ikas-client.ts     # Ikas API client
│   ├── prisma.ts              # Prisma client
│   └── utils.ts
└── types/
    └── ikas.ts                # Ikas type definitions
```

## Veritabanı Modelleri

### Ana Tablolar
- `User` - Kullanıcı yönetimi
- `Customer` - Müşteri bilgileri
- `Order` - Sipariş verileri
- `Call` - Telefon görüşmeleri
- `Mail` - E-posta iletişimi
- `Return` - İade işlemleri
- `Note` - Genel notlar
- `DailyMetric` - KPI metrikleri

Detaylı şema için `prisma/schema.prisma` dosyasına bakın.

## Ikas API Kullanımı

Ikas client örnek kullanım:

```typescript
import { ikasClient } from "@/lib/integrations/ikas-client";

// Tüm siparişleri çek
const orders = await ikasClient.getOrders(50);

// Sipariş numarasına göre ara
const order = await ikasClient.searchOrderByNumber("1234");

// Müşteri mailinden siparişleri bul
const customerOrders = await ikasClient.getOrdersByCustomerEmail("customer@example.com");
```

## Scriptler

```bash
pnpm dev          # Development server
pnpm build        # Production build
pnpm start        # Production server
pnpm lint         # ESLint kontrolü
pnpm db:generate  # Prisma client oluştur
pnpm db:push      # DB şemasını push et
pnpm db:migrate   # Migration oluştur
pnpm db:studio    # Prisma Studio aç
```

## Gelecek Adımlar

1. **PostgreSQL kurulumu** ve database migration
2. **Ikas API token** edinme ve test
3. **Twilio hesabı** oluşturma
4. **OpenAI API** entegrasyonu
5. **Mail sunucusu** yapılandırması
6. **Boomerang** iade sistemi entegrasyonu

## Lisans

Bu proje özel bir projedir.

## İletişim

Proje sahibi: [Enes Tekin]
