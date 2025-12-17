#!/usr/bin/env node
/**
 * Database Setup Script
 * Supabase PostgreSQL'de gerekli tabloları oluşturur
 *
 * Kullanım: node scripts/setup-database.js
 */

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

// PostgreSQL bağlantı ayarları
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable bulunamadı!');
  console.error('   .env.local dosyasını kontrol edin.');
  process.exit(1);
}

async function setupDatabase() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 PostgreSQL\'e bağlanılıyor...');
    await client.connect();
    console.log('✓ Bağlantı başarılı\n');

    // Settings tablosu
    console.log('📋 Settings tablosu oluşturuluyor...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('  ✓ Tablo oluşturuldu');

    // Mails tablosu
    console.log('\n📧 Mails tablosu oluşturuluyor...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS mails (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        message_id TEXT UNIQUE,
        from_email TEXT NOT NULL,
        to_email TEXT,
        subject TEXT,
        body_text TEXT,
        body_html TEXT,
        status TEXT DEFAULT 'NEW',
        priority TEXT DEFAULT 'NORMAL',
        is_ai_analyzed BOOLEAN DEFAULT false,
        ai_category TEXT,
        ai_summary TEXT,
        suggested_order_ids TEXT[],
        match_confidence DECIMAL(3,2),
        received_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('  ✓ Tablo oluşturuldu');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
    `);
    console.log('  ✓ Settings index oluşturuldu');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_mails_status ON mails(status);
      CREATE INDEX IF NOT EXISTS idx_mails_received_at ON mails(received_at DESC);
      CREATE INDEX IF NOT EXISTS idx_mails_message_id ON mails(message_id);
    `);
    console.log('  ✓ Mails index\'leri oluşturuldu');

    await client.query(`
      ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
      ALTER TABLE mails ENABLE ROW LEVEL SECURITY;
    `);
    console.log('  ✓ RLS aktifleştirildi');

    await client.query(`
      DROP POLICY IF EXISTS "Allow all access to settings" ON settings;
      DROP POLICY IF EXISTS "Allow all access to mails" ON mails;
    `);

    await client.query(`
      CREATE POLICY "Allow all access to settings" ON settings
      FOR ALL TO anon, authenticated
      USING (true) WITH CHECK (true);

      CREATE POLICY "Allow all access to mails" ON mails
      FOR ALL TO anon, authenticated
      USING (true) WITH CHECK (true);
    `);
    console.log('  ✓ Policy\'ler oluşturuldu');

    // PostgREST schema cache'i yenile
    console.log('\n🔄 PostgREST schema cache yenileniyor...');
    await client.query(`NOTIFY pgrst, 'reload schema';`);
    console.log('  ✓ Cache yenilendi');

    console.log('\n✅ Database kurulumu tamamlandı!');
    console.log('\n📝 Sonraki adımlar:');
    console.log('   1. http://localhost:3000/dashboard/settings adresine git');
    console.log('   2. Mail bağlantı ayarlarını yapılandır');
    console.log('   3. "Mail Çek" butonuyla mail entegrasyonunu test et\n');

  } catch (error) {
    console.error('\n❌ Hata:', error.message);
    console.error('\n💡 Çözüm önerileri:');
    console.error('   - DATABASE_URL doğru mu?');
    console.error('   - Supabase projesi çalışıyor mu?');
    console.error('   - İnternet bağlantısı var mı?\n');
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Script'i çalıştır
setupDatabase();
