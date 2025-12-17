import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

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
      console.error("SMTP connection test failed:", error);
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

    // Save to database
    const mailData: any = {
      direction: "OUTBOUND",
      fromEmail: config.user,
      toEmail: options.to,
      subject: options.subject,
      bodyText: options.text,
      bodyHtml: options.html,
      status: "RESOLVED",
      sentAt: new Date(),
      messageId,
    };

    // Link to original mail if this is a reply
    if (originalMailId) {
      mailData.inReplyTo = originalMailId;
    }

    await prisma.mail.create({
      data: mailData,
    });

    // Update original mail status if this is a reply
    if (originalMailId) {
      await prisma.mail.update({
        where: { id: originalMailId },
        data: { status: "RESOLVED" },
      });
    }

    return messageId;
  } catch (error) {
    console.error("Error sending mail:", error);
    throw error;
  }
}
