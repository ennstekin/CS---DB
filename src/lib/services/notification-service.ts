// Customer Notification Service
import { SmtpMailClient, SmtpConfig } from '../mail/smtp-client';

interface CustomerNotification {
  to: string;
  customerName: string;
  returnNumber: string;
  orderNumber: string;
  status: string;
  reason?: string;
  totalAmount?: number;
}

const STATUS_MESSAGES: Record<string, { subject: string; title: string; message: string }> = {
  REQUESTED: {
    subject: 'İade Talebiniz Alındı',
    title: 'İade Talebiniz Alındı',
    message: 'İade talebiniz başarıyla oluşturuldu. En kısa sürede incelenerek size bilgi verilecektir.',
  },
  APPROVED: {
    subject: 'İade Talebiniz Onaylandı',
    title: 'İade Talebiniz Onaylandı',
    message: 'İade talebiniz onaylandı. Ürünlerinizi belirtilen adrese gönderebilirsiniz.',
  },
  REJECTED: {
    subject: 'İade Talebiniz Reddedildi',
    title: 'İade Talebiniz Reddedildi',
    message: 'Üzgünüz, iade talebiniz uygun bulunmadı. Detaylı bilgi için müşteri hizmetleri ile iletişime geçebilirsiniz.',
  },
  IN_TRANSIT: {
    subject: 'Kargo Bilgisi Güncellendi',
    title: 'Kargonuz Yolda',
    message: 'İade kargonuz tarafımıza ulaşmak üzere.',
  },
  RECEIVED: {
    subject: 'Ürünleriniz Teslim Alındı',
    title: 'Ürünleriniz Teslim Alındı',
    message: 'İade ürünleriniz tarafımıza ulaştı. Kontrol işlemleri sonrasında iade tutarı hesabınıza aktarılacaktır.',
  },
  COMPLETED: {
    subject: 'İade İşleminiz Tamamlandı',
    title: 'İade Tamamlandı',
    message: 'İade işleminiz başarıyla tamamlandı. İade tutarı hesabınıza aktarıldı.',
  },
};

function generateEmailHtml(notification: CustomerNotification, statusInfo: { title: string; message: string }): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${statusInfo.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <tr>
      <td>
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">${statusInfo.title}</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Merhaba ${notification.customerName},
              </p>

              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                ${statusInfo.message}
              </p>

              <!-- Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">İade Numarası</span>
                        </td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                          <strong style="color: #111827; font-size: 14px;">${notification.returnNumber}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Sipariş Numarası</span>
                        </td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                          <strong style="color: #111827; font-size: 14px;">#${notification.orderNumber}</strong>
                        </td>
                      </tr>
                      ${notification.totalAmount ? `
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">İade Tutarı</span>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <strong style="color: #059669; font-size: 16px;">${notification.totalAmount.toLocaleString('tr-TR')} TL</strong>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Track Link -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center; padding: 20px 0;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://yourapp.com'}/portal/track"
                       style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600; font-size: 14px;">
                      İade Durumunu Takip Et
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">
                Herhangi bir sorunuz varsa müşteri hizmetlerimize ulaşabilirsiniz.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

export async function sendReturnStatusNotification(
  smtpConfig: SmtpConfig,
  notification: CustomerNotification
): Promise<boolean> {
  const statusInfo = STATUS_MESSAGES[notification.status];

  if (!statusInfo) {
    console.log(`⚠️ No notification template for status: ${notification.status}`);
    return false;
  }

  try {
    const client = new SmtpMailClient(smtpConfig);

    const html = generateEmailHtml(notification, statusInfo);
    const text = `
${statusInfo.title}

Merhaba ${notification.customerName},

${statusInfo.message}

İade Numarası: ${notification.returnNumber}
Sipariş Numarası: #${notification.orderNumber}
${notification.totalAmount ? `İade Tutarı: ${notification.totalAmount.toLocaleString('tr-TR')} TL` : ''}

İade durumunuzu takip etmek için: ${process.env.NEXT_PUBLIC_APP_URL || 'https://yourapp.com'}/portal/track

Herhangi bir sorunuz varsa müşteri hizmetlerimize ulaşabilirsiniz.
    `.trim();

    await client.sendMail({
      to: notification.to,
      subject: statusInfo.subject,
      text,
      html,
    });

    console.log(`✅ Notification sent to ${notification.to} for return ${notification.returnNumber} (status: ${notification.status})`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send notification to ${notification.to}:`, error);
    return false;
  }
}

// Helper to get SMTP config from environment
export function getSmtpConfigFromEnv(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;

  if (!host || !port || !user || !password) {
    console.warn('⚠️ SMTP configuration incomplete');
    return null;
  }

  return {
    host,
    port: parseInt(port, 10),
    user,
    password,
    secure: process.env.SMTP_SECURE === 'true',
  };
}
