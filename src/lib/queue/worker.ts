// Background Worker - İkas Order Fetcher
import { IkasClient } from '../ikas/client';
import { supabase } from '../supabase';
import { dequeueJob, completeJob, failJob, cacheOrder, type Job } from './index';

export interface WorkerConfig {
  ikasClientId: string;
  ikasClientSecret: string;
  ikasStoreName: string;
  maxJobsPerRun?: number;
  delayBetweenJobs?: number; // ms
}

export class QueueWorker {
  private ikasClient: IkasClient;
  private maxJobsPerRun: number;
  private delayBetweenJobs: number;
  private isRunning: boolean = false;

  constructor(config: WorkerConfig) {
    this.ikasClient = new IkasClient({
      clientId: config.ikasClientId,
      clientSecret: config.ikasClientSecret,
      storeName: config.ikasStoreName,
    });
    this.maxJobsPerRun = config.maxJobsPerRun || 10;
    this.delayBetweenJobs = config.delayBetweenJobs || 1000; // 1 saniye varsayılan
  }

  /**
   * İş kuyruğunu işle (batch)
   */
  async processQueue(): Promise<{ processed: number; failed: number; errors: string[] }> {
    if (this.isRunning) {
      console.log('⚠️ Worker already running, skipping...');
      return { processed: 0, failed: 0, errors: ['Worker already running'] };
    }

    this.isRunning = true;
    console.log('🚀 Queue worker started');

    let processed = 0;
    let failed = 0;
    const errors: string[] = [];
    let consecutiveRateLimits = 0;

    try {
      for (let i = 0; i < this.maxJobsPerRun; i++) {
        // Bir sonraki job'ı al
        const job = await dequeueJob(['fetch_ikas_order']);

        if (!job) {
          console.log('✅ No more jobs in queue');
          break;
        }

        console.log(`📦 Processing job ${job.id} (attempt ${job.attempts}/${job.max_attempts})`);

        try {
          // Job'ı işle
          await this.processIkasOrderJob(job);

          // Başarılı olarak işaretle
          await completeJob(job.id);
          processed++;
          consecutiveRateLimits = 0; // Reset counter

          console.log(`✅ Job ${job.id} completed`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`❌ Job ${job.id} failed:`, errorMessage);

          // Rate limit hatası kontrolü
          const isRateLimit = errorMessage.includes('429') ||
                              errorMessage.includes('Too Many Requests') ||
                              errorMessage.includes('rate limit');

          if (isRateLimit) {
            consecutiveRateLimits++;
            console.log(`⏸️ Rate limit hit (${consecutiveRateLimits} consecutive)`);

            // Job'ı 15 dakika sonra tekrar dene
            const retryDelay = 15; // 15 dakika
            await failJob(job.id, `Rate limit: Will retry in ${retryDelay} minutes`);
            failed++;
            errors.push(`Job ${job.id}: Rate limit - retry scheduled`);

            // 2 kere üst üste rate limit alırsa dur
            if (consecutiveRateLimits >= 2) {
              console.log('🛑 Multiple rate limits detected, stopping worker');
              break;
            }

            // Rate limit sonrası 30 saniye bekle
            console.log('⏳ Waiting 30 seconds before next job...');
            await new Promise(resolve => setTimeout(resolve, 30000));
          } else {
            // Normal hata - retry logic
            await failJob(job.id, errorMessage);
            failed++;
            errors.push(`Job ${job.id}: ${errorMessage}`);
          }
        }

        // Job'lar arası bekleme (rate limit için)
        if (i < this.maxJobsPerRun - 1 && this.delayBetweenJobs > 0) {
          await new Promise(resolve => setTimeout(resolve, this.delayBetweenJobs));
        }
      }
    } finally {
      this.isRunning = false;
      console.log(`🏁 Worker finished: ${processed} processed, ${failed} failed`);
    }

    return { processed, failed, errors };
  }

  /**
   * İkas order fetch job'ını işle
   */
  private async processIkasOrderJob(job: Job): Promise<void> {
    const mail_id = job.payload.mail_id as string | undefined;
    const from = job.payload.from as string | undefined;
    const subject = job.payload.subject as string | undefined;
    const body = job.payload.body as string | undefined;

    if (!mail_id) {
      throw new Error('mail_id required in job payload');
    }

    console.log(`🔍 Fetching İkas order for mail: ${mail_id}`);

    // Mail içeriğinden sipariş numarası çıkar
    const { extractOrderNumber } = await import('../ikas/client');
    const fullText = `${subject || ''} ${body || ''}`;
    const orderNumber = extractOrderNumber(fullText);

    let orderData = null;

    if (orderNumber) {
      console.log(`📦 Order number found: ${orderNumber}`);
      orderData = await this.ikasClient.getOrderByNumber(orderNumber);
    } else if (from) {
      console.log(`📧 No order number, trying email: ${from}`);
      const orders = await this.ikasClient.getOrdersByEmail(from, 3);
      if (orders.length > 0) {
        orderData = orders[0]; // En son sipariş
        console.log(`📦 Found order by email: ${orderData.orderNumber}`);
      }
    } else {
      console.log('⚠️ No order number and no email to search');
    }

    if (!orderData) {
      throw new Error('Order not found in İkas');
    }

    // Cache'e kaydet
    const cached = await cacheOrder(
      mail_id,
      orderData.orderNumber,
      orderData as any // Raw order data
    );

    if (!cached) {
      throw new Error('Failed to cache order data');
    }

    console.log(`✅ Order cached: ${orderData.orderNumber} for mail: ${mail_id}`);
  }
}

/**
 * Worker'ı çalıştırmak için helper fonksiyon
 */
export async function runWorker(): Promise<{ processed: number; failed: number; errors: string[] }> {
  // Supabase'den İkas ayarlarını çek
  const { data: settings, error: settingsError } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['ikas_client_id', 'ikas_client_secret', 'ikas_store_name']);

  if (settingsError) {
    throw new Error(`Failed to fetch settings: ${settingsError.message}`);
  }

  // Settings'i map'e çevir
  const settingsMap: Record<string, string> = {};
  settings?.forEach((row) => {
    settingsMap[row.key] = row.value;
  });

  // İkas credentials kontrolü
  if (!settingsMap.ikas_client_id || !settingsMap.ikas_client_secret || !settingsMap.ikas_store_name) {
    throw new Error('İkas credentials not configured');
  }

  // Worker'ı oluştur ve çalıştır
  const worker = new QueueWorker({
    ikasClientId: settingsMap.ikas_client_id,
    ikasClientSecret: settingsMap.ikas_client_secret,
    ikasStoreName: settingsMap.ikas_store_name,
    maxJobsPerRun: 5, // Her seferinde max 5 job (rate limit için azaltıldı)
    delayBetweenJobs: 3000, // 3 saniye (rate limit için artırıldı)
  });

  return await worker.processQueue();
}
