import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth';
import workflowRoutes from './routes/workflows';
import replayRoutes from './routes/replays';
import analyticsRoutes from './routes/analytics';
import templateRoutes from './routes/templates';
import { errorHandler } from './middleware/errorHandler';
import { prisma } from './config/database';

const app = express();
const PORT = process.env.PORT || 4000;

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts, please try again later.' },
});

app.use(limiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Health check — accessible both directly and via nginx /api/ proxy
app.get(['/health', '/api/health'], (_, res) => {
  res.json({ ok: true, version: '1.0.0', ts: Date.now() });
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/replays', replayRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/templates', templateRoutes);

// ── Admin endpoint (secret token guard) ───────────────────────────────────────
app.get('/api/admin/users', async (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, email: true, name: true, plan: true, createdAt: true,
      _count: { select: { workflows: true, replayLogs: true } },
    },
  });
  const total = users.length;
  const pro   = users.filter(u => u.plan === 'PRO').length;
  res.json({ total, pro, free: total - pro, users });
});

// Error handler
app.use(errorHandler);

// Start
async function main() {
  await prisma.$connect();
  console.log('[FlowKit API] Database connected');
  app.listen(PORT, () => {
    console.log(`[FlowKit API] Running on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('[FlowKit API] Startup error:', err);
  process.exit(1);
});

export default app;
