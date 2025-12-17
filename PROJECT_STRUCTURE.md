# Smart CS Dashboard - Proje Yapısı

## Dosya Ağacı

```
smart-cs-dashboard/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx            # Dashboard ana layout
│   │   │   ├── page.tsx              # KPI Dashboard (Ana Sayfa)
│   │   │   ├── calls/
│   │   │   │   ├── page.tsx          # Çağrı listesi
│   │   │   │   └── [id]/page.tsx     # Çağrı detayı
│   │   │   ├── mails/
│   │   │   │   ├── page.tsx          # Mail listesi
│   │   │   │   └── [id]/page.tsx     # Mail detayı
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx          # Sipariş listesi
│   │   │   │   └── [id]/page.tsx     # Sipariş detayı
│   │   │   ├── customers/
│   │   │   │   ├── page.tsx          # Müşteri listesi
│   │   │   │   └── [id]/page.tsx     # Müşteri 360 Görünümü
│   │   │   └── returns/              # İade modülü (Boomerang)
│   │   │       ├── page.tsx
│   │   │       └── [id]/page.tsx
│   │   ├── api/
│   │   │   ├── webhooks/
│   │   │   │   ├── ikas/route.ts     # Ikas webhook handler
│   │   │   │   ├── twilio/route.ts   # Twilio webhook (çağrı bildirimleri)
│   │   │   │   └── mail/route.ts     # Mail webhook
│   │   │   ├── ai/
│   │   │   │   ├── analyze-call/route.ts      # Ses analizi endpoint
│   │   │   │   ├── analyze-mail/route.ts      # Mail analizi endpoint
│   │   │   │   └── match-order/route.ts       # Sipariş eşleştirme
│   │   │   ├── integrations/
│   │   │   │   ├── ikas/route.ts     # Ikas API proxy
│   │   │   │   ├── twilio/route.ts   # Twilio işlemleri
│   │   │   │   └── boomerang/route.ts # İade sistemi
│   │   │   ├── calls/route.ts
│   │   │   ├── mails/route.ts
│   │   │   └── customers/route.ts
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── ui/                       # Shadcn/UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── table.tsx
│   │   │   └── ...
│   │   ├── dashboard/
│   │   │   ├── kpi-cards.tsx
│   │   │   ├── call-stats-chart.tsx
│   │   │   ├── mail-stats-chart.tsx
│   │   │   └── ai-performance-chart.tsx
│   │   ├── calls/
│   │   │   ├── call-list.tsx
│   │   │   ├── call-player.tsx       # Ses kayıt oynatıcı
│   │   │   └── call-transcript.tsx
│   │   ├── mails/
│   │   │   ├── mail-list.tsx
│   │   │   ├── mail-viewer.tsx
│   │   │   └── order-match-suggestion.tsx
│   │   ├── customers/
│   │   │   ├── customer-header.tsx
│   │   │   ├── customer-orders.tsx
│   │   │   ├── customer-calls.tsx
│   │   │   ├── customer-mails.tsx
│   │   │   └── customer-returns.tsx
│   │   └── shared/
│   │       ├── sidebar.tsx
│   │       ├── header.tsx
│   │       └── loading.tsx
│   │
│   ├── lib/
│   │   ├── prisma.ts                 # Prisma client instance
│   │   ├── ai/
│   │   │   ├── openai-client.ts      # OpenAI API wrapper
│   │   │   ├── speech-to-text.ts     # STT işlemleri
│   │   │   ├── text-to-speech.ts     # TTS işlemleri
│   │   │   ├── mail-classifier.ts    # Mail sınıflandırma
│   │   │   └── order-matcher.ts      # Sipariş eşleştirme logic
│   │   ├── integrations/
│   │   │   ├── ikas-client.ts        # Ikas API client
│   │   │   ├── twilio-client.ts      # Twilio API client
│   │   │   ├── mail-client.ts        # IMAP/SMTP client
│   │   │   └── boomerang-client.ts   # İade sistemi client
│   │   ├── utils/
│   │   │   ├── date-helpers.ts
│   │   │   ├── validation.ts
│   │   │   └── formatters.ts
│   │   └── constants.ts
│   │
│   ├── types/
│   │   ├── ikas.ts
│   │   ├── call.ts
│   │   ├── mail.ts
│   │   ├── customer.ts
│   │   └── index.ts
│   │
│   └── hooks/
│       ├── use-calls.ts
│       ├── use-mails.ts
│       ├── use-customers.ts
│       └── use-kpi.ts
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── public/
│   └── assets/
│
├── .env.example
├── .env.local
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

## Temel Modüller

### 1. Dashboard Modülü
- KPI metrikleri (çağrı, mail, AI performansı)
- Grafikler ve istatistikler
- Gerçek zamanlı güncellemeler

### 2. Call Management (Çağrı Yönetimi)
- Gelen/Giden çağrı listesi
- AI asistan görüşmeleri
- Ses kayıtları ve transkriptler
- Sipariş eşleştirme

### 3. Mail Management (Mail Yönetimi)
- Gelen mail listesi
- AI mail analizi ve sınıflandırma
- Sipariş önerileri
- Yanıt şablonları

### 4. Customer 360 View
- Tüm müşteri bilgileri
- Sipariş geçmişi
- İletişim geçmişi (çağrı + mail)
- İade durumları

### 5. Integration Layer
- Ikas API (siparişler, müşteriler, ürünler)
- Twilio/VoIP (telefon sistemi)
- IMAP/SMTP (mail servisi)
- Boomerang (iade sistemi)

### 6. AI Services
- Speech-to-Text (çağrı transkripsiyonu)
- Text-to-Speech (AI asistan yanıtları)
- Mail sınıflandırma
- Sipariş-iletişim eşleştirme
