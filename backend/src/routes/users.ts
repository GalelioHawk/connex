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
  name:      z.string().min(2).max(100).trim().optional(),
  bio:       z.string().max(300).trim().optional(),
  area_id:   z.string().max(50).optional(),
  province:  z.string().max(50).optional(),
  fcm_token: z.string().optional(),
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
