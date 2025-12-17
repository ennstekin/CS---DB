# Smart CS Dashboard

E-ticaret Müşteri Hizmetleri Yönetim Paneli

## Özellikler

- 📧 **Mail Yönetimi**: IMAP ile mail çekme, SMTP ile mail gönderme
- 🤖 **AI Destekli Yanıtlar**: Müşteri maillerine otomatik yanıt önerileri
- 📊 **Dashboard**: KPI takibi ve performans metrikleri
- ⚙️ **Entegrasyonlar**: Ikas, OpenAI, Mail Server bağlantıları

## Teknolojiler

- **Frontend**: Next.js 15, React 19, TailwindCSS, Shadcn/UI
- **Backend**: Next.js API Routes, Node.js
- **Database**: Supabase PostgreSQL
- **Mail**: IMAP, SMTP, mailparser
- **Deployment**: Vercel

## Hızlı Başlangıç

### 1. Kurulum

\`\`\`bash
git clone https://github.com/ennstekin/CS---DB.git
cd CS---DB
pnpm install
\`\`\`

### 2. Environment Variables

\`.env.local\` dosyası oluşturun:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_supabase_database_url
\`\`\`

### 3. Database Setup

\`\`\`bash
pnpm db:setup
\`\`\`

### 4. Development Server

\`\`\`bash
pnpm dev
\`\`\`

Uygulama http://localhost:3000 adresinde çalışacaktır.

## Mail Entegrasyonu (Gmail)

1. Google hesabınızda "2-Step Verification" aktif edin
2. App Passwords oluşturun
3. Dashboard → Settings → Mail Server:
   - IMAP: imap.gmail.com:993 (TLS)
   - SMTP: smtp.gmail.com:587 (STARTTLS)

## Scripts

- \`pnpm dev\` - Development server
- \`pnpm build\` - Production build
- \`pnpm db:setup\` - Database kurulumu

## Lisans

MIT
