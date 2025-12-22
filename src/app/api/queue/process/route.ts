import { NextRequest, NextResponse } from 'next/server';
import { runWorker } from '@/lib/queue/worker';

// Queue secret for authentication (set in environment variables)
const QUEUE_SECRET = process.env.QUEUE_SECRET;

/**
 * Validate queue request authentication
 * Only supports Authorization header (Bearer token)
 * Query parameter removed for security - secrets in URLs are logged in access logs
 */
function validateQueueAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return false;
  }

  const [scheme, token] = authHeader.split(' ');
  return scheme === 'Bearer' && token === QUEUE_SECRET;
}

/**
 * Background queue worker endpoint
 * POST /api/queue/process
 *
 * Bu endpoint'i periyodik olarak çağırarak queue'yu işleyebilirsiniz:
 * - Vercel Cron Jobs
 * - Supabase Edge Functions
 * - External cron service (cron-job.org vb.)
 * - Manuel trigger (test için)
 *
 * Authentication:
 * - Authorization: Bearer <QUEUE_SECRET>
 */
export async function POST(request: NextRequest) {
  // Validate authentication
  if (!QUEUE_SECRET) {
    console.error('❌ QUEUE_SECRET environment variable not set');
    return NextResponse.json(
      { success: false, error: 'Queue authentication not configured' },
      { status: 500 }
    );
  }

  if (!validateQueueAuth(request)) {
    console.warn('⚠️ Unauthorized queue process attempt');
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    console.log('🚀 Queue processing triggered');

    // Worker'ı çalıştır
    const result = await runWorker();

    console.log('✅ Queue processing completed:', result);

    return NextResponse.json({
      success: true,
      processed: result.processed,
      failed: result.failed,
      errors: result.errors,
      message: `Processed ${result.processed} jobs, ${result.failed} failed`,
    });
  } catch (error) {
    console.error('❌ Queue processing error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Queue durumunu kontrol et
 * GET /api/queue/process
 */
export async function GET(request: NextRequest) {
  // Validate authentication for GET as well
  if (!QUEUE_SECRET) {
    return NextResponse.json(
      { success: false, error: 'Queue authentication not configured' },
      { status: 500 }
    );
  }

  if (!validateQueueAuth(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { supabase } = await import('@/lib/supabase');

    // Kuyruk istatistikleri
    const { data: stats, error } = await supabase
      .from('job_queue')
      .select('status, job_type')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    // Durum bazlı sayılar
    const statusCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};

    stats?.forEach((job) => {
      statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
      typeCounts[job.job_type] = (typeCounts[job.job_type] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      stats: {
        byStatus: statusCounts,
        byType: typeCounts,
        total: stats?.length || 0,
      },
    });
  } catch (error) {
    console.error('❌ Queue stats error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
