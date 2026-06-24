# NYC Lines — Supabase backend

This is the all-in-one backend: **Postgres + Auth + Realtime + an Edge Function**
for Google-verified place submissions. No always-on server to host — the React
app talks to Supabase directly, and stays static (GitHub Pages / Vercel).

## Stage 1 — stand up the backend (one-time)

1. **Create a project** at https://supabase.com (free tier is fine). Note your:
   - Project **URL** (Settings → API → Project URL)
   - **anon key** (Settings → API → Project API keys → `anon` / publishable) — safe to expose
   - **service_role key** (same page) — **secret**, never put it in the frontend

2. **Create the schema + security + seed.** In the dashboard: **SQL Editor → New
   query →** paste the contents of [`migrations/0001_init.sql`](./migrations/0001_init.sql)
   → **Run**. (Or with the CLI: `supabase db push`.)

3. **Deploy the verification function** (needs the [Supabase CLI](https://supabase.com/docs/guides/cli)):
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase functions deploy submit-place
   supabase secrets set GOOGLE_MAPS_API_KEY=<your-google-places-key>
   ```
   (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected
   automatically.)

4. **Auth settings** (dashboard → Authentication):
   - Enable **Email** provider. For the quickest demo, turn **off** "Confirm
     email"; for production, leave confirmation on and set the email templates.

## Stage 2 — point the frontend at Supabase

Set these in the frontend build env (`lineup/.env` locally, or repo
secrets/Vercel env for deploys):

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_MAPBOX_TOKEN=<pk. public token>     # the live map
```

The app uses `@supabase/supabase-js` for auth, queries (RLS-protected), and
realtime, and calls the `submit-place` Edge Function to add places.

## What replaces what

| Old (Express stack)        | New (Supabase)                                  |
| -------------------------- | ----------------------------------------------- |
| Express + JWT/bcrypt auth  | Supabase Auth                                   |
| Prisma + Postgres          | Supabase Postgres + SQL migration + RLS         |
| Socket.io                  | Supabase Realtime (row changes on `reports` etc.) |
| `POST /api/bars` + Google  | `submit-place` Edge Function + Google           |
| Always-on Node host        | None — static frontend + Supabase               |
