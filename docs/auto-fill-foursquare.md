# Auto-fill venue photos & hours (Foursquare)

One admin action fills **both** the photo and real per-day opening hours for every
venue, pulled from Foursquare. It's the `enrich-venues` Edge Function, triggered
by **Admin → Venues → "Auto-fill photos & hours"**.

## Cost & key (read first)

- Photos and hours are **premium** Foursquare fields — **no free tier**, about
  **$18.75 per 1,000 calls**. The app makes ~1 call per venue, so the full
  catalog (~33 venues) is **well under $1**, but you must **enable billing** on
  your Foursquare account.
- Attribution: Foursquare's terms ask you to credit them where their data
  appears. A small "Photos & hours via Foursquare" line in the app footer or
  about screen covers it — tell me and I'll add it.

## Setup

1. Create a **Service API key** in the Foursquare developer console and enable
   billing.
2. Set it as a function secret and deploy:
   ```bash
   supabase secrets set FSQ_API_KEY=your_key
   supabase functions deploy enrich-venues
   ```
   (Requires migrations `0009` (hours) and `0010` (photos) to have been run.)
3. In the app: **Profile → Admin → Venues → Auto-fill photos & hours.**

## How it works

For each approved venue it searches Foursquare by name + coordinates, takes the
best match, and writes back:
- `image_url` ← the venue's first Foursquare photo,
- `hours` ← Foursquare's regular hours, mapped to our per-day format.

By default it only fills venues that are **missing** a photo or hours, so it's
safe to run repeatedly. (To overwrite everything, the function accepts
`{ "force": true }`.)

Anything it can't match (or that looks wrong) you can fix by hand with the
existing per-venue **Photo** upload and **hours editor** — those remain the
source of truth and override auto-filled values.

## Notes

- The function is **admin-only** (checks `profiles.is_admin`).
- It's written but **untested** until your key is in place — if a venue comes
  back empty or with odd hours, it's usually a weak name match; just set that one
  manually.
