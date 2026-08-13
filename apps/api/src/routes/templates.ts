import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const FREE_LIMIT = 3;

export const CATEGORIES = [
  'Data Entry',
  'Web Scraping',
  'Testing & QA',
  'Social Media',
  'E-commerce',
  'Reporting',
  'Other',
] as const;

const listQuerySchema = z.object({
  category: z.enum(CATEGORIES).optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// GET /api/templates — public gallery, no auth required
router.get('/', async (req: Request, res: Response) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query', details: parsed.error.flatten() });
    return;
  }
  const { category, search, page, limit } = parsed.data;

  const where: any = {};
  if (category) where.category = category;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [templates, total] = await Promise.all([
    prisma.template.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, title: true, description: true, category: true,
        cloneCount: true, createdAt: true, steps: true,
        author: { select: { name: true } },
      },
    }),
    prisma.template.count({ where }),
  ]);

  const withStepCount = templates.map((t) => {
    const steps = (t.steps as any[]) || [];
    const { steps: _s, ...rest } = t;
    return { ...rest, stepCount: steps.length };
  });

  res.json({
    templates: withStepCount,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

// GET /api/templates/categories — list of valid categories (for filter UI)
router.get('/categories', (_req: Request, res: Response) => {
  res.json(CATEGORIES);
});

// GET /api/templates/:id — public detail view, no auth required
router.get('/:id', async (req: Request, res: Response) => {
  const template = await prisma.template.findUnique({
    where: { id: req.params.id },
    include: { author: { select: { name: true } } },
  });
  if (!template) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }
  res.json(template);
});

// POST /api/templates/:id/clone — authenticated, copies template into caller's own workflows
router.post('/:id/clone', authenticate, async (req: AuthRequest, res: Response) => {
  const template = await prisma.template.findUnique({ where: { id: req.params.id } });
  if (!template) {
    res.status(404).json({ error: 'Template not found' });
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
      name: template.title,
      description: template.description,
      steps: template.steps as any,
      userId: req.user!.id,
    },
  });

  await Promise.all([
    prisma.template.update({
      where: { id: template.id },
      data: { cloneCount: { increment: 1 } },
    }),
    prisma.analytics.upsert({
      where: { userId: req.user!.id },
      update: { workflowCount: { increment: 1 } },
      create: { userId: req.user!.id, workflowCount: 1 },
    }),
  ]);

  res.status(201).json(workflow);
});

// DELETE /api/templates/:id — author can unpublish their own template
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const template = await prisma.template.findUnique({ where: { id: req.params.id } });
  if (!template) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }
  if (template.authorId !== req.user!.id) {
    res.status(403).json({ error: 'You can only unpublish your own templates' });
    return;
  }
  await prisma.template.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
