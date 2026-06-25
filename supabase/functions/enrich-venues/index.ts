// enrich-venues — fill venue photos + real opening hours from Foursquare.
//
// Status: complete but UNTESTED until you add a Foursquare key. Admin-only.
// The app's Admin screen calls this; for each venue it searches Foursquare by
// name + location and writes image_url and per-day hours back to the bar.
//
// Setup:
//   1. Create a Foursquare Service API key (developer console) and ENABLE
//      BILLING — photos & hours are premium fields (~$18.75 / 1,000 calls, so
//      a few dozen venues is well under a dollar).
//   2. supabase secrets set FSQ_API_KEY=your_key
//   3. supabase functions deploy enrich-venues
//
// Body: { "id": "<venue uuid>" } for one venue, or { "force": true } to refill
// every approved venue (default: only venues missing a photo or hours).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const FSQ = 'https://places-api.foursquare.com';
const FSQ_VERSION = '2025-06-17';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// Foursquare regular hours → our array of 7 (0=Sun): { open, close } in minutes.
// FSQ day: 1=Mon … 7=Sun; open/close are "HHMM" strings (close may be next day).
function mapHours(regular: Array<{ day: number; open: string; close: string }> | undefined) {
  if (!Array.isArray(regular) || !regular.length) return null;
  const out: (null | { open: number; close: number })[] = [null, null, null, null, null, null, null];
  for (const r of regular) {
    if (!r?.open || !r?.close) continue;
    const dow = r.day % 7; // 7→0 (Sun), 1..6 = Mon..Sat
    const toMin = (s: string) => parseInt(s.slice(0, 2), 10) * 60 + parseInt(s.slice(2), 10);
    if (!out[dow]) out[dow] = { open: toMin(r.open), close: toMin(r.close) };
  }
  return out.some(Boolean) ? out : null;
}

function photoUrl(photos: Array<{ prefix: string; suffix: string }> | undefined) {
  const p = photos?.[0];
  return p?.prefix && p?.suffix ? `${p.prefix}original${p.suffix}` : null;
}

async function enrichOne(key: string, venue: { name: string; latitude: number; longitude: number }) {
  const headers = {
    Authorization: `Bearer ${key}`,
    'X-Places-Api-Version': FSQ_VERSION,
    accept: 'application/json',
  };
  const url =
    `${FSQ}/places/search?query=${encodeURIComponent(venue.name)}` +
    `&ll=${venue.latitude},${venue.longitude}&radius=250&limit=1&fields=fsq_place_id,name,hours,photos`;
  const res = await fetch(url, { headers });
  if (!res.ok) return { error: `FSQ ${res.status}` };
  const data = await res.json();
  const place = data.results?.[0] || data.places?.[0];
  if (!place) return { error: 'no match' };
  return { image_url: photoUrl(place.photos), hours: mapHours(place.hours?.regular) };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const key = Deno.env.get('FSQ_API_KEY');
    if (!key) return json({ error: 'FSQ_API_KEY not set' }, 500);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    });

    // Admins only.
    const { data: u } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!u?.user) return json({ error: 'Invalid session' }, 401);
    const { data: prof } = await admin.from('profiles').select('is_admin').eq('id', u.user.id).single();
    if (!prof?.is_admin) return json({ error: 'Admins only' }, 403);

    const { id, force } = await req.json().catch(() => ({}));

    let q = admin.from('bars').select('id, name, latitude, longitude, image_url, hours').eq('approved', true);
    if (id) q = q.eq('id', id);
    const { data: venues, error } = await q;
    if (error) return json({ error: error.message }, 500);

    let updated = 0;
    const results: Array<{ id: string; ok: boolean; note?: string }> = [];
    for (const v of venues || []) {
      if (!force && v.image_url && v.hours) {
        results.push({ id: v.id, ok: true, note: 'skipped (already set)' });
        continue;
      }
      const r = await enrichOne(key, v);
      if (r.error) {
        results.push({ id: v.id, ok: false, note: r.error });
        continue;
      }
      const patch: Record<string, unknown> = {};
      if (r.image_url && (force || !v.image_url)) patch.image_url = r.image_url;
      if (r.hours && (force || !v.hours)) patch.hours = r.hours;
      if (Object.keys(patch).length) {
        await admin.from('bars').update(patch).eq('id', v.id);
        updated++;
      }
      results.push({ id: v.id, ok: true });
    }

    return json({ ok: true, updated, results });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
