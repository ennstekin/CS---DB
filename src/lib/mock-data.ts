// Mock data for development

export const mockMails = [
  {
    id: "1",
    from: "ahmet.yilmaz@gmail.com",
    subject: "Siparişim ne zaman gelecek?",
    preview: "Merhaba, 3 gün önce verdiğim #1234 numaralı siparişim hala kargoya verilmedi...",
    body: `Merhaba,

3 gün önce verdiğim #1234 numaralı siparişim hala kargoya verilmedi. Ne zaman teslim alacağım hakkında bilgi alabilir miyim?

Saygılarımla,
Ahmet Yılmaz`,
    receivedAt: "2025-01-15T10:30:00",
    status: "NEW" as const,
    priority: "HIGH" as const,
    isAiAnalyzed: true,
    aiCategory: "ORDER_INQUIRY",
    aiSummary: "Müşteri #1234 numaralı siparişinin kargo durumunu soruyor. 3 gün önce sipariş verilmiş.",
    suggestedOrderNumbers: ["#1234"],
    matchConfidence: 0.95,
  },
  {
    id: "2",
    from: "elif.demir@hotmail.com",
    subject: "İade talebi",
    preview: "Aldığım ürün beklediğim gibi değildi, iade etmek istiyorum...",
    body: `Merhabalar,

Geçen hafta aldığım mavi elbise beklediğim renkte çıkmadı. İade etmek istiyorum. Nasıl bir prosedür izlemem gerekiyor?

Teşekkürler,
Elif Demir`,
    receivedAt: "2025-01-15T09:15:00",
    status: "OPEN" as const,
    priority: "NORMAL" as const,
    isAiAnalyzed: true,
    aiCategory: "RETURN_REQUEST",
    aiSummary: "Müşteri mavi elbise için iade talebi. Renk beklentisi karşılanmamış.",
    suggestedOrderNumbers: ["#1198", "#1201"],
    matchConfidence: 0.78,
  },
  {
    id: "3",
    from: "mehmet.kaya@icloud.com",
    subject: "Harika hizmet!",
    preview: "Ürün çok çabuk geldi, çok memnun kaldım teşekkürler...",
    body: `Merhaba,

Dün sipariş verdiğim ürün bugün elime ulaştı. Hem ürün kalitesi hem de hızlı kargo için çok teşekkür ederim!

Mehmet Kaya`,
    receivedAt: "2025-01-14T16:45:00",
    status: "RESOLVED" as const,
    priority: "LOW" as const,
    isAiAnalyzed: true,
    aiCategory: "POSITIVE_FEEDBACK",
    aiSummary: "Pozitif geri bildirim. Müşteri hızlı kargo ve ürün kalitesinden memnun.",
    suggestedOrderNumbers: ["#1245"],
    matchConfidence: 0.65,
  },
  {
    id: "4",
    from: "ayse.ozturk@gmail.com",
    subject: "Yanlış ürün geldi",
    preview: "Sipariş ettiğim siyah ayakkabı yerine beyaz geldi, değişim yapmak istiyorum...",
    body: `Merhaba,

#1189 numaralı siparişimde siyah ayakkabı sipariş etmiştim ancak beyaz renk geldi. Ürünü değiştirmek istiyorum. Nasıl işlem yapmalıyım?

İyi çalışmalar,
Ayşe Öztürk`,
    receivedAt: "2025-01-14T14:20:00",
    status: "PENDING" as const,
    priority: "HIGH" as const,
    isAiAnalyzed: true,
    aiCategory: "WRONG_ITEM",
    aiSummary: "#1189 numaralı siparişte yanlış ürün gönderilmiş. Siyah ayakkabı yerine beyaz gelmiş.",
    suggestedOrderNumbers: ["#1189"],
    matchConfidence: 0.98,
  },
  {
    id: "5",
    from: "can.arslan@yahoo.com",
    subject: "Fatura düzenlemesi",
    preview: "Kurumsal fatura kestirebilir miyim?",
    body: `İyi günler,

#1223 numaralı siparişim için kurumsal fatura kestirmek istiyorum. Vergi levhası ve diğer bilgileri iletiyorum.

Can Arslan`,
    receivedAt: "2025-01-14T11:00:00",
    status: "OPEN" as const,
    priority: "NORMAL" as const,
    isAiAnalyzed: true,
    aiCategory: "INVOICE_REQUEST",
    aiSummary: "#1223 numaralı sipariş için kurumsal fatura talebi.",
    suggestedOrderNumbers: ["#1223"],
    matchConfidence: 0.92,
  },
  {
    id: "6",
    from: "zeynep.yildiz@outlook.com",
    subject: "Kargo takip numarası?",
    preview: "Siparişimin kargo takip numarasını öğrenebilir miyim?",
    body: `Merhabalar,

2 gün önce verdiğim siparişin kargo takip numarasını almak istiyorum. Sipariş numaram #1212.

Zeynep Yıldız`,
    receivedAt: "2025-01-13T15:30:00",
    status: "RESOLVED" as const,
    priority: "NORMAL" as const,
    isAiAnalyzed: true,
    aiCategory: "TRACKING_INQUIRY",
    aiSummary: "#1212 numaralı sipariş için kargo takip numarası talebi.",
    suggestedOrderNumbers: ["#1212"],
    matchConfidence: 0.96,
  },
  {
    id: "7",
    from: "burak.celik@gmail.com",
    subject: "İndirim kodu çalışmıyor",
    preview: "YENI25 indirim kodunu kullanamadım, yardımcı olabilir misiniz?",
    body: `Merhaba,

Sepetimde YENI25 indirim kodunu kullanmaya çalıştım ama hata veriyor. Kod hala geçerli mi?

Burak Çelik`,
    receivedAt: "2025-01-13T10:15:00",
    status: "NEW" as const,
    priority: "NORMAL" as const,
    isAiAnalyzed: true,
    aiCategory: "DISCOUNT_ISSUE",
    aiSummary: "YENI25 indirim kodu kullanılamıyor. Müşteri sepete ekleyemiyor.",
    suggestedOrderNumbers: [],
    matchConfidence: 0.0,
  },
  {
    id: "8",
    from: "selin.kurt@gmail.com",
    subject: "Beden değişimi",
    preview: "Aldığım pantolonun bedeni küçük geldi, değiştirebilir miyim?",
    body: `İyi günler,

#1205 numaralı siparişimde M beden pantolon almıştım ama küçük geldi. L bedene değiştirebilir miyim? Ürün hiç kullanılmadı.

Teşekkürler,
Selin Kurt`,
    receivedAt: "2025-01-12T16:00:00",
    status: "OPEN" as const,
    priority: "NORMAL" as const,
    isAiAnalyzed: true,
    aiCategory: "SIZE_EXCHANGE",
    aiSummary: "#1205 numaralı siparişte M beden pantolon küçük gelmiş, L bedene değişim talebi.",
    suggestedOrderNumbers: ["#1205"],
    matchConfidence: 0.89,
  },
];

export type MockMail = typeof mockMails[0];
