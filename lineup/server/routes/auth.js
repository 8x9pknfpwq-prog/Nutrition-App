import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';
import {
  COOKIE_NAME,
  signToken,
  setAuthCookie,
  clearAuthCookie,
  userIdFromToken,
} from '../middleware/auth.js';

const router = Router();

// Strip the password hash before returning a user to the client.
function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    avatarInitial: u.avatarInitial,
    createdAt: u.createdAt,
  };
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { email, username, password } = req.body || {};
  if (!email || !username || !password) {
    return res.status(400).json({ error: 'email, username and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: email.toLowerCase() }, { username }] },
  });
  if (existing) {
    const field = existing.email === email.toLowerCase() ? 'email' : 'username';
    return res.status(409).json({ error: `That ${field} is already taken` });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      username,
      passwordHash,
      avatarInitial: username[0].toUpperCase(),
    },
  });

  setAuthCookie(res, signToken(user.id));
  res.status(201).json({ user: publicUser(user) });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  setAuthCookie(res, signToken(user.id));
  res.json({ user: publicUser(user) });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const userId = userIdFromToken(req.cookies?.[COOKIE_NAME]);
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  res.json({ user: publicUser(user) });
});

export default router;
