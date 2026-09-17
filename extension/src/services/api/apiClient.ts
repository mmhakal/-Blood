/**
 * Centralized Commercial-Grade API Client for MediFlow LIS Extension
 * Supports:
 * - GET, POST, PUT, PATCH, DELETE
 * - Exponential backoff retry on transient failures (502, 503, 504, network drop)
 * - AbortController timeout & request cancellation
 * - Multi-tenant context propagation (`x-lab-id`, `x-branch-id`, `x-request-id`, `x-client-version`)
 * - Normalized Error transformation
 */

import { extensionStorage } from '../storage/extensionStorage';
import environmentConfig from '../../config/environment';
import { normalizeError, ExtensionError } from '../error/errorHandler';
import logger from '../logging/logger';

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  labId?: string | null;
  branchId?: string | null;
  signal?: AbortSignal;
}

class ApiClient {
  private generateRequestId(): string {
    return `ext-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private async getAuthToken(): Promise<string | null> {
    const session = await extensionStorage.getSession();
    return session?.token || null;
  }

  private async getActiveTenant(): Promise<{ labId: string | null; branchId: string | null }> {
    const session = await extensionStorage.getSession();
    return {
      labId: session?.user?.lab_id || null,
      branchId: session?.activeBranchId || session?.user?.branch_id || null
    };
  }

  public async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const settings = await extensionStorage.getSettings();
    const config = environmentConfig.getConfig();
    const baseUrl = settings?.apiBaseUrl || config.apiBaseUrl;
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    
    const timeoutMs = options.timeoutMs ?? config.requestTimeoutMs;
    const maxRetries = options.retries ?? config.maxRetries;
    const requestId = this.generateRequestId();

    const token = await this.getAuthToken();
    const tenant = await this.getActiveTenant();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-request-id': requestId,
      'x-client-platform': 'browser-extension',
      'x-client-version': config.version,
      ...(options.headers as Record<string, string> || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const labId = options.labId ?? tenant.labId;
    if (labId) {
      headers['x-lab-id'] = labId;
    }

    const branchId = options.branchId ?? tenant.branchId;
    if (branchId) {
      headers['x-branch-id'] = branchId;
    }

    let attempt = 0;
    while (attempt <= maxRetries) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      // Connect parent abort signal if supplied
      if (options.signal) {
        options.signal.addEventListener('abort', () => controller.abort());
      }

      try {
        logger.debug(`[API ${options.method || 'GET'}] ${url}`, { requestId, attempt });

        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal
        });

        clearTimeout(timer);

        if (!response.ok) {
          // Check for transient retryable status codes
          if ([502, 503, 504].includes(response.status) && attempt < maxRetries) {
            attempt++;
            const backoff = Math.pow(2, attempt) * 300;
            logger.warn(`[API Retry] ${url} returned ${response.status}. Retrying in ${backoff}ms...`);
            await new Promise(r => setTimeout(r, backoff));
            continue;
          }

          let errBody: any = null;
          try {
            errBody = await response.json();
          } catch {
            errBody = { message: response.statusText };
          }

          throw new ExtensionError(
            response.status === 401 ? 'AUTH_ERROR' : response.status === 403 ? 'PERMISSION_ERROR' : 'API_ERROR',
            errBody?.error || errBody?.message || `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            errBody
          );
        }

        // Handle empty or json response
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await response.json();
          return json;
        }

        return (await response.text()) as unknown as T;
      } catch (err: any) {
        clearTimeout(timer);

        if (attempt < maxRetries && (err.name === 'AbortError' || err.message?.includes('Failed to fetch'))) {
          attempt++;
          const backoff = Math.pow(2, attempt) * 300;
          logger.warn(`[API Network Retry] Retrying request in ${backoff}ms...`);
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }

        const normalized = normalizeError(err);
        logger.error(`[API Failed] ${url}`, normalized);
        throw normalized;
      }
    }

    throw new ExtensionError('TIMEOUT_ERROR', 'Request exceeded retry attempts.', 408);
  }

  // --- SHORTCUT METHODS ---
  public get<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  }

  public put<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  }

  public patch<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  }

  public delete<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
