import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { AppError } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { registerSchema, loginSchema } from '../validators/auth';
import {
  registerWithPassword,
  loginWithPassword,
  refreshSupabaseSession,
  revokeSupabaseSession,
} from '../services/auth';

const router = Router();

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts, please try again in 15 minutes' },
});

// ─── POST /auth/register ──────────────────────────────────────────────────────
router.post('/register', authRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, parsed.error.issues[0].message);

    const { phone, password, name } = parsed.data;
    const result = await registerWithPassword(phone, password, name);

    res.status(201).json({
      user:          result.user,
      access_token:  result.access_token,
      refresh_token: result.refresh_token,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /auth/login ─────────────────────────────────────────────────────────
router.post('/login', authRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, parsed.error.issues[0].message);

    const { phone, password } = parsed.data;
    const result = await loginWithPassword(phone, password);

    res.json({
      user:          result.user,
      access_token:  result.access_token,
      refresh_token: result.refresh_token,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /auth/logout ────────────────────────────────────────────────────────
router.post('/logout', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization!.slice(7);
    await revokeSupabaseSession(token);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /auth/refresh ───────────────────────────────────────────────────────
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refresh_token } = req.body as { refresh_token?: string };
    if (!refresh_token) throw new AppError(400, 'refresh_token is required');

    const tokens = await refreshSupabaseSession(refresh_token);
    res.json({
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
