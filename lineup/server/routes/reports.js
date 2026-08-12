import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { computeWaitTime } from '../utils/waittime.js';
import { emitWaitUpdated } from '../socket.js';

const router = Router();

// POST /api/reports — create a wait report (auth required).
// Also records the user's last-seen location (the barId), recomputes the
// bar's wait time, and broadcasts a wait_updated event over Socket.io.
router.post('/', requireAuth, async (req, res) => {
  const { barId, waitMin } = req.body || {};
  if (!barId || waitMin === undefined || waitMin === null) {
    return res.status(400).json({ error: 'barId and waitMin are required' });
  }
  const wait = Number(waitMin);
  if (!Number.isFinite(wait) || wait < 0 || wait > 240) {
    return res.status(400).json({ error: 'waitMin must be between 0 and 240' });
  }

  const bar = await prisma.bar.findUnique({ where: { id: barId } });
  if (!bar) return res.status(404).json({ error: 'Bar not found' });

  const report = await prisma.report.create({
    data: { barId, userId: req.userId, waitMin: Math.round(wait) },
  });

  // Recompute from the last 90 minutes and broadcast the new value.
  const recent = await prisma.report.findMany({
    where: { barId, createdAt: { gte: new Date(Date.now() - 90 * 60 * 1000) } },
  });
  const computed = computeWaitTime(recent);

  emitWaitUpdated({
    barId,
    waitMin: computed.waitMin,
    newWait: computed.waitMin, // alias kept for spec compatibility
    reportCount: computed.reportCount,
    confidence: computed.confidence,
  });

  res.status(201).json({ report: { id: report.id, barId, waitMin: report.waitMin }, wait: computed });
});

export default router;
