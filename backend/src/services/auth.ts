import bcrypt from 'bcryptjs';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { AppError } from '../middleware/errorHandler';
import type { DbUser } from '../types';
import { createSupabaseAuthClient, supabase } from './supabase';

const SUPABASE_MANAGED_PASSWORD = 'supabase-managed';

type AppUserRecord = Pick<
  DbUser,
  | 'id'
  | 'phone'
  | 'name'
  | 'avatar_url'
  | 'bio'
  | 'area_id'
  | 'province'
  | 'password_hash'
  | 'is_active'
  | 'created_at'
>;

interface SessionTokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthSessionResult extends SessionTokens {
  user: Omit<AppUserRecord, 'password_hash' | 'is_active' | 'created_at'>;
}

export function phoneToAuthEmail(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `phone.${digits}@auth.connex.invalid`;
}

export async function registerWithPassword(
  phone: string,
  password: string,
  name: string,
): Promise<AuthSessionResult> {
  const existingUser = await getUserByPhone(phone);
  if (existingUser) {
    throw new AppError(409, 'Phone number already registered');
  }

  const email = phoneToAuthEmail(phone);
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { phone, name },
  });

  if (error || !data.user) {
    if (error?.status === 422) {
      throw new AppError(409, 'Phone number already registered');
    }
    throw new AppError(500, error?.message ?? 'Failed to create account');
  }

  try {
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: data.user.id,
        phone,
        name,
        password_hash: SUPABASE_MANAGED_PASSWORD,
      });

    if (insertError) {
      throw insertError;
    }
  } catch {
    await supabase.auth.admin.deleteUser(data.user.id).catch(() => undefined);
    throw new AppError(500, 'Failed to create account');
  }

  return signInWithPassword(phone, password);
}

export async function loginWithPassword(
  phone: string,
  password: string,
): Promise<AuthSessionResult> {
  const existingUser = await getUserByPhone(phone);

  if (existingUser && !existingUser.is_active) {
    throw new AppError(403, 'Account is suspended');
  }

  try {
    return await signInWithPassword(phone, password);
  } catch (error) {
    if (
      error instanceof AppError
      && error.statusCode === 401
      && existingUser
      && isLegacyPasswordHash(existingUser.password_hash)
    ) {
      const passwordMatch = await bcrypt.compare(password, existingUser.password_hash);
      if (passwordMatch) {
        await migrateLegacyPasswordUser(existingUser, password);
        return signInWithPassword(phone, password);
      }
    }

    throw error;
  }
}

export async function refreshSupabaseSession(refreshToken: string): Promise<SessionTokens> {
  const authClient = createSupabaseAuthClient();
  const { data, error } = await authClient.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    throw new AppError(401, 'Invalid or expired refresh token');
  }

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  };
}

export async function revokeSupabaseSession(accessToken: string): Promise<void> {
  const { error } = await supabase.auth.admin.signOut(accessToken, 'global');

  if (
    error
    && error.status !== 401
    && error.status !== 403
    && error.status !== 404
  ) {
    throw new AppError(500, 'Failed to log out');
  }
}

export async function getAppUserById(userId: string): Promise<AppUserRecord | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, phone, name, avatar_url, bio, area_id, province, password_hash, is_active, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'Failed to fetch user profile');
  }

  return data as AppUserRecord | null;
}

function mapAuthUser(user: AppUserRecord): AuthSessionResult['user'] {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    avatar_url: user.avatar_url,
    bio: user.bio,
    area_id: user.area_id,
    province: user.province,
  };
}

async function getUserByPhone(phone: string): Promise<AppUserRecord | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, phone, name, avatar_url, bio, area_id, province, password_hash, is_active, created_at')
    .eq('phone', phone)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'Failed to fetch user profile');
  }

  return data as AppUserRecord | null;
}

async function signInWithPassword(
  phone: string,
  password: string,
): Promise<AuthSessionResult> {
  const authClient = createSupabaseAuthClient();
  const { data, error } = await authClient.auth.signInWithPassword({
    email: phoneToAuthEmail(phone),
    password,
  });

  if (error || !data.session || !data.user) {
    throw new AppError(401, 'Invalid phone number or password');
  }

  const appUser = await syncAppUserFromAuth(data.user, phone);
  if (!appUser) {
    throw new AppError(500, 'Failed to load user profile');
  }

  if (!appUser.is_active) {
    await revokeSupabaseSession(data.session.access_token).catch(() => undefined);
    throw new AppError(403, 'Account is suspended');
  }

  return {
    user: mapAuthUser(appUser),
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  };
}

async function syncAppUserFromAuth(
  authUser: SupabaseAuthUser,
  fallbackPhone: string,
): Promise<AppUserRecord | null> {
  const existing = await getAppUserById(authUser.id);
  if (existing) return existing;

  const phone = readMetadataString(authUser.user_metadata, 'phone') ?? fallbackPhone;
  const name = readMetadataString(authUser.user_metadata, 'name') ?? 'Connex User';

  const { data, error } = await supabase
    .from('users')
    .insert({
      id: authUser.id,
      phone,
      name,
      password_hash: SUPABASE_MANAGED_PASSWORD,
    })
    .select('id, phone, name, avatar_url, bio, area_id, province, password_hash, is_active, created_at')
    .single();

  if (error) {
    throw new AppError(500, 'Failed to create user profile');
  }

  return data as AppUserRecord;
}

async function migrateLegacyPasswordUser(user: AppUserRecord, password: string): Promise<void> {
  const email = phoneToAuthEmail(user.phone);
  const existingAuthUser = await supabase.auth.admin.getUserById(user.id);

  if (existingAuthUser.data.user) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      email,
      password,
      email_confirm: true,
      user_metadata: { phone: user.phone, name: user.name },
    });

    if (updateError) {
      throw new AppError(500, updateError.message);
    }
  } else {
    const { error: createError } = await supabase.auth.admin.createUser({
      id: user.id,
      email,
      password,
      email_confirm: true,
      user_metadata: { phone: user.phone, name: user.name },
    });

    if (createError) {
      throw new AppError(500, createError.message);
    }
  }

  const { error } = await supabase
    .from('users')
    .update({
      password_hash: SUPABASE_MANAGED_PASSWORD,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    throw new AppError(500, 'Failed to finalize account migration');
  }
}

function isLegacyPasswordHash(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith('$2');
}

function readMetadataString(
  metadata: SupabaseAuthUser['user_metadata'],
  key: string,
): string | null {
  if (!metadata || typeof metadata !== 'object') return null;

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
