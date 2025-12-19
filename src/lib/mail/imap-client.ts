import Imap from "imap";
import { simpleParser, ParsedMail } from "mailparser";
import { prisma } from "@/lib/prisma";

export interface ImapConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  tls: boolean;
}

export interface FetchedMail {
  from: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  receivedAt: Date;
  messageId?: string;
  inReplyTo?: string;
  labels?: string[];
  flags?: string[];
}

export class ImapMailClient {
  private config: ImapConfig;
  private imap: Imap | null = null;

  constructor(config: ImapConfig) {
    this.config = config;
  }

  private connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.imap = new Imap({
        user: this.config.user,
        password: this.config.password,
        host: this.config.host,
        port: this.config.port,
        tls: this.config.tls,
        tlsOptions: { rejectUnauthorized: false },
      });

      this.imap.once("ready", () => resolve());
      this.imap.once("error", (err: Error) => reject(err));
      this.imap.connect();
    });
  }

  private openInbox(): Promise<Imap.Box> {
    return new Promise((resolve, reject) => {
      if (!this.imap) {
        reject(new Error("IMAP connection not established"));
        return;
      }

      this.imap.openBox("INBOX", false, (err, box) => {
        if (err) reject(err);
        else resolve(box);
      });
    });
  }

  private parseEmail(buffer: Buffer): Promise<ParsedMail> {
    return simpleParser(buffer);
  }

  async fetchUnreadMails(limit: number = 50): Promise<FetchedMail[]> {
    return this.fetchMailsBySearch(["UNSEEN"], limit);
  }

  async fetchRecentMails(limit: number = 50): Promise<FetchedMail[]> {
    // Fetch all mails from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateString = thirtyDaysAgo.toISOString().split('T')[0].replace(/-/g, '-');

    return this.fetchMailsBySearch(["ALL", ["SINCE", dateString]], limit);
  }

  private async fetchMailsBySearch(searchCriteria: any[], limit: number): Promise<FetchedMail[]> {
    try {
      await this.connect();
      await this.openInbox();

      if (!this.imap) {
        throw new Error("IMAP connection not established");
      }

      return new Promise((resolve, reject) => {
        if (!this.imap) {
          reject(new Error("IMAP connection not established"));
          return;
        }

        this.imap.search(searchCriteria, (err, results) => {
          if (err) {
            reject(err);
            return;
          }

          if (!results || results.length === 0) {
            this.imap?.end();
            resolve([]);
            return;
          }

          // Get most recent messages by reversing and limiting
          const messageIds = results.reverse().slice(0, limit);
          const fetchedMails: FetchedMail[] = [];

          const fetch = this.imap!.fetch(messageIds, {
            bodies: "",
            markSeen: false,
          });

          fetch.on("message", (msg) => {
            let attributes: any = null;

            msg.once("attributes", (attrs) => {
              attributes = attrs;
            });

            msg.on("body", (stream) => {
              let buffer = Buffer.from("");

              stream.on("data", (chunk) => {
                buffer = Buffer.concat([buffer, chunk]);
              });

              stream.once("end", async () => {
                try {
                  const parsed = await this.parseEmail(buffer);

                  // Extract flags and labels
                  const flags = attributes?.flags || [];
                  const labels = attributes?.['x-gm-labels'] || [];

                  fetchedMails.push({
                    from: parsed.from?.text || "",
                    subject: parsed.subject || "",
                    bodyText: parsed.text || "",
                    bodyHtml: parsed.html || undefined,
                    receivedAt: parsed.date || new Date(),
                    messageId: parsed.messageId,
                    inReplyTo: parsed.inReplyTo,
                    labels: Array.isArray(labels) ? labels : [],
                    flags: Array.isArray(flags) ? flags : [],
                  });
                } catch (parseError) {
                  console.error("Error parsing email:", parseError);
                }
              });
            });
          });

          fetch.once("error", (fetchErr) => {
            reject(fetchErr);
          });

          fetch.once("end", () => {
            this.imap?.end();
            resolve(fetchedMails);
          });
        });
      });
    } catch (error) {
      if (this.imap) {
        this.imap.end();
      }
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.connect();
      this.imap?.end();
      return true;
    } catch (error) {
      console.error("IMAP connection test failed:", error);
      return false;
    }
  }

  disconnect(): void {
    if (this.imap) {
      this.imap.end();
    }
  }

  // Gmail/IMAP'de label ekle
  async addLabel(messageId: string, label: string): Promise<boolean> {
    try {
      await this.connect();
      await this.openInbox();

      if (!this.imap) {
        throw new Error("IMAP connection not established");
      }

      return new Promise((resolve, reject) => {
        if (!this.imap) {
          reject(new Error("IMAP connection not established"));
          return;
        }

        // Gmail için X-GM-LABELS kullan, diğer IMAP sunucuları için keyword
        this.imap.search([['HEADER', 'MESSAGE-ID', messageId]], (err, results) => {
          if (err) {
            reject(err);
            return;
          }

          if (!results || results.length === 0) {
            reject(new Error("Message not found"));
            return;
          }

          // Gmail için label ekle (Gmail-specific method)
          (this.imap as any).addLabels(results, label, (addErr: Error | null) => {
            this.imap?.end();
            if (addErr) {
              reject(addErr);
            } else {
              resolve(true);
            }
          });
        });
      });
    } catch (error) {
      if (this.imap) {
        this.imap.end();
      }
      throw error;
    }
  }

  // Gmail/IMAP'den label sil
  async removeLabel(messageId: string, label: string): Promise<boolean> {
    try {
      await this.connect();
      await this.openInbox();

      if (!this.imap) {
        throw new Error("IMAP connection not established");
      }

      return new Promise((resolve, reject) => {
        if (!this.imap) {
          reject(new Error("IMAP connection not established"));
          return;
        }

        this.imap.search([['HEADER', 'MESSAGE-ID', messageId]], (err, results) => {
          if (err) {
            reject(err);
            return;
          }

          if (!results || results.length === 0) {
            reject(new Error("Message not found"));
            return;
          }

          // Gmail için label sil (Gmail-specific method)
          (this.imap as any).delLabels(results, label, (delErr: Error | null) => {
            this.imap?.end();
            if (delErr) {
              reject(delErr);
            } else {
              resolve(true);
            }
          });
        });
      });
    } catch (error) {
      if (this.imap) {
        this.imap.end();
      }
      throw error;
    }
  }
}

export async function fetchAndSaveMails(config: ImapConfig): Promise<number> {
  const client = new ImapMailClient(config);

  try {
    const mails = await client.fetchUnreadMails(50);

    // Save to database
    let savedCount = 0;
    for (const mail of mails) {
      try {
        // Check if mail already exists by messageId
        if (mail.messageId) {
          const existing = await prisma.mail.findFirst({
            where: { messageId: mail.messageId },
          });

          if (existing) {
            continue; // Skip duplicate
          }
        }

        // Create mail record
        await prisma.mail.create({
          data: {
            direction: "INBOUND",
            fromEmail: mail.from,
            toEmail: config.user,
            subject: mail.subject,
            bodyText: mail.bodyText,
            bodyHtml: mail.bodyHtml,
            status: "NEW",
            receivedAt: mail.receivedAt,
            messageId: mail.messageId,
            inReplyTo: mail.inReplyTo,
            isAiAnalyzed: false,
          },
        });

        savedCount++;
      } catch (saveError) {
        console.error("Error saving mail:", saveError);
      }
    }

    return savedCount;
  } finally {
    client.disconnect();
  }
}
