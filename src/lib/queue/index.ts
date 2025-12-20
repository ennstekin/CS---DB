// Background Job Queue System - Direct SQL Implementation
import { supabase } from '../supabase';

export type JobType = 'fetch_ikas_order' | 'process_mail' | 'cleanup';

export interface Job {
  id: string;
  job_type: JobType;
  payload: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  attempts: number;
  max_attempts: number;
  error_message?: string;
  scheduled_at: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface IkasOrderCache {
  id: string;
  mail_id: string;
  order_number: string;
  order_data: Record<string, unknown>;
  fetched_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Enqueue a new background job (direct SQL)
 */
export async function enqueueJob(
  jobType: JobType,
  payload: Record<string, unknown>,
  priority: number = 0
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('job_queue')
      .insert({
        job_type: jobType,
        payload,
        priority,
        status: 'pending',
        attempts: 0,
        max_attempts: 3,
        scheduled_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ İş kuyruğuna eklenemedi:', error);
      return null;
    }

    console.log(`✅ İş kuyruğa eklendi: ${jobType} (ID: ${data.id})`);
    return data.id;
  } catch (error) {
    console.error('❌ İş kuyruğa eklenirken hata:', error);
    return null;
  }
}

/**
 * Dequeue next job from queue (with row-level locking)
 */
export async function dequeueJob(jobTypes?: JobType[]): Promise<Job | null> {
  try {
    // Find next pending job
    let query = supabase
      .from('job_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1);

    if (jobTypes && jobTypes.length > 0) {
      query = query.in('job_type', jobTypes);
    }

    const { data: jobs, error: fetchError } = await query;

    if (fetchError || !jobs || jobs.length === 0) {
      return null;
    }

    const job = jobs[0];

    // Update job status to processing (optimistic locking)
    const { data: updatedJob, error: updateError } = await supabase
      .from('job_queue')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        attempts: job.attempts + 1,
      })
      .eq('id', job.id)
      .eq('status', 'pending') // Only update if still pending
      .select()
      .single();

    if (updateError || !updatedJob) {
      // Another worker grabbed it, try again
      return dequeueJob(jobTypes);
    }

    return updatedJob as Job;
  } catch (error) {
    console.error('❌ İş alınırken hata:', error);
    return null;
  }
}

/**
 * Mark job as completed
 */
export async function completeJob(jobId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('job_queue')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (error) {
      console.error('❌ İş tamamlanamadı:', error);
      return false;
    }

    console.log(`✅ İş tamamlandı: ${jobId}`);
    return true;
  } catch (error) {
    console.error('❌ İş tamamlanırken hata:', error);
    return false;
  }
}

/**
 * Mark job as failed (with retry logic)
 */
export async function failJob(jobId: string, errorMessage: string): Promise<boolean> {
  try {
    // Get current job to check attempts
    const { data: job, error: fetchError } = await supabase
      .from('job_queue')
      .select('attempts, max_attempts')
      .eq('id', jobId)
      .single();

    if (fetchError || !job) {
      return false;
    }

    const shouldRetry = job.attempts < job.max_attempts;

    const { error } = await supabase
      .from('job_queue')
      .update({
        status: shouldRetry ? 'pending' : 'failed',
        error_message: errorMessage,
        scheduled_at: shouldRetry
          ? new Date(Date.now() + Math.pow(2, job.attempts) * 1000).toISOString() // Exponential backoff
          : undefined,
      })
      .eq('id', jobId);

    if (error) {
      console.error('❌ İş başarısız olarak işaretlenemedi:', error);
      return false;
    }

    console.log(`⚠️ İş başarısız: ${jobId} - ${errorMessage}${shouldRetry ? ' (yeniden denenecek)' : ''}`);
    return true;
  } catch (error) {
    console.error('❌ İş başarısız işaretlenirken hata:', error);
    return false;
  }
}

/**
 * Get cached İkas order for a mail
 */
export async function getCachedOrder(mailId: string): Promise<IkasOrderCache | null> {
  try {
    const { data, error } = await supabase
      .from('ikas_order_cache')
      .select('*')
      .eq('mail_id', mailId)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('❌ Cache alınamadı:', error);
      return null;
    }

    console.log(`✅ Cache hit: ${mailId}`);
    return data as IkasOrderCache;
  } catch (error) {
    console.error('❌ Cache alınırken hata:', error);
    return null;
  }
}

/**
 * Cache İkas order data
 */
export async function cacheOrder(
  mailId: string,
  orderNumber: string,
  orderData: Record<string, unknown>
): Promise<boolean> {
  try {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes cache (orders change frequently)

    const { error } = await supabase
      .from('ikas_order_cache')
      .upsert({
        mail_id: mailId,
        order_number: orderNumber,
        order_data: orderData,
        fetched_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      }, {
        onConflict: 'mail_id'
      });

    if (error) {
      console.error('❌ Cache kaydedilemedi:', error);
      return false;
    }

    console.log(`✅ Cache kaydedildi: ${orderNumber} -> mail: ${mailId}`);
    return true;
  } catch (error) {
    console.error('❌ Cache kaydedilirken hata:', error);
    return false;
  }
}

/**
 * Enqueue İkas order fetch job for a mail
 */
export async function enqueueIkasOrderFetch(
  mailId: string,
  mailFrom: string,
  mailSubject: string,
  mailBody: string,
  priority: number = 5
): Promise<string | null> {
  return enqueueJob(
    'fetch_ikas_order',
    {
      mail_id: mailId,
      from: mailFrom,
      subject: mailSubject,
      body: mailBody,
    },
    priority
  );
}

/**
 * Clean up old completed/failed jobs
 */
export async function cleanupOldJobs(daysOld: number = 7): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data, error } = await supabase
      .from('job_queue')
      .delete()
      .in('status', ['completed', 'failed'])
      .lt('created_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      console.error('❌ Eski işler temizlenemedi:', error);
      return 0;
    }

    const count = data?.length || 0;
    console.log(`🗑️ ${count} eski iş temizlendi`);
    return count;
  } catch (error) {
    console.error('❌ Temizlik sırasında hata:', error);
    return 0;
  }
}
