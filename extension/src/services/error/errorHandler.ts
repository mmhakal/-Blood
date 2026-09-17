/**
 * Centralized Error System for MediFlow LIS Extension
 * Sanitizes errors and maps them to clean user-friendly clinical messages.
 */

export type ErrorCategory =
  | 'AUTH_ERROR'
  | 'NETWORK_ERROR'
  | 'PERMISSION_ERROR'
  | 'TENANT_ERROR'
  | 'API_ERROR'
  | 'VALIDATION_ERROR'
  | 'TIMEOUT_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'INTEGRATION_ERROR'
  | 'STORAGE_ERROR'
  | 'UNKNOWN_ERROR';

export class ExtensionError extends Error {
  public category: ErrorCategory;
  public userMessage: string;
  public statusCode?: number;
  public details?: any;

  constructor(category: ErrorCategory, userMessage: string, statusCode?: number, details?: any) {
    super(userMessage);
    this.name = 'ExtensionError';
    this.category = category;
    this.userMessage = userMessage;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function normalizeError(err: any): ExtensionError {
  if (err instanceof ExtensionError) {
    return err;
  }

  // Network / fetch errors
  if (err?.name === 'AbortError') {
    return new ExtensionError('TIMEOUT_ERROR', 'Request timed out. Please check your network connection.', 408);
  }

  if (err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError')) {
    return new ExtensionError('NETWORK_ERROR', 'Cannot reach MediFlow LIS API. Is the server running?', 0);
  }

  // HTTP status codes
  const status = err?.status || err?.statusCode;
  if (status === 401) {
    return new ExtensionError('AUTH_ERROR', 'Your session has expired. Please log in again.', 401);
  }
  if (status === 403) {
    return new ExtensionError('PERMISSION_ERROR', 'You do not have permission to perform this clinical action.', 403);
  }
  if (status === 429) {
    return new ExtensionError('RATE_LIMIT_ERROR', 'Too many requests. Please pause for a moment.', 429);
  }
  if (status >= 500) {
    return new ExtensionError('API_ERROR', 'The LIS server encountered an internal error.', status);
  }

  const message = typeof err?.message === 'string' ? err.message : 'An unexpected error occurred.';
  return new ExtensionError('UNKNOWN_ERROR', message, status);
}
