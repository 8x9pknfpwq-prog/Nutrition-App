# LineUp 🍸

A social, crowd-sourced **NYC bar wait-time** app. See real-time wait times at
bars near you — reported and verified by the crowd — with a friends layer that
shows where people are checking in.

> Built as a self-contained full-stack project. It lives in its own `lineup/`
> directory and does not touch the existing app in the repo root.

## Features

- 🗺️ **Live map** of East Village / LES bars with color-coded wait bubbles
  (green 0–10m, amber 11–30m, red 30+m), centered on NYC via Mapbox GL.
- 🧮 **Crowd-verified wait times** — weighted-median algorithm over the last
  90 minutes, weighting recent reports 2×, with a confidence rating.
- 📲 **Check-in sheet** with a live circular dial + NONE→45→90+ slider.
- 👥 **Friends layer** — friend avatars float on the map near their last
  check-in; add friends by username; accept requests.
- ⚡ **Real-time** via Socket.io — wait updates and friend check-in toasts push
  to connected clients instantly.
- 🔐 **JWT auth** in httpOnly cookies, passwords hashed with bcrypt.

## Tech stack

| Layer     | Tech                                              |
| --------- | ------------------------------------------------- |
| Frontend  | React (Vite) + Tailwind CSS + Mapbox GL JS        |
| Backend   | Node.js + Express + Socket.io                     |
| Database  | PostgreSQL via Prisma ORM                          |
| Auth      | JWT (httpOnly cookies), bcrypt password hashing   |

## Getting started

```bash
cd lineup
npm install

# 1. Configure environment
cp .env.example .env
#   - set DATABASE_URL to your PostgreSQL connection string
#   - set JWT_SECRET to a long random string
#   - (optional) set VITE_MAPBOX_TOKEN for the live Mapbox map
#     Without a token the app shows a schematic fallback map.

# 2. Create the schema + seed ~15 real NYC bars and demo users
npm run prisma:generate
npm run prisma:push      # or: npm run prisma:migrate
npm run seed

# 3. Run client (5173) + API/Socket.io (3001) together
npm run dev
```

Open http://localhost:5173.

**Demo login:** `maya@lineup.app` / `password123` (also `leo`, `sara`, `devin`).

### Production

```bash
npm run build
NODE_ENV=production npm start   # serves the built client + API from PORT
```

## Wait-time algorithm

For each bar (`server/utils/waittime.js`):

1. Take all reports from the last **90 minutes**.
2. Weight them: `< 30 min old → 2×`, `30–90 min → 1×`.
3. Compute the **weighted median**.
4. With fewer than 2 reports, the single value is shown with a "1 report" label.
5. `confidence` is `low` (1) / `medium` (2–3) / `high` (4+).

Exposed at `GET /api/bars/:id/waittime → { waitMin, reportCount, confidence }`.

## API

### Auth
| Method | Route               | Body                          |
| ------ | ------------------- | ----------------------------- |
| POST   | `/api/auth/signup`  | `{ email, username, password }` |
| POST   | `/api/auth/login`   | `{ email, password }`         |
| POST   | `/api/auth/logout`  | —                             |
| GET    | `/api/auth/me`      | —                             |

### Bars
| Method | Route                      |
| ------ | -------------------------- |
| GET    | `/api/bars`                |
| GET    | `/api/bars/:id`            |
| GET    | `/api/bars/:id/waittime`   |

### Reports (auth)
| Method | Route          | Body                  |
| ------ | -------------- | --------------------- |
| POST   | `/api/reports` | `{ barId, waitMin }`  |

→ creates a report (also the user's last-seen location) and emits
`wait_updated { barId, waitMin }`.

### Friends (auth)
| Method | Route                      | Body            |
| ------ | -------------------------- | --------------- |
| GET    | `/api/friends`             | —               |
| POST   | `/api/friends/request`     | `{ toUserId }`  |
| POST   | `/api/friends/accept/:id`  | —               |
| GET    | `/api/friends/pending`     | —               |
| POST   | `/api/friends/notify`      | `{ barId }`     |

→ `notify` emits `friend_checkin` to each online friend.

### Users (auth)
| Method | Route                       |
| ------ | --------------------------- |
| GET    | `/api/users/search?q=`      |
| GET    | `/api/users/me/stats`       |

## Real-time events (Socket.io)

- Client emits `join_map` → joins the `nyc_bars` room.
- Server emits `wait_updated { barId, waitMin, reportCount, confidence }`.
- Server emits `friend_checkin { userId, username, barId, barName }` to the
  friend's personal room (`user:<id>`), authenticated via the auth cookie.

## Project structure

```
lineup/
├─ prisma/
│  ├─ schema.prisma         # User, Bar, Report, Friendship, FriendNotification
│  └─ seed.js               # ~15 real EV/LES bars + demo users/reports
├─ server/
│  ├─ index.js              # Express + Socket.io bootstrap
│  ├─ prisma.js             # Prisma client singleton
│  ├─ socket.js             # io instance + emit helpers
│  ├─ middleware/auth.js    # JWT cookie sign/verify + requireAuth
│  ├─ utils/waittime.js     # weighted-median verification algorithm
│  └─ routes/               # auth, bars, reports, friends, users
└─ src/
   ├─ App.jsx               # routing + providers + friend-checkin toasts
   ├─ context/              # Auth, Socket, Toast providers
   ├─ lib/                  # api client + wait/color helpers
   ├─ components/           # MapView, BottomSheet, CheckInSheet, BarCard, …
   └─ pages/                # Auth, MapDashboard, Friends, Saved, Profile
```
