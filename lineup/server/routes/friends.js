import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { emitFriendCheckin } from '../socket.js';

const router = Router();

// Return the set of userIds the current user is accepted friends with.
async function acceptedFriendIds(userId) {
  const friendships = await prisma.friendship.findMany({
    where: {
      status: 'accepted',
      OR: [{ fromUserId: userId }, { toUserId: userId }],
    },
  });
  return friendships.map((f) => (f.fromUserId === userId ? f.toUserId : f.fromUserId));
}

// GET /api/friends — accepted friends + each one's last check-in bar & time.
router.get('/', requireAuth, async (req, res) => {
  const ids = await acceptedFriendIds(req.userId);
  if (ids.length === 0) return res.json({ friends: [] });

  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, username: true, avatarInitial: true },
  });

  // Most recent check-in per friend.
  const checkins = await prisma.friendNotification.findMany({
    where: { userId: { in: ids } },
    orderBy: { createdAt: 'desc' },
  });
  const barIds = [...new Set(checkins.map((c) => c.barId))];
  const bars = await prisma.bar.findMany({ where: { id: { in: barIds } } });
  const barById = new Map(bars.map((b) => [b.id, b]));

  const lastByUser = new Map();
  for (const c of checkins) {
    if (!lastByUser.has(c.userId)) lastByUser.set(c.userId, c);
  }

  const friends = users.map((u) => {
    const c = lastByUser.get(u.id);
    const bar = c ? barById.get(c.barId) : null;
    return {
      id: u.id,
      username: u.username,
      avatarInitial: u.avatarInitial,
      lastBar: bar ? { id: bar.id, name: bar.name, latitude: bar.latitude, longitude: bar.longitude } : null,
      lastCheckinAt: c ? c.createdAt : null,
    };
  });

  res.json({ friends });
});

// POST /api/friends/request — { toUserId }
router.post('/request', requireAuth, async (req, res) => {
  const { toUserId } = req.body || {};
  if (!toUserId) return res.status(400).json({ error: 'toUserId is required' });
  if (toUserId === req.userId) return res.status(400).json({ error: "You can't friend yourself" });

  const target = await prisma.user.findUnique({ where: { id: toUserId } });
  if (!target) return res.status(404).json({ error: 'User not found' });

  // Already a friendship in either direction?
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { fromUserId: req.userId, toUserId },
        { fromUserId: toUserId, toUserId: req.userId },
      ],
    },
  });
  if (existing) {
    return res.status(409).json({ error: 'A friend request already exists' });
  }

  const friendship = await prisma.friendship.create({
    data: { fromUserId: req.userId, toUserId, status: 'pending' },
  });
  res.status(201).json({ friendship });
});

// POST /api/friends/accept/:id — accept an incoming pending request.
router.post('/accept/:id', requireAuth, async (req, res) => {
  const friendship = await prisma.friendship.findUnique({ where: { id: req.params.id } });
  if (!friendship) return res.status(404).json({ error: 'Request not found' });
  if (friendship.toUserId !== req.userId) {
    return res.status(403).json({ error: 'Only the recipient can accept this request' });
  }
  if (friendship.status === 'accepted') {
    return res.json({ friendship });
  }

  const updated = await prisma.friendship.update({
    where: { id: friendship.id },
    data: { status: 'accepted' },
  });
  res.json({ friendship: updated });
});

// GET /api/friends/pending — incoming pending requests (with requester info).
router.get('/pending', requireAuth, async (req, res) => {
  const pending = await prisma.friendship.findMany({
    where: { toUserId: req.userId, status: 'pending' },
    orderBy: { createdAt: 'desc' },
    include: { from: { select: { id: true, username: true, avatarInitial: true } } },
  });

  res.json({
    pending: pending.map((p) => ({
      id: p.id,
      createdAt: p.createdAt,
      from: p.from,
    })),
  });
});

// POST /api/friends/notify — { barId } → record a check-in and push a
// friend_checkin event to every online friend.
router.post('/notify', requireAuth, async (req, res) => {
  const { barId } = req.body || {};
  if (!barId) return res.status(400).json({ error: 'barId is required' });

  const bar = await prisma.bar.findUnique({ where: { id: barId } });
  if (!bar) return res.status(404).json({ error: 'Bar not found' });

  await prisma.friendNotification.create({ data: { userId: req.userId, barId } });

  const me = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { username: true, avatarInitial: true },
  });
  const ids = await acceptedFriendIds(req.userId);

  emitFriendCheckin(ids, {
    userId: req.userId,
    username: me.username,
    avatarInitial: me.avatarInitial,
    barId: bar.id,
    barName: bar.name,
  });

  res.status(201).json({ ok: true, notified: ids.length });
});

export default router;
