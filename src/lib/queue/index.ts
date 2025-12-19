// Background Job Queue System
import { supabase } from '../supabase';

export type JobType = 'fetch_ikas_order' | 'process_mail' | 'cleanup';

export interface Job {
  id: string;
  job_type: JobType;
  payload: Record<string, any>;
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
  order_data: Record<string, any>;
  fetched_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Enqueue a new background job
 */
export async function enqueueJob(
  jobType: JobType,
  payload: Record<string, any>,
  priority: number = 0
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('enqueue_job', {
      p_job_type: jobType,
      p_payload: payload,
      p_priority: priority,
    });

    if (error) {
      console.error('❌ Failed to enqueue job:', error);
      return null;
    }

    console.log(`✅ Job enqueued: ${jobType} (ID: ${data})`);
    return data;
  } catch (error) {
    console.error('❌ Error enqueueing job:', error);
    return null;
  }
}

/**
 * Dequeue next job from queue (atomic operation)
 */
export async function dequeueJob(jobTypes?: JobType[]): Promise<Job | null> {
  try {
    const { data, error } = await supabase.rpc('dequeue_job', {
      p_job_types: jobTypes || null,
    });

    if (error) {
      console.error('❌ Failed to dequeue job:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return data[0] as Job;
  } catch (error) {
    console.error('❌ Error dequeuing job:', error);
    return null;
  }
}

/**
 * Mark job as completed
 */
export async function completeJob(jobId: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('complete_job', {
      p_job_id: jobId,
    });

    if (error) {
      console.error('❌ Failed to complete job:', error);
      return false;
    }

    console.log(`✅ Job completed: ${jobId}`);
    return true;
  } catch (error) {
    console.error('❌ Error completing job:', error);
    return false;
  }
}

/**
 * Mark job as failed (with retry logic)
 */
export async function failJob(jobId: string, errorMessage: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('fail_job', {
      p_job_id: jobId,
      p_error_message: errorMessage,
    });

    if (error) {
      console.error('❌ Failed to fail job:', error);
      return false;
    }

    console.log(`⚠️ Job failed: ${jobId} - ${errorMessage}`);
    return true;
  } catch (error) {
    console.error('❌ Error failing job:', error);
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
        // No rows returned
        return null;
      }
      console.error('❌ Failed to get cached order:', error);
      return null;
    }

    console.log(`✅ Cache hit for mail: ${mailId}`);
    return data;
  } catch (error) {
    console.error('❌ Error getting cached order:', error);
    return null;
  }
}

/**
 * Cache İkas order data
 */
export async function cacheOrder(
  mailId: string,
  orderNumber: string,
  orderData: Record<string, any>
): Promise<boolean> {
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour cache

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
      console.error('❌ Failed to cache order:', error);
      return false;
    }

    console.log(`✅ Order cached: ${orderNumber} for mail: ${mailId}`);
    return true;
  } catch (error) {
    console.error('❌ Error caching order:', error);
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
