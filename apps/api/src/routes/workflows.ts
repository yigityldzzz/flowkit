import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const FREE_LIMIT = 3;

const stepSchema = z.object({
  type: z.enum(['click', 'input', 'navigate', 'wait', 'scroll', 'select']),
  selector: z.string().optional(),
  value: z.string().optional(),
  url: z.string().optional(),
  delay: z.number().optional(),
  description: z.string().optional(),
  timestamp: z.number().optional(),
  metadata: z.record(z.any()).optional(),
});

const workflowSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  steps: z.array(stepSchema).min(1).max(500),
});

// GET /api/workflows
router.get('/', async (req: AuthRequest, res: Response) => {
  const workflows = await prisma.workflow.findMany({
    where: { userId: req.user!.id, isActive: true },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, name: true, description: true, replayCount: true,
      createdAt: true, updatedAt: true, lastRunAt: true, steps: true,
    },
  });
  const withStepCount = workflows.map((w) => {
    const steps = (w.steps as any[]) || [];
    const { steps: _s, ...rest } = w;
    return { ...rest, stepCount: steps.length };
  });
  res.json(withStepCount);
});

// GET /api/workflows/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const workflow = await prisma.workflow.findFirst({
    where: { id: req.params.id, userId: req.user!.id, isActive: true },
  });
  if (!workflow) {
    res.status(404).json({ error: 'Workflow not found' });
    return;
  }
  res.json(workflow);
});

// POST /api/workflows
router.post('/', async (req: AuthRequest, res: Response) => {
  const parsed = workflowSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (user?.plan === 'FREE') {
    const count = await prisma.workflow.count({ where: { userId: req.user!.id, isActive: true } });
    if (count >= FREE_LIMIT) {
      res.status(403).json({
        error: `Free plan allows up to ${FREE_LIMIT} workflows. Upgrade to Pro for unlimited.`,
        upgradeRequired: true,
      });
      return;
    }
  }
  const workflow = await prisma.workflow.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      steps: parsed.data.steps,
      userId: req.user!.id,
    },
  });
  await prisma.analytics.upsert({
    where: { userId: req.user!.id },
    update: { workflowCount: { increment: 1 } },
    create: { userId: req.user!.id, workflowCount: 1 },
  });
  res.status(201).json(workflow);
});

// PUT /api/workflows/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const parsed = workflowSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  const existing = await prisma.workflow.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!existing) {
    res.status(404).json({ error: 'Workflow not found' });
    return;
  }
  const updated = await prisma.workflow.update({
    where: { id: req.params.id },
    data: { ...parsed.data, updatedAt: new Date() },
  });
  res.json(updated);
});

// DELETE /api/workflows/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const existing = await prisma.workflow.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!existing) {
    res.status(404).json({ error: 'Workflow not found' });
    return;
  }
  await prisma.workflow.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  res.json({ ok: true });
});

export default router;
