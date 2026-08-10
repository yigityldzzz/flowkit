const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('fk_access_token');
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem('fk_access_token', access);
  localStorage.setItem('fk_refresh_token', refresh);
}

export function clearTokens() {
  localStorage.removeItem('fk_access_token');
  localStorage.removeItem('fk_refresh_token');
}

async function refreshAccess(): Promise<string | null> {
  const refresh = localStorage.getItem('fk_refresh_token');
  if (!refresh) return null;
  try {
    const res = await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) { clearTokens(); return null; }
    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch { return null; }
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as any),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (res.status === 401 && retry) {
    const newToken = await refreshAccess();
    if (newToken) return request<T>(path, init, false);
    clearTokens();
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw Object.assign(new Error(err.error || 'Request failed'), { status: res.status, data: err });
  }
  return res.json();
}

// Auth
export const auth = {
  register: (data: { email: string; password: string; name?: string }) =>
    request<any>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<any>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request<any>('/api/auth/me'),
  logout: () => {
    const refresh = localStorage.getItem('fk_refresh_token');
    return request<any>('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: refresh }) });
  },
  updateProfile: (data: any) => request<any>('/api/auth/me', { method: 'PATCH', body: JSON.stringify(data) }),
};

// Workflows
export const workflows = {
  list: () => request<any[]>('/api/workflows'),
  get: (id: string) => request<any>(`/api/workflows/${id}`),
  create: (data: any) => request<any>('/api/workflows', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/api/workflows/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/api/workflows/${id}`, { method: 'DELETE' }),
};

// Analytics
export const analytics = {
  get: () => request<any>('/api/analytics'),
};

// Replays
export const replays = {
  list: (workflowId?: string) =>
    request<any[]>(`/api/replays${workflowId ? `?workflowId=${workflowId}` : ''}`),
};
