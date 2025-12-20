/**
 * Logger Service
 * Centralized activity and error logging for Smart CS Dashboard
 */

import { createClient } from '@/lib/supabase/server';
import type {
  LogActivityParams,
  LogErrorParams,
  ActivityLog,
  ErrorLog,
  ActivityLogFilters,
  ErrorLogFilters,
} from './types';

/**
 * Log user activity
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const supabase = await createClient();

    await supabase.from('activity_logs').insert({
      user_id: params.userId || null,
      user_email: params.userEmail || null,
      user_role: params.userRole || null,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      description: params.description,
      old_values: params.oldValues || null,
      new_values: params.newValues || null,
      metadata: params.metadata || null,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
    });
  } catch (error) {
    // Log to console if DB logging fails - don't throw
    console.error('[Logger] Failed to log activity:', error);
  }
}

/**
 * Log system error
 */
export async function logError(params: LogErrorParams): Promise<void> {
  try {
    const supabase = await createClient();

    await supabase.from('error_logs').insert({
      user_id: params.userId || null,
      request_path: params.requestPath || null,
      request_method: params.requestMethod || null,
      error_type: params.errorType,
      error_code: params.errorCode || null,
      error_message: params.errorMessage,
      stack_trace: params.stackTrace || null,
      metadata: params.metadata || null,
    });
  } catch (error) {
    // Log to console if DB logging fails - don't throw
    console.error('[Logger] Failed to log error:', error);
  }
}

/**
 * Get activity logs with filters
 */
export async function getActivityLogs(
  filters: ActivityLogFilters = {}
): Promise<{ logs: ActivityLog[]; total: number }> {
  const supabase = await createClient();

  let query = supabase
    .from('activity_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters.entityType) {
    query = query.eq('entity_type', filters.entityType);
  }

  if (filters.entityId) {
    query = query.eq('entity_id', filters.entityId);
  }

  if (filters.action) {
    query = query.eq('action', filters.action);
  }

  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }

  if (filters.fromDate) {
    query = query.gte('created_at', filters.fromDate);
  }

  if (filters.toDate) {
    query = query.lte('created_at', filters.toDate);
  }

  const limit = filters.limit || 50;
  const offset = filters.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch activity logs: ${error.message}`);
  }

  return {
    logs: (data || []) as ActivityLog[],
    total: count || 0,
  };
}

/**
 * Get error logs with filters
 */
export async function getErrorLogs(
  filters: ErrorLogFilters = {}
): Promise<{ logs: ErrorLog[]; total: number }> {
  const supabase = await createClient();

  let query = supabase
    .from('error_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters.errorType) {
    query = query.eq('error_type', filters.errorType);
  }

  if (filters.fromDate) {
    query = query.gte('created_at', filters.fromDate);
  }

  if (filters.toDate) {
    query = query.lte('created_at', filters.toDate);
  }

  const limit = filters.limit || 50;
  const offset = filters.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch error logs: ${error.message}`);
  }

  return {
    logs: (data || []) as ErrorLog[],
    total: count || 0,
  };
}

/**
 * Get entity history (all activity logs for a specific entity)
 */
export async function getEntityHistory(
  entityType: string,
  entityId: string
): Promise<ActivityLog[]> {
  const { logs } = await getActivityLogs({
    entityType: entityType as ActivityLogFilters['entityType'],
    entityId,
    limit: 100,
  });

  return logs;
}

// Re-export types
export * from './types';
