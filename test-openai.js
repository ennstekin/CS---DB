const OpenAI = require('openai');
require('dotenv').config({ path: '.env.local' });

async function testOpenAI() {
  // Test 1: Environment variable kontrolü
  console.log("📝 Test 1: Environment Variable");
  console.log("API Key var mı?", !!process.env.OPENAI_API_KEY);
  console.log("API Key uzunluğu:", process.env.OPENAI_API_KEY?.length || 0);
  console.log("API Key prefix:", process.env.OPENAI_API_KEY?.substring(0, 10));
  
  if (!process.env.OPENAI_API_KEY) {
    console.log("❌ OPENAI_API_KEY bulunamadı!");
    return;
  }
  
  // Test 2: OpenAI client oluştur
  console.log("\n📝 Test 2: OpenAI Client Oluşturma");
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log("✅ Client oluşturuldu");
  
  // Test 3: Basit bir API çağrısı
  console.log("\n📝 Test 3: API Çağrısı (Models List)");
  try {
    const models = await openai.models.list();
    console.log("✅ API çalışıyor! Model sayısı:", models.data.length);
    console.log("İlk 3 model:", models.data.slice(0, 3).map(m => m.id).join(", "));
  } catch (error) {
    console.log("❌ API Hatası:");
    console.log("Status:", error.status);
    console.log("Message:", error.message);
    console.log("Code:", error.code);
  }
}

testOpenAI();
