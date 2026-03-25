import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../services/supabase';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import type { PublicUser } from '../types';

const router = Router();

// All user routes require auth
router.use(requireAuth);

const updateProfileSchema = z.object({
  name:       z.string().min(2).max(100).trim().optional(),
  bio:        z.string().max(300).trim().optional(),
  avatar_url: z.string().url().optional(),
  area_id:    z.string().max(50).optional(),
  province:   z.string().max(50).optional(),
  fcm_token:  z.string().optional(),
});

// POST /users/me/avatar — upload profile picture via backend (base64)
// Backend uses service_role so it can create/write to the avatars bucket directly.
router.post('/me/avatar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { image_base64, mime_type } = req.body as { image_base64?: string; mime_type?: string };

    if (!image_base64) throw new AppError(400, 'image_base64 is required');
    const mime = mime_type ?? 'image/jpeg';
    const ext  = mime.split('/')[1] ?? 'jpg';
    const path = `${userId}/avatar.${ext}`;

    // Ensure bucket exists (service_role can create buckets)
    await supabase.storage.createBucket('avatars', { public: true }).catch(() => {/* already exists */});

    const buffer = Buffer.from(image_base64, 'base64');

    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(path, buffer, { contentType: mime, upsert: true });

    if (uploadErr) throw new AppError(500, `Upload failed: ${uploadErr.message}`);

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);

    // Persist avatar_url on the user row
    await supabase.from('users').update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', userId);

    res.json({ avatar_url: publicUrl });
  } catch (err) {
    next(err);
  }
});

// PATCH /users/me — update own profile (avatar_url, name, bio, etc.)
router.patch('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, parsed.error.issues[0].message);
    if (Object.keys(parsed.data).length === 0) throw new AppError(400, 'No fields to update');

    const { data, error } = await supabase
      .from('users')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('id, name, phone, avatar_url, bio, area_id, province')
      .single();

    if (error) throw new AppError(500, 'Failed to update profile');
    res.json({ user: data });
  } catch (err) {
    next(err);
  }
});

// GET /users/search?q=name
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string | undefined)?.trim();
    if (!q || q.length < 2) {
      throw new AppError(400, 'Search query must be at least 2 characters');
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, name, avatar_url, bio, area_id, province')
      .ilike('name', `%${q}%`)
      .eq('is_active', true)
      .limit(20);

    if (error) throw new AppError(500, 'Search failed');

    const results: PublicUser[] = data ?? [];
    res.json({ results });
  } catch (err) {
    next(err);
  }
});

// GET /users/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('users')
      .select('id, name, avatar_url, bio, area_id, province')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw new AppError(500, 'Failed to fetch user');
    if (!data) throw new AppError(404, 'User not found');

    res.json({ user: data as PublicUser });
  } catch (err) {
    next(err);
  }
});

// PATCH /users/:id  (own profile only)
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (req.user!.userId !== id) {
      throw new AppError(403, 'You can only edit your own profile');
    }

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.issues[0].message);
    }

    if (Object.keys(parsed.data).length === 0) {
      throw new AppError(400, 'No fields to update');
    }

    const { data, error } = await supabase
      .from('users')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, name, avatar_url, bio, area_id, province')
      .single();

    if (error) throw new AppError(500, 'Failed to update profile');

    res.json({ user: data as PublicUser });
  } catch (err) {
    next(err);
  }
});

export default router;
