import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { parse as parseCookie } from 'cookie';
import { Server as SocketServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

import { COOKIE_NAME, userIdFromToken } from './middleware/auth.js';
import { setIo, NYC_ROOM, userRoom } from './socket.js';

import authRoutes from './routes/auth.js';
import barRoutes from './routes/bars.js';
import reportRoutes from './routes/reports.js';
import friendRoutes from './routes/friends.js';
import userRoutes from './routes/users.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const isProd = process.env.NODE_ENV === 'production';

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// --- REST API ---
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/bars', barRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/users', userRoutes);

// --- Socket.io ---
const io = new SocketServer(server, {
  cors: { origin: CLIENT_ORIGIN, credentials: true },
});
setIo(io);

io.on('connection', (socket) => {
  // Identify the user from the auth cookie sent on the handshake so we can put
  // them in their personal room for friend_checkin events.
  const cookieHeader = socket.handshake.headers.cookie || '';
  const token = parseCookie(cookieHeader)[COOKIE_NAME];
  const userId = userIdFromToken(token);
  if (userId) socket.join(userRoom(userId));

  // Everyone watching the map joins the shared room for wait_updated events.
  socket.on('join_map', () => socket.join(NYC_ROOM));
  socket.on('leave_map', () => socket.leave(NYC_ROOM));
});

// --- Serve built client in production ---
if (isProd) {
  const dist = path.resolve(__dirname, '../dist');
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

server.listen(PORT, () => {
  console.log(`🍸  LineUp API + Socket.io on http://localhost:${PORT}`);
});
