import { Router } from 'express';
import { prisma } from '../prisma.js';
import { computeWaitTime } from '../utils/waittime.js';
import { requireAuth } from '../middleware/auth.js';
import { getIo, NYC_ROOM } from '../socket.js';
import { verifyPlaceWithGoogle, milesFromCenter } from '../utils/places.js';

const router = Router();

const NINETY_MIN_AGO = () => new Date(Date.now() - 90 * 60 * 1000);

// POST /api/bars — submit a new place (auth required). Before storing it, the
// place is verified against Google Maps so users can't add fake spots; Google's
// canonical name/address/coordinates are saved.
router.post('/', requireAuth, async (req, res) => {
  const name = (req.body?.name || '').trim();
  const address = (req.body?.address || '').trim();
  if (!name || !address) {
    return res.status(400).json({ error: 'name and address are required' });
  }

  const verification = await verifyPlaceWithGoogle(name, address);
  if (verification.status === 'not_configured') {
    return res.status(503).json({ error: 'Place verification is not configured on the server.' });
  }
  if (verification.status === 'not_found') {
    return res.status(422).json({ error: "We couldn't verify that place on Google Maps — double-check the name and address." });
  }
  if (verification.status === 'error') {
    return res.status(502).json({ error: 'Place verification is temporarily unavailable, please try again.' });
  }

  const p = verification.place;

  // Dedupe on Google place id (preferred) or name+address.
  const existing = await prisma.bar.findFirst({
    where: {
      OR: [
        ...(p.googlePlaceId ? [{ googlePlaceId: p.googlePlaceId }] : []),
        { name: { equals: p.name, mode: 'insensitive' }, address: { equals: p.address, mode: 'insensitive' } },
      ],
    },
  });
  if (existing) {
    return res.status(409).json({ error: 'That place is already on the map.' });
  }

  const bar = await prisma.bar.create({
    data: {
      name: p.name,
      address: p.address,
      latitude: p.latitude,
      longitude: p.longitude,
      rating: p.rating ?? 0,
      distance: milesFromCenter(p.latitude, p.longitude),
      googlePlaceId: p.googlePlaceId || null,
      verified: true,
    },
  });

  const payload = { ...bar, waitMin: null, reportCount: 0, confidence: 'low', checkins: [] };
  const io = getIo();
  if (io) io.to(NYC_ROOM).emit('bar_added', payload);
  res.status(201).json({ bar: payload });
});

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
