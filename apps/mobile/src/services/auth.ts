import { API_URL } from '../constants/api';
import type { AuthResponse } from '../types';

async function post<T>(path: string, body: object, token?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
  return data as T;
}

async function patch<T>(path: string, body: object, token: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
  return data as T;
}

export const authService = {
  register(phone: string, password: string, name: string): Promise<AuthResponse> {
    return post<AuthResponse>('/auth/register', { phone, password, name });
  },

  login(phone: string, password: string): Promise<AuthResponse> {
    return post<AuthResponse>('/auth/login', { phone, password });
  },

  logout(token: string): Promise<void> {
    return post<void>('/auth/logout', {}, token);
  },

  refresh(refresh_token: string): Promise<{ access_token: string; refresh_token: string }> {
    return post('/auth/refresh', { refresh_token });
  },

  saveFcmToken(userId: string, fcmToken: string, token: string): Promise<unknown> {
    return patch(`/users/${userId}`, { fcm_token: fcmToken }, token);
  },
};
