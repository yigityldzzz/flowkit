import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const registerSchema = z.object({
  email: z.string().email().max(254),
  // bcrypt silently truncates at 72 bytes — cap at 72 to prevent hash collisions
  password: z.string().min(8).max(72),
  name: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email().max(254),
  // Same cap on login to prevent DoS via long password hashing
  password: z.string().min(1).max(72),
});

function signAccess(user: { id: string; email: string; plan: string }) {
  return jwt.sign(
    { sub: user.id, email: user.email, plan: user.plan },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  );
}

function signRefresh(userId: string) {
  return jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '30d' });
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  const { email, password, name } = parsed.data;
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }
  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hashed, name },
  });
  await prisma.analytics.create({ data: { userId: user.id } });
  const accessToken = signAccess({ id: user.id, email: user.email, plan: user.plan });
  const refreshToken = signRefresh(user.id);
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  res.status(201).json({
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
  });
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  const accessToken = signAccess({ id: user.id, email: user.email, plan: user.plan });
  const refreshToken = signRefresh(user.id);
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
  });
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token required' });
    return;
  }
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    await prisma.refreshToken.delete({ where: { token: refreshToken } });
    const newAccess = signAccess({ id: user.id, email: user.email, plan: user.plan });
    const newRefresh = signRefresh(user.id);
    await prisma.refreshToken.create({
      data: {
        token: newRefresh,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    res.json({ accessToken: newAccess, refreshToken: newRefresh });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, name: true, plan: true, createdAt: true },
  });
  res.json(user);
});

// PATCH /api/auth/me
router.patch('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    name: z.string().min(1).max(100).optional(),
    currentPassword: z.string().max(72).optional(),
    newPassword: z.string().min(8).max(72).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }
  const { name, currentPassword, newPassword } = parsed.data;
  const updates: any = {};
  if (name) updates.name = name;
  if (currentPassword && newPassword) {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      res.status(400).json({ error: 'Current password is incorrect' });
      return;
    }
    updates.password = await bcrypt.hash(newPassword, 12);
  }
  const updated = await prisma.user.update({
    where: { id: req.user!.id },
    data: updates,
    select: { id: true, email: true, name: true, plan: true },
  });
  res.json(updated);
});

export default router;
