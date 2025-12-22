# Smart CS Dashboard

<p align="center">
  <strong>E-ticaret Müşteri Hizmetleri Yönetim Paneli</strong>
</p>

<p align="center">
  <a href="https://cs-db-amber.vercel.app">Demo</a> •
  <a href="#özellikler">Özellikler</a> •
  <a href="#kurulum">Kurulum</a> •
  <a href="#teknolojiler">Teknolojiler</a>
</p>

---

## Özellikler

### Mail Yönetimi
- IMAP ile otomatik mail çekme
- SMTP ile mail gönderme
- Mail threading (konuşma gruplandırma)
- Soft delete ile güvenli silme
- XSS korumalı HTML sanitization

### AI Destekli Yanıtlar
- OpenAI entegrasyonu
- Müşteri maillerine otomatik yanıt önerileri
- Bağlam farkındalıklı yanıt üretimi

### Ticket Sistemi
- Mail tabanlı ticket oluşturma
- Durum takibi ve atama
- Zaman çizelgesi ve notlar

### İade Yönetimi
- İade talepleri takibi
- Müşteri portalı
- Durum güncellemeleri

### Dashboard & Raporlama
- KPI takibi ve performans metrikleri
- Günlük/haftalık/aylık raporlar
- Grafik ve istatistikler

### Entegrasyonlar
- **Ikas**: E-ticaret platformu entegrasyonu
- **Verimor**: Santral ve çağrı kayıtları
- **OpenAI**: AI destekli özellikler
- **Supabase**: Veritabanı ve kimlik doğrulama

---

## Teknolojiler

| Kategori | Teknoloji |
|----------|-----------|
| Frontend | Next.js 15, React 19, TailwindCSS, Shadcn/UI |
| Backend | Next.js API Routes, Prisma ORM |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Mail | IMAP, SMTP, mailparser, nodemailer |
| AI | OpenAI GPT |
| Deploy | Vercel |

---

## Kurulum

### Gereksinimler

- Node.js 18+
- pnpm 9+
- Supabase hesabı

### 1. Repo'yu Klonlayın

```bash
git clone https://github.com/ennstekin/CS---DB.git
cd CS---DB
pnpm install
```

### 2. Environment Variables

`.env.local` dosyası oluşturun:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Queue Authentication
QUEUE_SECRET=your_queue_secret

# OpenAI (opsiyonel - AI özellikleri için)
OPENAI_API_KEY=your_openai_key

# Ikas (opsiyonel - e-ticaret entegrasyonu için)
IKAS_STORE_URL=your_ikas_store
IKAS_API_KEY=your_ikas_key
```

### 3. Veritabanı Kurulumu

```bash
pnpm db:setup
```

### 4. Geliştirme Sunucusu

```bash
pnpm dev
```

Uygulama http://localhost:3000 adresinde çalışacaktır.

---

## Mail Entegrasyonu

### Gmail Kurulumu

1. Google hesabınızda **2-Step Verification** aktif edin
2. **App Passwords** oluşturun (https://myaccount.google.com/apppasswords)
3. Dashboard → Settings → Mail Server:
   - **IMAP**: imap.gmail.com:993 (TLS)
   - **SMTP**: smtp.gmail.com:587 (STARTTLS)

---

## Scripts

| Komut | Açıklama |
|-------|----------|
| `pnpm dev` | Geliştirme sunucusu |
| `pnpm build` | Production build |
| `pnpm start` | Production sunucusu |
| `pnpm lint` | ESLint kontrolü |
| `pnpm db:setup` | Veritabanı kurulumu |

---

## Güvenlik

- Rate limiting ile API koruması
- Queue endpoint authentication
- HTML sanitization (XSS önleme)
- Güçlü şifre politikası
- Row Level Security (RLS) ile veritabanı güvenliği

---

## Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

---

## Lisans

MIT License - detaylar için [LICENSE](LICENSE) dosyasına bakın.
