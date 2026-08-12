import { Router } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/users/search?q= — find users by username (for adding friends).
// Annotates each result with the friendship status relative to the requester.
router.get('/search', requireAuth, async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (!q) return res.json({ users: [] });

  const users = await prisma.user.findMany({
    where: {
      username: { contains: q, mode: 'insensitive' },
      NOT: { id: req.userId },
    },
    select: { id: true, username: true, avatarInitial: true },
    take: 10,
  });

  const ids = users.map((u) => u.id);
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { fromUserId: req.userId, toUserId: { in: ids } },
        { fromUserId: { in: ids }, toUserId: req.userId },
      ],
    },
  });

  const statusFor = (otherId) => {
    const f = friendships.find(
      (x) =>
        (x.fromUserId === req.userId && x.toUserId === otherId) ||
        (x.fromUserId === otherId && x.toUserId === req.userId)
    );
    if (!f) return 'none';
    if (f.status === 'accepted') return 'friends';
    return f.fromUserId === req.userId ? 'requested' : 'incoming';
  };

  res.json({
    users: users.map((u) => ({ ...u, friendStatus: statusFor(u.id) })),
  });
});

// GET /api/users/me/stats — small profile stats (check-ins + friend count).
router.get('/me/stats', requireAuth, async (req, res) => {
  const [checkIns, friendships] = await Promise.all([
    prisma.report.count({ where: { userId: req.userId } }),
    prisma.friendship.count({
      where: {
        status: 'accepted',
        OR: [{ fromUserId: req.userId }, { toUserId: req.userId }],
      },
    }),
  ]);
  res.json({ checkIns, friends: friendships });
});

export default router;
