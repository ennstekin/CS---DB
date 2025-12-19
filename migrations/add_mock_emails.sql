-- Mock emails for real İkas orders
-- Order 132440: Returned order
-- Order 131721: Delivered order
-- Order 118082: Return requested

-- Mock Email 1: Order 132440 (Returned/İade Edildi)
INSERT INTO mails (
  message_id,
  from_email,
  to_email,
  subject,
  body_text,
  body_html,
  received_at,
  labels,
  flags,
  created_at
) VALUES (
  'mock-132440-returned@example.com',
  'ahmet.yilmaz@gmail.com',
  'destek@magaza.com',
  'Sipariş #132440 - İade İşlemi Hakkında',
  'Merhaba,

2 hafta önce vermiş olduğum #132440 numaralı siparişimi iade etmiştim. Kargoya teslim ettim ve takip numarası ile gönderim yapıldı. Ancak henüz iade işlemim tamamlanmadı ve param hesabıma geçmedi.

İade işlemimin durumu nedir? Ne zaman param iade edilecek?

Teşekkürler,
Ahmet Yılmaz',
  '<p>Merhaba,</p><p>2 hafta önce vermiş olduğum <strong>#132440</strong> numaralı siparişimi iade etmiştim. Kargoya teslim ettim ve takip numarası ile gönderim yapıldı. Ancak henüz iade işlemim tamamlanmadı ve param hesabıma geçmedi.</p><p>İade işlemimin durumu nedir? Ne zaman param iade edilecek?</p><p>Teşekkürler,<br>Ahmet Yılmaz</p>',
  NOW() - INTERVAL '2 hours',
  ARRAY['INBOX', 'UNREAD']::TEXT[],
  ARRAY[]::TEXT[],
  NOW() - INTERVAL '2 hours'
);

-- Mock Email 2: Order 131721 (Delivered/Teslim Edildi)
INSERT INTO mails (
  message_id,
  from_email,
  to_email,
  subject,
  body_text,
  body_html,
  received_at,
  labels,
  flags,
  created_at
) VALUES (
  'mock-131721-delivered@example.com',
  'zeynep.kaya@hotmail.com',
  'destek@magaza.com',
  '131721 Numaralı Sipariş Teslim Edildi - Teşekkürler!',
  'Merhabalar,

Geçen hafta verdiğim 131721 numaralı sipariş bugün elime ulaştı. Ürünler çok güzel paketlenmiş ve harika durumda. Özellikle hızlı kargonuz için teşekkür ederim.

Bir sorum var: Aldığım üründen çok memnunum ama bir arkadaşım da aynı ürünü almak istiyor. Hala stokta var mı?

İyi çalışmalar,
Zeynep Kaya',
  '<p>Merhabalar,</p><p>Geçen hafta verdiğim <strong>131721</strong> numaralı sipariş bugün elime ulaştı. Ürünler çok güzel paketlenmiş ve harika durumda. Özellikle hızlı kargonuz için teşekkür ederim.</p><p>Bir sorum var: Aldığım üründen çok memnunum ama bir arkadaşım da aynı ürünü almak istiyor. Hala stokta var mı?</p><p>İyi çalışmalar,<br>Zeynep Kaya</p>',
  NOW() - INTERVAL '5 hours',
  ARRAY['INBOX']::TEXT[],
  ARRAY['\Seen']::TEXT[],
  NOW() - INTERVAL '5 hours'
);

-- Mock Email 3: Order 118082 (Return Requested/İade Talep Edildi)
INSERT INTO mails (
  message_id,
  from_email,
  to_email,
  subject,
  body_text,
  body_html,
  received_at,
  labels,
  flags,
  created_at
) VALUES (
  'mock-118082-return-request@example.com',
  'mehmet.demir@outlook.com',
  'destek@magaza.com',
  'Sipariş 118082 - İade Talebi',
  'Sayın Yetkili,

118082 sipariş numarası ile aldığım ürünü iade etmek istiyorum. Ürün beklediğim gibi çıkmadı, rengi fotoğraftakinden farklı ve beden küçük geldi.

İade prosedürü nasıl işliyor? Kargo ücreti bana mı ait yoksa siz mi karşılıyorsunuz? İade için onay verirseniz ne zamana kadar kargoya teslim etmem gerekiyor?

Ayrıca ürünün fiyatı iade edilecek mi yoksa değişim yapabilir miyim?

İlginize teşekkürler,
Mehmet Demir
Tel: 0532 xxx xx xx',
  '<p>Sayın Yetkili,</p><p><strong>118082</strong> sipariş numarası ile aldığım ürünü iade etmek istiyorum. Ürün beklediğim gibi çıkmadı, rengi fotoğraftakinden farklı ve beden küçük geldi.</p><p>İade prosedürü nasıl işliyor? Kargo ücreti bana mı ait yoksa siz mi karşılıyorsunuz? İade için onay verirseniz ne zamana kadar kargoya teslim etmem gerekiyor?</p><p>Ayrıca ürünün fiyatı iade edilecek mi yoksa değişim yapabilir miyim?</p><p>İlginize teşekkürler,<br>Mehmet Demir<br>Tel: 0532 xxx xx xx</p>',
  NOW() - INTERVAL '30 minutes',
  ARRAY['INBOX', 'IMPORTANT']::TEXT[],
  ARRAY['\Flagged']::TEXT[],
  NOW() - INTERVAL '30 minutes'
);

-- Verify insertion
SELECT
  id,
  from_email,
  subject,
  received_at,
  labels,
  flags
FROM mails
WHERE message_id IN (
  'mock-132440-returned@example.com',
  'mock-131721-delivered@example.com',
  'mock-118082-return-request@example.com'
)
ORDER BY received_at DESC;
