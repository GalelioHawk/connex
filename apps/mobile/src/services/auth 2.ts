import type { AuthResponse } from '../types';
import { authorizedRequest, requestJson } from './http';
import { supabase } from './supabase';

export const authService = {
  async register(phone: string, password: string, name: string): Promise<AuthResponse> {
    const result = await requestJson<AuthResponse>('POST', '/auth/register', {
      body: { phone, password, name },
    });
    // Bootstrap a real Supabase session so Realtime WebSocket can authenticate
    await supabase.auth.setSession({
      access_token:  result.access_token,
      refresh_token: result.refresh_token,
    });
    return result;
  },

  async login(phone: string, password: string): Promise<AuthResponse> {
    const result = await requestJson<AuthResponse>('POST', '/auth/login', {
      body: { phone, password },
    });
    // Bootstrap a real Supabase session so Realtime WebSocket can authenticate
    await supabase.auth.setSession({
      access_token:  result.access_token,
      refresh_token: result.refresh_token,
    });
    return result;
  },

  logout(_token: string): Promise<void> {
    supabase.auth.signOut().catch(() => {});
    return authorizedRequest<void>('POST', '/auth/logout');
  },

  saveFcmToken(userId: string, fcmToken: string, _token: string): Promise<unknown> {
    return authorizedRequest('PATCH', `/users/${userId}`, { fcm_token: fcmToken });
  },
};
