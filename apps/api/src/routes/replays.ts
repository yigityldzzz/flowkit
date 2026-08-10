import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// POST /api/replays/start
router.post('/start', async (req: AuthRequest, res: Response) => {
  const schema = z.object({ workflowId: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'workflowId required' });
    return;
  }
  const workflow = await prisma.workflow.findFirst({
    where: { id: parsed.data.workflowId, userId: req.user!.id, isActive: true },
  });
  if (!workflow) {
    res.status(404).json({ error: 'Workflow not found' });
    return;
  }
  const steps = (workflow.steps as any[]) || [];
  const log = await prisma.replayLog.create({
    data: {
      workflowId: workflow.id,
      userId: req.user!.id,
      status: 'RUNNING',
      stepsTotal: steps.length,
    },
  });
  res.status(201).json({ replayId: log.id, stepsTotal: steps.length });
});

// PATCH /api/replays/:id/finish
router.patch('/:id/finish', async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    status: z.enum(['SUCCESS', 'FAILED']),
    stepsDone: z.number().int().min(0),
    error: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }
  const log = await prisma.replayLog.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!log) {
    res.status(404).json({ error: 'Replay not found' });
    return;
  }
  await prisma.replayLog.update({
    where: { id: log.id },
    data: {
      status: parsed.data.status,
      stepsDone: parsed.data.stepsDone,
      error: parsed.data.error,
      finishedAt: new Date(),
    },
  });
  await prisma.workflow.update({
    where: { id: log.workflowId },
    data: { replayCount: { increment: 1 }, lastRunAt: new Date() },
  });
  await prisma.analytics.upsert({
    where: { userId: req.user!.id },
    update: {
      replayCount: { increment: 1 },
      ...(parsed.data.status === 'SUCCESS'
        ? { successCount: { increment: 1 } }
        : { failCount: { increment: 1 } }),
    },
    create: { userId: req.user!.id, replayCount: 1 },
  });
  res.json({ ok: true });
});

// GET /api/replays?workflowId=&limit=
router.get('/', async (req: AuthRequest, res: Response) => {
  const workflowId = req.query.workflowId as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const logs = await prisma.replayLog.findMany({
    where: { userId: req.user!.id, ...(workflowId ? { workflowId } : {}) },
    orderBy: { startedAt: 'desc' },
    take: limit,
    include: { workflow: { select: { id: true, name: true } } },
  });
  res.json(logs);
});

export default router;
