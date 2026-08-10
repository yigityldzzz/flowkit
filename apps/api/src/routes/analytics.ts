import { Router, Response } from 'express';
import { prisma } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/analytics
router.get('/', async (req: AuthRequest, res: Response) => {
  const analytics = await prisma.analytics.findUnique({
    where: { userId: req.user!.id },
  });
  const recentReplays = await prisma.replayLog.findMany({
    where: { userId: req.user!.id },
    orderBy: { startedAt: 'desc' },
    take: 10,
    include: { workflow: { select: { id: true, name: true } } },
  });
  const topWorkflows = await prisma.workflow.findMany({
    where: { userId: req.user!.id, isActive: true },
    orderBy: { replayCount: 'desc' },
    take: 5,
    select: { id: true, name: true, replayCount: true, lastRunAt: true },
  });
  res.json({
    totals: analytics || { workflowCount: 0, replayCount: 0, successCount: 0, failCount: 0 },
    recentReplays,
    topWorkflows,
  });
});

export default router;
