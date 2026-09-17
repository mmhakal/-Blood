// API Client Service for MediFlow LIS

const API_BASE = '/api';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('lis_token');
  const simulatedLab = localStorage.getItem('lis_simulated_lab');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (simulatedLab) {
    headers['x-lab-id'] = simulatedLab;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // If token invalid, clear and redirect to login if not already there
    if (!window.location.pathname.includes('/login')) {
      localStorage.removeItem('lis_token');
      localStorage.removeItem('lis_user');
      window.location.href = '/login';
    }
  }

  // If response is a blob/file (e.g. PDF or backup download)
  const contentType = response.headers.get('content-type');
  if (contentType && (contentType.includes('application/pdf') || contentType.includes('application/octet-stream') || contentType.includes('application/json-download'))) {
    if (!response.ok) {
      throw new Error('Failed to download file');
    }
    return response.blob() as any;
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Request failed with status ' + response.status);
  }

  return data as T;
}

export const api = {
  get: <T = any>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T = any>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T = any>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = any>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};

export default api;
