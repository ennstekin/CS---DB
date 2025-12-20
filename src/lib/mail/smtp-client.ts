import nodemailer from "nodemailer";
import { supabase } from "@/lib/supabase";

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  secure: boolean; // true for 465, false for other ports
}

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  inReplyTo?: string;
  references?: string;
}

export class SmtpMailClient {
  private config: SmtpConfig;
  private transporter: nodemailer.Transporter | null = null;

  constructor(config: SmtpConfig) {
    this.config = config;
  }

  private createTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.user,
          pass: this.config.password,
        },
      });
    }
    return this.transporter;
  }

  async sendMail(options: SendMailOptions): Promise<string> {
    const transporter = this.createTransporter();

    const mailOptions: nodemailer.SendMailOptions = {
      from: this.config.user,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    // Add reply headers if this is a reply
    if (options.inReplyTo) {
      mailOptions.inReplyTo = options.inReplyTo;
      mailOptions.references = options.references || options.inReplyTo;
    }

    const info = await transporter.sendMail(mailOptions);
    return info.messageId;
  }

  async testConnection(): Promise<boolean> {
    try {
      const transporter = this.createTransporter();
      await transporter.verify();
      return true;
    } catch (error) {
      console.error("SMTP bağlantı testi başarısız:", error);
      return false;
    }
  }
}

export async function sendMailAndSave(
  config: SmtpConfig,
  options: SendMailOptions,
  originalMailId?: string
): Promise<string> {
  const client = new SmtpMailClient(config);

  try {
    // Send mail
    const messageId = await client.sendMail(options);

    // Save to database using Supabase
    const mailData = {
      direction: "OUTBOUND",
      from_email: config.user,
      to_email: options.to,
      subject: options.subject,
      body_text: options.text,
      body_html: options.html,
      status: "RESOLVED",
      sent_at: new Date().toISOString(),
      message_id: messageId,
      in_reply_to: originalMailId || null,
    };

    const { error: insertError } = await supabase
      .from("mails")
      .insert(mailData);

    if (insertError) {
      console.error("Mail kaydedilemedi:", insertError);
    }

    // Update original mail status if this is a reply
    if (originalMailId) {
      const { error: updateError } = await supabase
        .from("mails")
        .update({ status: "RESOLVED" })
        .eq("id", originalMailId);

      if (updateError) {
        console.error("Orijinal mail güncellenemedi:", updateError);
      }
    }

    return messageId;
  } catch (error) {
    console.error("Mail gönderme hatası:", error);
    throw error;
  }
}
