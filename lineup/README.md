# NYC Lines

The wordmark is **"L·nes"** — the "i" is a vertical stack of three colored
status dots (🟢 green / 🟡 amber / 🔴 red), the same signal palette used for
wait times across the app.

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

## Live demo (GitHub Pages)

A **static demo build** runs the whole app in the browser — no server or
database. Seed data is baked in, auth/reports/friends are mocked in-memory, and
a small simulator emits live `wait_updated` / `friend_checkin` events so the
real-time UI still animates.

- Build it locally: `VITE_DEMO=true npm run build && npm run preview`
- It's published automatically by `.github/workflows/deploy-demo.yml` to the
  `gh-pages` branch on every push.

**One-time setup:** in the repo, go to **Settings → Pages → Source: "Deploy
from a branch"** and choose **`gh-pages` / `(root)`**. The demo then lives at
`https://<owner>.github.io/<repo>/` (e.g. `https://8x9pknfpwq-prog.github.io/Nutrition-App/`).

> Demo mode notes: routing is hash-based, and your reports/friend actions reset
> on a full reload. The **live interactive Mapbox map** is enabled when a public
> `VITE_MAPBOX_TOKEN` is configured (repo secret/variable, or `lineup/.env`
> locally); otherwise the app uses the schematic fallback map.

## Hosting the real app (shared database)

The static demo above stores everything in the browser. To run NYC Lines as a
real website with **one shared PostgreSQL database** (and Google-verified place
submissions), deploy the full stack. A [Render](https://render.com) blueprint is
included at the repo root (`render.yaml`):

1. Push the repo to GitHub (done).
2. In Render: **New → Blueprint**, pick this repo. It provisions a web service
   (Node server + built client) and a free PostgreSQL database automatically.
3. Set two values in the service's **Environment** (the blueprint marks them as
   "sync: false"):
   - `VITE_MAPBOX_TOKEN` — your Mapbox **public** token (`pk.*`)
   - `GOOGLE_MAPS_API_KEY` — a Google Cloud key with the **Places API** enabled
     (needed to verify submitted places)
4. Deploy. The build syncs the schema, seeds the 15 starter bars once, and
   serves the app at your Render URL. Add a custom domain in Render → Settings
   when you're ready to launch.

> Place submissions (`POST /api/bars`) are verified server-side via the Google
> Places API, so only real venues are added. Without `GOOGLE_MAPS_API_KEY` the
> submit endpoint returns 503.

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
| Method | Route                      | Notes |
| ------ | -------------------------- | ----- |
| GET    | `/api/bars`                | all bars + current wait |
| GET    | `/api/bars/:id`            | detail + recent reports |
| GET    | `/api/bars/:id/waittime`   | computed wait |
| POST   | `/api/bars` (auth)         | submit a place `{ name, address }` — **verified against Google Maps** before it's saved; emits `bar_added` |

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
