import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; plan: string };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = { id: payload.sub, email: payload.email, plan: payload.plan };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requirePro(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.plan !== 'PRO') {
    res.status(403).json({ error: 'Pro plan required for this feature' });
    return;
  }
  next();
}
