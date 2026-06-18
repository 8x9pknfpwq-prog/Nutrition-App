import { Router } from 'express';
import { prisma } from '../prisma.js';
import { computeWaitTime } from '../utils/waittime.js';

const router = Router();

const NINETY_MIN_AGO = () => new Date(Date.now() - 90 * 60 * 1000);

// GET /api/bars — all bars with their current computed wait time + any
// recent friend check-ins layered on (so the map can float friend avatars).
router.get('/', async (req, res) => {
  const bars = await prisma.bar.findMany({
    include: {
      reports: {
        where: { createdAt: { gte: NINETY_MIN_AGO() } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  // Recent friend/user check-ins (FriendNotification) in the last 90 min.
  const checkins = await prisma.friendNotification.findMany({
    where: { createdAt: { gte: NINETY_MIN_AGO() } },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, username: true, avatarInitial: true } } },
  });
  const checkinsByBar = new Map();
  for (const c of checkins) {
    if (!checkinsByBar.has(c.barId)) checkinsByBar.set(c.barId, []);
    checkinsByBar.get(c.barId).push({
      userId: c.user.id,
      username: c.user.username,
      avatarInitial: c.user.avatarInitial,
      at: c.createdAt,
    });
  }

  const result = bars.map((bar) => {
    const wait = computeWaitTime(bar.reports);
    const { reports, ...rest } = bar;
    return { ...rest, ...wait, checkins: checkinsByBar.get(bar.id) || [] };
  });

  res.json({ bars: result });
});

// GET /api/bars/:id — single bar detail + recent reports + wait time.
router.get('/:id', async (req, res) => {
  const bar = await prisma.bar.findUnique({
    where: { id: req.params.id },
    include: {
      reports: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { user: { select: { username: true, avatarInitial: true } } },
      },
    },
  });
  if (!bar) return res.status(404).json({ error: 'Bar not found' });

  const wait = computeWaitTime(bar.reports);
  res.json({
    bar: {
      id: bar.id,
      name: bar.name,
      address: bar.address,
      latitude: bar.latitude,
      longitude: bar.longitude,
      rating: bar.rating,
      distance: bar.distance,
      ...wait,
      reports: bar.reports.map((r) => ({
        id: r.id,
        waitMin: r.waitMin,
        createdAt: r.createdAt,
        username: r.user.username,
        avatarInitial: r.user.avatarInitial,
      })),
    },
  });
});

// GET /api/bars/:id/waittime — just the computed verification result.
router.get('/:id/waittime', async (req, res) => {
  const bar = await prisma.bar.findUnique({
    where: { id: req.params.id },
    include: { reports: { where: { createdAt: { gte: NINETY_MIN_AGO() } } } },
  });
  if (!bar) return res.status(404).json({ error: 'Bar not found' });

  res.json(computeWaitTime(bar.reports));
});

export default router;
