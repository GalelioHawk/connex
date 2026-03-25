import { API_URL } from '../constants/api';
import { useAuthStore } from '../store/authStore';
import { supabase } from './supabase';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RequestOptions {
  body?:  object;
  token?: string;
}

export async function requestJson<T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const res  = await sendRequest(method, path, options);
  const data = await parseJson(res);

  if (!res.ok) {
    throw new Error(readErrorMessage(data, 'Request failed'));
  }

  return data as T;
}

export async function authorizedRequest<T>(
  method: HttpMethod,
  path: string,
  body?: object,
): Promise<T> {
  // Always pull the freshest token from the Supabase session.
  // The Supabase client auto-refreshes before expiry so this is always current.
  const { data: { session } } = await supabase.auth.getSession();
  const currentToken = session?.access_token ?? useAuthStore.getState().accessToken;

  if (!currentToken) {
    useAuthStore.getState().clearAuth();
    throw new Error('Session expired. Please sign in again.');
  }

  let res = await sendRequest(method, path, { body, token: currentToken });

  if (res.status === 401) {
    // Token rejected — ask Supabase to refresh it
    const { data: { session: newSession } } = await supabase.auth.refreshSession();

    if (!newSession) {
      useAuthStore.getState().clearAuth();
      throw new Error('Session expired. Please sign in again.');
    }

    useAuthStore.getState().updateToken(newSession.access_token, newSession.refresh_token);
    res = await sendRequest(method, path, { body, token: newSession.access_token });
  }

  const data = await parseJson(res);

  if (!res.ok) {
    throw new Error(readErrorMessage(data, 'Request failed'));
  }

  return data as T;
}

async function sendRequest(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {},
): Promise<Response> {
  const headers: Record<string, string> = {};

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  return fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

function readErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
    return data.error;
  }
  return fallback;
}
