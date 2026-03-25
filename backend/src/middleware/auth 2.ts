import { Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabase';

export interface AuthPayload {
  userId: string;
  phone:  string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    req.user = { userId: user.id, phone: user.email ?? '' };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
