/**
 * Logger Types
 * Activity and error logging type definitions
 */

export type ActionType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW'
  | 'SEND'
  | 'LOGIN'
  | 'LOGOUT'
  | 'STATUS_CHANGE'
  | 'ASSIGN';

export type EntityType =
  | 'ticket'
  | 'mail'
  | 'return'
  | 'user'
  | 'settings'
  | 'order';

export type ErrorType =
  | 'API_ERROR'
  | 'DB_ERROR'
  | 'IKAS_ERROR'
  | 'IMAP_ERROR'
  | 'AUTH_ERROR'
  | 'VALIDATION_ERROR';

export interface LogActivityParams {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action: ActionType;
  entityType: EntityType;
  entityId?: string;
  description: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface LogErrorParams {
  userId?: string;
  requestPath?: string;
  requestMethod?: string;
  errorType: ErrorType;
  errorCode?: string;
  errorMessage: string;
  stackTrace?: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_role: string | null;
  action: ActionType;
  entity_type: EntityType;
  entity_id: string | null;
  description: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ErrorLog {
  id: string;
  user_id: string | null;
  request_path: string | null;
  request_method: string | null;
  error_type: ErrorType;
  error_code: string | null;
  error_message: string;
  stack_trace: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ActivityLogFilters {
  entityType?: EntityType;
  entityId?: string;
  action?: ActionType;
  userId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface ErrorLogFilters {
  errorType?: ErrorType;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}
