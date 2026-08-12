# NYC Lines — Supabase backend

The all-in-one backend: **Postgres + Auth + Realtime**. No always-on server and
no Google API — the React app talks to Supabase directly and stays static
(GitHub Pages / Vercel). Place submissions are inserted as **pending** rows
(Row-Level Security) and an **admin approves** them.

## Stage 1 — stand up the backend (one-time)

1. **Create a project** at https://supabase.com (free tier is fine). Note your:
   - Project **URL** (Settings → API → Project URL)
   - **anon key** (Settings → API → `anon` / publishable) — safe to expose
   - **service_role key** — secret; you won't need it in the app

2. **Create the schema + security + seed.** In the dashboard: **SQL Editor → New
   query →** run [`migrations/0001_init.sql`](./migrations/0001_init.sql), then run
   [`migrations/0003_suggestions_no_google.sql`](./migrations/0003_suggestions_no_google.sql)
   (adds the approval gate + lets users insert pending suggestions).

3. **Auth settings** (dashboard → Authentication → Sign In / Providers):
   - Enable **Email**. For a quick start turn **off** "Confirm email"; turn it
     back on (with email templates) for production.

> No Edge Function or Google key needed. Suggestions are inserted directly as
> `approved = false` (RLS forbids self-approval). You review them in **Table
> Editor → `bars`** and flip **`approved = true`** to make them live (and set
> `verified = true` if you want the ✓ badge).

## Stage 2 — point the frontend at Supabase

Set these in the frontend build env (`lineup/.env` locally, or GitHub repo
**Variables/Secrets** for the Pages deploy):

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon / publishable key>
VITE_MAPBOX_TOKEN=<pk. public token>     # the live map + address geocoding
```

The app uses `@supabase/supabase-js` for auth and queries (RLS-protected);
suggestions are geocoded with Mapbox and inserted as pending rows.

## What replaces what

| Old (Express stack)        | New (Supabase)                                    |
| -------------------------- | ------------------------------------------------- |
| Express + JWT/bcrypt auth  | Supabase Auth                                     |
| Prisma + Postgres          | Supabase Postgres + SQL migrations + RLS          |
| Socket.io                  | Supabase Realtime (row changes on `reports` etc.) |
| `POST /api/bars` + Google  | Direct RLS insert (pending) + admin approval      |
| Always-on Node host        | None — static frontend + Supabase                 |
