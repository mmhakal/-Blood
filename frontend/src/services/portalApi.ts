// Portal API service for Doctor & Patient Portals
const API_BASE = '/api';

export async function doctorRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('doctor_portal_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('doctor_portal_token');
    localStorage.removeItem('doctor_portal_user');
    if (!window.location.pathname.includes('/doctor/login')) {
      window.location.href = '/doctor/login';
    }
  }

  const contentType = response.headers.get('content-type');
  if (contentType && (contentType.includes('application/pdf') || contentType.includes('application/octet-stream'))) {
    if (!response.ok) throw new Error('Failed to download report PDF');
    return response.blob() as any;
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Doctor portal request failed');
  }

  return data as T;
}

export async function patientRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('patient_portal_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('patient_portal_token');
    localStorage.removeItem('patient_portal_user');
    if (!window.location.pathname.includes('/patient/login')) {
      window.location.href = '/patient/login';
    }
  }

  const contentType = response.headers.get('content-type');
  if (contentType && (contentType.includes('application/pdf') || contentType.includes('application/octet-stream'))) {
    if (!response.ok) throw new Error('Failed to download report PDF');
    return response.blob() as any;
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Patient portal request failed');
  }

  return data as T;
}
