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

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
    `);
    console.log('  ✓ Index oluşturuldu');

    await client.query(`
      ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
    `);
    console.log('  ✓ RLS aktifleştirildi');

    await client.query(`
      DROP POLICY IF EXISTS "Allow all access to settings" ON settings;
    `);

    await client.query(`
      CREATE POLICY "Allow all access to settings" ON settings
      FOR ALL TO anon, authenticated
      USING (true) WITH CHECK (true);
    `);
    console.log('  ✓ Policy oluşturuldu');

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
