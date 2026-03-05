import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';
import { supabase } from '../services/supabase';
import { redis } from '../services/redis';
import { registerSchema, loginSchema } from '../validators/auth';
import { AppError } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';

const router = Router();

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts, please try again in 15 minutes' },
});

// POST /auth/register
router.post(
  '/register',
  authRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.issues[0].message);
      }

      const { phone, password, name } = parsed.data;

      // Check phone not already registered
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();

      if (existing) {
        throw new AppError(409, 'Phone number already registered');
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const { data: newUser, error } = await supabase
        .from('users')
        .insert({ phone, password_hash: passwordHash, name })
        .select('id, phone, name, created_at')
        .single();

      if (error || !newUser) {
        throw new AppError(500, 'Failed to create account');
      }

      const { accessToken, refreshToken } = await issueTokens(newUser.id, newUser.phone);

      res.status(201).json({
        user: {
          id: newUser.id,
          phone: newUser.phone,
          name: newUser.name,
          created_at: newUser.created_at,
        },
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /auth/login
router.post(
  '/login',
  authRateLimit,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.issues[0].message);
      }

      const { phone, password } = parsed.data;

      const { data: user } = await supabase
        .from('users')
        .select('id, phone, name, password_hash, is_active')
        .eq('phone', phone)
        .maybeSingle();

      if (!user) {
        throw new AppError(401, 'Invalid phone number or password');
      }

      if (!user.is_active) {
        throw new AppError(403, 'Account is suspended');
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        throw new AppError(401, 'Invalid phone number or password');
      }

      const { accessToken, refreshToken } = await issueTokens(user.id, user.phone);

      res.json({
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
        },
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /auth/logout
router.post(
  '/logout',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      await redis.del(`refresh:${userId}`);
      res.json({ message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  },
);

// POST /auth/refresh
router.post(
  '/refresh',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refresh_token } = req.body as { refresh_token?: string };
      if (!refresh_token) {
        throw new AppError(400, 'refresh_token is required');
      }

      let payload: { userId: string; phone: string };
      try {
        payload = jwt.verify(refresh_token, process.env.JWT_SECRET!) as typeof payload;
      } catch {
        throw new AppError(401, 'Invalid or expired refresh token');
      }

      const stored = await redis.get(`refresh:${payload.userId}`);
      if (!stored || stored !== refresh_token) {
        throw new AppError(401, 'Refresh token has been revoked');
      }

      const { accessToken, refreshToken: newRefreshToken } = await issueTokens(
        payload.userId,
        payload.phone,
      );

      res.json({ access_token: accessToken, refresh_token: newRefreshToken });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Helpers ────────────────────────────────────────────────────────────────

async function issueTokens(
  userId: string,
  phone: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const secret = process.env.JWT_SECRET!;
  const jti = uuidv4();

  const accessToken = jwt.sign({ userId, phone }, secret, {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '15m') as jwt.SignOptions['expiresIn'],
  });

  const refreshToken = jwt.sign({ userId, phone, jti }, secret, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'],
  });

  const ttlSeconds = 7 * 24 * 60 * 60;
  await redis.set(`refresh:${userId}`, refreshToken, 'EX', ttlSeconds);

  return { accessToken, refreshToken };
}

export default router;
